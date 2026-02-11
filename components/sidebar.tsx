'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase, Profile } from '@/lib/supabase'
import {
  Home,
  TrendingUp,
  Users,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Upload,
  BarChart3,
  Menu,
  X
} from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

export function Sidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(true)
  const [subscribedAuthors, setSubscribedAuthors] = useState<Profile[]>([])

  const isActive = (path: string) => pathname === path

  useEffect(() => {
    if (user) {
      loadSubscribedAuthors()
    }
  }, [user])

  const loadSubscribedAuthors = async () => {
    if (!user) return

    try {
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('author_id')
        .eq('subscriber_id', user.id)

      if (subscriptions && subscriptions.length > 0) {
        const authorIds = subscriptions.map(s => s.author_id)
        const { data: authors } = await supabase
          .from('profiles')
          .select('*')
          .in('id', authorIds)

        setSubscribedAuthors(authors || [])
      }
    } catch (err) {
      console.error('Error loading subscribed authors:', err)
    }
  }

  const mainMenuItems = [
    { icon: Home, label: '홈', path: '/home' },
    { icon: TrendingUp, label: '인기', path: '/browse?sort=popular' },
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
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 로고 */}
      <div className="p-4 border-b">
        <Link href="/home">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center lg:text-left">
            Textry
          </h1>
        </Link>
      </div>

      <div className="py-4 space-y-1">
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

        <div className="border-t my-3" />

        {/* 구독 섹션 */}
        {user && (
          <>
            <div className="px-2">
              <button
                onClick={() => setSubscriptionsOpen(!subscriptionsOpen)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-semibold hidden lg:block">구독</span>
                </div>
                {subscriptionsOpen ? (
                  <ChevronDown className="w-4 h-4 hidden lg:block" />
                ) : (
                  <ChevronRight className="w-4 h-4 hidden lg:block" />
                )}
              </button>

              {subscriptionsOpen && subscribedAuthors.length > 0 && (
                <div className="mt-1 space-y-1 pl-2">
                  {subscribedAuthors.map((author) => (
                    <Link key={author.id} href={`/author/${author.id}`}>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm group">
                        {author.avatar_url ? (
                          <img
                            src={author.avatar_url}
                            alt={author.username || author.email}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(author.username || author.email)[0].toUpperCase()}
                          </div>
                        )}
                        <span className="hidden lg:block truncate group-hover:text-blue-600">
                          {author.username || author.email}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {subscriptionsOpen && subscribedAuthors.length === 0 && (
                <div className="mt-1 px-3 py-2 text-xs text-gray-400 hidden lg:block">
                  구독한 작가가 없습니다
                </div>
              )}
            </div>

            <div className="border-t my-3" />
          </>
        )}

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
    </div>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

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