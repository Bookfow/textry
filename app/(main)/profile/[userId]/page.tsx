'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, ThumbsUp, BookOpen as ReadIcon, FileText, Users, Clock, Calendar, Crown, Award, Share2, Camera, ImagePlus, Pencil, CheckCircle, Flame, BookCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { SubscribeButton } from '@/components/subscribe-button'
import { Button } from '@/components/ui/button'
import { ProfileSkeleton } from '@/components/loading-skeleton'
import { useToast } from '@/components/toast'

type TabType = 'documents' | 'about'

export default function AuthorPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const authorId = params.userId as string

  const [author, setAuthor] = useState<(Profile & { bio?: string; banner_url?: string }) | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('documents')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'likes'>('recent')
  const [totalReadingTime, setTotalReadingTime] = useState(0)
  const [totalViews, setTotalViews] = useState(0)
  const [readingStats, setReadingStats] = useState({ totalRead: 0, totalTime: 0, streak: 0, completed: 0 })
  const [recentReading, setRecentReading] = useState<any[]>([])
  const [followingCount, setFollowingCount] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const isMyProfile = user?.id === authorId

  useEffect(() => {
    loadAuthorData()
  }, [authorId])

  const loadAuthorData = async () => {
    try {
      const { data: authorData, error: authorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authorId)
        .single()
      if (authorError) throw authorError
      setAuthor(authorData)

      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', authorId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (docsError) throw docsError
      setDocuments(docs || [])

      const views = docs?.reduce((s, d) => s + d.view_count, 0) || 0
      const time = docs?.reduce((s, d) => s + d.total_reading_time, 0) || 0
      setTotalViews(views)
      setTotalReadingTime(time)
      // 독서 통계
      const { data: sessions } = await supabase
        .from('reading_sessions')
        .select('document_id, current_page, last_read_at, completed')
        .eq('reader_id', authorId)

      if (sessions) {
        const uniqueDocs = new Set(sessions.map(s => s.document_id))
        const completedDocs = sessions.filter(s => s.completed).map(s => s.document_id)
        const uniqueCompleted = new Set(completedDocs)
        
        // 연속 읽기 일수 계산
        const readDates = [...new Set(sessions.map(s => new Date(s.last_read_at).toDateString()))].sort().reverse()
        let streak = 0
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        if (readDates[0] === today || readDates[0] === yesterday) {
          streak = 1
          for (let i = 1; i < readDates.length; i++) {
            const diff = new Date(readDates[i - 1]).getTime() - new Date(readDates[i]).getTime()
            if (diff <= 86400000 * 1.5) streak++
            else break
          }
        }

        setReadingStats({
          totalRead: uniqueDocs.size,
          totalTime: time,
          streak,
          completed: uniqueCompleted.size
        })

        // 최근 읽은 문서
        const recentSessions = sessions
          .filter(s => !s.completed)
          .sort((a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime())
          .slice(0, 6)

        if (recentSessions.length > 0) {
          const recentDocIds = [...new Set(recentSessions.map(s => s.document_id))]
          const { data: recentDocs } = await supabase
            .from('documents')
            .select('id, title, thumbnail_url')
            .in('id', recentDocIds)
          setRecentReading(recentDocs || [])
        }
      }

      // 팔로잉 수
      const { count: followCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscriber_id', authorId)
      setFollowingCount(followCount || 0)
    } catch (err) {
      console.error('Error loading author data:', err)
    } finally {
      setLoading(false)
    }
  }

  const sortedDocuments = [...documents].sort((a, b) => {
    switch (sortBy) {
      case 'popular': return b.view_count - a.view_count
      case 'likes': return b.likes_count - a.likes_count
      case 'recent': default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: `${author?.username || '작가'} - Textry`, url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('링크가 복사되었습니다!')
    }
  }

  const isPremium = author?.is_premium && author?.premium_expires_at
    ? new Date(author.premium_expires_at) > new Date()
    : false

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Link href={`/document/${doc.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-xl overflow-hidden mb-3">
          {doc.thumbnail_url ? (
            <Image src={doc.thumbnail_url} alt={doc.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 200px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><div className="text-6xl opacity-20">📄</div></div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <ReadIcon className="w-6 h-6 text-black" />
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
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">{doc.title}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{doc.description || '설명이 없습니다'}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count.toLocaleString()}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{doc.likes_count.toLocaleString()}</span>
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  )

  if (loading) {
    return <ProfileSkeleton />
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">작가를 찾을 수 없습니다</p>
          <button onClick={() => router.push('/home')} className="text-blue-600 hover:underline">홈으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* ━━━ 배너 ━━━ */}
      <div className="px-4 md:px-6 lg:px-8 pt-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="relative h-28 sm:h-36 md:h-44 rounded-xl overflow-hidden">
          {author.banner_url ? (
              <Image src={author.banner_url} alt="배너" fill className="object-cover" sizes="100vw" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900" />
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="absolute top-0 right-1/4 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl" />
                
                </>
            )}
            {isMyProfile && (
              <label className="absolute bottom-2 right-2 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !user) return
                  if (file.size > 10 * 1024 * 1024) { toast.error('10MB 이하만 가능합니다'); return }
                  setUploadingBanner(true)
                  try {
                    const ext = file.name.split('.').pop()
                    const path = `${user.id}/banner_${Date.now()}.${ext}`
                    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: false })
                    if (upErr) throw upErr
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
                    await supabase.from('profiles').update({ banner_url: urlData.publicUrl }).eq('id', user.id)
                    setAuthor(prev => prev ? { ...prev, banner_url: urlData.publicUrl } : prev)
                    toast.success('배너가 변경되었습니다!')
                  } catch { toast.error('업로드 실패') }
                  finally { setUploadingBanner(false) }
                }} />
                <span className="flex items-center gap-1 px-2.5 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs rounded-lg backdrop-blur-sm transition-colors">
                  <ImagePlus className="w-3.5 h-3.5" />
                  {uploadingBanner ? '...' : '배너 변경'}
                </span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ 프로필 영역 ━━━ */}
      <div className="px-4 md:px-6 lg:px-8 pt-4 pb-2">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-start gap-4 md:gap-5">
            {/* 아바타 */}
            <div className="relative flex-shrink-0">
              {author.avatar_url ? (
                <Image src={author.avatar_url} alt={author.username || ''} width={80} height={80} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-2xl md:text-3xl font-bold">
                  {(author.username || author.email)[0].toUpperCase()}
                </div>
              )}
              {isMyProfile && (
                <label className="absolute -bottom-1 -right-1 cursor-pointer z-10">
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !user) return
                    if (file.size > 5 * 1024 * 1024) { toast.error('5MB 이하만 가능합니다'); return }
                    setUploading(true)
                    try {
                      const ext = file.name.split('.').pop()
                      const path = `${user.id}/${Date.now()}.${ext}`
                      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: false })
                      if (upErr) throw upErr
                      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
                      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id)
                      setAuthor(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev)
                      toast.success('프로필 사진이 변경되었습니다!')
                    } catch { toast.error('업로드 실패') }
                    finally { setUploading(false) }
                  }} />
                  <span className="flex items-center justify-center w-7 h-7 bg-[#B2967D] hover:bg-[#a67c52] text-white rounded-full shadow-md transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                  </span>
                </label>
              )}
              {(author.author_tier || 0) >= 1 && (
                <div className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-950 ${
                  author.author_tier === 2 ? 'bg-purple-500' : 'bg-blue-500'
                }`}>
                  <Award className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* 이름 + 메타 + 구독 */}
            <div className="flex-1 min-w-0">
              {/* 이름 줄 */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{author.username || author.email}</h1>
                {isEditing ? (
                  <input value={editUsername} onChange={e => setEditUsername(e.target.value)} className="text-xl md:text-2xl font-bold bg-transparent border-b-2 border-[#B2967D] outline-none text-[#2D2016] dark:text-[#EEE4E1] w-full max-w-[200px]" />
                ) : (
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{author.username || author.email}</h1>
                )}
                {isPremium && (
                  <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-medium flex items-center gap-0.5">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
                {(author.author_tier || 0) >= 1 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    author.author_tier === 2 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {author.author_tier === 2 ? '프로 작가' : '파트너 작가'}
                  </span>
                )}
              </div>

              {/* 메타 정보 — 한 줄 */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>@{author.username || author.email.split('@')[0]}</span>
                <span>·</span>
                <span>구독자 {author.subscribers_count?.toLocaleString() || 0}명</span>
                <span>·</span>
                <span>문서 {documents.length}개</span>
                <span>·</span>
                <span>팔로잉 {followingCount}명</span>
              </div>

              {/* 소개 (짧게) */}
              {isEditing ? (
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={300} rows={2}
                  placeholder="자기소개를 입력하세요"
                  className="text-sm mt-1.5 w-full max-w-2xl bg-transparent border border-[#E7D8C9] dark:border-[#3A302A] rounded-lg px-2 py-1 outline-none focus:border-[#B2967D] text-[#2D2016] dark:text-[#EEE4E1] resize-none" />
              ) : author.bio ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2 max-w-2xl">{author.bio}</p>
              ) : isMyProfile ? (
                <p className="text-sm text-[#9C8B7A] mt-1.5 cursor-pointer hover:text-[#B2967D]" onClick={() => { setIsEditing(true); setEditUsername(author.username || ''); setEditBio('') }}>+ 소개글을 추가하세요</p>
              ) : null}

              {/* 구독 + 공유 버튼 */}
              <div className="flex items-center gap-2 mt-3">
                {user && user.id !== authorId && (
                  <SubscribeButton
                    authorId={authorId}
                    authorName={author.username || author.email}
                    initialSubscribersCount={author.subscribers_count || 0}
                  />
                )}
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-1 rounded-full">
                  <Share2 className="w-4 h-4" /> 공유
                </Button>
                {isMyProfile && !isEditing && (
                  <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setEditUsername(author.username || ''); setEditBio(author.bio || '') }} className="gap-1 rounded-full border-[#E7D8C9] dark:border-[#3A302A]">
                    <Pencil className="w-3.5 h-3.5" /> 편집
                  </Button>
                )}
                {isMyProfile && isEditing && (
                  <Button size="sm" onClick={async () => {
                    try {
                      await supabase.from('profiles').update({ username: editUsername, bio: editBio }).eq('id', user!.id)
                      setAuthor(prev => prev ? { ...prev, username: editUsername, bio: editBio } : prev)
                      setIsEditing(false)
                      toast.success('프로필이 수정되었습니다!')
                    } catch { toast.error('수정 실패') }
                  }} className="gap-1 rounded-full bg-[#B2967D] hover:bg-[#a67c52] text-white">
                    <CheckCircle className="w-3.5 h-3.5" /> 저장
                  </Button>
                )}
```

저장 후 배포:
```
cd C:\Users\user\textry && git add . && git commit -m "feat: 프로필 독서통계+편집+배너변경+팔로잉 표시, 설정 간소화" && git push
              </div>
            </div>
          </div>
        </div>
      </div>
{/* ━━━ 독서 통계 ━━━ */}
<div className="px-4 md:px-6 lg:px-8 py-3">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-[#EEE4E1]/60 dark:bg-[#2E2620] rounded-xl p-3 text-center">
              <ReadIcon className="w-4 h-4 text-[#B2967D] mx-auto mb-1" />
              <p className="text-lg sm:text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">{readingStats.totalRead}</p>
              <p className="text-[10px] sm:text-xs text-[#9C8B7A]">읽은 문서</p>
            </div>
            <div className="bg-[#EEE4E1]/60 dark:bg-[#2E2620] rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-[#B2967D] mx-auto mb-1" />
              <p className="text-lg sm:text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">
                {readingStats.totalTime >= 3600 ? `${Math.floor(readingStats.totalTime / 3600)}h` : `${Math.floor(readingStats.totalTime / 60)}m`}
              </p>
              <p className="text-[10px] sm:text-xs text-[#9C8B7A]">읽기 시간</p>
            </div>
            <div className="bg-[#EEE4E1]/60 dark:bg-[#2E2620] rounded-xl p-3 text-center">
              <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-lg sm:text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">{readingStats.streak}</p>
              <p className="text-[10px] sm:text-xs text-[#9C8B7A]">연속일</p>
            </div>
            <div className="bg-[#EEE4E1]/60 dark:bg-[#2E2620] rounded-xl p-3 text-center">
              <BookCheck className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-lg sm:text-xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">{readingStats.completed}</p>
              <p className="text-[10px] sm:text-xs text-[#9C8B7A]">완독</p>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ 탭 ━━━ */}
      {/* ━━━ 탭 ━━━ */}
      <div className="px-4 md:px-6 lg:px-8 sticky top-0 z-20 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex gap-0 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              문서
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'about' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              정보
            </button>
          </div>
        </div>
      </div>

      {/* ━━━ 콘텐츠 ━━━ */}
      <div className="px-4 md:px-6 lg:px-8 py-6">
        <div className="max-w-[1400px] mx-auto">
          {/* 문서 탭 */}
          {activeTab === 'documents' && (
            <>
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">총 {documents.length}개</p>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                  className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-200">
                  <option value="recent">최신순</option>
                  <option value="popular">조회수순</option>
                  <option value="likes">좋아요순</option>
                </select>
              </div>
              {documents.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">아직 업로드한 문서가 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {sortedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
                </div>
              )}
            </>
          )}

          {/* 정보 탭 */}
          {activeTab === 'about' && (
            <div className="max-w-2xl">
              <div className="space-y-6">
                {author.bio && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">소개</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{author.bio}</p>
                  </div>
                )}

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">통계</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">총 문서</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{(author.subscribers_count || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">구독자</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalViews.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">총 조회수</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Math.floor(totalReadingTime / 3600) > 0
                          ? `${Math.floor(totalReadingTime / 3600)}시간`
                          : `${Math.floor(totalReadingTime / 60)}분`
                        }
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">총 읽기 시간</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">정보</h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> 가입일: {new Date(author.created_at).toLocaleDateString()}</p>
                    <p className="flex items-center gap-2"><Eye className="w-4 h-4" /> 총 조회수: {totalViews.toLocaleString()}회</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
