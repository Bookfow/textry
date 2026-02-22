'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { BookOpen, Users, TrendingUp, Sparkles, Crown, ChevronRight, ChevronLeft, Clock, BarChart3, Eye, FileText, Flame } from 'lucide-react'
import { DocumentCard } from '@/components/document-card'
import { PageAdBanner } from '@/components/page-ad-banner'
import { CATEGORIES } from '@/lib/categories'

type DocWithAuthor = Document & { profiles?: { username: string | null; email: string; avatar_url: string | null } }

export default function HomePage() {
  const { user } = useAuth()
  const [continueReading, setContinueReading] = useState<DocWithAuthor[]>([])
  const [subscribedDocs, setSubscribedDocs] = useState<DocWithAuthor[]>([])
  const [popularDocs, setPopularDocs] = useState<DocWithAuthor[]>([])
  const [recentDocs, setRecentDocs] = useState<DocWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionContinue, setSessionContinue] = useState<DocWithAuthor[]>([])
  const [communityStats, setCommunityStats] = useState<{ weeklyHours: number; totalDocs: number; totalViews: number; totalReaders: number } | null>(null)
  const [weeklyHot, setWeeklyHot] = useState<(DocWithAuthor & { readMinutes: number })[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    loadAllSections()
  }, [user])

  const loadAllSections = async () => {
    try {
      if (user) {
        const { data: progress } = await supabase
          .from('reading_progress')
          .select('document_id, progress, updated_at')
          .eq('user_id', user.id)
          .lt('progress', 100)
          .gt('progress', 0)
          .order('updated_at', { ascending: false })
          .limit(10)

        if (progress && progress.length > 0) {
          const { data: docs } = await supabase
            .from('documents')
            .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
            .in('id', progress.map(r => r.document_id))
            .eq('is_published', true)

          if (docs) {
            const ordered = progress
              .map(p => docs.find(d => d.id === p.document_id))
              .filter(Boolean) as DocWithAuthor[]
            setContinueReading(ordered)
          }
        }

        const { data: subs } = await supabase
          .from('subscriptions')
          .select('author_id')
          .eq('subscriber_id', user.id)

        if (subs && subs.length > 0) {
          const { data: docs } = await supabase
            .from('documents')
            .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
            .in('author_id', subs.map(s => s.author_id))
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(12)

          if (docs) setSubscribedDocs(docs)
        }
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: popular } = await supabase
        .from('documents')
        .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
        .eq('is_published', true)
        .gte('created_at', sevenDaysAgo)
      if (popular) {
        const now = Date.now()
        const sorted = popular.sort((a: any, b: any) => {
          const scoreA = (a.likes_count * 5) + (a.view_count * 2) + Math.max(0, 7 - ((now - new Date(a.created_at).getTime()) / (24*60*60*1000))) * 1
          const scoreB = (b.likes_count * 5) + (b.view_count * 2) + Math.max(0, 7 - ((now - new Date(b.created_at).getTime()) / (24*60*60*1000))) * 1
          return scoreB - scoreA
        })
        setPopularDocs(sorted.slice(0, 12))
      }

      const { data: recent } = await supabase
        .from('documents')
        .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(24)
      if (recent) setRecentDocs(recent)

      // ━━━ reading_sessions 기반 이어서 읽을 콘텐츠 ━━━
      if (user) {
        const { data: sessions } = await supabase
          .from('reading_sessions')
          .select('document_id, current_page, last_read_at')
          .eq('reader_id', user.id)
          .order('last_read_at', { ascending: false })
          .limit(30)

        if (sessions && sessions.length > 0) {
          // 문서별 가장 최근 세션만 유지
          const latestByDoc = new Map<string, { document_id: string; current_page: number; last_read_at: string }>()
          for (const s of sessions) {
            if (!latestByDoc.has(s.document_id)) latestByDoc.set(s.document_id, s)
          }

          const docIds = [...latestByDoc.keys()]
          const { data: sessionDocs } = await supabase
            .from('documents')
            .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
            .in('id', docIds)
            .eq('is_published', true)

          if (sessionDocs) {
            // 완독(current_page >= page_count) 제외, 최근 읽은 순 정렬
            const incomplete = docIds
              .map(id => {
                const doc = sessionDocs.find(d => d.id === id)
                const session = latestByDoc.get(id)
                if (!doc || !session) return null
                if (doc.page_count && session.current_page >= doc.page_count) return null
                if (session.current_page <= 1) return null
                return doc
              })
              .filter(Boolean) as DocWithAuthor[]
            setSessionContinue(incomplete.slice(0, 12))
          }
        }
      }

    // ━━━ 이번 주 읽기 시간 기반 인기 ━━━
      try {
        const weekAgo2 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: weekSes } = await supabase
          .from('reading_sessions')
          .select('document_id, reading_time')
          .gte('last_read_at', weekAgo2)

        if (weekSes && weekSes.length > 0) {
          // 문서별 읽기 시간 합산
          const timeByDoc = new Map<string, number>()
          for (const s of weekSes) {
            if (!s.document_id) continue
            timeByDoc.set(s.document_id, (timeByDoc.get(s.document_id) || 0) + (s.reading_time || 0))
          }

          // 상위 5개
          const sorted = [...timeByDoc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
          const topDocIds = sorted.map(s => s[0])

          if (topDocIds.length > 0) {
            const { data: hotDocs } = await supabase
              .from('documents')
              .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
              .in('id', topDocIds)
              .eq('is_published', true)

            if (hotDocs) {
              const result = topDocIds
                .map(id => {
                  const doc = hotDocs.find(d => d.id === id)
                  if (!doc) return null
                  return { ...doc, readMinutes: Math.round((timeByDoc.get(id) || 0) / 60) }
                })
                .filter(Boolean) as (DocWithAuthor & { readMinutes: number })[]
              setWeeklyHot(result)
            }
          }
        }
      } catch {}

      // ━━━ 커뮤니티 통계 ━━━
      try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        
        // 이번 주 총 읽기 시간
        const { data: weekSessions } = await supabase
          .from('reading_sessions')
          .select('reading_time')
          .gte('last_read_at', weekAgo)
        const weeklySeconds = weekSessions?.reduce((sum, s) => sum + (s.reading_time || 0), 0) || 0
        const weeklyHours = Math.round(weeklySeconds / 3600)

        // 전체 문서 수
        const { count: docCount } = await supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('is_published', true)

        // 전체 조회수 합산
        const { data: allDocs } = await supabase
          .from('documents')
          .select('view_count')
          .eq('is_published', true)
        const totalViews = allDocs?.reduce((sum, d) => sum + (d.view_count || 0), 0) || 0

        // 이번 주 독자 수
        const { data: weekReaders } = await supabase
          .from('reading_sessions')
          .select('reader_id')
          .gte('last_read_at', weekAgo)
        const uniqueReaders = new Set(weekReaders?.map(r => r.reader_id).filter(Boolean) || []).size

        setCommunityStats({
          weeklyHours,
          totalDocs: docCount || 0,
          totalViews,
          totalReaders: uniqueReaders,
        })
      } catch {}

    } catch (err) {
      console.error('Error loading home:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterByCategory = (docs: DocWithAuthor[]) => {
    if (activeCategory === 'all') return docs
    return docs.filter(d => d.category === activeCategory)
  }

  const filteredRecent = filterByCategory(recentDocs)
  const filteredPopular = filterByCategory(popularDocs)

  // ━━━ 랭킹 섹션 ━━━
  const RankingSection = ({ docs }: { docs: DocWithAuthor[] }) => {
    const top5 = docs.slice(0, 5)
    if (top5.length === 0) return null

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg md:text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">실시간 랭킹</h2>
            <span className="text-xs text-[#9C8B7A] ml-1">최근 7일</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {top5.map((doc, index) => (
            <Link key={doc.id} href={`/document/${doc.id}`}>
              <div className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] hover:shadow-md hover:border-[#B2967D]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                <span className={`text-2xl font-black flex-shrink-0 w-8 text-center ${
                  index === 0 ? 'text-amber-500' :
                  index === 1 ? 'text-[#9C8B7A]' :
                  index === 2 ? 'text-[#B2967D]' :
                  'text-[#E7D8C9] dark:text-[#3A302A]'
                }`}>
                  {index + 1}
                </span>
                <div className="relative w-10 h-14 rounded-md overflow-hidden flex-shrink-0 bg-[#EEE4E1] dark:bg-[#2E2620]">
                  {doc.thumbnail_url ? (
                    <img src={doc.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg opacity-30">📄</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#2D2016] dark:text-[#EEE4E1] line-clamp-1 group-hover:text-[#B2967D] transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-[11px] text-[#9C8B7A] truncate">
                    {doc.author_name || doc.profiles?.username || doc.profiles?.email || ''}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[#9C8B7A] mt-0.5">
                    <span>👁 {doc.view_count.toLocaleString()}</span>
                    <span>👍 {doc.likes_count.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // ━━━ 캐러셀 섹션 ━━━
  const CarouselSection = ({
    title,
    icon: Icon,
    docs,
    showMore,
  }: {
    title: string
    icon: any
    docs: DocWithAuthor[]
    showMore?: string
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    if (docs.length === 0) return null

    const checkScroll = () => {
      const el = scrollRef.current
      if (!el) return
      setCanScrollLeft(el.scrollLeft > 4)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    }

    const scroll = (dir: 'left' | 'right') => {
      const el = scrollRef.current
      if (!el) return
      const cardWidth = el.querySelector('div')?.offsetWidth || 180
      const amount = cardWidth * 3
      el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
    }

    useEffect(() => {
      const el = scrollRef.current
      if (!el) return
      checkScroll()
      el.addEventListener('scroll', checkScroll, { passive: true })
      window.addEventListener('resize', checkScroll)
      return () => {
        el.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }, [docs])

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-[#B2967D]" />
            <h2 className="text-lg md:text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* 데스크톱 화살표 */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="p-1.5 rounded-full bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] text-[#9C8B7A] hover:text-[#B2967D] hover:border-[#B2967D] disabled:opacity-30 disabled:hover:text-[#9C8B7A] disabled:hover:border-[#E7D8C9] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="p-1.5 rounded-full bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] text-[#9C8B7A] hover:text-[#B2967D] hover:border-[#B2967D] disabled:opacity-30 disabled:hover:text-[#9C8B7A] disabled:hover:border-[#E7D8C9] transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {showMore && (
              <Link href={showMore} className="flex items-center gap-1 text-sm text-[#B2967D] hover:text-[#a67c52] transition-colors">
                더보기 <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* 가로 스크롤 캐러셀 */}
        <div className="relative -mx-4 px-4">
          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          >
            {(() => {
              const adPositions = new Set<number>()
              let pos = 5, gap = 8
              while (pos < docs.length) { adPositions.add(pos); pos += gap; gap += 2 }
              return docs.map((doc, idx) => (
                <React.Fragment key={doc.id}>
                  <div className="flex-shrink-0 w-[155px] sm:w-[170px] md:w-[200px] lg:w-[210px] xl:w-[220px]">
                    <DocumentCard
                      doc={doc}
                      authorName={doc.author_name || doc.profiles?.username || doc.profiles?.email}
                      variant="grid"
                    />
                  </div>
                  {adPositions.has(idx) && <PageAdBanner position="home_feed" variant="card" />}
                </React.Fragment>
              ))
            })()}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#9C8B7A]">로딩 중...</p>
        </div>
      </div>
    )
  }

  const hasAnyContent = continueReading.length > 0 || sessionContinue.length > 0 || subscribedDocs.length > 0 || popularDocs.length > 0 || recentDocs.length > 0

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">

          {/* ━━━ 커뮤니티 읽기 통계 ━━━ */}
          {communityStats && (
            <div className="mb-6 relative overflow-hidden rounded-2xl shadow-xl">
              {/* 메인 배경 — 깊은 그라데이션 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a0f08] via-[#2D1B0E] to-[#1a1520]" />
              
              {/* 글로우 오브 장식 */}
              <div className="absolute top-[-40%] right-[-10%] w-[300px] h-[300px] bg-amber-500/20 rounded-full blur-[80px]" />
              <div className="absolute bottom-[-30%] left-[-5%] w-[250px] h-[250px] bg-purple-600/15 rounded-full blur-[70px]" />
              <div className="absolute top-[20%] left-[40%] w-[200px] h-[200px] bg-emerald-500/10 rounded-full blur-[60px]" />
              
              {/* 미세한 패턴 오버레이 */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

              <div className="relative p-5 sm:p-7">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/20 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-900/20">
                      <BarChart3 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">이번 주 Textry에서는</p>
                      <p className="text-[11px] text-white/40">지난 7일간의 활동</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-white/50 font-medium">LIVE</span>
                  </div>
                </div>

                {/* 통계 카드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {/* 시간 읽힘 */}
                  <div className="group relative p-4 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] hover:border-amber-500/30 transition-all duration-300">
                    <div className="absolute inset-0 rounded-xl bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors duration-300" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center mb-3 shadow-inner">
                        <Clock className="w-5 h-5 text-amber-400" />
                      </div>
                      <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none">
                        {communityStats.weeklyHours > 0 ? communityStats.weeklyHours.toLocaleString() : '<1'}
                      </p>
                      <p className="text-[11px] text-white/40 mt-1.5 font-semibold uppercase tracking-wider">시간 읽힘</p>
                    </div>
                  </div>

                  {/* 독자 수 */}
                  <div className="group relative p-4 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-300">
                    <div className="absolute inset-0 rounded-xl bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors duration-300" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 flex items-center justify-center mb-3 shadow-inner">
                        <Users className="w-5 h-5 text-emerald-400" />
                      </div>
                      <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none">
                        {communityStats.totalReaders.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-white/40 mt-1.5 font-semibold uppercase tracking-wider">명의 독자</p>
                    </div>
                  </div>

                  {/* 작품 수 */}
                  <div className="group relative p-4 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] hover:border-blue-500/30 transition-all duration-300">
                    <div className="absolute inset-0 rounded-xl bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors duration-300" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-600/10 flex items-center justify-center mb-3 shadow-inner">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none">
                        {communityStats.totalDocs.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-white/40 mt-1.5 font-semibold uppercase tracking-wider">편의 작품</p>
                    </div>
                  </div>

                  {/* 총 조회수 */}
                  <div className="group relative p-4 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] hover:border-purple-500/30 transition-all duration-300">
                    <div className="absolute inset-0 rounded-xl bg-purple-500/0 group-hover:bg-purple-500/5 transition-colors duration-300" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400/20 to-purple-600/10 flex items-center justify-center mb-3 shadow-inner">
                        <Eye className="w-5 h-5 text-purple-400" />
                      </div>
                      <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none">
                        {communityStats.totalViews.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-white/40 mt-1.5 font-semibold uppercase tracking-wider">총 조회수</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ━━━ 카테고리 탭 ━━━ */}
          <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-center justify-center gap-2 pb-2 min-w-max">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === 'all'
                    ? 'bg-[#B2967D] text-white shadow-sm'
                    : 'bg-white dark:bg-[#241E18] text-[#5C4A38] dark:text-[#C4A882] border border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D] hover:text-[#B2967D]'
                }`}
              >
                전체
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeCategory === cat.value
                      ? 'bg-[#B2967D] text-white shadow-sm'
                      : 'bg-white dark:bg-[#241E18] text-[#5C4A38] dark:text-[#C4A882] border border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D] hover:text-[#B2967D]'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {!hasAnyContent ? (
            <div className="text-center py-20">
              <p className="text-[#9C8B7A] mb-4">추천할 문서가 없습니다</p>
              <Link href="/browse" className="text-[#B2967D] hover:underline">문서 둘러보기</Link>
            </div>
          ) : (
            <>
              {/* 이어 읽기 */}
              {continueReading.length > 0 && (
                <CarouselSection title="이어서 읽기" icon={BookOpen} docs={continueReading} />
              )}

              {/* 랭킹 */}
              <RankingSection docs={filteredPopular} />

              {/* ━━━ 이번 주 인기 (읽기 시간 기반) ━━━ */}
              {weeklyHot.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg md:text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">이번 주 가장 오래 읽힌</h2>
                    <span className="text-xs text-[#9C8B7A] ml-1">읽기 시간 기준</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {weeklyHot.map((doc, index) => (
                      <Link key={doc.id} href={`/document/${doc.id}`}>
                        <div className="group relative p-4 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                          style={{
                            background: index === 0
                              ? 'linear-gradient(135deg, #B2967D22, #E6BEAE33)'
                              : undefined
                          }}>
                          {/* 배경 */}
                          <div className={`absolute inset-0 rounded-xl border transition-colors ${
                            index === 0
                              ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/30'
                              : 'bg-white dark:bg-[#241E18] border-[#E7D8C9] dark:border-[#3A302A] group-hover:border-[#B2967D]/50'
                          }`} />

                          <div className="relative flex items-center gap-3">
                            {/* 순위 + 불꽃 */}
                            <div className="flex flex-col items-center flex-shrink-0 w-8">
                              {index === 0 ? (
                                <Flame className="w-6 h-6 text-orange-500 mb-0.5" />
                              ) : (
                                <span className={`text-xl font-black ${
                                  index === 1 ? 'text-orange-400/70' :
                                  index === 2 ? 'text-orange-300/60' :
                                  'text-[#E7D8C9] dark:text-[#3A302A]'
                                }`}>{index + 1}</span>
                              )}
                            </div>

                            {/* 썸네일 */}
                            <div className="relative w-11 h-15 rounded-lg overflow-hidden flex-shrink-0 bg-[#EEE4E1] dark:bg-[#2E2620] shadow-sm">
                              {doc.thumbnail_url ? (
                                <img src={doc.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg opacity-30">📄</div>
                              )}
                            </div>

                            {/* 정보 */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-[#2D2016] dark:text-[#EEE4E1] line-clamp-1 group-hover:text-[#B2967D] transition-colors">
                                {doc.title}
                              </h3>
                              <p className="text-[11px] text-[#9C8B7A] truncate">
                                {doc.author_name || doc.profiles?.username || doc.profiles?.email || ''}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  index === 0
                                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                                    : 'bg-[#B2967D]/10 text-[#B2967D]'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  {doc.readMinutes}분
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 피드 광고 배너 */}
              <div className="mb-10">
                <PageAdBanner position="home_feed" />
              </div>

              {/* 인기 콘텐츠 */}
              <CarouselSection title="인기 있는 콘텐츠" icon={TrendingUp} docs={filteredPopular} showMore="/browse?sort=popular" />

              {/* 최신 콘텐츠 */}
              <CarouselSection title="새로운 콘텐츠" icon={Sparkles} docs={filteredRecent} showMore="/browse?sort=recent" />

              {/* 이어서 읽을 콘텐츠 (reading_sessions 기반) */}
              {sessionContinue.length > 0 && (
                <CarouselSection title="이어서 읽을 콘텐츠" icon={Clock} docs={sessionContinue} showMore="/continue-reading" />
              )}

              {/* 구독자 콘텐츠 */}
              <CarouselSection title="구독 중인 새 콘텐츠" icon={Users} docs={filterByCategory(subscribedDocs)} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
