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

export type ViewMode = 'page' | 'scroll' | 'book'

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

  // ━━━ 핀치 투 줌 + 스와이프 (ref로 관리) ━━━
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef<number>(1)
  const isPinchingRef = useRef(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)

  // 핀치줌 도중 CSS transform으로 시각적 확대만 (리렌더 방지)
  const [pinchVisualRatio, _setPinchVisualRatio] = useState(1)
  const [isPinchActive, setIsPinchActive] = useState(false)
  const pinchVisualRatioRef = useRef(1)
  const setPinchVisualRatio = (v: number) => {
    pinchVisualRatioRef.current = v
    _setPinchVisualRatio(v)
  }

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

  // ━━━ 투명 오버레이에 네이티브 터치 이벤트 바인딩 ━━━
  useEffect(() => {
    const overlay = touchOverlayRef.current
    if (!overlay) return

    const handleTouchStart = (e: TouchEvent) => {
      // 2손가락 동시 → 핀치 시작
      if (e.touches.length === 2) {
        e.preventDefault()
        e.stopPropagation()
        const dist = getTouchDistance(e.touches)
        pinchStartDistRef.current = dist
        pinchStartScaleRef.current = scaleRef.current
        isPinchingRef.current = true
        setIsPinchActive(true)
        setPinchVisualRatio(1)
        return
      }
      // 1손가락 → 스와이프 준비
      if (viewModeRef.current === 'scroll') return
      touchEndRef.current = null
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    const handleTouchMove = (e: TouchEvent) => {
      // 2손가락 → 핀치줌
      if (e.touches.length === 2) {
        e.preventDefault()
        e.stopPropagation()

        if (!isPinchingRef.current) {
          // 순차적으로 두번째 손가락이 올라온 경우
          const dist = getTouchDistance(e.touches)
          pinchStartDistRef.current = dist
          pinchStartScaleRef.current = scaleRef.current
          isPinchingRef.current = true
          setIsPinchActive(true)
          setPinchVisualRatio(1)
          setSwipeOffset(0)
          touchStartRef.current = null
          touchEndRef.current = null
          return
        }

        // 핀치 진행: CSS transform만 업데이트 (리렌더 없음)
        if (pinchStartDistRef.current !== null) {
          const currentDist = getTouchDistance(e.touches)
          const ratio = currentDist / pinchStartDistRef.current
          const clampedRatio = Math.min(Math.max(ratio, 0.5 / pinchStartScaleRef.current), 3.0 / pinchStartScaleRef.current)
          setPinchVisualRatio(clampedRatio)
        }
        return
      }

      // 1손가락 → 스와이프
      const ts = touchStartRef.current
      if (!ts || viewModeRef.current === 'scroll') return
      const currentX = e.touches[0].clientX
      setSwipeOffset((currentX - ts.x) * 0.3)
      touchEndRef.current = { x: currentX, y: e.touches[0].clientY }
    }

    const handleTouchEnd = () => {
      // 핀치 종료: 최종 scale 한 번만 적용
      if (isPinchingRef.current) {
        const finalScale = Math.min(Math.max(pinchStartScaleRef.current * (pinchStartDistRef.current !== null ? pinchVisualRatioRef.current : 1), 0.5), 3.0)
        if (onScaleChangeRef.current) onScaleChangeRef.current(finalScale)
        pinchStartDistRef.current = null
        isPinchingRef.current = false
        setIsPinchActive(false)
        setPinchVisualRatio(1)
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
  }, []) // ref 기반이므로 의존성 없음

  const handlePageAreaClick = (e: React.MouseEvent) => {
    if (viewMode === 'scroll' || !onPageChange) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const step = viewMode === 'book' ? 2 : 1
    const clickX = e.clientX - rect.left
    const threshold = viewMode === 'book' ? 0.3 : 0.33

    if (clickX < rect.width * threshold) onPageChange(Math.max(pageNumber - step, 1), numPages)
    else if (clickX > rect.width * (1 - threshold)) onPageChange(Math.min(pageNumber + step, numPages), numPages)
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

  // 원목 프레임 스타일
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
    <div ref={containerRef} className="h-full w-full flex flex-col">
      <div className="flex-1 relative overflow-hidden">

        {/* ━━━ 투명 터치 오버레이: PDF 위에서 모든 터치를 직접 캡처 ━━━ */}
        <div
          ref={touchOverlayRef}
          className="absolute inset-0 z-20"
          style={{ touchAction: 'none' }}
          onClick={handlePageAreaClick}
        />

        {/* 페이지 모드 */}
        {viewMode === 'page' && (
          <div className="h-full flex items-center justify-center overflow-auto">
            <div
              className={isPinchActive ? "" : "transition-transform duration-200 ease-out"}
              style={{ transform: `translateX(${swipeOffset}px) scale(${isPinchActive ? pinchVisualRatio : 1})`, transformOrigin: 'center center' }}
            >
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
          <div className="h-full flex items-center justify-center overflow-auto">
            <div
              className={isPinchActive ? "" : "transition-transform duration-200 ease-out"}
              style={{ transform: `translateX(${swipeOffset}px) scale(${isPinchActive ? pinchVisualRatio : 1})`, transformOrigin: 'center center' }}
            >
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

        {/* 스크롤 모드 */}
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
                {Array.from({ length: numPages }, (_, index) => (
                  <div key={`page_${index + 1}`} data-page-number={index + 1}>
                    <div className="dark:hidden" style={frameStyle}>
                      <Page
                        pageNumber={index + 1}
                        width={renderWidth}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={
                          <div
                            className="flex items-center justify-center bg-gray-900 border border-gray-800"
                            style={{ width: renderWidth, height: renderWidth * pageAspect }}
                          >
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        }
                      />
                    </div>
                    <div className="hidden dark:block" style={frameStyleDark}>
                      <Page
                        pageNumber={index + 1}
                        width={renderWidth}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={
                          <div
                            className="flex items-center justify-center bg-gray-900 border border-gray-800"
                            style={{ width: renderWidth, height: renderWidth * pageAspect }}
                          >
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        }
                      />
                    </div>
                  </div>
                ))}
              </PDFDocument>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
