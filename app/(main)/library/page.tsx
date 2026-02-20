'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Heart, Clock, Grid, BookMarked } from 'lucide-react'
import { DocumentCard } from '@/components/document-card'

type ReadingDoc = {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  category: string
  view_count: number
  likes_count: number
  page_count: number
  current_page: number
  last_read_at: string
  authorName: string
}

type FavDoc = {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  category: string
  view_count: number
  likes_count: number
  page_count: number
  authorName: string
}

type TabType = 'reading' | 'favorites'
type ViewMode = 'shelf' | 'grid'

export default function LibraryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('reading')
  const [viewMode, setViewMode] = useState<ViewMode>('shelf')
  const [readingDocs, setReadingDocs] = useState<ReadingDoc[]>([])
  const [favDocs, setFavDocs] = useState<FavDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadLibrary()
  }, [user])

  const loadLibrary = async () => {
    if (!user) return
    try {
      // 이어읽기
      const { data: sessions } = await supabase
        .from('reading_sessions')
        .select('document_id, current_page, last_read_at')
        .eq('reader_id', user.id)
        .eq('completed', false)
        .order('last_read_at', { ascending: false })

      if (sessions && sessions.length > 0) {
        const docIds = [...new Set(sessions.map(s => s.document_id))]
        const { data: documents } = await supabase
          .from('documents')
          .select('id, title, description, thumbnail_url, category, view_count, likes_count, page_count, author_id')
          .in('id', docIds)
          .eq('is_published', true)

        if (documents) {
          const authorIds = [...new Set(documents.map(d => d.author_id))]
          const { data: profiles } = await supabase
            .from('profiles').select('id, username, email').in('id', authorIds)
          const profileMap = new Map((profiles || []).map(p => [p.id, p]))

          const latestSessions = new Map<string, typeof sessions[0]>()
          sessions.forEach(s => {
            if (!latestSessions.has(s.document_id)) latestSessions.set(s.document_id, s)
          })

          const result: ReadingDoc[] = []
          latestSessions.forEach((session, docId) => {
            const doc = documents.find(d => d.id === docId)
            if (!doc) return
            const author = profileMap.get(doc.author_id)
            result.push({
              id: doc.id, title: doc.title, description: doc.description,
              thumbnail_url: doc.thumbnail_url, category: doc.category || '',
              view_count: doc.view_count || 0, likes_count: doc.likes_count || 0,
              page_count: doc.page_count || 1, current_page: session.current_page,
              last_read_at: session.last_read_at,
              authorName: author?.username || author?.email || '',
            })
          })
          setReadingDocs(result)
        }
      }

      // 찜한 콘텐츠
      const { data: favData } = await supabase
        .from('reading_list')
        .select('document_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (favData && favData.length > 0) {
        const favDocIds = favData.map(f => f.document_id)
        const { data: documents } = await supabase
          .from('documents')
          .select('id, title, description, thumbnail_url, category, view_count, likes_count, page_count, author_id')
          .in('id', favDocIds)
          .eq('is_published', true)

        if (documents) {
          const authorIds = [...new Set(documents.map(d => d.author_id))]
          const { data: profiles } = await supabase
            .from('profiles').select('id, username, email').in('id', authorIds)
          const profileMap = new Map((profiles || []).map(p => [p.id, p]))

          const result: FavDoc[] = favDocIds
            .map(id => documents.find(d => d.id === id))
            .filter(Boolean)
            .map(doc => {
              const author = profileMap.get(doc!.author_id)
              return {
                id: doc!.id, title: doc!.title, description: doc!.description,
                thumbnail_url: doc!.thumbnail_url, category: doc!.category || '',
                view_count: doc!.view_count || 0, likes_count: doc!.likes_count || 0,
                page_count: doc!.page_count || 1,
                authorName: author?.username || author?.email || '',
              }
            })
          setFavDocs(result)
        }
      }
    } catch (err) {
      console.error('Error loading library:', err)
    } finally {
      setLoading(false)
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

  // ━━━ 책장 선반 컴포넌트 ━━━
  const BookShelf = ({ docs, type }: { docs: (ReadingDoc | FavDoc)[]; type: TabType }) => {
    // 한 선반에 들어갈 책 수 (반응형)
    const booksPerShelf = 6
    const shelves: (ReadingDoc | FavDoc)[][] = []
    for (let i = 0; i < docs.length; i += booksPerShelf) {
      shelves.push(docs.slice(i, i + booksPerShelf))
    }

    return (
      <div className="space-y-4">
        {shelves.map((shelf, shelfIndex) => (
          <div key={shelfIndex} className="relative">
            {/* 상단 선반 */}
            <div className="relative">
              <div className="h-[10px] bg-gradient-to-b from-[#C4A27A] to-[#A8885C] dark:from-[#6B5740] dark:to-[#5A4835] rounded-t-sm shadow-inner" />
              <div className="h-[14px] bg-gradient-to-b from-[#A8885C] to-[#8B7049] dark:from-[#5A4835] dark:to-[#4A3C2C]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0,0,0,0.05) 60px, rgba(0,0,0,0.05) 61px)' }} />
            </div>
            {/* 책들 */}
            <div className="flex items-end gap-3 sm:gap-4 px-4 sm:px-6 pt-4 pb-8 overflow-x-auto scrollbar-hide">
              {shelf.map(doc => {
                const progress = type === 'reading' && 'current_page' in doc
                  ? doc.page_count > 0 ? Math.round((doc.current_page / doc.page_count) * 100) : 0
                  : null

                return (
                  <Link key={doc.id} href={type === 'reading' ? `/read/${doc.id}` : `/document/${doc.id}`}>
                    <div className="group flex-shrink-0 w-[100px] sm:w-[120px] md:w-[130px] cursor-pointer transition-all duration-300 hover:-translate-y-2">
                      {/* 책 표지 */}
                      <div className="relative aspect-[3/4] rounded-sm overflow-hidden shadow-[4px_4px_8px_rgba(0,0,0,0.3)] ring-1 ring-black/10 dark:ring-white/5">
                        {doc.thumbnail_url ? (
                          <Image
                            src={doc.thumbnail_url}
                            alt={doc.title}
                            fill
                            sizes="(max-width: 640px) 100px, 130px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-white/60" />
                          </div>
                        )}

                        {/* 책등 효과 — 왼쪽 그림자 */}
                        <div className="absolute inset-y-0 left-0 w-[6px] bg-gradient-to-r from-black/30 to-transparent" />

                        {/* 진행률 배지 */}
                        {progress !== null && progress > 0 && (
                          <div className="absolute bottom-1.5 right-1.5">
                            <span className="px-1.5 py-0.5 bg-[#B2967D] text-white text-[9px] font-bold rounded shadow-sm">
                              {progress}%
                            </span>
                          </div>
                        )}

                        {/* 호버 오버레이 */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                      </div>
{/* 책 제목 */}
<div className="mt-2 px-0.5 h-[52px] sm:h-[56px]">
                        <h3 className="text-[11px] sm:text-xs font-medium line-clamp-2 text-[#2D2016] dark:text-[#EEE4E1] group-hover:text-[#B2967D] transition-colors leading-tight">
                          {doc.title}
                        </h3>
                        <p className="text-[10px] text-[#9C8B7A] truncate mt-0.5">{doc.authorName}</p>
                        {type === 'reading' && 'last_read_at' in doc && (
                          <p className="text-[9px] text-[#9C8B7A] flex items-center gap-0.5 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />{getTimeAgo(doc.last_read_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* 하단 선반 (뒤집은 모양) */}
            <div className="relative mt-1">
              <div className="h-[14px] bg-gradient-to-b from-[#8B7049] to-[#A8885C] dark:from-[#4A3C2C] dark:to-[#5A4835]"
              />
              <div className="h-[3px] bg-[#A8885C] dark:bg-[#5A4835]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 비로그인
  if (!user && !loading) {
    return (
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-[#B2967D]" />
          </div>
          <p className="text-lg font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-2">로그인이 필요합니다</p>
          <p className="text-sm text-[#9C8B7A] mb-6">내 서재를 이용하려면 로그인하세요</p>
          <button onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-[#B2967D] hover:bg-[#a67c52] text-white rounded-full text-sm font-medium transition-colors">
            로그인하기
          </button>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-32" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full" />
            <div className="h-9 w-24 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full" />
          </div>
          {/* 선반 스켈레톤 */}
          {[1, 2].map(i => (
            <div key={i}>
              <div className="flex gap-4 px-6 pt-6 pb-2">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="w-[120px] aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-sm" />
                ))}
              </div>
              <div className="h-[10px] bg-[#E7D8C9] dark:bg-[#3A302A] rounded-t-sm" />
              <div className="h-[14px] bg-[#E7D8C9] dark:bg-[#3A302A]" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  const currentDocs = activeTab === 'reading' ? readingDocs : favDocs

  return (
    <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 pb-20 lg:pb-6">
      {/* 타이틀 + 뷰 토글 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">내 서재</h1>
        <div className="flex items-center gap-1 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('shelf')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'shelf' ? 'bg-white dark:bg-[#3A302A] shadow-sm text-[#B2967D]' : 'text-[#9C8B7A] hover:text-[#B2967D]'
            }`}
            title="책장 보기"
          >
            <BookMarked className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'grid' ? 'bg-white dark:bg-[#3A302A] shadow-sm text-[#B2967D]' : 'text-[#9C8B7A] hover:text-[#B2967D]'
            }`}
            title="그리드 보기"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('reading')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'reading'
              ? 'bg-[#B2967D] text-white'
              : 'bg-white dark:bg-[#241E18] text-[#5C4A38] dark:text-[#C4A882] border border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          읽고 있는 ({readingDocs.length})
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'favorites'
              ? 'bg-[#B2967D] text-white'
              : 'bg-white dark:bg-[#241E18] text-[#5C4A38] dark:text-[#C4A882] border border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D]'
          }`}
        >
          <Heart className="w-4 h-4" />
          찜한 ({favDocs.length})
        </button>
      </div>

      {/* 콘텐츠 */}
      {currentDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full flex items-center justify-center mb-3">
            {activeTab === 'reading' ? (
              <BookOpen className="w-8 h-8 text-[#B2967D]" />
            ) : (
              <Heart className="w-8 h-8 text-[#B2967D]" />
            )}
          </div>
          <p className="text-[#2D2016] dark:text-[#EEE4E1] font-medium mb-1">
            {activeTab === 'reading' ? '읽고 있는 문서가 없어요' : '찜한 문서가 없어요'}
          </p>
          <p className="text-sm text-[#9C8B7A] mb-4">
            {activeTab === 'reading' ? '문서를 읽기 시작하면 여기에 표시됩니다' : '마음에 드는 문서를 찜해보세요'}
          </p>
          <Link href="/home" className="px-5 py-2 bg-[#B2967D] hover:bg-[#a67c52] text-white rounded-full text-sm font-medium transition-colors">
            둘러보기
          </Link>
        </div>
      ) : viewMode === 'shelf' ? (
        /* ━━━ 책장 보기 ━━━ */
        <div className="bg-gradient-to-b from-[#F5EDE6] to-[#EDE3DA] dark:from-[#241E18] dark:to-[#1E1812] rounded-2xl overflow-hidden border border-[#E7D8C9] dark:border-[#3A302A] shadow-inner">
          <BookShelf docs={currentDocs} type={activeTab} />

          </div>
      ) : (
        /* ━━━ 그리드 보기 ━━━ */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {activeTab === 'reading' ? (
            readingDocs.map(doc => {
              const progress = doc.page_count > 0 ? Math.round((doc.current_page / doc.page_count) * 100) : 0
              return (
                <Link key={doc.id} href={`/read/${doc.id}`}>
                  <div className="group cursor-pointer transition-all duration-200 hover:-translate-y-1">
                    <div className="relative aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-xl overflow-hidden mb-2 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] group-hover:shadow-lg transition-shadow">
                      {doc.thumbnail_url ? (
                        <Image src={doc.thumbnail_url} alt={doc.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-[#E7D8C9]" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0">
                        <div className="h-1.5 bg-black/20">
                          <div className="h-full bg-gradient-to-r from-[#B2967D] to-[#E6BEAE]" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <div className="absolute bottom-3 right-2">
                        <span className="px-2 py-0.5 bg-[#B2967D] text-white text-[10px] font-bold rounded-full shadow-sm">
                          {progress}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-[#B2967D] transition-colors text-[#2D2016] dark:text-[#EEE4E1]">
                        {doc.title}
                      </h3>
                      <p className="text-[11px] text-[#9C8B7A] truncate mb-1">{doc.authorName}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#9C8B7A]">
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{getTimeAgo(doc.last_read_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })
          ) : (
            favDocs.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                authorName={doc.authorName}
                variant="grid"
              />
            ))
          )}
        </div>
      )}
    </main>
  )
}
