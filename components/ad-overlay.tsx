'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
    start: '잠시 후 문서가 시작됩니다',
    middle: '광고',
    end: '다 읽으셨습니다!',
    reward: '🎬 광고 시청 중 — 1시간 무광고 보상!',
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm">
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
                    onClick={() => { if (confirm('광고 시청을 취소하시겠습니까?\n무광고 보상이 취소됩니다.')) onClose() }}
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
                : '광고 수익은 작가님에게 돌아갑니다'}
            </p>
          </div>
        </div>

        {/* 끝 광고일 때 추천 문서 영역 */}
        {(type === 'end') && (
          <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-3">이런 문서도 있어요</p>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="w-10 h-14 bg-gray-700 rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-3 w-3/4 bg-gray-700 rounded mb-1.5" />
                    <div className="h-2.5 w-1/2 bg-gray-700/50 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 text-center mt-2">
              추천 문서는 추후 연동됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
