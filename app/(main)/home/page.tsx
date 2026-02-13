'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Eye, ThumbsUp, ChevronRight, ChevronLeft, BookOpen, Users, TrendingUp, Sparkles, Heart } from 'lucide-react'
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
  const [favSet, setFavSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAllSections()
  }, [user])

  const loadAllSections = async () => {
    try {
      if (user) {
        const { data: favData } = await supabase
          .from('reading_list')
          .select('document_id')
          .eq('user_id', user.id)
        if (favData) setFavSet(new Set(favData.map(f => f.document_id)))
      }

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
          const scoreA = (a.likes_count * 3) + (a.view_count * 1) + Math.max(0, 7 - ((now - new Date(a.created_at).getTime()) / (24*60*60*1000))) * 5
          const scoreB = (b.likes_count * 3) + (b.view_count * 1) + Math.max(0, 7 - ((now - new Date(b.created_at).getTime()) / (24*60*60*1000))) * 5
          return scoreB - scoreA
        })
        setPopularDocs(sorted.slice(0, 12))
      }

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

  const toggleFav = async (e: React.MouseEvent, docId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    try {
      if (favSet.has(docId)) {
        await supabase.from('reading_list').delete().eq('user_id', user.id).eq('document_id', docId)
        setFavSet(prev => { const n = new Set(prev); n.delete(docId); return n })
      } else {
        await supabase.from('reading_list').insert({ user_id: user.id, document_id: docId })
        setFavSet(prev => new Set(prev).add(docId))
      }
    } catch (err) {
      console.error('Fav toggle error:', err)
    }
  }

  const DocumentCard = ({ doc }: { doc: DocWithAuthor }) => {
    const isFav = favSet.has(doc.id)
    return (
      <Link href={`/read/${doc.id}`} className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
        <div className="group cursor-pointer">
          <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-xl overflow-hidden mb-2">
            {doc.thumbnail_url ? (
              <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-5xl opacity-20">📄</div>
              </div>
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-end justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity p-3 w-full">
                <p className="text-white text-[11px] leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {doc.description || '설명이 없습니다'}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => toggleFav(e, doc.id)}
              className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-all
                ${isFav ? 'bg-red-500 text-white opacity-100' : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70'}`}
              title={isFav ? '찜 해제' : '찜하기'}
            >
              <Heart className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} />
            </button>

            <div className="absolute top-2 left-2">
              <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm">
                {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
              </span>
            </div>

          </div>

          <div>
            <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">
              {doc.title}
            </h3>

            {doc.profiles && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1">
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
  }

  const ScrollableSection = ({
    title,
    icon: Icon,
    docs,
    emptyMessage,
  }: {
    title: string
    icon: any
    docs: DocWithAuthor[]
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
        <div className="flex items-center justify-between mb-4 px-2 md:px-4">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          </div>
        </div>

        <div className="relative group/section">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-gray-800 shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-gray-800 shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-2 md:px-4"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    )
  }

  const hasAnyContent = continueReading.length > 0 || subscribedDocs.length > 0 || popularDocs.length > 0 || recentDocs.length > 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          {!hasAnyContent ? (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400 mb-4">추천할 문서가 없습니다</p>
              <Link href="/browse" className="text-blue-600 hover:underline">문서 둘러보기</Link>
            </div>
          ) : (
            <>
              <ScrollableSection title="인기 있는 콘텐츠" icon={TrendingUp} docs={popularDocs} />
              <ScrollableSection title="가장 최근 콘텐츠" icon={Sparkles} docs={recentDocs} />
              <ScrollableSection title="구독자의 새 콘텐츠" icon={Users} docs={subscribedDocs} />
              <ScrollableSection title="읽고 있는 콘텐츠" icon={BookOpen} docs={continueReading} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
