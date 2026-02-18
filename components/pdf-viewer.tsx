'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const pdfOptions = {
  cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
}

export type ViewMode = 'page' | 'scroll' | 'book' | 'reflow'

interface PDFViewerProps {
  pdfUrl: string
  pageNumber: number
  scale: number
  viewMode: ViewMode
  showSidePanel?: boolean
  onPageChange?: (page: number, total: number) => void
  onDocumentLoad?: (numPages: number) => void
  onScaleChange?: (scale: number) => void
}

const VIRTUALIZATION_BUFFER = 3

export default function PDFViewer({
  pdfUrl,
  pageNumber,
  scale,
  viewMode,
  showSidePanel = false,
  onPageChange,
  onDocumentLoad,
  onScaleChange,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [fitWidth, setFitWidth] = useState<number>(0)
  const [pageAspect, setPageAspect] = useState<number>(1.414)
  const [swipeOffset, setSwipeOffset] = useState(0)

  // ━━━ 핀치줌 + 스와이프 + 패닝 (전부 ref) ━━━
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef<number>(1)
  const isPinchingRef = useRef(false)
  const pinchRatioRef = useRef(1)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)

  // 확대 패닝용
  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const panTranslateRef = useRef({ x: 0, y: 0 })

  // PDF 콘텐츠 wrapper ref (DOM 직접 조작용)
  const pdfContentRef = useRef<HTMLDivElement>(null)

  // 최신 props를 ref로 유지
  const scaleRef = useRef(scale)
  const viewModeRef = useRef(viewMode)
  const pageNumberRef = useRef(pageNumber)
  const numPagesRef = useRef(numPages)
  const onPageChangeRef = useRef(onPageChange)
  const onScaleChangeRef = useRef(onScaleChange)

  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])
  useEffect(() => { pageNumberRef.current = pageNumber }, [pageNumber])
  useEffect(() => { numPagesRef.current = numPages }, [numPages])
  useEffect(() => { onPageChangeRef.current = onPageChange }, [onPageChange])
  useEffect(() => { onScaleChangeRef.current = onScaleChange }, [onScaleChange])

  // scale이 1로 돌아오면 pan 초기화
  useEffect(() => {
    if (scale <= 1.05) {
      panTranslateRef.current = { x: 0, y: 0 }
      if (pdfContentRef.current) {
        pdfContentRef.current.style.transform = ''
      }
    }
  }, [scale])

  // 페이지 변경 시 pan 초기화
  useEffect(() => {
    panTranslateRef.current = { x: 0, y: 0 }
    if (pdfContentRef.current) {
      pdfContentRef.current.style.transform = ''
    }
  }, [pageNumber])

  // ━━━ 스크롤 가상화 상태 ━━━
  const [scrollCurrentPage, setScrollCurrentPage] = useState(1)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchOverlayRef = useRef<HTMLDivElement>(null)

  const calculateFitWidth = useCallback(() => {
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const sidePanelWidth = showSidePanel ? (screenWidth < 640 ? 0 : 380) : 0
    const controlBarHeight = 50
    const frameSize = 24

    const availableWidth = screenWidth - sidePanelWidth
    const availableHeight = screenHeight - controlBarHeight

    const contentWidth = availableWidth - frameSize - 16
    const contentHeight = availableHeight - frameSize - 16

    if (viewMode === 'book') {
      const halfWidth = (contentWidth - 4) / 2
      const widthFromHeight = contentHeight / pageAspect
      const optimal = Math.min(halfWidth, widthFromHeight)
      setFitWidth(Math.max(optimal, 150))
    } else {
      const widthFromHeight = contentHeight / pageAspect
      const optimal = Math.min(contentWidth, widthFromHeight)
      setFitWidth(Math.max(optimal, 200))
    }
  }, [showSidePanel, pageAspect, viewMode])

  useEffect(() => {
    calculateFitWidth()
    window.addEventListener('resize', calculateFitWidth)
    return () => window.removeEventListener('resize', calculateFitWidth)
  }, [calculateFitWidth])

  // ━━━ 스크롤 모드: 현재 페이지 추적 ━━━
  useEffect(() => {
    if (viewMode !== 'scroll' || !scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const handleScroll = () => {
      const pageElements = container.querySelectorAll('[data-page-number]')
      let currentPage = 1
      pageElements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        if (rect.top < containerRect.top + containerRect.height / 2) {
          currentPage = parseInt(el.getAttribute('data-page-number') || '1')
        }
      })
      setScrollCurrentPage(currentPage)
      if (onPageChange) onPageChange(currentPage, numPages)
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [viewMode, numPages, onPageChange])

  const onDocumentLoadSuccess = async ({ numPages: total }: { numPages: number }) => {
    setNumPages(total)
    setPdfLoading(false)
    if (onDocumentLoad) onDocumentLoad(total)

    try {
      const loadingTask = pdfjs.getDocument(pdfUrl)
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1 })
      const aspect = viewport.height / viewport.width
      setPageAspect(aspect)
    } catch (err) {
      console.error('Error getting page dimensions:', err)
    }
  }

  // ━━━ 터치 유틸 ━━━
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const minSwipeDistance = 50

  // ━━━ DOM 직접 조작으로 핀치줌 + 패닝 ━━━
  const applyPinchTransform = (ratio: number) => {
    if (pdfContentRef.current) {
      pdfContentRef.current.style.transform = `scale(${ratio})`
      pdfContentRef.current.style.transformOrigin = 'center center'
      pdfContentRef.current.style.transition = 'none'
    }
  }

  const clearPinchTransform = () => {
    if (pdfContentRef.current) {
      pdfContentRef.current.style.transform = ''
      pdfContentRef.current.style.transformOrigin = ''
      pdfContentRef.current.style.transition = ''
    }
  }

  const applyPanTransform = (x: number, y: number) => {
    if (pdfContentRef.current) {
      pdfContentRef.current.style.transform = `translate(${x}px, ${y}px)`
      pdfContentRef.current.style.transition = 'none'
    }
  }

  // ━━━ 투명 오버레이에 네이티브 터치 이벤트 바인딩 ━━━
  useEffect(() => {
    const overlay = touchOverlayRef.current
    if (!overlay) return

    const handleTouchStart = (e: TouchEvent) => {
      // 2손가락: 핀치줌
      if (e.touches.length === 2) {
        e.preventDefault()
        e.stopPropagation()
        isPanningRef.current = false
        panStartRef.current = null
        const dist = getTouchDistance(e.touches)
        pinchStartDistRef.current = dist
        pinchStartScaleRef.current = scaleRef.current
        isPinchingRef.current = true
        pinchRatioRef.current = 1
        return
      }

      // 1손가락
      if (scaleRef.current > 1.05) {
        // 확대 상태: 패닝 시작
        e.preventDefault()
        isPanningRef.current = true
        panStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          tx: panTranslateRef.current.x,
          ty: panTranslateRef.current.y,
        }
        return
      }

      // 원본 크기: 스와이프
      if (viewModeRef.current === 'scroll') return
      touchEndRef.current = null
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    const handleTouchMove = (e: TouchEvent) => {
      // 핀치줌
      if (e.touches.length === 2) {
        e.preventDefault()
        e.stopPropagation()
        isPanningRef.current = false

        if (!isPinchingRef.current) {
          const dist = getTouchDistance(e.touches)
          pinchStartDistRef.current = dist
          pinchStartScaleRef.current = scaleRef.current
          isPinchingRef.current = true
          pinchRatioRef.current = 1
          setSwipeOffset(0)
          touchStartRef.current = null
          touchEndRef.current = null
          return
        }

        if (pinchStartDistRef.current !== null) {
          const currentDist = getTouchDistance(e.touches)
          const ratio = currentDist / pinchStartDistRef.current
          pinchRatioRef.current = ratio
          applyPinchTransform(ratio)
        }
        return
      }

      // 확대 패닝
      if (isPanningRef.current && panStartRef.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - panStartRef.current.x
        const dy = e.touches[0].clientY - panStartRef.current.y
        const newX = panStartRef.current.tx + dx
        const newY = panStartRef.current.ty + dy
        panTranslateRef.current = { x: newX, y: newY }
        applyPanTransform(newX, newY)
        return
      }

      // 스와이프
      const ts = touchStartRef.current
      if (!ts || viewModeRef.current === 'scroll') return
      const currentX = e.touches[0].clientX
      setSwipeOffset((currentX - ts.x) * 0.3)
      touchEndRef.current = { x: currentX, y: e.touches[0].clientY }
    }

    const handleTouchEnd = () => {
      // 핀치줌 종료
      if (isPinchingRef.current) {
        clearPinchTransform()
        const finalScale = Math.min(Math.max(pinchStartScaleRef.current * pinchRatioRef.current, 0.5), 3.0)
        if (onScaleChangeRef.current) onScaleChangeRef.current(finalScale)
        pinchStartDistRef.current = null
        isPinchingRef.current = false
        pinchRatioRef.current = 1
        // 핀치 후 pan 초기화
        panTranslateRef.current = { x: 0, y: 0 }
        return
      }

      // 패닝 종료
      if (isPanningRef.current) {
        isPanningRef.current = false
        panStartRef.current = null
        // panTranslateRef는 유지 (현재 위치 기억)
        return
      }

      // 스와이프 종료
      const ts = touchStartRef.current
      const te = touchEndRef.current
      if (!ts || !te || viewModeRef.current === 'scroll') {
        setSwipeOffset(0)
        return
      }
      const distanceX = ts.x - te.x
      const distanceY = Math.abs(ts.y - te.y)
      const step = viewModeRef.current === 'book' ? 2 : 1
      const pn = pageNumberRef.current
      const np = numPagesRef.current
      if (Math.abs(distanceX) > minSwipeDistance && distanceY < Math.abs(distanceX)) {
        if (distanceX > 0 && onPageChangeRef.current) onPageChangeRef.current(Math.min(pn + step, np), np)
        else if (onPageChangeRef.current) onPageChangeRef.current(Math.max(pn - step, 1), np)
      }
      setSwipeOffset(0)
      touchStartRef.current = null
      touchEndRef.current = null
    }

    overlay.addEventListener('touchstart', handleTouchStart, { passive: false })
    overlay.addEventListener('touchmove', handleTouchMove, { passive: false })
    overlay.addEventListener('touchend', handleTouchEnd)

    return () => {
      overlay.removeEventListener('touchstart', handleTouchStart)
      overlay.removeEventListener('touchmove', handleTouchMove)
      overlay.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  // ━━━ 확대 상태에서 오버레이 밖 핀치줌 보조 (containerRef 캡처) ━━━
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handlePinchStart = (e: TouchEvent) => {
      if (e.touches.length < 2 || scaleRef.current <= 1.05) return
      e.preventDefault()
      const dist = getTouchDistance(e.touches)
      pinchStartDistRef.current = dist
      pinchStartScaleRef.current = scaleRef.current
      isPinchingRef.current = true
      pinchRatioRef.current = 1
    }

    const handlePinchMove = (e: TouchEvent) => {
      if (e.touches.length < 2 || !isPinchingRef.current) return
      e.preventDefault()
      if (pinchStartDistRef.current !== null) {
        const currentDist = getTouchDistance(e.touches)
        const ratio = currentDist / pinchStartDistRef.current
        pinchRatioRef.current = ratio
        applyPinchTransform(ratio)
      }
    }

    const handlePinchEnd = () => {
      if (!isPinchingRef.current) return
      clearPinchTransform()
      const finalScale = Math.min(Math.max(pinchStartScaleRef.current * pinchRatioRef.current, 0.5), 3.0)
      if (onScaleChangeRef.current) onScaleChangeRef.current(finalScale)
      pinchStartDistRef.current = null
      isPinchingRef.current = false
      pinchRatioRef.current = 1
      panTranslateRef.current = { x: 0, y: 0 }
    }

    container.addEventListener('touchstart', handlePinchStart, { passive: false, capture: true })
    container.addEventListener('touchmove', handlePinchMove, { passive: false, capture: true })
    container.addEventListener('touchend', handlePinchEnd, { capture: true })

    return () => {
      container.removeEventListener('touchstart', handlePinchStart, { capture: true } as EventListenerOptions)
      container.removeEventListener('touchmove', handlePinchMove, { capture: true } as EventListenerOptions)
      container.removeEventListener('touchend', handlePinchEnd, { capture: true } as EventListenerOptions)
    }
  }, [])

  const handlePageAreaClick = (e: React.MouseEvent) => {
    if (viewMode === 'scroll' || !onPageChange) return
    // 확대 시 클릭으로 페이지 넘기지 않음
    if (scale > 1.05) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const step = viewMode === 'book' ? 2 : 1
    const clickX = e.clientX - rect.left
    const center = rect.width / 2

    if (clickX < center) onPageChange(Math.max(pageNumber - step, 1), numPages)
    else onPageChange(Math.min(pageNumber + step, numPages), numPages)
  }

  const renderWidth = fitWidth * scale

  const getBookPages = () => {
    if (pageNumber === 1) return { left: 1, right: null }
    const leftPage = pageNumber % 2 === 0 ? pageNumber : pageNumber - 1
    const rightPage = leftPage + 1
    return {
      left: leftPage,
      right: rightPage <= numPages ? rightPage : null,
    }
  }

  const visiblePages = useMemo(() => {
    if (viewMode !== 'scroll') return []
    const start = Math.max(1, scrollCurrentPage - VIRTUALIZATION_BUFFER)
    const end = Math.min(numPages, scrollCurrentPage + VIRTUALIZATION_BUFFER)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [viewMode, scrollCurrentPage, numPages])

  const frameStyle: React.CSSProperties = {
    borderWidth: '12px',
    borderStyle: 'solid',
    borderImage: 'linear-gradient(135deg, #8b6529 0%, #6b4820 20%, #9a7035 40%, #5c3a18 60%, #7a5525 80%, #6b4820 100%) 1',
    boxShadow: 'inset 0 0 10px rgba(80,40,5,0.3), 0 6px 24px rgba(0,0,0,0.5)',
    borderRadius: '2px',
  }

  const frameStyleDark: React.CSSProperties = {
    borderWidth: '12px',
    borderStyle: 'solid',
    borderImage: 'linear-gradient(135deg, #6b4820 0%, #4a3010 20%, #7a5525 40%, #3d2508 60%, #5c3a18 80%, #4a3010 100%) 1',
    boxShadow: 'inset 0 0 10px rgba(60,30,5,0.25), 0 6px 24px rgba(0,0,0,0.7)',
    borderRadius: '2px',
  }

  const bookFrameStyle: React.CSSProperties = { ...frameStyle }
  const bookFrameStyleDark: React.CSSProperties = { ...frameStyleDark }

  const pageHeight = renderWidth * pageAspect

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col" style={{ overscrollBehavior: 'none' }}>
      <div className="flex-1 relative overflow-hidden" style={{ overscrollBehavior: 'none' }}>

        {/* ━━━ 투명 터치 오버레이: 스크롤 모드 제외 ━━━ */}
        {viewMode !== 'scroll' && (
          <div
            ref={touchOverlayRef}
            className="absolute inset-0 z-20"
            style={{ touchAction: 'none' }}
            onClick={handlePageAreaClick}
          />
        )}

        {/* 페이지 모드 */}
        {viewMode === 'page' && (
          <div className="h-full flex items-center justify-center overflow-hidden">
            <div ref={pdfContentRef}>
              {pdfLoading && (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">PDF 로딩 중...</p>
                  </div>
                </div>
              )}
              <PDFDocument
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading=""
                className="flex justify-center"
                options={pdfOptions}
              >
                <div className="dark:hidden" style={frameStyle}>
                  <Page pageNumber={pageNumber} width={renderWidth} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                </div>
                <div className="hidden dark:block" style={frameStyleDark}>
                  <Page pageNumber={pageNumber} width={renderWidth} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                </div>
              </PDFDocument>
            </div>

            {numPages > 1 && (
              <>
                <div
                  onClick={() => onPageChange && onPageChange(Math.max(pageNumber - 1, 1), numPages)}
                  className="hidden lg:flex absolute left-0 top-0 bottom-0 w-[15%] items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-30"
                >
                  {pageNumber > 1 && (
                    <div className="p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                      <ChevronLeft className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div
                  onClick={() => onPageChange && onPageChange(Math.min(pageNumber + 1, numPages), numPages)}
                  className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[15%] items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-30"
                >
                  {pageNumber < numPages && (
                    <div className="p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                      <ChevronRight className="w-8 h-8" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 책 모드 */}
        {viewMode === 'book' && (
          <div className="h-full flex items-center justify-center overflow-hidden">
            <div ref={pdfContentRef}>
              {pdfLoading && (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">PDF 로딩 중...</p>
                  </div>
                </div>
              )}
              <PDFDocument
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading=""
                className="flex justify-center"
                options={pdfOptions}
              >
                {(() => {
                  const { left, right } = getBookPages()
                  return (
                    <>
                      <div className="dark:hidden" style={bookFrameStyle}>
                        <div className="flex">
                          <div className="relative">
                            <Page pageNumber={left} width={renderWidth} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                            <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
                          </div>
                          {right && (
                            <div className="relative">
                              <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-10" />
                              <Page pageNumber={right} width={renderWidth} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="hidden dark:block" style={bookFrameStyleDark}>
                        <div className="flex">
                          <div className="relative">
                            <Page pageNumber={left} width={renderWidth} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                            <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
                          </div>
                          {right && (
                            <div className="relative">
                              <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-10" />
                              <Page pageNumber={right} width={renderWidth} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </PDFDocument>
            </div>

            {numPages > 1 && (
              <>
                <div
                  onClick={() => onPageChange && onPageChange(Math.max(pageNumber - 2, 1), numPages)}
                  className="hidden lg:flex absolute left-0 top-0 bottom-0 w-[10%] items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-30"
                >
                  {pageNumber > 1 && (
                    <div className="p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                      <ChevronLeft className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div
                  onClick={() => onPageChange && onPageChange(Math.min(pageNumber + 2, numPages), numPages)}
                  className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[10%] items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-30"
                >
                  {pageNumber < numPages && (
                    <div className="p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                      <ChevronRight className="w-8 h-8" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 스크롤 모드 (가상화) */}
        {viewMode === 'scroll' && (
          <div ref={scrollContainerRef} className="h-full overflow-y-auto scroll-smooth">
            <div className="py-4 flex flex-col items-center gap-4">
              <PDFDocument
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading=""
                className="flex flex-col items-center gap-4"
                options={pdfOptions}
              >
                {Array.from({ length: numPages }, (_, index) => {
                  const pageNum = index + 1
                  const isVisible = visiblePages.includes(pageNum)
                  return (
                    <div key={`page_${pageNum}`} data-page-number={pageNum}>
                      {isVisible ? (
                        <>
                          <div className="dark:hidden" style={frameStyle}>
                            <Page
                              pageNumber={pageNum}
                              width={renderWidth}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              loading={
                                <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900"
                                  style={{ width: renderWidth, height: pageHeight }}>
                                  <div className="w-6 h-6 border-2 border-[#B2967D] border-t-transparent rounded-full animate-spin" />
                                </div>
                              }
                            />
                          </div>
                          <div className="hidden dark:block" style={frameStyleDark}>
                            <Page
                              pageNumber={pageNum}
                              width={renderWidth}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              loading={
                                <div className="flex items-center justify-center bg-gray-900"
                                  style={{ width: renderWidth, height: pageHeight }}>
                                  <div className="w-6 h-6 border-2 border-[#B2967D] border-t-transparent rounded-full animate-spin" />
                                </div>
                              }
                            />
                          </div>
                        </>
                      ) : (
                        <div
                          style={{ width: renderWidth + 24, height: pageHeight + 24 }}
                          className="bg-gray-100 dark:bg-gray-900/50 rounded-sm flex items-center justify-center"
                        >
                          <span className="text-xs text-[#9C8B7A]">{pageNum}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </PDFDocument>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
