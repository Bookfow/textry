'use client'

import { useEffect, useState } from 'react'
import { supabase, Document } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, Sparkles, BookOpen, Eye, Clock, ThumbsUp } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [trendingDocs, setTrendingDocs] = useState<Document[]>([])
  const [subscribedDocs, setSubscribedDocs] = useState<Document[]>([])
  const [continueDocs, setContinueDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeeds()
  }, [user])

  // 로그인 안 한 사용자는 랜딩 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const loadFeeds = async () => {
    try {
      // 1. 인기 문서 (좋아요 + 조회수 기준)
      const { data: trending } = await supabase
        .from('documents')
        .select('*')
        .eq('is_published', true)
        .order('likes_count', { ascending: false })
        .limit(6)

      setTrendingDocs(trending || [])

      if (user) {
        // 2. 구독 중인 작가의 문서
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

          setSubscribedDocs(subDocs || [])
        }

        // 3. 이어 읽기 (읽다가 멈춘 문서)
        const { data: sessions } = await supabase
          .from('reading_sessions')
          .select('document_id')
          .eq('reader_id', user.id)
          .eq('completed', false)
          .order('last_read_at', { ascending: false })
          .limit(6)

        if (sessions && sessions.length > 0) {
          const docIds = sessions.map(s => s.document_id)
          const { data: continueDocs } = await supabase
            .from('documents')
            .select('*')
            .in('id', docIds)

          setContinueDocs(continueDocs || [])
        }
      }
    } catch (err) {
      console.error('Error loading feeds:', err)
    } finally {
      setLoading(false)
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{getCategoryIcon(doc.category)}</span>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
            {getCategoryLabel(doc.category)}
          </span>
        </div>
        <CardTitle className="line-clamp-2">{doc.title}</CardTitle>
        <CardDescription className="line-clamp-3">
          {doc.description || '설명이 없습니다'}
        </CardDescription>
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
        <Link href={`/read/${doc.id}`}>
          <Button className="w-full">읽기</Button>
        </Link>
      </CardContent>
    </Card>
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-blue-600">Textry</h1>
            </Link>
            <div className="flex gap-4">
              <Link href="/browse">
                <Button variant="ghost">둘러보기</Button>
              </Link>
              {user && (
                <Link href="/reading-list">
                  <Button variant="ghost">읽기 목록</Button>
                </Link>
              )}
              {user ? (
                <>
                  {profile?.role === 'author' && (
                    <>
                      <Link href="/upload">
                        <Button variant="ghost">업로드</Button>
                      </Link>
                      <Link href="/dashboard">
                        <Button variant="ghost">대시보드</Button>
                      </Link>
                    </>
                  )}
                  <Button variant="ghost" onClick={() => {
                    supabase.auth.signOut()
                    router.push('/')
                  }}>
                    로그아웃
                  </Button>
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
        {/* 인기 문서 */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold">인기 문서</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </section>

        {user && subscribedDocs.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-yellow-600" />
              <h2 className="text-2xl font-bold">구독 중인 작가</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscribedDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </section>
        )}

        {user && continueDocs.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold">이어 읽기</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {continueDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}