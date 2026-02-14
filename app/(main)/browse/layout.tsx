import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '콘텐츠 탐색 | Textry',
  description: '카테고리별, 언어별로 문서를 탐색하세요. 인기순, 최신순 정렬로 원하는 콘텐츠를 쉽게 찾을 수 있습니다.',
  openGraph: {
    title: '콘텐츠 탐색 | Textry',
    description: '카테고리별, 언어별로 문서를 탐색하세요.',
    type: 'website',
    siteName: 'Textry',
  },
}

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
