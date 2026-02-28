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
  bottomOffset?: number
  autoCrop?: boolean
}

// ━━━ Lazy 페이지 컴포넌트 (IntersectionObserver) ━━━
function LazyPage({ pageNum, width, height, frameStyle, frameStyleDark }: {
  pageNum: number; width: number; height: number;
  frameStyle: React.CSSProperties; frameStyleDark: React.CSSProperties
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setHasLoaded(true)
        } else if (hasLoaded) {
          const rect = entry.boundingClientRect
          const rootRect = entry.rootBounds
          if (rootRect) {
            const distance = Math.abs(rect.top - rootRect.top)
            if (distance > rootRect.height * 3) {
              setIsVisible(false)
            }
          }
        }
      },
      { rootMargin: '200% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasLoaded])

  return (
    <div ref={ref} data-page-number={pageNum}>
      {isVisible ? (
        <>
          <div className="dark:hidden" style={frameStyle}>
            <Page
              pageNumber={pageNum}
              width={width}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className="flex items-center justify-center bg-gray-100"
                  style={{ width, height }}>
                  <div className="w-6 h-6 border-2 border-[#B2967D] border-t-transparent rounded-full animate-spin" />
                </div>
              }
            />
          </div>
          <div className="hidden dark:block" style={frameStyleDark}>
            <Page
              pageNumber={pageNum}
              width={width}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className="flex items-center justify-center bg-gray-900"
                  style={{ width, height }}>
                  <div className="w-6 h-6 border-2 border-[#B2967D] border-t-transparent rounded-full animate-spin" />
                </div>
              }
            />
          </div>
        </>
      ) : (
        <div style={{ width, height }}
          className="bg-[#EEE4E1]/30 dark:bg-[#2E2620]/30 rounded-sm flex items-center justify-center">
          <span className="text-xs text-[#9C8B7A]">{pageNum}</span>
        </div>
      )}
    </div>
  )
}

export default function PDFViewer({
  pdfUrl,
  pageNumber,
  scale,
  viewMode,
  showSidePanel = false,
  onPageChange,
  onDocumentLoad,
  onScaleChange,
  bottomOffset = 0,
  autoCrop = false,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [fitWidth, setFitWidth] = useState<number>(0)
  const [pageAspect, setPageAspect] = useState<number>(1.414)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [cropBounds, setCropBounds] = useState<{top: number; left: number; bottom: number; right: number} | null>(null)
  const [cropDetecting, setCropDetecting] = useState(false)
  const [pdfDoc, setPdfDoc] = useState<any>(null)

  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef<number>(1)
  const isPinchingRef = useRef(false)
  const pinchRatioRef = useRef(1)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)

  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const panTranslateRef = useRef({ x: 0, y: 0 })

  // PC 마우스 드래그 pan
  const mouseDragRef = useRef(false)

  const pdfContentRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (scale <= 1.05) {
      panTranslateRef.current = { x: 0, y: 0 }
      if (pdfContentRef.current) pdfContentRef.current.style.transform = ''
    }
  }, [scale])

  useEffect(() => {
    panTranslateRef.current = { x: 0, y: 0 }
    if (pdfContentRef.current) pdfContentRef.current.style.transform = ''
  }, [pageNumber])

  const [scrollCurrentPage, setScrollCurrentPage] = useState(1)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchOverlayRef = useRef<HTMLDivElement>(null)

  const calculateFitWidth = useCallback(() => {
    const screenWidth = window.innerWidth
    const screenHeight = containerRef.current?.clientHeight || window.innerHeight
    const sidePanelWidth = showSidePanel ? (screenWidth < 640 ? 0 : 380) : 0
    const controlBarHeight = 0
    const frameSize = 0

    const availableWidth = screenWidth - sidePanelWidth
    const availableHeight = screenHeight - controlBarHeight

    const contentWidth = availableWidth - frameSize - 16
    const contentHeight = availableHeight - frameSize - 16

    const effectiveAspect = (autoCrop && cropBounds)
      ? pageAspect * ((cropBounds.bottom - cropBounds.top) / (cropBounds.right - cropBounds.left))
      : pageAspect

    if (viewMode === 'book') {
      const halfWidth = (contentWidth - 4) / 2
      const widthFromHeight = contentHeight / effectiveAspect
      const optimal = Math.min(halfWidth, widthFromHeight)
      setFitWidth(Math.max(optimal, 150))
    } else {
      const widthFromHeight = contentHeight / effectiveAspect
      const optimal = Math.min(contentWidth, widthFromHeight)
      setFitWidth(Math.max(optimal, 200))
    }
  }, [showSidePanel, pageAspect, viewMode, bottomOffset, autoCrop, cropBounds])

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

  const onDocumentLoadSuccess = async (pdfProxy: any) => {
    const total = pdfProxy.numPages
    setNumPages(total)
    setPdfLoading(false)
    setPdfDoc(pdfProxy)
    if (onDocumentLoad) onDocumentLoad(total)

    try {
      const page = await pdfProxy.getPage(1)
      const viewport = page.getViewport({ scale: 1 })
      const aspect = viewport.height / viewport.width
      setPageAspect(aspect)
    } catch (err) {
      console.error('Error getting page dimensions:', err)
    }
  }

  // ━━━ 자동 여백 감지 (기존 PDF 객체 재사용) ━━━
  const detectCropBounds = useCallback(async () => {
    if (!pdfDoc || numPages === 0 || cropDetecting) return
    setCropDetecting(true)
    try {
      const pdf = pdfDoc

      // 최대 20페이지 균등 샘플링
      const sampleCount = Math.min(20, numPages)
      const sampleNums: number[] = []
      if (sampleCount <= numPages) {
        for (let i = 0; i < sampleCount; i++) {
          sampleNums.push(Math.max(1, Math.round((i / (sampleCount - 1 || 1)) * (numPages - 1)) + 1))
        }
      }
      const unique = [...new Set(sampleNums)].filter(n => n >= 1 && n <= numPages)

      const allLefts: number[] = []
      const allTops: number[] = []
      const allRights: number[] = []
      const allBottoms: number[] = []

      for (const pn of unique) {
        try {
          const pg = await pdf.getPage(pn)
          const vp = pg.getViewport({ scale: 0.25 })
          const canvas = window.document.createElement('canvas')
          canvas.width = vp.width
          canvas.height = vp.height
          const ctx = canvas.getContext('2d')!
          await pg.render({ canvasContext: ctx, viewport: vp } as any).promise

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const { data, width, height } = imgData
          const threshold = 245
          let top = height, left = width, bottom = 0, right = 0

          // 상하 경계: 전체 스캔
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4
              if (data[i] < threshold || data[i+1] < threshold || data[i+2] < threshold) {
                if (y < top) top = y
                if (y > bottom) bottom = y
              }
            }
          }

          // 좌우 경계: 헤더/푸터 제외 (상하 10%)
          const yStart = Math.floor(height * 0.10)
          const yEnd = Math.floor(height * 0.60)
          for (let y = yStart; y < yEnd; y++) {
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4
              if (data[i] < threshold || data[i+1] < threshold || data[i+2] < threshold) {
                if (x < left) left = x
                if (x > right) right = x
              }
            }
          }

          if (bottom > top && right > left) {
            allLefts.push(left / width)
            allTops.push(top / height)
            allRights.push(right / width)
            allBottoms.push(bottom / height)
          }
        } catch {}
      }

      if (allLefts.length > 0) {
        // 중앙값 함수
        const median = (arr: number[]) => {
          const sorted = [...arr].sort((a, b) => a - b)
          const mid = Math.floor(sorted.length / 2)
          return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        }

        const pad = 0.015
        const bounds = {
          top: Math.max(0, median(allTops) - pad),
          left: Math.max(0, median(allLefts) - pad),
          bottom: Math.min(1, median(allBottoms) + pad),
          right: Math.min(1, median(allRights) + pad),
        }
        const cw = bounds.right - bounds.left
        const ch = bounds.bottom - bounds.top
        if (cw < 0.92 || ch < 0.92) {
          setCropBounds(bounds)
        } else {
          setCropBounds(null)
        }
      }
    } catch (err) {
      console.error('Crop detection error:', err)
    } finally {
      setCropDetecting(false)
    }
  }, [pdfDoc, numPages, cropDetecting])

  useEffect(() => {
    if (autoCrop && !cropBounds && !cropDetecting && numPages > 0 && pdfDoc) {
      detectCropBounds()
    }
    if (!autoCrop) {
      setCropBounds(null)
    }
  }, [autoCrop, numPages, pdfDoc])

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const minSwipeDistance = 50

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

      if (scaleRef.current > 1.05) {
        e.preventDefault()
        isPanningRef.current = true
        panStartRef.current = {
          x: e.touches[0].clientX, y: e.touches[0].clientY,
          tx: panTranslateRef.current.x, ty: panTranslateRef.current.y,
        }
        return
      }

      if (viewModeRef.current === 'scroll') return
      touchEndRef.current = null
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    const handleTouchMove = (e: TouchEvent) => {
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

      const ts = touchStartRef.current
      if (!ts || viewModeRef.current === 'scroll') return
      const currentX = e.touches[0].clientX
      setSwipeOffset((currentX - ts.x) * 0.3)
      touchEndRef.current = { x: currentX, y: e.touches[0].clientY }
    }

    const handleTouchEnd = () => {
      if (isPinchingRef.current) {
        clearPinchTransform()
        const finalScale = Math.min(Math.max(pinchStartScaleRef.current * pinchRatioRef.current, 0.5), 3.0)
        if (onScaleChangeRef.current) onScaleChangeRef.current(finalScale)
        pinchStartDistRef.current = null
        isPinchingRef.current = false
        pinchRatioRef.current = 1
        panTranslateRef.current = { x: 0, y: 0 }
        return
      }

      if (isPanningRef.current) {
        isPanningRef.current = false
        panStartRef.current = null
        return
      }

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

  // ━━━ PC: 확대 상태에서 마우스 휠 + 드래그로 이동 ━━━
  useEffect(() => {
    const overlay = touchOverlayRef.current
    if (!overlay) return

    const handleWheel = (e: WheelEvent) => {
      if (scaleRef.current <= 1.05) return
      e.preventDefault()
      const speed = 1.5
      const newX = panTranslateRef.current.x - e.deltaX * speed
      const newY = panTranslateRef.current.y - e.deltaY * speed
      panTranslateRef.current = { x: newX, y: newY }
      applyPanTransform(newX, newY)
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (scaleRef.current <= 1.05) return
      if (e.button !== 0) return
      e.preventDefault()
      mouseDragRef.current = true
      panStartRef.current = {
        x: e.clientX, y: e.clientY,
        tx: panTranslateRef.current.x, ty: panTranslateRef.current.y,
      }
      overlay.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDragRef.current || !panStartRef.current) return
      e.preventDefault()
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      const newX = panStartRef.current.tx + dx
      const newY = panStartRef.current.ty + dy
      panTranslateRef.current = { x: newX, y: newY }
      applyPanTransform(newX, newY)
    }

    const handleMouseUp = () => {
      if (!mouseDragRef.current) return
      mouseDragRef.current = false
      panStartRef.current = null
      if (overlay) overlay.style.cursor = ''
    }

    overlay.addEventListener('wheel', handleWheel, { passive: false })
    overlay.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      overlay.removeEventListener('wheel', handleWheel)
      overlay.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // ━━━ 확대 상태에서 오버레이 밖 핀치줌 보조 ━━━
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
    return { left: leftPage, right: rightPage <= numPages ? rightPage : null }
  }

  const frameStyle: React.CSSProperties = {
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    borderRadius: '4px',
    overflow: 'hidden',
  }

  const frameStyleDark: React.CSSProperties = {
    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    borderRadius: '4px',
    overflow: 'hidden',
  }

  const bookFrameStyle: React.CSSProperties = { ...frameStyle }
  const bookFrameStyleDark: React.CSSProperties = { ...frameStyleDark }

  const pageHeight = renderWidth * pageAspect

  // ━━━ 자동 여백 제거 계산 ━━━
  const isCropping = autoCrop && cropBounds != null
  const cropContentW = cropBounds ? (cropBounds.right - cropBounds.left) : 1
  const cropContentH = cropBounds ? (cropBounds.bottom - cropBounds.top) : 1
  const cropPageWidth = isCropping ? renderWidth / cropContentW : renderWidth
  const cropPageH = cropPageWidth * pageAspect
  const cropVisibleW = renderWidth
  const cropVisibleH = isCropping ? cropPageH * cropContentH : pageHeight
  const cropOffX = isCropping ? -(cropBounds!.left * cropPageWidth) : 0
  const cropOffY = isCropping ? -(cropBounds!.top * cropPageH) : 0

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col" style={{ overscrollBehavior: 'none' }}>
      <div className="flex-1 relative overflow-hidden" style={{ overscrollBehavior: 'none' }}>

        {/* ━━━ 투명 터치 오버레이: 스크롤 모드 제외 ━━━ */}
        {viewMode !== 'scroll' && (
          <div
            ref={touchOverlayRef}
            className="absolute inset-0 z-20"
            style={{ touchAction: 'none', cursor: scale > 1.05 ? 'grab' : 'default' }}
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
                <div className="dark:hidden" style={isCropping ? {...frameStyle, width: cropVisibleW, height: cropVisibleH, overflow: 'hidden'} : frameStyle}>
                  <div style={isCropping ? {transform: `translate(${cropOffX}px, ${cropOffY}px)`} : undefined}>
                    <Page pageNumber={pageNumber} width={isCropping ? cropPageWidth : renderWidth} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                  </div>
                </div>
                <div className="hidden dark:block" style={isCropping ? {...frameStyleDark, width: cropVisibleW, height: cropVisibleH, overflow: 'hidden'} : frameStyleDark}>
                  <div style={isCropping ? {transform: `translate(${cropOffX}px, ${cropOffY}px)`} : undefined}>
                    <Page pageNumber={pageNumber} width={isCropping ? cropPageWidth : renderWidth} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                  </div>
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

        {/* 스크롤 모드 (IntersectionObserver lazy load) */}
        {viewMode === 'scroll' && (
          <div ref={scrollContainerRef} className="h-full overflow-y-auto" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
            <div className="py-4 flex flex-col items-center gap-4">
              <PDFDocument
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading=""
                className="flex flex-col items-center gap-4"
                options={pdfOptions}
              >
                {Array.from({ length: numPages }, (_, index) => (
                  <LazyPage
                    key={`page_${index + 1}`}
                    pageNum={index + 1}
                    width={renderWidth}
                    height={pageHeight}
                    frameStyle={frameStyle}
                    frameStyleDark={frameStyleDark}
                  />
                ))}
              </PDFDocument>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
