'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, Document } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { DollarSign, Eye, Clock, FileText, Users, Trash2, Play, Image as ImageIcon } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function DashboardPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState({
    totalViews: 0,
    totalReadingTime: 0,
    totalRevenue: 0,
    subscribersCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [editingThumbnail, setEditingThumbnail] = useState<string | null>(null)
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

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

      // 썸네일도 삭제
      if (doc.thumbnail_url) {
        const thumbPath = doc.thumbnail_url.split('/').slice(-2).join('/')
        await supabase.storage.from('thumbnails').remove([thumbPath])
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

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('썸네일 크기는 5MB 이하여야 합니다.')
        return
      }
      if (!selectedFile.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }
      setNewThumbnail(selectedFile)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUpdateThumbnail = async (docId: string, oldThumbnailUrl: string | null) => {
    if (!newThumbnail || !user) return

    try {
      // 기존 썸네일 삭제
      if (oldThumbnailUrl) {
        const oldPath = oldThumbnailUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('thumbnails').remove([oldPath])
      }

      // 새 썸네일 업로드
      const thumbExt = newThumbnail.name.split('.').pop()
      const thumbFileName = `${user.id}/${Date.now()}.${thumbExt}`

      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbFileName, newThumbnail)

      if (uploadError) throw uploadError

      const { data: thumbUrlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(thumbFileName)

      // DB 업데이트
      const { error: updateError } = await supabase
        .from('documents')
        .update({ thumbnail_url: thumbUrlData.publicUrl })
        .eq('id', docId)

      if (updateError) throw updateError

      alert('썸네일이 변경되었습니다.')
      setEditingThumbnail(null)
      setNewThumbnail(null)
      setThumbnailPreview(null)
      loadDashboard()
    } catch (err) {
      console.error('Error updating thumbnail:', err)
      alert('썸네일 변경에 실패했습니다.')
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <div className="group">
      <Link href={`/read/${doc.id}`}>
        <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3 cursor-pointer">
          {doc.thumbnail_url ? (
            <img
              src={doc.thumbnail_url}
              alt={doc.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl opacity-20">📄</div>
            </div>
          )}
          
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

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingThumbnail(doc.id)
              setNewThumbnail(null)
              setThumbnailPreview(null)
            }}
            className="flex-1 h-8 text-xs"
          >
            <ImageIcon className="w-3 h-3 mr-1" />
            썸네일
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(doc)}
            className="flex-1 h-8 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            삭제
          </Button>
        </div>
      </div>
    </div>
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로그인이 필요합니다.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  const editingDoc = documents.find(d => d.id === editingThumbnail)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[2000px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">대시보드</h2>
            <Link href="/upload">
              <Button>새 문서 업로드</Button>
            </Link>
          </div>

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
            <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              내 문서 ({documents.length}개)
            </h3>

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 썸네일 변경 다이얼로그 */}
      <Dialog open={!!editingThumbnail} onOpenChange={() => {
        setEditingThumbnail(null)
        setNewThumbnail(null)
        setThumbnailPreview(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>썸네일 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {editingDoc && (
              <>
                {/* 현재 썸네일 */}
                <div>
                  <Label>현재 썸네일</Label>
                  <div className="mt-2 w-48 aspect-[3/4] rounded-lg overflow-hidden border bg-gray-100">
                    {editingDoc.thumbnail_url ? (
                      <img
                        src={editingDoc.thumbnail_url}
                        alt="현재 썸네일"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-6xl opacity-20">📄</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 새 썸네일 선택 */}
                <div>
                  <Label htmlFor="new-thumbnail">새 썸네일</Label>
                  <Input
                    id="new-thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    권장: 600x800px (3:4 비율), 최대 5MB
                  </p>
                </div>

                {/* 미리보기 */}
                {thumbnailPreview && (
                  <div>
                    <Label>미리보기</Label>
                    <div className="mt-2 w-48 aspect-[3/4] rounded-lg overflow-hidden border">
                      <img
                        src={thumbnailPreview}
                        alt="미리보기"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingThumbnail(null)
                      setNewThumbnail(null)
                      setThumbnailPreview(null)
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={() => handleUpdateThumbnail(editingDoc.id, editingDoc.thumbnail_url)}
                    disabled={!newThumbnail}
                  >
                    변경
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}