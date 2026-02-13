'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Eye, ThumbsUp, TrendingUp, Heart } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'

const PAGE_SIZE = 20

function BrowseContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [likesMap, setLikesMap] = useState<Map<string, number>>(new Map())
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const sort = searchParams.get('sort') || 'recent'
  const category = searchParams.get('category') || 'all'
  const language = searchParams.get('language') || 'all'

  useEffect(() => {
    setHasMore(true)
    loadDocuments(true)
  }, [sort, category, language, user])

  const loadDocuments = async (isInitial = true) => {
    try {
      if (isInitial) {
        setLoading(true)
        setDocuments([])
      } else {
        setLoadingMore(true)
      }

      if (user && isInitial) {
        const { data: favData } = await supabase
          .from('reading_list').select('document_id').eq('user_id', user.id)
        if (favData) setFavSet(new Set(favData.map(f => f.document_id)))

        const { data: likeData } = await supabase
          .from('reactions').select('document_id').eq('user_id', user.id).eq('type', 'like')
        if (likeData) setLikedSet(new Set(likeData.map(l => l.document_id)))
      }

      const offset = isInitial ? 0 : documents.length

      let query = supabase.from('documents').select('*').eq('is_published', true)

      if (category !== 'all') query = query.eq('category', category)
      if (language !== 'all') query = query.eq('language', language)

      if (sort === 'popular') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', sevenDaysAgo)
      } else if (sort === 'views') {
        query = query.order('view_count', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      query = query.range(offset, offset + PAGE_SIZE - 1)

      const { data, error } = await query
      if (error) throw error

      let sorted = data || []
      if (sort === 'popular') {
        const now = Date.now()
        sorted = sorted.sort((a, b) => {
          const scoreA = (a.likes_count * 3) + (a.view_count * 1) + Math.max(0, 7 - ((now - new Date(a.created_at).getTime()) / (24*60*60*1000))) * 5
          const scoreB = (b.likes_count * 3) + (b.view_count * 1) + Math.max(0, 7 - ((now - new Date(b.created_at).getTime()) / (24*60*60*1000))) * 5
          return scoreB - scoreA
        })
      }

      if (sorted.length < PAGE_SIZE) setHasMore(false)
      else setHasMore(true)

      if (isInitial) {
        setDocuments(sorted)
        setLikesMap(new Map(sorted.map(d => [d.id, d.likes_count])))
      } else {
        setDocuments(prev => [...prev, ...sorted])
        setLikesMap(prev => {
          const n = new Map(prev)
          sorted.forEach(d => n.set(d.id, d.likes_count))
          return n
        })
      }

      if (sorted.length > 0) {
        const authorIds = [...new Set(sorted.map(doc => doc.author_id))]
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', authorIds)
        if (profilesData) {
          setAuthors(prev => {
            const newMap = new Map(prev)
            profilesData.forEach(p => newMap.set(p.id, p))
            return newMap
          })
        }
      }
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
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
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold dark:text-white">인기 있는 콘텐츠</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">최근 7일 · {documents.length}개</span>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">인기 있는 콘텐츠가 없습니다</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">최근 7일 내 등록된 문서가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {documents.map(doc => {
            const author = authors.get(doc.author_id)
            const isFav = favSet.has(doc.id)
            const isLiked = likedSet.has(doc.id)
            const likes = likesMap.get(doc.id) ?? doc.likes_count
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
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity p-3 w-full">
                        <p className="text-white text-[11px] leading-relaxed line-clamp-3 whitespace-pre-wrap">
                          {doc.description || '설명이 없습니다'}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => toggleFav(e, doc.id)}
                        className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${isFav ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
                        title={isFav ? '찜 해제' : '찜하기'}
                      >
                        <Heart className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => toggleLike(e, doc.id)}
                        className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${isLiked ? 'bg-blue-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
                        title={isLiked ? '좋아요 취소' : '좋아요'}
                      >
                        <ThumbsUp className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                      </button>
                    </div>
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
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1">
                      {author?.username || author?.email || '알 수 없음'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{doc.view_count.toLocaleString()}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likes.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {!loading && documents.length > 0 && hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => loadDocuments(false)}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loadingMore ? '로딩 중...' : '더보기'}
          </button>
        </div>
      )}
    </main>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[3/4] bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </main>
    }>
      <BrowseContent />
    </Suspense>
  )
}
