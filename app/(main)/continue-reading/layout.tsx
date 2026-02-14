import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '읽고 있는 콘텐츠 | Textry',
  description: '이전에 읽던 문서를 이어서 읽어보세요.',
  robots: { index: false },
}

export default function ContinueReadingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
