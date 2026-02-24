import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '설정',
  description: '프로필, 알림, 계정 설정을 관리하세요.',
  robots: { index: false },
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
