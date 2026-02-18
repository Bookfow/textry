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
    <div className="min-h-screen bg-gradient-to-b from-[#ECF8F8] to-white dark:from-[#1A1410] dark:to-[#241E18]">
      <header className="bg-white/80 dark:bg-[#241E18]/80 backdrop-blur-sm border-b border-[#E7D8C9] dark:border-[#3A302A] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#a67c52] via-[#f0d58c] to-[#a67c52] bg-clip-text text-transparent" style={{WebkitTextStroke: '0.3px #daa520', paintOrder: 'stroke fill', letterSpacing: '1px'}}>
              Textry
            </h1>
            <div className="flex gap-4">
              <Link href="/browse">
                <Button variant="ghost" className="text-[#2D2016] dark:text-[#EEE4E1] hover:text-black dark:hover:text-white font-medium">둘러보기</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="text-[#2D2016] dark:text-[#EEE4E1] hover:text-black dark:hover:text-white font-medium">로그인</Button>
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

      {/* ━━━ 히어로 ━━━ */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
        <p className="text-sm md:text-base tracking-widest text-[#B2967D] font-medium mb-4 uppercase">누구나 자유롭게 읽고, 나누는</p>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#7a5a30] via-[#c9a96e] to-[#7a5a30] dark:from-[#c9a96e] dark:via-[#f0d58c] dark:to-[#c9a96e] bg-clip-text text-transparent">
          지식은 모두에게 공유되어야 한다
          </h2>
          <p className="text-xl md:text-2xl text-[#2D2016] dark:text-[#EEE4E1] mb-8">
          문서 스트리밍 플랫폼
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-[#a67c52] to-[#c9a96e] hover:from-[#8a6842] hover:to-[#b89860] text-white text-lg px-8">
              지금 바로 시작하기
              </Button>
            </Link>
            <Link href="/browse">
              <Button size="lg" variant="outline" className="text-lg px-8 text-[#2D2016] dark:text-[#EEE4E1] border-[#E7D8C9] dark:border-[#3A302A] hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620]">
                문서 둘러보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ 왜 Textry인가요? ━━━ */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12 text-[#2D2016] dark:text-[#EEE4E1]">왜 Textry인가요?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-[#2E2620] p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-[#E7D8C9]/50 dark:border-[#3A302A]">
            <div className="w-12 h-12 bg-[#EEE4E1] dark:bg-[#B2967D]/20 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-[#B2967D]" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">열린 문서 공유</h4>
            <p className="text-[#5C4A38] dark:text-[#C4A882]">자료를 업로드하고 사람들과 공유하세요</p>
          </div>
          <div className="bg-white dark:bg-[#2E2620] p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-[#E7D8C9]/50 dark:border-[#3A302A]">
            <div className="w-12 h-12 bg-[#EEE4E1] dark:bg-[#B2967D]/20 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-[#B2967D]" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">구독 시스템</h4>
            <p className="text-[#5C4A38] dark:text-[#C4A882]">좋아하는 작가를 구독하고 새 문서를 놓치지 마세요</p>
          </div>
          <div className="bg-white dark:bg-[#2E2620] p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-[#E7D8C9]/50 dark:border-[#3A302A]">
            <div className="w-12 h-12 bg-[#EEE4E1] dark:bg-[#B2967D]/20 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-[#B2967D]" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">댓글 & 토론</h4>
            <p className="text-[#5C4A38] dark:text-[#C4A882]">문서에 댓글을 달고 다른 독자들과 의견을 나누세요</p>
          </div>
          <div className="bg-white dark:bg-[#2E2620] p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-[#E7D8C9]/50 dark:border-[#3A302A]">
            <div className="w-12 h-12 bg-[#EEE4E1] dark:bg-[#B2967D]/20 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-[#B2967D]" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">개인 맞춤 추천</h4>
            <p className="text-[#5C4A38] dark:text-[#C4A882]">읽기 기록을 기반으로 맞춤 문서를 추천받으세요</p>
          </div>
        </div>
      </section>

      {/* ━━━ 기능 소개 + 목업 ━━━ */}
      <section className="bg-[#EEE4E1]/50 dark:bg-[#1A1410] py-20">
        <div className="container mx-auto px-4">

          {/* 리더 목업 + 설명 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-3xl font-bold mb-4 text-[#2D2016] dark:text-[#EEE4E1]">유튜브처럼 쉬운 문서 스트리밍 플랫폼</h3>
              <p className="text-[#5C4A38] dark:text-[#C4A882] mb-6">좋아요, 구독, 댓글, 읽기 목록... 익숙한 기능으로 문서를 더 재미있게!</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-[#B2967D]" />
                  <span className="text-[#5C4A38] dark:text-[#E7D8C9]">좋아요/싫어요로 의견 표현</span>
                </div>
                <div className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5 text-[#B2967D]" />
                  <span className="text-[#5C4A38] dark:text-[#E7D8C9]">읽기 목록에 저장</span>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-[#B2967D]" />
                  <span className="text-[#5C4A38] dark:text-[#E7D8C9]">이어 읽기 자동 저장</span>
                </div>
              </div>
            </div>

            {/* ━━━ PDF 리더 목업 ━━━ */}
            <div className="bg-gradient-to-br from-[#EEE4E1] to-[#E7D8C9] dark:from-[#2E2620] dark:to-[#3A302A] rounded-2xl p-4 shadow-xl overflow-hidden">
              <div className="bg-[#1A1410] rounded-xl overflow-hidden shadow-2xl">
                {/* 상단 컨트롤바 */}
                <div className="bg-[#241E18] px-3 py-2 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#C4A882]" />
                    <span className="text-[10px] text-[#EEE4E1] font-medium truncate max-w-[120px]">Textry 시작 가이드</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <ChevronLeft className="w-3.5 h-3.5 text-[#9C8B7A]" />
                    <span className="text-[10px] text-[#C4A882] font-mono">24 / 156</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9C8B7A]" />
                  </div>
                  <div className="text-[10px] text-[#9C8B7A] font-mono">110%</div>
                </div>
                {/* 프로그레스바 */}
                <div className="h-0.5 bg-[#2E2620]">
                  <div className="h-full w-[15%] bg-gradient-to-r from-[#B2967D] to-[#E6BEAE] rounded-r" />
                </div>
                {/* 페이지 본문 */}
                <div className="p-5 min-h-[200px] bg-[#faf6f0]">
                  <h3 className="text-[13px] font-bold text-[#2D2016] mb-3 leading-tight">Chapter 3. 첫 번째 문서 업로드하기</h3>
                  <div className="space-y-2 text-[10px] text-[#5C4A38] leading-relaxed">
                    <p>Textry에 문서를 업로드하는 것은 아주 간단합니다. 대시보드에서 &lsquo;새 문서&rsquo; 버튼을 클릭하고, PDF 또는 EPUB 파일을 드래그하세요.</p>
                    <p>썸네일과 설명을 추가하면 독자들이 내 문서를 더 쉽게 발견할 수 있습니다. 카테고리와 태그도 잊지 마세요.</p>
                    <p className="text-[#9C8B7A] italic border-l-2 border-[#E6BEAE] pl-3">
                      Tip: 첫 페이지가 곧 첫인상입니다. 표지를 신경 쓰면 조회수가 크게 올라갑니다.
                    </p>
                    <p>업로드가 완료되면 실시간으로 조회수, 좋아요, 읽기 시간을 대시보드에서 확인할 수 있습니다.</p>
                  </div>
                </div>
                {/* 하단 인터랙션 바 */}
                <div className="px-4 py-2.5 bg-[#241E18] border-t border-[#3A302A] flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-[#C4A882]" />
                    <span className="text-[10px] text-[#9C8B7A]">1,247</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-[#9C8B7A]" />
                    <span className="text-[10px] text-[#9C8B7A]">86</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#B2967D] to-[#E6BEAE]" />
                    <span className="text-[10px] text-[#C4A882]">Textry 팀</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#B2967D] text-[#1A1410] rounded font-medium">구독중</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 대시보드 목업 + 설명 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* ━━━ 대시보드 목업 ━━━ */}
            <div className="bg-gradient-to-br from-[#EEE4E1] to-[#E7D8C9] dark:from-[#2E2620] dark:to-[#3A302A] rounded-2xl p-4 shadow-xl overflow-hidden order-2 md:order-1">
              <div className="bg-white dark:bg-[#241E18] rounded-xl overflow-hidden shadow-2xl">
                {/* 상단 헤더 */}
                <div className="px-4 py-3 border-b border-[#E7D8C9] dark:border-[#3A302A]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#2D2016] dark:text-[#EEE4E1]">작가 대시보드</div>
                      <div className="text-[9px] text-[#9C8B7A]">이번 달 성과</div>
                    </div>
                    <div className="text-[9px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">↑ 24%</div>
                  </div>
                </div>
                {/* 통계 카드 */}
                <div className="p-3 grid grid-cols-3 gap-2">
                  <div className="bg-[#ECF8F8] dark:bg-[#2E2620] rounded-lg p-2.5 text-center">
                    <Eye className="w-3.5 h-3.5 text-[#B2967D] mx-auto mb-1" />
                    <div className="text-sm font-bold text-[#2D2016] dark:text-[#EEE4E1]">12.4K</div>
                    <div className="text-[9px] text-[#9C8B7A]">조회수</div>
                  </div>
                  <div className="bg-[#ECF8F8] dark:bg-[#2E2620] rounded-lg p-2.5 text-center">
                    <Users className="w-3.5 h-3.5 text-[#E6BEAE] mx-auto mb-1" />
                    <div className="text-sm font-bold text-[#2D2016] dark:text-[#EEE4E1]">847</div>
                    <div className="text-[9px] text-[#9C8B7A]">구독자</div>
                  </div>
                  <div className="bg-[#ECF8F8] dark:bg-[#2E2620] rounded-lg p-2.5 text-center">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
                    <div className="text-sm font-bold text-[#2D2016] dark:text-[#EEE4E1]">₩84K</div>
                    <div className="text-[9px] text-[#9C8B7A]">수익</div>
                  </div>
                </div>
                {/* 미니 차트 */}
                <div className="px-4 pb-3">
                  <div className="flex items-end gap-1 h-12">
                    {[35, 48, 42, 58, 52, 68, 75, 62, 80, 72, 88, 92].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i >= 10 ? 'linear-gradient(to top, #a67c52, #c9a96e)' : i >= 8 ? 'rgba(178,150,125,0.6)' : 'rgba(178,150,125,0.25)' }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[8px] text-[#9C8B7A]">1월</span>
                    <span className="text-[8px] text-[#9C8B7A]">12월</span>
                  </div>
                </div>
                {/* 인기 문서 리스트 */}
                <div className="px-3 pb-3 space-y-1.5">
                  {[
                    { title: 'Next.js 완벽 가이드', views: '3.2K', trend: '+12%' },
                    { title: '디자인 시스템 구축', views: '2.8K', trend: '+8%' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-[#ECF8F8] dark:bg-[#2E2620] rounded-lg">
                      <div className="w-5 h-7 bg-gradient-to-br from-[#E6BEAE] to-[#B2967D] rounded flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-[#2D2016] dark:text-[#EEE4E1] truncate">{item.title}</div>
                        <div className="text-[9px] text-[#9C8B7A]">{item.views} 조회</div>
                      </div>
                      <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">{item.trend}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <h3 className="text-3xl font-bold mb-4 text-[#2D2016] dark:text-[#EEE4E1]">작가와 독자가 함께 성장</h3>
              <p className="text-[#5C4A38] dark:text-[#C4A882] mb-6">작가는 광고 수익을 얻고, 독자는 장벽 없이 지식을 만나는 열린 생태계</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-[#B2967D]" />
                  <span className="text-[#5C4A38] dark:text-[#E7D8C9]">조회수와 읽기 시간 기반 수익</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#B2967D]" />
                  <span className="text-[#5C4A38] dark:text-[#E7D8C9]">구독자 관리 대시보드</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[#B2967D]" />
                  <span className="text-[#5C4A38] dark:text-[#E7D8C9]">실시간 분석 데이터</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-[#a67c52] to-[#c9a96e] rounded-2xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h3>
          <p className="text-xl mb-8 opacity-90">5분이면 첫 문서를 업로드하고 독자들을 만날 수 있습니다</p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">지금 시작하기</Button>
            </Link>
            <Link href="/browse">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 text-white border-white hover:bg-white/20">문서 둘러보기</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer className="bg-[#2D2016] text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#c9a96e] via-[#f0d58c] to-[#c9a96e] bg-clip-text text-transparent" style={{WebkitTextStroke: '0.3px #daa520', paintOrder: 'stroke fill', letterSpacing: '1px'}}>
            Textry
          </h2>
          <p className="text-[#9C8B7A] mb-6">문서 스트리밍 플랫폼</p>
          <div className="flex gap-6 justify-center text-sm text-[#9C8B7A]">
            <Link href="/browse" className="hover:text-white">둘러보기</Link>
            <Link href="/signup" className="hover:text-white">회원가입</Link>
            <Link href="/login" className="hover:text-white">로그인</Link>
          </div>
          <p className="text-[#5C4A38] text-sm mt-8">© 2026 Textry. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
