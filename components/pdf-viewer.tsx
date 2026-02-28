'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, Play, Pause, Minus, Plus } from 'lucide-react'

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
function LazyPage({ pageNum, width, height, frameStyle, frameStyleDark, isCropping, cropPageWidth, cropVisibleW, cropVisibleH, cropOffX, cropOffY }: {
  pageNum: number; width: number; height: number;
  frameStyle: React.CSSProperties; frameStyleDark: React.CSSProperties;
  isCropping?: boolean; cropPageWidth?: number; cropVisibleW?: number; cropVisibleH?: number; cropOffX?: number; cropOffY?: number;
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
          <div className="dark:hidden" style={isCropping ? {...frameStyle, width: cropVisibleW, height: cropVisibleH, overflow: 'hidden'} : frameStyle}>
            <div style={isCropping ? {transform: `translate(${cropOffX}px, ${cropOffY}px)`} : undefined}>
              <Page
                pageNumber={pageNum}
                width={isCropping ? cropPageWidth! : width}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div className="flex items-center justify-center bg-gray-100"
                    style={{ width: isCropping ? cropVisibleW : width, height: isCropping ? cropVisibleH : height }}>
                    <div className="w-6 h-6 border-2 border-[#B2967D] border-t-transparent rounded-full animate-spin" />
                  </div>
                }
              />
            </div>
          </div>
          <div className="hidden dark:block" style={isCropping ? {...frameStyleDark, width: cropVisibleW, height: cropVisibleH, overflow: 'hidden'} : frameStyleDark}>
            <div style={isCropping ? {transform: `translate(${cropOffX}px, ${cropOffY}px)`} : undefined}>
              <Page
                pageNumber={pageNum}
                width={isCropping ? cropPageWidth! : width}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div className="flex items-center justify-center bg-gray-900"
                    style={{ width: isCropping ? cropVisibleW : width, height: isCropping ? cropVisibleH : height }}>
                    <div className="w-6 h-6 border-2 border-[#B2967D] border-t-transparent rounded-full animate-spin" />
                  </div>
                }
              />
            </div>
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

  // ━━━ 돋보기 (Magnifier) ━━━
  const MAGNIFIER_ZOOM = 2.5
  const magnifierSizeRef = useRef({ w: 300, h: 250 })
  const LONG_PRESS_MS = 500
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const magnifierElRef = useRef<HTMLDivElement>(null)
  const magnifierActiveRef = useRef(false)
  const magnifierWasActiveRef = useRef(false)
  const longPressPosRef = useRef<{ x: number; y: number } | null>(null)
  const magnifierCanvasRef = useRef<{
    imgSrc: string
    rect: DOMRect
    displayW: number
    displayH: number
  } | null>(null)

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

  // ━━━ 자동 스크롤 (Auto Scroll) ━━━
  const [autoScrollActive, setAutoScrollActive] = useState(false)
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(2) // 1~5
  const autoScrollRef = useRef<number | null>(null)
  const autoScrollActiveRef = useRef(false)
  const autoScrollSpeedRef = useRef(2)
  const AUTO_SCROLL_SPEEDS: Record<number, number> = { 1: 0.4, 2: 0.8, 3: 1.5, 4: 2.5, 5: 4.0 } // px per 16ms frame

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

    const effectiveAspect = (autoCrop && cropBounds && viewMode !== 'scroll')
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

  // ━━━ 자동 스크롤 ref 동기화 ━━━
  useEffect(() => { autoScrollActiveRef.current = autoScrollActive }, [autoScrollActive])
  useEffect(() => { autoScrollSpeedRef.current = autoScrollSpeed }, [autoScrollSpeed])

  // ━━━ 뷰모드 바뀌면 자동 스크롤 중지 ━━━
  useEffect(() => {
    if (viewMode !== 'scroll') setAutoScrollActive(false)
  }, [viewMode])

  // ━━━ 자동 스크롤 애니메이션 루프 ━━━
  useEffect(() => {
    if (!autoScrollActive || viewMode !== 'scroll') {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current)
        autoScrollRef.current = null
      }
      return
    }

    const container = scrollContainerRef.current
    if (!container) return

    let lastTime = 0
    const step = (timestamp: number) => {
      if (!autoScrollActiveRef.current) return
      if (lastTime) {
        const delta = timestamp - lastTime
        const px = AUTO_SCROLL_SPEEDS[autoScrollSpeedRef.current] * (delta / 16)
        container.scrollBy(0, px)

        // 끝까지 스크롤하면 자동 정지
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
          setAutoScrollActive(false)
          return
        }
      }
      lastTime = timestamp
      autoScrollRef.current = requestAnimationFrame(step)
    }

    autoScrollRef.current = requestAnimationFrame(step)

    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current)
        autoScrollRef.current = null
      }
    }
  }, [autoScrollActive, viewMode])

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

          // 상하 경계: 행별 콘텐츠 유무 → 큰 빈 갭으로 헤더/푸터 분리
          const rowHasContent: boolean[] = []
          for (let y = 0; y < height; y++) {
            let found = false
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4
              if (data[i] < threshold || data[i+1] < threshold || data[i+2] < threshold) {
                found = true; break
              }
            }
            rowHasContent.push(found)
          }

          // 전체 top/bottom 먼저 찾기
          let rawTop = 0, rawBottom = height - 1
          for (let y = 0; y < height; y++) { if (rowHasContent[y]) { rawTop = y; break } }
          for (let y = height - 1; y >= 0; y--) { if (rowHasContent[y]) { rawBottom = y; break } }

          // 아래에서 위로: 페이지 높이 3% 이상 빈 갭 찾으면 그 위가 본문 끝
          const gapMin = Math.floor(height * 0.03)
          bottom = rawBottom
          for (let y = rawBottom; y >= rawTop; y--) {
            if (!rowHasContent[y]) {
              let gapSize = 0
              let gy = y
              while (gy >= rawTop && !rowHasContent[gy]) { gapSize++; gy-- }
              if (gapSize >= gapMin) {
                bottom = gy
                break
              }
              y = gy
            }
          }

          // 위에서 아래로: 동일하게 헤더 분리
          top = rawTop
          for (let y = rawTop; y <= bottom; y++) {
            if (!rowHasContent[y]) {
              let gapSize = 0
              let gy = y
              while (gy <= bottom && !rowHasContent[gy]) { gapSize++; gy++ }
              if (gapSize >= gapMin) {
                top = gy
                break
              }
              y = gy
            } else {
              top = y
              break
            }
          }

          // 좌우 경계: 헤더/푸터 제외 (상하 10%)
          const yStart = Math.floor(height * 0.10)
          const yEnd = Math.floor(height * 0.80)
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
        const padLeft = 0.05
        const padRight = 0.03
        const padBottom = 0.035
        const bounds = {
          top: Math.max(0, median(allTops) - pad),
          left: Math.max(0, median(allLefts) - padLeft),
          bottom: Math.min(1, median(allBottoms) + padBottom),
          right: Math.min(1, median(allRights) + padRight),
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

  // ━━━ 돋보기 헬퍼 함수 ━━━
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressPosRef.current = null
  }

  const startMagnifier = (clientX: number, clientY: number): boolean => {
    const el = magnifierElRef.current
    const container = containerRef.current
    if (!el || !container) return false

    const canvases = container.querySelectorAll('canvas')
    let targetCanvas: HTMLCanvasElement | null = null
    let targetRect: DOMRect | null = null

    for (const c of canvases) {
      const rect = c.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        targetCanvas = c as HTMLCanvasElement
        targetRect = rect
        break
      }
    }

    if (!targetCanvas || !targetRect) return false

    try {
      const imgSrc = targetCanvas.toDataURL()
      const magW = Math.min(targetRect.width, window.innerWidth - 16)
      const magH = targetRect.height * 0.45
      magnifierSizeRef.current = { w: magW, h: magH }
      magnifierCanvasRef.current = {
        imgSrc,
        rect: targetRect,
        displayW: targetRect.width,
        displayH: targetRect.height,
      }
      magnifierActiveRef.current = true
      el.style.width = `${magW}px`
      el.style.height = `${magH}px`
      el.style.backgroundImage = `url(${imgSrc})`
      el.style.backgroundSize = `${targetRect.width * MAGNIFIER_ZOOM}px ${targetRect.height * MAGNIFIER_ZOOM}px`
      updateMagnifier(clientX, clientY)
      el.style.display = 'block'
      return true
    } catch {
      return false
    }
  }

  const updateMagnifier = (clientX: number, clientY: number) => {
    const el = magnifierElRef.current
    const data = magnifierCanvasRef.current
    if (!el || !data) return

    const { w: magW, h: magH } = magnifierSizeRef.current

    // 돋보기 위치: 손가락/커서 위 20px, 화면 안에 유지
    const magX = Math.max(4, Math.min(clientX - magW / 2, window.innerWidth - magW - 4))
    const magY = Math.max(4, clientY - magH - 20)
    el.style.left = `${magX}px`
    el.style.top = `${magY}px`

    // 배경 위치: 돋보기 렌즈 뒷부분(렌즈 중심 좌표)을 확대
    const magCenterX = magX + magW / 2
    const magCenterY = magY + magH / 2
    const relX = (magCenterX - data.rect.left) / data.displayW
    const relY = (magCenterY - data.rect.top) / data.displayH
    const bgX = relX * data.displayW * MAGNIFIER_ZOOM - magW / 2
    const bgY = relY * data.displayH * MAGNIFIER_ZOOM - magH / 2
    el.style.backgroundPosition = `-${bgX}px -${bgY}px`
  }

  const hideMagnifier = () => {
    const el = magnifierElRef.current
    if (el) {
      el.style.display = 'none'
      el.style.backgroundImage = ''
    }
    magnifierCanvasRef.current = null
    if (magnifierActiveRef.current) {
      magnifierActiveRef.current = false
      magnifierWasActiveRef.current = true
      setTimeout(() => { magnifierWasActiveRef.current = false }, 200)
    }
  }

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
      // 돋보기 정리
      clearLongPressTimer()
      hideMagnifier()

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

      // 롱프레스 타이머 시작 (돋보기)
      const tx = e.touches[0].clientX
      const ty = e.touches[0].clientY
      longPressPosRef.current = { x: tx, y: ty }
      longPressTimerRef.current = setTimeout(() => {
        if (longPressPosRef.current) {
          startMagnifier(longPressPosRef.current.x, longPressPosRef.current.y)
        }
      }, LONG_PRESS_MS)

      if (viewModeRef.current === 'scroll') return
      touchEndRef.current = null
      touchStartRef.current = { x: tx, y: ty }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        e.stopPropagation()
        clearLongPressTimer()
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

      // 돋보기 활성: 위치 업데이트
      if (magnifierActiveRef.current && e.touches.length === 1) {
        e.preventDefault()
        updateMagnifier(e.touches[0].clientX, e.touches[0].clientY)
        return
      }

      // 롱프레스 타이머: 움직이면 취소
      if (longPressPosRef.current && e.touches.length === 1) {
        const dx = e.touches[0].clientX - longPressPosRef.current.x
        const dy = e.touches[0].clientY - longPressPosRef.current.y
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          clearLongPressTimer()
        }
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
      clearLongPressTimer()

      // 돋보기가 활성이었으면 숨기고 종료 (스와이프/페이지 이동 안함)
      if (magnifierActiveRef.current) {
        hideMagnifier()
        setSwipeOffset(0)
        touchStartRef.current = null
        touchEndRef.current = null
        return
      }

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

    const preventContext = (e: Event) => e.preventDefault()
    overlay.addEventListener('contextmenu', preventContext)
    overlay.addEventListener('touchstart', handleTouchStart, { passive: false })
    overlay.addEventListener('touchmove', handleTouchMove, { passive: false })
    overlay.addEventListener('touchend', handleTouchEnd)

    return () => {
      overlay.removeEventListener('contextmenu', preventContext)
      overlay.removeEventListener('touchstart', handleTouchStart)
      overlay.removeEventListener('touchmove', handleTouchMove)
      overlay.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  // ━━━ PC: 확대 상태에서 마우스 휠 + 드래그 + 롱프레스 돋보기 ━━━
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
      clearLongPressTimer()
      hideMagnifier()

      if (scaleRef.current > 1.05) {
        if (e.button !== 0) return
        e.preventDefault()
        mouseDragRef.current = true
        panStartRef.current = {
          x: e.clientX, y: e.clientY,
          tx: panTranslateRef.current.x, ty: panTranslateRef.current.y,
        }
        overlay.style.cursor = 'grabbing'
        return
      }

      // 롱프레스 타이머 시작 (돋보기, PC)
      if (e.button === 0) {
        longPressPosRef.current = { x: e.clientX, y: e.clientY }
        longPressTimerRef.current = setTimeout(() => {
          if (longPressPosRef.current) {
            startMagnifier(longPressPosRef.current.x, longPressPosRef.current.y)
          }
        }, LONG_PRESS_MS)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      // 돋보기 활성: 위치 업데이트
      if (magnifierActiveRef.current) {
        e.preventDefault()
        updateMagnifier(e.clientX, e.clientY)
        return
      }

      // 롱프레스 타이머: 움직이면 취소
      if (longPressPosRef.current) {
        const dx = e.clientX - longPressPosRef.current.x
        const dy = e.clientY - longPressPosRef.current.y
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          clearLongPressTimer()
        }
      }

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
      clearLongPressTimer()

      if (magnifierActiveRef.current) {
        hideMagnifier()
        return
      }

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

  // ━━━ 스크롤 모드: 돋보기 전용 이벤트 ━━━
  useEffect(() => {
    if (viewMode !== 'scroll') return
    const container = scrollContainerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      clearLongPressTimer()
      hideMagnifier()
      // 자동 스크롤 중이면 터치 시 일시정지
      if (autoScrollActiveRef.current) {
        setAutoScrollActive(false)
      }
      const tx = e.touches[0].clientX
      const ty = e.touches[0].clientY
      longPressPosRef.current = { x: tx, y: ty }
      longPressTimerRef.current = setTimeout(() => {
        if (longPressPosRef.current) {
          startMagnifier(longPressPosRef.current.x, longPressPosRef.current.y)
        }
      }, LONG_PRESS_MS)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (magnifierActiveRef.current && e.touches.length === 1) {
        e.preventDefault()
        updateMagnifier(e.touches[0].clientX, e.touches[0].clientY)
        return
      }
      if (longPressPosRef.current && e.touches.length === 1) {
        const dx = e.touches[0].clientX - longPressPosRef.current.x
        const dy = e.touches[0].clientY - longPressPosRef.current.y
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          clearLongPressTimer()
        }
      }
    }

    const handleTouchEnd = () => {
      clearLongPressTimer()
      if (magnifierActiveRef.current) {
        hideMagnifier()
      }
    }

    const preventContext = (e: Event) => { if (magnifierActiveRef.current) e.preventDefault() }
    container.addEventListener('contextmenu', preventContext)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('contextmenu', preventContext)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [viewMode])

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
    if (magnifierWasActiveRef.current) return
    if (viewMode === 'scroll' || !onPageChange) return
    if (scale > 1.05) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const step = viewMode === 'book' ? 2 : 1

    const contentEl = pdfContentRef.current
    if (contentEl) {
      const contentRect = contentEl.getBoundingClientRect()
      const clickX = e.clientX - contentRect.left
      const ratio = clickX / contentRect.width
      if (ratio < 0.25) onPageChange(Math.max(pageNumber - step, 1), numPages)
      else if (ratio > 0.75) onPageChange(Math.min(pageNumber + step, numPages), numPages)
      return
    }

    const clickX = e.clientX - rect.left
    const ratio = clickX / rect.width
    if (ratio < 0.25) onPageChange(Math.max(pageNumber - step, 1), numPages)
    else if (ratio > 0.75) onPageChange(Math.min(pageNumber + step, numPages), numPages)
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
            style={{ touchAction: 'none', cursor: scale > 1.05 ? 'grab' : 'default', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
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
          <>
            {pdfLoading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-[#C4A882] text-sm">PDF 로딩 중...</p>
                </div>
              </div>
            )}
            <div ref={scrollContainerRef} className="h-full overflow-y-auto" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
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
                      height={isCropping ? cropVisibleH : pageHeight}
                      frameStyle={frameStyle}
                      frameStyleDark={frameStyleDark}
                      isCropping={isCropping}
                      cropPageWidth={cropPageWidth}
                      cropVisibleW={cropVisibleW}
                      cropVisibleH={cropVisibleH}
                      cropOffX={cropOffX}
                      cropOffY={cropOffY}
                    />
                  ))}
                </PDFDocument>
              </div>
            </div>

            {/* ━━━ 자동 스크롤 플로팅 컨트롤 ━━━ */}
            {numPages > 0 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <div className="relative">
                  {/* 속도 조절: 버튼 왼쪽으로 확장 */}
                  {autoScrollActive && (
                    <div className="absolute right-full mr-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-black/35 backdrop-blur-md rounded-full px-1.5 py-1 border border-white/10">
                      <button
                        onClick={() => setAutoScrollSpeed(s => Math.max(1, s - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-mono text-white/80 w-5 text-center select-none">{autoScrollSpeed}x</span>
                      <button
                        onClick={() => setAutoScrollSpeed(s => Math.min(5, s + 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {/* 재생/정지 버튼: 중앙 고정 */}
                  <button
                    onClick={() => setAutoScrollActive(a => !a)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/50 transition-all shadow-lg border border-white/10"
                  >
                    {autoScrollActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ━━━ 돋보기 UI ━━━ */}
      <div
        ref={magnifierElRef}
        className="fixed pointer-events-none z-[100]"
        style={{
          display: 'none',
          borderRadius: '10px',
          border: '3px solid rgba(178, 150, 125, 0.9)',
          boxShadow: '0 6px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
          overflow: 'hidden',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#fff',
        }}
      />
    </div>
  )
}
