'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload as UploadIcon, X, GripVertical, ImagePlus, FileArchive, Plus, BookOpen } from 'lucide-react'
import { useToast } from '@/components/toast'

interface ImageItem {
  id: string
  file: File
  preview: string
  order: number
}

type UploadMode = 'new_series' | 'new_episode' | 'standalone'

interface SeriesOption {
  id: string
  title: string
  total_episodes: number
  thumbnail_url: string | null
}

export default function WebtoonUploadForm() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 업로드 모드
  const [uploadMode, setUploadMode] = useState<UploadMode>('new_series')
  const [mySeries, setMySeries] = useState<SeriesOption[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('')
  const [seriesLoading, setSeriesLoading] = useState(false)

  // 시리즈(작품) 정보 — 새 시리즈일 때
  const [seriesTitle, setSeriesTitle] = useState('')
  const [seriesDescription, setSeriesDescription] = useState('')

  // 에피소드 정보
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState(1)

  // 공통
  const [category, setCategory] = useState('webtoon')
  const [images, setImages] = useState<ImageItem[]>([])
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [copyrightAgreed, setCopyrightAgreed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const webtoonCategories = [
    { value: 'webtoon', label: '웹툰', icon: '🎨' },
    { value: 'manga', label: '만화', icon: '📖' },
    { value: 'illustration', label: '일러스트', icon: '🖼️' },
  ]

  // ━━━ 내 시리즈 목록 로드 ━━━
  useEffect(() => {
    if (!user) return
    const loadSeries = async () => {
      setSeriesLoading(true)
      const { data, error } = await supabase
        .from('document_series')
        .select('id, title, total_episodes, thumbnail_url')
        .eq('author_id', user.id)
        .eq('content_type', 'webtoon')
        .order('updated_at', { ascending: false })
      if (!error && data) {
        setMySeries(data)
      }
      setSeriesLoading(false)
    }
    loadSeries()
  }, [user])

  // 시리즈 선택 시 다음 에피소드 번호 자동 설정
  useEffect(() => {
    if (!selectedSeriesId) return
    const series = mySeries.find(s => s.id === selectedSeriesId)
    if (series) {
      setEpisodeNumber(series.total_episodes + 1)
    }
  }, [selectedSeriesId, mySeries])

  // ━━━ 이미지 추가 ━━━
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

  // ━━━ ZIP 파일 처리 ━━━
  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.warning('ZIP 파일만 지원됩니다.')
      return
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.warning('ZIP 파일은 200MB 이하여야 합니다.')
      return
    }

    toast.info('ZIP 파일 해제 중...')

    try {
      // JSZip 동적 로드
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)

      const imageEntries: { name: string; entry: any }[] = []
      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return
        const lower = relativePath.toLowerCase()
        // 숨김 파일이나 __MACOSX 폴더 제외
        if (lower.includes('__macosx') || lower.startsWith('.')) return
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
          imageEntries.push({ name: relativePath, entry: zipEntry })
        }
      })

      if (imageEntries.length === 0) {
        toast.warning('ZIP 안에 이미지 파일이 없습니다.')
        return
      }

      // 파일명 기준으로 정렬
      imageEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

      const newImages: ImageItem[] = []
      for (let i = 0; i < imageEntries.length; i++) {
        const { name, entry } = imageEntries[i]
        const blob = await entry.async('blob')
        const ext = name.split('.').pop() || 'jpg'
        const imageFile = new File([blob], `zip_${String(i + 1).padStart(3, '0')}.${ext}`, { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
        newImages.push({
          id: `zip_${Date.now()}_${i}`,
          file: imageFile,
          preview: URL.createObjectURL(imageFile),
          order: images.length + i,
        })
      }

      setImages(prev => [...prev, ...newImages])
      toast.success(`${newImages.length}장의 이미지를 ZIP에서 추출했습니다.`)
    } catch (err: any) {
      console.error('ZIP extract error:', err)
      toast.error('ZIP 파일 처리 중 오류가 발생했습니다.')
    }

    if (e.target) e.target.value = ''
  }

  // ━━━ 이미지 삭제 ━━━
  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      return filtered.map((img, i) => ({ ...img, order: i }))
    })
  }

  // ━━━ 드래그 순서 변경 ━━━
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

  // ━━━ 썸네일 ━━━
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.warning('썸네일은 5MB 이하'); return }
    setThumbnail(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  // ━━━ 업로드 ━━━
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || images.length === 0) {
      toast.warning('이미지를 추가해주세요.')
      return
    }

    // 검증
    if (uploadMode === 'new_series' && !seriesTitle.trim()) {
      toast.warning('작품 제목을 입력해주세요.')
      return
    }
    if (uploadMode === 'new_episode' && !selectedSeriesId) {
      toast.warning('작품을 선택해주세요.')
      return
    }

    setUploading(true); setProgress(5); setProgressMessage('준비 중...')

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
      setProgress(15)

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
        uploadedImages.push({ url: urlData.publicUrl, order: i, width: null, height: null })

        setProgress(15 + Math.round((i / images.length) * 50))
        setProgressMessage(`이미지 업로드 중... ${i + 1}/${images.length}`)
      }

      if (uploadedImages.length === 0) {
        toast.error('이미지 업로드에 실패했습니다.')
        setUploading(false); setProgress(0); return
      }

      setProgress(70); setProgressMessage('콘텐츠 정보 저장 중...')

      // 3. 시리즈 처리
      let seriesId: string | null = null

      if (uploadMode === 'new_series') {
        // 새 시리즈 생성
        const { data: newSeries, error: seriesError } = await supabase.from('document_series').insert({
          title: seriesTitle.trim(),
          description: seriesDescription.trim() || null,
          content_type: 'webtoon',
          thumbnail_url: thumbnailUrl,
          category,
          author_id: user.id,
          total_episodes: 1,
          status: 'ongoing',
        }).select('id').single()

        if (seriesError) throw seriesError
        seriesId = newSeries.id
      } else if (uploadMode === 'new_episode') {
        seriesId = selectedSeriesId
      }

      // 4. documents 테이블에 에피소드(회차) 레코드 생성
      const docTitle = uploadMode === 'standalone'
        ? (episodeTitle.trim() || '웹툰')
        : uploadMode === 'new_series'
          ? `${seriesTitle.trim()} ${episodeNumber}화${episodeTitle.trim() ? ' - ' + episodeTitle.trim() : ''}`
          : `${mySeries.find(s => s.id === selectedSeriesId)?.title || ''} ${episodeNumber}화${episodeTitle.trim() ? ' - ' + episodeTitle.trim() : ''}`

      const { data: docData, error: docError } = await supabase.from('documents').insert({
        title: docTitle,
        description: episodeTitle.trim() || null,
        category,
        language: 'ko',
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

      setProgress(80); setProgressMessage('이미지 순서 저장 중...')

      // 5. webtoon_images 저장
      const imageRows = uploadedImages.map(img => ({
        document_id: docData.id,
        image_url: img.url,
        image_order: img.order,
        width: img.width,
        height: img.height,
      }))
      const { error: imgError } = await supabase.from('webtoon_images').insert(imageRows)
      if (imgError) console.error('webtoon_images insert error:', imgError)

      // 6. 시리즈에 에피소드 연결
      if (seriesId) {
        setProgress(90); setProgressMessage('시리즈 연결 중...')

        const { error: linkError } = await supabase.from('series_documents').insert({
          series_id: seriesId,
          document_id: docData.id,
          position: episodeNumber,
          episode_title: episodeTitle.trim() || `${episodeNumber}화`,
        })
        if (linkError) console.error('series_documents insert error:', linkError)

        // 시리즈 total_episodes 업데이트
        if (uploadMode === 'new_episode') {
          await supabase.from('document_series')
            .update({
              total_episodes: episodeNumber,
              updated_at: new Date().toISOString(),
            })
            .eq('id', seriesId)
        }
      }

      setProgress(100); setProgressMessage('완료!')
      toast.success(uploadMode === 'standalone' ? '웹툰이 업로드되었습니다!' : `${episodeNumber}화가 업로드되었습니다!`)

      // 시리즈가 있으면 시리즈 상세로, 없으면 대시보드로
      if (seriesId && uploadMode === 'new_series') {
        router.push(`/document/${docData.id}`)
      } else {
        router.push('/dashboard')
      }

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
        <h2 className="text-lg font-semibold text-[#2D2016] dark:text-[#EEE4E1]">웹툰 업로드</h2>
        <p className="text-sm text-[#9C8B7A] mt-1">새 작품을 시작하거나, 기존 작품에 회차를 추가하세요</p>
      </div>
      <div className="px-6 pb-6">
        <form onSubmit={handleUpload} className="space-y-6">

          {/* ━━━ 업로드 모드 선택 ━━━ */}
          <div className="space-y-2">
            <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">업로드 유형</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'new_series' as UploadMode, label: '새 작품', desc: '새 시리즈 시작', icon: '📚' },
                { value: 'new_episode' as UploadMode, label: '회차 추가', desc: '기존 작품에 추가', icon: '➕' },
                { value: 'standalone' as UploadMode, label: '단편', desc: '시리즈 없이', icon: '🖼️' },
              ].map(mode => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setUploadMode(mode.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    uploadMode === mode.value
                      ? 'border-[#B2967D] bg-[#B2967D]/10 ring-1 ring-[#B2967D]'
                      : 'border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D]/50'
                  }`}
                >
                  <div className="text-lg mb-1">{mode.icon}</div>
                  <div className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1]">{mode.label}</div>
                  <div className="text-[10px] text-[#9C8B7A]">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ━━━ 새 작품: 작품 정보 ━━━ */}
          {uploadMode === 'new_series' && (
            <div className="space-y-4 p-4 bg-[#B2967D]/5 rounded-xl border border-[#B2967D]/20">
              <p className="text-xs font-semibold text-[#B2967D] uppercase tracking-wider">작품 정보</p>
              <div className="space-y-2">
                <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">작품 제목 *</Label>
                <Input value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)}
                  placeholder="예: 나의 히어로" required className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">작품 소개</Label>
                <Textarea value={seriesDescription} onChange={e => { if (e.target.value.length <= 200) setSeriesDescription(e.target.value) }}
                  placeholder="작품에 대한 소개 (최대 200자)" rows={3} maxLength={200} className={`${inputClass} resize-none`} />
                <p className="text-xs text-[#9C8B7A] text-right">{seriesDescription.length}/200</p>
              </div>
            </div>
          )}

          {/* ━━━ 기존 작품에 회차 추가: 작품 선택 ━━━ */}
          {uploadMode === 'new_episode' && (
            <div className="space-y-4 p-4 bg-[#B2967D]/5 rounded-xl border border-[#B2967D]/20">
              <p className="text-xs font-semibold text-[#B2967D] uppercase tracking-wider">작품 선택</p>
              {seriesLoading ? (
                <p className="text-sm text-[#9C8B7A]">불러오는 중...</p>
              ) : mySeries.length === 0 ? (
                <div className="text-center py-4">
                  <BookOpen className="w-8 h-8 text-[#E7D8C9] dark:text-[#3A302A] mx-auto mb-2" />
                  <p className="text-sm text-[#9C8B7A]">아직 등록된 작품이 없습니다.</p>
                  <p className="text-xs text-[#9C8B7A]/60 mt-1">'새 작품'을 선택해서 먼저 작품을 등록해주세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mySeries.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSeriesId(s.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedSeriesId === s.id
                          ? 'border-[#B2967D] bg-[#B2967D]/10'
                          : 'border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D]/50'
                      }`}
                    >
                      <div className="w-10 h-13 flex-shrink-0 rounded overflow-hidden bg-[#EEE4E1] dark:bg-[#2E2620]">
                        {s.thumbnail_url ? (
                          <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-[#9C8B7A]">🎨</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1] truncate">{s.title}</p>
                        <p className="text-xs text-[#9C8B7A]">{s.total_episodes}화 연재 중</p>
                      </div>
                      {selectedSeriesId === s.id && (
                        <span className="text-xs bg-[#B2967D]/20 text-[#B2967D] px-2 py-0.5 rounded-full">선택됨</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ 에피소드 정보 (시리즈 모드일 때) ━━━ */}
          {uploadMode !== 'standalone' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">회차 번호</Label>
                <Input type="number" min={1} value={episodeNumber} onChange={e => setEpisodeNumber(parseInt(e.target.value) || 1)}
                  className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">에피소드 제목 (선택)</Label>
                <Input value={episodeTitle} onChange={e => setEpisodeTitle(e.target.value)}
                  placeholder="예: 시작의 날" className={inputClass} />
              </div>
            </div>
          )}

          {/* ━━━ 단편 제목 ━━━ */}
          {uploadMode === 'standalone' && (
            <div className="space-y-2">
              <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">제목 *</Label>
              <Input value={episodeTitle} onChange={e => setEpisodeTitle(e.target.value)}
                placeholder="웹툰 제목" required className={inputClass} />
            </div>
          )}

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">카테고리</Label>
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

          {/* 썸네일 (새 시리즈/단편일 때만) */}
          {(uploadMode === 'new_series' || uploadMode === 'standalone') && (
            <div className="space-y-2">
              <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">대표 썸네일 (선택, 미지정 시 첫 이미지)</Label>
              <Input type="file" accept="image/*" onChange={handleThumbnailChange} disabled={uploading} className={inputClass} />
              {thumbnailPreview && (
                <div className="w-32 aspect-[3/4] rounded-lg overflow-hidden border border-[#E7D8C9] dark:border-[#3A302A]">
                  <img src={thumbnailPreview} alt="썸네일" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* ━━━ 이미지 업로드 (이미지 선택 + ZIP) ━━━ */}
          <div className="space-y-2">
            <Label className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">웹툰 이미지 * ({images.length}장)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E7D8C9] dark:border-[#3A302A] rounded-xl p-4 text-center cursor-pointer hover:border-[#B2967D] transition-colors"
              >
                <ImagePlus className="w-6 h-6 text-[#9C8B7A] mx-auto mb-1" />
                <p className="text-xs text-[#9C8B7A]">이미지 선택</p>
                <p className="text-[10px] text-[#9C8B7A]/60 mt-0.5">JPG, PNG, WEBP</p>
              </div>
              <div
                onClick={() => zipInputRef.current?.click()}
                className="border-2 border-dashed border-[#E7D8C9] dark:border-[#3A302A] rounded-xl p-4 text-center cursor-pointer hover:border-[#B2967D] transition-colors"
              >
                <FileArchive className="w-6 h-6 text-[#9C8B7A] mx-auto mb-1" />
                <p className="text-xs text-[#9C8B7A]">ZIP 업로드</p>
                <p className="text-[10px] text-[#9C8B7A]/60 mt-0.5">이미지 ZIP 파일</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" disabled={uploading} />
            <input ref={zipInputRef} type="file" accept=".zip" onChange={handleZipSelect} className="hidden" disabled={uploading} />
          </div>

          {/* 이미지 목록 */}
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
            <button type="submit"
              disabled={uploading || images.length === 0 || !copyrightAgreed || (uploadMode === 'new_series' && !seriesTitle.trim()) || (uploadMode === 'new_episode' && !selectedSeriesId) || (uploadMode === 'standalone' && !episodeTitle.trim())}
              className="flex-1 h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <UploadIcon className="w-4 h-4" />
              {uploading ? '업로드 중...' : uploadMode === 'standalone' ? `업로드 (${images.length}장)` : `${episodeNumber}화 업로드 (${images.length}장)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
