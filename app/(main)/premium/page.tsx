'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Crown, Check, X, Zap, BookOpen, Eye, Shield,
  CreditCard, ArrowRight, Sparkles,
} from 'lucide-react'

export default function PremiumPage() {
  const { user, profile } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [processing, setProcessing] = useState(false)

  const isPremium = profile?.is_premium && profile?.premium_expires_at
    ? new Date(profile.premium_expires_at) > new Date()
    : false

  const handleSubscribe = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setProcessing(true)
    try {
      const price = selectedPlan === 'monthly' ? 3.99 : 35.88
      const expiresAt = new Date()
      if (selectedPlan === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      }

      // 구독 레코드 생성
      const { error: subError } = await supabase
        .from('premium_subscriptions')
        .insert({
          user_id: user.id,
          plan: selectedPlan,
          status: 'active',
          price_usd: price,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_provider: 'manual', // 추후 Stripe 연동
        })

      if (subError) throw subError

      // 프로필 업데이트
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_expires_at: expiresAt.toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      alert('프리미엄 구독이 시작되었습니다! 🎉')
      window.location.reload()
    } catch (err) {
      console.error('Subscription error:', err)
      alert('구독 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('프리미엄 구독을 해지하시겠습니까?\n현재 결제 기간이 끝날 때까지는 프리미엄 혜택을 이용하실 수 있습니다.')) return

    setProcessing(true)
    try {
      const { error: subError } = await supabase
        .from('premium_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', user!.id)
        .eq('status', 'active')

      if (subError) throw subError

      alert('구독이 해지되었습니다. 현재 기간 종료 후 일반 계정으로 전환됩니다.')
      window.location.reload()
    } catch (err) {
      console.error('Cancel error:', err)
      alert('해지 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const features = [
    { icon: X, label: '모든 광고 완전 제거', free: false, premium: true },
    { icon: Eye, label: '전면 광고 (시작/중간/끝) 없음', free: false, premium: true },
    { icon: BookOpen, label: '깨끗한 읽기 환경', free: false, premium: true },
    { icon: Zap, label: '배너 광고 없음', free: false, premium: true },
    { icon: Shield, label: '작가 수익 기여 (읽기 시간 비례)', free: false, premium: true },
    { icon: Sparkles, label: '문서 업로드 및 열람', free: true, premium: true },
    { icon: BookOpen, label: '댓글 및 좋아요', free: true, premium: true },
    { icon: Crown, label: '구독 및 읽기 목록', free: true, premium: true },
  ]

  // 이미 프리미엄인 경우
  if (isPremium) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Textry Premium 활성</h2>
              <p className="text-gray-600 mb-6">광고 없는 깨끗한 읽기 환경을 즐기고 계십니다</p>

              <div className="bg-white rounded-xl p-6 mb-6 text-left">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">구독 상태</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">활성</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">만료일</span>
                    <span className="text-sm font-medium text-gray-900">
                      {profile?.premium_expires_at
                        ? new Date(profile.premium_expires_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '-'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <Button variant="outline" onClick={handleCancel} disabled={processing} className="text-red-600 border-red-200 hover:bg-red-50">
                {processing ? '처리 중...' : '구독 해지'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">

          {/* 헤더 */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Textry Premium</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              광고 없이 몰입하여 읽으세요. 당신의 읽기 시간이 작가의 수익이 됩니다.
            </p>
          </div>

          {/* 요금제 선택 */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-200 rounded-full p-1 flex">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedPlan === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                월간
              </button>
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedPlan === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                연간 <span className="text-green-600 font-bold">25% 할인</span>
              </button>
            </div>
          </div>

          {/* 가격 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* 무료 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Free</h3>
              <p className="text-sm text-gray-500 mb-4">기본 이용</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/월</span>
              </div>
              <div className="space-y-3 mb-6">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {f.free ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={f.free ? 'text-gray-700' : 'text-gray-400'}>{f.label}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" disabled>현재 플랜</Button>
            </div>

            {/* 프리미엄 */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
                RECOMMENDED
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" /> Premium
              </h3>
              <p className="text-sm text-gray-500 mb-4">광고 없는 읽기</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  ${selectedPlan === 'monthly' ? '3.99' : '2.99'}
                </span>
                <span className="text-gray-500">/월</span>
                {selectedPlan === 'yearly' && (
                  <div className="mt-1">
                    <span className="text-sm text-gray-500 line-through mr-2">$47.88/년</span>
                    <span className="text-sm font-bold text-green-600">$35.88/년</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 mb-6">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{f.label}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleSubscribe}
                disabled={processing || !user}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                {processing ? '처리 중...' : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {user ? 'Premium 시작하기' : '로그인 후 구독'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              {!user && (
                <p className="text-xs text-center text-gray-400 mt-2">구독하려면 먼저 로그인해주세요</p>
              )}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-6">자주 묻는 질문</h3>
            <div className="space-y-4">
              {[
                { q: '프리미엄을 구독하면 어떤 혜택이 있나요?', a: '모든 광고(전면 광고, 배너, 사이드바)가 완전히 제거되어 깨끗한 환경에서 문서를 읽을 수 있습니다.' },
                { q: '작가에게는 어떻게 수익이 돌아가나요?', a: '프리미엄 구독료의 70%가 작가에게 배분됩니다. 배분은 회원님이 각 작가의 문서를 읽은 시간에 비례합니다.' },
                { q: '언제든 해지할 수 있나요?', a: '네, 언제든 해지 가능합니다. 해지 후에도 현재 결제 기간이 끝날 때까지는 프리미엄 혜택을 이용하실 수 있습니다.' },
                { q: '결제 수단은 무엇인가요?', a: '현재는 수동 결제로 운영되며, 곧 신용카드 및 PayPal 결제가 지원될 예정입니다.' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-medium text-gray-900 mb-2">{item.q}</h4>
                  <p className="text-sm text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
