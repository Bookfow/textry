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

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  // ━━━ 핀치 투 줌 상태 ━━━
  const [pinchStartDistance, setPinchStartDistance] = useState<number | null>(null)
  const [pinchStartScale, setPinchStartScale] = useState<number>(1)
  const [isPinching, setIsPinching] = useState(false)

  // ━━━ 스크롤 가상화 상태 ━━━
  const [scrollCurrentPage, setScrollCurrentPage] = useState(1)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 최신 값을 ref로 유지 (네이티브 이벤트 핸들러에서 사용)
  const scaleRef = useRef(scale)
  const pinchStartDistanceRef = useRef(pinchStartDistance)
  const pinchStartScaleRef = useRef(pinchStartScale)
  const isPinchingRef = useRef(isPinching)
  const touchStartRef = useRef(touchStart)
  const touchEndRef = useRef(touchEnd)
  const viewModeRef = useRef(viewMode)
  const pageNumberRef = useRef(pageNumber)
  const numPagesRef = useRef(numPages)
  const onPageChangeRef = useRef(onPageChange)
  const onScaleChangeRef = useRef(onScaleChange)

  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { pinchStartDistanceRef.current = pinchStartDistance }, [pinchStartDistance])
  useEffect(() => { pinchStartScaleRef.current = pinchStartScale }, [pinchStartScale])
  useEffect(() => { isPinchingRef.current = isPinching }, [isPinching])
  useEffect(() => { touchStartRef.current = touchStart }, [touchStart])
  useEffect(() => { touchEndRef.current = touchEnd }, [touchEnd])
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])
  useEffect(() => { pageNumberRef.current = pageNumber }, [pageNumber])
  useEffect(() => { numPagesRef.current = numPages }, [numPages])
  useEffect(() => { onPageChangeRef.current = onPageChange }, [onPageChange])
  useEffect(() => { onScaleChangeRef.current = onScaleChange }, [onScaleChange])

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

  // ━━━ 네이티브 터치 이벤트 (PDF 위에서도 핀치줌 작동) ━━━
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const minSwipeDistance = 50

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      // 2손가락: 핀치줌
      if (e.touches.length === 2) {
        e.preventDefault()
        const dist = getTouchDistance(e.touches)
        setPinchStartDistance(dist)
        setPinchStartScale(scaleRef.current)
        setIsPinching(true)
        return
      }
      // 1손가락: 스와이프 (스크롤 모드 제외)
      if (viewModeRef.current === 'scroll') return
      setTouchEnd(null)
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      // 핀치줌 처리
      if (e.touches.length === 2 && pinchStartDistanceRef.current !== null) {
        e.preventDefault()
        const currentDist = getTouchDistance(e.touches)
        const ratio = currentDist / pinchStartDistanceRef.current
        const newScale = Math.min(Math.max(pinchStartScaleRef.current * ratio, 0.5), 3.0)
        if (onScaleChangeRef.current) onScaleChangeRef.current(newScale)
        return
      }
      // 스와이프 처리
      const ts = touchStartRef.current
      if (!ts || viewModeRef.current === 'scroll') return
      const currentX = e.touches[0].clientX
      setSwipeOffset((currentX - ts.x) * 0.3)
      setTouchEnd({ x: currentX, y: e.touches[0].clientY })
    }

    const handleTouchEnd = () => {
      // 핀치줌 종료
      if (isPinchingRef.current) {
        setPinchStartDistance(null)
        setIsPinching(false)
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
      setTouchStart(null)
      setTouchEnd(null)
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, []) // 빈 의존성 — ref로 최신 값 참조

  const handlePageAreaClick = (e: React.MouseEvent) => {
    if (viewMode === 'scroll' || !onPageChange) return
    const pageEl = (e.target as HTMLElement).closest('.react-pdf__Page') as HTMLElement | null
    if (!pageEl) return

    const step = viewMode === 'book' ? 2 : 1

    if (viewMode === 'book') {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      if (clickX < rect.width * 0.3) onPageChange(Math.max(pageNumber - step, 1), numPages)
      else if (clickX > rect.width * 0.7) onPageChange(Math.min(pageNumber + step, numPages), numPages)
    } else {
      const rect = pageEl.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      if (clickX < rect.width * 0.33) onPageChange(Math.max(pageNumber - 1, 1), numPages)
      else if (clickX > rect.width * 0.67) onPageChange(Math.min(pageNumber + 1, numPages), numPages)
    }
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

  const bookFrameStyle: React.CSSProperties = {
    borderWidth: '12px',
    borderStyle: 'solid',
    borderImage: 'linear-gradient(135deg, #8b6529 0%, #6b4820 20%, #9a7035 40%, #5c3a18 60%, #7a5525 80%, #6b4820 100%) 1',
    boxShadow: 'inset 0 0 10px rgba(80,40,5,0.3), 0 6px 24px rgba(0,0,0,0.5)',
    borderRadius: '2px',
  }

  const bookFrameStyleDark: React.CSSProperties = {
    borderWidth: '12px',
    borderStyle: 'solid',
    borderImage: 'linear-gradient(135deg, #6b4820 0%, #4a3010 20%, #7a5525 40%, #3d2508 60%, #5c3a18 80%, #4a3010 100%) 1',
    boxShadow: 'inset 0 0 10px rgba(60,30,5,0.25), 0 6px 24px rgba(0,0,0,0.7)',
    borderRadius: '2px',
  }

  const pageHeight = renderWidth * pageAspect

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col" style={{ touchAction: 'pan-y' }}>
      <div
        className="flex-1 relative overflow-hidden"
        onClick={handlePageAreaClick}
      >
        {/* 페이지 모드 */}
        {viewMode === 'page' && (
          <div className="h-full flex items-center justify-center overflow-auto">
            <div
              className="transition-transform duration-200 ease-out"
              style={{ transform: `translateX(${swipeOffset}px)` }}
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
                  <Page
                    pageNumber={pageNumber}
                    width={renderWidth}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading=""
                  />
                </div>
                <div className="hidden dark:block" style={frameStyleDark}>
                  <Page
                    pageNumber={pageNumber}
                    width={renderWidth}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading=""
                  />
                </div>
              </PDFDocument>
            </div>

            {numPages > 1 && (
              <>
                <div
                  onClick={() => onPageChange && onPageChange(Math.max(pageNumber - 1, 1), numPages)}
                  className="hidden lg:flex absolute left-0 top-0 bottom-0 w-[15%] items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  {pageNumber > 1 && (
                    <div className="p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                      <ChevronLeft className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div
                  onClick={() => onPageChange && onPageChange(Math.min(pageNumber + 1, numPages), numPages)}
                  className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[15%] items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-10"
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
              className="transition-transform duration-200 ease-out"
              style={{ transform: `translateX(${swipeOffset}px)` }}
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
                  className="hidden lg:flex absolute left-0 top-0 bottom-0 w-[10%] items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  {pageNumber > 1 && (
                    <div className="p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                      <ChevronLeft className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div
                  onClick={() => onPageChange && onPageChange(Math.min(pageNumber + 2, numPages), numPages)}
                  className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[10%] items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-10"
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
