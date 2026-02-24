'use client'

import { useState, useEffect } from 'react'
import { Cookie, X } from 'lucide-react'
import Link from 'next/link'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1000)
      return () => clearTimeout(timer)
    }
    // 이미 동의한 경우 GA consent 업데이트
    try {
      const parsed = JSON.parse(consent)
      if (parsed.analytics && typeof (window as any).gtag === 'function') {
        (window as any).gtag('consent', 'update', { analytics_storage: 'granted' })
      }
    } catch {}
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      acceptedAt: new Date().toISOString(),
    }))
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      (window as any).gtag('consent', 'update', { analytics_storage: 'granted' })
    }
    setShow(false)
  }

  const handleAcceptNecessary = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      acceptedAt: new Date().toISOString(),
    }))
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <Cookie className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">쿠키 사용 안내</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              TeXTREME는 서비스 제공 및 사용자 경험 향상을 위해 쿠키를 사용합니다.
              필수 쿠키는 서비스 운영에 필요하며, 분석 및 마케팅 쿠키는 선택 사항입니다.
              자세한 내용은{' '}
              <Link href="/policies/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                개인정보처리방침
              </Link>
              을 참고해주세요.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                모두 동의
              </button>
              <button
                onClick={handleAcceptNecessary}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                필수만 동의
              </button>
            </div>
          </div>
          <button
            onClick={handleAcceptNecessary}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
