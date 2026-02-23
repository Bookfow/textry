'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Eye, ThumbsUp, Clock, Heart, Compass } from 'lucide-react'
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
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [likesMap, setLikesMap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!user) return
    const fetchReadingDocs = async () => {
      try {
        const { data: favData } = await supabase
          .from('reading_list').select('document_id').eq('user_id', user.id)
        if (favData) setFavSet(new Set(favData.map(f => f.document_id)))

        const { data: likeData } = await supabase
          .from('reactions').select('document_id').eq('user_id', user.id).eq('type', 'like')
        if (likeData) setLikedSet(new Set(likeData.map(l => l.document_id)))

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
        setLikesMap(new Map(result.map(d => [d.id, d.likes_count])))
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

  const toggleLike = async (e: React.MouseEvent, docId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    try {
      const currentLikes = likesMap.get(docId) || 0
      if (likedSet.has(docId)) {
        await supabase.from('reactions').delete().eq('user_id', user.id).eq('document_id', docId).eq('type', 'like')
        await supabase.from('documents').update({ likes_count: Math.max(0, currentLikes - 1) }).eq('id', docId)
        setLikedSet(prev => { const n = new Set(prev); n.delete(docId); return n })
        setLikesMap(prev => { const n = new Map(prev); n.set(docId, Math.max(0, currentLikes - 1)); return n })
      } else {
        await supabase.from('reactions').delete().eq('user_id', user.id).eq('document_id', docId)
        await supabase.from('reactions').insert({ user_id: user.id, document_id: docId, type: 'like' })
        await supabase.from('documents').update({ likes_count: currentLikes + 1 }).eq('id', docId)
        setLikedSet(prev => new Set(prev).add(docId))
        setLikesMap(prev => { const n = new Map(prev); n.set(docId, currentLikes + 1); return n })
      }
    } catch (err) {
      console.error('Like toggle error:', err)
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
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-xl" />
                <div className="h-4 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-[#B2967D]" />
        <h1 className="text-2xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">읽고 있는 콘텐츠</h1>
        <span className="text-sm text-[#9C8B7A]">{docs.length}개</span>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-6">
            <div className="absolute inset-0 -m-4 bg-gradient-to-br from-[#E6BEAE]/30 to-[#B2967D]/20 rounded-full blur-xl opacity-60" />
            <div className="relative w-20 h-20 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-[#B2967D]" />
            </div>
          </div>
          <p className="text-lg font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-2">아직 읽고 있는 콘텐츠가 없어요</p>
          <p className="text-sm text-[#9C8B7A] mb-6 text-center max-w-xs">콘텐츠를 읽기 시작하면 여기에 표시됩니다.<br />지금 새로운 콘텐츠를 발견해보세요!</p>
          <Link href="/browse" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B2967D] hover:bg-[#a67c52] text-white text-sm font-medium rounded-full transition-colors shadow-lg shadow-[#B2967D]/20">
            <Compass className="w-4 h-4" />
            콘텐츠 둘러보기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {docs.map(doc => {
            const progress = doc.page_count > 0 ? Math.round((doc.current_page / doc.page_count) * 100) : 0
            const isFav = favSet.has(doc.id)
            const isLiked = likedSet.has(doc.id)
            const likes = likesMap.get(doc.id) ?? doc.likes_count
            return (
              <Link key={doc.id} href={`/document/${doc.id}`}>
                <div className="group cursor-pointer transition-all duration-200 hover:-translate-y-1">
                  <div className="relative aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-xl overflow-hidden mb-2 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] group-hover:shadow-lg transition-shadow duration-200">
                    {doc.thumbnail_url ? (
                      <Image src={doc.thumbnail_url} alt={doc.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-[#E7D8C9]" />
                      </div>
                    )}
                    {/* 호버 설명 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity p-3 w-full">
                        <p className="text-white text-[11px] leading-relaxed line-clamp-3">
                          {doc.description || '설명이 없습니다'}
                        </p>
                      </div>
                    </div>
                    {/* 찜/좋아요 */}
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={(e) => toggleFav(e, doc.id)}
                        className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${isFav ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}>
                        <Heart className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={(e) => toggleLike(e, doc.id)}
                        className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${isLiked ? 'bg-[#B2967D] text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}>
                        <ThumbsUp className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    {/* 카테고리 */}
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm">
                        {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
                      </span>
                    </div>
                    {/* ★ 진행률 바 (강화) */}
                    <div className="absolute bottom-0 left-0 right-0">
                      <div className="h-1.5 bg-black/20 backdrop-blur-sm">
                        <div className="h-full bg-gradient-to-r from-[#B2967D] to-[#E6BEAE] transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    {/* ★ 진행률 배지 */}
                    <div className="absolute bottom-3 right-2">
                      <span className="px-2 py-0.5 bg-[#B2967D] text-white text-[10px] font-bold rounded-full shadow-sm">
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-[#B2967D] transition-colors text-[#2D2016] dark:text-[#EEE4E1]">
                      {doc.title}
                    </h3>
                    <p className="text-[11px] text-[#9C8B7A] truncate mb-1">
                      {doc.authorName}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#9C8B7A]">
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{doc.view_count.toLocaleString()}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likes.toLocaleString()}</span>
                      <span className="flex items-center gap-0.5 ml-auto"><Clock className="w-3 h-3" />{getTimeAgo(doc.last_read_at)}</span>
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
