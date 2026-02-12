'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Eye, ThumbsUp, Play, ChevronRight, ChevronLeft, BookOpen, Users, TrendingUp, Sparkles } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'

type DocWithAuthor = Document & { profiles?: { username: string | null; email: string; avatar_url: string | null } }

export default function HomePage() {
  const { user } = useAuth()
  const [continueReading, setContinueReading] = useState<DocWithAuthor[]>([])
  const [subscribedDocs, setSubscribedDocs] = useState<DocWithAuthor[]>([])
  const [popularDocs, setPopularDocs] = useState<DocWithAuthor[]>([])
  const [recentDocs, setRecentDocs] = useState<DocWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllSections()
  }, [user])

  const loadAllSections = async () => {
    try {
      // 1. 이어 읽기 (로그인 시)
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

        // 2. 구독 작가의 새 문서
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

      // 3. 인기 문서
      const { data: popular } = await supabase
        .from('documents')
        .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(12)
      if (popular) setPopularDocs(popular)

      // 4. 최신 문서
      const { data: recent } = await supabase
        .from('documents')
        .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(12)
      if (recent) setRecentDocs(recent)

    } catch (err) {
      console.error('Error loading home:', err)
    } finally {
      setLoading(false)
    }
  }

  const DocumentCard = ({ doc }: { doc: DocWithAuthor }) => (
    <Link href={`/read/${doc.id}`} className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
      <div className="group cursor-pointer">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-2">
          {doc.thumbnail_url ? (
            <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-5xl opacity-20">📄</div>
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
              </div>
            </div>
          </div>

          <div className="absolute top-2 left-2">
            <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm">
              {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
            </span>
          </div>

          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm">
            {Math.floor(doc.total_reading_time / 60)}분
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {doc.title}
          </h3>

          {doc.profiles && (
            <p className="text-[11px] text-gray-500 truncate mb-1">
              {doc.profiles.username || doc.profiles.email}
            </p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {doc.view_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5">
              <ThumbsUp className="w-3 h-3" />
              {doc.likes_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )

  const ScrollableSection = ({
    title,
    icon: Icon,
    docs,
    linkHref,
    linkLabel,
    emptyMessage,
  }: {
    title: string
    icon: any
    docs: DocWithAuthor[]
    linkHref?: string
    linkLabel?: string
    emptyMessage?: string
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const checkScroll = () => {
      const el = scrollRef.current
      if (!el) return
      setCanScrollLeft(el.scrollLeft > 10)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
    }

    useEffect(() => {
      checkScroll()
      const el = scrollRef.current
      el?.addEventListener('scroll', checkScroll)
      return () => el?.removeEventListener('scroll', checkScroll)
    }, [docs])

    const scroll = (dir: 'left' | 'right') => {
      scrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' })
    }

    if (docs.length === 0) return null

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg md:text-xl font-bold text-gray-900">{title}</h2>
          </div>
          {linkHref && (
            <Link href={linkHref} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              {linkLabel || '전체보기'} <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="relative group/section">
          {/* 좌측 스크롤 버튼 */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* 우측 스크롤 버튼 */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {docs.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  const hasAnyContent = continueReading.length > 0 || subscribedDocs.length > 0 || popularDocs.length > 0 || recentDocs.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          {!hasAnyContent ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">추천할 문서가 없습니다</p>
              <Link href="/browse" className="text-blue-600 hover:underline">문서 둘러보기</Link>
            </div>
          ) : (
            <>
              {/* 이어 읽기 */}
              <ScrollableSection
                title="이어 읽기"
                icon={BookOpen}
                docs={continueReading}
                linkHref="/reading-list"
                linkLabel="읽기 목록"
              />

              {/* 구독 작가의 새 문서 */}
              <ScrollableSection
                title="구독 작가의 새 문서"
                icon={Users}
                docs={subscribedDocs}
              />

              {/* 인기 문서 */}
              <ScrollableSection
                title="인기 문서"
                icon={TrendingUp}
                docs={popularDocs}
                linkHref="/browse?sort=popular"
                linkLabel="더보기"
              />

              {/* 최신 문서 */}
              <ScrollableSection
                title="최신 문서"
                icon={Sparkles}
                docs={recentDocs}
                linkHref="/browse?sort=recent"
                linkLabel="더보기"
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
