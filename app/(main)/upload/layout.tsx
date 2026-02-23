import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '콘텐츠 업로드 | Textry',
  description: 'PDF 콘텐츠를 업로드하고 전 세계 독자들과 공유하세요.',
  robots: { index: false },
}

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
