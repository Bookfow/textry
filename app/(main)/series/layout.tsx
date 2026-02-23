import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '시리즈 관리 | Textry',
  description: '시리즈를 만들고 콘텐츠를 묶어서 관리하세요.',
  robots: { index: false },
}

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
