import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '찜한 콘텐츠',
  description: '나중에 읽기 위해 저장한 콘텐츠 목록입니다.',
  robots: { index: false },
}

export default function ReadingListLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
