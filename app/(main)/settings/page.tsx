'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { MainHeader } from '@/components/main-header'
import { Camera } from 'lucide-react'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState(profile?.username || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 필터 상태 (MainHeader용)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로그인이 필요합니다.</p>
      </div>
    )
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploading(true)

    try {
      // 파일명 생성 (user_id/timestamp.확장자)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // 기존 아바타 삭제 (있으면)
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('avatars').remove([oldPath])
      }

      // 새 이미지 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // DB 업데이트
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (dbError) throw dbError

      setAvatarUrl(publicUrl)
      alert('프로필 이미지가 업로드되었습니다!')

      // 페이지 새로고침하여 변경사항 반영
      window.location.reload()
    } catch (err) {
      console.error('Upload error:', err)
      alert('업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveUsername = async () => {
    if (!user) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username })
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
      <MainHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        category={category}
        onCategoryChange={setCategory}
        language={language}
        onLanguageChange={setLanguage}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">설정</h1>
            <p className="text-gray-600">프로필 및 계정 설정을 관리하세요</p>
          </div>

          {/* 프로필 이미지 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>프로필 이미지</CardTitle>
              <CardDescription>프로필 사진을 변경할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {/* 현재 아바타 */}
                {avatarUrl ? (
  <img
    src={avatarUrl}
    alt="프로필 이미지"
    className="w-24 h-24 rounded-full object-cover"
  />
) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-4xl font-bold">
                    {(profile?.username || profile?.email || 'U')[0].toUpperCase()}
                  </div>
                )}

                {/* 업로드 버튼 */}
                <div>
                  <Input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Label htmlFor="profile-image">
                    <Button variant="outline" asChild disabled={uploading}>
                      <span className="cursor-pointer">
                        <Camera className="w-4 h-4 mr-2" />
                        {uploading ? '업로드 중...' : '이미지 변경'}
                      </span>
                    </Button>
                  </Label>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG, GIF (최대 5MB)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 사용자 이름 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>사용자 이름</CardTitle>
              <CardDescription>다른 사용자에게 표시될 이름입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">사용자 이름</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="사용자 이름"
                  />
                </div>
                <Button onClick={handleSaveUsername} disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </Button>
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
                  <p className="font-medium">
                    {profile?.role === 'author' ? '작가' : '독자'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}