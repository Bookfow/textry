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
import { PageAdBanner } from '@/components/page-ad-banner'

type SeriesDoc = { documentId: string; position: number; title: string; episodeTitle?: string; thumbnailUrl?: string | null }
type TocItem = { title: string; pageNumber: number; level: number }

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
  const [seriesContentType, setSeriesContentType] = useState<string>('document')
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)
  const [readerCount, setReaderCount] = useState(0)
  const [completionRate, setCompletionRate] = useState<number | null>(null)

  // ━━━ 탭 상태 ━━━
  const [activeTab, setActiveTab] = useState<'intro' | 'info' | 'author' | 'toc' | 'episodes'>('intro')
  const [toc, setToc] = useState<TocItem[]>([])
  const [tocLoading, setTocLoading] = useState(false)
  const [tocLoaded, setTocLoaded] = useState(false)

  useEffect(() => {
    loadDocument()
  }, [documentId])

  // ━━━ 목차 자동 추출 ━━━
  const loadToc = async () => {
    if (tocLoaded) return
    setTocLoading(true)
    try {
      const { data, error } = await supabase
        .from('document_pages_text')
        .select('page_number, text_content')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true })

      if (error || !data) { setTocLoaded(true); return }

      const items: TocItem[] = []
      const seenTitles = new Set<string>()

      for (const row of data) {
        const text = row.text_content || ''

        // HTML heading 태그에서 추출
        const headingRegex = /<h([1-3])[^>]*>(.*?)<\/h[1-3]>/gi
        let match
        while ((match = headingRegex.exec(text)) !== null) {
          const level = parseInt(match[1])
          const title = match[2].replace(/<[^>]+>/g, '').trim()
          if (title && title.length > 1 && title.length < 100 && !seenTitles.has(title)) {
            seenTitles.add(title)
            items.push({ title, pageNumber: row.page_number, level })
          }
        }

        // heading이 없으면 페이지 첫 줄에서 챕터/장/편 패턴 추출
        if (items.filter(i => i.pageNumber === row.page_number).length === 0) {
          const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          const lines = clean.split(/[.!?\n]/).map((l: string) => l.trim()).filter((l: string) => l.length > 0)
          if (lines.length > 0) {
            const firstLine = lines[0]
            // 패턴: "제1장", "Chapter 1", "1장", "제1편", "PART 1", "목차", "서론", "결론" 등
            const chapterPattern = /^(제?\s*\d+\s*[장절편부화회]|chapter\s*\d+|part\s*\d+|서론|결론|에필로그|프롤로그|머리말|맺음말|들어가며|나가며|\d+\.\s+\S)/i
            if (chapterPattern.test(firstLine) && firstLine.length < 80 && !seenTitles.has(firstLine)) {
              seenTitles.add(firstLine)
              items.push({ title: firstLine, pageNumber: row.page_number, level: 2 })
            }
          }
        }
      }

      setToc(items)
    } catch (err) {
      console.error('Error loading TOC:', err)
    } finally {
      setTocLoading(false)
      setTocLoaded(true)
    }
  }

  // 목차 탭 클릭 시 로드
  useEffect(() => {
    if (activeTab === 'toc' && !tocLoaded) {
      loadToc()
    }
  }, [activeTab])

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
        .eq('author_name', docData.author_name)
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
          .select('id, title, content_type')
          .eq('id', seriesDoc.series_id)
          .single()

        if (series) {
          setSeriesTitle(series.title)
          setSeriesContentType(series.content_type || 'document')
          const { data: allDocs } = await supabase
            .from('series_documents')
            .select('document_id, position, episode_title')
            .eq('series_id', series.id)
            .order('position', { ascending: true })

          if (allDocs) {
            const docIds = allDocs.map(d => d.document_id)
            const { data: docTitles } = await supabase
              .from('documents')
              .select('id, title, thumbnail_url')
              .in('id', docIds)
            const titleMap = new Map((docTitles || []).map(d => [d.id, d.title]))
            const thumbMap = new Map((docTitles || []).map(d => [d.id, (d as any).thumbnail_url]))

            setSeriesDocs(allDocs.map(d => ({
              documentId: d.document_id,
              position: d.position,
              title: titleMap.get(d.document_id) || '',
              episodeTitle: (d as any).episode_title || undefined,
              thumbnailUrl: thumbMap.get(d.document_id) || null,
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

      // ━━━ 이 콘텐츠를 읽은 사람이 본 다른 문서 ━━━
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
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
          <p className="text-[#9C8B7A] mb-4">콘텐츠를 찾을 수 없습니다</p>
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
            <Image src={doc.thumbnail_url} alt="" fill className="object-cover scale-110" sizes="100vw" priority />
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
                <div className="mb-4">
                  {/* 창작자 + 큐레이터 */}
                  <div className="flex flex-col gap-2">
                    {/* 창작자 (author_name이 있고 업로더와 다를 때) */}
                    {(doc as any).author_name && (doc as any).author_name !== author.username && (
                      <Link href={`/browse?author=${encodeURIComponent((doc as any).author_name)}`}>
                        <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#5C4A38] to-[#8B7049] rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {((doc as any).author_name)[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1]">{(doc as any).author_name}</span>
                            <span className="text-[10px] text-[#9C8B7A] ml-1.5">창작자</span>
                          </div>
                        </div>
                      </Link>
                    )}

                    {/* 큐레이터 (업로드한 사람) */}
                    <div className="flex items-center justify-center sm:justify-between gap-3">
                      <Link href={`/profile/${author.id}`}>
                        <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                          {author.avatar_url ? (
                            <Image src={author.avatar_url} alt="" width={32} height={32} className="rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] rounded-full flex items-center justify-center text-[#1A1410] font-bold text-xs">
                              {(author.username || author.email)[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1]">{author.username || author.email}</span>
                            <span className="text-[10px] text-[#9C8B7A] ml-1.5">{(doc as any).author_name && (doc as any).author_name === (author.username || author.email) ? '창작자 · 큐레이터' : '큐레이터'}</span>
                          </div>
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
                  </div>
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
                  {progress !== null && progress > 0 ? `이어서 읽기 (${progress}%)` : (seriesDocs.length > 0 && seriesContentType === 'webtoon' ? '이 회차 읽기' : '바로 읽기')}
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

        {/* ━━━ 탭 네비게이션 ━━━ */}
        <div className="flex border-b border-[#E7D8C9] dark:border-[#3A302A] mb-5 gap-1 overflow-x-auto scrollbar-hide">
          {[
            { key: 'intro' as const, label: '소개' },
            ...(seriesDocs.length > 0 && seriesContentType === 'webtoon' ? [{ key: 'episodes' as const, label: `회차 (${seriesDocs.length})` }] : []),
            { key: 'info' as const, label: doc.content_type === 'webtoon' ? '웹툰정보' : '도서정보' },
            { key: 'author' as const, label: (doc as any).author_name && (doc as any).author_name !== author?.username ? '창작자·큐레이터' : '큐레이터' },
            ...(doc.content_type !== 'webtoon' ? [{ key: 'toc' as const, label: '목차' }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.key
                  ? 'text-[#B2967D]'
                  : 'text-[#9C8B7A] hover:text-[#5C4A38] dark:hover:text-[#C4A882]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B2967D] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ━━━ 탭 콘텐츠 ━━━ */}
        <div className="mb-6 p-5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl min-h-[120px]">

          {/* 소개 탭 */}
          {activeTab === 'intro' && (
            <div>
              {doc.description ? (
                <p className="text-sm text-[#5C4A38] dark:text-[#C4A882] leading-relaxed whitespace-pre-wrap">{doc.description}</p>
              ) : (
                <p className="text-sm text-[#9C8B7A] italic">소개가 등록되지 않았습니다.</p>
              )}
            </div>
          )}

          {/* 도서정보 탭 */}
          {activeTab === 'info' && (
            <div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <p className="text-xs text-[#9C8B7A] mb-1">카테고리</p>
                  <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1] font-medium">
                    {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
                  </p>
                </div>
                {doc.page_count > 0 && (
                  <div>
                    <p className="text-xs text-[#9C8B7A] mb-1">페이지</p>
                    <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1] font-medium">{doc.page_count}페이지</p>
                  </div>
                )}
                {doc.file_size > 0 && (
                  <div>
                    <p className="text-xs text-[#9C8B7A] mb-1">파일 크기</p>
                    <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1] font-medium">{formatFileSize(doc.file_size)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[#9C8B7A] mb-1">언어</p>
                  <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1] font-medium">
                    {doc.language === 'ko' ? '한국어' : doc.language === 'en' ? 'English' : doc.language}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9C8B7A] mb-1">등록일</p>
                  <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1] font-medium">{formatDate(doc.created_at)}</p>
                </div>
                {doc.updated_at !== doc.created_at && (
                  <div>
                    <p className="text-xs text-[#9C8B7A] mb-1">최종 수정</p>
                    <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1] font-medium">{formatDate(doc.updated_at)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[#9C8B7A] mb-1">조회수</p>
                  <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1] font-medium">{doc.view_count.toLocaleString()}회</p>
                </div>
                {doc.total_reading_time > 0 && (
                  <div>
                    <p className="text-xs text-[#9C8B7A] mb-1">총 읽기 시간</p>
                    <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1] font-medium">{formatReadingTime(doc.total_reading_time)}</p>
                  </div>
                )}
              </div>

              {/* 파일 형식 */}
              <div className="mt-5 pt-4 border-t border-[#E7D8C9] dark:border-[#3A302A]">
                <p className="text-xs text-[#9C8B7A] mb-2">지원 형식</p>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-[#EEE4E1] dark:bg-[#2E2620] text-[#5C4A38] dark:text-[#C4A882] text-xs rounded-md font-medium">
                    {doc.file_path?.endsWith('.epub') ? 'EPUB' : 'PDF'}
                  </span>
                  <span className="px-2.5 py-1 bg-[#EEE4E1] dark:bg-[#2E2620] text-[#5C4A38] dark:text-[#C4A882] text-xs rounded-md font-medium">
                    리플로우
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 창작자/큐레이터 탭 */}
          {activeTab === 'author' && author && (
            <div>
              {/* 창작자 정보 (author_name이 있고 업로더와 다를 때) */}
              {(doc as any).author_name && (doc as any).author_name !== author.username && (
                <div className="mb-5 pb-5 border-b border-[#E7D8C9] dark:border-[#3A302A]">
                  <p className="text-[10px] uppercase tracking-wider text-[#9C8B7A] font-semibold mb-3">창작자</p>
                  <div className="flex items-center gap-4 mb-3">
                    <Link href={`/browse?author=${encodeURIComponent((doc as any).author_name)}`}>
                      <div className="w-14 h-14 bg-gradient-to-br from-[#5C4A38] to-[#8B7049] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {((doc as any).author_name)[0].toUpperCase()}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <Link href={`/browse?author=${encodeURIComponent((doc as any).author_name)}`}>
                        <p className="text-base font-semibold text-[#2D2016] dark:text-[#EEE4E1] hover:underline">{(doc as any).author_name}</p>
                      </Link>
                    </div>
                  </div>
                  {(doc as any).author_bio ? (
                    <p className="text-sm text-[#5C4A38] dark:text-[#C4A882] leading-relaxed whitespace-pre-wrap">{(doc as any).author_bio}</p>
                  ) : (
                    <p className="text-sm text-[#9C8B7A] italic">창작자 소개가 등록되지 않았습니다.</p>
                  )}
                  {/* 이 창작자의 다른 작품 */}
                  {moreDocs.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-[#9C8B7A] mb-2">이 창작자의 다른 작품 ({moreDocs.length})</p>
                      <div className="space-y-1.5">
                        {moreDocs.slice(0, 4).map(d => (
                          <div key={d.id} onClick={() => router.push(`/document/${d.id}`)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] cursor-pointer transition-colors">
                            <div className="w-8 h-10 flex-shrink-0 rounded overflow-hidden bg-[#EEE4E1] dark:bg-[#2E2620]">
                              {d.thumbnail_url ? (
                                <Image src={d.thumbnail_url} alt="" width={32} height={40} className="object-cover w-full h-full" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-3 h-3 text-[#9C8B7A]" /></div>
                              )}
                            </div>
                            <span className="text-sm text-[#5C4A38] dark:text-[#C4A882] truncate flex-1">{d.title}</span>
                            <ChevronRight className="w-4 h-4 text-[#E7D8C9] dark:text-[#3A302A] flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                      {moreDocs.length > 4 && (
                        <Link href={`/browse?author=${encodeURIComponent((doc as any).author_name)}`} className="block mt-2 text-center text-xs text-[#B2967D] hover:underline">전체 보기 →</Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 큐레이터 정보 (업로드한 사람) */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#9C8B7A] font-semibold mb-3">
                  {(doc as any).author_name && (doc as any).author_name === (author.username || author.email) ? '창작자 · 큐레이터' : '큐레이터'}
                </p>
                <div className="flex items-center gap-4 mb-3">
                  <Link href={`/profile/${author.id}`}>
                    {author.avatar_url ? (
                      <Image src={author.avatar_url} alt="" width={56} height={56} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] rounded-full flex items-center justify-center text-[#1A1410] font-bold text-lg">
                        {(author.username || author.email)[0].toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <Link href={`/profile/${author.id}`}>
                      <p className="text-base font-semibold text-[#2D2016] dark:text-[#EEE4E1] hover:underline">{author.username || author.email}</p>
                    </Link>
                    <p className="text-xs text-[#9C8B7A] mt-0.5">구독자 {author.subscribers_count.toLocaleString()}명</p>
                  </div>
                  {user && user.id !== author.id && (
                    <SubscribeButton
                      authorId={author.id}
                      authorName={author.username || author.email}
                      initialSubscribersCount={author.subscribers_count}
                    />
                  )}
                </div>
                {author.bio ? (
                  <p className="text-sm text-[#5C4A38] dark:text-[#C4A882] leading-relaxed whitespace-pre-wrap">{author.bio}</p>
                ) : (
                  <p className="text-sm text-[#9C8B7A] italic">큐레이터 소개가 등록되지 않았습니다.</p>
                )}

                {/* 창작자=큐레이터인 경우 다른 도서 목록 */}
                {(!(doc as any).author_name || (doc as any).author_name === author.username) && moreDocs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#E7D8C9] dark:border-[#3A302A]">
                    <p className="text-xs text-[#9C8B7A] mb-2">다른 콘텐츠 ({moreDocs.length})</p>
                    <div className="space-y-1.5">
                      {moreDocs.slice(0, 4).map(d => (
                        <div key={d.id} onClick={() => router.push(`/document/${d.id}`)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] cursor-pointer transition-colors">
                          <div className="w-8 h-10 flex-shrink-0 rounded overflow-hidden bg-[#EEE4E1] dark:bg-[#2E2620]">
                            {d.thumbnail_url ? (
                              <Image src={d.thumbnail_url} alt="" width={32} height={40} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-3 h-3 text-[#9C8B7A]" /></div>
                            )}
                          </div>
                          <span className="text-sm text-[#5C4A38] dark:text-[#C4A882] truncate flex-1">{d.title}</span>
                          <ChevronRight className="w-4 h-4 text-[#E7D8C9] dark:text-[#3A302A] flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                    {moreDocs.length > 4 && (
                      <Link href={`/browse?author_id=${author.id}`} className="block mt-2 text-center text-xs text-[#B2967D] hover:underline">전체 보기 →</Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* 회차 목록 탭 (웹툰 시리즈) */}
          {activeTab === 'episodes' && (
            <div>
              <div className="space-y-1">
                {seriesDocs.map((sd, i) => (
                  <div
                    key={sd.documentId}
                    onClick={() => { if (sd.documentId !== documentId) router.push(`/document/${sd.documentId}`) }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${
                      sd.documentId === documentId
                        ? 'bg-[#B2967D]/10 border border-[#B2967D]/30'
                        : 'hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] cursor-pointer border border-transparent'
                    }`}
                  >
                    {/* 썸네일 */}
                    <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#EEE4E1] dark:bg-[#2E2620]">
                      {sd.thumbnailUrl ? (
                        <img src={sd.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#9C8B7A] text-xs">
                          {sd.position}화
                        </div>
                      )}
                    </div>
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        sd.documentId === documentId
                          ? 'text-[#B2967D]'
                          : 'text-[#2D2016] dark:text-[#EEE4E1]'
                      }`}>
                        {sd.position}화{sd.episodeTitle ? ` - ${sd.episodeTitle}` : ''}
                      </p>
                      <p className="text-xs text-[#9C8B7A] mt-0.5 truncate">{sd.title}</p>
                    </div>
                    {/* 현재 표시 */}
                    {sd.documentId === documentId ? (
                      <span className="text-[10px] bg-[#B2967D]/20 text-[#B2967D] px-2 py-1 rounded-full flex-shrink-0 font-medium">읽는 중</span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#E7D8C9] dark:text-[#3A302A] flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 목차 탭 */}
          {activeTab === 'toc' && (
            <div>
              {tocLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#B2967D] border-t-transparent rounded-full animate-spin mr-3" />
                  <span className="text-sm text-[#9C8B7A]">목차를 추출하는 중...</span>
                </div>
              ) : toc.length > 0 ? (
                <div className="space-y-1">
                  {toc.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => router.push(`/read/${documentId}`)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] cursor-pointer transition-colors"
                      style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                    >
                      <span className="text-xs text-[#9C8B7A] flex-shrink-0 w-8 text-right tabular-nums">{item.pageNumber}p</span>
                      <span className={`text-sm truncate ${
                        item.level === 1
                          ? 'text-[#2D2016] dark:text-[#EEE4E1] font-semibold'
                          : item.level === 2
                            ? 'text-[#5C4A38] dark:text-[#C4A882] font-medium'
                            : 'text-[#9C8B7A]'
                      }`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-[#E7D8C9] dark:text-[#3A302A] mx-auto mb-3" />
                  <p className="text-sm text-[#9C8B7A]">자동 추출된 목차가 없습니다.</p>
                  <p className="text-xs text-[#9C8B7A]/60 mt-1">문서에 챕터/장 구분이 포함된 경우 자동으로 표시됩니다.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 시리즈 (문서 시리즈만 표시, 웹툰은 탭으로 이동) */}
        {seriesDocs.length > 0 && seriesContentType !== 'webtoon' && (
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

        {/* 광고 배너 */}
        <div className="mb-6">
          <PageAdBanner position="detail_page" documentId={documentId} authorId={doc?.author_id} />
        </div>

        {/* 댓글 */}
        <div className="mb-6 p-5 bg-white dark:bg-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl">
          <CommentsSection documentId={documentId} />
        </div>



        {/* 이 콘텐츠를 읽은 사람이 본 */}
        {alsoReadDocs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#2D2016] dark:text-[#EEE4E1] mb-4">
              이 콘텐츠를 읽은 사람이 본
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {alsoReadDocs.map(d => (
                <DocumentCard
                  key={d.id}
                  doc={d}
                  authorName={(d as any).author_name || (d as any).profiles?.username || (d as any).profiles?.email}
                  variant="grid"
                />
              ))}
            </div>
          </div>
        )}

        {/* 이 큐레이터의 다른 콘텐츠 */}
        {moreDocs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#2D2016] dark:text-[#EEE4E1]">
                {(doc as any).author_name || author?.username || '큐레이터'}의 다른 콘텐츠
              </h2>
              <Link href={`${(doc as any).author_name ? `/browse?author=${encodeURIComponent((doc as any).author_name)}` : `/browse?author_id=${author?.id}`}`} className="flex items-center gap-1 text-sm text-[#B2967D] hover:text-[#a67c52]">
                전체보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {moreDocs.map(d => (
                <DocumentCard key={d.id} doc={d} authorName={(doc as any).author_name || author?.username || author?.email} variant="grid" />
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
