'use client'

import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface AdBannerProps {
  position?: 'top' | 'bottom' | 'sidebar'
  documentId?: string
  authorId?: string
}

export function AdBanner({ position = 'bottom', documentId, authorId }: AdBannerProps) {
  const { user } = useAuth()
  const loggedRef = useRef(false)

  useEffect(() => {
    // 한 번만 로그 기록
    if (documentId && authorId && !loggedRef.current) {
      loggedRef.current = true
      logBannerImpression()
    }
  }, [documentId, authorId])

  const logBannerImpression = async () => {
    try {
      await supabase.from('ad_impressions').insert({
        document_id: documentId,
        author_id: authorId,
        viewer_id: user?.id || null,
        ad_type: 'banner',
        ad_position: position === 'sidebar' ? 'side_panel' : 'control_bar',
      })
    } catch (err) {
      // 배너 로그 실패는 무시 (UX 영향 없음)
      console.error('Banner impression log error:', err)
    }
  }

  return (
    <Card className="bg-gray-100 p-4 text-center border-2 border-dashed">
      <p className="text-xs text-gray-400 mb-2">광고</p>
      <div className="bg-white p-8 rounded">
        <p className="text-gray-600">
          {position === 'sidebar' ? '사이드바 광고 영역' : '배너 광고 영역'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Google AdSense 또는 직접 광고
        </p>
      </div>
      {authorId && (
        <p className="text-xs text-gray-400 mt-2">
          광고는 큐레이터님의 수익이 됩니다
        </p>
      )}
    </Card>
  )
}
