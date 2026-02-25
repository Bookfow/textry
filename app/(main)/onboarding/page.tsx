'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'
import { Sparkles } from 'lucide-react'

export default function OnboardingPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 이미 온보딩 완료 or 비로그인이면 홈으로
  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
    if (!authLoading && profile?.onboarding_completed) router.push('/home')
  }, [user, profile, authLoading])

  const filteredCategories = CATEGORIES.filter(
    c => !['webtoon', 'manga', 'illustration'].includes(c.value)
  )

  const toggle = (value: string) => {
    setSelected(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : prev.length < 5 ? [...prev, value] : prev
    )
  }

  const handleComplete = async () => {
    if (!user) return
    setLoading(true)
    try {
      await supabase.from('profiles').update({
        preferred_categories: selected.length > 0 ? selected : null,
        onboarding_completed: true,
      }).eq('id', user.id)
      await refreshProfile()
      router.push('/home')
    } catch { router.push('/home') }
    finally { setLoading(false) }
  }

  const handleSkip = async () => {
    if (!user) { router.push('/home'); return }
    setLoading(true)
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
      await refreshProfile()
    } catch {}
    router.push('/home')
  }

  if (authLoading) return <div className="min-h-screen bg-[#F7F2EF] dark:bg-[#1A1410]" />

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F2EF] dark:bg-[#1A1410] p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#241E18] rounded-2xl border border-[#E7D8C9] dark:border-[#3A302A] shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#B2967D]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-[#B2967D]" />
          </div>
          <h1 className="text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1] mb-1">관심 있는 분야를 알려주세요</h1>
          <p className="text-sm text-[#9C8B7A]">최대 5개까지 선택할 수 있어요. 맞춤 추천에 활용됩니다.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8">
          {filteredCategories.map((cat) => {
            const isSelected = selected.includes(cat.value)
            return (
              <button key={cat.value} type="button" onClick={() => toggle(cat.value)}
                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? 'border-[#B2967D] bg-[#B2967D]/10 text-[#2D2016] dark:text-[#EEE4E1]'
                    : 'border-[#E7D8C9] dark:border-[#3A302A] bg-white dark:bg-[#2E2620] text-[#5C4A38] dark:text-[#C4A882] hover:border-[#B2967D]/50'
                }`}>
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs font-medium">{cat.label}</span>
              </button>
            )
          })}
        </div>

        <p className="text-center text-sm text-[#9C8B7A] mb-4">
          {selected.length > 0 ? `${selected.length}개 선택됨` : '아직 선택하지 않았어요'}
          {selected.length >= 5 && ' (최대)'}
        </p>

        <div className="flex gap-3">
          <button type="button" onClick={handleSkip} disabled={loading}
            className="flex-1 h-11 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-white dark:bg-[#2E2620] text-[#5C4A38] dark:text-[#C4A882] font-medium text-sm hover:bg-[#EEE4E1] dark:hover:bg-[#3A302A] transition-colors disabled:opacity-50">
            건너뛰기
          </button>
          <button type="button" onClick={handleComplete} disabled={loading}
            className="flex-1 h-11 rounded-xl bg-[#B2967D] hover:bg-[#a67c52] text-white font-medium text-sm transition-colors disabled:opacity-50">
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
