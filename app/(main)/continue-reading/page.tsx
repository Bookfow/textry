'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { BookOpen, Eye, ThumbsUp, Clock, Heart } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'

type ReadingDoc = {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  category: string
  view_count: number
  likes_count: number
  total_reading_time: number
  page_count: number
  current_page: number
  last_read_at: string
  authorName: string
}

export default function ContinueReadingPage() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<ReadingDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [favSet, setFavSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    const fetchReadingDocs = async () => {
      try {
        // 찜 목록
        const { data: favData } = await supabase
          .from('reading_list').select('document_id').eq('user_id', user.id)
        if (favData) setFavSet(new Set(favData.map(f => f.document_id)))

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

        const docIds = [...new Set(sessions.map(s => s.document_id))]
        const { data: documents } = await supabase
          .from('documents')
          .select('id, title, description, thumbnail_url, category, view_count, likes_count, total_reading_time, page_count, author_id')
          .in('id', docIds)
          .eq('is_published', true)

        if (!documents) { setDocs([]); setLoading(false); return }

        const authorIds = [...new Set(documents.map(d => d.author_id))]
        const { data: profiles } = await supabase
          .from('profiles').select('id, username, email').in('id', authorIds)
        const profileMap = new Map((profiles || []).map(p => [p.id, p]))

        const latestSessions = new Map<string, typeof sessions[0]>()
        sessions.forEach(s => {
          if (!latestSessions.has(s.document_id)) latestSessions.set(s.document_id, s)
        })

        const result: ReadingDoc[] = []
        latestSessions.forEach((session, docId) => {
          const doc = documents.find(d => d.id === docId)
          if (!doc) return
          const author = profileMap.get(doc.author_id)
          result.push({
            id: doc.id,
            title: doc.title,
            description: doc.description,
            thumbnail_url: doc.thumbnail_url,
            category: doc.category || '',
            view_count: doc.view_count || 0,
            likes_count: doc.likes_count || 0,
            total_reading_time: doc.total_reading_time || 0,
            page_count: doc.page_count || 1,
            current_page: session.current_page,
            last_read_at: session.last_read_at,
            authorName: author?.username || author?.email || '',
          })
        })

        setDocs(result)
      } catch (err) {
        console.error('Error fetching reading docs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReadingDocs()
  }, [user])

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[3/4] bg-gray-200 rounded-xl" />)}
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
        <span className="text-sm text-gray-400 dark:text-gray-500">{docs.length}개</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {docs.map(doc => {
            const progress = doc.page_count > 0 ? Math.round((doc.current_page / doc.page_count) * 100) : 0
            const isFav = favSet.has(doc.id)
            return (
              <Link key={doc.id} href={`/read/${doc.id}`}>
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
                    {/* 찜 버튼 */}
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
                    {/* 진행률 바 */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/50">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">
                      {doc.title}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1">
                      {doc.authorName}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{doc.view_count.toLocaleString()}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{doc.likes_count.toLocaleString()}</span>
                      <span className="text-blue-600 font-medium ml-auto">{progress}%</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{getTimeAgo(doc.last_read_at)}</span>
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
