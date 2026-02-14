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

// ━━━ 스크롤 모드 가상화: 화면 근처 페이지만 렌더 ━━━
const VIRTUALIZATION_BUFFER = 3 // 현재 보이는 페이지 ± 3페이지만 렌더

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

  // ━━━ 스크롤 가상화 상태 ━━━
  const [scrollCurrentPage, setScrollCurrentPage] = useState(1)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // ━━━ 터치: 스와이프 + 핀치줌 통합 ━━━
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const minSwipeDistance = 50
  const onTouchStart = (e: React.TouchEvent) => {
    // 핀치줌 감지 (2손가락)
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches)
      setPinchStartDistance(dist)
      setPinchStartScale(scale)
      return
    }
    if (viewMode === 'scroll') return
    setTouchEnd(null)
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    // 핀치줌 처리
    if (e.touches.length === 2 && pinchStartDistance !== null) {
      const currentDist = getTouchDistance(e.touches)
      const ratio = currentDist / pinchStartDistance
      const newScale = Math.min(Math.max(pinchStartScale * ratio, 0.5), 3.0)
      if (onScaleChange) onScaleChange(newScale)
      return
    }
    if (!touchStart || viewMode === 'scroll') return
    const currentX = e.targetTouches[0].clientX
    setSwipeOffset((currentX - touchStart.x) * 0.3)
    setTouchEnd({ x: currentX, y: e.targetTouches[0].clientY })
  }

  const onTouchEnd = () => {
    // 핀치줌 종료
    if (pinchStartDistance !== null) {
      setPinchStartDistance(null)
      return
    }
    if (!touchStart || !touchEnd || viewMode === 'scroll') {
      setSwipeOffset(0)
      return
    }
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = Math.abs(touchStart.y - touchEnd.y)
    const step = viewMode === 'book' ? 2 : 1
    if (Math.abs(distanceX) > minSwipeDistance && distanceY < Math.abs(distanceX)) {
      if (distanceX > 0 && onPageChange) onPageChange(Math.min(pageNumber + step, numPages), numPages)
      else if (onPageChange) onPageChange(Math.max(pageNumber - step, 1), numPages)
    }
    setSwipeOffset(0)
    setTouchStart(null)
    setTouchEnd(null)
  }

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

  // 책 모드에서 표시할 페이지 계산
  const getBookPages = () => {
    if (pageNumber === 1) return { left: 1, right: null }
    const leftPage = pageNumber % 2 === 0 ? pageNumber : pageNumber - 1
    const rightPage = leftPage + 1
    return {
      left: leftPage,
      right: rightPage <= numPages ? rightPage : null,
    }
  }

  // ━━━ 스크롤 가상화: 렌더할 페이지 범위 계산 ━━━
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

  // 스크롤 모드 페이지 placeholder 높이
  const pageHeight = renderWidth * pageAspect

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col touch-none">
      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
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

        {/* 책 모드 (2페이지 펼침) */}
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
                      {/* 라이트 모드 */}
                      <div className="dark:hidden" style={bookFrameStyle}>
                        <div className="flex">
                          <div className="relative">
                            <Page
                              pageNumber={left}
                              width={renderWidth}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              loading=""
                            />
                            <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
                          </div>
                          {right && (
                            <div className="relative">
                              <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-10" />
                              <Page
                                pageNumber={right}
                                width={renderWidth}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                loading=""
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      {/* 다크 모드 */}
                      <div className="hidden dark:block" style={bookFrameStyleDark}>
                        <div className="flex">
                          <div className="relative">
                            <Page
                              pageNumber={left}
                              width={renderWidth}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              loading=""
                            />
                            <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
                          </div>
                          {right && (
                            <div className="relative">
                              <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-10" />
                              <Page
                                pageNumber={right}
                                width={renderWidth}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                loading=""
                              />
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
