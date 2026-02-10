'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf'
import { AdBanner } from '@/components/ad-banner'
import { ReactionButtons } from '@/components/reaction-buttons'
import { SubscribeButton } from '@/components/subscribe-button'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export default function ReadPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState(true)

  // 읽기 시간 추적
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [totalTime, setTotalTime] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadDocument()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      saveReadingSession()
    }
  }, [documentId])

  // 읽기 시간 추적 시작
  useEffect(() => {
    if (user && document) {
      createReadingSession()
      
      // 10초마다 읽기 시간 저장
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setTotalTime(elapsed)
        updateReadingTime(elapsed)
      }, 10000)
    }
  }, [user, document])

  const loadDocument = async () => {
    try {
      // 문서 정보 가져오기
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (docError) throw docError
      setDocument(docData)

      // 작가 정보 가져오기
      const { data: authorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', docData.author_id)
        .single()

      if (authorData) {
        setAuthorProfile(authorData)
      }

      // 조회수 증가
      await supabase
        .from('documents')
        .update({ view_count: docData.view_count + 1 })
        .eq('id', documentId)

      // PDF URL 가져오기
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(docData.file_path)

      setPdfUrl(urlData.publicUrl)
    } catch (err) {
      console.error('Error loading document:', err)
      alert('문서를 불러오는데 실패했습니다.')
      router.push('/browse')
    } finally {
      setLoading(false)
    }
  }

  const createReadingSession = async () => {
    if (!user || !document) return

    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .insert({
          document_id: documentId,
          reader_id: user.id,
          current_page: pageNumber,
        })
        .select()
        .single()

      if (error) throw error
      setSessionId(data.id)
    } catch (err) {
      console.error('Error creating session:', err)
    }
  }

  const updateReadingTime = async (elapsed: number) => {
    if (!sessionId) return

    try {
      await supabase
        .from('reading_sessions')
        .update({
          reading_time: elapsed,
          current_page: pageNumber,
          last_read_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      // 문서의 총 읽기 시간도 업데이트
      if (document) {
        await supabase
          .from('documents')
          .update({
            total_reading_time: document.total_reading_time + 10,
          })
          .eq('id', documentId)
      }
    } catch (err) {
      console.error('Error updating reading time:', err)
    }
  }

  const saveReadingSession = async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    await updateReadingTime(elapsed)
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 헤더 */}
      <header className="bg-gray-800 text-white border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/browse')}
                className="text-white hover:bg-gray-700"
              >
                ← 뒤로
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{document?.title}</h1>
                {authorProfile && (
                  <p className="text-sm text-gray-400">
                    작가: {authorProfile.username || authorProfile.email}
                  </p>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-400">
              읽기 시간: {Math.floor(totalTime / 60)}분 {totalTime % 60}초
            </div>
          </div>

          {/* 작가 정보 & 구독 버튼 */}
          {authorProfile && (
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {(authorProfile.username || authorProfile.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {authorProfile.username || authorProfile.email}
                  </p>
                  <p className="text-sm text-gray-400">
                    {authorProfile.role === 'author' ? '작가' : '독자'}
                  </p>
                </div>
              </div>
              <SubscribeButton
                authorId={authorProfile.id}
                authorName={authorProfile.username || authorProfile.email}
                initialSubscribersCount={authorProfile.subscribers_count}
              />
            </div>
          )}

          {/* 좋아요/싫어요 버튼 */}
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg shadow">
              <ReactionButtons
                documentId={documentId}
                initialLikes={document?.likes_count || 0}
                initialDislikes={document?.dislikes_count || 0}
              />
            </div>
            <div className="text-sm text-gray-400">
              조회수 {document?.view_count.toLocaleString()}회
            </div>
          </div>
        </div>
      </header>

      {/* PDF 뷰어 */}
      <div className="flex flex-col items-center py-8">
        <div className="mb-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-4 py-2 bg-white rounded text-sm">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="border-l mx-2"></div>
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-white shadow-2xl">
          <PDFDocument
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="p-8">PDF 로딩 중...</div>}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </PDFDocument>
        </div>

        {/* 광고 */}
        <div className="mt-8 max-w-4xl w-full px-4">
          <AdBanner position="bottom" documentId={documentId} />
        </div>
      </div>
    </div>
  )
}