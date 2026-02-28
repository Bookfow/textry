'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  Home,
  MessageSquare,
  X,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  BookOpen,
  ScrollText,
  Sun,
  Bookmark,
  Trash2,
  AlignLeft,
  LogIn,
  Search,
  ChevronUp,
  ChevronDown,
  Play,
  List,
  Focus,
  Highlighter,
  Settings2,
} from 'lucide-react'
import { AdBanner } from '@/components/ad-banner'
import { AdOverlay } from '@/components/ad-overlay'
import { ReactionButtons } from '@/components/reaction-buttons'
import { SubscribeButton } from '@/components/subscribe-button'
import { ShareButton } from '@/components/share-button'
import { ReadingListButton } from '@/components/reading-list-button'
import { CommentsSection } from '@/components/comments-section'

import type { ViewMode } from '@/components/pdf-viewer'

type SeriesInfo = {
  seriesId: string
  seriesTitle: string
  currentPosition: number
  totalDocs: number
  docs: { documentId: string; position: number; title: string }[]
  prevDocId: string | null
  nextDocId: string | null
}

const PDFViewer = dynamic(() => import('@/components/pdf-viewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#C4A882]">PDF 뷰어 로딩 중...</p>
      </div>
    </div>
  ),
})

const WebtoonViewer = dynamic(() => import('@/components/webtoon-viewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#C4A882]">웹툰 뷰어 로딩 중...</p>
      </div>
    </div>
  ),
})

const ReflowViewer = dynamic(() => import('@/components/reflow-viewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#C4A882]">리플로우 뷰어 로딩 중...</p>
      </div>
    </div>
  ),
})
const EpubViewer = dynamic(() => import('@/components/epub-viewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#C4A882]">EPUB 뷰어 로딩 중...</p>
      </div>
    </div>
  ),
})

// ─── 광고 Tier 설정 ───
type AdTier = 'micro' | 'short' | 'medium' | 'long' | 'extra'

interface TierConfig {
  showStartAd: boolean
  showEndAd: boolean
  pageInterval: number
  minTimeBetweenAds: number
  maxAdsPerSession: number
}

function getAdTier(numPages: number): AdTier {
  if (numPages <= 5) return 'micro'
  if (numPages <= 20) return 'short'
  if (numPages <= 100) return 'medium'
  if (numPages <= 300) return 'long'
  return 'extra'
}

function getTierConfig(tier: AdTier): TierConfig {
  switch (tier) {
    case 'micro':
      return { showStartAd: false, showEndAd: true, pageInterval: 0, minTimeBetweenAds: 0, maxAdsPerSession: 1 }
    case 'short':
      return { showStartAd: true, showEndAd: true, pageInterval: 0, minTimeBetweenAds: 0, maxAdsPerSession: 2 }
    case 'medium':
      return { showStartAd: true, showEndAd: true, pageInterval: 25, minTimeBetweenAds: 300, maxAdsPerSession: 10 }
    case 'long':
      return { showStartAd: true, showEndAd: true, pageInterval: 30, minTimeBetweenAds: 300, maxAdsPerSession: 10 }
    case 'extra':
      return { showStartAd: true, showEndAd: true, pageInterval: 40, minTimeBetweenAds: 420, maxAdsPerSession: 10 }
  }
}

// ─── 배경 테마 ───
type BgTheme = 'default' | 'sepia' | 'dark'

const BG_THEMES: Record<BgTheme, { label: string; previewColor: string; bgColor: string }> = {
  default: { label: '기본', previewColor: '#1A1410', bgColor: '#1A1410' },
  sepia: { label: '세피아', previewColor: '#f4ecd8', bgColor: '#f4ecd8' },
  dark: { label: '다크', previewColor: '#121212', bgColor: '#121212' },
}

// ─── 검색 결과 타입 ───
type SearchResult = {
  pageNumber: number
  snippet: string
  matchIndex: number
}

export default function ReadPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // ★ 파일 타입 감지
  const [fileType, setFileType] = useState<'pdf' | 'epub'>('pdf')
  const [epubLoadFailed, setEpubLoadFailed] = useState(false)

  // ★ 로그인 유도 팝업
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginPromptMessage, setLoginPromptMessage] = useState('')

  // 프리미엄 여부
  const isPremium = profile?.is_premium && profile?.premium_expires_at
    ? new Date(profile.premium_expires_at) > new Date()
    : false

  // PDF 상태
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [numPages, setNumPages] = useState<number>(0)
  const [scale, setScale] = useState<number>(1.0)
  const [viewMode, setViewMode] = useState<ViewMode>('page')
  const [pageInputValue, setPageInputValue] = useState('')
  const [showPageInput, setShowPageInput] = useState(false)

  // UI 상태
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // ━━━ 배경 테마 & 밝기 ━━━
  const [bgTheme, setBgTheme] = useState<BgTheme>('default')
  const [brightness, setBrightness] = useState<number>(100)
  const [contrast, setContrast] = useState<number>(100)
  const [showThemePopup, setShowThemePopup] = useState(false)
  const themePopupRef = useRef<HTMLDivElement>(null)

  // ━━━ 북마크 ━━━
  type BookmarkItem = { id: string; page_number: number; memo: string; created_at: string }
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [bookmarkLoading, setBookmarkLoading] = useState(false)

  // ━━━ 본문 검색 ━━━
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchIndex, setSearchIndex] = useState(0)
  const [searchLoading, setSearchLoading] = useState(false)
  const [pageTextsCache, setPageTextsCache] = useState<Map<number, string> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // 시리즈 상태
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null)

  // ━━━ 뷰어 컨트롤 상태 (EPUB/Reflow 헤더 통합) ━━━
  type ViewerControlState = {
    focusMode: boolean
    showToc: boolean
    showHighlightPanel: boolean
    showSettings: boolean
    page: number
    totalPages: number
    highlightCount: number
  }
  const [viewerCtrl, setViewerCtrl] = useState<ViewerControlState>({
    focusMode: false, showToc: false, showHighlightPanel: false,
    showSettings: false, page: 0, totalPages: 0, highlightCount: 0,
  })
  const isViewerMode = fileType === 'epub' || viewMode === 'reflow'

  // ━━━ 뷰어 상태 수신 ━━━
  useEffect(() => {
    if (!isViewerMode) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) setViewerCtrl(detail)
    }
    window.addEventListener('viewer-state-update', handler)
    return () => window.removeEventListener('viewer-state-update', handler)
  }, [isViewerMode])

  const dispatchViewerToggle = (action: string) => {
    window.dispatchEvent(new CustomEvent('viewer-toggle', { detail: { action } }))
  }

  // 읽기 시간 추적
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startTime] = useState<number>(Date.now())
  const [totalTime, setTotalTime] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const pageInputRef = useRef<HTMLInputElement>(null)

  // ★ 페이지별 체류시간 추적
  const pageEnteredAtRef = useRef<number>(Date.now())
  const pageLogsBufferRef = useRef<Array<{
    document_id: string; reader_id: string; page_number: number;
    duration_seconds: number; entered_at: string; left_at: string;
  }>>([])
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ★ 마지막 읽은 페이지 복원
  useEffect(() => {
    if (!user || !documentId || loading) {
      if (!user && !loading) setRestoreChecked(true)
      return
    }
    const restorePosition = async () => {
      try {
        // 문서의 page_count 가져오기
        const { data: docInfo } = await supabase
          .from('documents')
          .select('page_count')
          .eq('id', documentId)
          .single()

        const { data } = await supabase
          .from('reading_sessions')
          .select('current_page')
          .eq('document_id', documentId)
          .eq('reader_id', user.id)
          .order('last_read_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data?.current_page && data.current_page > 0) {
          // 완독 상태(마지막 페이지)면 처음부터 다시
          if (docInfo?.page_count && data.current_page >= docInfo.page_count) {
            setPageNumber(1)
            setRestoredFromComplete(true)
          } else {
            setPageNumber(data.current_page)
          }
        }
      } catch {}
      setRestoreChecked(true)
    }
    restorePosition()
  }, [user, documentId, loading])

  // ─── 광고 상태 ───
  const [showAdOverlay, setShowAdOverlay] = useState(false)
  const [adType, setAdType] = useState<'start' | 'middle' | 'end'>('middle')
  const [adCount, setAdCount] = useState(0)
  const [lastAdTime, setLastAdTime] = useState<number>(0)
  const [lastAdPage, setLastAdPage] = useState<number>(0)
  const [startAdShown, setStartAdShown] = useState(false)
  const [endAdShown, setEndAdShown] = useState(false)
  const [restoredFromComplete, setRestoredFromComplete] = useState(false)
  const [restoreChecked, setRestoreChecked] = useState(false)
  const [documentReady, setDocumentReady] = useState(false)
  const [isRewardAdFree, setIsRewardAdFree] = useState(false)
  const [rewardExpiresAt, setRewardExpiresAt] = useState<number>(0)
  const [showRewardAd, setShowRewardAd] = useState(false)
  const prevPageRef = useRef<number>(1)

  // ━━━ 보상형 무광고 체크 ━━━
  useEffect(() => {
    try {
      const expires = Number(localStorage.getItem('textry_reward_expires') || '0')
      if (expires > Date.now()) {
        setIsRewardAdFree(true)
        setRewardExpiresAt(expires)
      }
    } catch {}
  }, [])

  // 보상형 무광고 타이머 (만료 시 자동 해제)
  useEffect(() => {
    if (!isRewardAdFree || !rewardExpiresAt) return
    const remaining = rewardExpiresAt - Date.now()
    if (remaining <= 0) { setIsRewardAdFree(false); return }
    const timer = setTimeout(() => setIsRewardAdFree(false), remaining)
    return () => clearTimeout(timer)
  }, [isRewardAdFree, rewardExpiresAt])

  // 보상형 광고 완료 핸들러
  const handleRewardComplete = () => {
    const expires = Date.now() + 60 * 60 * 1000 // 1시간
    try { localStorage.setItem('textry_reward_expires', String(expires)) } catch {}
    setIsRewardAdFree(true)
    setRewardExpiresAt(expires)
    setShowRewardAd(false)
  }

  // 보상형 남은 시간 포맷
  const getRewardRemainingMin = () => {
    if (!isRewardAdFree || !rewardExpiresAt) return 0
    return Math.max(0, Math.ceil((rewardExpiresAt - Date.now()) / 60000))
  }

  const tier = numPages > 0 ? getAdTier(numPages) : 'micro'
  const tierConfig = getTierConfig(tier)

  // ★ EPUB 여부
  const isEpub = fileType === 'epub'

  // ★ 로그인 필요 기능 가드
  const requireLogin = (actionName: string): boolean => {
    if (user) return true
    setLoginPromptMessage(actionName)
    setShowLoginPrompt(true)
    return false
  }

  // ━━━ 본문 검색: 텍스트 캐시 로드 ━━━
  const loadPageTexts = useCallback(async () => {
    if (pageTextsCache) return pageTextsCache
    try {
      // ★ document_blocks 우선 조회, 없으면 document_pages_text 폴백
      let map = new Map<number, string>()
      
      const { data: blocks, error: blocksErr } = await supabase
        .from('document_blocks')
        .select('page_number, content, block_order')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true })
        .order('block_order', { ascending: true })
      
      if (!blocksErr && blocks && blocks.length > 0) {
        const pageMap = new Map<number, string[]>()
        for (const b of blocks) {
          if (!pageMap.has(b.page_number)) pageMap.set(b.page_number, [])
          pageMap.get(b.page_number)!.push(b.content)
        }
        for (const [pn, parts] of pageMap) {
          const raw = parts.join(' ')
          map.set(pn, raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
        }
      } else {
        const { data, error } = await supabase
          .from('document_pages_text')
          .select('page_number, text_content')
          .eq('document_id', documentId)
          .order('page_number', { ascending: true })
        if (error || !data) return null
        for (const row of data) {
          // HTML 태그 제거해서 순수 텍스트만
        const clean = (row.text_content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        map.set(row.page_number, clean)
      }
      } // 폴백 else 닫기
      setPageTextsCache(map)
      return map
    } catch {
      return null
    }
  }, [documentId, pageTextsCache])

  // ━━━ 본문 검색: 실행 ━━━
  const executeSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      setSearchIndex(0)
      return
    }
    setSearchLoading(true)
    try {
      const texts = await loadPageTexts()
      if (!texts) { setSearchResults([]); return }

      const results: SearchResult[] = []
      const lowerQuery = query.toLowerCase()

      for (const [pageNum, text] of texts) {
        const lowerText = text.toLowerCase()
        let startIdx = 0
        while (true) {
          const idx = lowerText.indexOf(lowerQuery, startIdx)
          if (idx === -1) break
          // 앞뒤 30자 스니펫 생성
          const snippetStart = Math.max(0, idx - 30)
          const snippetEnd = Math.min(text.length, idx + query.length + 30)
          const snippet = (snippetStart > 0 ? '...' : '') +
            text.slice(snippetStart, idx) +
            '【' + text.slice(idx, idx + query.length) + '】' +
            text.slice(idx + query.length, snippetEnd) +
            (snippetEnd < text.length ? '...' : '')
          results.push({ pageNumber: pageNum, snippet, matchIndex: results.length })
          startIdx = idx + 1
          // 한 페이지에서 최대 3개까지
          const pageResults = results.filter(r => r.pageNumber === pageNum)
          if (pageResults.length >= 3) break
        }
      }
      setSearchResults(results)
      setSearchIndex(0)
      // 첫 결과로 이동
      if (results.length > 0) {
        setPageNumber(results[0].pageNumber)
      }

      // ★ 검색 키워드 로깅
      try {
        await supabase.from('search_logs').insert({
          document_id: documentId,
          reader_id: user?.id || null,
          query: query.trim(),
          results_count: results.length,
        })
      } catch {}

    } finally {
      setSearchLoading(false)
    }
  }, [loadPageTexts, documentId, user])

  // ━━━ 본문 검색: 디바운스 ━━━
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!showSearch) return
    searchDebounceRef.current = setTimeout(() => {
      executeSearch(searchQuery)
    }, 300)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [searchQuery, showSearch, executeSearch])

  // ━━━ 검색: 이전/다음 결과로 이동 ━━━
  const goToSearchResult = (index: number) => {
    if (searchResults.length === 0) return
    const newIndex = ((index % searchResults.length) + searchResults.length) % searchResults.length
    setSearchIndex(newIndex)
    setPageNumber(searchResults[newIndex].pageNumber)
  }

  // ━━━ 검색 열기/닫기 ━━━
  const toggleSearch = () => {
    setShowSearch(prev => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
      } else {
        setSearchQuery('')
        setSearchResults([])
        setSearchIndex(0)
      }
      return !prev
    })
  }

  // ━━━ 배경 테마/밝기: localStorage 복원 & 저장 ━━━
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('textry_bg_theme') as BgTheme | null
      const savedBrightness = localStorage.getItem('textry_brightness')
      if (savedTheme && BG_THEMES[savedTheme]) setBgTheme(savedTheme)
        if (savedBrightness) setBrightness(Number(savedBrightness))
          const savedContrast = localStorage.getItem('textry_contrast')
          if (savedContrast) setContrast(Number(savedContrast))
        } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('textry_bg_theme', bgTheme) } catch {}
  }, [bgTheme])

  useEffect(() => {
    try { localStorage.setItem('textry_brightness', String(brightness)) } catch {}
  }, [brightness])

  useEffect(() => {
    try { localStorage.setItem('textry_contrast', String(contrast)) } catch {}
  }, [contrast])

  useEffect(() => {
    if (!showThemePopup) return
    const handleClickOutside = (e: MouseEvent) => {
      if (themePopupRef.current && !themePopupRef.current.contains(e.target as Node)) {
        setShowThemePopup(false)
      }
    }
    window.document.addEventListener('mousedown', handleClickOutside)
    return () => window.document.removeEventListener('mousedown', handleClickOutside)
  }, [showThemePopup])

  // ━━━ 모바일 감지 ━━━
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && viewMode === 'book') {
        setViewMode('page')
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [viewMode])

  // ━━━ 모바일: 첫 터치 시 전체화면 요청 ━━━
  const requestedFullscreenRef = useRef(false)
  useEffect(() => {
    if (!isMobile) return
    const requestFullscreenOnce = () => {
      if (requestedFullscreenRef.current) return
      requestedFullscreenRef.current = true
      try {
        const el = window.document.documentElement as any
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
        if (rfs && !window.document.fullscreenElement) {
          rfs.call(el).catch(() => {})
        }
      } catch {}
      window.removeEventListener('touchstart', requestFullscreenOnce)
    }
    window.addEventListener('touchstart', requestFullscreenOnce, { once: true })
    return () => window.removeEventListener('touchstart', requestFullscreenOnce)
  }, [isMobile])

  // ━━━ 컨트롤바 auto-hide ━━━
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (!showSidePanel && !showPageInput && !showThemePopup && !showSearch) {
        setShowControls(false)
      }
    }, 3000)
  }, [showSidePanel, showPageInput, showThemePopup, showSearch])

  useEffect(() => {
    const handleActivity = () => resetControlsTimer()
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('keydown', handleActivity)
    resetControlsTimer()
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  }, [resetControlsTimer])

  useEffect(() => {
    if (showSidePanel || showPageInput || showThemePopup || showSearch) setShowControls(true)
  }, [showSidePanel, showPageInput, showThemePopup, showSearch])

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale)
  }, [])

  // ━━━ 북마크 ━━━
  const loadBookmarks = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id, page_number, memo, created_at')
        .eq('user_id', user.id)
        .eq('document_id', documentId)
        .order('page_number', { ascending: true })
      if (error) throw error
      setBookmarks(data || [])
    } catch (err) {
      console.error('Error loading bookmarks:', err)
    }
  }, [user, documentId])

  useEffect(() => {
    if (user && documentId) loadBookmarks()
  }, [user, documentId, loadBookmarks])

  const isCurrentPageBookmarked = bookmarks.some(b => b.page_number === pageNumber)

  const toggleBookmark = async () => {
    if (!requireLogin('북마크를 추가하려면 로그인이 필요합니다')) return
    if (bookmarkLoading) return
    setBookmarkLoading(true)
    try {
      if (isCurrentPageBookmarked) {
        const bm = bookmarks.find(b => b.page_number === pageNumber)
        if (bm) {
          await supabase.from('bookmarks').delete().eq('id', bm.id)
          setBookmarks(prev => prev.filter(b => b.id !== bm.id))
        }
      } else {
        const { data, error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user!.id, document_id: documentId, page_number: pageNumber })
          .select('id, page_number, memo, created_at')
          .single()
        if (error) throw error
        setBookmarks(prev => [...prev, data].sort((a, b) => a.page_number - b.page_number))
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err)
    } finally {
      setBookmarkLoading(false)
    }
  }

  const deleteBookmark = async (id: string) => {
    try {
      await supabase.from('bookmarks').delete().eq('id', id)
      setBookmarks(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      console.error('Error deleting bookmark:', err)
    }
  }

  // ─── 광고 ───
  useEffect(() => {
    if (isPremium || isRewardAdFree) return
    if (documentReady && numPages > 0 && !startAdShown) {
      const config = getTierConfig(getAdTier(numPages))
      if (config.showStartAd) {
        setAdType('start')
        setShowAdOverlay(true)
        setStartAdShown(true)
        setAdCount(1)
        setLastAdTime(Date.now())
      }
    }
  }, [documentReady, numPages, startAdShown])

  useEffect(() => {
    if (isPremium || isRewardAdFree) return
    if (numPages === 0 || showAdOverlay || !documentReady || !restoreChecked) return

    const prevPage = prevPageRef.current
    prevPageRef.current = pageNumber

    // 완독 복원 후 사용자가 페이지를 넘기면 플래그 해제
    if (restoredFromComplete && pageNumber > 1) {
      setRestoredFromComplete(false)
    }

    if (pageNumber === numPages && !endAdShown && !restoredFromComplete && tierConfig.showEndAd) {
      const timeSinceLastAd = (Date.now() - lastAdTime) / 1000
      if (timeSinceLastAd >= tierConfig.minTimeBetweenAds / 2 || adCount === 0) {
        setAdType('end')
        setShowAdOverlay(true)
        setEndAdShown(true)
        setAdCount((prev) => prev + 1)
        setLastAdTime(Date.now())
      }
      return
    }

    if (tierConfig.pageInterval === 0) return
    if (adCount >= tierConfig.maxAdsPerSession) return
    if (pageNumber <= prevPage) return

    const crossedAdPage = Math.floor(pageNumber / tierConfig.pageInterval) > Math.floor(prevPage / tierConfig.pageInterval)
    if (!crossedAdPage) return

    const timeSinceLastAd = (Date.now() - lastAdTime) / 1000
    if (timeSinceLastAd < tierConfig.minTimeBetweenAds) return
    if (Math.abs(pageNumber - lastAdPage) < 3) return

    setAdType('middle')
    setShowAdOverlay(true)
    setAdCount((prev) => prev + 1)
    setLastAdTime(Date.now())
    setLastAdPage(pageNumber)
  }, [pageNumber, numPages, showAdOverlay, documentReady, tierConfig, adCount, lastAdTime, lastAdPage, endAdShown, restoredFromComplete, restoreChecked])

  const handleAdClose = () => { setShowAdOverlay(false) }

  // ─── 문서 로드 ───
  useEffect(() => {
    loadDocument()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
      saveReadingSession()
    }
  }, [documentId])

  useEffect(() => {
    if (user && document) {
      createReadingSession()
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setTotalTime(elapsed)
        updateReadingTime(elapsed)
      }, 10000)
    }
  }, [user, document])

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!window.document.fullscreenElement)
    window.document.addEventListener('fullscreenchange', handleChange)
    return () => window.document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPageInput || showAdOverlay) return

      // 검색 단축키
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        toggleSearch()
        return
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false)
        setSearchQuery('')
        setSearchResults([])
        setSearchIndex(0)
        return
      }
      // 검색 중 Enter로 다음/이전 결과
      if (showSearch && e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) goToSearchResult(searchIndex - 1)
        else goToSearchResult(searchIndex + 1)
        return
      }

      if (showSearch) return // 검색 입력 중이면 다른 키보드 무시

      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          if (isEpub) break
          if (viewMode === 'page' || viewMode === 'reflow') goToPrevPage()
          else if (viewMode === 'book') setPageNumber((prev) => Math.max(prev - 2, 1))
          break
          case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
              e.preventDefault()
              if (isEpub) break
              if (viewMode === 'page' || viewMode === 'reflow') goToNextPage()
          else if (viewMode === 'book') setPageNumber((prev) => Math.min(prev + 2, numPages))
          break
        case 'Escape':
          if (showLoginPrompt) setShowLoginPrompt(false)
          else if (isFullscreen) toggleFullscreen()
          else if (showSidePanel) setShowSidePanel(false)
          break
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) toggleFullscreen()
          break
        case '+':
        case '=':
          e.preventDefault()
          if (!isEpub) zoomIn()
          break
        case '-':
          e.preventDefault()
          if (!isEpub) zoomOut()
          break
        case 'g':
        case 'G':
          e.preventDefault()
          if (!isEpub) setShowPageInput(true)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, numPages, pageNumber, isFullscreen, showSidePanel, showPageInput, showAdOverlay, isEpub, showLoginPrompt, showSearch, searchIndex, searchResults])

  useEffect(() => {
    if (showPageInput && pageInputRef.current) pageInputRef.current.focus()
  }, [showPageInput])

  const loadDocument = async () => {
    try {
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()
      if (docError) throw docError
      setDocument(docData)

      const filePath = docData.file_path || ''
      const detectedFileType = filePath.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf'
      setFileType(detectedFileType as 'pdf' | 'epub')

      if (detectedFileType === 'epub') {
        setViewMode('reflow')
      }

      const { data: authorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', docData.author_id)
        .single()
      if (authorData) setAuthorProfile(authorData)

      const viewKey = `viewed_${documentId}`
      if (!sessionStorage.getItem(viewKey)) {
        await supabase
          .from('documents')
          .update({ view_count: docData.view_count + 1 })
          .eq('id', documentId)
        sessionStorage.setItem(viewKey, '1')
      }

      // file_path가 이미 전체 URL이면 그대로 사용, 아니면 getPublicUrl로 변환
      if (docData.file_path.startsWith('http')) {
        setPdfUrl(docData.file_path)
      } else {
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(docData.file_path)
        setPdfUrl(urlData.publicUrl)
      }

      loadSeriesInfo(documentId)
    } catch (err) {
      console.error('Error loading document:', err)
      alert('콘텐츠를 불러오는데 실패했습니다.')
      router.push('/browse')
    } finally {
      setLoading(false)
    }
  }

  const loadSeriesInfo = async (docId: string) => {
    try {
      const { data: seriesDoc } = await supabase
        .from('series_documents')
        .select('series_id, position')
        .eq('document_id', docId)
        .maybeSingle()
      if (!seriesDoc) return

      const { data: series } = await supabase
        .from('document_series')
        .select('id, title')
        .eq('id', seriesDoc.series_id)
        .single()
      if (!series) return

      const { data: allDocs } = await supabase
        .from('series_documents')
        .select('document_id, position')
        .eq('series_id', series.id)
        .order('position', { ascending: true })
      if (!allDocs) return

      const docIds = allDocs.map(d => d.document_id)
      const { data: docTitles } = await supabase
        .from('documents')
        .select('id, title')
        .in('id', docIds)
      const titleMap = new Map((docTitles || []).map(d => [d.id, d.title]))

      const currentIndex = allDocs.findIndex(d => d.document_id === docId)
      const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null
      const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null

      setSeriesInfo({
        seriesId: series.id,
        seriesTitle: series.title,
        currentPosition: currentIndex + 1,
        totalDocs: allDocs.length,
        docs: allDocs.map(d => ({
          documentId: d.document_id,
          position: d.position,
          title: titleMap.get(d.document_id) || '알 수 없는 콘텐츠',
        })),
        prevDocId: prevDoc?.document_id || null,
        nextDocId: nextDoc?.document_id || null,
      })
    } catch (err) {
      console.error('Error loading series info:', err)
    }
  }

  const createReadingSession = async () => {
    if (!user || !document) return
    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .insert({ document_id: documentId, reader_id: user.id, current_page: pageNumber })
        .select()
        .single()
      if (error) throw error
      setSessionId(data.id)
    } catch (err) {
      console.error('Error creating session:', err)
    }
  }

  const updateReadingTime = async (elapsed: number) => {
    if (!sessionId) return
    try {
      await supabase
        .from('reading_sessions')
        .update({ reading_time: elapsed, current_page: pageNumber, last_read_at: new Date().toISOString() })
        .eq('id', sessionId)
      if (document) {
        await supabase
          .from('documents')
          .update({ total_reading_time: document.total_reading_time + 10 })
          .eq('id', documentId)
      }
    } catch (err) {
      console.error('Error updating reading time:', err)
    }
  }

  const saveReadingSession = async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    await updateReadingTime(elapsed)
  }

  // ★ 페이지 로그 버퍼를 DB에 일괄 저장
  const flushPageLogs = useCallback(async () => {
    if (!sessionId || !user || pageLogsBufferRef.current.length === 0) return
    const logsToSend = [...pageLogsBufferRef.current]
    pageLogsBufferRef.current = []
    try {
      const rows = logsToSend.map(log => ({ session_id: sessionId, ...log }))
      await supabase.from('page_reading_logs').insert(rows)
    } catch (err) {
      console.error('Error flushing page logs:', err)
      pageLogsBufferRef.current = [...logsToSend, ...pageLogsBufferRef.current]
    }
  }, [sessionId, user])

  // ★ 현재 페이지 체류 기록을 버퍼에 추가
  const recordPageTime = useCallback(() => {
    if (!user || !documentId) return
    const now = Date.now()
    const duration = Math.floor((now - pageEnteredAtRef.current) / 1000)
    if (duration < 2) return // 2초 미만은 무시
    const clampedDuration = Math.min(duration, 600) // 최대 10분 제한
    pageLogsBufferRef.current.push({
      document_id: documentId, reader_id: user.id, page_number: pageNumber,
      duration_seconds: clampedDuration,
      entered_at: new Date(pageEnteredAtRef.current).toISOString(),
      left_at: new Date(now).toISOString(),
    })
  }, [user, documentId, pageNumber])

  // ★ 페이지 변경 시 이전 페이지 체류 기록
  const prevPageForLogRef = useRef<number>(pageNumber)
  useEffect(() => {
    if (prevPageForLogRef.current !== pageNumber) {
      recordPageTime()
      pageEnteredAtRef.current = Date.now()
      prevPageForLogRef.current = pageNumber
    }
  }, [pageNumber, recordPageTime])

  // ★ 30초마다 버퍼 flush
  useEffect(() => {
    if (!sessionId || !user) return
    flushTimerRef.current = setInterval(() => { flushPageLogs() }, 30000)
    return () => { if (flushTimerRef.current) clearInterval(flushTimerRef.current) }
  }, [sessionId, user, flushPageLogs])

  // ★ 탭 닫기/이동 시 남은 로그 전송 (keepalive fetch)
  useEffect(() => {
    const handleBeforeUnload = () => {
      recordPageTime()
      if (pageLogsBufferRef.current.length === 0 || !sessionId || !user) return
      const rows = pageLogsBufferRef.current.map(log => ({ session_id: sessionId, ...log }))
      pageLogsBufferRef.current = []
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (supabaseUrl && supabaseKey) {
          fetch(supabaseUrl + '/rest/v1/page_reading_logs', {
            method: 'POST', keepalive: true,
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': 'Bearer ' + supabaseKey,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(rows),
          }).catch(() => {})
        }
      } catch {}
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sessionId, user, recordPageTime])

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1))
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages))
  const goToPage = (page: number) => {
    setPageNumber(Math.max(1, Math.min(page, numPages)))
    setShowPageInput(false)
    setPageInputValue('')
  }
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.05, 3.0))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.05, 0.5))
  const resetZoom = () => setScale(1.0)

  const toggleFullscreen = async () => {
    if (!viewerRef.current) return
    try {
      if (!window.document.fullscreenElement) await viewerRef.current.requestFullscreen()
      else await window.document.exitFullscreen()
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const handlePageChange = (page: number, total: number) => {
    setPageNumber(page)
    setNumPages(total)
  }

  const handleDocumentLoad = (total: number) => {
    setNumPages(total)
    setDocumentReady(true)
  }

  const progress = numPages > 0 ? (pageNumber / numPages) * 100 : 0

  // ★ 남은 시간 계산
  const getRemainingTime = (): string => {
    if (numPages <= 1 || pageNumber <= 1 || totalTime < 10) return ''
    const pagesRead = pageNumber - 1
    const secPerPage = totalTime / pagesRead
    const pagesLeft = numPages - pageNumber
    const secLeft = Math.round(secPerPage * pagesLeft)
    if (secLeft < 60) return '1분 미만'
    const minLeft = Math.round(secLeft / 60)
    if (minLeft < 60) return `약 ${minLeft}분 남음`
    const hours = Math.floor(minLeft / 60)
    const mins = minLeft % 60
    if (mins === 0) return `약 ${hours}시간 남음`
    return `약 ${hours}시간 ${mins}분 남음`
  }
  const remainingTime = getRemainingTime()

  const viewerFilterStyle: React.CSSProperties = viewMode === 'reflow' ? {} : {
    filter: [
      brightness !== 100 ? `brightness(${brightness / 100})` : '',
      contrast !== 100 ? `contrast(${contrast / 100})` : '',
      bgTheme === 'sepia' ? 'sepia(0.35) saturate(1.2)' : '',
      bgTheme === 'dark' ? 'brightness(0.85) contrast(1.1)' : '',
    ].filter(Boolean).join(' ') || 'none',
  }

  const viewerBgColor = viewMode === 'reflow' ? 'transparent' : BG_THEMES[bgTheme].bgColor

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1410]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#C4A882]">콘텐츠를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={viewerRef} className="h-screen w-screen bg-[#1A1410] flex flex-col overflow-hidden select-none">

      {/* ━━━ 로그인 유도 팝업 ━━━ */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLoginPrompt(false)}>
          <div className="bg-[#241E18] border border-[#3A302A] rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 bg-[#B2967D]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-7 h-7 text-[#C4A882]" />
            </div>
            <h3 className="text-[#EEE4E1] font-semibold text-lg mb-2">로그인이 필요합니다</h3>
            <p className="text-[#9C8B7A] text-sm mb-6">{loginPromptMessage}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLoginPrompt(false)}
                className="flex-1 px-4 py-2.5 bg-[#2E2620] hover:bg-[#3A302A] rounded-xl text-[#C4A882] text-sm transition-colors">
                나중에
              </button>
              <button onClick={() => router.push(`/login?redirect=/read/${documentId}`)}
                className="flex-1 px-4 py-2.5 bg-[#B2967D] hover:bg-[#C4A882] rounded-xl text-[#1A1410] text-sm font-medium transition-colors">
                로그인하기
              </button>
            </div>
            <button onClick={() => router.push(`/signup?redirect=/read/${documentId}`)}
              className="mt-3 text-xs text-[#9C8B7A] hover:text-[#EEE4E1] transition-colors">
              아직 계정이 없으신가요? 회원가입
            </button>
          </div>
        </div>
      )}

      {/* ━━━ 광고 오버레이 ━━━ */}
      {/* ━━━ 일반 광고 오버레이 ━━━ */}
      <AdOverlay
        isVisible={showAdOverlay}
        onClose={handleAdClose}
        skipDelay={5}
        type={adType}
        documentId={documentId}
        authorId={document?.author_id}
        viewerId={user?.id || null}
        pageNumber={pageNumber}
        sessionId={sessionId}
      />

      {/* ━━━ 보상형 광고 오버레이 ━━━ */}
      <AdOverlay
        isVisible={showRewardAd}
        onClose={() => setShowRewardAd(false)}
        skipDelay={30}
        type="reward"
        documentId={documentId}
        authorId={document?.author_id}
        viewerId={user?.id || null}
        pageNumber={pageNumber}
        sessionId={sessionId}
        onRewardComplete={handleRewardComplete}
      />

      {/* ━━━ 배경/밝기 팝업 (PDF 모드에서만, EPUB 제외) ━━━ */}
      {showThemePopup && viewMode !== 'reflow' && !isEpub && document?.content_type !== 'webtoon' && (
        <div ref={themePopupRef} className="fixed top-[62px] left-1/2 -translate-x-1/2 w-56 bg-[#241E18] border border-[#3A302A] rounded-xl shadow-2xl p-4 z-[9999]">
          <p className="text-xs text-[#9C8B7A] mb-2 font-medium">배경 테마</p>
          <div className="flex gap-2 mb-4">
            {(Object.keys(BG_THEMES) as BgTheme[]).map((key) => (
              <button
                key={key}
                onClick={() => setBgTheme(key)}
                className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all ${
                  bgTheme === key
                    ? 'border-[#B2967D] bg-[#B2967D]/10'
                    : 'border-[#3A302A] hover:border-[#5C4A38]'
                }`}
              >
                <div className="w-8 h-8 rounded-full border border-[#3A302A] shadow-inner" style={{ backgroundColor: BG_THEMES[key].previewColor }} />
                <span className="text-[10px] text-[#C4A882]">{BG_THEMES[key].label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9C8B7A] mb-2 font-medium">밝기 {brightness}%</p>
          <input type="range" min={50} max={150} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full h-1.5 bg-[#2E2620] rounded-full appearance-none cursor-pointer accent-[#B2967D]" />
          <div className="flex justify-between text-[10px] text-[#9C8B7A] mt-1">
            <span>어둡게</span>
            <button onClick={() => setBrightness(100)} className="hover:text-[#EEE4E1] transition-colors">초기화</button>
            <span>밝게</span>
          </div>
          <p className="text-xs text-[#9C8B7A] mb-2 mt-4 font-medium">선명도 {contrast}%</p>
          <input type="range" min={50} max={150} value={contrast} onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full h-1.5 bg-[#2E2620] rounded-full appearance-none cursor-pointer accent-[#B2967D]" />
          <div className="flex justify-between text-[10px] text-[#9C8B7A] mt-1">
            <span>흐리게</span>
            <button onClick={() => setContrast(100)} className="hover:text-[#EEE4E1] transition-colors">초기화</button>
            <span>선명하게</span>
          </div>
        </div>
      )}

      {/* ━━━ 본문 검색 바 ━━━ */}
      {showSearch && (
        <div className="fixed top-[62px] left-1/2 -translate-x-1/2 z-[9998] w-full max-w-md px-3">
          <div className="bg-[#241E18] border border-[#3A302A] rounded-xl shadow-2xl overflow-hidden">
            {/* 검색 입력 */}
            <div className="flex items-center gap-2 px-3 py-2">
              <Search className="w-4 h-4 text-[#9C8B7A] flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="본문에서 검색..."
                className="flex-1 bg-transparent text-sm text-[#EEE4E1] placeholder-[#5C4A38] outline-none"
                autoComplete="off"
              />
              {searchLoading && (
                <div className="w-4 h-4 border-2 border-[#B2967D] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              {searchResults.length > 0 && (
                <span className="text-[11px] text-[#9C8B7A] flex-shrink-0 tabular-nums">
                  {searchIndex + 1}/{searchResults.length}
                </span>
              )}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={() => goToSearchResult(searchIndex - 1)} disabled={searchResults.length === 0}
                  className="p-1 rounded hover:bg-[#2E2620] text-[#9C8B7A] hover:text-[#EEE4E1] disabled:opacity-30 transition-colors">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => goToSearchResult(searchIndex + 1)} disabled={searchResults.length === 0}
                  className="p-1 rounded hover:bg-[#2E2620] text-[#9C8B7A] hover:text-[#EEE4E1] disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <button onClick={toggleSearch}
                className="p-1 rounded hover:bg-[#2E2620] text-[#9C8B7A] hover:text-[#EEE4E1] transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 검색 결과 리스트 */}
            {searchResults.length > 0 && (
              <div className="border-t border-[#3A302A] max-h-[240px] overflow-y-auto">
                {searchResults.map((result, i) => (
                  <button
                    key={`${result.pageNumber}-${i}`}
                    onClick={() => { setSearchIndex(i); setPageNumber(result.pageNumber) }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors border-b border-[#3A302A]/50 last:border-b-0 ${
                      i === searchIndex ? 'bg-[#B2967D]/15' : 'hover:bg-[#2E2620]'
                    }`}
                  >
                    <span className="text-[#B2967D] font-medium mr-2">{result.pageNumber}{isEpub ? '챕터' : 'p'}</span>
                    <span className="text-[#C4A882]">{result.snippet}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 결과 없음 */}
            {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
              <div className="border-t border-[#3A302A] px-3 py-3 text-center text-xs text-[#9C8B7A]">
                검색 결과가 없습니다
              </div>
            )}

            {/* 안내 */}
            {searchQuery.trim().length < 2 && (
              <div className="border-t border-[#3A302A] px-3 py-2 text-center text-[10px] text-[#5C4A38]">
                2글자 이상 입력 · Enter 다음 결과 · Shift+Enter 이전 결과 · Esc 닫기
              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━━ 상단 오버레이 ━━━ */}
      {showControls ? (
        <div className="absolute top-0 left-0 right-0 z-50">
        <div className="h-1 bg-[#2E2620] w-full relative">
          <div className="h-full bg-gradient-to-r from-[#B2967D] to-[#E6BEAE] transition-all duration-300" style={{ width: `${progress}%` }} />
          {remainingTime && !isEpub && viewMode !== 'reflow' && (
            <span className="absolute right-2 -bottom-4 text-[10px] text-[#9C8B7A] pointer-events-none select-none">
              {remainingTime}
            </span>
          )}
        </div>

        <div className="bg-[#241E18] border-b border-[#3A302A] px-2 sm:px-3 py-1.5 overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-2">

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button onClick={() => router.push('/')} className="p-1.5 rounded-lg hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1] transition-colors" title="홈으로">
                <Home className="w-5 h-5" />
              </button>
              <div className="hidden lg:block max-w-[180px]">
                <h1 className="text-sm font-medium text-[#EEE4E1] truncate">{document?.title}</h1>
                {seriesInfo && (
                  <p className="text-[10px] text-[#9C8B7A] truncate">📚 {seriesInfo.seriesTitle} ({seriesInfo.currentPosition}/{seriesInfo.totalDocs})</p>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5">
              {/* ━━━ 뷰 모드 버튼 ━━━ */}
              {document?.content_type === 'webtoon' ? (
                <div className="flex items-center bg-[#2E2620] rounded-lg px-2 py-1">
                  <span className="text-xs text-[#C4A882]">🎨 웹툰</span>
                </div>
              ) : isEpub ? (
                <div className="flex items-center bg-[#2E2620] rounded-lg p-0.5">
                  <button className="p-1.5 rounded-md bg-[#B2967D] text-[#1A1410]" title="리플로우 모드 (EPUB)">
                    <AlignLeft className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center bg-[#2E2620] rounded-lg p-0.5">
                  <button onClick={() => setViewMode('page')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'page' ? 'bg-[#B2967D] text-[#1A1410]' : 'text-[#C4A882] hover:text-[#EEE4E1]'}`}
                    title="페이지 모드">
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('scroll')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'scroll' ? 'bg-[#B2967D] text-[#1A1410]' : 'text-[#C4A882] hover:text-[#EEE4E1]'}`}
                    title="스크롤 모드">
                    <ScrollText className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('reflow')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'reflow' ? 'bg-[#B2967D] text-[#1A1410]' : 'text-[#C4A882] hover:text-[#EEE4E1]'}`}
                    title="리플로우 모드">
                    <AlignLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ━━━ EPUB/Reflow 뷰어 컨트롤 (헤더 통합) ━━━ */}
              {isViewerMode && document?.content_type !== 'webtoon' && (
                <>
                  <div className="w-px h-4 bg-[#3A302A]" />
                  <button onClick={() => dispatchViewerToggle('toc')}
                    className={`p-1.5 rounded-lg transition-colors ${viewerCtrl.showToc ? 'bg-[#B2967D] text-[#1A1410]' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}`}
                    title="목차">
                    <List className="w-4 h-4" />
                  </button>
                  <button onClick={() => dispatchViewerToggle('focus')}
                    className={`p-1.5 rounded-lg transition-colors ${viewerCtrl.focusMode ? 'bg-blue-500/20 text-blue-400' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}`}
                    title="집중 모드">
                    <Focus className="w-4 h-4" />
                  </button>
                  <button onClick={() => dispatchViewerToggle('highlight')}
                    className={`p-1.5 rounded-lg transition-colors ${viewerCtrl.showHighlightPanel ? 'bg-amber-500/20 text-amber-400' : viewerCtrl.highlightCount > 0 ? 'text-amber-400 hover:bg-[#2E2620]' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}`}
                    title="형광펜">
                    <Highlighter className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-[#3A302A]" />
                  <span className="text-xs text-[#C4A882] tabular-nums px-1">
                    {viewerCtrl.page}/{viewerCtrl.totalPages}
                  </span>
                  <div className="w-px h-4 bg-[#3A302A]" />
                  <button onClick={() => dispatchViewerToggle('settings')}
                    className={`p-1.5 rounded-lg transition-colors ${viewerCtrl.showSettings ? 'bg-[#B2967D] text-[#1A1410]' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}`}
                    title="뷰어 설정">
                    <Settings2 className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* ━━━ PDF 전용 컨트롤 ━━━ */}
              {viewMode !== 'reflow' && !isEpub && document?.content_type !== 'webtoon' && (
                <>
                  <div className="w-px h-4 bg-[#3A302A]" />

                  <button onClick={goToPrevPage} disabled={pageNumber <= 1}
                    className="p-1.5 rounded-lg hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1] disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {showPageInput ? (
                    <form onSubmit={(e) => { e.preventDefault(); const p = parseInt(pageInputValue); if (!isNaN(p)) goToPage(p) }} className="flex items-center">
                      <input ref={pageInputRef} type="number" min={1} max={numPages} value={pageInputValue}
                        onChange={(e) => setPageInputValue(e.target.value)}
                        onBlur={() => { setShowPageInput(false); setPageInputValue('') }}
                        className="w-12 px-1 py-0.5 bg-[#2E2620] border border-[#3A302A] rounded text-sm text-[#EEE4E1] text-center focus:outline-none focus:border-[#B2967D]"
                        placeholder={String(pageNumber)} />
                      <span className="text-[#9C8B7A] text-xs mx-0.5">/</span>
                      <span className="text-[#C4A882] text-xs">{numPages}</span>
                    </form>
                  ) : (
                    <button onClick={() => setShowPageInput(true)} className="px-2 py-0.5 rounded-lg hover:bg-[#2E2620] transition-colors text-sm" title="페이지 직접 이동 (G키)">
                      <span className="text-[#EEE4E1] font-medium">{pageNumber}</span>
                      <span className="text-[#9C8B7A] mx-0.5">/</span>
                      <span className="text-[#C4A882]">{numPages}</span>
                    </button>
                  )}

                  <button onClick={goToNextPage} disabled={pageNumber >= numPages}
                    className="p-1.5 rounded-lg hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1] disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="w-px h-4 bg-[#3A302A]" />

                  <div className="flex items-center gap-0.5">
                    <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1] transition-colors">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={resetZoom} className="px-1.5 py-0.5 rounded-lg hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1] transition-colors text-xs font-mono">
                      {Math.round(scale * 100)}%
                    </button>
                    <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1] transition-colors">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-[#3A302A]" />
                  <div className="relative">
                    <button onClick={() => setShowThemePopup(!showThemePopup)}
                      className={`p-1.5 rounded-lg transition-colors ${showThemePopup ? 'bg-[#B2967D] text-[#1A1410]' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}`}
                      title="배경 & 밝기">
                      <Sun className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {!isPremium && !isRewardAdFree && (
              <div className="hidden md:flex items-center flex-shrink-0">
                <div className="h-[50px] w-[200px] lg:w-[300px] overflow-hidden rounded opacity-70 hover:opacity-100 transition-opacity">
                  <AdBanner position="bottom" documentId={documentId} authorId={document?.author_id} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* ━━━ 보상형 광고 버튼 ━━━ */}
              {!isPremium && !isRewardAdFree && (
                <button
                  onClick={() => setShowRewardAd(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-amber-600/80 to-amber-500/80 hover:from-amber-500 hover:to-amber-400 text-white text-[11px] font-medium transition-all shadow-lg shadow-amber-900/20"
                  title="30초 광고를 시청하면 1시간 동안 광고 없이 읽을 수 있습니다"
                >
                  <Play className="w-3.5 h-3.5" fill="currentColor" />
                  <span className="hidden sm:inline">무광고</span>
                </button>
              )}
              {isRewardAdFree && (
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-800/50 border border-green-600/30 text-green-400 text-[11px]"
                  title={'무광고 ' + getRewardRemainingMin() + '분 남음'}>
                  <span>✓</span>
                  <span className="hidden sm:inline">{getRewardRemainingMin()}분</span>
                </div>
              )}
              {/* ━━━ 검색 버튼 ━━━ */}
              <button onClick={toggleSearch}
                className={`hidden sm:block p-2 rounded-lg transition-colors ${showSearch ? 'bg-[#B2967D] text-[#1A1410]' : 'hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1]'}`}
                title="본문 검색 (Ctrl+F)">
                <Search className="w-5 h-5" />
              </button>
              <button onClick={toggleBookmark}
                className={`p-2 rounded-lg transition-colors ${isCurrentPageBookmarked ? 'text-amber-400 hover:text-amber-300' : 'text-[#C4A882] hover:text-[#EEE4E1]'} hover:bg-[#2E2620]`}
                title={isCurrentPageBookmarked ? '북마크 제거' : '이 페이지 북마크'}>
                <Bookmark className="w-5 h-5" fill={isCurrentPageBookmarked ? 'currentColor' : 'none'} />
              </button>
              <ReadingListButton documentId={documentId} compact />
              <ShareButton documentId={documentId} title={document?.title || ''} />
              <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1] transition-colors" title="전체화면 (F키)">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
              <button onClick={() => setShowSidePanel(!showSidePanel)}
                className={`p-2 rounded-lg transition-colors ${showSidePanel ? 'bg-[#B2967D] text-[#1A1410]' : 'hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1]'}`}
                title="댓글/정보 패널">
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        </div>
      ) : !isPremium && !isRewardAdFree ? (
        <div className="absolute top-0 left-0 right-0 z-50 bg-[#241E18]/90 backdrop-blur-sm border-b border-[#3A302A] px-2 py-1 flex items-center justify-center cursor-pointer"
          onClick={() => resetControlsTimer()}>
          <div className="h-[50px] w-full max-w-[728px] overflow-hidden rounded opacity-90">
            <AdBanner position="top" documentId={documentId} authorId={document?.author_id} />
          </div>
        </div>
      ) : null}

      {/* ━━━ 메인 컨텐츠 ━━━ */}
      <div className={`flex flex-1 overflow-hidden pt-[58px] ${!isPremium && !isRewardAdFree ? 'pb-[58px]' : ''}`}>
        <div className={`flex-1 flex flex-col transition-all duration-300 ${showSidePanel ? 'sm:mr-[380px]' : ''}`}>
          <div className="flex-1 overflow-hidden transition-[filter,background-color] duration-300"
            style={{ backgroundColor: viewerBgColor, ...viewerFilterStyle }}>
            {document?.content_type === 'webtoon' ? (
              <WebtoonViewer
                documentId={documentId}
                authorId={document?.author_id}
                isPremium={isPremium}
                isRewardAdFree={isRewardAdFree}
                onProgress={(current, total) => {
                  setPageNumber(current)
                  setNumPages(total)
                  if (!documentReady && total > 0) setDocumentReady(true) // webtoon
                }}
              />
            ) : isEpub && !epubLoadFailed ? (
              <EpubViewer
                epubUrl={pdfUrl}
                documentId={documentId}
                onPageChange={handlePageChange}
                onDocumentLoad={handleDocumentLoad}
                onError={() => setEpubLoadFailed(true)}
                hideTopBar
              />
            ) : viewMode === 'reflow' ? (
              <ReflowViewer
                pdfUrl={pdfUrl}
                documentId={documentId}
                pageNumber={pageNumber}
                onPageChange={handlePageChange}
                onDocumentLoad={handleDocumentLoad}
                onSwitchToPdf={() => setViewMode('page')}
                fileType={fileType}
                hideTopBar
              />
            ) : (
              pdfUrl && (
                <PDFViewer pdfUrl={pdfUrl} pageNumber={pageNumber} scale={scale} viewMode={viewMode}
                  showSidePanel={showSidePanel} onPageChange={handlePageChange} onDocumentLoad={handleDocumentLoad} onScaleChange={handleScaleChange}
                  bottomOffset={!isPremium && !isRewardAdFree ? 58 : 0} />
              )
            )}
          </div>
        </div>

        {/* ━━━ 사이드 패널 오버레이 (배경 클릭으로 닫기) ━━━ */}
        {showSidePanel && (
          <div className="fixed inset-0 z-30 bg-black/40 sm:bg-black/20 transition-opacity" onClick={() => setShowSidePanel(false)} />
        )}

        {/* ━━━ 사이드 패널 ━━━ */}
        <div className={`fixed right-0 top-0 bottom-0 z-40 bg-[#241E18] border-l border-[#3A302A]
          transition-all duration-300 ease-in-out flex flex-col
          ${showSidePanel ? 'translate-x-0' : 'translate-x-full'} w-full sm:w-[380px]`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A302A]">
            <h2 className="text-[#EEE4E1] font-medium">정보 & 댓글</h2>
            <button onClick={() => setShowSidePanel(false)} className="p-1.5 rounded-lg hover:bg-[#2E2620] text-[#C4A882] hover:text-[#EEE4E1] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-[#3A302A]">
              <h3 className="text-[#EEE4E1] font-semibold text-lg mb-1">{document?.title}</h3>
              {document?.description && <p className="text-[#C4A882] text-sm mb-3">{document.description}</p>}
              <div className="flex items-center gap-2 text-xs text-[#9C8B7A]">
                <span>조회수 {document?.view_count.toLocaleString()}회</span>
                <span>·</span>
                <span>읽기 시간: {Math.floor(totalTime / 60)}분 {totalTime % 60}초</span>
                {remainingTime && <><span>·</span><span>⏱ {remainingTime}</span></>}
                {isEpub && <span>· 📚 EPUB</span>}
              </div>
            </div>

            {/* ━━━ 시리즈 정보 ━━━ */}
            {seriesInfo && (
              <div className="p-4 border-b border-[#3A302A]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">📚</span>
                  <div>
                    <p className="text-[#EEE4E1] font-medium text-sm">{seriesInfo.seriesTitle}</p>
                    <p className="text-[#C4A882] text-xs">{seriesInfo.currentPosition} / {seriesInfo.totalDocs}편</p>
                  </div>
                </div>

                <div className="space-y-1 mb-3 max-h-[200px] overflow-y-auto">
                  {seriesInfo.docs.map((doc, i) => (
                    <div key={doc.documentId}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        doc.documentId === documentId
                          ? 'bg-[#B2967D]/20 text-[#C4A882] font-medium'
                          : 'text-[#9C8B7A] hover:bg-[#2E2620] hover:text-[#EEE4E1] cursor-pointer'
                      }`}
                      onClick={() => { if (doc.documentId !== documentId) router.push(`/read/${doc.documentId}`) }}>
                      <span className="w-5 text-center flex-shrink-0">{i + 1}</span>
                      <span className="truncate">{doc.title}</span>
                      {doc.documentId === documentId && (
                        <span className="ml-auto text-[10px] bg-[#B2967D]/30 px-1.5 py-0.5 rounded">현재</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {seriesInfo.prevDocId && (
                    <button onClick={() => router.push(`/read/${seriesInfo.prevDocId}`)}
                      className="flex-1 px-3 py-2 bg-[#2E2620] hover:bg-[#3A302A] rounded-lg text-xs text-[#C4A882] transition-colors text-center">
                      ← 이전편
                    </button>
                  )}
                  {seriesInfo.nextDocId && (
                    <button onClick={() => router.push(`/read/${seriesInfo.nextDocId}`)}
                      className="flex-1 px-3 py-2 bg-[#B2967D] hover:bg-[#C4A882] rounded-lg text-xs text-[#1A1410] transition-colors text-center">
                      다음편 →
                    </button>
                  )}
                </div>
              </div>
            )}

            {authorProfile && (
              <div className="p-4 border-b border-[#3A302A]">
                <div className="flex items-center justify-between">
                  <Link href={`/profile/${authorProfile.id}`}>
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                      {authorProfile.avatar_url ? (
                        <Image src={authorProfile.avatar_url} alt={authorProfile.username || ''} width={40} height={40} className="rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] rounded-full flex items-center justify-center text-[#1A1410] font-bold text-sm">
                          {(authorProfile.username || authorProfile.email)[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-[#EEE4E1] font-medium text-sm">{authorProfile.username || authorProfile.email}</p>
                        <p className="text-[#9C8B7A] text-xs">구독자 {authorProfile.subscribers_count.toLocaleString()}명</p>
                      </div>
                    </div>
                  </Link>
                  <SubscribeButton authorId={authorProfile.id} authorName={authorProfile.username || authorProfile.email} initialSubscribersCount={authorProfile.subscribers_count} />
                </div>
              </div>
            )}

            <div className="p-4 border-b border-[#3A302A]">
              <div className="flex items-center gap-3">
                <ReactionButtons documentId={documentId} initialLikes={document?.likes_count || 0} initialDislikes={document?.dislikes_count || 0} />
                <ReadingListButton documentId={documentId} />
              </div>
            </div>

            {/* ★ 비로그인 시 로그인 유도 배너 */}
            {!user && (
              <div className="p-4 border-b border-[#3A302A]">
                <div className="bg-[#B2967D]/10 border border-[#B2967D]/20 rounded-xl p-4 text-center">
                  <LogIn className="w-6 h-6 text-[#C4A882] mx-auto mb-2" />
                  <p className="text-[#EEE4E1] text-sm font-medium mb-1">로그인하고 더 많은 기능을 이용하세요</p>
                  <p className="text-[#9C8B7A] text-xs mb-3">좋아요, 북마크, 댓글, 구독 등</p>
                  <div className="flex gap-2">
                    <button onClick={() => router.push(`/login?redirect=/read/${documentId}`)}
                      className="flex-1 px-3 py-2 bg-[#B2967D] hover:bg-[#C4A882] rounded-lg text-xs text-[#1A1410] font-medium transition-colors">
                      로그인
                    </button>
                    <button onClick={() => router.push(`/signup?redirect=/read/${documentId}`)}
                      className="flex-1 px-3 py-2 bg-[#2E2620] hover:bg-[#3A302A] rounded-lg text-xs text-[#C4A882] transition-colors">
                      회원가입
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bookmarks.length > 0 && (
              <div className="p-4 border-b border-[#3A302A]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#EEE4E1] font-medium text-sm flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-amber-400" fill="currentColor" />
                    북마크 ({bookmarks.length})
                  </h3>
                </div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {bookmarks.map((bm) => (
                    <div key={bm.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                        bm.page_number === pageNumber
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'text-[#C4A882] hover:bg-[#2E2620] hover:text-[#EEE4E1]'
                      }`}
                      onClick={() => setPageNumber(bm.page_number)}>
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-3.5 h-3.5 flex-shrink-0" fill={bm.page_number === pageNumber ? 'currentColor' : 'none'} />
                        <span>{bm.page_number}{isEpub ? '챕터' : '페이지'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#9C8B7A]">{new Date(bm.created_at).toLocaleDateString()}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteBookmark(bm.id) }}
                          className="p-1 rounded hover:bg-red-500/20 text-[#9C8B7A] hover:text-red-400 transition-colors" title="삭제">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-b border-[#3A302A]">
              <CommentsSection documentId={documentId} />
            </div>

            {!isPremium && !isRewardAdFree && (
              <div className="p-4">
                <AdBanner position="sidebar" documentId={documentId} authorId={document?.author_id} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ 하단 고정 광고 배너 ━━━ */}
      {!isPremium && !isRewardAdFree && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#241E18]/95 backdrop-blur-sm border-t border-[#3A302A] flex items-center justify-center py-1">
          <div className="h-[50px] w-full max-w-[728px] overflow-hidden rounded">
            <AdBanner position="bottom" documentId={documentId} authorId={document?.author_id} />
          </div>
        </div>
      )}
    </div>
  )
}
