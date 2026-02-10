'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, Document } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DollarSign, Eye, Clock, FileText, Users, Trash2 } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { NotificationsBell } from '@/components/notifications-bell'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState({
    totalViews: 0,
    totalReadingTime: 0,
    totalRevenue: 0,
    subscribersCount: 0,
  })
  const [loading, setLoading] = useState(true)

  // 작가 권한 확인
  if (!user || profile?.role !== 'author') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>작가 계정만 대시보드에 접근할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/home')}>홈으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    if (user) {
      loadDashboard()
    }
  }, [user])

  const loadDashboard = async () => {
    if (!user) return

    try {
      // 1. 내 문서 가져오기
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (docsError) throw docsError

      setDocuments(docs || [])

      // 2. 통계 계산
      const totalViews = docs?.reduce((sum, doc) => sum + doc.view_count, 0) || 0
      const totalReadingTime = docs?.reduce((sum, doc) => sum + doc.total_reading_time, 0) || 0
      
      // 3. 구독자 수
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('author_id', user.id)

      const subscribersCount = subs?.length || 0

      // 4. 예상 수익 계산 (조회수 * 0.01 + 읽기시간(분) * 0.05)
      const totalRevenue = (totalViews * 0.01) + ((totalReadingTime / 60) * 0.05)

      setStats({
        totalViews,
        totalReadingTime,
        totalRevenue,
        subscribersCount,
      })
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`"${doc.title}" 문서를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      // 1. Storage에서 PDF 파일 삭제
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }

      // 2. 데이터베이스에서 문서 삭제 (CASCADE로 관련 데이터 자동 삭제)
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      alert('문서가 삭제되었습니다.')
      
      // 목록에서 제거
      setDocuments(documents.filter(d => d.id !== doc.id))
      
      // 통계 재계산
      loadDashboard()
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('문서 삭제에 실패했습니다.')
    }
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
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/home">
              <h1 className="text-2xl font-bold text-blue-600">Textry</h1>
            </Link>
            <div className="flex gap-4 items-center">
              <Link href="/upload">
                <Button>새 문서 업로드</Button>
              </Link>
              {user && <NotificationsBell />}
              <Button variant="ghost" onClick={() => {
                supabase.auth.signOut()
                router.push('/')
              }}>
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">대시보드</h2>

        {/* 통계 카드 */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 조회수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 읽기 시간</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                <p className="text-2xl font-bold">{Math.floor(stats.totalReadingTime / 60)}분</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>구독자</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <p className="text-2xl font-bold">{stats.subscribersCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>예상 수익</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-600" />
                <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 내 문서 목록 */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              내 문서 ({documents.length})
            </h3>
            <Link href="/upload">
              <Button>새 문서 업로드</Button>
            </Link>
          </div>

          {documents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-4">아직 업로드한 문서가 없습니다</p>
                <Link href="/upload">
                  <Button>첫 문서 업로드하기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow">
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
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {doc.view_count} 조회
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {Math.floor(doc.total_reading_time / 60)}분
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600 font-semibold">
                          ${((doc.view_count * 0.01) + ((doc.total_reading_time / 60) * 0.05)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Link href={`/read/${doc.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">보기</Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}