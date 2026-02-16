import type { Metadata } from "next"
import "./globals.css"
import Script from "next/script"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/lib/theme-context"
import { ToastProvider } from "@/components/toast"
import { CookieConsent } from "@/components/cookie-consent"
import { WebsiteJsonLd } from "@/components/json-ld"

export const metadata: Metadata = {
  metadataBase: new URL("https://textry-v1.vercel.app"),
  title: {
    default: "Textry — 지식을 스트리밍하다",
    template: "%s | Textry",
  },
  description: "문서를 업로드하고, 읽고, 공유하세요. Textry는 작가와 독자를 연결하는 문서 스트리밍 플랫폼입니다.",
  keywords: ["문서", "PDF", "읽기", "스트리밍", "작가", "출판", "Textry"],
  authors: [{ name: "Textry" }],
  creator: "Textry",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Textry",
    title: "Textry — 지식을 스트리밍하다",
    description: "문서를 업로드하고, 읽고, 공유하세요. Textry는 작가와 독자를 연결하는 문서 스트리밍 플랫폼입니다.",
    url: "https://textry-v1.vercel.app",
    images: [
      {
        url: "https://textry-v1.vercel.app/og-default.png",
        width: 1200,
        height: 630,
        alt: "Textry — 지식을 스트리밍하다",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Textry — 지식을 스트리밍하다",
    description: "문서를 업로드하고, 읽고, 공유하세요.",
    images: ["https://textry-v1.vercel.app/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {},
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0d9668" />
      </head>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-J9YDSY8L1R"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', { analytics_storage: 'denied' });
          gtag('config', 'G-J9YDSY8L1R');
        `}
      </Script>
      <body>
        <WebsiteJsonLd />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <CookieConsent />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
