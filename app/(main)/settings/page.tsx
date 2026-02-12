'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, ImagePlus, Crown, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [saving, setSaving] = useState(false)

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
    if (file.size > 5 * 1024 * 1024) { alert('파일 크기는 5MB 이하여야 합니다.'); return }
    if (!file.type.startsWith('image/')) { alert('이미지 파일만 업로드 가능합니다.'); return }

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
      alert('프로필 이미지가 업로드되었습니다!')
      window.location.reload()
    } catch (err) {
      console.error('Upload error:', err)
      alert('업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('배너 크기는 10MB 이하여야 합니다.'); return }
    if (!file.type.startsWith('image/')) { alert('이미지 파일만 업로드 가능합니다.'); return }

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
      alert('배너 이미지가 업로드되었습니다!')
      window.location.reload()
    } catch (err) {
      console.error('Banner upload error:', err)
      alert('업로드에 실패했습니다.')
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
      alert('저장되었습니다!')
      window.location.reload()
    } catch (err) {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">설정</h1>
            <p className="text-gray-600">프로필 및 계정 설정을 관리하세요</p>
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
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right">{bio.length}/300</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
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
                        ? `만료: ${new Date(profile.premium_expires_at).toLocaleDateString('ko-KR')}`
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
          <Card>
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
                  <p className="font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR') : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
