'use client'

import Link from 'next/link'
import { BookOpen, Upload, Users, DollarSign, Shield, Heart } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">TeXTREME 소개</h1>
        <p className="text-sm text-gray-500 mb-8">TeXTREME가 어떻게 작동하는지 알아보세요</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">TeXTREME란?</h2>
            <p>TeXTREME는 전 세계 큐레이터와 독자를 연결하는 디지털 콘텐츠 플랫폼입니다. 누구나 자신의 콘텐츠를 업로드하고, 다양한 분야의 지식과 이야기를 공유할 수 있습니다.</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-5">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">콘텐츠 업로드</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">PDF, TXT, DOCX, MD 형식의 콘텐츠를 쉽게 업로드하고 전 세계와 공유하세요.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-5">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">편안한 읽기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">최적화된 PDF 뷰어로 어디서든 편안하게 읽을 수 있습니다. 진행률 자동 저장으로 이어읽기도 간편합니다.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-5">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">큐레이터 구독</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">좋아하는 큐레이터를 구독하고, 새 콘텐츠가 올라오면 바로 확인하세요.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-5">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">수익 창출</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">자격을 갖춘 큐레이터는 광고 및 프리미엄 구독 수익을 배분받을 수 있습니다.</p>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">큐레이터로 시작하기</h2>
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li><strong>계정 생성:</strong> 이메일로 간단하게 가입합니다.</li>
              <li><strong>콘텐츠 업로드:</strong> 본인의 콘텐츠를 업로드하고 카테고리, 설명을 설정합니다.</li>
              <li><strong>독자와 소통:</strong> 댓글을 통해 독자와 소통하고, 구독자를 늘려보세요.</li>
              <li><strong>수익화:</strong> 일정 조건(누적 읽기 시간 100시간, 가입 후 30일)을 달성하면 수익 배분을 시작합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">큐레이터 등급 시스템</h2>
            <div className="not-prose space-y-3 mt-3">
              <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔒</span>
                  <span className="font-bold text-gray-900 dark:text-white">Tier 0 — 일반 사용자</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">콘텐츠 업로드 가능, 수익화 불가</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">✓</span>
                  <span className="font-bold text-blue-600">Tier 1 — 파트너 큐레이터</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">누적 읽기 시간 100시간 + 가입 30일 달성 시. 수익의 70% 배분</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">★</span>
                  <span className="font-bold text-purple-600">Tier 2 — 프로 큐레이터</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">누적 읽기 시간 1,000시간 달성 시. 수익의 80% 배분</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">프리미엄 구독</h2>
            <p>프리미엄 구독자는 광고 없이 모든 콘텐츠를 즐길 수 있으며, 프리미엄 구독료의 일부는 큐레이터에게 배분됩니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">안전한 플랫폼</h2>
            <p>TeXTREME는 저작권 보호, 커뮤니티 가이드라인, 신고 시스템을 통해 안전한 플랫폼 환경을 유지하고 있습니다. 자세한 내용은 다음 페이지를 참고해주세요:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><Link href="/policies/copyright" className="text-blue-600 hover:underline">저작권 정책</Link></li>
              <li><Link href="/policies/safety" className="text-blue-600 hover:underline">정책 및 안전</Link></li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t dark:border-gray-800 text-xs text-gray-400">
          <Link href="/policies" className="hover:underline">← 정책 목록으로 돌아가기</Link>
        </div>
      </main>
    </div>
  )
}
