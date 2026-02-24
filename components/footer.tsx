'use client'

import Link from 'next/link'

export function Footer() {
  const handleResetCookieConsent = () => {
    localStorage.removeItem('cookie-consent')
    window.location.reload()
  }

  return (
    <footer className="border-t border-[#E7D8C9] dark:border-[#3A302A] bg-[#F7F2EF] dark:bg-[#1A1410]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#9C8B7A]">
          <Link href="/policies/about" className="hover:text-[#5C4A38] dark:hover:text-[#C4A882] transition-colors">소개</Link>
          <Link href="/policies/copyright" className="hover:text-[#5C4A38] dark:hover:text-[#C4A882] transition-colors">저작권</Link>
          <Link href="/policies/terms" className="hover:text-[#5C4A38] dark:hover:text-[#C4A882] transition-colors">서비스약관</Link>
          <Link href="/policies/privacy" className="hover:text-[#5C4A38] dark:hover:text-[#C4A882] transition-colors">개인정보처리방침</Link>

          <Link href="/policies/safety" className="hover:text-[#5C4A38] dark:hover:text-[#C4A882] transition-colors">정책및안전</Link>
          <button onClick={handleResetCookieConsent} className="hover:text-[#5C4A38] dark:hover:text-[#C4A882] transition-colors cursor-pointer">쿠키 설정</button>
        </div>
        <p className="text-[11px] text-[#C4B5A6] dark:text-[#5C4A38] mt-3 text-center">© 2026 TeXTREME. All rights reserved.</p>
      </div>
    </footer>
  )
}
