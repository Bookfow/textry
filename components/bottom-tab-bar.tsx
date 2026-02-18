'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Compass, Search, BookOpen, User } from 'lucide-react'

const tabs = [
  { label: '홈', icon: Home, path: '/home' },
  { label: '둘러보기', icon: Compass, path: '/browse' },
  { label: '검색', icon: Search, path: '/browse?focus=search' },
  { label: '내 서재', icon: BookOpen, path: '/library' },
  { label: '마이', icon: User, path: '/settings' },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path: string) => {
    if (path === '/browse?focus=search') return false
    if (path === '/browse') return pathname === '/browse'
    return pathname.startsWith(path)
  }

  const handleTap = (path: string) => {
    router.push(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1A1410] border-t border-[#E7D8C9] dark:border-[#3A302A] lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map(tab => {
          const active = isActive(tab.path)
          return (
            <button
              key={tab.label}
              onClick={() => handleTap(tab.path)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors"
            >
              <tab.icon
                className={`w-5 h-5 transition-colors ${
                  active ? 'text-[#B2967D]' : 'text-[#9C8B7A]'
                }`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] transition-colors ${
                  active ? 'text-[#B2967D] font-semibold' : 'text-[#9C8B7A]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
