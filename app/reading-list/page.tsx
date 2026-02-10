'use client'

import { useEffect, useState } from 'react'
import { supabase, Document } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Clock, ThumbsUp, BookmarkX } from 'lucide-react'

export default function ReadingListPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    loadReadingList()
  }, [user])

  const loadReadingList = async () => {
    if (!user) return

    try {
      // 읽기 목록 가져오기
      const { data: listData, error: listError } = await supabase
        .from('reading_list')
        .select('document_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (listError) throw listError

      if (!listData || listData.length === 0) {
        setDocuments([])
        setLoading(false)
        return
      }

      const documentIds = listData.map(item => item.document_id)

      // 문서 정보 가져오기
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds)

      if (docsError) throw docsError

      setDocuments(docsData || [])
    } catch (err) {
      console.error('Error loading reading list:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (documentId: string) => {
    if (!user) return

    try {
      await supabase
        .from('reading_list')
        .delete()
        .eq('user_id', user.id)
        .eq('document_id', documentId)

      // 목록에서 제거
      setDocuments(documents.filter(doc => doc.id !== documentId))
    } catch (err) {
      console.error('Error removing from reading list:', err)
      alert('제거에 실패했습니다.')
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemove(doc.id)}
            className="gap-2"
          >
            <BookmarkX className="w-4 h-4" />
            제거
          </Button>
          <Link href={`/read/${doc.id}`} className="flex-1">
            <Button className="w-full">읽기</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )

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
            <div className="flex gap-4">
              <Link href="/browse">
                <Button variant="ghost">둘러보기</Button>
              </Link>
              {user?.role === 'author' && (
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
                router.push('/login')
              }}>
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4">읽기 목록</h2>
          <p className="text-gray-600">나중에 읽을 문서 {documents.length}개</p>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">읽기 목록이 비어있습니다</p>
            <Link href="/browse">
              <Button>문서 둘러보기</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}