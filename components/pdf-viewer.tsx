'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

export type ViewMode = 'page' | 'scroll'

interface PDFViewerProps {
  pdfUrl: string
  pageNumber: number
  scale: number
  viewMode: ViewMode
  showSidePanel?: boolean
  onPageChange?: (page: number, total: number) => void
  onDocumentLoad?: (numPages: number) => void
}

export default function PDFViewer({
  pdfUrl,
  pageNumber,
  scale,
  viewMode,
  showSidePanel = false,
  onPageChange,
  onDocumentLoad,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [autoWidth, setAutoWidth] = useState<number>(0)

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const calculateOptimalWidth = useCallback(() => {
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const sidePanelWidth = showSidePanel ? 380 : 0
    const availableWidth = screenWidth - sidePanelWidth
    const padding = screenWidth < 640 ? 0 : screenWidth < 1024 ? 16 : 40
    let optimalWidth = availableWidth - padding * 2

    if (screenWidth >= 1280) optimalWidth = Math.min(optimalWidth, 900)
    else if (screenWidth >= 1024) optimalWidth = Math.min(optimalWidth, 800)
    else if (screenWidth >= 768) optimalWidth = Math.min(optimalWidth, 700)

    // 화면 높이에 맞추기 (컨트롤바 ~50px + 프레임 테두리 ~24px + 여유 ~30px)
    const availableHeight = screenHeight - 104
    const widthFromHeight = availableHeight / 1.414

    // 너비/높이 중 작은 쪽에 맞춤 (fit-to-screen)
    optimalWidth = Math.min(optimalWidth, widthFromHeight)

    setAutoWidth(optimalWidth)
  }, [showSidePanel])

  useEffect(() => {
    calculateOptimalWidth()
    window.addEventListener('resize', calculateOptimalWidth)
    return () => window.removeEventListener('resize', calculateOptimalWidth)
  }, [calculateOptimalWidth])

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
      if (onPageChange) onPageChange(currentPage, numPages)
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [viewMode, numPages, onPageChange])

  const onDocumentLoadSuccess = ({ numPages: total }: { numPages: number }) => {
    setNumPages(total)
    setPdfLoading(false)
    if (onDocumentLoad) onDocumentLoad(total)
  }

  const minSwipeDistance = 50
  const onTouchStart = (e: React.TouchEvent) => {
    if (viewMode !== 'page') return
    setTouchEnd(null)
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || viewMode !== 'page') return
    const currentX = e.targetTouches[0].clientX
    setSwipeOffset((currentX - touchStart.x) * 0.3)
    setTouchEnd({ x: currentX, y: e.targetTouches[0].clientY })
  }
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || viewMode !== 'page') {
      setSwipeOffset(0)
      return
    }
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = Math.abs(touchStart.y - touchEnd.y)
    if (Math.abs(distanceX) > minSwipeDistance && distanceY < Math.abs(distanceX)) {
      if (distanceX > 0 && onPageChange) onPageChange(Math.min(pageNumber + 1, numPages), numPages)
      else if (onPageChange) onPageChange(Math.max(pageNumber - 1, 1), numPages)
    }
    setSwipeOffset(0)
    setTouchStart(null)
    setTouchEnd(null)
  }

  const handlePageAreaClick = (e: React.MouseEvent) => {
    if (viewMode !== 'page' || !onPageChange) return
    const pageEl = (e.target as HTMLElement).closest('.react-pdf__Page') as HTMLElement | null
    if (!pageEl) return
    const rect = pageEl.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    if (clickX < width * 0.33) onPageChange(Math.max(pageNumber - 1, 1), numPages)
    else if (clickX > width * 0.67) onPageChange(Math.min(pageNumber + 1, numPages), numPages)
  }

  // 원목 프레임 스타일
  const frameStyle: React.CSSProperties = {
    borderWidth: '12px',
    borderStyle: 'solid',
    borderImage: 'linear-gradient(135deg, #c9a05c 0%, #a67c3d 20%, #d4aa60 40%, #b8892e 60%, #c9a05c 80%, #a67c3d 100%) 1',
    boxShadow: 'inset 0 0 10px rgba(100,60,10,0.2), 0 6px 24px rgba(0,0,0,0.5)',
    borderRadius: '2px',
  }

  const frameStyleDark: React.CSSProperties = {
    borderWidth: '12px',
    borderStyle: 'solid',
    borderImage: 'linear-gradient(135deg, #8b6914 0%, #6b4f10 20%, #9a7520 40%, #7a5c16 60%, #8b6914 80%, #6b4f10 100%) 1',
    boxShadow: 'inset 0 0 10px rgba(100,60,10,0.15), 0 6px 24px rgba(0,0,0,0.6)',
    borderRadius: '2px',
  }

  return (
    <div className="h-full w-full flex flex-col">
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
                    width={autoWidth * scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading=""
                  />
                </div>
                <div className="hidden dark:block" style={frameStyleDark}>
                  <Page
                    pageNumber={pageNumber}
                    width={autoWidth * scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading=""
                  />
                </div>
              </PDFDocument>
            </div>

            {/* 좌우 네비게이션 힌트 (데스크톱) */}
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
                        width={autoWidth * scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={
                          <div
                            className="flex items-center justify-center bg-gray-900 border border-gray-800"
                            style={{ width: autoWidth * scale, height: autoWidth * scale * 1.414 }}
                          >
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        }
                      />
                    </div>
                    <div className="hidden dark:block" style={frameStyleDark}>
                      <Page
                        pageNumber={index + 1}
                        width={autoWidth * scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={
                          <div
                            className="flex items-center justify-center bg-gray-900 border border-gray-800"
                            style={{ width: autoWidth * scale, height: autoWidth * scale * 1.414 }}
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
