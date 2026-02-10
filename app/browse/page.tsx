'use client'
import { ProfileMenu } from '@/components/profile-menu'
import { useEffect, useState } from 'react'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Clock, ThumbsUp, Search, Calendar } from 'lucide-react'
import { ReadingListButton } from '@/components/reading-list-button'
import { CATEGORIES, getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { LANGUAGES, getLanguageFlag, getLanguageLabel } from '@/lib/languages'
import { NotificationsBell } from '@/components/notifications-bell'

export default function BrowsePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'views'>('recent')
  const [loading, setLoading] = useState(true)

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
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getCategoryIcon(doc.category)}</span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
              {getCategoryLabel(doc.category)}
            </span>
            <span className="text-lg">{getLanguageFlag(doc.language)}</span>
          </div>
          <CardTitle className="line-clamp-2">{doc.title}</CardTitle>
          <CardDescription className="line-clamp-2">
            {doc.description || '설명이 없습니다'}
          </CardDescription>
          {authorProfile && (
            <Link href={`/profile/${authorProfile.id}`}>
              <p className="text-xs text-gray-500 hover:underline mt-2">
                작가: {authorProfile.username || authorProfile.email}
              </p>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              {doc.likes_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {doc.view_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {Math.floor(doc.total_reading_time / 60)}분
            </span>
          </div>
          <div className="flex gap-2">
            <ReadingListButton documentId={doc.id} />
            <Link href={`/read/${doc.id}`} className="flex-1">
              <Button className="w-full">읽기</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/home">
              <h1 className="text-2xl font-bold text-blue-600">Textry</h1>
            </Link>
            <div className="flex gap-4 items-center">
              {user ? (
                <>
                  {user.role === 'author' && (
                    <>
                      <Link href="/upload">
                        <Button variant="ghost">업로드</Button>
                      </Link>
                      <Link href="/dashboard">
                        <Button variant="ghost">대시보드</Button>
                      </Link>
                    </>
                  )}
                  <Link href="/reading-list">
                    <Button variant="ghost">읽기 목록</Button>
                  </Link>
                  {user && <NotificationsBell />}
{user && <ProfileMenu />}
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">로그인</Button>
                  </Link>
                  <Link href="/signup">
                    <Button>회원가입</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4">문서 둘러보기</h2>
          <p className="text-gray-600 mb-6">제목, 설명, 작가명으로 검색하세요</p>
          
          {/* 검색 & 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* 검색 */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="제목, 설명, 작가명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 카테고리 필터 */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
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

            {/* 언어 필터 */}
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
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
          </div>

          {/* 정렬 */}
          <div className="flex items-center gap-4 mb-4">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'recent' | 'popular' | 'views')}>
              <SelectTrigger className="w-40">
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

            {/* 결과 개수 */}
            <p className="text-sm text-gray-500">
              {filteredDocs.length}개의 문서
              {searchQuery && ` (검색어: "${searchQuery}")`}
            </p>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery || selectedCategory !== 'all' || selectedLanguage !== 'all'
                ? '검색 결과가 없습니다' 
                : '아직 문서가 없습니다'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}