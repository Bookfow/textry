'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, ThumbsUp, TrendingUp, Heart, Search, Sparkles, Filter, BookOpen } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel, CATEGORIES } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { DocumentCard } from '@/components/document-card'

const PAGE_SIZE = 24

function BrowseContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const sort = searchParams.get('sort') || 'recent'
  const category = searchParams.get('category') || 'all'

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || (key === 'sort' && value === 'recent')) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/browse${params.toString() ? '?' + params.toString() : ''}`)
  }

  useEffect(() => {
    setHasMore(true)
    loadDocuments(true)
  }, [sort, category, user])

  const loadDocuments = async (isInitial = true) => {
    try {
      if (isInitial) {
        setLoading(true)
        setDocuments([])
      } else {
        setLoadingMore(true)
      }

      const offset = isInitial ? 0 : documents.length

      let query = supabase.from('documents').select('*').eq('is_published', true)

      if (category !== 'all') query = query.eq('category', category)

      if (sort === 'popular') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', sevenDaysAgo)
      } else if (sort === 'views') {
        query = query.order('view_count', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      query = query.range(offset, offset + PAGE_SIZE - 1)

      const { data, error } = await query
      if (error) throw error

      let sorted = data || []
      if (sort === 'popular') {
        const now = Date.now()
        sorted = sorted.sort((a, b) => {
          const scoreA = (a.likes_count * 3) + (a.view_count * 1) + Math.max(0, 7 - ((now - new Date(a.created_at).getTime()) / (24*60*60*1000))) * 5
          const scoreB = (b.likes_count * 3) + (b.view_count * 1) + Math.max(0, 7 - ((now - new Date(b.created_at).getTime()) / (24*60*60*1000))) * 5
          return scoreB - scoreA
        })
      }

      if (sorted.length < PAGE_SIZE) setHasMore(false)
      else setHasMore(true)

      if (isInitial) setDocuments(sorted)
      else setDocuments(prev => [...prev, ...sorted])

      if (sorted.length > 0) {
        const authorIds = [...new Set(sorted.map(doc => doc.author_id))]
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', authorIds)
        if (profilesData) {
          setAuthors(prev => {
            const newMap = new Map(prev)
            profilesData.forEach(p => newMap.set(p.id, p))
            return newMap
          })
        }
      }
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const sortOptions = [
    { value: 'recent', label: '최신순', icon: Sparkles },
    { value: 'popular', label: '인기순', icon: TrendingUp },
    { value: 'views', label: '조회수순', icon: Eye },
  ]

  if (loading) {
    return (
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="animate-pulse space-y-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-9 w-20 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-xl" />
                <div className="h-4 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-3/4" />
                <div className="h-3 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">

      {/* ━━━ 카테고리 탭 ━━━ */}
      <div className="mb-5 -mx-4 px-4 relative">
        <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 pb-2 min-w-max">
          <Link href="/"
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D] transition-colors"
          >
            🏠
          </Link>
          <button
            onClick={() => updateParams('category', 'all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              category === 'all'
                ? 'bg-[#B2967D] text-white shadow-sm'
                : 'bg-white dark:bg-[#241E18] text-[#5C4A38] dark:text-[#C4A882] border border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D] hover:text-[#B2967D]'
            }`}
          >
            전체
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => updateParams('category', cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                category === cat.value
                  ? 'bg-[#B2967D] text-white shadow-sm'
                  : 'bg-white dark:bg-[#241E18] text-[#5C4A38] dark:text-[#C4A882] border border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D] hover:text-[#B2967D]'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        </div>
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#F7F2EF] dark:from-[#1A1410] to-transparent pointer-events-none md:hidden" />
      </div>

      {/* ━━━ 정렬 + 결과 수 ━━━ */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">
            {category === 'all' ? '전체 문서' : `${getCategoryIcon(category)} ${getCategoryLabel(category)}`}
          </h1>
          <span className="text-sm text-[#9C8B7A]">{documents.length}개</span>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-full p-1">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => updateParams('sort', opt.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                sort === opt.value
                  ? 'bg-[#B2967D] text-white'
                  : 'text-[#9C8B7A] hover:text-[#5C4A38] dark:hover:text-[#C4A882]'
              }`}
            >
              <opt.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ━━━ 문서 그리드 ━━━ */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-6">
            <div className="absolute inset-0 -m-4 bg-gradient-to-br from-[#E6BEAE]/30 to-[#B2967D]/20 rounded-full blur-xl opacity-60" />
            <div className="relative w-20 h-20 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-[#B2967D]" />
            </div>
          </div>
          <p className="text-lg font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-2">문서가 없습니다</p>
          <p className="text-sm text-[#9C8B7A] mb-6 text-center max-w-xs">
            {category !== 'all'
              ? `${getCategoryLabel(category)} 카테고리에 아직 문서가 없습니다.`
              : '새로운 문서가 곧 등록될 예정입니다.'
            }
          </p>
          {category !== 'all' && (
            <button
              onClick={() => updateParams('category', 'all')}
              className="px-5 py-2.5 bg-[#B2967D] hover:bg-[#a67c52] text-white text-sm font-medium rounded-full transition-colors"
            >
              전체 보기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {documents.map(doc => {
            const author = authors.get(doc.author_id)
            return (
              <DocumentCard
                key={doc.id}
                doc={doc}
                authorName={author?.username || author?.email}
                variant="grid"
              />
            )
          })}
        </div>
      )}

      {/* ━━━ 더보기 ━━━ */}
      {!loading && documents.length > 0 && hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => loadDocuments(false)}
            disabled={loadingMore}
            className="px-8 py-3 bg-white dark:bg-[#241E18] text-[#5C4A38] dark:text-[#C4A882] border border-[#E7D8C9] dark:border-[#3A302A] rounded-full hover:border-[#B2967D] hover:text-[#B2967D] transition-all text-sm font-medium disabled:opacity-50"
          >
            {loadingMore ? '로딩 중...' : '더보기'}
          </button>
        </div>
      )}
    </main>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="animate-pulse space-y-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-9 w-20 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-xl" />
                <div className="h-4 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-3/4" />
                <div className="h-3 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </main>
    }>
      <BrowseContent />
    </Suspense>
  )
}
