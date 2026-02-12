'use client'

import { useTheme } from '@/lib/theme-context'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light' as const, icon: Sun, label: '라이트' },
    { value: 'dark' as const, icon: Moon, label: '다크' },
    { value: 'system' as const, icon: Monitor, label: '시스템' },
  ]

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            theme === opt.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          title={opt.label}
        >
          <opt.icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
