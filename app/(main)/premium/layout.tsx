import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Premium 구독 | Textry',
  description: '광고 없이 모든 콘텐츠를 즐기세요. Textry Premium으로 더 깨끗한 읽기 경험을 제공합니다.',
  openGraph: {
    title: 'Premium 구독 | Textry',
    description: '광고 없이 모든 콘텐츠를 즐기세요. Textry Premium.',
    type: 'website',
    siteName: 'Textry',
  },
}

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
