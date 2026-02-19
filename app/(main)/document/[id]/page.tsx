'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Eye, ThumbsUp, Clock, BookOpen, ChevronRight, FileText, Users } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
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
  const [alsoReadDocs, setAlsoReadDocs] = useState<Document[]>([])
  const [seriesDocs, setSeriesDocs] = useState<SeriesDoc[]>([])
  const [seriesTitle, setSeriesTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)
  const [readerCount, setReaderCount] = useState(0)
  const [completionRate, setCompletionRate] = useState<number | null>(null)

  useEffect(() => {
    loadDocument()
  }, [documentId])

  const loadDocument = async () => {
    try {
      const { data: docData, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()
      if (error) throw error
      setDoc(docData)

      const { data: authorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', docData.author_id)
        .single()
      if (authorData) setAuthor(authorData)

      const { data: otherDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', docData.author_id)
        .eq('is_published', true)
        .neq('id', documentId)
        .order('created_at', { ascending: false })
        .limit(6)
      if (otherDocs) setMoreDocs(otherDocs)

      // ━━━ 독자 수 & 완독률 ━━━
      try {
        const { data: readers } = await supabase
          .from('reading_sessions')
          .select('reader_id, current_page')
          .eq('document_id', documentId)

        if (readers && readers.length > 0) {
          const uniqueReaders = new Set(readers.map(r => r.reader_id))
          setReaderCount(uniqueReaders.size)

          if (docData.page_count > 0) {
            const readerMaxPages = new Map<string, number>()
            readers.forEach(r => {
              const prev = readerMaxPages.get(r.reader_id) || 0
              if (r.current_page > prev) readerMaxPages.set(r.reader_id, r.current_page)
            })
            let completedCount = 0
            readerMaxPages.forEach((maxPage) => {
              if (maxPage >= docData.page_count * 0.9) completedCount++
            })
            if (uniqueReaders.size > 0) {
              setCompletionRate(Math.round((completedCount / uniqueReaders.size) * 100))
            }
          }
        }
      } catch {}

      // ━━━ 시리즈 ━━━
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

      // ━━━ 읽기 진행도 (로그인 사용자) ━━━
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

      // ━━━ 이 문서를 읽은 사람이 본 다른 문서 ━━━
      try {
        const { data: otherReaders } = await supabase
          .from('reading_sessions')
          .select('reader_id')
          .eq('document_id', documentId)
          .limit(50)

        if (otherReaders && otherReaders.length > 0) {
          const otherUserIds = [...new Set(otherReaders.map(r => r.reader_id))].slice(0, 20)

          const { data: otherReadDocs } = await supabase
            .from('reading_sessions')
            .select('document_id')
            .in('reader_id', otherUserIds)
            .neq('document_id', documentId)
            .limit(100)

          if (otherReadDocs && otherReadDocs.length > 0) {
            const docFreq: Record<string, number> = {}
            otherReadDocs.forEach(r => {
              docFreq[r.document_id] = (docFreq[r.document_id] || 0) + 1
            })
            const topDocIds = Object.entries(docFreq)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([id]) => id)

            if (topDocIds.length > 0) {
              const { data: alsoDocs } = await supabase
                .from('documents')
                .select('*, profiles!documents_author_id_fkey(username, email, avatar_url)')
                .in('id', topDocIds)
                .eq('is_published', true)

              if (alsoDocs) {
                const sorted = topDocIds
                  .map(id => alsoDocs.find((d: any) => d.id === id))
                  .filter(Boolean) as Document[]
                setAlsoReadDocs(sorted)
              }
            }
          }
        }
      } catch {}

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
    <div className="min-h-screen pb-24 lg:pb-8">

      {/* ━━━ 블러 배경 히어로 ━━━ */}
      <div className="relative overflow-hidden">
        {/* 블러 배경 이미지 */}
        <div className="absolute inset-0 -inset-x-10">
          {doc.thumbnail_url ? (
            <Image src={doc.thumbnail_url} alt="" fill className="object-cover scale-110" sizes="100vw" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#B2967D] to-[#E6BEAE]" />
          )}
          <div className="absolute inset-0 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-[#F7F2EF]/70 dark:bg-[#1A1410]/80" />
        </div>

        {/* 히어로 콘텐츠 */}
        <div className="relative max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-8 md:pb-12">
          <div className="flex flex-col sm:flex-row gap-6 md:gap-8">

            {/* 표지 */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="relative w-[180px] md:w-[220px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-black/20 bg-[#EEE4E1] dark:bg-[#2E2620] ring-1 ring-white/10">
                {doc.thumbnail_url ? (
                  <Image src={doc.thumbnail_url} alt={doc.title} fill className="object-cover" sizes="220px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-[#E7D8C9] dark:text-[#3A302A]" />
                  </div>
                )}
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
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/60 dark:bg-[#2E2620]/60 backdrop-blur-sm text-[#5C4A38] dark:text-[#C4A882] text-xs rounded-full mb-3">
                {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
              </span>

              <h1 className="text-2xl md:text-3xl font-bold text-[#2D2016] dark:text-[#EEE4E1] mb-3 leading-tight">
                {doc.title}
              </h1>

              {author && (
                <div className="flex items-center justify-center sm:justify-between mb-4 gap-3">
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
                    <div className="hidden sm:block">
                      <SubscribeButton
                        authorId={author.id}
                        authorName={author.username || author.email}
                        initialSubscribersCount={author.subscribers_count}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 통계 */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-[#9C8B7A] mb-5">
                <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {doc.view_count.toLocaleString()}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> {doc.likes_count.toLocaleString()}</span>
                {doc.page_count > 0 && (
                  <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {doc.page_count}p</span>
                )}
                {doc.total_reading_time > 0 && (
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatReadingTime(doc.total_reading_time)}</span>
                )}
                {readerCount > 0 && (
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {readerCount}명 읽는 중</span>
                )}
              </div>

              {/* 완독률 바 */}
              {completionRate !== null && readerCount >= 3 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#9C8B7A]">완독률</span>
                    <span className="text-xs font-semibold text-[#5C4A38] dark:text-[#C4A882]">{completionRate}%</span>
                  </div>
                  <div className="h-2 bg-[#EEE4E1]/60 dark:bg-[#2E2620]/60 rounded-full overflow-hidden backdrop-blur-sm">
                    <div className="h-full bg-gradient-to-r from-[#B2967D] to-[#E6BEAE] rounded-full transition-all duration-500"
                      style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
              )}

              {/* 데스크톱 CTA */}
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href={`/read/${doc.id}`}
                  className="px-8 py-3 bg-[#B2967D] hover:bg-[#a67c52] text-white font-semibold rounded-full transition-colors shadow-lg shadow-[#B2967D]/25 text-base text-center"
                >
                  {progress !== null && progress > 0 ? `이어서 읽기 (${progress}%)` : '바로 읽기'}
                </Link>
                <ReadingListButton documentId={documentId} />
                <ShareButton documentId={documentId} title={doc.title} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ 본문 영역 ━━━ */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* 소개 */}
        {doc.description && (
          <div className="mb-6 p-5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl">
            <h2 className="text-sm font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-2">소개</h2>
            <p className="text-sm text-[#5C4A38] dark:text-[#C4A882] leading-relaxed whitespace-pre-wrap">{doc.description}</p>
          </div>
        )}

        {/* 시리즈 */}
        {seriesDocs.length > 0 && (
          <div className="mb-6 p-5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl">
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

        {/* 댓글 */}
        <div className="mb-6 p-5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl">
          <CommentsSection documentId={documentId} />
        </div>

        {/* 이 문서를 읽은 사람이 본 */}
        {alsoReadDocs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#2D2016] dark:text-[#EEE4E1] mb-4">
              이 문서를 읽은 사람이 본
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {alsoReadDocs.map(d => (
                <DocumentCard
                  key={d.id}
                  doc={d}
                  authorName={(d as any).profiles?.username || (d as any).profiles?.email}
                  variant="grid"
                />
              ))}
            </div>
          </div>
        )}

        {/* 이 작가의 다른 문서 */}
        {moreDocs.length > 0 && (
          <div className="mb-6">
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

      {/* ━━━ 모바일 하단 고정 CTA ━━━ */}
      <div className="fixed bottom-16 left-0 right-0 z-30 sm:hidden">
        <div className="bg-white/90 dark:bg-[#241E18]/90 backdrop-blur-md border-t border-[#E7D8C9] dark:border-[#3A302A] px-4 py-3">
          <div className="flex items-center gap-3">
            <ReadingListButton documentId={documentId} />
            <ShareButton documentId={documentId} title={doc.title} />
            <Link
              href={`/read/${doc.id}`}
              className="flex-1 py-3 bg-[#B2967D] hover:bg-[#a67c52] text-white font-semibold rounded-full transition-colors shadow-md shadow-[#B2967D]/20 text-sm text-center"
            >
              {progress !== null && progress > 0 ? `이어서 읽기 (${progress}%)` : '바로 읽기'}
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
 
