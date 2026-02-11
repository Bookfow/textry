'use client'

import { useState } from 'react'
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

  return (
    <div className="flex flex-col min-h-screen">
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
      />
      
      {/* 사이드바 + 메인 */}
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}