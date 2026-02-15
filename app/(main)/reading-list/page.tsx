'use client'

import { useEffect, useState } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, ThumbsUp, Heart, HeartOff, Compass } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'

export default function ReadingListPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [likesMap, setLikesMap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadReadingList()
  }, [user])

  const loadReadingList = async () => {
    if (!user) return
    try {
      const { data: likeData } = await supabase
        .from('reactions').select('document_id').eq('user_id', user.id).eq('type', 'like')
      if (likeData) setLikedSet(new Set(likeData.map(l => l.document_id)))

      const { data: listData, error: listError } = await supabase
        .from('reading_list').select('document_id').eq('user_id', user.id).order('created_at', { ascending: false })
      if (listError) throw listError
      if (!listData || listData.length === 0) { setDocuments([]); setLoading(false); return }

      const documentIds = listData.map(item => item.document_id)
      const { data: docsData, error: docsError } = await supabase.from('documents').select('*').in('id', documentIds)
      if (docsError) throw docsError

      const docMap = new Map((docsData || []).map(d => [d.id, d]))
      const ordered = documentIds.map(id => docMap.get(id)).filter(Boolean) as Document[]
      setDocuments(ordered)
      setLikesMap(new Map(ordered.map(d => [d.id, d.likes_count])))

      if (docsData && docsData.length > 0) {
        const authorIds = [...new Set(docsData.map(d => d.author_id))]
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', authorIds)
        if (profilesData) setAuthors(new Map(profilesData.map(p => [p.id, p])))
      }
    } catch (err) {
      console.error('Error loading reading list:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (e: React.MouseEvent, documentId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    try {
      await supabase.from('reading_list').delete().eq('user_id', user.id).eq('document_id', documentId)
      setDocuments(documents.filter(doc => doc.id !== documentId))
    } catch (err) {
      console.error('Error removing from reading list:', err)
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
        <Heart className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl font-bold dark:text-white">찜한 콘텐츠</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">{documents.length}개</span>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-6">
            <div className="absolute inset-0 -m-4 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-full blur-xl opacity-60" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center">
              <Heart className="w-10 h-10 text-red-400 dark:text-red-300" />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">아직 찜한 문서가 없어요</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 text-center max-w-xs">문서를 읽으면서 하트 버튼을 눌러<br />나만의 컬렉션을 만들어보세요!</p>
          <Link href="/browse" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-red-500/20">
            <Compass className="w-4 h-4" />
            문서 둘러보기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {documents.map(doc => {
            const author = authors.get(doc.author_id)
            const isLiked = likedSet.has(doc.id)
            const likes = likesMap.get(doc.id) ?? doc.likes_count
            return (
              <Link key={doc.id} href={`/read/${doc.id}`}>
                <div className="group cursor-pointer transition-all duration-200 hover:-translate-y-1">
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-xl overflow-hidden mb-2 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08] group-hover:shadow-lg group-hover:shadow-black/10 dark:group-hover:shadow-black/30 transition-shadow duration-200">
                    {doc.thumbnail_url ? (
                      <Image src={doc.thumbnail_url} alt={doc.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
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
                        onClick={(e) => handleRemove(e, doc.id)}
                        className="p-1.5 rounded-full bg-red-500 text-white backdrop-blur-sm transition-colors hover:bg-red-600"
                        title="찜 해제"
                      >
                        <HeartOff className="w-4 h-4" />
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
    </main>
  )
}
