'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'
import { FileText, Upload as UploadIcon } from 'lucide-react'

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('tech')
  const [language, setLanguage] = useState('ko')
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로그인이 필요합니다.</p>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        alert('파일 크기는 100MB 이하여야 합니다.')
        return
      }
      setFile(selectedFile)
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
      setThumbnail(selectedFile)
      
      // 미리보기
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !title.trim()) {
      alert('제목과 파일을 입력해주세요.')
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      setProgress(30)

      // 파일 업로드
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      setProgress(50)

      let thumbnailUrl = null

      // 썸네일 업로드 (있으면)
      if (thumbnail) {
        const thumbExt = thumbnail.name.split('.').pop()
        const thumbFileName = `${user.id}/${Date.now()}.${thumbExt}`

        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbFileName, thumbnail)

        if (thumbError) throw thumbError

        const { data: thumbUrlData } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(thumbFileName)

        thumbnailUrl = thumbUrlData.publicUrl
      }

      setProgress(70)

      // DB에 문서 정보 저장
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category,
          language,
          file_path: fileName,
          thumbnail_url: thumbnailUrl,
          author_id: user.id,
          file_size: file.size,
          total_reading_time: Math.floor(file.size / 1000),
          is_published: true
        })

      if (dbError) throw dbError

      setProgress(100)

      alert('업로드가 완료되었습니다!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(`업로드 실패: ${error.message}`)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">문서 업로드</h1>
            <p className="text-gray-600">새로운 문서를 공유하세요</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>문서 정보</CardTitle>
              <CardDescription>
                문서의 기본 정보를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-6">
                {/* 제목 */}
                <div className="space-y-2">
                  <Label htmlFor="title">제목 *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="문서 제목을 입력하세요"
                    required
                  />
                </div>

                {/* 설명 */}
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="문서에 대한 간단한 설명을 입력하세요"
                    rows={4}
                  />
                </div>

                {/* 카테고리 & 언어 */}
                <div className="space-y-4">
                <div className="space-y-2">
  <Label htmlFor="category">카테고리 *</Label>
  <Select value={category} onValueChange={setCategory}>
    <SelectTrigger id="category" className="min-w-[200px]">
      <SelectValue>
        {CATEGORIES.find(cat => cat.value === category)?.icon} {CATEGORIES.find(cat => cat.value === category)?.label}
      </SelectValue>
    </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:w-1/2">
                    <Label htmlFor="language">언어 *</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.flag} {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 썸네일 */}
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">썸네일 이미지 (선택)</Label>
                  <div className="flex flex-col gap-4">
                    <Input
                      id="thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      disabled={uploading}
                    />
                    <p className="text-xs text-gray-500">
                      권장: 600x800px (3:4 비율), 최대 5MB
                    </p>
                    {thumbnailPreview && (
                      <div className="w-48 aspect-[3/4] rounded-lg overflow-hidden border">
                        <img
                          src={thumbnailPreview}
                          alt="썸네일 미리보기"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 파일 */}
                <div className="space-y-2">
                  <Label htmlFor="file">문서 파일 *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                    accept=".txt,.pdf,.docx,.md"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    지원 형식: TXT, PDF, DOCX, MD (최대 100MB)
                  </p>
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{file.name}</span>
                      <span className="text-xs">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>

                {/* 진행률 */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      업로드 중... {progress}%
                    </p>
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    disabled={uploading}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading || !file || !title.trim()}
                    className="flex-1"
                  >
                    <UploadIcon className="w-4 h-4 mr-2" />
                    {uploading ? '업로드 중...' : '업로드'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}