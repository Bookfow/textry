'use client'

import { useState } from 'react'
import { Share2, Link2, Check, Twitter, Facebook, MessageCircle } from 'lucide-react'

interface ShareButtonProps {
  documentId: string
  title: string
}

export function ShareButton({ documentId, title }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined' ? `${window.location.origin}/read/${documentId}` : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 폴백
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank')
    setShowMenu(false)
  }

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
    setShowMenu(false)
  }

  const shareToKakao = () => {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    } else {
      handleCopyLink()
    }
    setShowMenu(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        aria-label="공유 메뉴 열기"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <Share2 className="w-5 h-5" aria-hidden="true" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} aria-hidden="true" />
          <div className="absolute top-full right-0 mt-2 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50 w-56" role="menu" aria-label="공유 옵션">
            <div className="p-2">
              <button
                onClick={() => { handleCopyLink(); setShowMenu(false) }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-left transition-colors"
                role="menuitem"
                aria-label={copied ? '링크가 복사되었습니다' : '링크 복사'}
              >
                {copied ? <Check className="w-4 h-4 text-green-400" aria-hidden="true" /> : <Link2 className="w-4 h-4 text-gray-400" aria-hidden="true" />}
                <span className="text-sm text-gray-200">{copied ? '복사됨!' : '링크 복사'}</span>
              </button>

              <div className="border-t border-gray-700 my-1" role="separator" />

              <button
                onClick={shareToTwitter}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-left transition-colors"
                role="menuitem"
                aria-label="Twitter / X에 공유"
              >
                <Twitter className="w-4 h-4 text-sky-400" aria-hidden="true" />
                <span className="text-sm text-gray-200">Twitter / X</span>
              </button>

              <button
                onClick={shareToFacebook}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-left transition-colors"
                role="menuitem"
                aria-label="Facebook에 공유"
              >
                <Facebook className="w-4 h-4 text-blue-400" aria-hidden="true" />
                <span className="text-sm text-gray-200">Facebook</span>
              </button>

              <button
                onClick={shareToKakao}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-left transition-colors"
                role="menuitem"
                aria-label="카카오톡으로 공유"
              >
                <MessageCircle className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                <span className="text-sm text-gray-200">카카오톡 / 기타</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
