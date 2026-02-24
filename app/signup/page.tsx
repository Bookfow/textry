'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || '소셜 로그인에 실패했습니다.')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreeTerms) { setError('이용약관 및 개인정보처리방침에 동의해주세요.'); return }
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password,
        options: { data: { username: username || null }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) throw authError
      if (authData.user && !authData.session) setEmailSent(true)
      else if (authData.user && authData.session) window.location.href = '/home'
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.')
    } finally { setLoading(false) }
  }

  const inputClass = "rounded-xl bg-[#EEE4E1]/50 dark:bg-[#2E2620] border-[#E7D8C9] dark:border-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] placeholder:text-[#9C8B7A] focus:border-[#B2967D] focus:ring-[#B2967D]"

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410] p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-[#B2967D]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[#B2967D]" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">이메일을 확인해주세요</h2>
          <p className="text-[#9C8B7A] mb-4">
            <span className="font-medium text-[#2D2016] dark:text-[#EEE4E1]">{email}</span>
            <br />으로 확인 링크를 보냈습니다.
          </p>
          <div className="bg-[#EEE4E1]/50 dark:bg-[#2E2620] rounded-xl p-4 mb-6 text-sm text-[#5C4A38] dark:text-[#C4A882] text-left space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>이메일의 확인 링크를 클릭하면 가입이 완료됩니다</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>메일이 안 보이면 스팸함을 확인해주세요</span>
            </div>
          </div>
          <button onClick={() => { setEmailSent(false); setEmail(''); setPassword(''); setUsername(''); setError('') }}
            className="w-full h-11 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-white dark:bg-[#2E2620] text-[#2D2016] dark:text-[#EEE4E1] font-medium text-sm hover:bg-[#EEE4E1] dark:hover:bg-[#3A302A] transition-colors mb-3">
            다른 이메일로 가입
          </button>
          <Link href="/login" className="text-sm text-[#B2967D] hover:text-[#a67c52] hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black bg-gradient-to-r from-[#5C4A38] via-[#8B6749] to-[#5C4A38] bg-clip-text text-transparent" style={{letterSpacing: '2px'}}>TeXTREME</h1>
          <p className="text-sm text-[#9C8B7A] mt-1">지식을 스트리밍하다</p>
        </div>

        <div className="space-y-3 mb-6">
          <button type="button" onClick={() => handleSocialLogin('kakao')}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] font-medium text-sm transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.56-.2.72-.72 2.6-.82 3-.14.52.18.52.4.38.16-.1 2.56-1.74 3.6-2.44.7.1 1.44.16 2.22.16 5.52 0 10-3.48 10-7.66C22 6.48 17.52 3 12 3z"/></svg>
            카카오로 시작하기
          </button>
          <button type="button" onClick={() => handleSocialLogin('google')}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-white dark:bg-[#2E2620] hover:bg-[#EEE4E1] dark:hover:bg-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] font-medium text-sm transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google로 시작하기
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/api/auth/naver'}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-[#03C75A] hover:bg-[#02b351] text-white font-medium text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
            </svg>
            네이버로 시작하기
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E7D8C9] dark:border-[#3A302A]" /></div>
          <div className="relative flex justify-center text-sm"><span className="px-3 bg-white dark:bg-[#241E18] text-[#9C8B7A]">또는 이메일로 가입</span></div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">사용자 이름 (선택)</Label>
            <Input id="username" type="text" placeholder="사용자 이름" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">이메일</Label>
            <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">비밀번호</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} />
            {password && (() => {
              const hasLength = password.length >= 8
              const hasNumber = /[0-9]/.test(password)
              const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
              return (
                <div className="space-y-1 mt-2">
                  <p className={`text-xs ${hasLength ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasLength ? '✓' : '○'} 8자 이상</p>
                  <p className={`text-xs ${hasNumber ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasNumber ? '✓' : '○'} 숫자 포함</p>
                  <p className={`text-xs ${hasSpecial ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasSpecial ? '✓' : '○'} 특수문자 포함</p>
                </div>
              )
            })()}
            {!password && <p className="text-xs text-[#9C8B7A] mt-1">8자 이상, 숫자·특수문자 포함</p>}
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="agree-terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 rounded border-[#E7D8C9] dark:border-[#3A302A] text-[#B2967D] focus:ring-[#B2967D]" />
            <label htmlFor="agree-terms" className="text-sm text-[#5C4A38] dark:text-[#C4A882]">
              <Link href="/policies/terms" className="text-[#B2967D] hover:underline" target="_blank">이용약관</Link>
              {' '}및{' '}
              <Link href="/policies/privacy" className="text-[#B2967D] hover:underline" target="_blank">개인정보처리방침</Link>
              에 동의합니다.
            </label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit"
            disabled={loading || !agreeTerms || !password || password.length < 8 || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)}
            className="w-full h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors disabled:opacity-50">
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[#9C8B7A]">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-[#B2967D] hover:text-[#a67c52] hover:underline font-medium">로그인</Link>
        </div>
      </div>
    </div>
  )
}
