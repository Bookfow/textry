'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { User, LogOut, Settings, HelpCircle, MessageSquare, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function ProfileMenu() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackEmail, setFeedbackEmail] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [sending, setSending] = useState(false)

  if (!user || !profile) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleLanguage = (lang: string) => {
    // TODO: 언어 변경 구현
    alert(`언어 변경: ${lang === 'ko' ? '한국어' : 'English'}\n곧 추가됩니다!`)
  }

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      alert('내용을 입력해주세요.')
      return
    }

    setSending(true)

    try {
      // TODO: 실제 이메일 전송 API 연결
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert('의견이 전송되었습니다. 감사합니다!')
      setFeedbackOpen(false)
      setFeedbackEmail('')
      setFeedbackMessage('')
    } catch (err) {
      alert('전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  const initial = (profile.username || profile.email)[0].toUpperCase()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {profile.avatar_url ? (
            <button className="rounded-full w-10 h-10 overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors">
              <img
                src={profile.avatar_url}
                alt="프로필"
                className="w-full h-full object-cover"
              />
            </button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold hover:opacity-80"
            >
              {initial}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* 프로필 정보 */}
          <div className="px-2 py-2">
            <p className="font-semibold">{profile.username || profile.email}</p>
            <p className="text-xs text-gray-500">{profile.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              {profile.role === 'author' ? '작가' : '독자'}
            </p>
          </div>
          
          <DropdownMenuSeparator />

          {/* 내 프로필 */}
          <DropdownMenuItem asChild>
            <Link href={`/profile/${user.id}`} className="cursor-pointer">
              <User className="w-4 h-4 mr-2" />
              내 프로필
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 표시 언어 */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe className="w-4 h-4 mr-2" />
              표시 언어
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleLanguage('ko')}>
                🇰🇷 한국어
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLanguage('en')}>
                🇺🇸 English
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* 설정 */}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              설정
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 고객센터 */}
          <DropdownMenuItem asChild>
            <Link href="/help" className="cursor-pointer">
              <HelpCircle className="w-4 h-4 mr-2" />
              고객센터
            </Link>
          </DropdownMenuItem>

          {/* 의견 보내기 */}
          <DropdownMenuItem onClick={() => setFeedbackOpen(true)} className="cursor-pointer">
            <MessageSquare className="w-4 h-4 mr-2" />
            의견 보내기
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 로그아웃 */}
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 의견 보내기 다이얼로그 */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>의견 보내기</DialogTitle>
            <DialogDescription>
              서비스 개선을 위한 의견을 보내주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-email">이메일 (선택)</Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder="답변받을 이메일 주소"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-message">내용</Label>
              <Textarea
                id="feedback-message"
                placeholder="의견을 작성해주세요..."
                rows={6}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSendFeedback} disabled={sending}>
              {sending ? '전송 중...' : '전송'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}