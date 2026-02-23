'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, WebtoonImage } from '@/lib/supabase'
import { ChevronUp, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { AdBanner } from '@/components/ad-banner'
import { useRouter } from 'next/navigation'

interface SeriesEpisode {
  documentId: string
  position: number
  title: string
  episodeTitle?: string
}

interface WebtoonViewerProps {
  documentId: string
  authorId?: string
  isPremium?: boolean
  isRewardAdFree?: boolean
  onProgress?: (current: number, total: number) => void
}

export default function WebtoonViewer({
  documentId,
  authorId,
  isPremium = false,
  isRewardAdFree = false,
  onProgress,
}: WebtoonViewerProps) {
  const router = useRouter()
  const [images, setImages] = useState<WebtoonImage[]>([])
  const [loading, setLoading] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 시리즈 정보
  const [seriesTitle, setSeriesTitle] = useState('')
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([])
  const [currentPosition, setCurrentPosition] = useState(0)
  const [prevEpisodeId, setPrevEpisodeId] = useState<string | null>(null)
  const [nextEpisodeId, setNextEpisodeId] = useState<string | null>(null)
  const [showEpisodeList, setShowEpisodeList] = useState(false)

  // 이미지 로드
  useEffect(() => {
    const loadImages = async () => {
      const { data, error } = await supabase
        .from('webtoon_images')
        .select('*')
        .eq('document_id', documentId)
        .order('image_order', { ascending: true })
      if (!error && data) {
        setImages(data)
        if (data.length > 0 && onProgress) {
          onProgress(1, data.length)
        }
      }
      setLoading(false)
    }
    loadImages()
  }, [documentId])

  // 시리즈 정보 로드
  useEffect(() => {
    const loadSeries = async () => {
      const { data: seriesDoc } = await supabase
        .from('series_documents')
        .select('series_id, position')
        .eq('document_id', documentId)
        .maybeSingle()
      if (!seriesDoc) return

      const { data: series } = await supabase
        .from('document_series')
        .select('id, title')
        .eq('id', seriesDoc.series_id)
        .single()
      if (!series) return

      setSeriesTitle(series.title)

      const { data: allDocs } = await supabase
        .from('series_documents')
        .select('document_id, position, episode_title')
        .eq('series_id', series.id)
        .order('position', { ascending: true })
      if (!allDocs) return

      const docIds = allDocs.map(d => d.document_id)
      const { data: docTitles } = await supabase
        .from('documents')
        .select('id, title')
        .in('id', docIds)
      const titleMap = new Map((docTitles || []).map(d => [d.id, d.title]))

      const eps = allDocs.map(d => ({
        documentId: d.document_id,
        position: d.position,
        title: titleMap.get(d.document_id) || '',
        episodeTitle: (d as any).episode_title || undefined,
      }))
      setEpisodes(eps)

      const currentIdx = allDocs.findIndex(d => d.document_id === documentId)
      setCurrentPosition(currentIdx + 1)
      setPrevEpisodeId(currentIdx > 0 ? allDocs[currentIdx - 1].document_id : null)
      setNextEpisodeId(currentIdx < allDocs.length - 1 ? allDocs[currentIdx + 1].document_id : null)
    }
    loadSeries()
  }, [documentId])

  // 스크롤 추적
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    setShowScrollTop(scrollTop > 500)

    // 끝 도달 체크
    const isNearEnd = scrollTop + clientHeight >= scrollHeight - 100
    setReachedEnd(isNearEnd)

    // 진행률
    if (images.length > 0 && onProgress) {
      const progress = scrollTop / (scrollHeight - clientHeight)
      const currentImage = Math.min(
        Math.ceil(progress * images.length),
        images.length
      )
      onProgress(currentImage, images.length)
    }
  }, [images.length, onProgress])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // 광고 삽입 위치
  const getAdPositions = (total: number): Set<number> => {
    if (isPremium || isRewardAdFree || total < 5) return new Set()
    const interval = total <= 15 ? 12 : total <= 30 ? 10 : 8
    const positions = new Set<number>()
    for (let i = interval; i < total; i += interval) {
      positions.add(i)
    }
    return positions
  }

  const adPositions = getAdPositions(images.length)

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#C4A882] text-sm">웹툰 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[#9C8B7A]">이미지가 없습니다</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-[#0a0a0a]"
      style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-[800px] mx-auto">

        {/* 시리즈 상단 바 */}
        {episodes.length > 0 && (
          <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur-sm border-b border-[#333] px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {prevEpisodeId && (
                  <button onClick={() => router.push(`/read/${prevEpisodeId}`)}
                    className="p-1.5 rounded-lg hover:bg-[#333] text-[#999] hover:text-white transition-colors flex-shrink-0"
                    title="이전화">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#999] truncate">{seriesTitle}</p>
                  <p className="text-sm text-white font-medium truncate">{currentPosition}화</p>
                </div>
                {nextEpisodeId && (
                  <button onClick={() => router.push(`/read/${nextEpisodeId}`)}
                    className="p-1.5 rounded-lg hover:bg-[#333] text-[#999] hover:text-white transition-colors flex-shrink-0"
                    title="다음화">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={() => setShowEpisodeList(!showEpisodeList)}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ml-2 ${showEpisodeList ? 'bg-[#B2967D] text-black' : 'hover:bg-[#333] text-[#999] hover:text-white'}`}
                title="회차 목록">
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* 회차 드롭다운 */}
            {showEpisodeList && (
              <div className="mt-2 max-h-[300px] overflow-y-auto border border-[#333] rounded-xl bg-[#1a1a1a]">
                {episodes.map((ep) => (
                  <button
                    key={ep.documentId}
                    onClick={() => {
                      if (ep.documentId !== documentId) router.push(`/read/${ep.documentId}`)
                      setShowEpisodeList(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors border-b border-[#222] last:border-b-0 ${
                      ep.documentId === documentId
                        ? 'bg-[#B2967D]/15 text-[#B2967D]'
                        : 'text-[#ccc] hover:bg-[#222]'
                    }`}
                  >
                    <span className="w-8 text-center text-xs text-[#777] flex-shrink-0">{ep.position}화</span>
                    <span className="flex-1 truncate">{ep.episodeTitle || ep.title}</span>
                    {ep.documentId === documentId && (
                      <span className="text-[10px] bg-[#B2967D]/20 px-1.5 py-0.5 rounded flex-shrink-0">현재</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 이미지들 */}
        {images.map((img, index) => (
          <div key={img.id}>
            <img
              src={img.image_url}
              alt={`${index + 1}장`}
              loading={index < 3 ? 'eager' : 'lazy'}
              className="w-full block"
              style={{ minHeight: '100px' }}
            />
            {adPositions.has(index + 1) && (
              <div className="py-2 px-4 bg-[#111]">
                <div className="max-w-[728px] mx-auto h-[90px] overflow-hidden rounded">
                  <AdBanner position="bottom" documentId={documentId} authorId={authorId} />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ━━━ 하단: 다음화/이전화 네비게이션 ━━━ */}
        <div className="bg-[#111] border-t border-[#333] px-4 py-8">
          {/* 시리즈 네비게이션 */}
          {episodes.length > 0 && (
            <div className="max-w-md mx-auto">
              <p className="text-center text-xs text-[#777] mb-4">{seriesTitle} · {currentPosition}/{episodes.length}화</p>
              <div className="flex gap-3">
                {prevEpisodeId ? (
                  <button onClick={() => router.push(`/read/${prevEpisodeId}`)}
                    className="flex-1 py-3.5 bg-[#222] hover:bg-[#333] rounded-xl text-sm text-[#ccc] font-medium transition-colors text-center">
                    ← 이전화
                  </button>
                ) : (
                  <div className="flex-1 py-3.5 bg-[#1a1a1a] rounded-xl text-sm text-[#555] text-center">
                    첫 회차
                  </div>
                )}
                {nextEpisodeId ? (
                  <button onClick={() => router.push(`/read/${nextEpisodeId}`)}
                    className="flex-1 py-3.5 bg-[#B2967D] hover:bg-[#C4A882] rounded-xl text-sm text-[#1A1410] font-semibold transition-colors text-center shadow-lg shadow-[#B2967D]/20">
                    다음화 →
                  </button>
                ) : (
                  <div className="flex-1 py-3.5 bg-[#1a1a1a] rounded-xl text-sm text-[#555] text-center">
                    마지막 회차
                  </div>
                )}
              </div>

              {/* 작품 상세페이지 링크 */}
              <button onClick={() => router.push(`/document/${documentId}`)}
                className="w-full mt-3 py-2.5 bg-[#1a1a1a] hover:bg-[#222] rounded-xl text-xs text-[#999] transition-colors text-center">
                작품 상세 페이지로
              </button>
            </div>
          )}

          {/* 단편 웹툰 (시리즈 아닐 때) */}
          {episodes.length === 0 && (
            <div className="max-w-md mx-auto text-center">
              <p className="text-sm text-[#777] mb-4">웹툰을 끝까지 읽었습니다</p>
              <button onClick={() => router.push(`/document/${documentId}`)}
                className="px-6 py-3 bg-[#B2967D] hover:bg-[#C4A882] rounded-xl text-sm text-[#1A1410] font-medium transition-colors">
                상세 페이지로
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 맨 위로 버튼 */}
      {showScrollTop && (
        <button
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-20 p-3 bg-[#241E18]/90 border border-[#3A302A] rounded-full text-[#C4A882] hover:text-white transition-colors shadow-lg"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
