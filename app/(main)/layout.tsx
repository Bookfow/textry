'use client'

import { useState } from 'react'
import { MainHeader } from '@/components/main-header'
import { BottomTabBar } from '@/components/bottom-tab-bar'
import { Footer } from '@/components/footer'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <MainHeader
        category={category}
        onCategoryChange={setCategory}
        language={language}
        onLanguageChange={setLanguage}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <main className="flex-1 overflow-y-auto bg-[#F7F2EF] dark:bg-[#1A1410] relative pb-16 lg:pb-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-amber-100/40 via-orange-50/20 to-transparent dark:from-amber-900/10 dark:via-amber-950/5 dark:to-transparent z-0" />
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] z-0" style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, transparent 70%)' }} />
        <div className="relative z-10 animate-page-enter">
          {children}
        </div>

        {/* 푸터 — PC에서만 (모바일은 탭바) */}
        <div className="hidden lg:block relative z-10">
          <Footer />
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}
