'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Document, Profile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import Image from 'next/image'
import {
  Eye, ThumbsUp, BookOpen as ReadIcon, FileText, Users, Clock, Calendar, Crown, Award, Share2,
  Camera, ImagePlus, Pencil, CheckCircle, Flame, BookCheck,
  Plus, Trash2, ChevronUp, ChevronDown, X
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { SubscribeButton } from '@/components/subscribe-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProfileSkeleton } from '@/components/loading-skeleton'
import { useToast } from '@/components/toast'

type TabType = 'documents' | 'series' | 'about'

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

  // 독서 통계
  const [readingStats, setReadingStats] = useState({ totalRead: 0, totalTime: 0, streak: 0, completed: 0 })
  const [recentReading, setRecentReading] = useState<any[]>([])
  const [followingCount, setFollowingCount] = useState(0)

  // 프로필 편집
  const [isEditing, setIsEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // 시리즈
  const [seriesList, setSeriesList] = useState<any[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingSeries, setEditingSeries] = useState<any>(null)
  const [seriesTitle, setSeriesTitle] = useState('')
  const [seriesDescription, setSeriesDescription] = useState('')
  const [savingSeries, setSavingSeries] = useState(false)
  const [managingSeries, setManagingSeries] = useState<any>(null)
  const [seriesDocs, setSeriesDocs] = useState<any[]>([])
  const [showAddDocDialog, setShowAddDocDialog] = useState(false)

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

        // 연속 읽기 일수
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

        setReadingStats({ totalRead: uniqueDocs.size, totalTime: time, streak, completed: uniqueCompleted.size })

        // 최근 읽은 문서
        const recentSessions = sessions
          .filter(s => !s.completed)
          .sort((a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime())
          .slice(0, 6)
        if (recentSessions.length > 0) {
          const recentDocIds = [...new Set(recentSessions.map(s => s.document_id))]
          const { data: recentDocs } = await supabase
            .from('documents').select('id, title, thumbnail_url').in('id', recentDocIds)
          setRecentReading(recentDocs || [])
        }
      }

      // 팔로잉 수
      const { count: followCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscriber_id', authorId)
      setFollowingCount(followCount || 0)

      // 시리즈
      const { data: seriesData } = await supabase
        .from('document_series')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false })
      setSeriesList(seriesData || [])
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

  // ━━━ 시리즈 핸들러 ━━━
  const handleCreateSeries = async () => {
    if (!user || !seriesTitle.trim()) return
    setSavingSeries(true)
    try {
      if (editingSeries) {
        await supabase.from('document_series').update({ title: seriesTitle, description: seriesDescription }).eq('id', editingSeries.id)
      } else {
        await supabase.from('document_series').insert({ author_id: user.id, title: seriesTitle, description: seriesDescription })
      }
      setShowCreateDialog(false); setEditingSeries(null); setSeriesTitle(''); setSeriesDescription('')
      loadAuthorData()
    } catch { toast.error('저장 실패') }
    finally { setSavingSeries(false) }
  }

  const handleDeleteSeries = async (series: any) => {
    if (!confirm(`"${series.title}" 시리즈를 삭제할까요?`)) return
    await supabase.from('series_documents').delete().eq('series_id', series.id)
    await supabase.from('document_series').delete().eq('id', series.id)
    loadAuthorData()
  }

  const loadSeriesDocs = async (series: any) => {
    setManagingSeries(series)
    const { data } = await supabase.from('series_documents').select('*').eq('series_id', series.id).order('position', { ascending: true })
    if (data && data.length > 0) {
      const docIds = data.map((d: any) => d.document_id)
      const { data: docs } = await supabase.from('documents').select('*').in('id', docIds)
      setSeriesDocs(data.map((sd: any) => ({ ...sd, document: docs?.find(d => d.id === sd.document_id) })))
    } else { setSeriesDocs([]) }
  }

  const handleAddDocToSeries = async (docId: string) => {
    if (!managingSeries) return
    const maxPos = seriesDocs.length > 0 ? Math.max(...seriesDocs.map((d: any) => d.position)) + 1 : 0
    try {
      await supabase.from('series_documents').insert({ series_id: managingSeries.id, document_id: docId, position: maxPos })
      await supabase.from('document_series').update({ documents_count: seriesDocs.length + 1 }).eq('id', managingSeries.id)
      setShowAddDocDialog(false); loadSeriesDocs(managingSeries); loadAuthorData()
    } catch (err: any) {
      if (err?.code === '23505') toast.warning('이미 포함된 문서입니다')
      else toast.error('추가 실패')
    }
  }

  const handleRemoveSeriesDoc = async (sdId: string) => {
    if (!managingSeries) return
    await supabase.from('series_documents').delete().eq('id', sdId)
    await supabase.from('document_series').update({ documents_count: Math.max(seriesDocs.length - 1, 0) }).eq('id', managingSeries.id)
    loadSeriesDocs(managingSeries); loadAuthorData()
  }

  const handleMoveSeriesDoc = async (index: number, dir: 'up' | 'down') => {
    const arr = [...seriesDocs]
    const swap = dir === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= arr.length) return
    const tmpPos = arr[index].position; arr[index].position = arr[swap].position; arr[swap].position = tmpPos
    ;[arr[index], arr[swap]] = [arr[swap], arr[index]]
    setSeriesDocs(arr)
    await supabase.from('series_documents').update({ position: arr[index].position }).eq('id', arr[index].id)
    await supabase.from('series_documents').update({ position: arr[swap].position }).eq('id', arr[swap].id)
  }

  const isPremium = author?.is_premium && author?.premium_expires_at
    ? new Date(author.premium_expires_at) > new Date()
    : false

  // ━━━ 문서 카드 ━━━
  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Link href={`/document/${doc.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-xl overflow-hidden mb-3 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          {doc.thumbnail_url ? (
            <Image src={doc.thumbnail_url} alt={doc.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 200px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ReadIcon className="w-10 h-10 text-[#E7D8C9]" />
            </div>
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
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-[#B2967D] transition-colors text-[#2D2016] dark:text-[#EEE4E1]">{doc.title}</h3>
          <p className="text-xs text-[#9C8B7A] line-clamp-2 mb-2">{doc.description || '설명이 없습니다'}</p>
          <div className="flex items-center gap-3 text-xs text-[#9C8B7A]">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count.toLocaleString()}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{doc.likes_count.toLocaleString()}</span>
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  )

  if (loading) return <ProfileSkeleton />

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9C8B7A] mb-4">작가를 찾을 수 없습니다</p>
          <button onClick={() => router.push('/home')} className="text-[#B2967D] hover:underline">홈으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* ━━━ 배너 ━━━ */}
      <div className="px-4 md:px-6 lg:px-8 pt-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="relative h-28 sm:h-36 md:h-44 rounded-xl overflow-hidden">
            {author.banner_url ? (
              <Image src={author.banner_url} alt="배너" fill className="object-cover" sizes="100vw" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-[#5C4A38] via-[#8B7049] to-[#B2967D]" />
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="absolute top-0 right-1/4 w-48 h-48 bg-[#E6BEAE]/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-[#B2967D]/20 rounded-full blur-3xl" />
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
                <Image src={author.avatar_url} alt={author.username || ''} width={80} height={80} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-white dark:ring-[#1A1410]" />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] text-white flex items-center justify-center text-2xl md:text-3xl font-bold ring-2 ring-white dark:ring-[#1A1410]">
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
                <div className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-[#1A1410] ${
                  author.author_tier === 2 ? 'bg-purple-500' : 'bg-[#B2967D]'
                }`}>
                  <Award className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* 이름 + 메타 + 구독 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <input value={editUsername} onChange={e => setEditUsername(e.target.value)}
                    className="text-xl md:text-2xl font-bold bg-transparent border-b-2 border-[#B2967D] outline-none text-[#2D2016] dark:text-[#EEE4E1] w-full max-w-[200px]" />
                ) : (
                  <h1 className="text-xl md:text-2xl font-bold text-[#2D2016] dark:text-[#EEE4E1] truncate">{author.username || author.email}</h1>
                )}
                {isPremium && (
                  <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-medium flex items-center gap-0.5">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
                {(author.author_tier || 0) >= 1 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    author.author_tier === 2 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-[#EEE4E1] dark:bg-[#2E2620] text-[#B2967D]'
                  }`}>
                    {author.author_tier === 2 ? '프로 작가' : '파트너 작가'}
                  </span>
                )}
              </div>

              {/* 메타 */}
              <div className="flex items-center gap-1.5 text-xs text-[#9C8B7A] mt-1 flex-wrap">
                <span>@{author.username || author.email.split('@')[0]}</span>
                <span>·</span>
                <span>구독자 {author.subscribers_count?.toLocaleString() || 0}명</span>
                <span>·</span>
                <span>문서 {documents.length}개</span>
                <span>·</span>
                <span>팔로잉 {followingCount}명</span>
              </div>

              {/* 소개 */}
              {isEditing ? (
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={300} rows={2}
                  placeholder="자기소개를 입력하세요"
                  className="text-sm mt-1.5 w-full max-w-2xl bg-transparent border border-[#E7D8C9] dark:border-[#3A302A] rounded-lg px-2 py-1 outline-none focus:border-[#B2967D] text-[#2D2016] dark:text-[#EEE4E1] resize-none" />
              ) : author.bio ? (
                <p className="text-sm text-[#5C4A38] dark:text-[#C4A882] mt-1.5 line-clamp-2 max-w-2xl">{author.bio}</p>
              ) : isMyProfile ? (
                <p className="text-sm text-[#9C8B7A] mt-1.5 cursor-pointer hover:text-[#B2967D]" onClick={() => { setIsEditing(true); setEditUsername(author.username || ''); setEditBio('') }}>+ 소개글을 추가하세요</p>
              ) : null}

              {/* 버튼 */}
              <div className="flex items-center gap-2 mt-3">
                {user && user.id !== authorId && (
                  <SubscribeButton authorId={authorId} authorName={author.username || author.email} initialSubscribersCount={author.subscribers_count || 0} />
                )}
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-1 rounded-full border-[#E7D8C9] dark:border-[#3A302A] text-[#5C4A38] dark:text-[#C4A882]">
                  <Share2 className="w-4 h-4" /> 공유
                </Button>
                {isMyProfile && !isEditing && (
                  <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setEditUsername(author.username || ''); setEditBio(author.bio || '') }}
                    className="gap-1 rounded-full border-[#E7D8C9] dark:border-[#3A302A] text-[#5C4A38] dark:text-[#C4A882]">
                    <Pencil className="w-3.5 h-3.5" /> 편집
                  </Button>
                )}
                {isMyProfile && isEditing && (
                  <>
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
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-full border-[#E7D8C9] dark:border-[#3A302A]">
                      취소
                    </Button>
                  </>
                )}
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
      <div className="px-4 md:px-6 lg:px-8 sticky top-0 z-20 bg-[#F7F2EF]/80 dark:bg-[#1A1410]/80 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex gap-0 border-b border-[#E7D8C9] dark:border-[#3A302A]">
            <button onClick={() => setActiveTab('documents')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-[#B2967D] text-[#2D2016] dark:text-[#EEE4E1]' : 'border-transparent text-[#9C8B7A] hover:text-[#5C4A38] dark:hover:text-[#C4A882]'}`}>
              문서
            </button>
            {(isMyProfile || seriesList.length > 0) && (
              <button onClick={() => { setActiveTab('series'); setManagingSeries(null) }}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'series' ? 'border-[#B2967D] text-[#2D2016] dark:text-[#EEE4E1]' : 'border-transparent text-[#9C8B7A] hover:text-[#5C4A38] dark:hover:text-[#C4A882]'}`}>
                시리즈 {seriesList.length > 0 && `(${seriesList.length})`}
              </button>
            )}
            <button onClick={() => setActiveTab('about')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'about' ? 'border-[#B2967D] text-[#2D2016] dark:text-[#EEE4E1]' : 'border-transparent text-[#9C8B7A] hover:text-[#5C4A38] dark:hover:text-[#C4A882]'}`}>
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
                <p className="text-sm text-[#9C8B7A]">총 {documents.length}개</p>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                  className="text-sm border border-[#E7D8C9] dark:border-[#3A302A] rounded-lg px-3 py-1.5 bg-white dark:bg-[#241E18] text-[#2D2016] dark:text-[#EEE4E1]">
                  <option value="recent">최신순</option>
                  <option value="popular">조회수순</option>
                  <option value="likes">좋아요순</option>
                </select>
              </div>
              {documents.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="w-12 h-12 text-[#E7D8C9] dark:text-[#3A302A] mx-auto mb-3" />
                  <p className="text-[#9C8B7A]">아직 업로드한 문서가 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {sortedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
                </div>
              )}
            </>
          )}

          {/* 시리즈 탭 */}
          {activeTab === 'series' && (
            <div>
              {isMyProfile && !managingSeries && (
                <div className="flex justify-end mb-4">
                  <Button size="sm" onClick={() => { setShowCreateDialog(true); setEditingSeries(null); setSeriesTitle(''); setSeriesDescription('') }}
                    className="bg-[#B2967D] hover:bg-[#a67c52] text-white">
                    <Plus className="w-4 h-4 mr-1" /> 새 시리즈
                  </Button>
                </div>
              )}

              {!managingSeries ? (
                seriesList.length === 0 ? (
                  <div className="text-center py-16">
                    <ReadIcon className="w-12 h-12 text-[#E7D8C9] dark:text-[#3A302A] mx-auto mb-3" />
                    <p className="text-[#9C8B7A]">아직 시리즈가 없습니다</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {seriesList.map((s: any) => (
                      <div key={s.id} className="bg-white dark:bg-[#241E18] rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] p-4 hover:shadow-md transition-shadow">
                        <h3 className="font-bold text-[#2D2016] dark:text-[#EEE4E1] mb-1">{s.title}</h3>
                        <p className="text-xs text-[#9C8B7A] line-clamp-2 mb-3">{s.description || '설명 없음'}</p>
                        <p className="text-xs text-[#9C8B7A] mb-3">{s.documents_count || 0}개 문서</p>
                        {isMyProfile ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs border-[#E7D8C9] dark:border-[#3A302A]" onClick={() => loadSeriesDocs(s)}>
                              <Pencil className="w-3 h-3 mr-1" /> 문서 관리
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs border-[#E7D8C9] dark:border-[#3A302A]" onClick={() => { setEditingSeries(s); setSeriesTitle(s.title); setSeriesDescription(s.description || ''); setShowCreateDialog(true) }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteSeries(s)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Link href={`/series/${s.id}`}>
                            <Button size="sm" variant="outline" className="w-full text-xs border-[#E7D8C9] dark:border-[#3A302A]">
                              <ReadIcon className="w-3 h-3 mr-1" /> 시리즈 보기
                            </Button>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* 시리즈 문서 관리 */
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Button variant="outline" size="sm" onClick={() => setManagingSeries(null)} className="border-[#E7D8C9] dark:border-[#3A302A]">← 목록</Button>
                    <div>
                      <h3 className="font-bold text-[#2D2016] dark:text-[#EEE4E1]">{managingSeries.title}</h3>
                      <p className="text-xs text-[#9C8B7A]">{seriesDocs.length}개 문서</p>
                    </div>
                    <div className="ml-auto">
                      <Button size="sm" onClick={() => setShowAddDocDialog(true)} className="bg-[#B2967D] hover:bg-[#a67c52] text-white">
                        <Plus className="w-4 h-4 mr-1" /> 문서 추가
                      </Button>
                    </div>
                  </div>

                  {seriesDocs.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-[#9C8B7A] mb-3">시리즈에 문서를 추가하세요</p>
                      <Button size="sm" onClick={() => setShowAddDocDialog(true)} className="bg-[#B2967D] hover:bg-[#a67c52] text-white">문서 추가</Button>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#241E18] rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] overflow-hidden">
                      {seriesDocs.map((sd: any, i: number) => (
                        <div key={sd.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#E7D8C9]/50 dark:border-[#3A302A] last:border-0 hover:bg-[#EEE4E1]/30 dark:hover:bg-[#2E2620]/50">
                          <span className="text-sm font-bold text-[#B2967D] w-6 text-center">{i + 1}</span>
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => handleMoveSeriesDoc(i, 'up')} disabled={i === 0} className="p-0.5 rounded hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] disabled:opacity-20">
                              <ChevronUp className="w-3.5 h-3.5 text-[#9C8B7A]" />
                            </button>
                            <button onClick={() => handleMoveSeriesDoc(i, 'down')} disabled={i === seriesDocs.length - 1} className="p-0.5 rounded hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] disabled:opacity-20">
                              <ChevronDown className="w-3.5 h-3.5 text-[#9C8B7A]" />
                            </button>
                          </div>
                          <div className="relative w-10 h-14 rounded bg-[#EEE4E1] dark:bg-[#2E2620] overflow-hidden flex-shrink-0">
                            {sd.document?.thumbnail_url ? (
                              <Image src={sd.document.thumbnail_url} alt="" fill className="object-cover" sizes="40px" />
                            ) : <div className="w-full h-full flex items-center justify-center"><ReadIcon className="w-4 h-4 text-[#E7D8C9]" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1] truncate">{sd.document?.title || '알 수 없음'}</p>
                            <p className="text-[11px] text-[#9C8B7A]">{sd.document?.view_count?.toLocaleString() || 0}회 조회</p>
                          </div>
                          <button onClick={() => handleRemoveSeriesDoc(sd.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[#9C8B7A] hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 정보 탭 */}
          {activeTab === 'about' && (
            <div className="max-w-2xl">
              <div className="space-y-6">
                {author.bio && (
                  <div className="bg-white dark:bg-[#241E18] rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] p-5">
                    <h3 className="font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-2">소개</h3>
                    <p className="text-sm text-[#5C4A38] dark:text-[#C4A882] whitespace-pre-wrap">{author.bio}</p>
                  </div>
                )}

                <div className="bg-white dark:bg-[#241E18] rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] p-5">
                  <h3 className="font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-3">통계</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#EEE4E1]/50 dark:bg-[#2E2620] rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">{documents.length}</p>
                      <p className="text-xs text-[#9C8B7A] mt-0.5">총 문서</p>
                    </div>
                    <div className="bg-[#EEE4E1]/50 dark:bg-[#2E2620] rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">{(author.subscribers_count || 0).toLocaleString()}</p>
                      <p className="text-xs text-[#9C8B7A] mt-0.5">구독자</p>
                    </div>
                    <div className="bg-[#EEE4E1]/50 dark:bg-[#2E2620] rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">{totalViews.toLocaleString()}</p>
                      <p className="text-xs text-[#9C8B7A] mt-0.5">총 조회수</p>
                    </div>
                    <div className="bg-[#EEE4E1]/50 dark:bg-[#2E2620] rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-[#2D2016] dark:text-[#EEE4E1]">
                        {Math.floor(totalReadingTime / 3600) > 0
                          ? `${Math.floor(totalReadingTime / 3600)}시간`
                          : `${Math.floor(totalReadingTime / 60)}분`}
                      </p>
                      <p className="text-xs text-[#9C8B7A] mt-0.5">총 읽기 시간</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#241E18] rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] p-5">
                  <h3 className="font-semibold text-[#2D2016] dark:text-[#EEE4E1] mb-2">정보</h3>
                  <div className="space-y-2 text-sm text-[#5C4A38] dark:text-[#C4A882]">
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#9C8B7A]" /> 가입일: {new Date(author.created_at).toLocaleDateString()}</p>
                    <p className="flex items-center gap-2"><Eye className="w-4 h-4 text-[#9C8B7A]" /> 총 조회수: {totalViews.toLocaleString()}회</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ━━━ 시리즈 생성/편집 다이얼로그 ━━━ */}
      <Dialog open={showCreateDialog} onOpenChange={() => { setShowCreateDialog(false); setEditingSeries(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSeries ? '시리즈 수정' : '새 시리즈 만들기'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>시리즈 제목</Label>
              <Input value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)} placeholder="예: Next.js 입문 시리즈" />
            </div>
            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <textarea value={seriesDescription} onChange={e => setSeriesDescription(e.target.value)} placeholder="시리즈에 대한 설명" rows={3}
                className="w-full rounded-md border border-[#E7D8C9] dark:border-[#3A302A] dark:bg-[#241E18] dark:text-[#EEE4E1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B2967D] resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingSeries(null) }}>취소</Button>
              <Button onClick={handleCreateSeries} disabled={savingSeries || !seriesTitle.trim()} className="bg-[#B2967D] hover:bg-[#a67c52] text-white">
                {savingSeries ? '저장 중...' : editingSeries ? '수정' : '만들기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ━━━ 문서 추가 다이얼로그 ━━━ */}
      <Dialog open={showAddDocDialog} onOpenChange={setShowAddDocDialog}>
        <DialogContent className="max-h-[80vh]">
          <DialogHeader><DialogTitle>문서 추가</DialogTitle></DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] space-y-2 pt-2">
            {documents.filter(d => !seriesDocs.some((sd: any) => sd.document_id === d.id)).length === 0 ? (
              <p className="text-center text-[#9C8B7A] py-8">추가 가능한 문서가 없습니다</p>
            ) : (
              documents.filter(d => !seriesDocs.some((sd: any) => sd.document_id === d.id)).map(doc => (
                <button key={doc.id} onClick={() => handleAddDocToSeries(doc.id)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] text-left transition-colors">
                  <div className="relative w-10 h-14 rounded bg-[#EEE4E1] dark:bg-[#2E2620] overflow-hidden flex-shrink-0">
                    {doc.thumbnail_url ? <Image src={doc.thumbnail_url} alt="" fill className="object-cover" sizes="40px" /> : <div className="w-full h-full flex items-center justify-center"><ReadIcon className="w-4 h-4 text-[#E7D8C9]" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1] truncate">{doc.title}</p>
                    <p className="text-xs text-[#9C8B7A]">{doc.view_count}회 조회</p>
                  </div>
                  <Plus className="w-4 h-4 text-[#B2967D] flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
