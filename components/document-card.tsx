'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Eye, ThumbsUp, Heart, BookOpen, Clock, FileText } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'

interface DocumentCardProps {
  doc: {
    id: string
    title: string
    description?: string | null
    thumbnail_url?: string | null
    category?: string
    language?: string
    view_count?: number
    views?: number
    likes_count?: number
    likes?: number
    total_reading_time?: number
    page_count?: number
    profiles?: { username?: string | null; email?: string; avatar_url?: string | null } | null
  }
  authorName?: string | null
  variant?: 'compact' | 'grid'
  currentPage?: number
  lastReadAt?: string
  onRemoveFromList?: (docId: string) => void
}

export function DocumentCard({
  doc,
  authorName,
  variant = 'grid',
  currentPage,
  lastReadAt,
  onRemoveFromList,
}: DocumentCardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const [inList, setInList] = useState(false)
  const [likesCount, setLikesCount] = useState(doc.likes_count ?? doc.likes ?? 0)

  const views = doc.view_count ?? doc.views ?? 0
  const displayAuthor = authorName || doc.profiles?.username || doc.profiles?.email || ''
  const progress = currentPage && doc.page_count && doc.page_count > 0
    ? Math.round((currentPage / doc.page_count) * 100)
    : null

  useEffect(() => {
    if (!user) return
    checkStatus()
  }, [user, doc.id])

  const checkStatus = async () => {
    if (!user) return
    try {
      const { data: listData } = await supabase
        .from('reading_list')
        .select('id')
        .eq('user_id', user.id)
        .eq('document_id', doc.id)
        .maybeSingle()
      setInList(!!listData)
    } catch {}
    try {
      const { data: likeData } = await supabase
        .from('reactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('document_id', doc.id)
        .eq('type', 'like')
        .maybeSingle()
      setLiked(!!likeData)
    } catch {}
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    try {
      if (liked) {
        await supabase.from('reactions').delete()
          .eq('user_id', user.id).eq('document_id', doc.id).eq('type', 'like')
        await supabase.from('documents')
          .update({ likes_count: Math.max(0, likesCount - 1) }).eq('id', doc.id)
        setLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      } else {
        await supabase.from('reactions').delete()
          .eq('user_id', user.id).eq('document_id', doc.id)
        await supabase.from('reactions')
          .insert({ user_id: user.id, document_id: doc.id, type: 'like' })
        await supabase.from('documents')
          .update({ likes_count: likesCount + 1 }).eq('id', doc.id)
        setLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  const handleToggleList = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    try {
      if (inList) {
        await supabase.from('reading_list').delete()
          .eq('user_id', user.id).eq('document_id', doc.id)
        setInList(false)
        onRemoveFromList?.(doc.id)
      } else {
        await supabase.from('reading_list')
          .insert({ user_id: user.id, document_id: doc.id })
        setInList(true)
      }
    } catch (err) {
      console.error('Reading list error:', err)
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

  // ─── 컴팩트 모드 ───
  if (variant === 'compact') {
    return (
      <div onClick={() => router.push(`/document/${doc.id}`)} className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
        <div className="group cursor-pointer transition-all duration-200 hover:-translate-y-1">
          <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-xl overflow-hidden mb-2 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08] group-hover:shadow-lg group-hover:shadow-black/10 dark:group-hover:shadow-black/30 transition-shadow duration-200">
            {doc.thumbnail_url ? (
              <Image src={doc.thumbnail_url} alt={doc.title} fill className="object-cover" sizes="(max-width: 640px) 160px, (max-width: 768px) 180px, 200px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-gray-300" />
              </div>
            )}



            <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
              <button onClick={handleToggleList}
                className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${inList ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
                title={inList ? '찜 해제' : '찜하기'}>
                <Heart className="w-4 h-4" fill={inList ? 'currentColor' : 'none'} />
              </button>
              <button onClick={handleLike}
                className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${liked ? 'bg-blue-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
                title={liked ? '좋아요 취소' : '좋아요'}>
                <ThumbsUp className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>



            {progress !== null && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50">
                <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">
              {doc.title}
            </h3>
            {displayAuthor && (
              <p className="text-[11px] text-gray-500 truncate mb-1">{displayAuthor}</p>
            )}
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{views.toLocaleString()}</span>
                <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likesCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>{getCategoryIcon(doc.category || '')} {getCategoryLabel(doc.category || '')}</span>
                {doc.page_count && doc.page_count > 0 && (
                  <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{doc.page_count}p</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── 그리드 모드 (browse, reading-list, continue-reading, home) ───
  return (
    <div onClick={() => router.push(`/document/${doc.id}`)}>
      <div className="group cursor-pointer transition-all duration-200 hover:-translate-y-1">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-xl overflow-hidden mb-2 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08] group-hover:shadow-lg group-hover:shadow-black/10 dark:group-hover:shadow-black/30 transition-shadow duration-200">
          {doc.thumbnail_url ? (
            <Image src={doc.thumbnail_url} alt={doc.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-gray-300" />
            </div>
          )}



          <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
            <button onClick={handleToggleList}
              className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${inList ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
              title={inList ? '찜 해제' : '찜하기'}>
              <Heart className="w-4 h-4" fill={inList ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handleLike}
              className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${liked ? 'bg-blue-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
              title={liked ? '좋아요 취소' : '좋아요'}>
              <ThumbsUp className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>



          {progress !== null && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/50">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">
            {doc.title}
          </h3>
          {displayAuthor && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1">{displayAuthor}</p>
          )}
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{views.toLocaleString()}</span>
              <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likesCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span>{getCategoryIcon(doc.category || '')} {getCategoryLabel(doc.category || '')}</span>
              {doc.page_count && doc.page_count > 0 && (
                <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{doc.page_count}p</span>
              )}
            </div>
            {progress !== null && lastReadAt && (
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-blue-600 font-medium">{progress}%</span>
                <span className="flex items-center gap-0.5 text-gray-400">
                  <Clock className="w-3 h-3" />{getTimeAgo(lastReadAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
