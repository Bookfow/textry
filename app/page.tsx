'use client'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { FileText, DollarSign, Eye, BookOpen } from 'lucide-react'

export default function Home() {
  const { user, profile } = useAuth()

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Textry</h1>
          <div className="flex gap-2">
            {user ? (
              <>
                <Link href={profile?.role === 'author' ? '/dashboard' : '/browse'}>
                  <Button variant="outline">
                    {profile?.role === 'author' ? '대시보드' : '문서 보기'}
                  </Button>
                </Link>
                <Button 
  variant="outline"
  onClick={async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }}
>
  로그아웃
</Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">로그인</Button>
                </Link>
                <Link href="/signup">
                  <Button>시작하기</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold mb-4">문서를 스트리밍하다</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          유튜브처럼 자유롭게 문서를 공유하고 읽으세요.
          <br />
          업로드도, 읽기도 완전 무료. 광고 기반 수익 분배.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              무료로 시작하기
            </Button>
          </Link>
          <Link href="/browse">
            <Button size="lg" variant="outline" className="text-lg px-8">
              문서 둘러보기
            </Button>
          </Link>
        </div>
      </section>

      {/* 핵심 원칙 */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Textry의 핵심 원칙</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <FileText className="w-12 h-12 text-blue-600 mb-2" />
                <CardTitle>문서를 판매하지 않습니다</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  모든 문서는 무료로 읽을 수 있습니다. 결제 장벽이 없습니다.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Eye className="w-12 h-12 text-blue-600 mb-2" />
                <CardTitle>열면 바로 읽힙니다</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  복잡한 뷰어나 앱 설치 없이, 브라우저에서 바로 읽기 시작.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <DollarSign className="w-12 h-12 text-blue-600 mb-2" />
                <CardTitle>읽힌 시간에 가치를 둡니다</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  독자가 실제로 읽은 시간을 기준으로 수익을 분배합니다.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="w-12 h-12 text-blue-600 mb-2" />
                <CardTitle>뷰어가 곧 서비스입니다</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  종이책보다 편하고, 웹글보다 몰입되는 읽기 경험.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h3>
        <p className="text-xl text-gray-600 mb-8">
          작가라면 수익을 창출하고, 독자라면 무료로 읽으세요.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              작가로 시작하기
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="text-lg px-8">
              독자로 가입하기
            </Button>
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>© 2026 Textry. 문서를 소유하지 않고, 생각을 흐르게 합니다.</p>
        </div>
      </footer>
    </div>
  )
}