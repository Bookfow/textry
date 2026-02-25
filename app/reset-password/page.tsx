'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('이메일을 입력해주세요.'); return }
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/update`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message || '요청에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410] p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-[#B2967D]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[#B2967D]" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">이메일을 확인해주세요</h2>
          <p className="text-sm text-[#9C8B7A] mb-6">
            <span className="font-medium text-[#2D2016] dark:text-[#EEE4E1]">{email}</span>
            <br />으로 비밀번호 재설정 링크를 보냈습니다.
            <br />메일이 안 보이면 스팸함을 확인해주세요.
          </p>
          <button
            onClick={() => { setSent(false); setEmail(''); setError('') }}
            className="w-full h-11 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-white dark:bg-[#2E2620] text-[#2D2016] dark:text-[#EEE4E1] font-medium text-sm hover:bg-[#EEE4E1] dark:hover:bg-[#3A302A] transition-colors mb-3"
          >
            다른 이메일로 시도
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
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-[#9C8B7A] hover:text-[#5C4A38] transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            로그인으로 돌아가기
          </Link>
          <h1 className="text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">비밀번호 재설정</h1>
          <p className="text-sm text-[#9C8B7A] mt-1">가입할 때 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>
        </div>

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
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '전송 중...' : '재설정 링크 보내기'}
          </button>
        </form>
      </div>
    </div>
  )
}
