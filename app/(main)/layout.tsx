'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { MainHeader } from '@/components/main-header'
import { BottomTabBar } from '@/components/bottom-tab-bar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <MainHeader
        category={category}
        onCategoryChange={setCategory}
        language={language}
        onLanguageChange={setLanguage}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onMenuClick={handleMenuClick}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 — 데스크톱(lg+)에서만 */}
        <div className="hidden lg:block">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 relative pb-16 lg:pb-0">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-amber-100/40 via-orange-50/20 to-transparent dark:from-amber-900/10 dark:via-amber-950/5 dark:to-transparent z-0" />
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] z-0" style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, transparent 70%)' }} />
          <div className="relative z-10 animate-page-enter">
            {children}
          </div>
        </main>
      </div>

      {/* 하단 탭 바 — 모바일/태블릿에서만 (lg 미만) */}
      <BottomTabBar />
    </div>
  )
}
