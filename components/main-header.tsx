'use client'

import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Menu } from 'lucide-react'
import { NotificationsBell } from '@/components/notifications-bell'
import { ProfileMenu } from '@/components/profile-menu'
import { useAuth } from '@/lib/auth-context'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

interface MainHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  language: string
  onLanguageChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  onMenuClick: () => void
}

export function MainHeader({
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  language,
  onLanguageChange,
  sortBy,
  onSortChange,
  onMenuClick,
}: MainHeaderProps) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-20 bg-white border-b">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center gap-4">
          {/* 왼쪽: 햄버거 메뉴 + 로고 */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <Link href="/home" className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Textry
              </h1>
            </Link>
          </div>

          {/* 중앙: 검색/필터 바 - 데스크톱 */}
          <div className="hidden lg:flex flex-1 gap-2 max-w-4xl mx-auto">
            {/* 검색 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 rounded-full bg-gray-100 border-0 h-10"
              />
            </div>

            {/* 카테고리 */}
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-40 rounded-full bg-gray-100 border-0 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[120px]">
                <SelectItem value="all">전체 카테고리</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 언어 */}
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-36 rounded-full bg-gray-100 border-0 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[120px]">
                <SelectItem value="all">전체 언어</SelectItem>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.flag} {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 정렬 */}
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-36 rounded-full bg-gray-100 border-0 h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[120px]">
                <SelectItem value="recent">최신순</SelectItem>
                <SelectItem value="popular">인기순</SelectItem>
                <SelectItem value="views">조회수순</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 검색만 - 태블릿 */}
          <div className="hidden md:flex lg:hidden flex-1">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 rounded-full bg-gray-100 border-0 h-10"
              />
            </div>
          </div>

          {/* 우측 메뉴 */}
          <div className="flex items-center gap-2">
            {user && (
              <Link href="/upload">
                <Button
                  variant="ghost"
                  className="rounded-full hover:bg-gray-100 h-10 px-4"
                  title="업로드"
                >
                  <Plus className="w-5 h-5 mr-1" />
                  <span className="hidden md:inline">업로드</span>
                </Button>
              </Link>
            )}
            {user && <NotificationsBell />}
            {user && <ProfileMenu />}
          </div>
        </div>

        {/* 모바일 검색 */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 rounded-full bg-gray-100 border-0"
            />
          </div>
        </div>

        {/* 모바일/태블릿 필터 */}
        <div className="lg:hidden mt-3 grid grid-cols-3 gap-2">
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="rounded-full bg-gray-100 border-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[120px]">
              <SelectItem value="all">전체 카테고리</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="rounded-full bg-gray-100 border-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[120px]">
              <SelectItem value="all">전체 언어</SelectItem>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.flag} {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="rounded-full bg-gray-100 border-0 text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[120px]">
              <SelectItem value="recent">최신순</SelectItem>
              <SelectItem value="popular">인기순</SelectItem>
              <SelectItem value="views">조회수순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  )
}