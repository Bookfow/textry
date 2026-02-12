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
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  )
}
