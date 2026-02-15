'use client'

import { useEffect, useState } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { BookOpen, Users, TrendingUp, Sparkles } from 'lucide-react'
import { DocumentCard } from '@/components/document-card'
import { HomeSkeleton } from '@/components/loading-skeleton'

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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

  const hasAnyContent = continueReading.length > 0 || subscribedDocs.length > 0 || popularDocs.length > 0 || recentDocs.length > 0

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
