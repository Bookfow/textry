'use client'

import { useEffect, useState } from 'react'
import { supabase, Document } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, ThumbsUp, BookmarkX, Play } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { MainHeader } from '@/components/main-header'

export default function ReadingListPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadReadingList()
  }, [user])

  useEffect(() => {
    filterDocuments()
  }, [searchQuery, category, language, sortBy, allDocs])

  const loadReadingList = async () => {
    if (!user) return

    try {
      const { data: listData, error: listError } = await supabase
        .from('reading_list')
        .select('document_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (listError) throw listError

      if (!listData || listData.length === 0) {
        setAllDocs([])
        setLoading(false)
        return
      }

      const documentIds = listData.map(item => item.document_id)

      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds)

      if (docsError) throw docsError

      setAllDocs(docsData || [])
    } catch (err) {
      console.error('Error loading reading list:', err)
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

  const handleRemove = async (documentId: string) => {
    if (!user) return

    try {
      await supabase
        .from('reading_list')
        .delete()
        .eq('user_id', user.id)
        .eq('document_id', documentId)

      setAllDocs(allDocs.filter(doc => doc.id !== documentId))
    } catch (err) {
      console.error('Error removing from reading list:', err)
      alert('제거에 실패했습니다.')
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <div className="group">
      <Link href={`/read/${doc.id}`}>
        <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3 cursor-pointer">
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
      </Link>

      <div>
        <Link href={`/read/${doc.id}`}>
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {doc.title}
          </h3>
        </Link>
        
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
          {doc.description || '설명이 없습니다'}
        </p>

        <div className="flex items-center justify-between">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(doc.id)}
            className="h-8 px-2 text-xs hover:text-red-600"
          >
            <BookmarkX className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        category={category}
        onCategoryChange={setCategory}
        language={language}
        onLanguageChange={setLanguage}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[2000px] mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">읽기 목록</h2>
            <p className="text-gray-600">
              총 {allDocs.length}개 중 {filteredDocs.length}개 표시
              {searchQuery && ` (검색어: "${searchQuery}")`}
            </p>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">
                {searchQuery || category !== 'all' || language !== 'all'
                  ? '검색 결과가 없습니다'
                  : '읽기 목록이 비어있습니다'}
              </p>
              {allDocs.length === 0 && (
                <Link href="/browse">
                  <Button>문서 둘러보기</Button>
                </Link>
              )}
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