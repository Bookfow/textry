'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { BookOpen, Users, TrendingUp, Sparkles, Crown, ChevronRight, ChevronLeft, Clock, BarChart3, Eye, FileText } from 'lucide-react'
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
            <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2D2016] via-[#3A2A1E] to-[#4A3628] dark:from-[#1A1410] dark:via-[#241E18] dark:to-[#2E2620] border border-[#5C4A38]/30 shadow-lg">
              {/* 배경 장식 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#B2967D]/15 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#E6BEAE]/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />
              
              <div className="relative p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#B2967D]/20 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-[#C4A882]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#EEE4E1]">이번 주 Textry에서는</p>
                    <p className="text-[10px] text-[#9C8B7A]">지난 7일간의 활동</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5">
                    <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#EEE4E1] tracking-tight">
                      {communityStats.weeklyHours > 0 ? communityStats.weeklyHours.toLocaleString() : '<1'}
                    </p>
                    <p className="text-[11px] text-[#9C8B7A] mt-1 font-medium">시간 읽힘</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#EEE4E1] tracking-tight">
                      {communityStats.totalReaders.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-[#9C8B7A] mt-1 font-medium">명의 독자</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5">
                    <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#EEE4E1] tracking-tight">
                      {communityStats.totalDocs.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-[#9C8B7A] mt-1 font-medium">편의 작품</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5">
                    <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center mx-auto mb-2">
                      <Eye className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#EEE4E1] tracking-tight">
                      {communityStats.totalViews.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-[#9C8B7A] mt-1 font-medium">총 조회수</p>
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
