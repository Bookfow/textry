import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '홈 | Textry',
  description: 'Textry에서 다양한 분야의 문서를 발견하고 읽어보세요. 기술, 인문, 과학, 예술 등 수천 편의 콘텐츠가 기다리고 있습니다.',
  openGraph: {
    title: '홈 | Textry',
    description: 'Textry에서 다양한 분야의 문서를 발견하고 읽어보세요.',
    type: 'website',
    siteName: 'Textry',
  },
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
