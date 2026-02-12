'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import Link from 'next/link'
import { Eye, ThumbsUp, BookOpen as ReadIcon } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'

function BrowseContent() {
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)

  const sort = searchParams.get('sort') || 'recent'
  const category = searchParams.get('category') || 'all'
  const language = searchParams.get('language') || 'all'

  useEffect(() => {
    loadDocuments()
  }, [sort, category, language])

  const loadDocuments = async () => {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('is_published', true)

      if (category !== 'all') query = query.eq('category', category)
      if (language !== 'all') query = query.eq('language', language)

      if (sort === 'popular') {
        query = query.order('likes_count', { ascending: false })
      } else if (sort === 'views') {
        query = query.order('view_count', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query
      if (error) throw error
      setDocuments(data || [])

      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map(doc => doc.author_id))]
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', authorIds)
        if (profilesData) setAuthors(new Map(profilesData.map(p => [p.id, p])))
      }
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => {
    const author = authors.get(doc.author_id)
    return (
      <Link href={`/read/${doc.id}`}>
        <div className="group cursor-pointer">
          <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl overflow-hidden mb-3">
            {doc.thumbnail_url ? (
              <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"><div className="text-6xl opacity-20">📄</div></div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center"><ReadIcon className="w-6 h-6 text-black" /></div>
              </div>
            </div>
            <div className="absolute top-2 left-2 flex gap-2">
              <span className="px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">{getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}</span>
              <span className="text-xl">{getLanguageFlag(doc.language)}</span>
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">{Math.floor(doc.total_reading_time / 60)}분</div>
          </div>
          <div>
            <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors text-gray-900 dark:text-white">{doc.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{author?.username || author?.email || '알 수 없음'}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{doc.likes_count.toLocaleString()}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500 dark:text-gray-400">로딩 중...</p></div>
  }

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[2000px] mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">문서 둘러보기</h2>
            <p className="text-gray-600 dark:text-gray-400">총 {documents.length}개</p>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-20"><p className="text-gray-500 dark:text-gray-400">문서가 없습니다</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {documents.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500 dark:text-gray-400">로딩 중...</p></div>}>
      <BrowseContent />
    </Suspense>
  )
}
