'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, WebtoonImage } from '@/lib/supabase'
import { ChevronUp } from 'lucide-react'
import { AdBanner } from '@/components/ad-banner'

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
  const [images, setImages] = useState<WebtoonImage[]>([])
  const [loading, setLoading] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 이미지 로드
  useEffect(() => {
    const loadImages = async () => {
      const { data, error } = await supabase
        .from('webtoon_images')
        .select('*')
        .eq('document_id', documentId)
        .order('image_order', { ascending: true })
      if (!error && data) setImages(data)
      setLoading(false)
    }
    loadImages()
  }, [documentId])

  // 스크롤 추적
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    setShowScrollTop(scrollTop > 500)

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

  // 광고 삽입 위치 계산
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
        {images.map((img, index) => (
          <div key={img.id}>
            {/* 이미지 */}
            <img
              src={img.image_url}
              alt={`${index + 1}장`}
              loading={index < 3 ? 'eager' : 'lazy'}
              className="w-full block"
              style={{ minHeight: '100px' }}
            />

            {/* 광고 삽입 */}
            {adPositions.has(index + 1) && (
              <div className="py-2 px-4 bg-[#111]">
                <div className="max-w-[728px] mx-auto h-[90px] overflow-hidden rounded">
                  <AdBanner position="bottom" documentId={documentId} authorId={authorId} />
                </div>
              </div>
            )}
          </div>
        ))}
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
