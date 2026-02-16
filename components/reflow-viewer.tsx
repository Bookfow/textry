'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface ReflowViewerProps {
  pdfUrl: string
  documentId?: string
  pageNumber: number
  onPageChange?: (page: number, total: number) => void
  onDocumentLoad?: (numPages: number) => void
  onSwitchToPdf?: () => void  // ★ 리플로우 불가 시 PDF 모드 전환
}

// ━━━ 리플로우 설정 ━━━
type ReflowFont = 'sans' | 'serif' | 'mono'
type ReflowTheme = 'light' | 'sepia' | 'dark'

const FONTS: Record<ReflowFont, { label: string; family: string }> = {
  sans: { label: '고딕', family: 'system-ui, -apple-system, "Noto Sans KR", sans-serif' },
  serif: { label: '명조', family: '"Noto Serif KR", "Batang", Georgia, serif' },
  mono: { label: '고정폭', family: '"Noto Sans Mono", "D2Coding", monospace' },
}

const THEMES: Record<ReflowTheme, { bg: string; text: string; muted: string; border: string; pageBg: string; headingColor: string }> = {
  light: { bg: '#ffffff', text: '#1a1a1a', muted: '#666666', border: '#e5e5e5', pageBg: '#f5f5f5', headingColor: '#111111' },
  sepia: { bg: '#f8f1e3', text: '#5b4636', muted: '#8b7355', border: '#d4c5a9', pageBg: '#ede4d3', headingColor: '#3d2b1f' },
  dark: { bg: '#1a1a2e', text: '#e0e0e0', muted: '#888888', border: '#2d2d44', pageBg: '#12121f', headingColor: '#f0f0f0' },
}

// ━━━ 깨진 텍스트 감지 ━━━
function isBrokenText(text: string): boolean {
  if (!text || text.trim().length === 0) return true
  const cleaned = text.replace(/\s/g, '')
  if (cleaned.length === 0) return true

  // 정상 문자: 한글(가-힣, ㄱ-ㅎ, ㅏ-ㅣ), 영문, 숫자, 일반 문장부호
  let normalCount = 0
  for (let i = 0; i < cleaned.length; i++) {
    const code = cleaned.charCodeAt(i)
    if (
      (code >= 0xAC00 && code <= 0xD7AF) ||  // 한글 음절
      (code >= 0x3131 && code <= 0x318E) ||  // 한글 자모
      (code >= 0x0041 && code <= 0x005A) ||  // A-Z
      (code >= 0x0061 && code <= 0x007A) ||  // a-z
      (code >= 0x0030 && code <= 0x0039) ||  // 0-9
      (code >= 0x0020 && code <= 0x002F) ||  // 공백, !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /
      (code >= 0x003A && code <= 0x0040) ||  // :, ;, <, =, >, ?, @
      (code >= 0x005B && code <= 0x0060) ||  // [, \, ], ^, _, `
      (code >= 0x007B && code <= 0x007E) ||  // {, |, }, ~
      (code >= 0x2000 && code <= 0x206F) ||  // 일반 구두점
      (code >= 0x3000 && code <= 0x303F) ||  // CJK 구두점 (。、「」 등)
      (code >= 0xFF01 && code <= 0xFF5E)     // 전각 영숫자/문장부호
    ) {
      normalCount++
    }
  }

  // 정상 문자가 40% 미만이면 깨진 텍스트
  if (cleaned.length >= 5 && normalCount / cleaned.length < 0.4) return true

  // 기존 체크도 유지
  let brokenCount = 0
  for (let i = 0; i < cleaned.length; i++) {
    const code = cleaned.charCodeAt(i)
    if (
      (code >= 0xE000 && code <= 0xF8FF) ||
      (code < 0x0020 && code !== 0x0009 && code !== 0x000A && code !== 0x000D) ||
      code === 0xFFFD ||
      (code >= 0x2400 && code <= 0x243F)
    ) {
      brokenCount++
    }
  }

  if (brokenCount / cleaned.length > 0.3) return true
  if (/[□▯○◻◼■▪▫]{3,}/.test(cleaned)) return true
  if (/^[\d\s.,-]+$/.test(cleaned) && cleaned.length > 50) return true

  return false
}

// ━━━ 블록 타입 ━━━
type BlockType = 'heading1' | 'heading2' | 'heading3' | 'body' | 'separator'

interface TextBlock {
  type: BlockType
  content: string
}

// ━━━ 폰트 크기 기반 블록 분류 ━━━
function classifyBlocks(items: any[]): TextBlock[] {
  if (items.length === 0) return []

  interface LineInfo {
    text: string
    fontSize: number
    y: number
  }

  const lines: LineInfo[] = []
  let lastY: number | null = null
  let currentLine = ''
  let currentFontSizes: number[] = []
  let currentY = 0

  for (const item of items) {
    if (!('str' in item) || !item.str) continue
    const y = Math.round(item.transform[5])
    const fs = Math.round(Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 12)

    if (lastY !== null && Math.abs(y - lastY) > 3) {
      const trimmed = currentLine.trim()
      if (trimmed) {
        const avgFs = currentFontSizes.length > 0
          ? currentFontSizes.reduce((a, b) => a + b, 0) / currentFontSizes.length
          : 12
        lines.push({ text: trimmed, fontSize: Math.round(avgFs), y: currentY })
      }
      currentLine = ''
      currentFontSizes = []
    }

    currentLine += item.str
    currentFontSizes.push(fs)
    currentY = y
    lastY = y
  }

  const trimmedLast = currentLine.trim()
  if (trimmedLast) {
    const avgFs = currentFontSizes.length > 0
      ? currentFontSizes.reduce((a, b) => a + b, 0) / currentFontSizes.length
      : 12
    lines.push({ text: trimmedLast, fontSize: Math.round(avgFs), y: currentY })
  }

  if (lines.length === 0) return []

  // 깨진 텍스트 필터링
  const cleanLines = lines.filter(l => !isBrokenText(l.text))
  if (cleanLines.length === 0) return [{ type: 'body', content: '(텍스트를 추출할 수 없습니다)' }]

  // 본문 폰트 크기 기준 계산 (최빈값 - 글자 수 가중)
  const fsCount = new Map<number, number>()
  for (const l of cleanLines) {
    fsCount.set(l.fontSize, (fsCount.get(l.fontSize) || 0) + l.text.length)
  }
  let bodyFontSize = 12
  let maxWeight = 0
  for (const [fs, weight] of fsCount) {
    if (weight > maxWeight) {
      maxWeight = weight
      bodyFontSize = fs
    }
  }

  // Y좌표 간격 분석
  const blocks: TextBlock[] = []
  let currentParagraph = ''
  let lastLineY: number | null = null
  const avgLineGap = cleanLines.length > 1
    ? cleanLines.slice(1).reduce((sum, l, i) => sum + Math.abs(l.y - cleanLines[i].y), 0) / (cleanLines.length - 1)
    : 20

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i]
    const fsDiff = line.fontSize - bodyFontSize

    // 큰 간격 → 섹션 구분
    if (lastLineY !== null) {
      const gap = Math.abs(line.y - lastLineY)
      if (gap > avgLineGap * 2.5 && currentParagraph) {
        blocks.push({ type: 'body', content: currentParagraph })
        currentParagraph = ''
        blocks.push({ type: 'separator', content: '' })
      }
    }

    // 제목 판별
    if (fsDiff >= 4 && line.text.length < 80) {
      if (currentParagraph) {
        blocks.push({ type: 'body', content: currentParagraph })
        currentParagraph = ''
      }
      if (fsDiff >= 8) {
        blocks.push({ type: 'heading1', content: line.text })
      } else {
        blocks.push({ type: 'heading2', content: line.text })
      }
    } else if (fsDiff >= 2 && line.text.length < 50) {
      if (currentParagraph) {
        blocks.push({ type: 'body', content: currentParagraph })
        currentParagraph = ''
      }
      blocks.push({ type: 'heading3', content: line.text })
    } else {
      if (currentParagraph) currentParagraph += ' '
      currentParagraph += line.text
    }

    lastLineY = line.y
  }

  if (currentParagraph) {
    blocks.push({ type: 'body', content: currentParagraph })
  }

  return blocks
}

// ━━━ 블록 ↔ 직렬화 (DB 저장/복원) ━━━
function serializeBlocks(blocks: TextBlock[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading1': return `<h1>${b.content}</h1>`
      case 'heading2': return `<h2>${b.content}</h2>`
      case 'heading3': return `<h3>${b.content}</h3>`
      case 'separator': return '<hr>'
      default: return b.content
    }
  }).join('\n\n')
}

function deserializeBlocks(text: string): TextBlock[] {
  if (!text) return []
  const parts = text.split('\n\n')
  return parts.map(part => {
    if (part.startsWith('<h1>') && part.endsWith('</h1>')) return { type: 'heading1' as BlockType, content: part.slice(4, -5) }
    if (part.startsWith('<h2>') && part.endsWith('</h2>')) return { type: 'heading2' as BlockType, content: part.slice(4, -5) }
    if (part.startsWith('<h3>') && part.endsWith('</h3>')) return { type: 'heading3' as BlockType, content: part.slice(4, -5) }
    if (part === '<hr>') return { type: 'separator' as BlockType, content: '' }
    return { type: 'body' as BlockType, content: part }
  }).filter(b => b.content || b.type === 'separator')
}

export default function ReflowViewer({
  pdfUrl,
  documentId,
  pageNumber,
  onPageChange,
  onDocumentLoad,
  onSwitchToPdf,
}: ReflowViewerProps) {
  const [pageTexts, setPageTexts] = useState<Map<number, string>>(new Map())
  const [numPages, setNumPages] = useState(0)
  const [extracting, setExtracting] = useState(true)
  const [extractProgress, setExtractProgress] = useState(0)
  const [loadSource, setLoadSource] = useState<'db' | 'client' | ''>('')
  const [unsupported, setUnsupported] = useState(false)

  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(1.8)
  const [font, setFont] = useState<ReflowFont>('sans')
  const [theme, setTheme] = useState<ReflowTheme>('dark')
  const [showSettings, setShowSettings] = useState(false)

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    try {
      localStorage.setItem('textry_reflow_settings', JSON.stringify({ fontSize, lineHeight, font, theme }))
    } catch {}
  }, [fontSize, lineHeight, font, theme])

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

  // ━━━ DB 우선 조회 → 클라이언트 추출 fallback ━━━
  useEffect(() => {
    if (!pdfUrl) return
    let cancelled = false

    const loadTexts = async () => {
      setExtracting(true)
      setExtractProgress(0)
      setLoadSource('')

      if (documentId) {
        try {
          const { data, error } = await supabase
            .from('document_pages_text')
            .select('page_number, text_content')
            .eq('document_id', documentId)
            .order('page_number', { ascending: true })

          if (!error && data && data.length > 0) {
            const texts = new Map<number, string>()
            const total = data.length

            for (const row of data) {
              texts.set(row.page_number, row.text_content || `(${row.page_number}페이지: 텍스트 없음)`)
            }

            if (!cancelled) {
              setPageTexts(texts)
              setNumPages(total)
              setLoadSource('db')
              setExtracting(false)
              setExtractProgress(100)
              if (onDocumentLoad) onDocumentLoad(total)

              // ★ 품질 체크: 빈/깨진 페이지 비율
              let emptyCount = 0
              for (const [, t] of texts) {
                const cleaned = t.replace(/<h[1-3]>.*?<\/h[1-3]>|<hr>/g, '').replace(/\s/g, '')
                if (cleaned.length < 10) emptyCount++
              }
              if (total > 0 && emptyCount / total > 0.5) setUnsupported(true)
            }
            return
          }
        } catch (dbErr) {
          console.warn('DB 텍스트 조회 실패, 클라이언트 추출로 전환:', dbErr)
        }
      }

      if (cancelled) return
      setLoadSource('client')

      try {
        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
          cMapPacked: true,
        })
        const pdf = await loadingTask.promise
        const total = pdf.numPages
        setNumPages(total)
        if (onDocumentLoad) onDocumentLoad(total)

        const texts = new Map<number, string>()

        for (let i = 1; i <= total; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()

          const blocks = classifyBlocks(textContent.items as any[])
          const serialized = serializeBlocks(blocks)

          texts.set(i, serialized || `(${i}페이지: 텍스트 없음)`)
          setExtractProgress(Math.round((i / total) * 100))
        }

        if (!cancelled) {
          setPageTexts(texts)
          setExtracting(false)

          // ★ 품질 체크
          let emptyCount = 0
          for (const [, t] of texts) {
            const cleaned = t.replace(/<h[1-3]>.*?<\/h[1-3]>|<hr>/g, '').replace(/\s/g, '')
            if (cleaned.length < 10) emptyCount++
          }
          if (total > 0 && emptyCount / total > 0.5) setUnsupported(true)
        }
      } catch (err) {
        console.error('Text extraction error:', err)
        if (!cancelled) setExtracting(false)
      }
    }

    loadTexts()
    return () => { cancelled = true }
  }, [pdfUrl, documentId])

  const currentBlocks = deserializeBlocks(pageTexts.get(pageNumber) || '')

  const goToPrev = useCallback(() => {
    if (pageNumber > 1 && onPageChange) onPageChange(pageNumber - 1, numPages)
  }, [pageNumber, numPages, onPageChange])

  const goToNext = useCallback(() => {
    if (pageNumber < numPages && onPageChange) onPageChange(pageNumber + 1, numPages)
  }, [pageNumber, numPages, onPageChange])

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
    if (Math.abs(dx) > 50 && dy < Math.abs(dx)) {
      if (dx > 0) goToNext()
      else goToPrev()
    }
    touchStartRef.current = null
    touchEndRef.current = null
  }

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [pageNumber])

  const handleClick = (e: React.MouseEvent) => {
    if (showSettings) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left
    if (clickX < rect.width / 2) goToPrev()
    else goToNext()
  }

  const themeStyle = THEMES[theme]
  const fontStyle = FONTS[font]

  if (extracting) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: themeStyle.pageBg }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: themeStyle.muted }} className="text-sm">
            {loadSource === 'client' ? `텍스트 추출 중... ${extractProgress}%` : '텍스트 불러오는 중...'}
          </p>
          {loadSource === 'client' && (
            <div className="w-48 h-1.5 bg-gray-700 rounded-full mt-2 mx-auto overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${extractProgress}%` }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderBlock = (block: TextBlock, index: number) => {
    switch (block.type) {
      case 'heading1':
        return (
          <h2 key={index} className="font-bold mt-10 mb-4"
            style={{ fontSize: `${Math.round(fontSize * 1.6)}px`, lineHeight: 1.3, color: themeStyle.headingColor, fontFamily: fontStyle.family }}>
            {block.content}
          </h2>
        )
      case 'heading2':
        return (
          <h3 key={index} className="font-bold mt-8 mb-3"
            style={{ fontSize: `${Math.round(fontSize * 1.35)}px`, lineHeight: 1.35, color: themeStyle.headingColor, fontFamily: fontStyle.family }}>
            {block.content}
          </h3>
        )
      case 'heading3':
        return (
          <h4 key={index} className="font-semibold mt-6 mb-2"
            style={{ fontSize: `${Math.round(fontSize * 1.15)}px`, lineHeight: 1.4, color: themeStyle.headingColor, fontFamily: fontStyle.family }}>
            {block.content}
          </h4>
        )
      case 'separator':
        return <div key={index} className="my-6" style={{ borderTop: `1px solid ${themeStyle.border}` }} />
      default:
        return (
          <p key={index} className="mb-4"
            style={{ textIndent: '1em', fontFamily: fontStyle.family, fontSize: `${fontSize}px`, lineHeight: lineHeight, color: themeStyle.text, wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
            {block.content}
          </p>
        )
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: themeStyle.pageBg }}>
      {/* 설정 바 */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ backgroundColor: themeStyle.bg, borderColor: themeStyle.border }}>
        <div className="flex items-center gap-2">
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

          {(Object.keys(FONTS) as ReflowFont[]).map((f) => (
            <button key={f} onClick={() => setFont(f)}
              className={`px-2 py-1 rounded text-xs transition-all ${font === f ? 'ring-2 ring-blue-500' : 'hover:opacity-70'}`}
              style={{ backgroundColor: font === f ? 'rgba(59,130,246,0.15)' : 'transparent', color: font === f ? '#3b82f6' : themeStyle.muted, fontFamily: FONTS[f].family }}>
              {FONTS[f].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] hidden sm:inline" style={{ color: themeStyle.muted }}>줄간격</span>
          <select value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))}
            className="text-xs rounded px-1 py-0.5 border"
            style={{ backgroundColor: themeStyle.bg, color: themeStyle.text, borderColor: themeStyle.border }}>
            <option value={1.4}>촘촘</option>
            <option value={1.6}>보통</option>
            <option value={1.8}>넓게</option>
            <option value={2.0}>아주 넓게</option>
          </select>

          <div className="w-px h-4 mx-1" style={{ backgroundColor: themeStyle.border }} />

          <div className="flex gap-1">
            {(Object.keys(THEMES) as ReflowTheme[]).map((t) => (
              <button key={t} onClick={() => setTheme(t)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${theme === t ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                style={{ backgroundColor: THEMES[t].bg, borderColor: THEMES[t].border }}
                title={t === 'light' ? '밝은' : t === 'sepia' ? '세피아' : '어두운'} />
            ))}
          </div>
        </div>
      </div>

      {/* 텍스트 본문 */}
      <div ref={contentRef} className="flex-1 overflow-y-auto cursor-pointer" style={{ backgroundColor: themeStyle.bg }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={handleClick}>
        <div className="max-w-2xl mx-auto px-6 sm:px-10 py-8">
          <div className="mb-6 pb-3 border-b" style={{ borderColor: themeStyle.border }}>
            <span className="text-xs font-medium" style={{ color: themeStyle.muted }}>
              {pageNumber} / {numPages} 페이지
            </span>
          </div>

          {/* ━━━ 리플로우 미지원 안내 ━━━ */}
          {unsupported && (
            <div className="mb-6 rounded-xl p-5 text-center" style={{
              backgroundColor: theme === 'dark' ? '#1e1e3a' : theme === 'sepia' ? '#f0e6cc' : '#f0f4ff',
              border: `1px solid ${theme === 'dark' ? '#2d2d50' : theme === 'sepia' ? '#d4c5a9' : '#d0d8f0'}`,
            }}>
              <div className="text-2xl mb-2">📄</div>
              <p className="font-semibold mb-1" style={{
                color: themeStyle.headingColor,
                fontSize: `${Math.round(fontSize * 0.9)}px`,
              }}>
                이 문서는 리플로우 모드를 지원하지 않습니다
              </p>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: themeStyle.muted }}>
                스캔 이미지, 장식 폰트, 벡터 변환 등으로 인해{'\n'}
                텍스트를 정상적으로 추출할 수 없습니다.{'\n'}
                PDF 뷰어 모드에서 원본 그대로 읽을 수 있습니다.
              </p>
              {onSwitchToPdf && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSwitchToPdf() }}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#3b82f6' }}
                >
                  PDF 뷰어로 전환
                </button>
              )}
            </div>
          )}

          <div>
            {currentBlocks.length > 0 ? (
              currentBlocks.map((block, i) => renderBlock(block, i))
            ) : (
              <p className="text-center py-8" style={{ color: themeStyle.muted }}>
                (이 페이지에 추출 가능한 텍스트가 없습니다)
              </p>
            )}
          </div>

          <div className="mt-8 pt-4 border-t flex items-center justify-between" style={{ borderColor: themeStyle.border }}>
            <button onClick={(e) => { e.stopPropagation(); goToPrev() }} disabled={pageNumber <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg transition-opacity disabled:opacity-30" style={{ color: themeStyle.muted }}>
              <ChevronLeft className="w-4 h-4" /> 이전
            </button>
            <span className="text-xs" style={{ color: themeStyle.muted }}>{pageNumber} / {numPages}</span>
            <button onClick={(e) => { e.stopPropagation(); goToNext() }} disabled={pageNumber >= numPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg transition-opacity disabled:opacity-30" style={{ color: themeStyle.muted }}>
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
