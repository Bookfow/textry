'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

interface AdOverlayProps {
  isVisible: boolean
  onClose: () => void
  skipDelay?: number
  type?: 'start' | 'middle' | 'end' | 'reward'
  documentId?: string
  authorId?: string
  viewerId?: string | null
  pageNumber?: number
  sessionId?: string | null
  onRewardComplete?: () => void
}

export function AdOverlay({
  isVisible,
  onClose,
  skipDelay = 5,
  type = 'middle',
  documentId,
  authorId,
  viewerId,
  pageNumber,
  sessionId,
  onRewardComplete,
}: AdOverlayProps) {
  // 보상형 광고 완료 시 호출
  const handleClose = () => {
    if (type === 'reward' && canSkip && onRewardComplete) {
      onRewardComplete()
    }
    onClose()
  }
  const [countdown, setCountdown] = useState(skipDelay)
  const [canSkip, setCanSkip] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])

  // 추천 콘텐츠 로드
  const loadRecommendations = useCallback(async () => {
    if (!documentId) return
    try {
      // 현재 문서의 카테고리 조회
      const { data: currentDoc } = await supabase
        .from('documents')
        .select('category, author_id')
        .eq('id', documentId)
        .single()

      if (!currentDoc) return

      // 같은 카테고리 + 같은 작가의 다른 콘텐츠 우선, 인기순
      const { data: docs } = await supabase
        .from('documents')
        .select('id, title, thumbnail_url, author_name, view_count, category')
        .neq('id', documentId)
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(20)

      if (!docs || docs.length === 0) return

      // 같은 카테고리 우선 정렬
      const sorted = docs.sort((a, b) => {
        const aMatch = a.category === currentDoc.category ? 1 : 0
        const bMatch = b.category === currentDoc.category ? 1 : 0
        if (aMatch !== bMatch) return bMatch - aMatch
        return (b.view_count || 0) - (a.view_count || 0)
      })

      setRecommendations(sorted.slice(0, 3))
    } catch (err) {
      console.error('추천 콘텐츠 로드 실패:', err)
    }
  }, [documentId])

  const logAdImpression = async () => {
    try {
      await supabase.from('ad_impressions').insert({
        document_id: documentId,
        author_id: authorId,
        viewer_id: viewerId || null,
        ad_type: type,
        ad_position: 'overlay',
        page_number: pageNumber || null,
        session_id: sessionId || null,
      })
    } catch (err) {
      console.error('Ad impression log error:', err)
    }
  }

  useEffect(() => {
    if (!isVisible) {
      const delay = type === 'reward' ? 30 : skipDelay
      setCountdown(delay)
      setCanSkip(false)
      return
    }

    // 광고 노출 로그 기록
    if (documentId) {
      logAdImpression()
    }

    // end 광고일 때 추천 콘텐츠 로드
    if (type === 'end') {
      loadRecommendations()
    }

    const actualDelay = type === 'reward' ? 30 : skipDelay
    setCountdown(actualDelay)
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, skipDelay])

  if (!isVisible) return null

  const titles: Record<string, string> = {
    start: '잠시 후 콘텐츠가 시작됩니다',
    middle: '광고',
    end: '다 읽으셨습니다!',
    reward: '🎬 광고 시청 중 — 1시간 무광고 보상!',
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      {/* 취소 확인 모달 */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70"
          onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-gray-900 border border-gray-600 rounded-2xl shadow-2xl p-6 mx-4 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-semibold text-base mb-2">광고 시청을 취소할까요?</p>
            <p className="text-gray-400 text-sm mb-5">무광고 보상이 취소됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-sm transition-colors">
                계속 시청
              </button>
              <button onClick={() => { setShowCancelConfirm(false); onClose() }}
                className="flex-1 px-4 py-2.5 bg-red-600/80 hover:bg-red-500 rounded-xl text-white text-sm font-medium transition-colors">
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative w-full max-w-lg mx-4">
        {/* 건너뛰기 버튼 */}
        <div className="absolute -top-12 right-0">
          {canSkip ? (
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white text-sm font-medium transition-all"
            >
              {type === 'reward' ? '🎉 1시간 무광고 시작!' : type === 'end' ? '닫기' : '광고 건너뛰기'}
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white/70 text-sm">
              {type === 'reward' ? (
                <div className="flex items-center gap-3">
                  <span>🎬 {countdown}초 시청하면 1시간 무광고!</span>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-2 py-0.5 text-xs bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-colors"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <span>{countdown}초 후 건너뛰기 가능</span>
              )}
            </div>
          )}
        </div>

        {/* 광고 컨테이너 */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
          {/* 상단 라벨 */}
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400">{titles[type]}</span>
            <span className="text-[10px] text-gray-500 px-2 py-0.5 bg-gray-800 rounded">AD</span>
          </div>

          {/* 광고 본문 영역 */}
          <div className="p-8 flex flex-col items-center justify-center min-h-[250px]">
            {/* TODO: 실제 AdSense 또는 직접 광고로 교체 */}
            <div className="w-full max-w-[336px] h-[280px] bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center">
              <p className="text-gray-400 text-sm mb-1">광고 영역</p>
              <p className="text-gray-500 text-xs">336 × 280 (Medium Rectangle)</p>
              <p className="text-gray-600 text-[10px] mt-3">Google AdSense 또는 직접 광고</p>
            </div>
          </div>

          {/* 하단 안내 */}
          <div className="px-4 py-2 bg-gray-800/30 border-t border-gray-700 text-center">
            <p className="text-[11px] text-gray-500">
              {type === 'reward'
                ? '이 광고를 끝까지 시청하면 1시간 동안 광고 없이 읽을 수 있습니다'
                : '광고 수익은 큐레이터님에게 돌아갑니다'}
            </p>
          </div>
        </div>

        {/* 끝 광고일 때 추천 콘텐츠 */}
        {type === 'end' && recommendations.length > 0 && (
          <div className="mt-3 bg-gray-900 border border-gray-700 rounded-xl p-3">
            <p className="text-xs font-medium text-white mb-2.5">이런 콘텐츠는 어떠세요?</p>
            <div className="flex gap-2">
              {recommendations.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/document/${doc.id}`}
                  onClick={handleClose}
                  className="flex-1 p-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/80 transition-colors cursor-pointer group"
                >
                  <div className="relative w-full aspect-[3/4] rounded overflow-hidden mb-1.5">
                    {doc.thumbnail_url ? (
                      <Image
                        src={doc.thumbnail_url}
                        alt={doc.title}
                        fill
                        sizes="120px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-200 font-medium line-clamp-2 leading-tight mb-0.5 group-hover:text-white transition-colors">
                    {doc.title}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {doc.author_name || ''}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
