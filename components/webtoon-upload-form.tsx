'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'
import { Upload as UploadIcon, X, GripVertical, ImagePlus } from 'lucide-react'
import { useToast } from '@/components/toast'

interface ImageItem {
  id: string
  file: File
  preview: string
  order: number
}

export default function WebtoonUploadForm() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('webtoon')
  const [language, setLanguage] = useState('ko')
  const [images, setImages] = useState<ImageItem[]>([])
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [copyrightAgreed, setCopyrightAgreed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const webtoonCategories = [
    { value: 'webtoon', label: '웹툰', icon: '🎨' },
    { value: 'manga', label: '만화', icon: '📖' },
    { value: 'illustration', label: '일러스트', icon: '🖼️' },
  ]

  // 이미지 추가
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const newImages: ImageItem[] = imageFiles.map((file, i) => ({
      id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      order: images.length + i,
    }))

    setImages(prev => [...prev, ...newImages])
    if (e.target) e.target.value = ''
  }

  // 이미지 삭제
  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      return filtered.map((img, i) => ({ ...img, order: i }))
    })
  }

  // 드래그 순서 변경
  const handleDragStart = (index: number) => { dragItemRef.current = index }
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragEnd = () => {
    if (dragItemRef.current === null || dragOverIndex === null) { setDragOverIndex(null); return }
    const newImages = [...images]
    const [removed] = newImages.splice(dragItemRef.current, 1)
    newImages.splice(dragOverIndex, 0, removed)
    setImages(newImages.map((img, i) => ({ ...img, order: i })))
    dragItemRef.current = null
    setDragOverIndex(null)
  }

  // 썸네일
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.warning('썸네일은 5MB 이하'); return }
    setThumbnail(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  // 업로드
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || images.length === 0 || !title.trim()) {
      toast.warning('제목과 이미지를 입력해주세요.')
      return
    }
    setUploading(true); setProgress(10); setProgressMessage('준비 중...')

    try {
      // 1. 썸네일 업로드
      let thumbnailUrl: string | null = null
      if (thumbnail) {
        setProgressMessage('썸네일 업로드 중...')
        const thumbExt = thumbnail.name.split('.').pop()
        const thumbPath = `${user.id}/${Date.now()}.${thumbExt}`
        const { error } = await supabase.storage.from('thumbnails').upload(thumbPath, thumbnail)
        if (!error) {
          const { data } = supabase.storage.from('thumbnails').getPublicUrl(thumbPath)
          thumbnailUrl = data.publicUrl
        }
      } else if (images.length > 0) {
        // 첫 이미지를 썸네일로
        setProgressMessage('첫 이미지로 썸네일 생성...')
        const firstImg = images[0].file
        const thumbExt = firstImg.name.split('.').pop()
        const thumbPath = `${user.id}/${Date.now()}_thumb.${thumbExt}`
        const { error } = await supabase.storage.from('thumbnails').upload(thumbPath, firstImg)
        if (!error) {
          const { data } = supabase.storage.from('thumbnails').getPublicUrl(thumbPath)
          thumbnailUrl = data.publicUrl
        }
      }
      setProgress(20)

      // 2. 이미지들 업로드
      setProgressMessage('이미지 업로드 중...')
      const uploadedImages: { url: string; order: number; width: number | null; height: number | null }[] = []

      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const ext = img.file.name.split('.').pop() || 'jpg'
        const storagePath = `webtoons/${user.id}/${Date.now()}_${i}.${ext}`

        const { error } = await supabase.storage.from('documents').upload(storagePath, img.file)
        if (error) { console.error('Image upload error:', error); continue }

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath)
        uploadedImages.push({
          url: urlData.publicUrl,
          order: i,
          width: null,
          height: null,
        })

        setProgress(20 + Math.round((i / images.length) * 50))
        setProgressMessage(`이미지 업로드 중... ${i + 1}/${images.length}`)
      }

      if (uploadedImages.length === 0) {
        toast.error('이미지 업로드에 실패했습니다.')
        setUploading(false); setProgress(0); return
      }

      setProgress(75); setProgressMessage('콘텐츠 정보 저장 중...')

      // 3. documents 테이블에 레코드 생성
      const { data: docData, error: docError } = await supabase.from('documents').insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        language,
        file_path: `webtoons/${user.id}`,
        thumbnail_url: thumbnailUrl,
        author_id: user.id,
        file_size: images.reduce((sum, img) => sum + img.file.size, 0),
        total_reading_time: images.length * 5,
        page_count: images.length,
        is_published: true,
        content_type: 'webtoon',
      }).select('id').single()

      if (docError) throw docError

      setProgress(85); setProgressMessage('이미지 순서 저장 중...')

      // 4. webtoon_images 테이블에 이미지 저장
      const imageRows = uploadedImages.map(img => ({
        document_id: docData.id,
        image_url: img.url,
        image_order: img.order,
        width: img.width,
        height: img.height,
      }))

      const { error: imgError } = await supabase.from('webtoon_images').insert(imageRows)
      if (imgError) console.error('webtoon_images insert error:', imgError)

      setProgress(100); setProgressMessage('완료!')
      toast.success('웹툰이 업로드되었습니다!')
      router.push('/dashboard')

    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(`업로드 실패: ${error.message}`)
    } finally {
      setUploading(false); setProgress(0); setProgressMessage('')
    }
  }

  const inputClass = "rounded-xl bg-[#EEE4E1]/50 dark:bg-[#2E2620] border-[#E7D8C9] dark:border-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] placeholder:text-[#9C8B7A] focus:border-[#B2967D] focus:ring-[#B2967D]"

  return (
    <div className="bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-sm">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-lg font-semibold text-[#2D2016] dark:text-[#EEE4E1]">웹툰 정보</h2>
        <p className="text-sm text-[#9C8B7A] mt-1">웹툰 이미지를 순서대로 업로드하세요</p>
      </div>
      <div className="px-6 pb-6">
        <form onSubmit={handleUpload} className="space-y-6">
          {/* 제목 */}
          <div className="space-y-2">
            <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">제목 *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="웹툰 제목" required className={inputClass} />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">설명</Label>
            <Textarea value={description} onChange={e => { if (e.target.value.length <= 50) setDescription(e.target.value) }}
              placeholder="간단한 설명 (최대 50자)" rows={2} maxLength={50} className={`${inputClass} resize-none`} />
            <p className="text-xs text-[#9C8B7A] text-right">{description.length}/50</p>
          </div>

          {/* 카테고리/언어 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">카테고리 *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={`${inputClass} min-w-[100px]`}>
                  <SelectValue>{webtoonCategories.find(c => c.value === category)?.icon} {webtoonCategories.find(c => c.value === category)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {webtoonCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* 썸네일 */}
          <div className="space-y-2">
            <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">썸네일 (선택, 미지정 시 첫 이미지)</Label>
            <Input type="file" accept="image/*" onChange={handleThumbnailChange} disabled={uploading} className={inputClass} />
            {thumbnailPreview && (
              <div className="w-32 aspect-[3/4] rounded-lg overflow-hidden border border-[#E7D8C9] dark:border-[#3A302A]">
                <img src={thumbnailPreview} alt="썸네일" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* 이미지 업로드 */}
          <div className="space-y-2">
            <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">웹툰 이미지 * ({images.length}장)</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E7D8C9] dark:border-[#3A302A] rounded-xl p-6 text-center cursor-pointer hover:border-[#B2967D] transition-colors"
            >
              <ImagePlus className="w-8 h-8 text-[#9C8B7A] mx-auto mb-2" />
              <p className="text-sm text-[#9C8B7A]">클릭하여 이미지 선택</p>
              <p className="text-xs text-[#9C8B7A]/60 mt-1">여러 장 선택 가능 · JPG, PNG, WEBP</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect}
              className="hidden" disabled={uploading} />
          </div>

          {/* 이미지 목록 (드래그 순서 변경) */}
          {images.length > 0 && (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                    dragOverIndex === index
                      ? 'border-[#B2967D] bg-[#B2967D]/10'
                      : 'border-[#E7D8C9] dark:border-[#3A302A] bg-[#EEE4E1]/30 dark:bg-[#2E2620]/30'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-[#9C8B7A] cursor-grab flex-shrink-0" />
                  <span className="text-xs text-[#9C8B7A] w-6 text-center flex-shrink-0">{index + 1}</span>
                  <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-[#5C4A38] dark:text-[#C4A882] truncate flex-1">{img.file.name}</span>
                  <span className="text-[10px] text-[#9C8B7A] flex-shrink-0">{(img.file.size / 1024).toFixed(0)}KB</span>
                  <button type="button" onClick={() => removeImage(img.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-[#9C8B7A] hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 진행률 */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-[#B2967D] to-[#E6BEAE] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-[#9C8B7A] text-center">{progressMessage || `업로드 중... ${progress}%`}</p>
            </div>
          )}

          {/* 저작권 */}
          <div className="bg-[#B2967D]/10 border border-[#B2967D]/20 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={copyrightAgreed} onChange={e => setCopyrightAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#E7D8C9] dark:border-[#3A302A] text-[#B2967D] focus:ring-[#B2967D]" />
              <div className="text-sm">
                <p className="font-medium text-[#5C4A38] dark:text-[#C4A882]">저작권 확인 *</p>
                <p className="text-[#9C8B7A] mt-1">본인이 이 콘텐츠의 저작권을 보유하고 있거나, 저작권자로부터 배포 권한을 부여받았음을 확인합니다.</p>
              </div>
            </label>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/dashboard')} disabled={uploading}
              className="flex-1 h-11 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-white dark:bg-[#2E2620] text-[#5C4A38] dark:text-[#C4A882] font-medium text-sm hover:bg-[#EEE4E1] dark:hover:bg-[#3A302A] transition-colors disabled:opacity-50">
              취소
            </button>
            <button type="submit" disabled={uploading || images.length === 0 || !title.trim() || !copyrightAgreed}
              className="flex-1 h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <UploadIcon className="w-4 h-4" />
              {uploading ? '업로드 중...' : `업로드 (${images.length}장)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
