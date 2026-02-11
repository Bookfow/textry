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
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const [myPageOpen, setMyPageOpen] = useState(true)
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
  ]

  const myPageMenuItems = [
    { icon: TrendingUp, label: '인기', path: '/browse?sort=popular' },
    { icon: Bookmark, label: '읽기 목록', path: '/reading-list' },
    { icon: BookOpen, label: '이어 읽기', path: '/home?section=continue' },
  ]

  const MenuItem = ({ icon: Icon, label, path, active }: any) => (
    <Link href={path} onClick={() => onClose()}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer relative group
          ${active 
            ? 'bg-blue-50 text-blue-600 font-semibold' 
            : 'hover:bg-gray-100 text-gray-700'
          }
          xl:px-4 xl:py-3
        `}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="hidden xl:block text-sm">{label}</span>
        
        {/* 툴팁 - 중간 크기에서만 표시 */}
        <div className="hidden lg:xl:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          {label}
        </div>
      </div>
    </Link>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="py-4 space-y-1">
        {/* 메인 메뉴 */}
        <div className="space-y-1 px-2">
          {mainMenuItems.map((item) => (
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

        {/* 내 페이지 섹션 */}
        {user && (
          <>
            <div className="px-2">
              <button
                onClick={() => setMyPageOpen(!myPageOpen)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 relative group"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-semibold hidden xl:block">내 페이지</span>
                </div>
                {myPageOpen ? (
                  <ChevronDown className="w-4 h-4 hidden xl:block" />
                ) : (
                  <ChevronRight className="w-4 h-4 hidden xl:block" />
                )}
                
                {/* 툴팁 */}
                <div className="hidden lg:xl:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  내 페이지
                </div>
              </button>

              {myPageOpen && (
                <div className="mt-1 space-y-1 pl-2">
                  {myPageMenuItems.map((item) => (
                    <Link key={item.path} href={item.path} onClick={() => onClose()}>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 text-sm hover:bg-gray-100 relative group ${isActive(item.path) ? 'bg-blue-50 text-blue-600 font-semibold' : ''}`}>
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden xl:block">{item.label}</span>
                        
                        {/* 툴팁 */}
                        <div className="hidden lg:xl:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                          {item.label}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t my-3" />
          </>
        )}

        {/* 구독 섹션 */}
        {user && (
          <div className="px-2">
            <button
              onClick={() => setSubscriptionsOpen(!subscriptionsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 relative group"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold hidden xl:block">구독</span>
              </div>
              {subscriptionsOpen ? (
                <ChevronDown className="w-4 h-4 hidden xl:block" />
              ) : (
                <ChevronRight className="w-4 h-4 hidden xl:block" />
              )}
              
              {/* 툴팁 */}
              <div className="hidden lg:xl:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                구독
              </div>
            </button>

            {subscriptionsOpen && subscribedAuthors.length > 0 && (
              <div className="mt-1 space-y-1 pl-2">
                {subscribedAuthors.map((author) => (
                  <Link key={author.id} href={`/author/${author.id}`} onClick={() => onClose()}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm group relative">
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
                      <span className="hidden xl:block truncate group-hover:text-blue-600">
                        {author.username || author.email}
                      </span>
                      
                      {/* 툴팁 */}
                      <div className="hidden lg:xl:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                        {author.username || author.email}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {subscriptionsOpen && subscribedAuthors.length === 0 && (
              <div className="mt-1 px-3 py-2 text-xs text-gray-400 hidden xl:block">
                구독한 작가가 없습니다
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white border-r z-40 transition-all lg:static
          ${isOpen ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0'}
          lg:w-16 xl:w-60
        `}
      >
        <SidebarContent />
      </aside>
    </>
  )
}