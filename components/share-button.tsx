'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Link2, Check, Twitter, Facebook, MessageCircle } from 'lucide-react'

interface ShareButtonProps {
  documentId: string
  title: string
}

export function ShareButton({ documentId, title }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

  const url = typeof window !== 'undefined' ? `${window.location.origin}/read/${documentId}` : ''

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [showMenu])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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
    <>
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        aria-label="공유 메뉴 열기"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-[9999] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden w-56"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <div className="p-2">
              <button
                onClick={() => { handleCopyLink(); setShowMenu(false) }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-left transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4 text-gray-400" />}
                <span className="text-sm text-gray-200">{copied ? '복사됨!' : '링크 복사'}</span>
              </button>

              <div className="border-t border-gray-700 my-1" />

              <button onClick={shareToTwitter} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-left transition-colors">
                <Twitter className="w-4 h-4 text-sky-400" />
                <span className="text-sm text-gray-200">Twitter / X</span>
              </button>

              <button onClick={shareToFacebook} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-left transition-colors">
                <Facebook className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-200">Facebook</span>
              </button>

              <button onClick={shareToKakao} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-left transition-colors">
                <MessageCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-200">카카오톡 / 기타</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
