'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Eye, ThumbsUp, FileText, Users, Calendar, Play } from 'lucide-react'
import { SubscribeButton } from '@/components/subscribe-button'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'

export default function ProfilePage() {
  const params = useParams()
  const { user: currentUser } = useAuth()
  const userId = params.userId as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
    loadDocuments()
  }, [userId])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Link href={`/read/${doc.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl opacity-20">📄</div>
          </div>
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-black ml-1" fill="black" />
              </div>
            </div>
          </div>

          <div className="absolute top-2 left-2 flex gap-2">
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
              {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
            </span>
            <span className="text-xl">{getLanguageFlag(doc.language)}</span>
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
            {Math.floor(doc.total_reading_time / 60)}분
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {doc.title}
          </h3>
          
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {doc.likes_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {doc.view_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
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
        <p>프로필을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === userId

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - 사이드바 높이에 맞춤 */}
      <header className="sticky top-0 z-20 bg-white border-b h-[73px] flex items-center px-4 md:px-6">
        <div className="flex-1"></div>
      </header>

      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* 프로필 헤더 */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* 프로필 이미지 */}
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username || profile.email}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-5xl font-bold">
                    {(profile.username || profile.email)[0].toUpperCase()}
                  </div>
                )}

                {/* 프로필 정보 */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{profile.username || profile.email}</h1>
                  <p className="text-gray-600 mb-4">{profile.email}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      구독자 {profile.subscribers_count?.toLocaleString() || 0}명
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      문서 {documents.length}개
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      가입일 {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  {!isOwnProfile && currentUser && (
                    <SubscribeButton 
                      authorId={userId}
                      authorName={profile.username || profile.email}
                      initialSubscribersCount={profile.subscribers_count || 0}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 최근 문서 */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">최근 업로드</h2>
              {documents.length > 0 && (
                <Link href={`/author/${userId}`} className="text-blue-600 hover:underline text-sm">
                  전체 보기
                </Link>
              )}
            </div>

            {documents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">아직 업로드한 문서가 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}