'use client'

import { useEffect, useState } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { BookOpen, Users, TrendingUp, Sparkles, ThumbsUp, Compass } from 'lucide-react'
import { DocumentCard } from '@/components/document-card'
import { HomeSkeleton } from '@/components/loading-skeleton'

type DocWithAuthor = Document & { profiles?: { username: string | null; email: string; avatar_url: string | null } }

export default function HomePage() {
  const { user } = useAuth()
  const [continueReading, setContinueReading] = useState<DocWithAuthor[]>([])
  const [subscribedDocs, setSubscribedDocs] = useState<DocWithAuthor[]>([])
  const [popularDocs, setPopularDocs] = useState<DocWithAuthor[]>([])
  const [recentDocs, setRecentDocs] = useState<DocWithAuthor[]>([])
  const [recommendedDocs, setRecommendedDocs] = useState<DocWithAuthor[]>([])
  const [alsoReadDocs, setAlsoReadDocs] = useState<DocWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

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

      // ── 개인화 추천 (로그인 사용자만) ──
      if (user) {
        // 1. 좋아할 만한 콘텐츠: 좋아요한 문서의 카테고리/작가 기반
        const { data: likedReactions } = await supabase
          .from('reactions')
          .select('document_id')
          .eq('user_id', user.id)
          .eq('type', 'like')
          .limit(20)

        const { data: readProgress } = await supabase
          .from('reading_progress')
          .select('document_id')
          .eq('user_id', user.id)
          .limit(30)

        const readDocIds = new Set([
          ...(likedReactions || []).map((r: any) => r.document_id),
          ...(readProgress || []).map((r: any) => r.document_id),
        ])

        if (readDocIds.size > 0) {
          // 읽은 문서들의 카테고리와 작가 파악
          const { data: readDocsInfo } = await supabase
            .from('documents')
            .select('category, author_id')
            .in('id', [...readDocIds])

          if (readDocsInfo && readDocsInfo.length > 0) {
            // 카테고리 빈도 계산
            const catCount: Record<string, number> = {}
            const authorIds = new Set<string>()
            readDocsInfo.forEach((d: any) => {
              if (d.category) catCount[d.category] = (catCount[d.category] || 0) + 1
              if (d.author_id) authorIds.add(d.author_id)
            })
            const topCategories = Object.entries(catCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([cat]) => cat)

            // 좋아할 만한 콘텐츠: 같은 카테고리 + 아직 안 읽은 문서
            if (topCategories.length > 0) {
              const { data: recommended } = await supabase
                .from('documents')
                .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
                .eq('is_published', true)
                .in('category', topCategories)
                .order('likes_count', { ascending: false })
                .limit(30)

              if (recommended) {
                const filtered = recommended.filter((d: any) => !readDocIds.has(d.id) && d.author_id !== user.id)
                setRecommendedDocs(filtered.slice(0, 12))
              }
            }

            // 2. 이 문서를 읽은 사람들이 본 문서
            // 내가 읽은 문서를 읽은 다른 사용자들 찾기
            const readDocArray = [...readDocIds].slice(0, 10)
            const { data: otherReaders } = await supabase
              .from('reading_progress')
              .select('user_id')
              .in('document_id', readDocArray)
              .neq('user_id', user.id)
              .limit(50)

            if (otherReaders && otherReaders.length > 0) {
              const otherUserIds = [...new Set(otherReaders.map((r: any) => r.user_id))].slice(0, 20)

              // 그 사람들이 읽은 다른 문서
              const { data: otherReadDocs } = await supabase
                .from('reading_progress')
                .select('document_id')
                .in('user_id', otherUserIds)
                .limit(100)

              if (otherReadDocs && otherReadDocs.length > 0) {
                // 빈도 기반 정렬 (많이 겹치는 문서 우선)
                const docFreq: Record<string, number> = {}
                otherReadDocs.forEach((r: any) => {
                  if (!readDocIds.has(r.document_id)) {
                    docFreq[r.document_id] = (docFreq[r.document_id] || 0) + 1
                  }
                })
                const topDocIds = Object.entries(docFreq)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([id]) => id)

                if (topDocIds.length > 0) {
                  const { data: alsoDocs } = await supabase
                    .from('documents')
                    .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
                    .in('id', topDocIds)
                    .eq('is_published', true)

                  if (alsoDocs) {
                    // 빈도순 정렬 유지
                    const sorted = topDocIds
                      .map(id => alsoDocs.find((d: any) => d.id === id))
                      .filter(Boolean) as DocWithAuthor[]
                    setAlsoReadDocs(sorted)
                  }
                }
              }
            }
          }
        }
      }

    } catch (err) {
      console.error('Error loading home:', err)
    } finally {
      setLoading(false)
    }
  }

  const ShelfSection = ({
    title,
    icon: Icon,
    docs,
  }: {
    title: string
    icon: any
    docs: DocWithAuthor[]
  }) => {
    if (docs.length === 0) return null

    return (
      <div className="mb-6">
        {/* 섹션 타이틀 */}
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>

        {/* 그리드 카드 */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {docs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              authorName={doc.profiles?.username || doc.profiles?.email}
              variant="grid"
            />
          ))}
        </div>

        {/* 선반 바닥 */}
        <div className="relative h-3 mt-2">
          <div className="absolute inset-x-0 top-0 h-[6px] bg-gradient-to-b from-amber-800/20 to-amber-900/10 dark:from-amber-600/15 dark:to-amber-700/8 rounded-sm" />
          <div className="absolute inset-x-0 top-[6px] h-[6px] bg-gradient-to-b from-amber-900/10 to-transparent dark:from-amber-600/8 dark:to-transparent" />
        </div>
      </div>
    )
  }

  if (loading) {
    return <HomeSkeleton />
  }

  const hasAnyContent = continueReading.length > 0 || subscribedDocs.length > 0 || popularDocs.length > 0 || recentDocs.length > 0 || recommendedDocs.length > 0 || alsoReadDocs.length > 0

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          {!hasAnyContent ? (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400 mb-4">추천할 문서가 없습니다</p>
              <Link href="/browse" className="text-blue-600 hover:underline">문서 둘러보기</Link>
            </div>
          ) : (
            <>
              <ShelfSection title="인기 있는 콘텐츠" icon={TrendingUp} docs={popularDocs} />
              <ShelfSection title="좋아할 만한 콘텐츠" icon={ThumbsUp} docs={recommendedDocs} />
              <ShelfSection title="이 문서를 읽은 사람들이 본" icon={Compass} docs={alsoReadDocs} />
              <ShelfSection title="가장 최근 콘텐츠" icon={Sparkles} docs={recentDocs} />
              <ShelfSection title="구독자의 새 콘텐츠" icon={Users} docs={subscribedDocs} />
              <ShelfSection title="읽고 있는 콘텐츠" icon={BookOpen} docs={continueReading} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
