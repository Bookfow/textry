'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Type, Minus, Plus } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface ReflowViewerProps {
  pdfUrl: string
  pageNumber: number
  onPageChange?: (page: number, total: number) => void
  onDocumentLoad?: (numPages: number) => void
}

// ━━━ 리플로우 설정 ━━━
type ReflowFont = 'sans' | 'serif' | 'mono'
type ReflowTheme = 'light' | 'sepia' | 'dark'

const FONTS: Record<ReflowFont, { label: string; family: string }> = {
  sans: { label: '고딕', family: 'system-ui, -apple-system, "Noto Sans KR", sans-serif' },
  serif: { label: '명조', family: '"Noto Serif KR", "Batang", Georgia, serif' },
  mono: { label: '고정폭', family: '"Noto Sans Mono", "D2Coding", monospace' },
}

const THEMES: Record<ReflowTheme, { bg: string; text: string; muted: string; border: string; pageBg: string }> = {
  light: { bg: '#ffffff', text: '#1a1a1a', muted: '#666666', border: '#e5e5e5', pageBg: '#f5f5f5' },
  sepia: { bg: '#f8f1e3', text: '#5b4636', muted: '#8b7355', border: '#d4c5a9', pageBg: '#ede4d3' },
  dark: { bg: '#1a1a2e', text: '#e0e0e0', muted: '#888888', border: '#2d2d44', pageBg: '#12121f' },
}

export default function ReflowViewer({
  pdfUrl,
  pageNumber,
  onPageChange,
  onDocumentLoad,
}: ReflowViewerProps) {
  // ━━━ 텍스트 추출 상태 ━━━
  const [pageTexts, setPageTexts] = useState<Map<number, string>>(new Map())
  const [numPages, setNumPages] = useState(0)
  const [extracting, setExtracting] = useState(true)
  const [extractProgress, setExtractProgress] = useState(0)

  // ━━━ 리플로우 설정 ━━━
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(1.8)
  const [font, setFont] = useState<ReflowFont>('sans')
  const [theme, setTheme] = useState<ReflowTheme>('dark')
  const [showSettings, setShowSettings] = useState(false)

  // ━━━ 스와이프 ━━━
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // ━━━ localStorage 복원 ━━━
  useEffect(() => {
    try {
      const saved = localStorage.getItem('textry_reflow_settings')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.fontSize) setFontSize(s.fontSize)
        if (s.lineHeight) setLineHeight(s.lineHeight)
        if (s.font) setFont(s.font)
        if (s.theme) setTheme(s.theme)
      }
    } catch {}
  }, [])

  // ━━━ 설정 저장 ━━━
  useEffect(() => {
    try {
      localStorage.setItem('textry_reflow_settings', JSON.stringify({ fontSize, lineHeight, font, theme }))
    } catch {}
  }, [fontSize, lineHeight, font, theme])

  // ━━━ 설정 팝업 외부 클릭 닫기 ━━━
  useEffect(() => {
    if (!showSettings) return
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSettings])

  // ━━━ PDF 텍스트 추출 ━━━
  useEffect(() => {
    if (!pdfUrl) return
    let cancelled = false

    const extractText = async () => {
      setExtracting(true)
      try {
        const loadingTask = pdfjs.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        const total = pdf.numPages
        setNumPages(total)
        if (onDocumentLoad) onDocumentLoad(total)

        const texts = new Map<number, string>()

        for (let i = 1; i <= total; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()

          // 텍스트 아이템을 줄 단위로 그룹핑
          let lastY: number | null = null
          let lines: string[] = []
          let currentLine = ''

          for (const item of textContent.items) {
            if ('str' in item) {
              const y = Math.round((item as any).transform[5])
              if (lastY !== null && Math.abs(y - lastY) > 3) {
                if (currentLine.trim()) lines.push(currentLine.trim())
                currentLine = ''
              }
              currentLine += item.str
              lastY = y
            }
          }
          if (currentLine.trim()) lines.push(currentLine.trim())

          // 빈 줄 사이에 단락 구분
          const paragraphs: string[] = []
          let currentParagraph = ''
          for (const line of lines) {
            if (line === '') {
              if (currentParagraph) {
                paragraphs.push(currentParagraph)
                currentParagraph = ''
              }
            } else {
              if (currentParagraph) currentParagraph += ' '
              currentParagraph += line
            }
          }
          if (currentParagraph) paragraphs.push(currentParagraph)

          texts.set(i, paragraphs.join('\n\n') || `(${i}페이지: 텍스트 없음)`)
          setExtractProgress(Math.round((i / total) * 100))
        }

        if (!cancelled) {
          setPageTexts(texts)
          setExtracting(false)
        }
      } catch (err) {
        console.error('Text extraction error:', err)
        setExtracting(false)
      }
    }

    extractText()
    return () => { cancelled = true }
  }, [pdfUrl])

  // ━━━ 현재 페이지 텍스트 ━━━
  const currentText = pageTexts.get(pageNumber) || ''

  // ━━━ 페이지 이동 ━━━
  const goToPrev = useCallback(() => {
    if (pageNumber > 1 && onPageChange) {
      onPageChange(pageNumber - 1, numPages)
    }
  }, [pageNumber, numPages, onPageChange])

  const goToNext = useCallback(() => {
    if (pageNumber < numPages && onPageChange) {
      onPageChange(pageNumber + 1, numPages)
    }
  }, [pageNumber, numPages, onPageChange])

  // ━━━ 스와이프 처리 ━━━
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    touchEndRef.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = () => {
    const ts = touchStartRef.current
    const te = touchEndRef.current
    if (!ts || !te) return

    const dx = ts.x - te.x
    const dy = Math.abs(ts.y - te.y)
    const minSwipe = 50

    if (Math.abs(dx) > minSwipe && dy < Math.abs(dx)) {
      if (dx > 0) goToNext()
      else goToPrev()
    }

    touchStartRef.current = null
    touchEndRef.current = null
  }

  // ━━━ 페이지 변경 시 스크롤 맨 위로 ━━━
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [pageNumber])

  // ━━━ PC 클릭으로 페이지 넘김 ━━━
  const handleClick = (e: React.MouseEvent) => {
    if (showSettings) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const center = rect.width / 2

    if (clickX < center) goToPrev()
    else goToNext()
  }

  const themeStyle = THEMES[theme]
  const fontStyle = FONTS[font]

  // ━━━ 로딩 ━━━
  if (extracting) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: themeStyle.pageBg }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: themeStyle.muted }} className="text-sm">텍스트 추출 중... {extractProgress}%</p>
          <div className="w-48 h-1.5 bg-gray-700 rounded-full mt-2 mx-auto overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${extractProgress}%` }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: themeStyle.pageBg }}>
      {/* ━━━ 리플로우 설정 바 ━━━ */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ backgroundColor: themeStyle.bg, borderColor: themeStyle.border }}>
        <div className="flex items-center gap-2">
          {/* 글꼴 크기 */}
          <button onClick={() => setFontSize(s => Math.max(12, s - 1))}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: themeStyle.muted }}>
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono min-w-[32px] text-center" style={{ color: themeStyle.text }}>{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(32, s + 1))}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: themeStyle.muted }}>
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-px h-4 mx-1" style={{ backgroundColor: themeStyle.border }} />

          {/* 글꼴 선택 */}
          {(Object.keys(FONTS) as ReflowFont[]).map((f) => (
            <button
              key={f}
              onClick={() => setFont(f)}
              className={`px-2 py-1 rounded text-xs transition-all ${font === f ? 'ring-2 ring-blue-500' : 'hover:opacity-70'}`}
              style={{
                backgroundColor: font === f ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: font === f ? '#3b82f6' : themeStyle.muted,
                fontFamily: FONTS[f].family,
              }}
            >
              {FONTS[f].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* 줄간격 */}
          <span className="text-[10px] hidden sm:inline" style={{ color: themeStyle.muted }}>줄간격</span>
          <select
            value={lineHeight}
            onChange={(e) => setLineHeight(Number(e.target.value))}
            className="text-xs rounded px-1 py-0.5 border"
            style={{
              backgroundColor: themeStyle.bg,
              color: themeStyle.text,
              borderColor: themeStyle.border,
            }}
          >
            <option value={1.4}>촘촘</option>
            <option value={1.6}>보통</option>
            <option value={1.8}>넓게</option>
            <option value={2.0}>아주 넓게</option>
          </select>

          <div className="w-px h-4 mx-1" style={{ backgroundColor: themeStyle.border }} />

          {/* 테마 */}
          <div className="flex gap-1">
            {(Object.keys(THEMES) as ReflowTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${theme === t ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                style={{
                  backgroundColor: THEMES[t].bg,
                  borderColor: THEMES[t].border,
                  ringOffsetColor: themeStyle.pageBg,
                }}
                title={t === 'light' ? '밝은' : t === 'sepia' ? '세피아' : '어두운'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ━━━ 텍스트 본문 ━━━ */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto cursor-pointer"
        style={{ backgroundColor: themeStyle.bg }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="max-w-2xl mx-auto px-6 sm:px-10 py-8">
          {/* 페이지 번호 */}
          <div className="mb-6 pb-3 border-b" style={{ borderColor: themeStyle.border }}>
            <span className="text-xs font-medium" style={{ color: themeStyle.muted }}>
              {pageNumber} / {numPages} 페이지
            </span>
          </div>

          {/* 본문 텍스트 */}
          <div
            style={{
              fontFamily: fontStyle.family,
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              color: themeStyle.text,
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}
          >
            {currentText.split('\n\n').map((paragraph, i) => (
              <p key={i} className="mb-4" style={{ textIndent: '1em' }}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* 하단 페이지 네비게이션 */}
          <div className="mt-8 pt-4 border-t flex items-center justify-between" style={{ borderColor: themeStyle.border }}>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev() }}
              disabled={pageNumber <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg transition-opacity disabled:opacity-30"
              style={{ color: themeStyle.muted }}
            >
              <ChevronLeft className="w-4 h-4" /> 이전
            </button>
            <span className="text-xs" style={{ color: themeStyle.muted }}>
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext() }}
              disabled={pageNumber >= numPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg transition-opacity disabled:opacity-30"
              style={{ color: themeStyle.muted }}
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
