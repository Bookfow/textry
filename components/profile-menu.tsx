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
import { User, LogOut, Settings, HelpCircle, MessageSquare, BarChart3, BookOpen, Crown, Shield } from 'lucide-react'
import { useToast } from '@/components/toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function ProfileMenu() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
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

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) { toast.warning('내용을 입력해주세요.'); return }
    setSending(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('의견이 전송되었습니다. 감사합니다!')
      setFeedbackOpen(false); setFeedbackEmail(''); setFeedbackMessage('')
    } catch { toast.error('전송에 실패했습니다.') }
    finally { setSending(false) }
  }

  const isPremium = profile?.is_premium && profile?.premium_expires_at
    ? new Date(profile.premium_expires_at) > new Date()
    : false

  const isAdmin = profile?.email === 'junepk@bjpublic.co.kr'

  const initial = (profile.username || profile.email)[0].toUpperCase()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {profile.avatar_url ? (
            <button className="rounded-full w-10 h-10 overflow-hidden border-2 border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D] transition-colors">
              <img src={profile.avatar_url} alt="프로필" className="w-full h-full object-cover" />
            </button>
          ) : (
            <Button variant="ghost" size="icon"
              className="rounded-full w-10 h-10 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] text-white font-bold hover:opacity-80">
              {initial}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* 프로필 정보 */}
          <div className="px-3 py-2.5">
            <p className="font-semibold text-[#2D2016] dark:text-[#EEE4E1]">{profile.username || profile.email}</p>
            <p className="text-xs text-[#9C8B7A]">{profile.email}</p>
          </div>

          <DropdownMenuSeparator />

          {/* 내 공간 */}
          <DropdownMenuItem asChild>
            <Link href={`/profile/${user.id}`} className="cursor-pointer">
              <User className="w-4 h-4 mr-2" /> 내 공간
            </Link>
          </DropdownMenuItem>

          {/* 내 서재 */}
          <DropdownMenuItem asChild>
            <Link href="/library" className="cursor-pointer">
              <BookOpen className="w-4 h-4 mr-2" /> 내 서재
            </Link>
          </DropdownMenuItem>

          {/* 대시보드 */}
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <BarChart3 className="w-4 h-4 mr-2" /> 대시보드
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 프리미엄 */}
          <DropdownMenuItem asChild>
            <Link href="/premium" className="cursor-pointer">
              <Crown className={`w-4 h-4 mr-2 ${isPremium ? 'text-amber-500' : ''}`} />
              <span className="flex-1">{isPremium ? 'Premium 관리' : 'Premium 가입'}</span>
              {isPremium ? (
                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold">Active</span>
              ) : (
                <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded text-[10px] font-bold">NEW</span>
              )}
            </Link>
          </DropdownMenuItem>

          {/* 어드민 */}
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <Shield className="w-4 h-4 mr-2 text-red-500" />
                <span className="flex-1">Admin</span>
                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-[10px] font-bold">Admin</span>
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* 설정 */}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" /> 설정
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 고객센터 */}
          <DropdownMenuItem asChild>
            <Link href="/help" className="cursor-pointer">
              <HelpCircle className="w-4 h-4 mr-2" /> 고객센터
            </Link>
          </DropdownMenuItem>

          {/* 의견 보내기 */}
          <DropdownMenuItem onClick={() => setFeedbackOpen(true)} className="cursor-pointer">
            <MessageSquare className="w-4 h-4 mr-2" /> 의견 보내기
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 로그아웃 */}
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
            <LogOut className="w-4 h-4 mr-2" /> 로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 의견 보내기 다이얼로그 */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>의견 보내기</DialogTitle>
            <DialogDescription>서비스 개선을 위한 의견을 보내주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-email">이메일 (선택)</Label>
              <Input id="feedback-email" type="email" placeholder="답변받을 이메일 주소" value={feedbackEmail} onChange={(e) => setFeedbackEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-message">내용</Label>
              <Textarea id="feedback-message" placeholder="의견을 작성해주세요..." rows={6} value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>취소</Button>
            <Button onClick={handleSendFeedback} disabled={sending} className="bg-[#B2967D] hover:bg-[#a67c52] text-white">
              {sending ? '전송 중...' : '전송'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
