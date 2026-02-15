'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileText, Zap, Users, TrendingUp, BookOpen, MessageCircle, Heart, Bookmark, ThumbsUp, Eye, ChevronLeft, ChevronRight, Play } from 'lucide-react'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

useEffect(() => {
  if (!loading && user) {
    router.replace('/home')
  }
}, [user, loading, router])

if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white dark:from-[#0b1a13] dark:to-[#0f2419]">
      <header className="bg-white/80 dark:bg-[#0f2419]/80 backdrop-blur-sm border-b border-gray-200 dark:border-[#1a3527] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#a67c52] via-[#f0d58c] to-[#a67c52] bg-clip-text text-transparent" style={{WebkitTextStroke: '0.3px #daa520', paintOrder: 'stroke fill', letterSpacing: '1px'}}>
              Textry
            </h1>
            <div className="flex gap-4">
              <Link href="/browse">
                <Button variant="ghost" className="text-gray-900 dark:text-gray-200 hover:text-black dark:hover:text-white font-medium">둘러보기</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="text-gray-900 dark:text-gray-200 hover:text-black dark:hover:text-white font-medium">로그인</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-[#a67c52] to-[#c9a96e] hover:from-[#8a6842] hover:to-[#b89860] text-white">
                  시작하기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#7a5a30] via-[#c9a96e] to-[#7a5a30] dark:from-[#c9a96e] dark:via-[#f0d58c] dark:to-[#c9a96e] bg-clip-text text-transparent">
            지식을 스트리밍하다
          </h2>
          <p className="text-xl md:text-2xl text-gray-900 dark:text-gray-200 mb-8">
            유튜브처럼 자유롭게 문서를 읽고, 공유하고, 소통하세요
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-[#a67c52] to-[#c9a96e] hover:from-[#8a6842] hover:to-[#b89860] text-white text-lg px-8">
                무료로 시작하기
              </Button>
            </Link>
            <Link href="/browse">
              <Button size="lg" variant="outline" className="text-lg px-8 text-gray-900 dark:text-gray-200 border-gray-300 dark:border-[#1a3527] hover:bg-gray-100 dark:hover:bg-[#153024]">
                문서 둘러보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">왜 Textry인가요?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-[#153024] p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-amber-700 dark:text-amber-400" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">무료 문서 공유</h4>
            <p className="text-gray-600 dark:text-[#8fbba5]">PDF를 업로드하고 전 세계 사람들과 공유하세요</p>
          </div>
          <div className="bg-white dark:bg-[#153024] p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-amber-700 dark:text-amber-400" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">구독 시스템</h4>
            <p className="text-gray-600 dark:text-[#8fbba5]">좋아하는 작가를 구독하고 새 문서를 놓치지 마세요</p>
          </div>
          <div className="bg-white dark:bg-[#153024] p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-amber-700 dark:text-amber-400" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">댓글 & 토론</h4>
            <p className="text-gray-600 dark:text-[#8fbba5]">문서에 댓글을 달고 다른 독자들과 의견을 나누세요</p>
          </div>
          <div className="bg-white dark:bg-[#153024] p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-amber-700 dark:text-amber-400" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">개인 맞춤 추천</h4>
            <p className="text-gray-600 dark:text-[#8fbba5]">읽기 기록을 기반으로 맞춤 문서를 추천받으세요</p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#0b1a13] py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">유튜브처럼 쉬운 문서 스트리밍 플랫폼</h3>
              <p className="text-gray-600 dark:text-[#8fbba5] mb-6">좋아요, 구독, 댓글, 읽기 목록... 익숙한 기능으로 문서를 더 재미있게!</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-[#a67c52] dark:text-[#f0d58c]" />
                  <span className="text-gray-700 dark:text-[#b5d5c5]">좋아요/싫어요로 의견 표현</span>
                </div>
                <div className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5 text-[#a67c52] dark:text-[#f0d58c]" />
                  <span className="text-gray-700 dark:text-[#b5d5c5]">읽기 목록에 저장</span>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-[#a67c52] dark:text-[#f0d58c]" />
                  <span className="text-gray-700 dark:text-[#b5d5c5]">이어 읽기 자동 저장</span>
                </div>
              </div>
            </div>

            {/* ━━━ PDF 리더 목업 ━━━ */}
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-[#153024] dark:to-[#1c3d2e] rounded-2xl p-4 shadow-xl overflow-hidden">
              <div className="bg-gray-900 dark:bg-[#0b1a13] rounded-xl overflow-hidden shadow-2xl">
                {/* 상단 컨트롤바 */}
                <div className="bg-gray-800 dark:bg-[#0f2419] px-3 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] text-gray-400 font-mono">12 / 48</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">100%</div>
                </div>
                {/* 프로그레스바 */}
                <div className="h-0.5 bg-gray-800 dark:bg-[#153024]">
                  <div className="h-full w-1/4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-r" />
                </div>
                {/* 페이지 본문 목업 */}
                <div className="p-5 space-y-2.5 min-h-[180px]">
                  <div className="h-3.5 bg-gray-700/40 dark:bg-[#1c3d2e]/60 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-700/25 dark:bg-[#1c3d2e]/40 rounded w-full" />
                  <div className="h-2.5 bg-gray-700/25 dark:bg-[#1c3d2e]/40 rounded w-full" />
                  <div className="h-2.5 bg-gray-700/25 dark:bg-[#1c3d2e]/40 rounded w-5/6" />
                  <div className="h-2.5 bg-gray-700/25 dark:bg-[#1c3d2e]/40 rounded w-full" />
                  <div className="h-2.5 bg-gray-700/25 dark:bg-[#1c3d2e]/40 rounded w-2/3" />
                  <div className="mt-3 h-16 bg-gray-700/15 dark:bg-[#1c3d2e]/30 rounded-lg" />
                </div>
                {/* 하단 인터랙션 바 */}
                <div className="px-4 py-2.5 border-t border-gray-800 dark:border-[#1c3d2e] flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] text-gray-400">234</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] text-gray-400">18</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                    <span className="text-[10px] text-gray-400">김작가</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-blue-600 text-white rounded">구독</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* ━━━ 대시보드 목업 ━━━ */}
            <div className="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-[#153024] dark:to-[#1c3d2e] rounded-2xl p-4 shadow-xl overflow-hidden order-2 md:order-1">
              <div className="bg-white dark:bg-[#0f2419] rounded-xl overflow-hidden shadow-2xl">
                {/* 상단 헤더 */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#1c3d2e]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-gray-800 dark:text-white">작가 대시보드</div>
                      <div className="text-[9px] text-gray-400 dark:text-[#6b9b84]">이번 달 성과</div>
                    </div>
                    <div className="text-[9px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">↑ 24%</div>
                  </div>
                </div>
                {/* 통계 카드 */}
                <div className="p-3 grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 dark:bg-[#153024] rounded-lg p-2.5 text-center">
                    <Eye className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                    <div className="text-sm font-bold text-gray-900 dark:text-white">12.4K</div>
                    <div className="text-[9px] text-gray-500 dark:text-[#6b9b84]">조회수</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#153024] rounded-lg p-2.5 text-center">
                    <Users className="w-3.5 h-3.5 text-purple-500 mx-auto mb-1" />
                    <div className="text-sm font-bold text-gray-900 dark:text-white">847</div>
                    <div className="text-[9px] text-gray-500 dark:text-[#6b9b84]">구독자</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#153024] rounded-lg p-2.5 text-center">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
                    <div className="text-sm font-bold text-gray-900 dark:text-white">₩84K</div>
                    <div className="text-[9px] text-gray-500 dark:text-[#6b9b84]">수익</div>
                  </div>
                </div>
                {/* 미니 차트 */}
                <div className="px-4 pb-3">
                  <div className="flex items-end gap-1 h-12">
                    {[35, 48, 42, 58, 52, 68, 75, 62, 80, 72, 88, 92].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i >= 10 ? 'linear-gradient(to top, #a67c52, #c9a96e)' : i >= 8 ? 'rgba(166,124,82,0.6)' : 'rgba(166,124,82,0.25)' }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[8px] text-gray-400 dark:text-[#6b9b84]">1월</span>
                    <span className="text-[8px] text-gray-400 dark:text-[#6b9b84]">12월</span>
                  </div>
                </div>
                {/* 인기 문서 리스트 */}
                <div className="px-3 pb-3 space-y-1.5">
                  {[
                    { title: 'Next.js 완벽 가이드', views: '3.2K', trend: '+12%' },
                    { title: '디자인 시스템 구축', views: '2.8K', trend: '+8%' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-[#153024] rounded-lg">
                      <div className="w-5 h-7 bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-900/40 dark:to-purple-900/40 rounded flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-gray-800 dark:text-white truncate">{item.title}</div>
                        <div className="text-[9px] text-gray-400 dark:text-[#6b9b84]">{item.views} 조회</div>
                      </div>
                      <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">{item.trend}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">작가와 독자가 함께 성장</h3>
              <p className="text-gray-600 dark:text-[#8fbba5] mb-6">작가는 광고 수익을 얻고, 독자는 무료로 문서를 읽고, 모두가 Win-Win!</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-[#a67c52] dark:text-[#f0d58c]" />
                  <span className="text-gray-700 dark:text-[#b5d5c5]">조회수와 읽기 시간 기반 수익</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#a67c52] dark:text-[#f0d58c]" />
                  <span className="text-gray-700 dark:text-[#b5d5c5]">구독자 관리 대시보드</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[#a67c52] dark:text-[#f0d58c]" />
                  <span className="text-gray-700 dark:text-[#b5d5c5]">실시간 분석 데이터</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-[#a67c52] to-[#c9a96e] rounded-2xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h3>
          <p className="text-xl mb-8 opacity-90">5분이면 첫 문서를 업로드하고 독자들을 만날 수 있습니다</p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8">무료 회원가입</Button>
            </Link>
            <Link href="/browse">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 text-white border-white hover:bg-white/20">문서 둘러보기</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 dark:bg-[#0a1510] text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#c9a96e] via-[#f0d58c] to-[#c9a96e] bg-clip-text text-transparent" style={{WebkitTextStroke: '0.3px #daa520', paintOrder: 'stroke fill', letterSpacing: '1px'}}>
            Textry
          </h2>
          <p className="text-gray-400 mb-6">문서 스트리밍 플랫폼</p>
          <div className="flex gap-6 justify-center text-sm text-gray-400">
            <Link href="/browse" className="hover:text-white">둘러보기</Link>
            <Link href="/signup" className="hover:text-white">회원가입</Link>
            <Link href="/login" className="hover:text-white">로그인</Link>
          </div>
          <p className="text-gray-500 text-sm mt-8">© 2026 Textry. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
