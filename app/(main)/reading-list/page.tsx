'use client'

import { useEffect, useState } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, ThumbsUp, Heart, HeartOff } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'

export default function ReadingListPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadReadingList()
  }, [user])

  const loadReadingList = async () => {
    if (!user) return
    try {
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
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">찜한 콘텐츠가 없습니다</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">문서를 읽으면서 ❤️ 버튼을 눌러 찜해보세요</p>
          <Link href="/browse" className="inline-block mt-4 text-blue-600 hover:underline text-sm">
            문서 둘러보기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {documents.map(doc => {
            const author = authors.get(doc.author_id)
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
                    {/* 찜 해제 버튼 */}
                    <button
                      onClick={(e) => handleRemove(e, doc.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hover:bg-red-600"
                      title="찜 해제"
                    >
                      <HeartOff className="w-4 h-4" />
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
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1">
                      {author?.username || author?.email || '알 수 없음'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{doc.view_count.toLocaleString()}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{doc.likes_count.toLocaleString()}</span>
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
