'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Crown, Sun, Moon, Monitor, Lock, Trash2 } from 'lucide-react'
import { useToast } from '@/components/toast'
import { useTheme } from '@/lib/theme-context'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const { toast } = useToast()

  // 비밀번호 변경
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // 계정 삭제
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const { theme, setTheme } = useTheme()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로그인이 필요합니다.</p>
      </div>
    )
  }

  const isPremium = profile?.is_premium && profile?.premium_expires_at
    ? new Date(profile.premium_expires_at) > new Date()
    : false

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다.'
    if (!/[0-9]/.test(pw)) return '숫자를 1개 이상 포함해야 합니다.'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) return '특수문자를 1개 이상 포함해야 합니다.'
    return null
  }

  const passwordError = newPassword ? validatePassword(newPassword) : null

  const handleChangePassword = async () => {
    const pwError = validatePassword(newPassword)
    if (pwError) { toast.warning(pwError); return }
    if (newPassword !== confirmPassword) { toast.warning('비밀번호가 일치하지 않습니다.'); return }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('비밀번호가 변경되었습니다!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== '삭제합니다') { toast.warning('"삭제합니다"를 정확히 입력해주세요.'); return }
    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    setDeletingAccount(true)
    try {
      const { data: docs } = await supabase
        .from('documents').select('file_path, thumbnail_url').eq('author_id', user.id)

      if (docs && docs.length > 0) {
        const filePaths = docs.map(d => d.file_path).filter(Boolean)
        if (filePaths.length > 0) await supabase.storage.from('documents').remove(filePaths)
        const thumbPaths = docs
          .map(d => d.thumbnail_url).filter(Boolean)
          .map(url => { const parts = url.split('/thumbnails/'); return parts.length > 1 ? parts[1] : null })
          .filter(Boolean) as string[]
        if (thumbPaths.length > 0) await supabase.storage.from('thumbnails').remove(thumbPaths)
      }

      const avatarUrl = profile?.avatar_url
      const bannerUrl = (profile as any)?.banner_url
      if (avatarUrl) {
        const path = avatarUrl.split('/avatars/').pop()
        if (path) await supabase.storage.from('avatars').remove([path])
      }
      if (bannerUrl) {
        const path = bannerUrl.split('/avatars/').pop()
        if (path) await supabase.storage.from('avatars').remove([path])
      }

      await supabase.from('documents').delete().eq('author_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.signOut()
      toast.success('계정이 삭제되었습니다.')
      window.location.href = '/'
    } catch (err: any) {
      toast.error(err.message || '계정 삭제에 실패했습니다.')
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-[#2D2016] dark:text-[#EEE4E1]">설정</h1>
            <p className="text-[#9C8B7A]">계정 및 앱 설정을 관리하세요</p>
          </div>

  

          {/* 테마 설정 */}
          <Card className="mb-6 border-[#E7D8C9] dark:border-[#3A302A]">
            <CardHeader>
              <CardTitle className="text-[#2D2016] dark:text-[#EEE4E1]">테마</CardTitle>
              <CardDescription className="text-[#9C8B7A]">화면 밝기 모드를 설정합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light' as const, icon: Sun, label: '라이트' },
                  { value: 'dark' as const, icon: Moon, label: '다크' },
                  { value: 'system' as const, icon: Monitor, label: '시스템' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === opt.value
                        ? 'border-[#B2967D] bg-[#EEE4E1] dark:bg-[#2E2620]'
                        : 'border-[#E7D8C9] dark:border-[#3A302A] hover:border-[#B2967D]/50'
                    }`}
                  >
                    <opt.icon className={`w-6 h-6 ${theme === opt.value ? 'text-[#B2967D]' : 'text-[#9C8B7A]'}`} />
                    <span className={`text-sm font-medium ${theme === opt.value ? 'text-[#B2967D]' : 'text-[#5C4A38] dark:text-[#C4A882]'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 비밀번호 변경 */}
          <Card className="mb-6 border-[#E7D8C9] dark:border-[#3A302A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2D2016] dark:text-[#EEE4E1]">
                <Lock className="w-5 h-5" /> 비밀번호 변경
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">새 비밀번호</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="최소 8자, 숫자·특수문자 포함" />
                  {newPassword && (() => {
                    const hasLength = newPassword.length >= 8
                    const hasNumber = /[0-9]/.test(newPassword)
                    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)
                    return (
                      <div className="space-y-1">
                        <p className={`text-xs ${hasLength ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasLength ? '✓' : '○'} 8자 이상</p>
                        <p className={`text-xs ${hasNumber ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasNumber ? '✓' : '○'} 숫자 포함</p>
                        <p className={`text-xs ${hasSpecial ? 'text-green-500' : 'text-[#9C8B7A]'}`}>{hasSpecial ? '✓' : '○'} 특수문자 포함</p>
                      </div>
                    )
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">비밀번호 확인</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호를 다시 입력하세요" />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || !!passwordError || newPassword !== confirmPassword}
                  className="bg-[#B2967D] hover:bg-[#a67c52] text-white">
                  {changingPassword ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 구독 상태 */}
          <Card className="mb-6 border-[#E7D8C9] dark:border-[#3A302A]">
            <CardHeader>
              <CardTitle className="text-[#2D2016] dark:text-[#EEE4E1]">구독 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPremium ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-[#EEE4E1] dark:bg-[#2E2620]'}`}>
                    <Crown className={`w-5 h-5 ${isPremium ? 'text-amber-500' : 'text-[#9C8B7A]'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-[#2D2016] dark:text-[#EEE4E1]">{isPremium ? 'Premium 활성' : 'Free 플랜'}</p>
                    <p className="text-xs text-[#9C8B7A]">
                      {isPremium && profile?.premium_expires_at
                        ? `만료: ${new Date(profile.premium_expires_at).toLocaleDateString()}`
                        : '광고가 포함된 기본 플랜'}
                    </p>
                  </div>
                </div>
                <Link href="/premium">
                  <Button variant={isPremium ? 'outline' : 'default'} size="sm" className={isPremium ? '' : 'bg-[#B2967D] hover:bg-[#a67c52] text-white'}>
                    {isPremium ? '관리' : '업그레이드'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 계정 정보 */}
          <Card className="mb-6 border-[#E7D8C9] dark:border-[#3A302A]">
            <CardHeader>
              <CardTitle className="text-[#2D2016] dark:text-[#EEE4E1]">계정 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[#9C8B7A]">이메일</p>
                  <p className="font-medium text-[#2D2016] dark:text-[#EEE4E1]">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-[#9C8B7A]">계정 유형</p>
                  <p className="font-medium text-[#2D2016] dark:text-[#EEE4E1]">{profile?.role === 'author' ? '큐레이터' : '독자'}</p>
                </div>
                <div>
                  <p className="text-[#9C8B7A]">가입일</p>
                  <p className="font-medium text-[#2D2016] dark:text-[#EEE4E1]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 계정 삭제 */}
          <Card className="mb-6 border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" /> 계정 삭제
              </CardTitle>
              <CardDescription>계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="text-sm">
                    확인을 위해 <span className="font-bold text-red-600 dark:text-red-400">삭제합니다</span>를 입력하세요
                  </Label>
                  <Input id="delete-confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="삭제합니다" className="border-red-200 dark:border-red-800" />
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount || deleteConfirm !== '삭제합니다'}>
                  {deletingAccount ? '삭제 중...' : '계정 영구 삭제'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
