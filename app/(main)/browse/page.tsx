'use client'

import { useEffect, useState } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, ThumbsUp, Search, Calendar, Play } from 'lucide-react'
import { ReadingListButton } from '@/components/reading-list-button'
import { CATEGORIES, getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { LANGUAGES, getLanguageFlag, getLanguageLabel } from '@/lib/languages'
import { NotificationsBell } from '@/components/notifications-bell'
import { ProfileMenu } from '@/components/profile-menu'

export default function BrowsePage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'views'>('recent')
  const [loading, setLoading] = useState(true)

  // URL 파라미터 처리
  useEffect(() => {
    const sortParam = searchParams.get('sort')
    const filterParam = searchParams.get('filter')
    const categoryParam = searchParams.get('category')
    const languageParam = searchParams.get('language')

    if (sortParam === 'popular' || sortParam === 'views') {
      setSortBy(sortParam)
    }

    if (categoryParam) {
      setSelectedCategory(categoryParam)
    }

    if (languageParam) {
      setSelectedLanguage(languageParam)
    }

    // 구독 필터는 나중에 구현 가능
    if (filterParam === 'subscribed') {
      // TODO: 구독한 작가의 문서만 필터링
    }
  }, [searchParams])

  useEffect(() => {
    loadDocuments()
  }, [])

  useEffect(() => {
    filterAndSortDocuments()
  }, [searchQuery, selectedCategory, selectedLanguage, sortBy, documents, profiles])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('is_published', true)

      if (error) throw error

      setDocuments(data || [])

      // 작가 프로필 가져오기
      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map(doc => doc.author_id))]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', authorIds)

        if (profilesData) {
          const profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile
            return acc
          }, {} as Record<string, Profile>)
          setProfiles(profilesMap)
        }
      }
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortDocuments = () => {
    let filtered = documents

    // 카테고리 필터
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory)
    }

    // 언어 필터
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(doc => doc.language === selectedLanguage)
    }

    // 검색 필터 (제목 + 설명 + 작가명)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(doc => {
        const authorProfile = profiles[doc.author_id]
        const authorName = authorProfile?.username || authorProfile?.email || ''
        
        return (
          doc.title.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          authorName.toLowerCase().includes(query)
        )
      })
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

  const DocumentCard = ({ doc }: { doc: Document }) => {
    const authorProfile = profiles[doc.author_id]
    
    return (
      <div className="group cursor-pointer">
        <Link href={`/read/${doc.id}`}>
          {/* 썸네일 */}
          <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl opacity-20">📄</div>
            </div>
            
            {/* 호버 시 재생 버튼 */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-black ml-1" fill="black" />
                </div>
              </div>
            </div>

            {/* 카테고리 & 언어 */}
            <div className="absolute top-2 left-2 flex gap-2">
              <span className="px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
                {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
              </span>
              <span className="text-xl">{getLanguageFlag(doc.language)}</span>
            </div>

            {/* 읽기 시간 */}
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
              {Math.floor(doc.total_reading_time / 60)}분
            </div>
          </div>
        </Link>

        {/* 정보 */}
        <div>
          <Link href={`/read/${doc.id}`}>
            <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
              {doc.title}
            </h3>
          </Link>
          
          {authorProfile && (
            <Link href={`/profile/${authorProfile.id}`}>
              <p className="text-xs text-gray-500 hover:underline mb-1">
                {authorProfile.username || authorProfile.email}
              </p>
            </Link>
          )}

          <p className="text-xs text-gray-600 line-clamp-1 mb-2">
            {doc.description || '설명이 없습니다'}
          </p>

          {/* 통계 + 읽기 목록 */}
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
            <ReadingListButton documentId={doc.id} />
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-white border-b">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex-1 lg:flex-initial">
            <Link href="/home">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Textry
              </h1>
            </Link>
          </div>

          {/* 검색바 */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="문서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full bg-gray-100 border-0"
              />
            </div>
          </div>

          {/* 우측 메뉴 */}
          <div className="flex items-center gap-2 md:gap-3">
            {user && <NotificationsBell />}
            {user && <ProfileMenu />}
          </div>
        </div>

        {/* 모바일 검색 */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="문서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-gray-100 border-0"
            />
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[2000px] mx-auto">
          {/* 필터 */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* 카테고리 */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <span>📚</span>
                      <span>전체 카테고리</span>
                    </span>
                  </SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 언어 */}
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <span>🌐</span>
                      <span>전체 언어</span>
                    </span>
                  </SelectItem>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 정렬 */}
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'recent' | 'popular' | 'views')}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      최신순
                    </span>
                  </SelectItem>
                  <SelectItem value="popular">
                    <span className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4" />
                      인기순
                    </span>
                  </SelectItem>
                  <SelectItem value="views">
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      조회수순
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 결과 개수 */}
            <p className="text-sm text-gray-500">
              {filteredDocs.length}개의 문서
              {searchQuery && ` (검색어: "${searchQuery}")`}
            </p>
          </div>

          {/* 문서 그리드 */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">
                {searchQuery || selectedCategory !== 'all' || selectedLanguage !== 'all'
                  ? '검색 결과가 없습니다' 
                  : '아직 문서가 없습니다'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
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