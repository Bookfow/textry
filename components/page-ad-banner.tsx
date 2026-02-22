'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface PageAdBannerProps {
  position: 'home_feed' | 'detail_page' | 'browse_page' | 'browse_inline'
  variant?: 'horizontal' | 'card'  // horizontal=가로배너, card=피드 카드형
  className?: string
  documentId?: string
  authorId?: string
}

export function PageAdBanner({ position, variant = 'horizontal', className = '', documentId, authorId }: PageAdBannerProps) {
  const { user, profile } = useAuth()
  const loggedRef = useRef(false)

  // 프리미엄 유저는 광고 비표시
  const isPremium = profile?.is_premium && profile?.premium_expires_at
    ? new Date(profile.premium_expires_at) > new Date()
    : false

  useEffect(() => {
    if (!loggedRef.current && !isPremium) {
      loggedRef.current = true
      logImpression()
    }
  }, [])

  const logImpression = async () => {
    try {
      await supabase.from('ad_impressions').insert({
        document_id: documentId || null,
        author_id: authorId || null,
        viewer_id: user?.id || null,
        ad_type: 'banner',
        ad_position: position,
      })
    } catch {}
  }

  if (isPremium) return null

  // ━━━ 카드형 (홈 피드 네이티브) ━━━
  if (variant === 'card') {
    return (
      <div className={`flex-shrink-0 w-[155px] sm:w-[170px] md:w-[200px] lg:w-[210px] xl:w-[220px] ${className}`}>
        <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-[#EEE4E1] to-[#E7D8C9] dark:from-[#2E2620] dark:to-[#241E18] border border-[#E7D8C9] dark:border-[#3A302A] flex flex-col items-center justify-center p-3 relative overflow-hidden">
          <span className="absolute top-2 right-2 text-[9px] text-[#9C8B7A] bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded">AD</span>
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            {/* TODO: 실제 AdSense 코드로 교체 */}
            <div className="w-full h-full min-h-[120px] bg-white/40 dark:bg-black/20 rounded-lg border border-dashed border-[#B2967D]/30 flex flex-col items-center justify-center">
              <p className="text-[11px] text-[#9C8B7A]">스폰서 콘텐츠</p>
              <p className="text-[9px] text-[#B2967D]/50 mt-1">Google AdSense</p>
            </div>
          </div>
          <p className="text-[9px] text-[#9C8B7A]/60 mt-2">광고</p>
        </div>
      </div>
    )
  }

  // ━━━ 가로 배너형 (상세/browse 페이지) ━━━
  return (
    <div className={`w-full ${className}`}>
      <div className="bg-gradient-to-r from-[#EEE4E1] to-[#E7D8C9] dark:from-[#241E18] dark:to-[#2E2620] border border-[#E7D8C9] dark:border-[#3A302A] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1 bg-white/30 dark:bg-black/20">
          <span className="text-[10px] text-[#9C8B7A]">광고</span>
          <span className="text-[9px] text-[#9C8B7A]/60 px-1.5 py-0.5 bg-white/50 dark:bg-black/30 rounded">AD</span>
        </div>
        <div className="px-4 py-6 flex items-center justify-center min-h-[90px]">
          {/* TODO: 실제 AdSense 코드로 교체 */}
          <div className="w-full max-w-[728px] h-[90px] bg-white/30 dark:bg-black/15 rounded-lg border border-dashed border-[#B2967D]/20 flex flex-col items-center justify-center">
            <p className="text-xs text-[#9C8B7A]">배너 광고 영역</p>
            <p className="text-[10px] text-[#B2967D]/40 mt-1">728 × 90 Leaderboard</p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-white/20 dark:bg-black/10 text-center">
          <p className="text-[10px] text-[#9C8B7A]/60">광고 수익은 작가님에게 돌아갑니다</p>
        </div>
      </div>
    </div>
  )
}
