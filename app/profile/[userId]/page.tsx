'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Profile, Document } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { User, FileText, Heart, MessageCircle, Edit, Users, Eye, Clock, ThumbsUp } from 'lucide-react'
import { SubscribeButton } from '@/components/subscribe-button'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'

export default function ProfilePage() {
  const params = useParams()
  const userId = params.userId as string
  const { user: currentUser } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [likedDocs, setLikedDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')

  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      // 1. 프로필 정보 가져오기
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)
      setUsername(profileData.username || '')

      // 2. 작가면 업로드한 문서 가져오기
      if (profileData.role === 'author') {
        const { data: docsData } = await supabase
          .from('documents')
          .select('*')
          .eq('author_id', userId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        setDocuments(docsData || [])
      }

      // 3. 독자면 좋아한 문서 가져오기
      if (profileData.role === 'reader') {
        const { data: reactions } = await supabase
          .from('document_reactions')
          .select('document_id')
          .eq('user_id', userId)
          .eq('reaction_type', 'like')

        if (reactions && reactions.length > 0) {
          const docIds = reactions.map(r => r.document_id)
          const { data: likedDocsData } = await supabase
            .from('documents')
            .select('*')
            .in('id', docIds)

          setLikedDocs(likedDocsData || [])
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!currentUser || !username.trim()) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', currentUser.id)

      if (error) throw error

      alert('프로필이 업데이트되었습니다!')
      setEditing(false)
      loadProfile()
    } catch (err) {
      console.error('Error updating profile:', err)
      alert('프로필 업데이트에 실패했습니다.')
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{getCategoryIcon(doc.category)}</span>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
            {getCategoryLabel(doc.category)}
          </span>
        </div>
        <CardTitle className="line-clamp-2">{doc.title}</CardTitle>
        <CardDescription className="line-clamp-3">
          {doc.description || '설명이 없습니다'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-4 h-4" />
            {doc.likes_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {doc.view_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {Math.floor(doc.total_reading_time / 60)}분
          </span>
        </div>
        <Link href={`/read/${doc.id}`}>
          <Button className="w-full">읽기</Button>
        </Link>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>프로필을 찾을 수 없습니다</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/home')}>홈으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/home">
              <h1 className="text-2xl font-bold text-blue-600">Textry</h1>
            </Link>
            <div className="flex gap-4">
              <Link href="/browse">
                <Button variant="ghost">둘러보기</Button>
              </Link>
              {currentUser && (
                <Button variant="ghost" onClick={() => {
                  supabase.auth.signOut()
                  router.push('/')
                }}>
                  로그아웃
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* 프로필 정보 */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              {/* 프로필 아바타 */}
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
                {(profile.username || profile.email)[0].toUpperCase()}
              </div>

              {/* 프로필 정보 */}
              <div className="flex-1">
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">사용자 이름</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="사용자 이름을 입력하세요"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateProfile}>저장</Button>
                      <Button variant="outline" onClick={() => {
                        setEditing(false)
                        setUsername(profile.username || '')
                      }}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">
                        {profile.username || profile.email}
                      </h2>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        profile.role === 'author' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {profile.role === 'author' ? '작가' : '독자'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{profile.email}</p>
                    
                    {profile.role === 'author' && (
                      <div className="flex items-center gap-4 mb-4">
                        <span className="flex items-center gap-2 text-gray-600">
                          <Users className="w-5 h-5" />
                          구독자 {profile.subscribers_count}명
                        </span>
                        <span className="flex items-center gap-2 text-gray-600">
                          <FileText className="w-5 h-5" />
                          문서 {documents.length}개
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {isOwnProfile ? (
                        <Button onClick={() => setEditing(true)} className="gap-2">
                          <Edit className="w-4 h-4" />
                          프로필 편집
                        </Button>
                      ) : (
                        profile.role === 'author' && (
                          <SubscribeButton 
                            authorId={profile.id}
                            authorName={profile.username || profile.email}
                            initialSubscribersCount={profile.subscribers_count}
                          />
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 작가: 업로드한 문서 */}
        {profile.role === 'author' && (
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              업로드한 문서 ({documents.length})
            </h3>
            {documents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">아직 업로드한 문서가 없습니다</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 독자: 좋아한 문서 */}
        {profile.role === 'reader' && (
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Heart className="w-6 h-6" />
              좋아한 문서 ({likedDocs.length})
            </h3>
            {likedDocs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">아직 좋아한 문서가 없습니다</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {likedDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}