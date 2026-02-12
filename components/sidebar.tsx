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
  Heart,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Crown,
  Shield,
  ListVideo,
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

  const isPremium = profile?.is_premium && profile?.premium_expires_at
    ? new Date(profile.premium_expires_at) > new Date()
    : false

  const isAdmin = profile?.role === 'author'

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
    { icon: BookOpen, label: '읽고 있는 콘텐츠', path: '/continue-reading' },
    { icon: Heart, label: '찜한 콘텐츠', path: '/reading-list' },
  ]

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) onClose()
  }

  const Tooltip = ({ label }: { label: string }) => (
    <>
      {!isOpen && (
        <div className="fixed ml-2 left-16 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[9999] transition-opacity duration-200 shadow-lg">
          {label}
        </div>
      )}
    </>
  )

  const MenuItem = ({ icon: Icon, label, path, active, badge }: any) => (
    <Link href={path} onClick={handleLinkClick}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer relative group
          ${active
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }
        `}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {isOpen && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm whitespace-nowrap">{label}</span>
            {badge && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${badge.className}`}>
                {badge.text}
              </span>
            )}
          </div>
        )}
        <Tooltip label={label} />
      </div>
    </Link>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="py-4 space-y-1">
        {/* 메인 메뉴 */}
        <div className="space-y-1 px-2">
          {mainMenuItems.map((item) => (
            <MenuItem key={item.path} icon={item.icon} label={item.label} path={item.path} active={isActive(item.path)} />
          ))}
        </div>

        <div className="border-t dark:border-gray-800 my-3" />

        {/* 내 페이지 섹션 */}
        {user && (
          <>
            <div className="px-2">
              <button
                onClick={() => setMyPageOpen(!myPageOpen)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 relative group"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 flex-shrink-0" />
                  {isOpen && <span className="text-sm font-semibold whitespace-nowrap">내 페이지</span>}
                </div>
                {isOpen && (myPageOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />)}
                <Tooltip label="내 페이지" />
              </button>

              {myPageOpen && (
                <div className={`mt-1 space-y-1 ${isOpen ? 'pl-2' : 'pl-0'}`}>
                  {myPageMenuItems.map((item) => (
                    <Link key={item.path} href={item.path} onClick={handleLinkClick}>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 relative group ${!isOpen ? 'justify-end' : ''} ${isActive(item.path) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>
                        <item.icon className="flex-shrink-0 w-4 h-4" />
                        {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
                        <Tooltip label={item.label} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t dark:border-gray-800 my-3" />
          </>
        )}

        {/* 구독 섹션 */}
        {user && (
          <div className="px-2">
            <button
              onClick={() => setSubscriptionsOpen(!subscriptionsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 relative group"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="text-sm font-semibold whitespace-nowrap">구독</span>}
              </div>
              {isOpen && (subscriptionsOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />)}
              <Tooltip label="구독" />
            </button>

            {subscriptionsOpen && subscribedAuthors.length > 0 && (
              <div className={`mt-1 space-y-1 ${isOpen ? 'pl-2' : 'pl-0'}`}>
                {subscribedAuthors.map((author) => (
                  <Link key={author.id} href={`/author/${author.id}`} onClick={handleLinkClick}>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm group relative ${!isOpen ? 'justify-center' : ''}`}>
                      {author.avatar_url ? (
                        <img src={author.avatar_url} alt={author.username || author.email}
                          className={`rounded-full object-cover flex-shrink-0 ${isOpen ? 'w-6 h-6' : 'w-5 h-5'}`} />
                      ) : (
                        <div className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold flex-shrink-0 ${isOpen ? 'w-6 h-6 text-xs' : 'w-5 h-5 text-[10px]'}`}>
                          {(author.username || author.email)[0].toUpperCase()}
                        </div>
                      )}
                      {isOpen && (
                        <span className="truncate group-hover:text-blue-600 whitespace-nowrap">
                          {author.username || author.email}
                        </span>
                      )}
                      <Tooltip label={author.username || author.email} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {subscriptionsOpen && subscribedAuthors.length === 0 && isOpen && (
              <div className="mt-1 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">구독한 작가가 없습니다</div>
            )}
          </div>
        )}

        {/* ━━━ 하단: 프리미엄 & 관리자 ━━━ */}
        {user && (
          <>
            <div className="border-t dark:border-gray-800 my-3" />
            <div className="space-y-1 px-2">
              {/* 시리즈 (작가만) */}
              {isAdmin && (
                <MenuItem
                  icon={ListVideo}
                  label="시리즈"
                  path="/series"
                  active={isActive('/series')}
                />
              )}

              {/* 프리미엄 */}
              <MenuItem
                icon={Crown}
                label={isPremium ? 'Premium 관리' : 'Premium 가입'}
                path="/premium"
                active={isActive('/premium')}
                badge={isPremium
                  ? { text: 'Active', className: 'bg-amber-100 text-amber-700' }
                  : { text: 'NEW', className: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' }
                }
              />

              {/* 관리자 (작가만) */}
              {isAdmin && (
                <MenuItem
                  icon={Shield}
                  label="Admin"
                  path="/admin"
                  active={isActive('/admin')}
                  badge={{ text: 'Admin', className: 'bg-red-100 text-red-700' }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r dark:border-gray-800 z-40 transition-all lg:static overflow-visible
          ${isOpen ? 'translate-x-0 w-60 lg:w-60 xl:w-60' : '-translate-x-full lg:translate-x-0 lg:w-16 xl:w-16'}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
