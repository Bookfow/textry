'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase, Document } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Upload, FileText, Eye, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'author')) {
      router.push('/')
      return
    }

    if (user) {
      loadDocuments()
    }
  }, [user, profile, loading, router])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoadingDocs(false)
    }
  }

  if (loading || loadingDocs) {
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-blue-600">Textry</h1>
          </Link>
          <div className="flex gap-2">
            <Link href="/upload">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                업로드
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">작가 대시보드</h2>
          <p className="text-gray-600">업로드한 문서를 관리하세요</p>
        </div>

        {/* 통계 카드 - 4개로 수정 */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">총 문서</CardTitle>
              <FileText className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">총 조회수</CardTitle>
              <Eye className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.reduce((sum, doc) => sum + doc.view_count, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">총 읽기 시간</CardTitle>
              <Clock className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(documents.reduce((sum, doc) => sum + doc.total_reading_time, 0) / 60)}분
              </div>
            </CardContent>
          </Card>

          {/* 수익 카드 추가 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">예상 수익</CardTitle>
              <span className="text-lg">💰</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₩{Math.floor(
                  documents.reduce((sum, doc) => sum + doc.total_reading_time, 0) / 60 * 10
                ).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                분당 ₩10 기준
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 문서 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>내 문서</CardTitle>
            <CardDescription>업로드한 문서 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">아직 업로드한 문서가 없습니다</p>
                <Link href="/upload">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    첫 문서 업로드하기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{doc.title}</h3>
                      <p className="text-sm text-gray-500">{doc.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <span>조회수: {doc.view_count}</span>
                        <span>읽기 시간: {Math.floor(doc.total_reading_time / 60)}분</span>
                        <span>
                          {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    <Link href={`/read/${doc.id}`}>
                      <Button variant="outline">보기</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}