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
  BookOpenCheck,
  Sun,
  Bookmark,
  Trash2,
  AlignLeft,
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
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#8fbba5]">PDF 뷰어 로딩 중...</p>
      </div>
    </div>
  ),
})

const ReflowViewer = dynamic(() => import('@/components/reflow-viewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#8fbba5]">리플로우 뷰어 로딩 중...</p>
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
  default: { label: '기본', previewColor: '#0b1a13', bgColor: '#0b1a13' },
  sepia: { label: '세피아', previewColor: '#f4ecd8', bgColor: '#f4ecd8' },
  dark: { label: '다크', previewColor: '#121212', bgColor: '#121212' },
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
  const [showThemePopup, setShowThemePopup] = useState(false)
  const themePopupRef = useRef<HTMLDivElement>(null)

  // ━━━ 북마크 ━━━
  type BookmarkItem = { id: string; page_number: number; memo: string; created_at: string }
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [bookmarkLoading, setBookmarkLoading] = useState(false)

  // 시리즈 상태
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null)

  // 읽기 시간 추적
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startTime] = useState<number>(Date.now())
  const [totalTime, setTotalTime] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const pageInputRef = useRef<HTMLInputElement>(null)

  // ─── 광고 상태 ───
  const [showAdOverlay, setShowAdOverlay] = useState(false)
  const [adType, setAdType] = useState<'start' | 'middle' | 'end'>('middle')
  const [adCount, setAdCount] = useState(0)
  const [lastAdTime, setLastAdTime] = useState<number>(0)
  const [lastAdPage, setLastAdPage] = useState<number>(0)
  const [startAdShown, setStartAdShown] = useState(false)
  const [endAdShown, setEndAdShown] = useState(false)
  const [documentReady, setDocumentReady] = useState(false)
  const prevPageRef = useRef<number>(1)

  const tier = numPages > 0 ? getAdTier(numPages) : 'micro'
  const tierConfig = getTierConfig(tier)

  // ━━━ 배경 테마/밝기: localStorage 복원 & 저장 ━━━
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('textry_bg_theme') as BgTheme | null
      const savedBrightness = localStorage.getItem('textry_brightness')
      if (savedTheme && BG_THEMES[savedTheme]) setBgTheme(savedTheme)
      if (savedBrightness) setBrightness(Number(savedBrightness))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('textry_bg_theme', bgTheme) } catch {}
  }, [bgTheme])

  useEffect(() => {
    try { localStorage.setItem('textry_brightness', String(brightness)) } catch {}
  }, [brightness])

  // 테마 팝업 외부 클릭 닫기
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

  // ━━━ 모바일 감지 + 자동 페이지 모드 전환 ━━━
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

  // ━━━ 컨트롤바 auto-hide (3초 무활동 시 숨김) ━━━
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (!showSidePanel && !showPageInput && !showThemePopup) {
        setShowControls(false)
      }
    }, 3000)
  }, [showSidePanel, showPageInput, showThemePopup])

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
    if (showSidePanel || showPageInput || showThemePopup) setShowControls(true)
  }, [showSidePanel, showPageInput, showThemePopup])

  // ━━━ 핀치줌 콜백 (PDFViewer에서 호출) ━━━
  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale)
  }, [])

  // ━━━ 북마크 로드 ━━━
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
    if (!user || bookmarkLoading) return
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
          .insert({ user_id: user.id, document_id: documentId, page_number: pageNumber })
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

  // ─── 시작 광고 (프리미엄은 스킵) ───
  useEffect(() => {
    if (isPremium) return
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

  // ─── 페이지 변경 시 중간/끝 광고 체크 (프리미엄은 스킵) ───
  useEffect(() => {
    if (isPremium) return
    if (numPages === 0 || showAdOverlay || !documentReady) return

    const prevPage = prevPageRef.current
    prevPageRef.current = pageNumber

    if (pageNumber === numPages && !endAdShown && tierConfig.showEndAd) {
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
  }, [pageNumber, numPages, showAdOverlay, documentReady, tierConfig, adCount, lastAdTime, lastAdPage, endAdShown])

  const handleAdClose = () => {
    setShowAdOverlay(false)
  }

  // ─── 기존 로직들 ───
  useEffect(() => {
    loadDocument()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
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
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          if (viewMode === 'page' || viewMode === 'reflow') goToPrevPage()
          else if (viewMode === 'book') setPageNumber((prev) => Math.max(prev - 2, 1))
          break
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
          if (viewMode === 'page' || viewMode === 'reflow') goToNextPage()
          else if (viewMode === 'book') setPageNumber((prev) => Math.min(prev + 2, numPages))
          break
        case 'Escape':
          if (isFullscreen) toggleFullscreen()
          else if (showSidePanel) setShowSidePanel(false)
          break
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) toggleFullscreen()
          break
        case '+':
        case '=':
          e.preventDefault()
          zoomIn()
          break
        case '-':
          e.preventDefault()
          zoomOut()
          break
        case 'g':
        case 'G':
          e.preventDefault()
          setShowPageInput(true)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, numPages, pageNumber, isFullscreen, showSidePanel, showPageInput, showAdOverlay])

  useEffect(() => {
    if (showPageInput && pageInputRef.current) {
      pageInputRef.current.focus()
    }
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

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(docData.file_path)
      setPdfUrl(urlData.publicUrl)

      // 시리즈 정보 로딩
      loadSeriesInfo(documentId)
    } catch (err) {
      console.error('Error loading document:', err)
      alert('문서를 불러오는데 실패했습니다.')
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
          title: titleMap.get(d.document_id) || '알 수 없는 문서',
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

  // 밝기 + 테마 CSS 필터 (리플로우 모드에서는 적용하지 않음)
  const viewerFilterStyle: React.CSSProperties = viewMode === 'reflow' ? {} : {
    filter: [
      brightness !== 100 ? `brightness(${brightness / 100})` : '',
      bgTheme === 'sepia' ? 'sepia(0.35) saturate(1.2)' : '',
      bgTheme === 'dark' ? 'brightness(0.85) contrast(1.1)' : '',
    ].filter(Boolean).join(' ') || 'none',
  }

  const viewerBgColor = viewMode === 'reflow' ? 'transparent' : BG_THEMES[bgTheme].bgColor

  // 비로그인 사용자 차단
  if (!user && !loading && !authLoading) {
    router.push('/login')
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1a13]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8fbba5]">문서를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={viewerRef} className="h-screen w-screen bg-[#0b1a13] flex flex-col overflow-hidden select-none">

      {/* ━━━ 광고 오버레이 ━━━ */}
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

      {/* ━━━ 배경/밝기 팝업 (PDF 모드에서만) ━━━ */}
      {showThemePopup && viewMode !== 'reflow' && (
        <div ref={themePopupRef} className="fixed top-[62px] left-1/2 -translate-x-1/2 w-56 bg-[#0f2419] border border-[#1c3d2e] rounded-xl shadow-2xl p-4 z-[9999]">
          <p className="text-xs text-[#6b9b84] mb-2 font-medium">배경 테마</p>
          <div className="flex gap-2 mb-4">
            {(Object.keys(BG_THEMES) as BgTheme[]).map((key) => (
              <button
                key={key}
                onClick={() => setBgTheme(key)}
                className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all ${
                  bgTheme === key
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-[#1c3d2e] hover:border-[#2a5440]'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full border border-[#1c3d2e] shadow-inner"
                  style={{ backgroundColor: BG_THEMES[key].previewColor }}
                />
                <span className="text-[10px] text-[#8fbba5]">{BG_THEMES[key].label}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-[#6b9b84] mb-2 font-medium">밝기 {brightness}%</p>
          <input
            type="range"
            min={30}
            max={150}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full h-1.5 bg-[#153024] rounded-full appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-[#6b9b84] mt-1">
            <span>어둡게</span>
            <button onClick={() => setBrightness(100)} className="hover:text-white transition-colors">초기화</button>
            <span>밝게</span>
          </div>
        </div>
      )}

      {/* ━━━ 상단 오버레이: 컨트롤바 OR 배너 광고 ━━━ */}
      {showControls ? (
        <div className="absolute top-0 left-0 right-0 z-50">
        <div className="h-1 bg-[#153024] w-full">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-[#0f2419] border-b border-[#1c3d2e] px-2 sm:px-3 py-1.5 overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-2">

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => router.push('/')}
                className="p-1.5 rounded-lg hover:bg-[#153024] text-[#8fbba5] hover:text-white transition-colors"
                title="홈으로"
              >
                <Home className="w-5 h-5" />
              </button>
              <div className="hidden lg:block max-w-[180px]">
                <h1 className="text-sm font-medium text-white truncate">{document?.title}</h1>
                {seriesInfo && (
                  <p className="text-[10px] text-[#8fbba5] truncate">📚 {seriesInfo.seriesTitle} ({seriesInfo.currentPosition}/{seriesInfo.totalDocs})</p>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5">
              {/* ━━━ 뷰 모드 버튼 (리플로우 추가) ━━━ */}
              <div className="flex items-center bg-[#153024] rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('page')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'page' ? 'bg-blue-600 text-white' : 'text-[#8fbba5] hover:text-white'}`}
                  title="페이지 모드"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('book')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'book' ? 'bg-blue-600 text-white' : 'text-[#8fbba5] hover:text-white'}`}
                  title="책 모드 (2페이지)"
                >
                  <BookOpenCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('scroll')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'scroll' ? 'bg-blue-600 text-white' : 'text-[#8fbba5] hover:text-white'}`}
                  title="스크롤 모드"
                >
                  <ScrollText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('reflow')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'reflow' ? 'bg-blue-600 text-white' : 'text-[#8fbba5] hover:text-white'}`}
                  title="리플로우 모드"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
              </div>

              {/* ━━━ PDF 전용 컨트롤 (리플로우에서 숨김) ━━━ */}
              {viewMode !== 'reflow' && (
                <>
                  <div className="w-px h-4 bg-[#1c3d2e]" />

                  <button onClick={goToPrevPage} disabled={pageNumber <= 1}
                    className="p-1.5 rounded-lg hover:bg-[#153024] text-[#8fbba5] hover:text-white disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {showPageInput ? (
                    <form onSubmit={(e) => { e.preventDefault(); const p = parseInt(pageInputValue); if (!isNaN(p)) goToPage(p) }} className="flex items-center">
                      <input ref={pageInputRef} type="number" min={1} max={numPages} value={pageInputValue}
                        onChange={(e) => setPageInputValue(e.target.value)}
                        onBlur={() => { setShowPageInput(false); setPageInputValue('') }}
                        className="w-12 px-1 py-0.5 bg-[#153024] border border-[#1c3d2e] rounded text-sm text-white text-center focus:outline-none focus:border-blue-500"
                        placeholder={String(pageNumber)} />
                      <span className="text-[#6b9b84] text-xs mx-0.5">/</span>
                      <span className="text-[#8fbba5] text-xs">{numPages}</span>
                    </form>
                  ) : (
                    <button onClick={() => setShowPageInput(true)} className="px-2 py-0.5 rounded-lg hover:bg-[#153024] transition-colors text-sm" title="페이지 직접 이동 (G키)">
                      <span className="text-white font-medium">{pageNumber}</span>
                      <span className="text-[#6b9b84] mx-0.5">/</span>
                      <span className="text-[#8fbba5]">{numPages}</span>
                    </button>
                  )}

                  <button onClick={goToNextPage} disabled={pageNumber >= numPages}
                    className="p-1.5 rounded-lg hover:bg-[#153024] text-[#8fbba5] hover:text-white disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="w-px h-4 bg-[#1c3d2e]" />

                  <div className="flex items-center gap-0.5">
                    <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-[#153024] text-[#8fbba5] hover:text-white transition-colors">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={resetZoom} className="px-1.5 py-0.5 rounded-lg hover:bg-[#153024] text-[#8fbba5] hover:text-white transition-colors text-xs font-mono">
                      {Math.round(scale * 100)}%
                    </button>
                    <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-[#153024] text-[#8fbba5] hover:text-white transition-colors">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ━━━ 배경/밝기 버튼 ━━━ */}
                  <div className="w-px h-4 bg-[#1c3d2e]" />
                  <div className="relative">
                    <button
                      onClick={() => setShowThemePopup(!showThemePopup)}
                      className={`p-1.5 rounded-lg transition-colors ${showThemePopup ? 'bg-blue-600 text-white' : 'text-[#8fbba5] hover:text-white hover:bg-[#153024]'}`}
                      title="배경 & 밝기"
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {!isPremium && (
              <div className="hidden md:flex items-center flex-shrink-0">
                <div className="h-[50px] w-[200px] lg:w-[300px] overflow-hidden rounded opacity-70 hover:opacity-100 transition-opacity">
                  <AdBanner position="bottom" documentId={documentId} authorId={document?.author_id} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={toggleBookmark}
                className={`p-2 rounded-lg transition-colors ${isCurrentPageBookmarked ? 'text-amber-400 hover:text-amber-300' : 'text-[#8fbba5] hover:text-white'} hover:bg-[#153024]`}
                title={isCurrentPageBookmarked ? '북마크 제거' : '이 페이지 북마크'}
              >
                <Bookmark className="w-5 h-5" fill={isCurrentPageBookmarked ? 'currentColor' : 'none'} />
              </button>
              <ReadingListButton documentId={documentId} compact />
              <ShareButton documentId={documentId} title={document?.title || ''} />
              <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-[#153024] text-[#8fbba5] hover:text-white transition-colors" title="전체화면 (F키)">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
              <button onClick={() => setShowSidePanel(!showSidePanel)}
                className={`p-2 rounded-lg transition-colors ${showSidePanel ? 'bg-blue-600 text-white' : 'hover:bg-[#153024] text-[#8fbba5] hover:text-white'}`}
                title="댓글/정보 패널">
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        </div>
      ) : !isPremium ? (
        <div className="absolute top-0 left-0 right-0 z-50 bg-[#0f2419]/90 backdrop-blur-sm border-b border-[#1c3d2e] px-2 py-1 flex items-center justify-center cursor-pointer"
          onClick={() => resetControlsTimer()}>
          <div className="h-[50px] w-full max-w-[728px] overflow-hidden rounded opacity-90">
            <AdBanner position="top" documentId={documentId} authorId={document?.author_id} />
          </div>
        </div>
      ) : null}

      {/* ━━━ 메인 컨텐츠 ━━━ */}
      <div className="flex flex-1 overflow-hidden pt-[58px]">
        <div className={`flex-1 flex flex-col transition-all duration-300 ${showSidePanel ? 'sm:mr-[380px]' : ''}`}>
          <div
            className="flex-1 overflow-hidden transition-[filter,background-color] duration-300"
            style={{ backgroundColor: viewerBgColor, ...viewerFilterStyle }}
          >
            {viewMode === 'reflow' ? (
              pdfUrl && <ReflowViewer pdfUrl={pdfUrl} pageNumber={pageNumber} onPageChange={handlePageChange} onDocumentLoad={handleDocumentLoad} />
            ) : (
              pdfUrl && (
                <PDFViewer pdfUrl={pdfUrl} pageNumber={pageNumber} scale={scale} viewMode={viewMode}
                  showSidePanel={showSidePanel} onPageChange={handlePageChange} onDocumentLoad={handleDocumentLoad} onScaleChange={handleScaleChange} />
              )
            )}
          </div>
        </div>

        {/* ━━━ 사이드 패널 ━━━ */}
        <div className={`fixed right-0 top-0 bottom-0 z-40 bg-[#0f2419] border-l border-[#1c3d2e]
          transition-all duration-300 ease-in-out flex flex-col
          ${showSidePanel ? 'translate-x-0' : 'translate-x-full'} w-full sm:w-[380px]`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c3d2e]">
            <h2 className="text-white font-medium">정보 & 댓글</h2>
            <button onClick={() => setShowSidePanel(false)} className="p-1.5 rounded-lg hover:bg-[#153024] text-[#8fbba5] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-[#1c3d2e]">
              <h3 className="text-white font-semibold text-lg mb-1">{document?.title}</h3>
              {document?.description && <p className="text-[#8fbba5] text-sm mb-3">{document.description}</p>}
              <div className="flex items-center gap-2 text-xs text-[#6b9b84]">
                <span>조회수 {document?.view_count.toLocaleString()}회</span>
                <span>·</span>
                <span>읽기 시간: {Math.floor(totalTime / 60)}분 {totalTime % 60}초</span>
              </div>
            </div>

            {/* ━━━ 시리즈 정보 ━━━ */}
            {seriesInfo && (
              <div className="p-4 border-b border-[#1c3d2e]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">📚</span>
                  <div>
                    <p className="text-white font-medium text-sm">{seriesInfo.seriesTitle}</p>
                    <p className="text-[#8fbba5] text-xs">{seriesInfo.currentPosition} / {seriesInfo.totalDocs}편</p>
                  </div>
                </div>

                <div className="space-y-1 mb-3 max-h-[200px] overflow-y-auto">
                  {seriesInfo.docs.map((doc, i) => (
                    <div
                      key={doc.documentId}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        doc.documentId === documentId
                          ? 'bg-blue-600/20 text-blue-400 font-medium'
                          : 'text-[#8fbba5] hover:bg-[#153024] hover:text-gray-200 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (doc.documentId !== documentId) router.push(`/read/${doc.documentId}`)
                      }}
                    >
                      <span className="w-5 text-center flex-shrink-0">{i + 1}</span>
                      <span className="truncate">{doc.title}</span>
                      {doc.documentId === documentId && (
                        <span className="ml-auto text-[10px] bg-blue-600/30 px-1.5 py-0.5 rounded">현재</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {seriesInfo.prevDocId && (
                    <button
                      onClick={() => router.push(`/read/${seriesInfo.prevDocId}`)}
                      className="flex-1 px-3 py-2 bg-[#153024] hover:bg-[#1c3d2e] rounded-lg text-xs text-gray-300 transition-colors text-center"
                    >
                      ← 이전편
                    </button>
                  )}
                  {seriesInfo.nextDocId && (
                    <button
                      onClick={() => router.push(`/read/${seriesInfo.nextDocId}`)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs text-white transition-colors text-center"
                    >
                      다음편 →
                    </button>
                  )}
                </div>
              </div>
            )}

            {authorProfile && (
              <div className="p-4 border-b border-[#1c3d2e]">
                <div className="flex items-center justify-between">
                  <Link href={`/profile/${authorProfile.id}`}>
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                      {authorProfile.avatar_url ? (
                        <Image src={authorProfile.avatar_url} alt={authorProfile.username || ''} width={40} height={40} className="rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {(authorProfile.username || authorProfile.email)[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium text-sm">{authorProfile.username || authorProfile.email}</p>
                        <p className="text-[#6b9b84] text-xs">구독자 {authorProfile.subscribers_count.toLocaleString()}명</p>
                      </div>
                    </div>
                  </Link>
                  <SubscribeButton authorId={authorProfile.id} authorName={authorProfile.username || authorProfile.email} initialSubscribersCount={authorProfile.subscribers_count} />
                </div>
              </div>
            )}

            <div className="p-4 border-b border-[#1c3d2e]">
              <div className="flex items-center gap-3">
                <ReactionButtons documentId={documentId} initialLikes={document?.likes_count || 0} initialDislikes={document?.dislikes_count || 0} />
                <ReadingListButton documentId={documentId} />
              </div>
            </div>

            {/* ━━━ 북마크 목록 ━━━ */}
            {bookmarks.length > 0 && (
              <div className="p-4 border-b border-[#1c3d2e]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium text-sm flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-amber-400" fill="currentColor" />
                    북마크 ({bookmarks.length})
                  </h3>
                </div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                        bm.page_number === pageNumber
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'text-[#8fbba5] hover:bg-[#153024] hover:text-white'
                      }`}
                      onClick={() => setPageNumber(bm.page_number)}
                    >
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-3.5 h-3.5 flex-shrink-0" fill={bm.page_number === pageNumber ? 'currentColor' : 'none'} />
                        <span>{bm.page_number}페이지</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#6b9b84]">{new Date(bm.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteBookmark(bm.id) }}
                          className="p-1 rounded hover:bg-red-500/20 text-[#6b9b84] hover:text-red-400 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-b border-[#1c3d2e]">
              <CommentsSection documentId={documentId} />
            </div>

            {!isPremium && (
              <div className="p-4">
                <AdBanner position="sidebar" documentId={documentId} authorId={document?.author_id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
