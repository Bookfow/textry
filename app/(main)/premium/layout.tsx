import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Premium 구독 | TeXTREME',
  description: '광고 없이 모든 콘텐츠를 즐기세요. TeXTREME Premium으로 더 깨끗한 읽기 경험을 제공합니다.',
  openGraph: {
    title: 'Premium 구독 | TeXTREME',
    description: '광고 없이 모든 콘텐츠를 즐기세요. TeXTREME Premium.',
    type: 'website',
    siteName: 'TeXTREME',
  },
}

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
