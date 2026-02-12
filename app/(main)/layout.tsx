'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { MainHeader } from '@/components/main-header'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 화면 크기에 따라 사이드바 상태 자동 조정
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    // 초기 설정
    handleResize()

    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 헤더 - 전체 상단 */}
      <MainHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        category={category}
        onCategoryChange={setCategory}
        language={language}
        onLanguageChange={setLanguage}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onMenuClick={handleMenuClick}
      />
      
      {/* 사이드바 + 메인 */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}