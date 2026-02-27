'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, List, AlignLeft, AlignJustify, Settings2, Focus, Highlighter, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import JSZip from 'jszip'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 & 상수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface EpubViewerProps {
  epubUrl: string
  documentId?: string
  onPageChange?: (page: number, total: number) => void
  onDocumentLoad?: (numPages: number) => void
}

interface EpubChapter {
  id: string
  href: string
  title: string
  html: string
  order: number
}

interface TocItem {
  title: string
  href: string
  chapterIndex: number
  level: number
}

interface Highlight {
  id: string
  block_id: string
  start_offset: number
  end_offset: number
  selected_text: string
  color: string
  memo: string | null
  page_number: number
}

type ReflowFont = 'sans' | 'serif' | 'mono'
type ReflowTheme = 'light' | 'sepia' | 'dark'
type ReflowAlign = 'left' | 'justify'

const FONTS: Record<ReflowFont, { label: string; family: string }> = {
  sans: { label: '고딕', family: 'system-ui, -apple-system, "Noto Sans KR", sans-serif' },
  serif: { label: '명조', family: '"Noto Serif KR", "Batang", Georgia, serif' },
  mono: { label: '고정폭', family: '"Noto Sans Mono", "D2Coding", monospace' },
}

const THEMES: Record<ReflowTheme, {
  bg: string; text: string; muted: string; border: string
  pageBg: string; headingColor: string; linkColor: string
}> = {
  light: { bg: '#FFFFFF', text: '#2D2016', muted: '#9C8B7A', border: '#E7D8C9', pageBg: '#F7F2EF', headingColor: '#2D2016', linkColor: '#3b82f6' },
  sepia: { bg: '#f8f1e3', text: '#5b4636', muted: '#8b7355', border: '#d4c5a9', pageBg: '#ede4d3', headingColor: '#3d2b1f', linkColor: '#8b5e3c' },
  dark: { bg: '#241E18', text: '#EEE4E1', muted: '#9C8B7A', border: '#3A302A', pageBg: '#1A1410', headingColor: '#EEE4E1', linkColor: '#93c5fd' },
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'rgba(250, 220, 50, 0.3)',
  green: 'rgba(100, 220, 100, 0.25)',
  blue: 'rgba(90, 180, 250, 0.25)',
  pink: 'rgba(245, 130, 180, 0.3)',
}

const MARGIN_MAP: Record<number, { px: number; maxW: string; label: string }> = {
  1: { px: 12, maxW: '56rem', label: '좁게' },
  2: { px: 40, maxW: '42rem', label: '보통' },
  3: { px: 56, maxW: '36rem', label: '넓게' },
  4: { px: 64, maxW: '28rem', label: '아주 넓게' },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EPUB 파싱 유틸
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseXml(xmlStr: string): Document {
  return new DOMParser().parseFromString(xmlStr, 'application/xml')
}

function parseHtml(htmlStr: string): Document {
  return new DOMParser().parseFromString(htmlStr, 'text/html')
}

function resolveEpubPath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) return relativePath.slice(1)
  const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1)
  const parts = (baseDir + relativePath).split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '..') resolved.pop()
    else if (part !== '.' && part !== '') resolved.push(part)
  }
  return resolved.join('/')
}

function getOpfPathFromContainer(containerXml: string): string {
  const doc = parseXml(containerXml)
  return doc.querySelector('rootfile')?.getAttribute('full-path') || 'OEBPS/content.opf'
}

function parseOpf(opfXml: string, opfDir: string) {
  const doc = parseXml(opfXml)
  const manifestItems = new Map<string, { href: string; mediaType: string }>()
  doc.querySelectorAll('manifest > item').forEach(el => {
    const id = el.getAttribute('id') || ''
    const href = el.getAttribute('href') || ''
    const mediaType = el.getAttribute('media-type') || ''
    if (id && href) manifestItems.set(id, { href: resolveEpubPath(opfDir + '/dummy', href), mediaType })
  })
  const spineItemRefs: string[] = []
  doc.querySelectorAll('spine > itemref').forEach(el => {
    const idref = el.getAttribute('idref') || ''
    if (idref) spineItemRefs.push(idref)
  })
  const spineItems = spineItemRefs
    .map(idref => { const item = manifestItems.get(idref); return item ? { id: idref, ...item } : null })
    .filter(Boolean) as { id: string; href: string; mediaType: string }[]

  let tocHref: string | null = null
  let tocType: 'ncx' | 'nav' | null = null
  const manifestEls = doc.querySelectorAll('manifest > item')
  const navEl = Array.from(manifestEls).find(el => (el.getAttribute('properties') || '').includes('nav'))
  if (navEl) { tocHref = resolveEpubPath(opfDir + '/dummy', navEl.getAttribute('href') || ''); tocType = 'nav' }
  if (!tocHref) {
    for (const [, item] of manifestItems) {
      if (item.mediaType === 'application/x-dtbncx+xml') { tocHref = item.href; tocType = 'ncx'; break }
    }
  }
  return { manifestItems, spineItems, tocHref, tocType }
}

function parseTocNcx(ncxXml: string, ncxDir: string): TocItem[] {
  const doc = parseXml(ncxXml)
  const items: TocItem[] = []
  function walk(parentEl: Element, level: number) {
    parentEl.querySelectorAll(':scope > navPoint').forEach(np => {
      const label = np.querySelector('navLabel > text')?.textContent?.trim() || ''
      const src = np.querySelector('content')?.getAttribute('src') || ''
      if (label && src) items.push({ title: label, href: resolveEpubPath(ncxDir + '/dummy', src), chapterIndex: -1, level })
      walk(np, level + 1)
    })
  }
  const navMap = doc.querySelector('navMap')
  if (navMap) walk(navMap, 0)
  return items
}

function parseTocNav(navHtml: string, navDir: string): TocItem[] {
  const doc = parseHtml(navHtml)
  const items: TocItem[] = []
  const navEl = doc.querySelector('nav[*|type="toc"]') || doc.querySelector('nav')
  if (!navEl) return items
  function walkOl(ol: Element, level: number) {
    ol.querySelectorAll(':scope > li').forEach(li => {
      const a = li.querySelector(':scope > a')
      if (a) {
        const title = a.textContent?.trim() || ''
        const href = a.getAttribute('href') || ''
        if (title && href) items.push({ title, href: resolveEpubPath(navDir + '/dummy', href), chapterIndex: -1, level })
      }
      const childOl = li.querySelector(':scope > ol')
      if (childOl) walkOl(childOl, level + 1)
    })
  }
  const rootOl = navEl.querySelector('ol')
  if (rootOl) walkOl(rootOl, 0)
  return items
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function EpubViewer({ epubUrl, documentId, onPageChange, onDocumentLoad }: EpubViewerProps) {
  // ─── EPUB 데이터 ───
  const [chapters, setChapters] = useState<EpubChapter[]>([])
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // ─── 페이지네이션 ───
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0)
  const [pageInChapter, setPageInChapter] = useState(0)
  const [totalPagesInChapter, setTotalPagesInChapter] = useState(1)
  const [chapterPageCounts, setChapterPageCounts] = useState<number[]>([])
  const slideDirectionRef = useRef<'left' | 'right' | ''>('')

  // ─── 뷰어 설정 ───
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(1.8)
  const [font, setFont] = useState<ReflowFont>('sans')
  const [theme, setTheme] = useState<ReflowTheme>('dark')
  const [showSettings, setShowSettings] = useState(false)
  const [marginSize, setMarginSize] = useState(2)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [textAlign, setTextAlign] = useState<ReflowAlign>('left')
  const [showToc, setShowToc] = useState(false)

  // ─── 집중 모드 ───
  const [focusMode, setFocusMode] = useState(false)

  // ─── 남은 시간 ───
  const [elapsedSec, setElapsedSec] = useState(0)
  const elapsedRef = useRef(0)

  // ─── 하이라이트/메모 ───
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [showHighlightMenu, setShowHighlightMenu] = useState(false)
  const [highlightMenuPos, setHighlightMenuPos] = useState({ x: 0, y: 0 })
  const [pendingSelection, setPendingSelection] = useState<{ blockId: string; start: number; end: number; text: string } | null>(null)
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null)
  const [memoText, setMemoText] = useState('')
  const [showMemoModal, setShowMemoModal] = useState(false)
  const [showHighlightPanel, setShowHighlightPanel] = useState(false)

  // ─── refs ───
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)
  const paginationContainerRef = useRef<HTMLDivElement>(null)
  const contentColumnRef = useRef<HTMLDivElement>(null)
  const selectionOverlayRef = useRef<HTMLDivElement>(null)
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null)
  const blobUrlsRef = useRef<string[]>([])
  const [columnWidthPx, setColumnWidthPx] = useState(0) // CSS column-width에 사용할 px 값
  const themeStyle = THEMES[theme]
  const fontStyle = FONTS[font]
  const currentMargin = MARGIN_MAP[marginSize] || MARGIN_MAP[2]

  // ━━━ 가상 페이지 번호 (광고 시스템 호환) ━━━
  const virtualPageNumber = useMemo(() => {
    let page = 1
    for (let i = 0; i < currentChapterIdx; i++) page += chapterPageCounts[i] || 1
    page += pageInChapter
    return page
  }, [currentChapterIdx, pageInChapter, chapterPageCounts])

  const virtualTotalPages = useMemo(() => {
    if (chapterPageCounts.length === 0) return chapters.length || 1
    let total = 0
    for (let i = 0; i < chapters.length; i++) total += chapterPageCounts[i] || 1
    return Math.max(total, 1)
  }, [chapters, chapterPageCounts])

  // ━━━ 설정 복원 & 저장 ━━━
  useEffect(() => {
    try {
      const saved = localStorage.getItem('textry_reflow_settings')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.fontSize) setFontSize(s.fontSize)
        if (s.lineHeight) setLineHeight(s.lineHeight)
        if (s.font) setFont(s.font)
        if (s.theme) setTheme(s.theme)
        if (s.marginSize) setMarginSize(s.marginSize)
        if (s.letterSpacing !== undefined) setLetterSpacing(s.letterSpacing)
        if (s.textAlign) setTextAlign(s.textAlign)
        if (s.focusMode !== undefined) setFocusMode(s.focusMode)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('textry_reflow_settings', JSON.stringify({
        fontSize, lineHeight, font, theme, marginSize, letterSpacing, textAlign, focusMode,
      }))
    } catch {}
  }, [fontSize, lineHeight, font, theme, marginSize, letterSpacing, textAlign, focusMode])

  // 챕터 위치 복원
  useEffect(() => {
    if (!documentId || chapters.length === 0) return
    try {
      const saved = localStorage.getItem(`textry_epub_pos_${documentId}`)
      if (saved) {
        const pos = JSON.parse(saved)
        if (typeof pos.ch === 'number' && pos.ch >= 0 && pos.ch < chapters.length) {
          setCurrentChapterIdx(pos.ch)
          if (typeof pos.pg === 'number' && pos.pg >= 0) setPageInChapter(pos.pg)
        }
      }
    } catch {}
  }, [documentId, chapters.length])

  // 위치 저장
  useEffect(() => {
    if (!documentId || chapters.length === 0) return
    try { localStorage.setItem(`textry_epub_pos_${documentId}`, JSON.stringify({ ch: currentChapterIdx, pg: pageInChapter })) } catch {}
  }, [documentId, currentChapterIdx, pageInChapter, chapters.length])

  // 타이머
  useEffect(() => {
    const timer = setInterval(() => { elapsedRef.current += 10; setElapsedSec(elapsedRef.current) }, 10000)
    return () => clearInterval(timer)
  }, [])

  // parent 보고
  useEffect(() => {
    if (chapters.length === 0) return
    if (onPageChange) onPageChange(virtualPageNumber, virtualTotalPages)
  }, [virtualPageNumber, virtualTotalPages, chapters.length])

  // ━━━ EPUB 로드 ━━━
  useEffect(() => {
    if (!epubUrl) return
    let cancelled = false
    const loadEpub = async () => {
      setLoading(true); setLoadProgress(0); setError(null)
      try {
        setLoadProgress(5)
        const response = await fetch(epubUrl)
        if (!response.ok) throw new Error(`EPUB 다운로드 실패: ${response.status}`)
        const arrayBuffer = await response.arrayBuffer()
        if (cancelled) return

        setLoadProgress(15)
        const zip = await JSZip.loadAsync(arrayBuffer)
        if (cancelled) return

        setLoadProgress(20)
        const containerFile = zip.file('META-INF/container.xml')
        if (!containerFile) throw new Error('container.xml을 찾을 수 없습니다')
        const containerXml = await containerFile.async('string')
        const opfPath = getOpfPathFromContainer(containerXml)
        const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'))

        setLoadProgress(25)
        const opfFile = zip.file(opfPath)
        if (!opfFile) throw new Error('OPF 파일을 찾을 수 없습니다')
        const opfXml = await opfFile.async('string')
        const { manifestItems, spineItems, tocHref, tocType } = parseOpf(opfXml, opfDir)
        if (cancelled) return

        // 이미지 → blob URL
        setLoadProgress(30)
        const blobUrlMap = new Map<string, string>()
        const imageItems = Array.from(manifestItems.values()).filter(item => item.mediaType.startsWith('image/'))
        for (let i = 0; i < imageItems.length; i++) {
          if (cancelled) return
          const item = imageItems[i]
          const file = zip.file(item.href)
          if (file) {
            try {
              const blob = await file.async('blob')
              const url = URL.createObjectURL(new Blob([blob], { type: item.mediaType }))
              blobUrlMap.set(item.href, url)
              blobUrlsRef.current.push(url)
            } catch {}
          }
          setLoadProgress(30 + Math.round((i / Math.max(imageItems.length, 1)) * 20))
        }

        // 챕터 추출
        setLoadProgress(60)
        const parsedChapters: EpubChapter[] = []
        for (let i = 0; i < spineItems.length; i++) {
          if (cancelled) return
          const spine = spineItems[i]
          const chapterFile = zip.file(spine.href)
          if (!chapterFile) continue
          try {
            const rawHtml = await chapterFile.async('string')
            const doc = parseHtml(rawHtml)
            const body = doc.querySelector('body')
            if (!body) continue
            const textContent = body.textContent?.trim() || ''
            if (textContent.length < 3 && !body.querySelector('img, svg, image')) continue

            const chapterDir = spine.href.substring(0, spine.href.lastIndexOf('/'))
            body.querySelectorAll('img, image, svg image').forEach(img => {
              const srcAttr = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttribute('href') || ''
              if (srcAttr && !srcAttr.startsWith('blob:') && !srcAttr.startsWith('http')) {
                const resolved = resolveEpubPath(chapterDir + '/dummy', srcAttr)
                const blobUrl = blobUrlMap.get(resolved)
                if (blobUrl) {
                  if (img.tagName.toLowerCase() === 'img') img.setAttribute('src', blobUrl)
                  else { img.setAttribute('xlink:href', blobUrl); img.setAttribute('href', blobUrl) }
                }
              }
            })
            body.querySelectorAll('a[href]').forEach(a => {
              const href = a.getAttribute('href') || ''
              if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
                a.removeAttribute('href'); a.setAttribute('role', 'text')
                ;(a as HTMLElement).style.cursor = 'default'
              }
            })

            let title = ''
            const h = body.querySelector('h1, h2, h3')
            if (h) title = h.textContent?.trim().slice(0, 60) || ''
            if (!title) title = textContent.slice(0, 50) + (textContent.length > 50 ? '...' : '')

            // EPUB 원본 style/link 태그 제거 (우리 CSS와 충돌 방지)
            body.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove())
            // 인라인 style에서 선택/배경 관련 속성 제거
            body.querySelectorAll('[style]').forEach(el => {
              const s = (el as HTMLElement).style
              s.removeProperty('user-select')
              s.removeProperty('-webkit-user-select')
              s.removeProperty('background')
              s.removeProperty('background-color')
              s.removeProperty('color')
              s.removeProperty('font-size')
              s.removeProperty('font-family')
            })

            parsedChapters.push({ id: spine.id, href: spine.href, title, html: body.innerHTML, order: parsedChapters.length })
          } catch (err) { console.warn('챕터 파싱 실패:', spine.href, err) }
          setLoadProgress(60 + Math.round((i / spineItems.length) * 30))
        }

        if (cancelled) return
        if (parsedChapters.length === 0) throw new Error('읽을 수 있는 챕터가 없습니다')

        // TOC
        setLoadProgress(92)
        let parsedToc: TocItem[] = []
        if (tocHref && tocType) {
          const tocFile = zip.file(tocHref)
          if (tocFile) {
            try {
              const tocContent = await tocFile.async('string')
              const tocDir = tocHref.substring(0, tocHref.lastIndexOf('/'))
              parsedToc = tocType === 'ncx' ? parseTocNcx(tocContent, tocDir) : parseTocNav(tocContent, tocDir)
            } catch {}
          }
        }
        for (const item of parsedToc) {
          const tocBase = item.href.split('#')[0]
          const idx = parsedChapters.findIndex(ch => {
            const chBase = ch.href.split('#')[0]
            return chBase === tocBase || chBase.endsWith(tocBase) || tocBase.endsWith(chBase)
          })
          item.chapterIndex = idx >= 0 ? idx : -1
        }
        if (parsedToc.length === 0) {
          parsedToc = parsedChapters.map((ch, i) => ({ title: ch.title || `챕터 ${i + 1}`, href: ch.href, chapterIndex: i, level: 0 }))
        }

        setLoadProgress(100)
        setChapters(parsedChapters)
        setTocItems(parsedToc)
        setChapterPageCounts(new Array(parsedChapters.length).fill(1))
        setLoading(false)
        if (onDocumentLoad) onDocumentLoad(parsedChapters.length)
      } catch (err: any) {
        if (!cancelled) { setError(err.message || 'EPUB을 불러올 수 없습니다'); setLoading(false) }
      }
    }
    loadEpub()
    return () => { cancelled = true; blobUrlsRef.current.forEach(url => { try { URL.revokeObjectURL(url) } catch {} }); blobUrlsRef.current = [] }
  }, [epubUrl])

  // ━━━ CSS 컬럼 기반 페이지네이션 계산 ━━━
  const recalcPages = useCallback(() => {
    const container = paginationContainerRef.current
    const colEl = contentColumnRef.current
    if (!container || !colEl) return

    // 패딩 제외한 실제 콘텐츠 영역 너비
    const style = getComputedStyle(container)
    const paddingLeft = parseFloat(style.paddingLeft) || 0
    const paddingRight = parseFloat(style.paddingRight) || 0
    const contentWidth = container.clientWidth - paddingLeft - paddingRight
    if (contentWidth <= 0) return

    // DOM에 직접 적용 후 즉시 측정 (React state 대기 없이)
    const gap = 40
    colEl.style.columnWidth = `${contentWidth}px`
    colEl.style.columnGap = `${gap}px`
    setColumnWidthPx(contentWidth + gap)

    // 강제 리플로우 후 측정
    const pageWidth = contentWidth + gap
    const totalPages = Math.max(1, Math.round(colEl.scrollWidth / pageWidth))
    setTotalPagesInChapter(totalPages)
    setChapterPageCounts(prev => {
      const next = [...prev]
      while (next.length <= currentChapterIdx) next.push(1)
      next[currentChapterIdx] = totalPages
      return next
    })
    setPageInChapter(prev => Math.min(prev, totalPages - 1))
  }, [currentChapterIdx])

  // 챕터/설정 변경 시 재계산
  useEffect(() => {
    if (chapters.length === 0) return
    const timer = setTimeout(recalcPages, 10)
    return () => clearTimeout(timer)
  }, [currentChapterIdx, chapters, recalcPages, fontSize, lineHeight, font, marginSize, letterSpacing, textAlign])

  // 리사이즈 시 재계산
  useEffect(() => {
    const handleResize = () => recalcPages()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [recalcPages])

  // 페이지 전환 (translateX + fade)
  useEffect(() => {
    const colEl = contentColumnRef.current
    if (!colEl || columnWidthPx <= 0) return

    const direction = slideDirectionRef.current
    slideDirectionRef.current = ''

    const targetX = pageInChapter * columnWidthPx

    if (direction) {
      const offset = direction === 'left' ? 40 : -40
      colEl.style.transition = 'none'
      colEl.style.opacity = '0'
      colEl.style.transform = `translateX(-${targetX - offset}px)`
      requestAnimationFrame(() => {
        colEl.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out'
        colEl.style.opacity = '1'
        colEl.style.transform = `translateX(-${targetX}px)`
      })
    } else {
      colEl.style.transition = 'none'
      colEl.style.transform = `translateX(-${targetX}px)`
    }
  }, [pageInChapter, columnWidthPx])

  // ━━━ 네비게이션 ━━━
  const goToNextPage = useCallback(() => {
    if (pageInChapter < totalPagesInChapter - 1) {
      slideDirectionRef.current = 'left'; setPageInChapter(prev => prev + 1)
    } else if (currentChapterIdx < chapters.length - 1) {
      slideDirectionRef.current = 'left'; setCurrentChapterIdx(prev => prev + 1); setPageInChapter(0)
    }
  }, [pageInChapter, totalPagesInChapter, currentChapterIdx, chapters.length])

  const goToPrevPage = useCallback(() => {
    if (pageInChapter > 0) {
      slideDirectionRef.current = 'right'; setPageInChapter(prev => prev - 1)
    } else if (currentChapterIdx > 0) {
      slideDirectionRef.current = 'right'
      const prevIdx = currentChapterIdx - 1
      setCurrentChapterIdx(prevIdx)
      setPageInChapter(Math.max(0, (chapterPageCounts[prevIdx] || 1) - 1))
    }
  }, [pageInChapter, currentChapterIdx, chapterPageCounts])

  // ━━━ 키보드 네비게이션 ━━━
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (showSettings || showToc || showHighlightPanel) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          goToPrevPage()
          break
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
          goToNextPage()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNextPage, goToPrevPage, showSettings, showToc, showHighlightPanel])

  const goToChapter = useCallback((chIdx: number) => {
    const target = Math.max(0, Math.min(chIdx, chapters.length - 1))
    setCurrentChapterIdx(target); setPageInChapter(0)
  }, [chapters.length])

  const goToVirtualPage = useCallback((vPage: number) => {
    let accumulated = 0
    for (let i = 0; i < chapters.length; i++) {
      const count = chapterPageCounts[i] || 1
      if (accumulated + count >= vPage) { setCurrentChapterIdx(i); setPageInChapter(vPage - accumulated - 1); return }
      accumulated += count
    }
    if (chapters.length > 0) {
      setCurrentChapterIdx(chapters.length - 1)
      setPageInChapter(Math.max(0, (chapterPageCounts[chapters.length - 1] || 1) - 1))
    }
  }, [chapters.length, chapterPageCounts])

  // 터치 스와이프
  const handleTouchStart = (e: React.TouchEvent) => { touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; touchEndRef.current = null }
  const handleTouchMove = (e: React.TouchEvent) => { touchEndRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const handleTouchEnd = () => {
    const ts = touchStartRef.current; const te = touchEndRef.current
    if (!ts || !te) return
    const dx = ts.x - te.x; const dy = Math.abs(ts.y - te.y)
    if (Math.abs(dx) > 50 && dy < Math.abs(dx)) { dx > 0 ? goToNextPage() : goToPrevPage() }
    touchStartRef.current = null; touchEndRef.current = null
  }

  // 클릭 좌/우
  const handleMouseDown = (e: React.MouseEvent) => { mouseDownPosRef.current = { x: e.clientX, y: e.clientY, t: Date.now() } as any }
  const handleClick = (e: React.MouseEvent) => {
    if (showSettings || showToc || showHighlightPanel || showMemoModal) return
    const mdp = mouseDownPosRef.current as any
    const isQuickClick = mdp?.t && Date.now() - mdp.t < 300
    if (mdp) { if (Math.sqrt((e.clientX - mdp.x) ** 2 + (e.clientY - mdp.y) ** 2) > 5) { mouseDownPosRef.current = null; return } }
    mouseDownPosRef.current = null
    // 빠른 클릭 시 잔여 선택 정리
    if (isQuickClick) {
      window.getSelection()?.removeAllRanges()
      setShowHighlightMenu(false)
    }
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return
    // 집중 모드: 빈 영역 클릭 시 포커스 해제만, 페이지 이동 안 함
    if (focusMode) {
      const colEl = contentColumnRef.current
      if (colEl) {
        colEl.querySelectorAll('[data-epub-focused], [data-epub-adjacent]').forEach(el => {
          el.removeAttribute('data-epub-focused'); el.removeAttribute('data-epub-adjacent')
        })
      }
      return
    }
    const clickX = e.clientX
    const w = window.innerWidth
    if (clickX < w * 0.45) goToPrevPage()
    else if (clickX > w * 0.55) goToNextPage()
  }

  // 텍스트 선택 → 하이라이트
  const handleTextSelection = () => {
    if (focusMode || showSettings) return
    // 빠른 클릭(300ms 미만)은 페이지 넘김 → 하이라이트 무시
    const mdp = mouseDownPosRef.current as any
    if (mdp?.t && Date.now() - mdp.t < 300) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { setShowHighlightMenu(false); return }
    const text = sel.toString().trim(); if (text.length < 2) return
    const anchorNode = sel.anchorNode; if (!anchorNode) return
    const blockEl = (anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode as HTMLElement)?.closest('[data-block-id]')
    if (!blockEl) return
    const blockId = blockEl.getAttribute('data-block-id'); if (!blockId) return
    const range = sel.getRangeAt(0)
    const preRange = document.createRange(); preRange.setStart(blockEl, 0); preRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preRange.toString().length
    const rect = range.getBoundingClientRect()
    setHighlightMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 })
    setPendingSelection({ blockId, start: startOffset, end: startOffset + text.length, text })
    setShowHighlightMenu(true)
  }

  // 모바일 selectionchange
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const onSelChange = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (focusMode || showSettings) return
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString().trim()) return
        const text = sel.toString().trim(); if (text.length < 2) return
        const anchorNode = sel.anchorNode; if (!anchorNode) return
        const blockEl = (anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode as HTMLElement)?.closest('[data-block-id]')
        if (!blockEl) return
        const blockId = blockEl.getAttribute('data-block-id'); if (!blockId) return
        const range = sel.getRangeAt(0)
        const preRange = document.createRange(); preRange.setStart(blockEl, 0); preRange.setEnd(range.startContainer, range.startOffset)
        const startOffset = preRange.toString().length
        const rect = range.getBoundingClientRect()
        setHighlightMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 })
        setPendingSelection({ blockId, start: startOffset, end: startOffset + text.length, text })
        setShowHighlightMenu(true)
      }, 500)
    }
    document.addEventListener('selectionchange', onSelChange)
    return () => { document.removeEventListener('selectionchange', onSelChange); clearTimeout(timeout) }
  }, [focusMode, showSettings, currentChapterIdx])

  // ━━━ 하이라이트 CRUD ━━━
  useEffect(() => {
    if (!documentId) return
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('highlights').select('*').eq('document_id', documentId).eq('reader_id', user.id)
        if (data) setHighlights(data)
      } catch {}
    }
    load()
  }, [documentId])

  const saveHighlight = async (color: string) => {
    if (!pendingSelection || !documentId) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('highlights').insert({
        document_id: documentId, reader_id: user.id,
        block_id: pendingSelection.blockId, start_offset: pendingSelection.start, end_offset: pendingSelection.end,
        selected_text: pendingSelection.text, color, page_number: virtualPageNumber,
      }).select().single()
      if (!error && data) setHighlights(prev => [...prev, data])
    } catch {}
    setShowHighlightMenu(false); setPendingSelection(null); window.getSelection()?.removeAllRanges()
    if (selectionOverlayRef.current) selectionOverlayRef.current.innerHTML = ''
  }

  const deleteHighlight = async (id: string) => {
    try { await supabase.from('highlights').delete().eq('id', id); setHighlights(prev => prev.filter(h => h.id !== id)) } catch {}
    setEditingHighlight(null); setShowMemoModal(false)
  }

  const saveMemo = async () => {
    if (!editingHighlight) return
    try {
      await supabase.from('highlights').update({ memo: memoText || null, updated_at: new Date().toISOString() }).eq('id', editingHighlight.id)
      setHighlights(prev => prev.map(h => h.id === editingHighlight.id ? { ...h, memo: memoText || null } : h))
    } catch {}
    setShowMemoModal(false); setEditingHighlight(null)
  }

  // ━━━ 챕터 스타일 HTML ━━━
  const currentChapterData = chapters[currentChapterIdx]
  const chapterBlockId = `ch${String(currentChapterIdx).padStart(3, '0')}`
  const chapterStyledHtml = useMemo(() => {
    if (!currentChapterData) return ''

    let contentHtml = currentChapterData.html

    // ━━━ 하이라이트를 HTML 문자열에 직접 삽입 ━━━
    const chapterHighlights = highlights.filter(h => h.block_id === chapterBlockId)
    if (chapterHighlights.length > 0 && typeof window !== 'undefined') {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(`<div>${contentHtml}</div>`, 'text/html')
        const root = doc.body.firstElementChild as HTMLElement

        const getTextNodes = (el: Node): { node: Text; start: number }[] => {
          const nodes: { node: Text; start: number }[] = []
          let offset = 0
          const walk = (n: Node) => {
            if (n.nodeType === Node.TEXT_NODE) {
              nodes.push({ node: n as Text, start: offset })
              offset += (n as Text).textContent?.length || 0
            } else {
              for (let i = 0; i < n.childNodes.length; i++) walk(n.childNodes[i])
            }
          }
          walk(el)
          return nodes
        }

        const sorted = [...chapterHighlights].sort((a, b) => b.start_offset - a.start_offset)
        for (const hl of sorted) {
          const textNodes = getTextNodes(root)
          for (let i = textNodes.length - 1; i >= 0; i--) {
            const tn = textNodes[i]
            const tnLen = tn.node.textContent?.length || 0
            const tnEnd = tn.start + tnLen
            if (tnEnd <= hl.start_offset || tn.start >= hl.end_offset) continue
            const localStart = Math.max(0, hl.start_offset - tn.start)
            const localEnd = Math.min(tnLen, hl.end_offset - tn.start)
            if (localStart >= localEnd) continue
            try {
              const range = doc.createRange()
              range.setStart(tn.node, localStart)
              range.setEnd(tn.node, localEnd)
              const mark = doc.createElement('mark')
              mark.setAttribute('data-hl-id', hl.id)
              mark.setAttribute('data-hl-color', hl.color || 'yellow')
              mark.style.backgroundColor = HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow
              range.surroundContents(mark)
            } catch {}
          }
        }
        contentHtml = root.innerHTML
      } catch {}
    }

    return `<style>
.epub-page-content {
  display: block; margin: 0; padding: 0; border: 0;
  font-family: ${fontStyle.family}; font-size: ${fontSize}px; line-height: ${lineHeight};
  color: ${themeStyle.text}; word-break: keep-all; overflow-wrap: break-word;
  letter-spacing: ${letterSpacing * 0.5}px; text-align: ${textAlign};
  user-select: text; -webkit-user-select: text; cursor: text;
}
.epub-page-content * { max-width: 100%; box-sizing: border-box; user-select: text !important; -webkit-user-select: text !important; }
.epub-page-content h1,.epub-page-content h2,.epub-page-content h3,
.epub-page-content h4,.epub-page-content h5,.epub-page-content h6 {
  color: ${themeStyle.headingColor}; font-family: ${fontStyle.family};
  line-height: 1.35; margin-top: 1.5em; margin-bottom: 0.75em;
}
.epub-page-content h1 { font-size: ${Math.round(fontSize * 1.6)}px; font-weight: bold; }
.epub-page-content h2 { font-size: ${Math.round(fontSize * 1.35)}px; font-weight: bold; }
.epub-page-content h3 { font-size: ${Math.round(fontSize * 1.15)}px; font-weight: 600; }
.epub-page-content p { margin-bottom: 0.8em; text-indent: 1em; }
.epub-page-content a { color: ${themeStyle.linkColor}; text-decoration: none; }
.epub-page-content img,.epub-page-content svg { max-width: 100%; max-height: calc(100vh - 10rem); height: auto; display: block; margin: 1em auto; border-radius: 4px; break-inside: avoid; object-fit: contain; }
.epub-page-content figure { text-align: center; margin: 1.5em 0; break-inside: avoid; }
.epub-page-content h1,.epub-page-content h2,.epub-page-content h3,
.epub-page-content h4,.epub-page-content h5,.epub-page-content h6 { break-after: avoid; }
.epub-page-content img,.epub-page-content figure,.epub-page-content pre,.epub-page-content blockquote,.epub-page-content table { break-inside: avoid; }
.epub-page-content figcaption { font-size: ${Math.round(fontSize * 0.85)}px; color: ${themeStyle.muted}; margin-top: 0.5em; }
.epub-page-content blockquote { border-left: 3px solid ${themeStyle.border}; padding-left: 1em; margin: 1em 0; color: ${themeStyle.muted}; font-style: italic; }
.epub-page-content pre,.epub-page-content code { font-family: "Noto Sans Mono","D2Coding",monospace; font-size: ${Math.round(fontSize * 0.9)}px; background: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}; padding: 0.2em 0.4em; border-radius: 3px; }
.epub-page-content pre { padding: 1em; overflow-x: auto; }
.epub-page-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
.epub-page-content th,.epub-page-content td { border: 1px solid ${themeStyle.border}; padding: 0.5em; }
.epub-page-content hr { border: none; border-top: 1px solid ${themeStyle.border}; margin: 2em 0; }
.epub-page-content ul,.epub-page-content ol { padding-left: 1.5em; margin-bottom: 1em; }
.epub-page-content li { margin-bottom: 0.3em; }

/* ━━━ 집중 모드 ━━━ */
.epub-focus-active .epub-page-content p,
.epub-focus-active .epub-page-content h1,
.epub-focus-active .epub-page-content h2,
.epub-focus-active .epub-page-content h3,
.epub-focus-active .epub-page-content h4,
.epub-focus-active .epub-page-content h5,
.epub-focus-active .epub-page-content h6,
.epub-focus-active .epub-page-content blockquote,
.epub-focus-active .epub-page-content figure,
.epub-focus-active .epub-page-content pre,
.epub-focus-active .epub-page-content li {
  opacity: 0.12; transition: opacity 0.3s ease, transform 0.3s ease; cursor: pointer;
}
.epub-focus-active .epub-page-content [data-epub-focused="true"] {
  opacity: 1 !important; transform: scale(1.005);
}
.epub-focus-active .epub-page-content [data-epub-adjacent="true"] {
  opacity: 0.25 !important;
}
.epub-page-content mark[data-hl-id] {
  color: inherit !important; border-radius: 3px; padding: 1px 2px; cursor: pointer;
  box-decoration-break: clone; -webkit-box-decoration-break: clone;
}
.epub-page-content mark[data-hl-id] .epub-hl-memo { font-size: 0.8em; }
</style>
<div class="epub-page-content" data-block-id="${chapterBlockId}">${contentHtml}</div>`
  }, [currentChapterData, fontSize, lineHeight, fontStyle.family, themeStyle, letterSpacing, textAlign, theme, currentChapterIdx, highlights])

  // ━━━ innerHTML 수동 관리 (React 리렌더 시 DOM 교체 방지 → 선택 유지) ━━━
  // ━━━ innerHTML 수동 관리 (React 리렌더 시 DOM 교체 방지 → 선택 유지) ━━━
  useEffect(() => {
    const colEl = contentColumnRef.current
    if (!colEl) return
    colEl.innerHTML = chapterStyledHtml
    // 즉시 칼럼 재계산 (세로 레이아웃 깜빡임 방지)
    colEl.style.transform = `translateX(-${pageInChapter * columnWidthPx}px)`
    recalcPages()
  }, [chapterStyledHtml])

  // ━━━ 집중 모드: DOM 직접 이벤트 처리 ━━━
  useEffect(() => {
    const colEl = contentColumnRef.current
    if (!colEl || !focusMode) {
      if (colEl) {
        colEl.querySelectorAll('[data-epub-focused], [data-epub-adjacent]').forEach(el => {
          el.removeAttribute('data-epub-focused')
          el.removeAttribute('data-epub-adjacent')
        })
      }
      return
    }

    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, blockquote, figure, pre, li'

    const handleFocusClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest(blockSelector)
      if (!target) return
      e.stopPropagation()

      const contentEl = colEl.querySelector('.epub-page-content')
      if (!contentEl) return
      const blocks = Array.from(contentEl.querySelectorAll(blockSelector))

      const alreadyFocused = target.getAttribute('data-epub-focused') === 'true'
      blocks.forEach(b => { b.removeAttribute('data-epub-focused'); b.removeAttribute('data-epub-adjacent') })

      if (alreadyFocused) return

      target.setAttribute('data-epub-focused', 'true')
      const idx = blocks.indexOf(target)
      if (idx > 0) blocks[idx - 1].setAttribute('data-epub-adjacent', 'true')
      if (idx < blocks.length - 1) blocks[idx + 1].setAttribute('data-epub-adjacent', 'true')
    }

    colEl.addEventListener('click', handleFocusClick, true)
    return () => { colEl.removeEventListener('click', handleFocusClick, true) }
  }, [focusMode, currentChapterIdx, chapterStyledHtml])

  // ━━━ 하이라이트 mark 클릭 이벤트 위임 ━━━
  useEffect(() => {
    const colEl = contentColumnRef.current
    if (!colEl) return

    const handleMarkClick = (e: Event) => {
      const mark = (e.target as HTMLElement).closest('mark[data-hl-id]')
      if (!mark) return
      e.stopPropagation()
      const hlId = mark.getAttribute('data-hl-id')
      const hl = highlights.find(h => h.id === hlId)
      if (hl) {
        setEditingHighlight(hl)
        setMemoText(hl.memo || '')
        setShowMemoModal(true)
      }
    }

    colEl.addEventListener('click', handleMarkClick)
    return () => { colEl.removeEventListener('click', handleMarkClick) }
  }, [highlights])

  // ━━━ JS 선택 오버레이 (CSS columns에서 ::selection이 안 보이므로) ━━━
  useEffect(() => {
    const overlay = selectionOverlayRef.current
    const container = paginationContainerRef.current
    if (!overlay || !container) return

    const updateOverlay = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        overlay.innerHTML = ''
        return
      }

      try {
        const range = sel.getRangeAt(0)
        const rects = range.getClientRects()
        const containerRect = container.getBoundingClientRect()

        let html = ''
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i]
          // 컨테이너 영역 내의 rect만 표시
          if (r.width < 1 || r.height < 1) continue
          if (r.right < containerRect.left || r.left > containerRect.right) continue
          if (r.bottom < containerRect.top || r.top > containerRect.bottom) continue

          const left = Math.max(0, r.left - containerRect.left)
          const top = r.top - containerRect.top
          const width = Math.min(r.right, containerRect.right) - Math.max(r.left, containerRect.left)
          const height = r.height

          html += `<div style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;background:rgba(59,130,246,0.35);pointer-events:none;border-radius:2px;"></div>`
        }
        overlay.innerHTML = html
      } catch {
        overlay.innerHTML = ''
      }
    }

    // selectionchange + mouseup으로 오버레이 업데이트
    const onSelChange = () => requestAnimationFrame(updateOverlay)
    const onMouseUp = () => {
      // mouseup 후 약간 딜레이 후 오버레이 제거 (하이라이트 메뉴 표시 후)
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed) overlay.innerHTML = ''
      }, 100)
    }

    document.addEventListener('selectionchange', onSelChange)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('selectionchange', onSelChange)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // ━━━ 글로벌 스타일 주입 (::selection + EPUB 인라인 스타일 오버라이드) ━━━
  useEffect(() => {
    const styleId = 'epub-viewer-global-styles'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = `
      .epub-page-content::selection,
      .epub-page-content *::selection {
        background-color: rgba(59,130,246,0.4) !important;
      }
      .epub-page-content::-moz-selection,
      .epub-page-content *::-moz-selection {
        background-color: rgba(59,130,246,0.4) !important;
      }
      .epub-page-content mark[data-hl-color="yellow"] { background-color: rgba(250, 220, 50, 0.3) !important; }
      .epub-page-content mark[data-hl-color="green"] { background-color: rgba(100, 220, 100, 0.25) !important; }
      .epub-page-content mark[data-hl-color="blue"] { background-color: rgba(90, 180, 250, 0.25) !important; }
      .epub-page-content mark[data-hl-color="pink"] { background-color: rgba(245, 130, 180, 0.3) !important; }
      .epub-page-content [style*="color"]:not(mark) { color: ${themeStyle.text} !important; }
      .epub-page-content [style*="font-size"] { font-size: inherit !important; }
      .epub-page-content [style*="font-family"] { font-family: inherit !important; }
    `
    return () => { styleEl?.remove() }
  }, [themeStyle.text])

  // ━━━ 렌더링 ━━━
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: themeStyle.pageBg }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: themeStyle.muted }} className="text-sm">EPUB 불러오는 중... {loadProgress > 0 ? `${loadProgress}%` : ''}</p>
          {loadProgress > 0 && (
            <div className="w-48 h-1.5 rounded-full mt-2 mx-auto overflow-hidden" style={{ backgroundColor: themeStyle.border }}>
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${loadProgress}%` }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: themeStyle.pageBg }}>
        <div className="text-center max-w-sm px-6">
          <div className="text-4xl mb-4">📚</div>
          <p className="font-semibold mb-2" style={{ color: themeStyle.headingColor }}>EPUB을 열 수 없습니다</p>
          <p className="text-sm" style={{ color: themeStyle.muted }}>{error}</p>
        </div>
      </div>
    )
  }

  const isFirstPage = currentChapterIdx === 0 && pageInChapter === 0
  const isLastPage = currentChapterIdx === chapters.length - 1 && pageInChapter >= totalPagesInChapter - 1

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: themeStyle.pageBg }}>
      {/* ━━━ TOC 패널 ━━━ */}
      {showToc && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowToc(false)} />
          <div className="relative w-72 max-w-[80vw] h-full flex flex-col shadow-2xl" style={{ backgroundColor: themeStyle.bg }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: themeStyle.border }}>
              <h3 className="font-semibold text-sm" style={{ color: themeStyle.headingColor }}>목차</h3>
              <button onClick={() => setShowToc(false)} className="p-1 rounded hover:opacity-70" style={{ color: themeStyle.muted }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tocItems.map((item, i) => (
                <button key={i}
                  onClick={() => { if (item.chapterIndex >= 0) { goToChapter(item.chapterIndex); setShowToc(false) } }}
                  disabled={item.chapterIndex < 0}
                  className={`w-full text-left py-3 border-b text-sm transition-colors ${item.chapterIndex === currentChapterIdx ? 'font-semibold' : 'hover:opacity-80'} ${item.chapterIndex < 0 ? 'opacity-40' : ''}`}
                  style={{
                    paddingLeft: `${1 + item.level * 1.2}rem`, paddingRight: '1rem', borderColor: themeStyle.border,
                    color: item.chapterIndex === currentChapterIdx ? '#3b82f6' : themeStyle.text,
                    backgroundColor: item.chapterIndex === currentChapterIdx ? (theme === 'dark' ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : 'transparent',
                  }}>
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ 하이라이트 패널 ━━━ */}
      {showHighlightPanel && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHighlightPanel(false)} />
          <div className="relative w-80 max-w-[85vw] h-full flex flex-col shadow-2xl" style={{ backgroundColor: themeStyle.bg }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: themeStyle.border }}>
              <h3 className="font-semibold text-sm" style={{ color: themeStyle.headingColor }}>형광펜 ({highlights.length})</h3>
              <button onClick={() => setShowHighlightPanel(false)} className="p-1 rounded hover:opacity-70" style={{ color: themeStyle.muted }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {highlights.length > 0 ? [...highlights].sort((a, b) => a.page_number - b.page_number).map(hl => (
                <div key={hl.id} className="px-4 py-3 border-b cursor-pointer hover:opacity-80" style={{ borderColor: themeStyle.border }}
                  onClick={() => { goToVirtualPage(hl.page_number); setShowHighlightPanel(false) }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: HIGHLIGHT_COLORS[hl.color], color: themeStyle.text }}>p.{hl.page_number}</span>
                    <button onClick={e => { e.stopPropagation(); deleteHighlight(hl.id) }} className="p-1 rounded hover:bg-red-500/10" style={{ color: '#ef4444' }}><Trash2 className="w-3 h-3" /></button>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: themeStyle.text }}>{hl.selected_text.length > 80 ? hl.selected_text.slice(0, 80) + '...' : hl.selected_text}</p>
                  {hl.memo && <p className="text-[10px] mt-1.5" style={{ color: themeStyle.muted }}>💬 {hl.memo.slice(0, 50)}</p>}
                </div>
              )) : (
                <div className="px-4 py-12 text-center">
                  <Highlighter className="w-8 h-8 mx-auto mb-3" style={{ color: themeStyle.border }} />
                  <p className="text-sm mb-1" style={{ color: themeStyle.muted }}>형광펜이 없습니다</p>
                  <p className="text-xs" style={{ color: themeStyle.muted }}>텍스트를 길게 선택하면<br />형광펜을 추가할 수 있어요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ 상단 바 ━━━ */}
      <div className="grid grid-cols-5 px-2 py-2 border-b max-w-lg mx-auto w-full" style={{ borderColor: themeStyle.border }}>
        <button onClick={() => setShowToc(!showToc)} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:opacity-70" style={{ color: showToc ? '#3b82f6' : themeStyle.muted }}>
          <List className="w-4 h-4" /><span className="text-xs">목차</span>
        </button>
        <button onClick={() => setFocusMode(!focusMode)} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg" style={{ color: focusMode ? '#3b82f6' : themeStyle.muted, backgroundColor: focusMode ? 'rgba(59,130,246,0.1)' : 'transparent' }}>
          <Focus className="w-4 h-4" /><span className="text-xs">집중</span>
        </button>
        <button onClick={() => setShowHighlightPanel(!showHighlightPanel)} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg"
          style={{ color: showHighlightPanel ? '#f59e0b' : highlights.length > 0 ? '#f59e0b' : themeStyle.muted, backgroundColor: showHighlightPanel ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
          <Highlighter className="w-4 h-4" /><span className="text-xs">형광펜</span>
        </button>
        <div className="flex items-center justify-center">
          <span className="text-xs font-medium" style={{ color: themeStyle.muted }}>{virtualPageNumber}/{virtualTotalPages}</span>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:opacity-70" style={{ color: showSettings ? '#3b82f6' : themeStyle.muted }}>
          <Settings2 className="w-4 h-4" /><span className="text-xs">설정</span>
        </button>
      </div>

      {/* ━━━ 설정 바텀시트 ━━━ */}
      {showSettings && (<>
        <div className="fixed inset-0 z-[55]" onClick={() => setShowSettings(false)} />
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[56] rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto w-full max-w-lg"
          style={{ backgroundColor: theme === 'dark' ? 'rgba(36,30,24,0.85)' : theme === 'sepia' ? 'rgba(248,241,227,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: `1px solid ${themeStyle.border}` }}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ backgroundColor: themeStyle.border }} /></div>
          <div className="px-5 pb-6 space-y-5">
            {/* 테마 */}
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: themeStyle.muted }}>배경 테마</p>
              <div className="flex gap-3 justify-center">
                {(Object.keys(THEMES) as ReflowTheme[]).map(t => (
                  <button key={t} onClick={() => setTheme(t)} className="flex flex-col items-center gap-1.5">
                    <div className={`w-12 h-12 rounded-xl border-2 ${theme === t ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`} style={{ backgroundColor: THEMES[t].bg, borderColor: THEMES[t].border }} />
                    <span className="text-[10px]" style={{ color: theme === t ? '#3b82f6' : themeStyle.muted }}>{t === 'light' ? '밝은' : t === 'sepia' ? '세피아' : '어두운'}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* 글꼴 */}
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: themeStyle.muted }}>글꼴</p>
              <div className="flex gap-2">
                {(Object.keys(FONTS) as ReflowFont[]).map(f => (
                  <button key={f} onClick={() => setFont(f)} className={`flex-1 py-2 rounded-xl text-sm border ${font === f ? 'border-blue-500' : ''}`}
                    style={{ backgroundColor: font === f ? 'rgba(59,130,246,0.1)' : 'transparent', borderColor: font === f ? '#3b82f6' : themeStyle.border, color: font === f ? '#3b82f6' : themeStyle.text, fontFamily: FONTS[f].family }}>
                    {FONTS[f].label}
                  </button>
                ))}
              </div>
            </div>
            {/* 글자 크기 */}
            <div>
              <div className="flex items-center justify-between mb-3"><p className="text-xs font-medium" style={{ color: themeStyle.muted }}>글자 크기</p><span className="text-xs font-mono" style={{ color: themeStyle.text }}>{fontSize}px</span></div>
              <div className="flex items-center gap-3">
                <button onClick={() => setFontSize(s => Math.max(12, s - 1))} className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ borderColor: themeStyle.border, color: themeStyle.muted }}><Minus className="w-4 h-4" /></button>
                <input type="range" min={12} max={32} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500" style={{ backgroundColor: themeStyle.border }} />
                <button onClick={() => setFontSize(s => Math.min(32, s + 1))} className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ borderColor: themeStyle.border, color: themeStyle.muted }}><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            {/* 줄간격 */}
            <div>
              <div className="flex items-center justify-between mb-2"><p className="text-xs font-medium" style={{ color: themeStyle.muted }}>줄간격</p><span className="text-xs font-mono" style={{ color: themeStyle.text }}>{lineHeight.toFixed(1)}</span></div>
              <div className="flex items-center gap-3">
                <button onClick={() => setLineHeight(h => Math.max(1.2, Math.round((h - 0.1) * 10) / 10))} className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ borderColor: themeStyle.border, color: themeStyle.muted }}><Minus className="w-4 h-4" /></button>
                <input type="range" min={1.2} max={2.4} step={0.1} value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500" style={{ backgroundColor: themeStyle.border }} />
                <button onClick={() => setLineHeight(h => Math.min(2.4, Math.round((h + 0.1) * 10) / 10))} className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ borderColor: themeStyle.border, color: themeStyle.muted }}><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            {/* 여백 · 자간 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-medium" style={{ color: themeStyle.muted }}>여백</p><span className="text-[10px]" style={{ color: themeStyle.text }}>{MARGIN_MAP[marginSize]?.label}</span></div>
                <input type="range" min={1} max={4} step={1} value={marginSize} onChange={e => setMarginSize(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500" style={{ backgroundColor: themeStyle.border }} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-medium" style={{ color: themeStyle.muted }}>자간</p><span className="text-[10px]" style={{ color: themeStyle.text }}>{letterSpacing === -1 ? '좁게' : letterSpacing === 0 ? '보통' : letterSpacing === 1 ? '넓게' : '아주 넓게'}</span></div>
                <input type="range" min={-1} max={2} step={1} value={letterSpacing} onChange={e => setLetterSpacing(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500" style={{ backgroundColor: themeStyle.border }} />
              </div>
            </div>
            {/* 정렬 */}
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: themeStyle.muted }}>정렬</p>
              <div className="flex gap-2">
                {(['left','justify'] as ReflowAlign[]).map(a => (
                  <button key={a} onClick={() => setTextAlign(a)} className={`flex-1 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border ${textAlign === a ? 'border-blue-500' : ''}`}
                    style={{ backgroundColor: textAlign === a ? 'rgba(59,130,246,0.1)' : 'transparent', borderColor: textAlign === a ? '#3b82f6' : themeStyle.border, color: textAlign === a ? '#3b82f6' : themeStyle.text }}>
                    {a === 'left' ? <><AlignLeft className="w-4 h-4" /> 왼쪽</> : <><AlignJustify className="w-4 h-4" /> 양쪽</>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ━━━ 페이지네이션 본문 (CSS column) ━━━ */}
      <div
        className={`flex-1 min-h-0 relative ${focusMode ? 'epub-focus-active' : ''}`}
        style={{ backgroundColor: themeStyle.bg, userSelect: 'text', WebkitUserSelect: 'text' as any, overflow: 'clip' }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown} onClick={handleClick} onMouseUp={handleTextSelection}
      >
        <div style={{ maxWidth: currentMargin.maxW, margin: '0 auto', padding: `2rem ${currentMargin.px}px`, height: '100%' }}>
          <div
            ref={paginationContainerRef}
            className="relative"
            style={{ height: '100%', overflow: 'clip' }}
          >
        {currentChapterData ? (
          <div
            ref={contentColumnRef}
            style={{ columnWidth: columnWidthPx > 0 ? `${columnWidthPx - 40}px` : '100vw', columnGap: '40px', columnFill: 'auto', height: '100%' }}
          />
        ) : (
          <p className="text-center py-8" style={{ color: themeStyle.muted }}>(표시할 내용 없음)</p>
        )}
            {/* 선택 오버레이 */}
            <div ref={selectionOverlayRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }} />
          </div>
        </div>
      </div>

      {/* ━━━ 하이라이트 색상 팝업 ━━━ */}
      {showHighlightMenu && pendingSelection && (
        <div className="fixed z-[70] flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-lg border"
          style={{ left: Math.min(highlightMenuPos.x - 60, (typeof window !== 'undefined' ? window.innerWidth : 400) - 140), top: Math.min(highlightMenuPos.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 50), backgroundColor: themeStyle.bg, borderColor: themeStyle.border }}>
          {Object.entries(HIGHLIGHT_COLORS).map(([color, bg]) => (
            <button key={color} onClick={() => saveHighlight(color)} className="w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform"
              style={{ backgroundColor: bg, borderColor: color === 'yellow' ? '#fbbf24' : color === 'green' ? '#86efac' : color === 'blue' ? '#93c5fd' : '#f9a8d4' }} />
          ))}
          <button onClick={() => { setShowHighlightMenu(false); setPendingSelection(null); window.getSelection()?.removeAllRanges(); if (selectionOverlayRef.current) selectionOverlayRef.current.innerHTML = '' }}
            className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: themeStyle.muted }}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ━━━ 메모 모달 ━━━ */}
      {showMemoModal && editingHighlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setShowMemoModal(false); setEditingHighlight(null) }}>
          <div className="w-full max-w-sm rounded-2xl p-5 shadow-xl" style={{ backgroundColor: themeStyle.bg }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: themeStyle.text }}>메모</span>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteHighlight(editingHighlight.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: '#ef4444' }}><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => { setShowMemoModal(false); setEditingHighlight(null) }} className="p-1.5 rounded-lg" style={{ color: themeStyle.muted }}><X className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-xs mb-3 px-2 py-1.5 rounded-lg" style={{ backgroundColor: HIGHLIGHT_COLORS[editingHighlight.color], color: themeStyle.text }}>
              "{editingHighlight.selected_text.slice(0, 100)}{editingHighlight.selected_text.length > 100 ? '...' : ''}"
            </p>
            <textarea value={memoText} onChange={e => setMemoText(e.target.value)} placeholder="메모를 입력하세요..."
              className="w-full rounded-xl border px-3 py-2 text-sm resize-none" rows={3}
              style={{ backgroundColor: themeStyle.bg, color: themeStyle.text, borderColor: themeStyle.border }} autoFocus />
            <button onClick={saveMemo} className="w-full mt-3 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#3b82f6' }}>저장</button>
          </div>
        </div>
      )}

      {/* ━━━ 하단 바 ━━━ */}
      {chapters.length > 0 && (
        <div className="border-t px-4 py-2 max-w-lg mx-auto w-full" style={{ borderColor: themeStyle.border }}>
          <div className="flex items-center gap-3">
            <button onClick={e => { e.stopPropagation(); goToPrevPage() }} disabled={isFirstPage} className="p-1 rounded disabled:opacity-30" style={{ color: themeStyle.muted }}><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 relative" onClick={e => {
              e.stopPropagation()
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              goToVirtualPage(Math.max(1, Math.round(ratio * virtualTotalPages)))
            }}>
              <div className="h-1.5 rounded-full cursor-pointer" style={{ backgroundColor: themeStyle.border }}>
                <div className="h-full rounded-full transition-all duration-200" style={{ width: `${virtualTotalPages > 1 ? ((virtualPageNumber - 1) / (virtualTotalPages - 1)) * 100 : 0}%`, backgroundColor: '#3b82f6' }} />
              </div>
              <input type="range" min={1} max={virtualTotalPages} value={virtualPageNumber}
                onChange={e => { e.stopPropagation(); goToVirtualPage(Number(e.target.value)) }} onClick={e => e.stopPropagation()}
                className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height: '24px', top: '-6px' }} />
            </div>
            <button onClick={e => { e.stopPropagation(); goToNextPage() }} disabled={isLastPage} className="p-1 rounded disabled:opacity-30" style={{ color: themeStyle.muted }}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: themeStyle.muted }}>{virtualPageNumber} / {virtualTotalPages} 페이지</span>
            <span className="text-[10px]" style={{ color: themeStyle.muted }}>
              {(() => {
                const pct = virtualTotalPages > 1 ? Math.round(((virtualPageNumber - 1) / (virtualTotalPages - 1)) * 100) : 0
                if (virtualTotalPages <= 1 || virtualPageNumber <= 1 || elapsedSec < 10) return `${pct}%`
                const pagesRead = virtualPageNumber - 1
                const secPerPage = elapsedSec / pagesRead
                const pagesLeft = virtualTotalPages - virtualPageNumber
                const secLeft = Math.round(secPerPage * pagesLeft)
                if (secLeft < 60) return `${pct}% · 1분 미만`
                const minLeft = Math.round(secLeft / 60)
                if (minLeft < 60) return `${pct}% · 약 ${minLeft}분 남음`
                const hours = Math.floor(minLeft / 60); const mins = minLeft % 60
                return mins === 0 ? `${pct}% · 약 ${hours}시간 남음` : `${pct}% · 약 ${hours}시간 ${mins}분 남음`
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
