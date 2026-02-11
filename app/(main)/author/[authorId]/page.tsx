'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Eye, ThumbsUp, Play, Users } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { MainHeader } from '@/components/main-header'
import { SubscribeButton } from '@/components/subscribe-button'

export default function AuthorPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const authorId = params.authorId as string

  const [author, setAuthor] = useState<Profile | null>(null)
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    loadAuthorData()
  }, [authorId])

  useEffect(() => {
    filterDocuments()
  }, [searchQuery, category, language, sortBy, allDocs])

  const loadAuthorData = async () => {
    try {
      // 작가 프로필 로드
      const { data: authorData, error: authorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authorId)
        .single()

      if (authorError) throw authorError
      setAuthor(authorData)

      // 작가의 문서 로드
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', authorId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (docsError) throw docsError
      setAllDocs(docs || [])
    } catch (err) {
      console.error('Error loading author data:', err)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">작가를 찾을 수 없습니다</p>
          <Button onClick={() => router.push('/home')}>홈으로 돌아가기</Button>
        </div>
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
          {/* 작가 프로필 섹션 */}
          <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-start gap-6">
              {/* 아바타 */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-4xl font-bold flex-shrink-0">
                {(author.username || author.email)[0].toUpperCase()}
              </div>

              {/* 정보 */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {author.username || author.email}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    구독자 {author.subscribers_count?.toLocaleString() || 0}명
                  </span>
                  <span>문서 {allDocs.length}개</span>
                </div>

                {/* 구독 버튼 */}
                {user && user.id !== authorId && (
                  <SubscribeButton 
                  authorId={authorId}
                  authorName={author.username || author.email}
                  initialSubscribersCount={author.subscribers_count || 0}
                />
                )}
              </div>
            </div>
          </div>

          {/* 문서 목록 */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-2">업로드한 문서</h2>
              <p className="text-sm text-gray-500">
                총 {allDocs.length}개 중 {filteredDocs.length}개 표시
                {searchQuery && ` (검색어: "${searchQuery}")`}
              </p>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500">
                  {searchQuery || category !== 'all' || language !== 'all'
                    ? '검색 결과가 없습니다'
                    : '아직 업로드한 문서가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {filteredDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}