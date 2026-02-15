'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, ImagePlus, Crown, Sun, Moon, Monitor, Lock, Trash2 } from 'lucide-react'
import { useToast } from '@/components/toast'
import { useTheme } from '@/lib/theme-context'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [saving, setSaving] = useState(false)

  // 비밀번호 변경
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // 계정 삭제
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setAvatarUrl(profile.avatar_url || '')
      setBio((profile as any).bio || '')
      setBannerUrl((profile as any).banner_url || '')
    }
  }, [profile])

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.warning('파일 크기는 5MB 이하여야 합니다.'); return }
    if (!file.type.startsWith('image/')) { toast.warning('이미지 파일만 업로드 가능합니다.'); return }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('avatars').remove([oldPath])
      }

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const { error: dbError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id)
      if (dbError) throw dbError

      setAvatarUrl(urlData.publicUrl)
      await refreshProfile()
      toast.success('프로필 이미지가 업로드되었습니다!')
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.warning('배너 크기는 10MB 이하여야 합니다.'); return }
    if (!file.type.startsWith('image/')) { toast.warning('이미지 파일만 업로드 가능합니다.'); return }

    setUploadingBanner(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/banner_${Date.now()}.${fileExt}`

      if (bannerUrl) {
        const oldPath = bannerUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('avatars').remove([oldPath])
      }

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const { error: dbError } = await supabase.from('profiles').update({ banner_url: urlData.publicUrl }).eq('id', user.id)
      if (dbError) throw dbError

      setBannerUrl(urlData.publicUrl)
      await refreshProfile()
      toast.success('배너 이미지가 업로드되었습니다!')
    } catch (err) {
      console.error('Banner upload error:', err)
      toast.error('업로드에 실패했습니다.')
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username, bio })
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('저장되었습니다!')
    } catch (err) {
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다.'
    if (!/[0-9]/.test(pw)) return '숫자를 1개 이상 포함해야 합니다.'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) return '특수문자를 1개 이상 포함해야 합니다.'
    return null
  }

  const passwordError = newPassword ? validatePassword(newPassword) : null

  const handleChangePassword = async () => {
    const pwError = validatePassword(newPassword)
    if (pwError) {
      toast.warning(pwError)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.warning('비밀번호가 일치하지 않습니다.')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('비밀번호가 변경되었습니다!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Password change error:', err)
      toast.error(err.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== '삭제합니다') {
      toast.warning('"삭제합니다"를 정확히 입력해주세요.')
      return
    }

    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setDeletingAccount(true)
    try {
      const { data: docs } = await supabase
        .from('documents')
        .select('file_path, thumbnail_url')
        .eq('author_id', user.id)

      if (docs && docs.length > 0) {
        const filePaths = docs.map(d => d.file_path).filter(Boolean)
        if (filePaths.length > 0) {
          await supabase.storage.from('documents').remove(filePaths)
        }

        const thumbPaths = docs
          .map(d => d.thumbnail_url)
          .filter(Boolean)
          .map(url => {
            const parts = url.split('/thumbnails/')
            return parts.length > 1 ? parts[1] : null
          })
          .filter(Boolean) as string[]
        if (thumbPaths.length > 0) {
          await supabase.storage.from('thumbnails').remove(thumbPaths)
        }
      }

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
      console.error('Account deletion error:', err)
      toast.error(err.message || '계정 삭제에 실패했습니다.')
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">설정</h1>
            <p className="text-gray-600 dark:text-gray-400">프로필 및 계정 설정을 관리하세요</p>
          </div>

          {/* 배너 이미지 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>배너 이미지</CardTitle>
              <CardDescription>채널 상단에 표시될 배너 이미지입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative w-full aspect-[4/1] bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl overflow-hidden">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="배너" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/50">
                      <ImagePlus className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div>
                  <Input id="banner-image" type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={uploadingBanner} />
                  <Label htmlFor="banner-image">
                    <Button variant="outline" asChild disabled={uploadingBanner}>
                      <span className="cursor-pointer">
                        <ImagePlus className="w-4 h-4 mr-2" />
                        {uploadingBanner ? '업로드 중...' : '배너 변경'}
                      </span>
                    </Button>
                  </Label>
                  <p className="text-xs text-gray-500 mt-2">권장: 1200x300px (4:1 비율), 최대 10MB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 프로필 이미지 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>프로필 이미지</CardTitle>
              <CardDescription>프로필 사진을 변경할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="프로필" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-4xl font-bold">
                    {(profile?.username || profile?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <Input id="profile-image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  <Label htmlFor="profile-image">
                    <Button variant="outline" asChild disabled={uploading}>
                      <span className="cursor-pointer">
                        <Camera className="w-4 h-4 mr-2" />
                        {uploading ? '업로드 중...' : '이미지 변경'}
                      </span>
                    </Button>
                  </Label>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG, GIF (최대 5MB)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 사용자 이름 + 자기소개 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>다른 사용자에게 표시될 정보입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">사용자 이름</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="사용자 이름" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">자기소개</Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="자신을 소개해주세요 (최대 300자)"
                    maxLength={300}
                    rows={3}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right">{bio.length}/300</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 비밀번호 변경 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                비밀번호 변경
              </CardTitle>
              <CardDescription>계정 비밀번호를 변경합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">새 비밀번호</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="최소 8자, 숫자·특수문자 포함"
                  />
                  {newPassword && (() => {
                    const hasLength = newPassword.length >= 8
                    const hasNumber = /[0-9]/.test(newPassword)
                    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)
                    return (
                      <div className="space-y-1">
                        <p className={`text-xs ${hasLength ? 'text-green-500' : 'text-gray-400'}`}>
                          {hasLength ? '✓' : '○'} 8자 이상
                        </p>
                        <p className={`text-xs ${hasNumber ? 'text-green-500' : 'text-gray-400'}`}>
                          {hasNumber ? '✓' : '○'} 숫자 포함
                        </p>
                        <p className={`text-xs ${hasSpecial ? 'text-green-500' : 'text-gray-400'}`}>
                          {hasSpecial ? '✓' : '○'} 특수문자 포함
                        </p>
                      </div>
                    )
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">비밀번호 확인</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !!passwordError || newPassword !== confirmPassword}
                >
                  {changingPassword ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 구독 상태 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>구독 상태</CardTitle>
              <CardDescription>프리미엄 구독 상태를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPremium ? 'bg-amber-100' : 'bg-gray-100'}`}>
                    <Crown className={`w-5 h-5 ${isPremium ? 'text-amber-500' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium">{isPremium ? 'Premium 활성' : 'Free 플랜'}</p>
                    <p className="text-xs text-gray-500">
                      {isPremium && profile?.premium_expires_at
                        ? `만료: ${new Date(profile.premium_expires_at).toLocaleDateString()}`
                        : '광고가 포함된 기본 플랜'}
                    </p>
                  </div>
                </div>
                <Link href="/premium">
                  <Button variant={isPremium ? 'outline' : 'default'} size="sm">
                    {isPremium ? '관리' : '업그레이드'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 테마 설정 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>테마</CardTitle>
              <CardDescription>화면 밝기 모드를 설정합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light' as const, icon: Sun, label: '라이트', desc: '밝은 배경' },
                  { value: 'dark' as const, icon: Moon, label: '다크', desc: '어두운 배경' },
                  { value: 'system' as const, icon: Monitor, label: '시스템', desc: '기기 설정 따르기' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <opt.icon className={`w-6 h-6 ${theme === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${theme === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{opt.label}</span>
                    <span className="text-[11px] text-gray-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 계정 정보 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>계정 정보</CardTitle>
              <CardDescription>변경할 수 없는 계정 정보입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">이메일</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">계정 유형</p>
                  <p className="font-medium">{profile?.role === 'author' ? '작가' : '독자'}</p>
                </div>
                <div>
                  <p className="text-gray-500">작가 Tier</p>
                  <p className="font-medium">
                    {profile?.author_tier === 2 ? '⭐ Tier 2 (프로 작가)' :
                     profile?.author_tier === 1 ? '✓ Tier 1 (파트너 작가)' : 'Tier 0 (일반)'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">가입일</p>
                  <p className="font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 계정 삭제 (위험 영역) */}
          <Card className="mb-6 border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                계정 삭제
              </CardTitle>
              <CardDescription>
                계정을 삭제하면 모든 데이터(업로드한 문서, 댓글, 프로필)가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="text-sm">
                    확인을 위해 <span className="font-bold text-red-600 dark:text-red-400">삭제합니다</span>를 입력하세요
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="삭제합니다"
                    className="border-red-200 dark:border-red-800 focus:ring-red-500"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || deleteConfirm !== '삭제합니다'}
                >
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
