'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Eye, ThumbsUp, BookOpen as ReadIcon, FileText, Users, Clock, Calendar, Crown, Award, Share2 } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { SubscribeButton } from '@/components/subscribe-button'
import { Button } from '@/components/ui/button'

type TabType = 'documents' | 'about'

export default function AuthorPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const authorId = params.authorId as string

  const [author, setAuthor] = useState<(Profile & { bio?: string; banner_url?: string }) | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('documents')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'likes'>('recent')
  const [totalReadingTime, setTotalReadingTime] = useState(0)
  const [totalViews, setTotalViews] = useState(0)

  useEffect(() => {
    loadAuthorData()
  }, [authorId])

  const loadAuthorData = async () => {
    try {
      const { data: authorData, error: authorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authorId)
        .single()
      if (authorError) throw authorError
      setAuthor(authorData)

      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', authorId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (docsError) throw docsError
      setDocuments(docs || [])

      const views = docs?.reduce((s, d) => s + d.view_count, 0) || 0
      const time = docs?.reduce((s, d) => s + d.total_reading_time, 0) || 0
      setTotalViews(views)
      setTotalReadingTime(time)
    } catch (err) {
      console.error('Error loading author data:', err)
    } finally {
      setLoading(false)
    }
  }

  const sortedDocuments = [...documents].sort((a, b) => {
    switch (sortBy) {
      case 'popular': return b.view_count - a.view_count
      case 'likes': return b.likes_count - a.likes_count
      case 'recent': default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: `${author?.username || '작가'} - Textry`, url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('링크가 복사되었습니다!')
    }
  }

  const isPremium = author?.is_premium && author?.premium_expires_at
    ? new Date(author.premium_expires_at) > new Date()
    : false

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Link href={`/read/${doc.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3">
          {doc.thumbnail_url ? (
            <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><div className="text-6xl opacity-20">📄</div></div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <ReadIcon className="w-6 h-6 text-black" />
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
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">{doc.title}</h3>
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{doc.description || '설명이 없습니다'}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count.toLocaleString()}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{doc.likes_count.toLocaleString()}</span>
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">작가를 찾을 수 없습니다</p>
          <button onClick={() => router.push('/home')} className="text-blue-600 hover:underline">홈으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 */}
      <div className="relative w-full aspect-[5/1] md:aspect-[6/1] bg-gradient-to-r from-blue-600 to-purple-700 overflow-hidden">
        {author.banner_url ? (
          <img src={author.banner_url} alt="배너" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 opacity-80" />
        )}
      </div>

      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto">
          {/* 프로필 헤더 */}
          <div className="flex flex-col md:flex-row items-start gap-6 -mt-12 md:-mt-16 mb-6 relative z-10">
            {/* 아바타 */}
            <div className="relative">
              {author.avatar_url ? (
                <img src={author.avatar_url} alt={author.username || ''} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-4xl md:text-5xl font-bold border-4 border-white shadow-lg">
                  {(author.username || author.email)[0].toUpperCase()}
                </div>
              )}
              {/* 뱃지 */}
              {(author.author_tier || 0) >= 1 && (
                <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                  author.author_tier === 2 ? 'bg-purple-500' : 'bg-blue-500'
                }`}>
                  <Award className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{author.username || author.email}</h1>
                {isPremium && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
                {(author.author_tier || 0) >= 1 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    author.author_tier === 2 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {author.author_tier === 2 ? '프로 작가' : '파트너 작가'}
                  </span>
                )}
              </div>

              {author.bio && (
                <p className="text-sm text-gray-600 mt-2 max-w-xl">{author.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 구독자 {author.subscribers_count?.toLocaleString() || 0}명</span>
                <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> 문서 {documents.length}개</span>
                <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> 총 {totalViews.toLocaleString()}회</span>
              </div>

              <div className="flex items-center gap-3 mt-4">
                {user && user.id !== authorId && (
                  <SubscribeButton
                    authorId={authorId}
                    authorName={author.username || author.email}
                    initialSubscribersCount={author.subscribers_count || 0}
                  />
                )}
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-1">
                  <Share2 className="w-4 h-4" /> 공유
                </Button>
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              문서 ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'about' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              정보
            </button>
          </div>

          {/* 문서 탭 */}
          {activeTab === 'documents' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">총 {documents.length}개</p>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white">
                  <option value="recent">최신순</option>
                  <option value="popular">조회수순</option>
                  <option value="likes">좋아요순</option>
                </select>
              </div>
              {documents.length === 0 ? (
                <div className="text-center py-20"><p className="text-gray-500">아직 업로드한 문서가 없습니다</p></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {sortedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
                </div>
              )}
            </>
          )}

          {/* 정보 탭 */}
          {activeTab === 'about' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {author.bio && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">소개</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{author.bio}</p>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">통계</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                      <p className="text-xs text-gray-500">총 문서</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{(author.subscribers_count || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">구독자</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">총 조회수</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.floor(totalReadingTime / 3600) > 0
                          ? `${Math.floor(totalReadingTime / 3600)}시간`
                          : `${Math.floor(totalReadingTime / 60)}분`
                        }
                      </p>
                      <p className="text-xs text-gray-500">총 읽기 시간</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">정보</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> 가입일: {new Date(author.created_at).toLocaleDateString()}</p>
                    <p className="flex items-center gap-2"><Eye className="w-4 h-4" /> 이메일: {author.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
