'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      router.push('/home')
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || '소셜 로그인에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-lg p-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#a67c52] via-[#f0d58c] to-[#a67c52] bg-clip-text text-transparent" style={{WebkitTextStroke: '0.3px #daa520', paintOrder: 'stroke fill', letterSpacing: '1.5px'}}>
            Textry
          </h1>
          <p className="text-sm text-[#9C8B7A] mt-1">문서를 스트리밍하다</p>
        </div>

        {/* 소셜 로그인 */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => handleSocialLogin('kakao')}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] font-medium text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.56-.2.72-.72 2.6-.82 3-.14.52.18.52.4.38.16-.1 2.56-1.74 3.6-2.44.7.1 1.44.16 2.22.16 5.52 0 10-3.48 10-7.66C22 6.48 17.52 3 12 3z"/>
            </svg>
            카카오로 시작하기
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-white dark:bg-[#2E2620] hover:bg-[#EEE4E1] dark:hover:bg-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] font-medium text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google로 시작하기
          </button>
        </div>

        {/* 구분선 */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E7D8C9] dark:border-[#3A302A]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white dark:bg-[#241E18] text-[#9C8B7A]">또는 이메일로 로그인</span>
          </div>
        </div>

        {/* 이메일 로그인 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl bg-[#EEE4E1]/50 dark:bg-[#2E2620] border-[#E7D8C9] dark:border-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] placeholder:text-[#9C8B7A] focus:border-[#B2967D] focus:ring-[#B2967D]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-xl bg-[#EEE4E1]/50 dark:bg-[#2E2620] border-[#E7D8C9] dark:border-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] placeholder:text-[#9C8B7A] focus:border-[#B2967D] focus:ring-[#B2967D]"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <p className="text-center text-sm text-[#9C8B7A]">
            계정이 없으신가요?{' '}
            <a href="/signup" className="text-[#B2967D] hover:text-[#a67c52] hover:underline font-medium">
              회원가입
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
