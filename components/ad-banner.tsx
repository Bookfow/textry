'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

interface AdBannerProps {
  position?: 'top' | 'bottom' | 'sidebar'
  documentId?: string
}

export function AdBanner({ position = 'bottom', documentId }: AdBannerProps) {
  const [adShown, setAdShown] = useState(false)

  useEffect(() => {
    // 광고 노출 기록 (나중에 수익 계산용)
    if (documentId) {
      setAdShown(true)
      // TODO: 광고 노출 로그 저장
    }
  }, [documentId])

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
      <p className="text-xs text-gray-400 mt-2">
        광고는 작가님의 수익이 됩니다
      </p>
    </Card>
  )
}