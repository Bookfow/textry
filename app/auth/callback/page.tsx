'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      const next = searchParams.get('next') || '/home'

      // 네이버 로그인: 매직링크 token_hash 검증
      if (tokenHash && type === 'magiclink') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        })
        if (error) {
          console.error('OTP verify error:', error)
          router.push('/login?error=verification_failed')
          return
        }
        router.push(next)
        return
      }

      // 일반 OAuth 콜백 (구글, 카카오)
      const { error } = await supabase.auth.getSession()
      if (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=verification_failed')
      } else {
        router.push(next || '/home')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#9C8B7A]">로그인 처리 중...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#B2967D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#9C8B7A]">로그인 처리 중...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
