import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Sidebar } from '@/components/sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Textry - 문서를 스트리밍하다',
  description: '유튜브처럼 자유롭게 문서를 읽고, 공유하고, 소통하세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  'use client'
  
  const { usePathname } = require('next/navigation')
  const pathname = usePathname()
  
  // 사이드바를 보여주지 않을 페이지
  const noSidebarPages = ['/', '/login', '/signup']
  const showSidebar = !noSidebarPages.includes(pathname)

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}