'use client'

import { useEffect, useState } from 'react'
import { supabase, Document } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, ThumbsUp, Play } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'


export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  

  useEffect(() => {
    loadRecommendedDocs()
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // 필터링 적용
  useEffect(() => {
    filterDocuments()
  }, [searchQuery, category, language, sortBy, allDocs])

  const loadRecommendedDocs = async () => {
    try {
      let docs: Document[] = []

      if (user) {
        // 1. 이어 읽기
        const { data: sessions } = await supabase
          .from('reading_sessions')
          .select('document_id')
          .eq('reader_id', user.id)
          .eq('completed', false)
          .order('last_read_at', { ascending: false })
          .limit(3)

        if (sessions && sessions.length > 0) {
          const docIds = sessions.map(s => s.document_id)
          const { data: continueDocs } = await supabase
            .from('documents')
            .select('*')
            .in('id', docIds)

          if (continueDocs) docs.push(...continueDocs)
        }

        // 2. 구독 작가 문서
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('author_id')
          .eq('subscriber_id', user.id)

        if (subscriptions && subscriptions.length > 0) {
          const authorIds = subscriptions.map(s => s.author_id)
          const { data: subDocs } = await supabase
            .from('documents')
            .select('*')
            .in('author_id', authorIds)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(6)

          if (subDocs) docs.push(...subDocs)
        }
      }

      // 3. 인기 문서
      const { data: popularDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('is_published', true)
        .order('likes_count', { ascending: false })
        .limit(20)

      if (popularDocs) docs.push(...popularDocs)

      // 중복 제거
      const uniqueDocs = Array.from(
        new Map(docs.map(doc => [doc.id, doc])).values()
      )

      setAllDocs(uniqueDocs)
    } catch (err) {
      console.error('Error loading recommended docs:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterDocuments = () => {
    let filtered = allDocs

    // 카테고리 필터
    if (category !== 'all') {
      filtered = filtered.filter(doc => doc.category === category)
    }

    // 언어 필터
    if (language !== 'all') {
      filtered = filtered.filter(doc => doc.language === language)
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      )
    }

    // 정렬
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'popular':
          return b.likes_count - a.likes_count
        case 'views':
          return b.view_count - a.view_count
        default:
          return 0
      }
    })

    setFilteredDocs(filtered)
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Link href={`/read/${doc.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl opacity-20">📄</div>
          </div>
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-black ml-1" fill="black" />
              </div>
            </div>
          </div>

          <div className="absolute top-2 left-2 flex gap-2">
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
              {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
            </span>
            <span className="text-xl">{getLanguageFlag(doc.language)}</span>
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
            {Math.floor(doc.total_reading_time / 60)}분
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {doc.title}
          </h3>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {doc.description || '설명이 없습니다'}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {doc.likes_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {doc.view_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
     

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[2000px] mx-auto">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">
                {searchQuery || category !== 'all' || language !== 'all'
                  ? '검색 결과가 없습니다'
                  : '추천할 문서가 없습니다'}
              </p>
              <Link href="/browse">
                <Button>문서 둘러보기</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}