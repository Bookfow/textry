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
import { useToast } from '@/components/toast'

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('technology')
  const [language, setLanguage] = useState('ko')
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [copyrightAgreed, setCopyrightAgreed] = useState(false)

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
        toast.warning('파일 크기는 100MB 이하여야 합니다.')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.warning('썸네일 크기는 5MB 이하여야 합니다.')
        return
      }
      if (!selectedFile.type.startsWith('image/')) {
        toast.warning('이미지 파일만 업로드 가능합니다.')
        return
      }
      setThumbnail(selectedFile)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  // ★ 고품질 텍스트 추출 함수 (reflow-viewer와 동일 로직)
  function isBrokenText(text: string): boolean {
    if (!text || text.trim().length === 0) return true
    const cleaned = text.replace(/\s/g, '')
    if (cleaned.length === 0) return true

    let meaningfulCount = 0
    for (let i = 0; i < cleaned.length; i++) {
      const code = cleaned.charCodeAt(i)
      if ((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x3131 && code <= 0x318E)) {
        meaningfulCount++
      } else if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
        meaningfulCount++
      }
    }
    if (cleaned.length >= 10 && meaningfulCount / cleaned.length < 0.15) return true
    if (cleaned.length >= 30 && meaningfulCount / cleaned.length < 0.25) return true

    let normalCount = 0
    for (let i = 0; i < cleaned.length; i++) {
      const code = cleaned.charCodeAt(i)
      if (
        (code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x3131 && code <= 0x318E) ||
        (code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A) ||
        (code >= 0x0030 && code <= 0x0039) || (code >= 0x0020 && code <= 0x007E) ||
        (code >= 0x2000 && code <= 0x206F) || (code >= 0x3000 && code <= 0x303F) ||
        (code >= 0xFF01 && code <= 0xFF5E)
      ) normalCount++
    }
    if (cleaned.length >= 5 && normalCount / cleaned.length < 0.4) return true

    let brokenCount = 0
    for (let i = 0; i < cleaned.length; i++) {
      const code = cleaned.charCodeAt(i)
      if (
        (code >= 0xE000 && code <= 0xF8FF) ||
        (code < 0x0020 && code !== 0x0009 && code !== 0x000A && code !== 0x000D) ||
        code === 0xFFFD || (code >= 0x2400 && code <= 0x243F)
      ) brokenCount++
    }
    if (brokenCount / cleaned.length > 0.3) return true
    if (/[□▯○◻◼■▪▫]{3,}/.test(cleaned)) return true
    if (/^[\d$&*%#@!^+=\/\\|<>.,;:'"(){}\[\]\-_~`]{8,}$/.test(cleaned)) return true
    return false
  }

  function extractPageText(items: any[]): string {
    if (items.length === 0) return ''

    interface LineInfo { text: string; fontSize: number; y: number }
    const lines: LineInfo[] = []
    let lastY: number | null = null
    let currentLine = ''
    let currentFontSizes: number[] = []
    let currentY = 0

    for (const item of items) {
      if (!('str' in item) || !item.str) continue
      const y = Math.round(item.transform[5])
      const fs = Math.round(Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 12)
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        const trimmed = currentLine.trim()
        if (trimmed) {
          const avgFs = currentFontSizes.length > 0 ? currentFontSizes.reduce((a, b) => a + b, 0) / currentFontSizes.length : 12
          lines.push({ text: trimmed, fontSize: Math.round(avgFs), y: currentY })
        }
        currentLine = ''
        currentFontSizes = []
      }
      currentLine += item.str
      currentFontSizes.push(fs)
      currentY = y
      lastY = y
    }
    const trimmedLast = currentLine.trim()
    if (trimmedLast) {
      const avgFs = currentFontSizes.length > 0 ? currentFontSizes.reduce((a, b) => a + b, 0) / currentFontSizes.length : 12
      lines.push({ text: trimmedLast, fontSize: Math.round(avgFs), y: currentY })
    }

    if (lines.length === 0) return ''
    const cleanLines = lines.filter(l => !isBrokenText(l.text))
    if (cleanLines.length === 0) return ''

    const fsCount = new Map<number, number>()
    for (const l of cleanLines) fsCount.set(l.fontSize, (fsCount.get(l.fontSize) || 0) + l.text.length)
    let bodyFontSize = 12
    let maxWeight = 0
    for (const [fs, weight] of fsCount) { if (weight > maxWeight) { maxWeight = weight; bodyFontSize = fs } }

    const parts: string[] = []
    let currentParagraph = ''
    let lastLineY: number | null = null
    const avgLineGap = cleanLines.length > 1
      ? cleanLines.slice(1).reduce((sum, l, i) => sum + Math.abs(l.y - cleanLines[i].y), 0) / (cleanLines.length - 1)
      : 20

    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i]
      const fsDiff = line.fontSize - bodyFontSize

      if (lastLineY !== null) {
        const gap = Math.abs(line.y - lastLineY)
        if (gap > avgLineGap * 2.5 && currentParagraph) {
          parts.push(currentParagraph)
          currentParagraph = ''
          parts.push('<hr>')
        }
      }

      if (fsDiff >= 4 && line.text.length < 80) {
        if (currentParagraph) { parts.push(currentParagraph); currentParagraph = '' }
        if (fsDiff >= 8) parts.push(`<h1>${line.text}</h1>`)
        else parts.push(`<h2>${line.text}</h2>`)
      } else if (fsDiff >= 2 && line.text.length < 50) {
        if (currentParagraph) { parts.push(currentParagraph); currentParagraph = '' }
        parts.push(`<h3>${line.text}</h3>`)
      } else {
        if (currentParagraph) currentParagraph += ' '
        currentParagraph += line.text
      }
      lastLineY = line.y
    }
    if (currentParagraph) parts.push(currentParagraph)

    return parts.join('\n\n')
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !title.trim()) {
      toast.warning('제목과 파일을 입력해주세요.')
      return
    }

    setUploading(true)
    setProgress(10)
    setProgressMessage('파일 업로드 중...')

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      setProgress(20)

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      setProgress(40)
      setProgressMessage('썸네일 처리 중...')

      let thumbnailUrl = null

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

      setProgress(50)

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const isEpub = file.name.toLowerCase().endsWith('.epub') || file.type === 'application/epub+zip'

      // ━━━ PDF 분석 ━━━
      let pageCount = 0
      let pdfDoc: any = null

      if (isPdf) {
        setProgressMessage('PDF 분석 중...')
        try {
          const { pdfjs } = await import('react-pdf')
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
          const arrayBuffer = await file.arrayBuffer()
          pdfDoc = await pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
          }).promise
          pageCount = pdfDoc.numPages
        } catch (e) {
          console.warn('PDF 페이지 수 읽기 실패:', e)
        }
      }

      // ━━━ EPUB 분석 ━━━
      let epubData: any = null

      if (isEpub) {
        setProgressMessage('EPUB 분석 중...')
        try {
          const { parseEpub } = await import('@/lib/epub-parser')
          const arrayBuffer = await file.arrayBuffer()
          epubData = await parseEpub(arrayBuffer)
          pageCount = epubData.chapters.length

          // EPUB 메타데이터로 제목/설명 자동 채우기 (비어있으면)
          if (!title.trim() && epubData.title && epubData.title !== '제목 없음') {
            setTitle(epubData.title)
          }
        } catch (e) {
          console.warn('EPUB 파싱 실패:', e)
          toast.error('EPUB 파일 파싱에 실패했습니다. 파일이 손상되었을 수 있습니다.')
          setUploading(false)
          setProgress(0)
          setProgressMessage('')
          return
        }
      }

      setProgress(60)
      setProgressMessage('문서 정보 저장 중...')

      const { data: docData, error: dbError } = await supabase
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
          page_count: pageCount || null,
          is_published: true
        })
        .select('id')
        .single()

      if (dbError) throw dbError

      setProgress(70)

      // ━━━ PDF 텍스트 추출 → DB 저장 ━━━
      if (isPdf && pdfDoc && docData?.id) {
        try {
          setProgressMessage('텍스트 추출 중...')

          // 스캔 PDF 사전 감지
          let scanPageCount = 0
          const checkPages = Math.min(3, pageCount)
          for (let i = 1; i <= checkPages; i++) {
            try {
              const page = await pdfDoc.getPage(i)
              const ops = await page.getOperatorList()
              let hasImage = false
              let textOpCount = 0
              for (let j = 0; j < ops.fnArray.length; j++) {
                const fn = ops.fnArray[j]
                if (fn === 85 || fn === 82) hasImage = true
                if (fn === 44 || fn === 45) textOpCount++
              }
              if (hasImage && textOpCount < 5) scanPageCount++
            } catch {}
          }

          const isScannedPdf = scanPageCount >= checkPages

          if (isScannedPdf) {
            const rows: { document_id: string; page_number: number; text_content: string }[] = []
            for (let i = 1; i <= pageCount; i++) {
              rows.push({ document_id: docData.id, page_number: i, text_content: `(${i}페이지: 스캔 이미지)` })
              if (rows.length >= 50 || i === pageCount) {
                await supabase.from('document_pages_text').insert(rows)
                rows.length = 0
              }
            }
            setProgressMessage('스캔 PDF 감지 (텍스트 추출 불가)')
          } else {
            const batchSize = 10
            const rows: { document_id: string; page_number: number; text_content: string }[] = []

            for (let i = 1; i <= pageCount; i++) {
              try {
                const page = await pdfDoc.getPage(i)
                const textContent = await page.getTextContent()
                const items = textContent.items as any[]
                const text = extractPageText(items)

                rows.push({
                  document_id: docData.id,
                  page_number: i,
                  text_content: text
                })

                if (rows.length >= batchSize || i === pageCount) {
                  const { error: textError } = await supabase
                    .from('document_pages_text')
                    .insert(rows)
                  if (textError) console.warn(`텍스트 저장 실패 (${i}p):`, textError)
                  rows.length = 0
                }

                const textProgress = 70 + Math.round((i / pageCount) * 25)
                setProgress(textProgress)
                setProgressMessage(`텍스트 추출 중... ${i}/${pageCount}`)
              } catch (pageErr) {
                console.warn(`${i}페이지 텍스트 추출 실패:`, pageErr)
              }
            }
          }
        } catch (extractErr) {
          console.warn('텍스트 추출 전체 실패:', extractErr)
        }
      }

      // ━━━ EPUB 챕터 텍스트 → DB 저장 ━━━
      if (isEpub && epubData && docData?.id) {
        try {
          setProgressMessage('EPUB 챕터 저장 중...')
          const batchSize = 10
          const rows: { document_id: string; page_number: number; text_content: string }[] = []

          for (let i = 0; i < epubData.chapters.length; i++) {
            const chapter = epubData.chapters[i]
            rows.push({
              document_id: docData.id,
              page_number: i + 1, // 1-based
              text_content: chapter.content,
            })

            if (rows.length >= batchSize || i === epubData.chapters.length - 1) {
              const { error: textError } = await supabase
                .from('document_pages_text')
                .insert(rows)
              if (textError) console.warn(`EPUB 챕터 저장 실패 (${i + 1}):`, textError)
              rows.length = 0
            }

            const epubProgress = 70 + Math.round(((i + 1) / epubData.chapters.length) * 25)
            setProgress(epubProgress)
            setProgressMessage(`EPUB 챕터 저장 중... ${i + 1}/${epubData.chapters.length}`)
          }
        } catch (extractErr) {
          console.warn('EPUB 챕터 저장 실패:', extractErr)
        }
      }

      setProgress(100)
      setProgressMessage('완료!')

      toast.success('업로드가 완료되었습니다!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(`업로드 실패: ${error.message}`)
    } finally {
      setUploading(false)
      setProgress(0)
      setProgressMessage('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 dark:text-white">문서 업로드</h1>
            <p className="text-gray-600 dark:text-gray-400">새로운 문서를 공유하세요</p>
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

                {/* 설명 (50자 제한) */}
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => { if (e.target.value.length <= 50) setDescription(e.target.value) }}
                    placeholder="문서에 대한 간단한 설명 (최대 50자)"
                    rows={2}
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-400 text-right">{description.length}/50</p>
                </div>

                {/* 카테고리 & 언어 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">카테고리 *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category" className="min-w-[100px]">
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      권장: 600x800px (3:4 비율), 최대 5MB
                    </p>
                    {thumbnailPreview && (
                      <div className="w-48 aspect-[3/4] rounded-lg overflow-hidden border dark:border-gray-700">
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
                    accept=".pdf,.epub"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    지원 형식: PDF, EPUB (최대 100MB)
                  </p>
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      {progressMessage || `업로드 중... ${progress}%`}
                    </p>
                  </div>
                )}

                {/* 저작권 동의 */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyrightAgreed}
                      onChange={(e) => setCopyrightAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-300">저작권 확인 *</p>
                      <p className="text-amber-700 dark:text-amber-400 mt-1">
                        본인이 이 문서의 저작권을 보유하고 있거나, 저작권자로부터 배포 권한을 부여받았음을 확인합니다.
                        타인의 저작권을 침해하는 콘텐츠를 업로드할 경우 계정 정지 및 법적 책임이 발생할 수 있습니다.
                      </p>
                    </div>
                  </label>
                </div>

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
                    disabled={uploading || !file || !title.trim() || !copyrightAgreed}
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
