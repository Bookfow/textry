'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileText, Zap, Users, TrendingUp, BookOpen, MessageCircle, Heart, Bookmark } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#a67c52] via-[#f0d58c] to-[#a67c52] bg-clip-text text-transparent" style={{WebkitTextStroke: '0.3px #daa520', paintOrder: 'stroke fill', letterSpacing: '1px'}}>
              Textry
            </h1>
            <div className="flex gap-4">
            <Link href="/browse">
            <Button variant="ghost" className="text-gray-900 hover:text-black font-medium">둘러보기</Button>
</Link>
<Link href="/login">
<Button variant="ghost" className="text-gray-900 hover:text-black font-medium">로그인</Button>
</Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-[#a67c52] to-[#c9a96e] hover:from-[#8a6842] hover:to-[#b89860]">
                  시작하기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#7a5a30] via-[#c9a96e] to-[#7a5a30] bg-clip-text text-transparent">
            지식을 스트리밍하다
          </h2>
          <p className="text-xl md:text-2xl text-gray-900 mb-8">
            유튜브처럼 자유롭게 문서를 읽고, 공유하고, 소통하세요
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-[#a67c52] to-[#c9a96e] hover:from-[#8a6842] hover:to-[#b89860] text-lg px-8">
                무료로 시작하기
              </Button>
            </Link>
            <Link href="/browse">
              <Button size="lg" variant="outline" className="text-lg px-8">
                문서 둘러보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">왜 Textry인가요?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-amber-700" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-gray-900">무료 문서 공유</h4>
            <p className="text-gray-600">PDF를 업로드하고 전 세계 사람들과 공유하세요</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-amber-700" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-gray-900">구독 시스템</h4>
            <p className="text-gray-600">좋아하는 작가를 구독하고 새 문서를 놓치지 마세요</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-amber-700" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-gray-900">댓글 & 토론</h4>
            <p className="text-gray-600">문서에 댓글을 달고 다른 독자들과 의견을 나누세요</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-amber-700" />
            </div>
            <h4 className="text-xl font-semibold mb-2 text-gray-900">개인 맞춤 추천</h4>
            <p className="text-gray-600">읽기 기록을 기반으로 맞춤 문서를 추천받으세요</p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">유튜브처럼 쉬운 문서 플랫폼</h3>
              <p className="text-gray-600 mb-6">좋아요, 구독, 댓글, 읽기 목록... 익숙한 기능으로 문서를 더 재미있게!</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-[#a67c52]" />
                  <span className="text-gray-700">좋아요/싫어요로 의견 표현</span>
                </div>
                <div className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5 text-[#a67c52]" />
                  <span className="text-gray-700">읽기 목록에 저장</span>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-[#a67c52]" />
                  <span className="text-gray-700">이어 읽기 자동 저장</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-8 h-64 flex items-center justify-center">
              <FileText className="w-32 h-32 text-[#a67c52] opacity-20" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-amber-100 to-yellow-100 rounded-2xl p-8 h-64 flex items-center justify-center order-2 md:order-1">
              <Users className="w-32 h-32 text-[#a67c52] opacity-20" />
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-3xl font-bold mb-4 text-gray-900">작가와 독자가 함께 성장</h3>
              <p className="text-gray-600 mb-6">작가는 광고 수익을 얻고, 독자는 무료로 문서를 읽고, 모두가 Win-Win!</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-[#a67c52]" />
                  <span className="text-gray-700">조회수와 읽기 시간 기반 수익</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#a67c52]" />
                  <span className="text-gray-700">구독자 관리 대시보드</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[#a67c52]" />
                  <span className="text-gray-700">실시간 분석 데이터</span>
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

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#c9a96e] via-[#f0d58c] to-[#c9a96e] bg-clip-text text-transparent" style={{WebkitTextStroke: '0.3px #daa520', paintOrder: 'stroke fill', letterSpacing: '1px'}}>
            Textry
          </h2>
          <p className="text-gray-400 mb-6">문서를 스트리밍하다</p>
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