'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Eye, ThumbsUp, Clock, BookOpen, ChevronRight, FileText } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { ReactionButtons } from '@/components/reaction-buttons'
import { SubscribeButton } from '@/components/subscribe-button'
import { ShareButton } from '@/components/share-button'
import { ReadingListButton } from '@/components/reading-list-button'
import { CommentsSection } from '@/components/comments-section'
import { DocumentCard } from '@/components/document-card'

type SeriesDoc = { documentId: string; position: number; title: string }

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const documentId = params.id as string

  const [doc, setDoc] = useState<Document | null>(null)
  const [author, setAuthor] = useState<Profile | null>(null)
  const [moreDocs, setMoreDocs] = useState<Document[]>([])
  const [seriesDocs, setSeriesDocs] = useState<SeriesDoc[]>([])
  const [seriesTitle, setSeriesTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)

  useEffect(() => {
    loadDocument()
  }, [documentId])

  const loadDocument = async () => {
    try {
      // 문서 로드
      const { data: docData, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()
      if (error) throw error
      setDoc(docData)

      // 작가 프로필
      const { data: authorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', docData.author_id)
        .single()
      if (authorData) setAuthor(authorData)

      // 이 작가의 다른 문서
      const { data: otherDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', docData.author_id)
        .eq('is_published', true)
        .neq('id', documentId)
        .order('created_at', { ascending: false })
        .limit(6)
      if (otherDocs) setMoreDocs(otherDocs)

      // 시리즈 정보
      const { data: seriesDoc } = await supabase
        .from('series_documents')
        .select('series_id, position')
        .eq('document_id', documentId)
        .maybeSingle()

      if (seriesDoc) {
        const { data: series } = await supabase
          .from('document_series')
          .select('id, title')
          .eq('id', seriesDoc.series_id)
          .single()

        if (series) {
          setSeriesTitle(series.title)
          const { data: allDocs } = await supabase
            .from('series_documents')
            .select('document_id, position')
            .eq('series_id', series.id)
            .order('position', { ascending: true })

          if (allDocs) {
            const docIds = allDocs.map(d => d.document_id)
            const { data: docTitles } = await supabase
              .from('documents')
              .select('id, title')
              .in('id', docIds)
            const titleMap = new Map((docTitles || []).map(d => [d.id, d.title]))

            setSeriesDocs(allDocs.map(d => ({
              documentId: d.document_id,
              position: d.position,
              title: titleMap.get(d.document_id) || '',
            })))
          }
        }
      }

      // 읽기 진행률
      if (user) {
        const { data: session } = await supabase
          .from('reading_sessions')
          .select('current_page')
          .eq('document_id', documentId)
          .eq('reader_id', user.id)
          .order('last_read_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (session && docData.page_count > 0) {
          setProgress(Math.round((session.current_page / docData.page_count) * 100))
        }
      }
    } catch (err) {
      console.error('Error loading document:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatReadingTime = (seconds: number) => {
    if (seconds < 60) return '1분 미만'
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}분`
    const hours = Math.floor(mins / 60)
    return `${hours}시간 ${mins % 60}분`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#9C8B7A]">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9C8B7A] mb-4">문서를 찾을 수 없습니다</p>
          <button onClick={() => router.push('/home')} className="text-[#B2967D] hover:underline">홈으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* ━━━ 상단: 표지 + 정보 ━━━ */}
        <div className="flex flex-col sm:flex-row gap-6 md:gap-8 mb-8">

          {/* 표지 */}
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="relative w-[200px] md:w-[240px] aspect-[3/4] rounded-xl overflow-hidden shadow-lg bg-[#EEE4E1] dark:bg-[#2E2620]">
              {doc.thumbnail_url ? (
                <Image src={doc.thumbnail_url} alt={doc.title} fill className="object-cover" sizes="240px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-[#E7D8C9] dark:text-[#3A302A]" />
                </div>
              )}
              {/* 진행률 오버레이 */}
              {progress !== null && progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0">
                  <div className="h-1.5 bg-black/20">
                    <div className="h-full bg-gradient-to-r from-[#B2967D] to-[#E6BEAE]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            {/* 카테고리 */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEE4E1] dark:bg-[#2E2620] text-[#5C4A38] dark:text-[#C4A882] text-xs rounded-full mb-3">
              {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
            </span>

            {/* 제목 */}
            <h1 className="text-2xl md:text-3xl font-bold text-[#2D2016] dark:text-[#EEE4E1] mb-3 leading-tight">
              {doc.title}
            </h1>

            {/* 작가 */}
            {author && (
              <div className="flex items-center justify-between mb-4">
                <Link href={`/author/${author.id}`}>
                  <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    {author.avatar_url ? (
                      <Image src={author.avatar_url} alt="" width={36} height={36} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] rounded-full flex items-center justify-center text-[#1A1410] font-bold text-sm">
                        {(author.username || author.email)[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1]">
                      {author.username || author.email}
                    </span>
                  </div>
                </Link>
                {user && user.id !== author.id && (
                  <SubscribeButton
                    authorId={author.id}
                    authorName={author.username || author.email}
                    initialSubscribersCount={author.subscribers_count}
                  />
                )}
              </div>
            )}

            {/* 통계 */}
            <div className="flex items-center gap-4 text-sm text-[#9C8B7A] mb-5">
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {doc.view_count.toLocaleString()}</span>
              <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> {doc.likes_count.toLocaleString()}</span>
              {doc.page_count > 0 && (
                <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {doc.page_count}p</span>
              )}
              {doc.total_reading_time > 0 && (
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatReadingTime(doc.total_reading_time)}</span>
              )}
            </div>

            {/* CTA 버튼 */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => router.push(`/document/${doc.id}`)}
                className="flex-1 sm:flex-none px-8 py-3 bg-[#B2967D] hover:bg-[#a67c52] text-white font-semibold rounded-full transition-colors shadow-md shadow-[#B2967D]/20 text-base"
              >
                {progress !== null && progress > 0 ? `이어서 읽기 (${progress}%)` : '무료로 읽기'}
              </button>
              <ReadingListButton documentId={documentId} />
              <ShareButton documentId={documentId} title={doc.title} />
            </div>

            {/* 좋아요/싫어요 */}
            <ReactionButtons documentId={documentId} initialLikes={doc.likes_count} initialDislikes={doc.dislikes_count} />
          </div>
        </div>

        {/* ━━━ 소개 ━━━ */}
        {doc.description && (
          <div className="mb-8 p-5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl">
            <h2 className="text-sm font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-2">소개</h2>
            <p className="text-sm text-[#5C4A38] dark:text-[#C4A882] leading-relaxed whitespace-pre-wrap">{doc.description}</p>
          </div>
        )}

        {/* ━━━ 시리즈 ━━━ */}
        {seriesDocs.length > 0 && (
          <div className="mb-8 p-5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl">
            <h2 className="text-sm font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-3">📚 {seriesTitle}</h2>
            <div className="space-y-1">
              {seriesDocs.map((sd, i) => (
                <div
                  key={sd.documentId}
                  onClick={() => { if (sd.documentId !== documentId) router.push(`/document/${sd.documentId}`) }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    sd.documentId === documentId
                      ? 'bg-[#B2967D]/10 text-[#B2967D] font-medium'
                      : 'text-[#5C4A38] dark:text-[#C4A882] hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] cursor-pointer'
                  }`}
                >
                  <span className="w-6 text-center text-[#9C8B7A] text-xs">{i + 1}</span>
                  <span className="flex-1 truncate">{sd.title}</span>
                  {sd.documentId === documentId && (
                    <span className="text-[10px] bg-[#B2967D]/20 px-2 py-0.5 rounded-full">현재</span>
                  )}
                  {sd.documentId !== documentId && (
                    <ChevronRight className="w-4 h-4 text-[#E7D8C9] dark:text-[#3A302A]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ━━━ 댓글 ━━━ */}
        <div className="mb-8 p-5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl">
          <CommentsSection documentId={documentId} />
        </div>

        {/* ━━━ 이 작가의 다른 문서 ━━━ */}
        {moreDocs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#2D2016] dark:text-[#EEE4E1]">
                {author?.username || '작가'}의 다른 문서
              </h2>
              <Link href={`/author/${author?.id}`} className="flex items-center gap-1 text-sm text-[#B2967D] hover:text-[#a67c52]">
                전체보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {moreDocs.map(d => (
                <DocumentCard key={d.id} doc={d} authorName={author?.username || author?.email} variant="grid" />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
