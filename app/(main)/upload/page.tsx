'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'
import { FileText, Upload as UploadIcon, LogIn, Palette } from 'lucide-react'
import dynamic from 'next/dynamic'
const WebtoonUploadForm = dynamic(() => import('@/components/webtoon-upload-form'), { ssr: false })
import { useToast } from '@/components/toast'

// ━━━ R2 업로드 헬퍼 ━━━
async function uploadToR2(file: File | Blob, fileName: string, contentType: string): Promise<string> {
  const res = await fetch('/api/r2-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Presigned URL 생성 실패: ${err.error}`)
  }
  const { presignedUrl, publicUrl } = await res.json()

  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!uploadRes.ok) {
    throw new Error(`R2 업로드 실패: ${uploadRes.status}`)
  }

  return publicUrl
}

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [uploadTab, setUploadTab] = useState<'document' | 'webtoon'>('document')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [curatorComment, setCuratorComment] = useState('')
  const [category, setCategory] = useState('essay')
  const [language, setLanguage] = useState('ko')
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [copyrightAgreed, setCopyrightAgreed] = useState(false)
  const [convertNotice, setConvertNotice] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410]">
        <div className="text-center">
          <div className="w-14 h-14 bg-[#B2967D]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-7 h-7 text-[#B2967D]" />
          </div>
          <p className="text-[#5C4A38] dark:text-[#C4A882] font-medium mb-2">로그인이 필요합니다.</p>
          <button onClick={() => router.push('/login')} className="px-4 py-2 bg-[#B2967D] hover:bg-[#a67c52] text-white rounded-xl text-sm transition-colors">로그인하기</button>
        </div>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 500 * 1024 * 1024) { toast.warning('파일 크기는 500MB 이하여야 합니다.'); return }
      setFile(selectedFile)

      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || ''
      if (ext === 'docx') {
        setConvertNotice('docx 파일은 텍스트 위주로 변환됩니다. 표, 이미지 등 복잡한 서식은 일부 손실될 수 있습니다.')
      } else if (ext === 'txt') {
        setConvertNotice('txt 파일은 자동으로 EPUB 형식으로 변환되어 리플로우 뷰어로 열립니다.')
      } else {
        setConvertNotice(null)
      }
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { toast.warning('썸네일 크기는 5MB 이하여야 합니다.'); return }
      if (!selectedFile.type.startsWith('image/')) { toast.warning('이미지 파일만 업로드 가능합니다.'); return }
      setThumbnail(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => setThumbnailPreview(reader.result as string)
      reader.readAsDataURL(selectedFile)
    }
  }

  async function convertFileToEpub(originalFile: File): Promise<{ epubBlob: Blob; epubData: any } | null> {
    const ext = originalFile.name.split('.').pop()?.toLowerCase() || ''

    if (ext === 'txt') {
      setProgressMessage('TXT → EPUB 변환 중...')
      const text = await originalFile.text()
      if (!text.trim()) { toast.error('텍스트 파일이 비어있습니다.'); return null }

      const { convertTxtToEpub } = await import('@/lib/text-to-epub')
      const authorName = user?.email?.split('@')[0] || '작자 미상'
      const epubBlob = await convertTxtToEpub(text, title.trim() || originalFile.name.replace(/\.txt$/i, ''), authorName)

      const { parseEpub } = await import('@/lib/epub-parser')
      const arrayBuffer = await epubBlob.arrayBuffer()
      const epubData = await parseEpub(arrayBuffer)

      return { epubBlob, epubData }
    }

    if (ext === 'docx') {
      setProgressMessage('DOCX → EPUB 변환 중...')
      const arrayBuffer = await originalFile.arrayBuffer()

      const { convertDocxToEpub } = await import('@/lib/text-to-epub')
      const authorName = user?.email?.split('@')[0] || '작자 미상'
      const epubBlob = await convertDocxToEpub(arrayBuffer, title.trim() || originalFile.name.replace(/\.docx$/i, ''), authorName)

      const { parseEpub } = await import('@/lib/epub-parser')
      const epubArrayBuffer = await epubBlob.arrayBuffer()
      const epubData = await parseEpub(epubArrayBuffer)

      return { epubBlob, epubData }
    }

    return null
  }

  const notifySubscribers = async (documentId: string, documentTitle: string) => {
    try {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('subscriber_id')
        .eq('author_id', user!.id)
      if (!subs || subs.length === 0) return

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user!.id)
        .single()

      const notifications = subs.map(sub => ({
        user_id: sub.subscriber_id,
        type: 'new_document',
        title: '새 콘텐츠가 올라왔어요!',
        message: `${myProfile?.username || '구독 중인 큐레이터'}님이 새 콘텐츠를 올렸습니다: ${documentTitle}`,
        link: `/document/${documentId}`,
        is_read: false,
      }))

      for (let i = 0; i < notifications.length; i += 50) {
        await supabase.from('notifications').insert(notifications.slice(i, i + 50))
      }
    } catch (err) {
      console.error('알림 발송 실패:', err)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title.trim()) { toast.warning('제목과 파일을 입력해주세요.'); return }
    setUploading(true); setProgress(10); setProgressMessage('파일 준비 중...')
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
      const isTxtOrDocx = fileExt === 'txt' || fileExt === 'docx'

      let uploadFile: File | Blob = file
      let uploadFileName: string
      let uploadContentType: string = file.type || 'application/octet-stream'
      let convertedEpubData: any = null

      if (isTxtOrDocx) {
        setProgress(15)
        try {
          const result = await convertFileToEpub(file)
          if (!result) { setUploading(false); setProgress(0); setProgressMessage(''); return }
          uploadFile = result.epubBlob
          convertedEpubData = result.epubData
          uploadFileName = `documents/${user.id}/${Date.now()}.epub`
          uploadContentType = 'application/epub+zip'
          setProgress(30)
          setProgressMessage('변환 완료! 업로드 중...')
        } catch (convertErr: any) {
          console.error('변환 실패:', convertErr)
          toast.error(`파일 변환 실패: ${convertErr.message}`)
          setUploading(false); setProgress(0); setProgressMessage(''); return
        }
      } else {
        uploadFileName = `documents/${user.id}/${Date.now()}.${fileExt}`
      }

      // ━━━ PDF 페이지 수 미리 읽기 (업로드 전) ━━━
      let pageCount = 0
      if (file.type === 'application/pdf' || fileExt === 'pdf') {
        setProgressMessage('PDF 분석 중...')
        try {
          const { pdfjs } = await import('react-pdf')
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
          const arrayBuffer = await file.arrayBuffer()
          const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer, cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`, cMapPacked: true }).promise
          pageCount = pdfDoc.numPages
          pdfDoc.destroy()
        } catch (e) { console.warn('PDF 페이지 수 읽기 실패:', e) }
      }

      // ━━━ R2에 파일 업로드 ━━━
      setProgress(20); setProgressMessage('파일 업로드 중...')
      const filePublicUrl = await uploadToR2(uploadFile, uploadFileName, uploadContentType)

      setProgress(40); setProgressMessage('썸네일 처리 중...')
      let thumbnailUrl = null
      if (thumbnail) {
        const thumbExt = thumbnail.name.split('.').pop()
        const thumbFileName = `thumbnails/${user.id}/${Date.now()}.${thumbExt}`
        thumbnailUrl = await uploadToR2(thumbnail, thumbFileName, thumbnail.type)
      }
      setProgress(50)

      const isPdf = file.type === 'application/pdf' || fileExt === 'pdf'
      const isEpub = fileExt === 'epub' || file.type === 'application/epub+zip'
      const isConvertedEpub = isTxtOrDocx && convertedEpubData

      

      let epubData: any = null
      if (isEpub) {
        setProgressMessage('EPUB 분석 중...')
        try {
          const { parseEpub } = await import('@/lib/epub-parser')
          const arrayBuffer = await file.arrayBuffer()
          epubData = await parseEpub(arrayBuffer)
          pageCount = epubData.chapters.length
          if (!title.trim() && epubData.title && epubData.title !== '제목 없음') setTitle(epubData.title)
        } catch (e) { console.warn('EPUB 파싱 실패:', e); toast.error('EPUB 파일 파싱에 실패했습니다.'); setUploading(false); setProgress(0); setProgressMessage(''); return }
      }

      if (isConvertedEpub) {
        epubData = convertedEpubData
        pageCount = epubData.chapters.length
      }

      setProgress(70); setProgressMessage('콘텐츠 정보 저장 중...')
      const { data: docData, error: dbError } = await supabase.from('documents').insert({ title: title.trim(), description: description.trim() || null, curator_comment: curatorComment.trim() || null, category, language, file_path: filePublicUrl, thumbnail_url: thumbnailUrl, author_id: user.id, file_size: file.size, total_reading_time: isPdf ? (pageCount * 90) : (pageCount * 600), page_count: pageCount || null, is_published: true }).select('id').single()
      if (dbError) throw dbError

      setProgress(95)

      setProgress(100); setProgressMessage('완료!'); await notifySubscribers(docData.id, title.trim())
      toast.success('업로드가 완료되었습니다!'); router.push('/dashboard')
    } catch (error: any) { console.error('Upload error:', error); toast.error(`업로드 실패: ${error.message}`) }
    finally { setUploading(false); setProgress(0); setProgressMessage('') }
  }

  const inputClass = "rounded-xl bg-[#EEE4E1]/50 dark:bg-[#2E2620] border-[#E7D8C9] dark:border-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] placeholder:text-[#9C8B7A] focus:border-[#B2967D] focus:ring-[#B2967D]"

  return (
    <div className="min-h-screen bg-[#F7F2EF] dark:bg-[#1A1410]">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">콘텐츠 업로드</h1>
            <p className="text-[#9C8B7A]">새로운 콘텐츠를 공유하세요</p>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setUploadTab('document')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                uploadTab === 'document'
                  ? 'bg-[#B2967D] text-white'
                  : 'bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] text-[#5C4A38] dark:text-[#C4A882] hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620]'
              }`}>
              <FileText className="w-4 h-4" /> 콘텐츠
            </button>
            <button onClick={() => setUploadTab('webtoon')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                uploadTab === 'webtoon'
                  ? 'bg-[#B2967D] text-white'
                  : 'bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] text-[#5C4A38] dark:text-[#C4A882] hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620]'
              }`}>
              🎨 웹툰
            </button>
          </div>

          {uploadTab === 'webtoon' ? (
            <WebtoonUploadForm />
          ) : (
          <div className="bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-sm">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-lg font-semibold text-[#2D2016] dark:text-[#EEE4E1]">콘텐츠 정보</h2>
              <p className="text-sm text-[#9C8B7A] mt-1">콘텐츠의 기본 정보를 입력해주세요</p>
            </div>
            <div className="px-6 pb-6">
              <form onSubmit={handleUpload} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">제목 *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="콘텐츠 제목을 입력하세요" required className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">설명</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="콘텐츠에 대한 간단한 설명" rows={2} className={`${inputClass} resize-none`} />
                  
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">카테고리 *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category" className={`${inputClass} min-w-[100px]`}><SelectValue>{CATEGORIES.find(cat => cat.value === category)?.icon} {CATEGORIES.find(cat => cat.value === category)?.label}</SelectValue></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.icon} {cat.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnail" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">썸네일 이미지 (선택)</Label>
                  <div className="flex flex-col gap-4">
                    <Input id="thumbnail" type="file" accept="image/*" onChange={handleThumbnailChange} disabled={uploading} className={inputClass} />
                    <p className="text-xs text-[#9C8B7A]">권장: 600x800px (3:4 비율), 최대 5MB</p>
                    {thumbnailPreview && (<div className="w-48 aspect-[3/4] rounded-xl overflow-hidden border border-[#E7D8C9] dark:border-[#3A302A]"><img src={thumbnailPreview} alt="썸네일 미리보기" className="w-full h-full object-cover" /></div>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">콘텐츠 파일 *</Label>
                  <Input id="file" type="file" onChange={handleFileChange} disabled={uploading} accept=".pdf,.epub,.txt,.docx" required className={inputClass} />
                  <p className="text-xs text-[#9C8B7A]">지원 형식: PDF, EPUB, TXT, DOCX (최대 500MB)</p>
                  {file && (<div className="flex items-center gap-2 text-sm text-[#5C4A38] dark:text-[#C4A882]"><FileText className="w-4 h-4" /><span>{file.name}</span><span className="text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span></div>)}
                  {convertNotice && (
                    <div className="bg-[#B2967D]/10 border border-[#B2967D]/30 rounded-lg px-3 py-2 mt-2">
                      <p className={`text-xs ${convertNotice?.includes('docx') ? 'text-red-600 dark:text-red-400 font-bold' : 'text-[#5C4A38] dark:text-[#C4A882]'}`}>💡 {convertNotice}</p>
                    </div>
                  )}
                </div>
                {uploading && (
                  <div className="space-y-2">
                    <div className="w-full bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#B2967D] to-[#E6BEAE] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-sm text-[#9C8B7A] text-center">{progressMessage || `업로드 중... ${progress}%`}</p>
                  </div>
                )}
                <div className="bg-[#B2967D]/10 border border-[#B2967D]/20 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={copyrightAgreed} onChange={(e) => setCopyrightAgreed(e.target.checked)} className="mt-1 w-4 h-4 rounded border-[#E7D8C9] dark:border-[#3A302A] text-[#B2967D] focus:ring-[#B2967D]" />
                    <div className="text-sm">
                      <p className="font-medium text-[#5C4A38] dark:text-[#C4A882]">저작권 확인 *</p>
                      <p className="text-[#9C8B7A] mt-1">본인이 이 콘텐츠의 저작권을 보유하고 있거나, 저작권자로부터 배포 권한을 부여받았음을 확인합니다. 타인의 저작권을 침해하는 콘텐츠를 업로드할 경우 계정 정지 및 법적 책임이 발생할 수 있습니다.</p>
                    </div>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => router.push('/dashboard')} disabled={uploading} className="flex-1 h-11 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-white dark:bg-[#2E2620] text-[#5C4A38] dark:text-[#C4A882] font-medium text-sm hover:bg-[#EEE4E1] dark:hover:bg-[#3A302A] transition-colors disabled:opacity-50">취소</button>
                  <button type="submit" disabled={uploading || !file || !title.trim() || !copyrightAgreed} className="flex-1 h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"><UploadIcon className="w-4 h-4" />{uploading ? '업로드 중...' : '업로드'}</button>
                </div>
              </form>
            </div>
          </div>
                  )}
        </div>
      </main>
    </div>
  )
}
