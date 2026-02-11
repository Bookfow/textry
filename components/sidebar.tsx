'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  Home,
  TrendingUp,
  Users,
  Bookmark,
  BookOpen,
  Bell,
  ChevronDown,
  ChevronRight,
  Upload,
  BarChart3,
  Menu,
  X
} from 'lucide-react'
import { CATEGORIES, getCategoryIcon } from '@/lib/categories'
import { LANGUAGES, getLanguageFlag } from '@/lib/languages'
import { Button } from '@/components/ui/button'

export function Sidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false) // 모바일 메뉴
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [languagesOpen, setLanguagesOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  const mainMenuItems = [
    { icon: Home, label: '홈', path: '/home' },
    { icon: TrendingUp, label: '인기', path: '/browse?sort=popular' },
    { icon: Users, label: '구독', path: '/browse?filter=subscribed', authOnly: true },
    { icon: Bookmark, label: '읽기 목록', path: '/reading-list', authOnly: true },
    { icon: BookOpen, label: '이어 읽기', path: '/home?section=continue', authOnly: true },
  ]

  const authorMenuItems = profile?.role === 'author' ? [
    { icon: Upload, label: '업로드', path: '/upload' },
    { icon: BarChart3, label: '대시보드', path: '/dashboard' },
  ] : []

  const MenuItem = ({ icon: Icon, label, path, active }: any) => (
    <Link href={path}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer
          ${active 
            ? 'bg-blue-50 text-blue-600 font-semibold' 
            : 'hover:bg-gray-100 text-gray-700'
          }
          lg:px-4 lg:py-3
        `}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="hidden lg:block text-sm">{label}</span>
      </div>
    </Link>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-4 space-y-1">
      {/* 메인 메뉴 */}
      <div className="space-y-1 px-2">
        {mainMenuItems.map((item) => {
          if (item.authOnly && !user) return null
          return (
            <MenuItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={isActive(item.path)}
            />
          )
        })}
      </div>

      {/* 구분선 */}
      <div className="border-t my-3" />

      {/* 작가 메뉴 */}
      {authorMenuItems.length > 0 && (
        <>
          <div className="space-y-1 px-2">
            {authorMenuItems.map((item) => (
              <MenuItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                active={isActive(item.path)}
              />
            ))}
          </div>
          <div className="border-t my-3" />
        </>
      )}

      {/* 카테고리 */}
      <div className="px-2">
        <button
          onClick={() => setCategoriesOpen(!categoriesOpen)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
        >
          <span className="text-sm font-semibold hidden lg:block">카테고리</span>
          <span className="text-xl lg:hidden">📂</span>
          {categoriesOpen ? (
            <ChevronDown className="w-4 h-4 hidden lg:block" />
          ) : (
            <ChevronRight className="w-4 h-4 hidden lg:block" />
          )}
        </button>
        {categoriesOpen && (
          <div className="mt-1 space-y-1 pl-2">
            {CATEGORIES.slice(0, 6).map((cat) => (
              <Link key={cat.value} href={`/browse?category=${cat.value}`}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm">
                  <span className="text-base">{cat.icon}</span>
                  <span className="hidden lg:block">{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 언어 */}
      <div className="px-2">
        <button
          onClick={() => setLanguagesOpen(!languagesOpen)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
        >
          <span className="text-sm font-semibold hidden lg:block">언어</span>
          <span className="text-xl lg:hidden">🌐</span>
          {languagesOpen ? (
            <ChevronDown className="w-4 h-4 hidden lg:block" />
          ) : (
            <ChevronRight className="w-4 h-4 hidden lg:block" />
          )}
        </button>
        {languagesOpen && (
          <div className="mt-1 space-y-1 pl-2">
            {LANGUAGES.slice(0, 5).map((lang) => (
              <Link key={lang.value} href={`/browse?language=${lang.value}`}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm">
                  <span className="text-base">{lang.flag}</span>
                  <span className="hidden lg:block">{lang.label}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white border-r z-40 transition-transform
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static
          w-60 lg:w-16 xl:w-60
        `}
      >
        <SidebarContent />
      </aside>
    </>
  )
}