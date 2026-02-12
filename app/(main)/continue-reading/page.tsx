'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { BookOpen, Eye, ThumbsUp, Clock } from 'lucide-react'

type ReadingDoc = {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  views: number
  likes: number
  page_count: number
  author: { username: string | null; email: string }
  current_page: number
  last_read_at: string
}

export default function ContinueReadingPage() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<ReadingDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchReadingDocs = async () => {
      try {
        // 읽고 있는 문서 (completed = false)
        const { data: sessions, error: sessionsError } = await supabase
          .from('reading_sessions')
          .select('document_id, current_page, last_read_at')
          .eq('reader_id', user.id)
          .eq('completed', false)
          .order('last_read_at', { ascending: false })

        if (sessionsError || !sessions || sessions.length === 0) {
          setDocs([])
          setLoading(false)
          return
        }

        const docIds = sessions.map(s => s.document_id)
        const { data: documents } = await supabase
          .from('documents')
          .select('id, title, description, thumbnail_url, views, likes, page_count, author_id')
          .in('id', docIds)
          .eq('is_published', true)

        if (!documents) {
          setDocs([])
          setLoading(false)
          return
        }

        const authorIds = [...new Set(documents.map(d => d.author_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', authorIds)

        const profileMap = new Map((profiles || []).map(p => [p.id, p]))

        const result: ReadingDoc[] = sessions
          .map(session => {
            const doc = documents.find(d => d.id === session.document_id)
            if (!doc) return null
            const author = profileMap.get(doc.author_id)
            return {
              id: doc.id,
              title: doc.title,
              description: doc.description,
              thumbnail_url: doc.thumbnail_url,
              views: doc.views || 0,
              likes: doc.likes || 0,
              page_count: doc.page_count || 1,
              author: { username: author?.username || null, email: author?.email || '' },
              current_page: session.current_page,
              last_read_at: session.last_read_at,
            }
          })
          .filter(Boolean) as ReadingDoc[]

        setDocs(result)
      } catch (err) {
        console.error('Error fetching reading docs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReadingDocs()
  }, [user])

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold dark:text-white">읽고 있는 콘텐츠</h1>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">읽고 있는 콘텐츠가 없습니다</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">문서를 읽기 시작하면 여기에 표시됩니다</p>
          <Link href="/browse" className="inline-block mt-4 text-blue-600 hover:underline text-sm">
            문서 둘러보기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map(doc => {
            const progress = doc.page_count > 0 ? Math.round((doc.current_page / doc.page_count) * 100) : 0
            return (
              <Link key={doc.id} href={`/read/${doc.id}`}>
                <div className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* 썸네일 */}
                  <div className="relative aspect-[16/9] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700">
                    {doc.thumbnail_url ? (
                      <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    {/* 진행률 바 */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* 정보 */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {doc.author.username || doc.author.email}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> {doc.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" /> {doc.likes}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-blue-600 font-medium">{progress}%</span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3.5 h-3.5" /> {getTimeAgo(doc.last_read_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
