'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText } from 'lucide-react'

export default function UploadPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // 작가 권한 확인
  if (!user || profile?.role !== 'author') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>작가 계정만 문서를 업로드할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>홈으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드 가능합니다.')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB 제한
        setError('파일 크기는 10MB 이하여야 합니다.')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !user) return

    setUploading(true)
    setError('')

    try {
      // 1. 파일을 Supabase Storage에 업로드
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. 문서 메타데이터를 데이터베이스에 저장
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          author_id: user.id,
          title,
          description,
          file_path: filePath,
          file_size: file.size,
          is_published: true,
        })

      if (dbError) throw dbError

      alert('문서가 성공적으로 업로드되었습니다!')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-6 h-6" />
              문서 업로드
            </CardTitle>
            <CardDescription>
              PDF 문서를 업로드하고 독자들과 공유하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title">문서 제목 *</Label>
                <Input
                  id="title"
                  placeholder="예: AI 시대의 창작 활동"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* 설명 */}
              <div className="space-y-2">
                <Label htmlFor="description">문서 설명</Label>
                <Textarea
                  id="description"
                  placeholder="문서에 대한 간단한 설명을 입력하세요"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {/* 파일 업로드 */}
              <div className="space-y-2">
                <Label htmlFor="file">PDF 파일 *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <FileText className="w-12 h-12 text-gray-400" />
                    {file ? (
                      <div>
                        <p className="font-medium text-blue-600">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600">PDF 파일을 선택하세요</p>
                        <p className="text-sm text-gray-400">최대 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* 제출 버튼 */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={uploading || !file || !title}
                >
                  {uploading ? '업로드 중...' : '업로드'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}