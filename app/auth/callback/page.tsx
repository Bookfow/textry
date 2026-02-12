'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase가 URL의 토큰을 자동으로 처리
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error

        if (session?.user) {
          // 프로필이 이미 있는지 확인
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single()

          // 프로필이 없으면 생성
          if (!existingProfile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email!,
                username: session.user.user_metadata?.username || null,
                role: 'author',
              })

            if (profileError && profileError.code !== '23505') {
              console.error('Profile creation error:', profileError)
            }
          }

          setStatus('success')
          setMessage('이메일 인증이 완료되었습니다!')

          // 2초 후 홈으로 이동
          setTimeout(() => {
            router.push('/home')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('인증에 실패했습니다. 다시 시도해주세요.')
        }
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setStatus('error')
        setMessage(err.message || '오류가 발생했습니다.')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">인증 처리 중...</h2>
              <p className="text-gray-500">잠시만 기다려주세요</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">{message}</h2>
              <p className="text-gray-500">잠시 후 홈으로 이동합니다...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">인증 실패</h2>
              <p className="text-gray-500 mb-4">{message}</p>
              <div className="flex gap-2 justify-center">
                <Link href="/signup">
                  <Button variant="outline">다시 가입하기</Button>
                </Link>
                <Link href="/login">
                  <Button>로그인</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
