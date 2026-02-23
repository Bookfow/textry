'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Users, TrendingUp, Zap, DollarSign,
  ArrowRight, Play, ChevronRight, Eye, Clock,
  Sparkles, Shield, BarChart3, Globe, Star,
} from 'lucide-react'

// ━━━ 스크롤 애니메이션 Hook ━━━
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el) } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, isVisible }
}

// ━━━ 카운트업 애니메이션 ━━━
function CountUp({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.unobserve(el) } },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const steps = 60
    const increment = target / steps
    let current = 0
    const interval = setInterval(() => {
      current += increment
      if (current >= target) { setCount(target); clearInterval(interval) }
      else setCount(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(interval)
  }, [started, target, duration])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  

  useEffect(() => {
    if (!loading && user) router.replace('/home')
  }, [user, loading, router])

  

  const hero = useInView(0.1)
  const concept = useInView()
  const features = useInView()
  const monetize = useInView()
  const cta = useInView()

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0806]">
        <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0806] text-white overflow-hidden" style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}>

      {/* ━━━ 글로벌 스타일 ━━━ */}
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');

        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(201,169,110,0.3); } 50% { box-shadow: 0 0 40px rgba(201,169,110,0.6); } }
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          30% { transform: translate(3%, -15%); }
          50% { transform: translate(12%, 9%); }
          70% { transform: translate(9%, 4%); }
          90% { transform: translate(-1%, 7%); }
        }

        .animate-fadeInUp { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; opacity: 0; }
        .animate-fadeInLeft { animation: fadeInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; opacity: 0; }
        .animate-fadeInRight { animation: fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; opacity: 0; }
        .animate-scaleIn { animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; opacity: 0; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; }

        .shimmer-text {
          background: linear-gradient(90deg, #c9a96e 0%, #f0d58c 25%, #c9a96e 50%, #f0d58c 75%, #c9a96e 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }

        .grain-overlay::after {
          content: '';
          position: absolute;
          inset: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          animation: grain 8s steps(10) infinite;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>

      {/* ━━━ 네비게이션 ━━━ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        'bg-[#0A0806] border-b border-white/8'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold shimmer-text" style={{ letterSpacing: '2px' }}>Textry</h1>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/home" className="text-sm font-medium text-white/70 hover:text-white transition-colors">둘러보기</Link>
            <a href="#concept" className="text-sm font-medium text-white/70 hover:text-white transition-colors">큐레이터란?</a>
            <a href="#monetize" className="text-sm font-medium text-white/70 hover:text-white transition-colors">수익화</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors px-4 py-2">
              로그인
            </Link>
            <Link href="/signup"
              className="text-sm font-semibold px-5 py-2.5 rounded-full bg-gradient-to-r from-[#a67c52] to-[#c9a96e] hover:from-[#b8893f] hover:to-[#d4b570] text-[#0A0806] transition-all hover:shadow-lg hover:shadow-[#c9a96e]/25 hover:scale-105 active:scale-95">
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* ━━━ 히어로 ━━━ */}
      <section ref={hero.ref} className="relative flex items-center justify-center px-0 pt-24 pb-16 md:min-h-screen md:pt-0 md:pb-0">
        {/* 배경 글로우 */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-[#a67c52]/20 rounded-full blur-[120px]"
             />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#c9a96e]/15 rounded-full blur-[100px]"
             />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-[#8B7049]/12 rounded-full blur-[160px]" />
        </div>

        {/* 그리드 패턴 */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <>
              {/* 뱃지 */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-5 md:mb-8 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium text-white/70">지식 공유의 새로운 방식</span>
              </div>

              {/* 메인 카피 */}
              <h2 className="text-[2.5rem] sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] mb-5 md:mb-8 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                <span className="block text-white">쓰고,</span>
                <span className="block text-white">나누고,</span>
                <span className="block shimmer-text">함께 성장하다.</span>
              </h2>

              {/* 서브 카피 */}
              <p className="text-lg md:text-xl font-medium text-white/50 max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
                나의 글과 지식을 세상에 공유하고, 누구나 자유롭게 읽을 수 있습니다.
                <br className="hidden md:block" />
                당신의 콘텐츠가 수익이 되는 플랫폼, Textry.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fadeInUp" style={{ animationDelay: '0.7s' }}>
                <Link href="/signup"
                  className="group flex items-center gap-3 px-6 py-3.5 md:px-8 md:py-4 rounded-full bg-gradient-to-r from-[#a67c52] to-[#c9a96e] text-[#0A0806] font-bold text-base md:text-lg hover:shadow-2xl hover:shadow-[#c9a96e]/30 transition-all hover:scale-105 active:scale-95">
                  무료로 시작하기
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/home"
                  className="flex items-center gap-2 px-6 py-3.5 md:px-8 md:py-4 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all text-base md:text-lg">
                  <Play className="w-5 h-5" />
                  콘텐츠 둘러보기
                </Link>
              </div>

              {/* 소셜 프루프 */}
              <div className="mt-8 md:mt-16 flex items-center justify-center gap-6 md:gap-8 text-white/30 animate-fadeInUp" style={{ animationDelay: '0.9s' }}>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white/60"><CountUp target={50} suffix="+" /></p>
                  <p className="text-xs font-medium mt-1">등록된 콘텐츠</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-white/60"><CountUp target={100} suffix="+" /></p>
                  <p className="text-xs mt-1">큐레이터</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-white/60"><CountUp target={12} suffix="+" /></p>
                  <p className="text-xs mt-1">카테고리</p>
                </div>
              </div>
</>
        </div>

        {/* 스크롤 인디케이터 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 animate-bounce hidden md:flex">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-white/40" />
          </div>
        </div>
      </section>

      {/* ━━━ 큐레이터/저자 개념 ━━━ */}
      <section id="concept" ref={concept.ref} className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0806] via-[#12100C] to-[#0A0806]" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <>
              <div className="text-center mb-20">
                <p className="text-sm tracking-[0.3em] text-[#c9a96e] font-semibold uppercase mb-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                  New Concept
                </p>
                <h3 className="text-4xl md:text-5xl font-black text-white mb-6 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                  저자와 큐레이터,<br />두 개의 역할
                </h3>
                <p className="text-lg font-medium text-white/45 max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                  Textry에서는 콘텐츠를 쓴 사람과 공유하는 사람을 구분합니다.
                  <br />누구나 큐레이터가 될 수 있고, 본인의 작품을 올리면 저자이자 큐레이터가 됩니다.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* 저자 카드 */}
                <div className="animate-fadeInLeft delay-400" style={{  }}>
                  <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] hover:border-[#c9a96e]/30 transition-all duration-500 hover:-translate-y-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C4A38]/10 rounded-full blur-[60px] group-hover:bg-[#5C4A38]/20 transition-colors" />
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5C4A38] to-[#8B7049] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold text-white mb-3">저자</h4>
                      <p className="font-medium text-white/45 leading-relaxed mb-6">
                        콘텐츠를 직접 창작한 원작자입니다. 시, 소설, 논문, 에세이 등 자신의 작품이 Textry에서 독자를 만납니다.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[#c9a96e]/80">
                        <Star className="w-4 h-4" />
                        <span>윤동주, 현진건, 그리고 당신</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 큐레이터 카드 */}
                <div className="animate-fadeInRight delay-400" style={{  }}>
                  <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] hover:border-[#c9a96e]/30 transition-all duration-500 hover:-translate-y-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9a96e]/8 rounded-full blur-[60px] group-hover:bg-[#c9a96e]/15 transition-colors" />
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a67c52] to-[#c9a96e] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Sparkles className="w-8 h-8 text-[#0A0806]" />
                      </div>
                      <h4 className="text-2xl font-bold text-white mb-3">큐레이터</h4>
                      <p className="font-medium text-white/45 leading-relaxed mb-6">
                        자신의 창작물이나 공개된 지식을 정리하여 독자에게 전합니다. 콘텐츠를 체계적으로 공유하는 것 자체가 가치이며, 수익이 됩니다.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[#c9a96e]/80">
                        <Zap className="w-4 h-4" />
                        <span>정리 · 공유 · 수익화</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 교차점 */}
              <div className="mt-12 text-center animate-fadeInUp delay-600" style={{  }}>
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#5C4A38] to-[#c9a96e] flex items-center justify-center text-white text-xs font-bold">+</div>
                  <span className="text-white/50">직접 쓴 콘텐츠를 올리면?</span>
                  <span className="text-[#c9a96e] font-semibold">저자 · 큐레이터</span>
                </div>
              </div>
</>
        </div>
      </section>

      {/* ━━━ 기능 하이라이트 ━━━ */}
      <section ref={features.ref} className="relative py-32">
        <div className="absolute inset-0 bg-[#0A0806]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/20 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <>
              <div className="text-center mb-20">
                <p className="text-sm tracking-[0.3em] text-[#c9a96e] font-semibold uppercase mb-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                  Features
                </p>
                <h3 className="text-4xl md:text-5xl font-black text-white animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                  읽기의 모든 순간을 디자인하다
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {[
                  { icon: Eye, title: '스트리밍 뷰어', desc: 'PDF, EPUB를 브라우저에서 바로. 다운로드 없이 몰입하는 읽기 경험.', gradient: 'from-blue-500/20 to-cyan-500/20', iconBg: 'from-blue-500 to-cyan-500' },
                  { icon: Users, title: '구독 시스템', desc: '좋아하는 큐레이터를 구독하고, 새 콘텐츠를 놓치지 마세요.', gradient: 'from-purple-500/20 to-pink-500/20', iconBg: 'from-purple-500 to-pink-500' },
                  { icon: BarChart3, title: '실시간 분석', desc: '조회수, 읽기 시간, 완독률. 데이터로 콘텐츠를 개선하세요.', gradient: 'from-emerald-500/20 to-teal-500/20', iconBg: 'from-emerald-500 to-teal-500' },
                  { icon: BookOpen, title: '이어 읽기', desc: '어디서 멈췄든 자동 저장. 다음에 이어서 읽을 수 있습니다.', gradient: 'from-amber-500/20 to-orange-500/20', iconBg: 'from-amber-500 to-orange-500' },
                  { icon: Globe, title: '오픈 라이브러리', desc: '공개된 지식은 모두의 것. 누구나 자유롭게 읽고 배웁니다.', gradient: 'from-rose-500/20 to-red-500/20', iconBg: 'from-rose-500 to-red-500' },
                  { icon: Shield, title: '시리즈 관리', desc: '콘텐츠를 시리즈로 묶어 체계적으로 구성하세요.', gradient: 'from-indigo-500/20 to-violet-500/20', iconBg: 'from-indigo-500 to-violet-500' },
                ].map((f, i) => (
                  <div key={i} className="animate-fadeInUp" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                    <div className="group relative p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 h-full">
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      <div className="relative">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${f.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                          <f.icon className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="text-sm md:text-lg font-bold text-white mb-1 md:mb-2">{f.title}</h4>
                        <p className="text-sm font-medium text-white/40 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
</>
        </div>
      </section>

      {/* ━━━ 수익화 시스템 ━━━ */}
      <section id="monetize" ref={monetize.ref} className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0806] via-[#0F0D0A] to-[#0A0806]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/20 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <>
              <div className="text-center mb-20">
                <p className="text-sm tracking-[0.3em] text-[#c9a96e] font-semibold uppercase mb-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                  Monetization
                </p>
                <h3 className="text-4xl md:text-5xl font-black text-white mb-6 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                  큐레이션이 곧 수익입니다
                </h3>
                <p className="text-lg font-medium text-white/45 max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                  콘텐츠를 정리하고 공유하는 것만으로도 수익이 발생합니다.
                  <br />광고 수익과 프리미엄 구독 수익을 큐레이터에게 배분합니다.
                </p>
              </div>

              {/* 티어 시스템 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto mb-16">
                {[
                  { tier: 'Tier 0', label: '시작', desc: '가입 후 콘텐츠 업로드', share: '누구나 시작', condition: '가입 즉시', color: 'from-white/5 to-white/[0.02]', borderColor: 'border-white/[0.06]', textColor: 'text-white/30' },
                  { tier: 'Tier 1', label: '파트너', desc: '수익화 시작', share: '70%', condition: '100시간 + 30일', color: 'from-blue-500/10 to-blue-600/5', borderColor: 'border-blue-500/20', textColor: 'text-blue-400' },
                  { tier: 'Tier 2', label: '프로', desc: '최고 수익 배분', share: '80%', condition: '1,000시간', color: 'from-[#c9a96e]/15 to-[#a67c52]/8', borderColor: 'border-[#c9a96e]/30', textColor: 'text-[#c9a96e]' },
                ].map((t, i) => (
                  <div key={i} className="animate-fadeInUp" style={{ animationDelay: `${0.3 + i * 0.15}s` }}>
                    <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${t.color} border ${t.borderColor} transition-all hover:-translate-y-1 duration-300 h-full`}>
                      {i === 2 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-[#a67c52] to-[#c9a96e] rounded-full text-[10px] font-bold text-[#0A0806]">
                          BEST
                        </div>
                      )}
                      <p className={`text-xs font-bold ${t.textColor} mb-1`}>{t.tier}</p>
                      <h4 className="text-xl font-bold text-white mb-1">{t.label}</h4>
                      <p className="text-sm font-medium text-white/35 mb-4">{t.desc}</p>
                      <div className="border-t border-white/[0.06] pt-4">
                        <p className="text-3xl font-black text-white mb-1">
                          {t.share}
                        </p>
                        <p className="text-xs text-white/30">{t.share === '누구나 시작' ? '' : '수익 배분'}</p>
                        <p className="text-xs text-white/20 mt-2">{t.condition}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 수익 흐름 */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 animate-fadeInUp delay-600" style={{  }}>
                {[
                  { icon: Eye, text: '독자가 읽기' },
                  { icon: TrendingUp, text: '광고 노출' },
                  { icon: DollarSign, text: '수익 발생' },
                  { icon: Zap, text: '큐레이터 정산' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i > 0 && <ChevronRight className="w-4 h-4 text-white/15 hidden sm:block" />}
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <step.icon className="w-4 h-4 text-[#c9a96e]" />
                      <span className="text-sm text-white/50">{step.text}</span>
                    </div>
                  </div>
                ))}
              </div>
</>
        </div>
      </section>

      {/* ━━━ 최종 CTA ━━━ */}
      <section ref={cta.ref} className="relative py-32">
        <div className="absolute inset-0 bg-[#0A0806]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/20 to-transparent" />

        {/* 글로우 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#c9a96e]/8 rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <>
              <h3 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                지금, 당신만의
                <br />
                <span className="shimmer-text">큐레이션</span>을 시작하세요
              </h3>
              <p className="text-lg font-medium text-white/45 mb-12 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                가입은 무료, 업로드도 무료.
                <br />나의 지식을 세상과 나누는 것만으로 가치가 생깁니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
                <Link href="/signup"
                  className="group inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-[#a67c52] to-[#c9a96e] text-[#0A0806] font-bold text-lg transition-all hover:shadow-2xl hover:shadow-[#c9a96e]/30 hover:scale-105 active:scale-95"
                  style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>
                  무료로 시작하기
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
</>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer className="relative border-t border-white/[0.04] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold shimmer-text" style={{ letterSpacing: '2px' }}>Textry</h2>
              <span className="text-xs text-white/20">콘텐츠 큐레이션 플랫폼</span>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium text-white/40">
              <Link href="/home" className="hover:text-white/60 transition-colors">둘러보기</Link>
              <Link href="/policies/about" className="hover:text-white/60 transition-colors">소개</Link>
              <Link href="/policies/terms" className="hover:text-white/60 transition-colors">이용약관</Link>
              <Link href="/policies/privacy" className="hover:text-white/60 transition-colors">개인정보</Link>
              <Link href="/help" className="hover:text-white/60 transition-colors">고객센터</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
            <p className="text-xs text-white/15">© 2026 Textry. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
