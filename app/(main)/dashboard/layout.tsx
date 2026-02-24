import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '대시보드 | TeXTREME',
  description: '내 콘텐츠의 조회수, 수익, 통계를 확인하세요.',
  robots: { index: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
