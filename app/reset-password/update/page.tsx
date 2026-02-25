'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const hasLength = password.length >= 8
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  const passwordValid = hasLength && hasNumber && hasSpecial
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordValid) { setError('비밀번호 조건을 확인해주세요.'); return }
    if (!passwordsMatch) { setError('비밀번호가 일치하지 않습니다.'); return }
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410] p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">비밀번호가 변경되었습니다</h2>
          <p className="text-sm text-[#9C8B7A] mb-6">새 비밀번호로 로그인할 수 있습니다.</p>
          <Link href="/login">
            <button className="w-full h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors">
              로그인하기
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">새 비밀번호 설정</h1>
          <p className="text-sm text-[#9C8B7A] mt-1">새로운 비밀번호를 입력해주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">새 비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-xl bg-[#EEE4E1]/50 dark:bg-[#2E2620] border-[#E7D8C9] dark:border-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] placeholder:text-[#9C8B7A] focus:border-[#B2967D] focus:ring-[#B2967D]"
            />
            {password && (
              <div className="space-y-1 mt-2">
                <p className={`text-xs ${hasLength ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasLength ? '✓' : '○'} 8자 이상</p>
                <p className={`text-xs ${hasNumber ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasNumber ? '✓' : '○'} 숫자 포함</p>
                <p className={`text-xs ${hasSpecial ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasSpecial ? '✓' : '○'} 특수문자 포함</p>
              </div>
            )}
            {!password && <p className="text-xs text-[#9C8B7A] mt-1">8자 이상, 숫자·특수문자 포함</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-[#2D2016] dark:text-[#EEE4E1] text-sm">새 비밀번호 확인</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="rounded-xl bg-[#EEE4E1]/50 dark:bg-[#2E2620] border-[#E7D8C9] dark:border-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] placeholder:text-[#9C8B7A] focus:border-[#B2967D] focus:ring-[#B2967D]"
            />
            {confirmPassword && (
              <p className={`text-xs ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
                {passwordsMatch ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !passwordValid || !passwordsMatch}
            className="w-full h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  )
}
