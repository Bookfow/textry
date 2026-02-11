'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, Document } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DollarSign, Eye, Clock, FileText, Users, Trash2, Play } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { NotificationsBell } from '@/components/notifications-bell'
import { ProfileMenu } from '@/components/profile-menu'

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
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (docsError) throw docsError

      setDocuments(docs || [])

      const totalViews = docs?.reduce((sum, doc) => sum + doc.view_count, 0) || 0
      const totalReadingTime = docs?.reduce((sum, doc) => sum + doc.total_reading_time, 0) || 0
      
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('author_id', user.id)

      const subscribersCount = subs?.length || 0

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
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      alert('문서가 삭제되었습니다.')
      
      setDocuments(documents.filter(d => d.id !== doc.id))
      
      loadDashboard()
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('문서 삭제에 실패했습니다.')
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <div className="group">
      <Link href={`/read/${doc.id}`}>
        <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3 cursor-pointer">
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
        
        <p className="text-xs text-gray-600 line-clamp-1 mb-2">
          {doc.description || '설명이 없습니다'}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {doc.view_count}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {Math.floor(doc.total_reading_time / 60)}분
          </span>
          <span className="text-green-600 font-semibold">
            ${((doc.view_count * 0.01) + ((doc.total_reading_time / 60) * 0.05)).toFixed(2)}
          </span>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleDelete(doc)}
          className="w-full h-8 text-xs"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          삭제
        </Button>
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

          <div className="hidden md:flex flex-1 max-w-2xl mx-4 justify-center">
            <Link href="/upload">
              <Button>새 문서 업로드</Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {user && <NotificationsBell />}
            {user && <ProfileMenu />}
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[2000px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">대시보드</h2>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">총 조회수</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <p className="text-xl md:text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">총 읽기 시간</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <p className="text-xl md:text-2xl font-bold">{Math.floor(stats.totalReadingTime / 60)}분</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">구독자</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <p className="text-xl md:text-2xl font-bold">{stats.subscribersCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">예상 수익</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-600" />
                  <p className="text-xl md:text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 내 문서 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                내 문서 ({documents.length})
              </h3>
              <Link href="/upload" className="md:hidden">
                <Button size="sm">업로드</Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                {documents.map((doc) => (
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