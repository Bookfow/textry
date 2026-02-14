'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || '소셜 로그인에 실패했습니다.')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreeTerms) {
      setError('이용약관 및 개인정보처리방침에 동의해주세요.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) throw authError

      if (authData.user && !authData.session) {
        setEmailSent(true)
      } else if (authData.user && authData.session) {
        window.location.href = '/home'
      }
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">이메일을 확인해주세요</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              <span className="font-medium text-gray-900 dark:text-white">{email}</span>
              <br />으로 확인 링크를 보냈습니다.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-sm text-gray-500 dark:text-gray-400 text-left space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>이메일의 확인 링크를 클릭하면 가입이 완료됩니다</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>메일이 안 보이면 스팸함을 확인해주세요</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mb-3"
              onClick={() => { setEmailSent(false); setEmail(''); setPassword(''); setUsername(''); setError('') }}
            >
              다른 이메일로 가입
            </Button>
            <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              로그인으로 돌아가기
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-[#a67c52] via-[#f0d58c] to-[#a67c52] bg-clip-text text-transparent" style={{letterSpacing: '1px'}}>
            Textry
          </CardTitle>
          <CardDescription>지식을 스트리밍하다</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 소셜 로그인 */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium"
              onClick={() => handleSocialLogin('kakao')}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.56-.2.72-.72 2.6-.82 3-.14.52.18.52.4.38.16-.1 2.56-1.74 3.6-2.44.7.1 1.44.16 2.22.16 5.52 0 10-3.48 10-7.66C22 6.48 17.52 3 12 3z"/>
              </svg>
              카카오로 시작하기
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium"
              onClick={() => handleSocialLogin('google')}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 시작하기
            </Button>
          </div>

          {/* 구분선 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-gray-900 text-gray-500">또는 이메일로 가입</span>
            </div>
          </div>

          {/* 이메일 가입 */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="username">사용자 이름 (선택)</Label>
              <Input
                id="username"
                type="text"
                placeholder="사용자 이름"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {password && (() => {
                const hasLength = password.length >= 8
                const hasNumber = /[0-9]/.test(password)
                const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
                return (
                  <div className="space-y-1 mt-2">
                    <p className={`text-xs ${hasLength ? 'text-green-500' : 'text-gray-400'}`}>
                      {hasLength ? '✓' : '○'} 8자 이상
                    </p>
                    <p className={`text-xs ${hasNumber ? 'text-green-500' : 'text-gray-400'}`}>
                      {hasNumber ? '✓' : '○'} 숫자 포함
                    </p>
                    <p className={`text-xs ${hasSpecial ? 'text-green-500' : 'text-gray-400'}`}>
                      {hasSpecial ? '✓' : '○'} 특수문자 포함
                    </p>
                  </div>
                )
              })()}
              {!password && <p className="text-xs text-gray-400 mt-1">8자 이상, 숫자·특수문자 포함</p>}
            </div>

            {/* 약관 동의 */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 rounded border-gray-300"
              />
              <label htmlFor="agree-terms" className="text-sm text-gray-600 dark:text-gray-400">
                <Link href="/policies/terms" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank">이용약관</Link>
                {' '}및{' '}
                <Link href="/policies/privacy" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank">개인정보처리방침</Link>
                에 동의합니다.
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !agreeTerms || !password || password.length < 8 || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)}>
              {loading ? '가입 중...' : '회원가입'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}