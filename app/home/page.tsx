'use client'

import { useEffect, useState } from 'react'
import { supabase, Document } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Clock, ThumbsUp, Play } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { NotificationsBell } from '@/components/notifications-bell'
import { ProfileMenu } from '@/components/profile-menu'
import { Sidebar } from '@/components/sidebar'

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [recommendedDocs, setRecommendedDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendedDocs()
  }, [user])

  // 로그인 안 한 사용자는 랜딩 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const loadRecommendedDocs = async () => {
    try {
      let allDocs: Document[] = []

      if (user) {
        // 1. 이어 읽기 (최우선)
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

          if (continueDocs) allDocs.push(...continueDocs)
        }

        // 2. 구독 작가의 최신 문서
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

          if (subDocs) allDocs.push(...subDocs)
        }
      }

      // 3. 인기 문서로 채우기
      const { data: popularDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('is_published', true)
        .order('likes_count', { ascending: false })
        .limit(20)

      if (popularDocs) allDocs.push(...popularDocs)

      // 중복 제거
      const uniqueDocs = Array.from(
        new Map(allDocs.map(doc => [doc.id, doc])).values()
      )

      setRecommendedDocs(uniqueDocs)
    } catch (err) {
      console.error('Error loading recommended docs:', err)
    } finally {
      setLoading(false)
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Link href={`/read/${doc.id}`}>
      <div className="group cursor-pointer">
        {/* 썸네일 */}
        <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3">
          {/* PDF 아이콘 중앙 */}
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

          {/* 카테고리 & 언어 배지 */}
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

        {/* 정보 */}
        <div>
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {doc.title}
          </h3>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {doc.description || '설명이 없습니다'}
          </p>

          {/* 통계 */}
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
    <div className="flex min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <header className="sticky top-0 z-20 bg-white border-b">
          <div className="px-4 md:px-6 py-3 flex items-center justify-between">
            {/* 로고 (모바일에서는 중앙) */}
            <div className="flex-1 lg:flex-initial">
              <Link href="/home">
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Textry
                </h1>
              </Link>
            </div>

            {/* 검색바 (태블릿 이상) */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-4">
              <Link href="/browse" className="w-full">
                <div className="w-full px-4 py-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer text-sm">
                  문서 검색...
                </div>
              </Link>
            </div>

            {/* 우측 메뉴 */}
            <div className="flex items-center gap-2 md:gap-3">
              {user && <NotificationsBell />}
              {user && <ProfileMenu />}
            </div>
          </div>

          {/* 모바일 검색 */}
          <div className="md:hidden px-4 pb-3">
            <Link href="/browse">
              <div className="w-full px-4 py-2 bg-gray-100 rounded-full text-gray-500 text-sm">
                문서 검색...
              </div>
            </Link>
          </div>
        </header>

        {/* 메인 피드 */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-[2000px] mx-auto">
            {/* 추천 문서 그리드 */}
            {recommendedDocs.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 mb-4">추천할 문서가 없습니다</p>
                <Link href="/browse">
                  <Button>문서 둘러보기</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                {recommendedDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}