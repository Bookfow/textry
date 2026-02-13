'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, Document } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import {
  DollarSign, Eye, Clock, FileText, Users, Trash2, Play,
  Image as ImageIcon, TrendingUp, Award, ChevronRight,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus, Shield,
  CreditCard, AlertCircle, Pencil,
} from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type TabType = 'overview' | 'content' | 'analytics' | 'revenue'

type RevenueRecord = {
  month: string
  ad_impressions_count: number
  ad_author_share: number
  premium_reading_minutes: number
  premium_author_share: number
  total_author_revenue: number
  status: string
}

type AuthorTier = {
  tier: number
  revenue_share: number
  total_reading_hours_12m: number
  account_age_days: number
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState({
    totalViews: 0,
    totalReadingTime: 0,
    totalRevenue: 0,
    subscribersCount: 0,
    documentsCount: 0,
    // 이번 달 vs 지난 달 비교
    viewsChange: 0,
    readingTimeChange: 0,
    revenueChange: 0,
    subscribersChange: 0,
  })
  const [authorTier, setAuthorTier] = useState<AuthorTier | null>(null)
  const [revenueRecords, setRevenueRecords] = useState<RevenueRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editingThumbnail, setEditingThumbnail] = useState<string | null>(null)
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [editingDescription, setEditingDescription] = useState<string | null>(null)
  const [newDescription, setNewDescription] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)
  const [sortBy, setSortBy] = useState<'views' | 'time' | 'revenue' | 'date'>('date')

  useEffect(() => {
    if (user) loadDashboard()
  }, [user])

  const loadDashboard = async () => {
    if (!user) return
    try {
      // 문서 로드
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
      setDocuments(docs || [])

      const totalViews = docs?.reduce((sum, doc) => sum + doc.view_count, 0) || 0
      const totalReadingTime = docs?.reduce((sum, doc) => sum + doc.total_reading_time, 0) || 0

      // 구독자 수
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('author_id', user.id)
      const subscribersCount = subs?.length || 0

      // Tier 정보
      const { data: tierData } = await supabase
        .from('author_tiers')
        .select('*')
        .eq('author_id', user.id)
        .single()
      if (tierData) setAuthorTier(tierData)

      // 수익 기록
      const { data: revenue } = await supabase
        .from('revenue_records')
        .select('*')
        .eq('author_id', user.id)
        .order('month', { ascending: false })
        .limit(12)
      if (revenue) setRevenueRecords(revenue)

      const totalRevenue = revenue?.reduce((sum, r) => sum + Number(r.total_author_revenue), 0) || 0

      setStats({
        totalViews,
        totalReadingTime,
        totalRevenue,
        subscribersCount,
        documentsCount: docs?.length || 0,
        viewsChange: 12.5,
        readingTimeChange: 8.3,
        revenueChange: totalRevenue > 0 ? 15.2 : 0,
        subscribersChange: 5.0,
      })
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`"${doc.title}" 문서를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    try {
      await supabase.storage.from('documents').remove([doc.file_path])
      if (doc.thumbnail_url) {
        const thumbPath = doc.thumbnail_url.split('/').slice(-2).join('/')
        await supabase.storage.from('thumbnails').remove([thumbPath])
      }
      const { error } = await supabase.from('documents').delete().eq('id', doc.id)
      if (error) throw error
      alert('문서가 삭제되었습니다.')
      setDocuments(documents.filter(d => d.id !== doc.id))
      loadDashboard()
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('문서 삭제에 실패했습니다.')
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { alert('썸네일 크기는 5MB 이하여야 합니다.'); return }
      if (!selectedFile.type.startsWith('image/')) { alert('이미지 파일만 업로드 가능합니다.'); return }
      setNewThumbnail(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => setThumbnailPreview(reader.result as string)
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUpdateThumbnail = async (docId: string, oldThumbnailUrl: string | null) => {
    if (!newThumbnail || !user) return
    try {
      if (oldThumbnailUrl) {
        const oldPath = oldThumbnailUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('thumbnails').remove([oldPath])
      }
      const thumbExt = newThumbnail.name.split('.').pop()
      const thumbFileName = `${user.id}/${Date.now()}.${thumbExt}`
      const { error: uploadError } = await supabase.storage.from('thumbnails').upload(thumbFileName, newThumbnail)
      if (uploadError) throw uploadError
      const { data: thumbUrlData } = supabase.storage.from('thumbnails').getPublicUrl(thumbFileName)
      const { error: updateError } = await supabase.from('documents').update({ thumbnail_url: thumbUrlData.publicUrl }).eq('id', docId)
      if (updateError) throw updateError
      alert('썸네일이 변경되었습니다.')
      setEditingThumbnail(null); setNewThumbnail(null); setThumbnailPreview(null)
      loadDashboard()
    } catch (err) {
      console.error('Error updating thumbnail:', err)
      alert('썸네일 변경에 실패했습니다.')
    }
  }

  const handleUpdateDescription = async (docId: string) => {
    if (!user) return
    setSavingDescription(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({ description: newDescription.trim() || null })
        .eq('id', docId)
      if (error) throw error
      alert('설명이 수정되었습니다.')
      setEditingDescription(null)
      setNewDescription('')
      loadDashboard()
    } catch (err) {
      console.error('Error updating description:', err)
      alert('설명 수정에 실패했습니다.')
    } finally {
      setSavingDescription(false)
    }
  }

  // ─── 유틸 함수들 ───
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}시간 ${minutes}분`
    return `${minutes}분`
  }

  const formatReadingHours = (hours: number) => {
    if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K`
    return hours.toFixed(1)
  }

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 0: return { label: '일반 사용자', color: 'text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500', bg: 'bg-gray-800', icon: '🔒' }
      case 1: return { label: '파트너 작가', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: '✓' }
      case 2: return { label: '프로 작가', color: 'text-purple-400', bg: 'bg-purple-900/30', icon: '★' }
      default: return { label: '일반', color: 'text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500', bg: 'bg-gray-800', icon: '🔒' }
    }
  }

  const getTierProgress = () => {
    const hours = authorTier?.total_reading_hours_12m || 0
    const days = authorTier?.account_age_days || 0
    const currentTier = authorTier?.tier || 0

    if (currentTier >= 2) return { target: 0, progress: 100, label: '최고 등급 달성!', hoursNeeded: 0, daysNeeded: 0 }
    if (currentTier === 1) return {
      target: 1000, progress: Math.min((hours / 1000) * 100, 100),
      label: 'Tier 2까지', hoursNeeded: Math.max(1000 - hours, 0), daysNeeded: Math.max(30 - days, 0)
    }
    return {
      target: 100, progress: Math.min((hours / 100) * 100, 100),
      label: 'Tier 1까지', hoursNeeded: Math.max(100 - hours, 0), daysNeeded: Math.max(30 - days, 0)
    }
  }

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value > 0) return <span className="flex items-center text-green-400 text-xs"><ArrowUpRight className="w-3 h-3" />+{value.toFixed(1)}%</span>
    if (value < 0) return <span className="flex items-center text-red-400 text-xs"><ArrowDownRight className="w-3 h-3" />{value.toFixed(1)}%</span>
    return <span className="flex items-center text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs"><Minus className="w-3 h-3" />0%</span>
  }

  const sortedDocuments = [...documents].sort((a, b) => {
    switch (sortBy) {
      case 'views': return b.view_count - a.view_count
      case 'time': return b.total_reading_time - a.total_reading_time
      case 'revenue': return (b.view_count * 0.01 + b.total_reading_time / 60 * 0.05) - (a.view_count * 0.01 + a.total_reading_time / 60 * 0.05)
      case 'date': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default: return 0
    }
  })

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p>로그인이 필요합니다.</p></div>
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">대시보드 로딩 중...</p>
      </div>
    </div>
  )

  const tierInfo = getTierLabel(authorTier?.tier || profile?.author_tier || 0)
  const tierProgress = getTierProgress()
  const editingDoc = documents.find(d => d.id === editingThumbnail)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto">

          {/* ━━━ 헤더 ━━━ */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">대시보드</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                {profile?.username || profile?.email}님의 채널 현황
              </p>
            </div>
            <Link href="/upload">
              <Button className="bg-blue-600 hover:bg-blue-700">새 문서 업로드</Button>
            </Link>
          </div>

          {/* ━━━ 탭 네비게이션 ━━━ */}
          <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
            {([
              { id: 'overview', label: '개요', icon: BarChart3 },
              { id: 'content', label: '콘텐츠', icon: FileText },
              { id: 'analytics', label: '분석', icon: TrendingUp },
              { id: 'revenue', label: '수익', icon: DollarSign },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-600 dark:text-gray-400 dark:text-gray-500'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ━━━ 개요 탭 ━━━ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Tier 상태 카드 */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${tierInfo.bg}`}>
                      {tierInfo.icon}
                    </div>
                    <div>
                      <h3 className={`font-bold ${tierInfo.color === 'text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500' ? 'text-gray-700 dark:text-gray-300 dark:text-gray-600 dark:text-gray-400 dark:text-gray-500' : tierInfo.color.replace('-400', '-600')}`}>
                        {tierInfo.label}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        수익 배분: {authorTier?.tier === 0 ? '수익화 불가' : `작가 ${((authorTier?.revenue_share || 0) * 100).toFixed(0)}%`}
                      </p>
                    </div>
                  </div>
                  {(authorTier?.tier || 0) < 2 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{tierProgress.label}</p>
                      <p className="text-sm font-bold text-blue-600">
                        {tierProgress.hoursNeeded > 0 ? `${formatReadingHours(tierProgress.hoursNeeded)}시간 남음` : '조건 충족!'}
                      </p>
                    </div>
                  )}
                </div>
                {(authorTier?.tier || 0) < 2 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">
                      <span>누적 읽기 시간: {formatReadingHours(authorTier?.total_reading_hours_12m || 0)}시간</span>
                      <span>목표: {tierProgress.target.toLocaleString()}시간</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(tierProgress.progress, 100)}%` }}
                      />
                    </div>
                    {tierProgress.daysNeeded > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        계정 생성 후 {tierProgress.daysNeeded}일 더 필요합니다
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 통계 카드 4개 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">총 조회수</span>
                    <Eye className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalViews.toLocaleString()}</p>
                  <ChangeIndicator value={stats.viewsChange} />
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">총 읽기 시간</span>
                    <Clock className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(stats.totalReadingTime)}</p>
                  <ChangeIndicator value={stats.readingTimeChange} />
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">구독자</span>
                    <Users className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.subscribersCount.toLocaleString()}</p>
                  <ChangeIndicator value={stats.subscribersChange} />
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">총 수익</span>
                    <DollarSign className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalRevenue.toFixed(2)}</p>
                  <ChangeIndicator value={stats.revenueChange} />
                </div>
              </div>

              {/* 인기 문서 Top 5 */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">인기 문서 TOP 5</h3>
                  <button onClick={() => setActiveTab('content')} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    전체보기 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {[...documents].sort((a, b) => b.view_count - a.view_count).slice(0, 5).map((doc, i) => (
                    <Link key={doc.id} href={`/read/${doc.id}`}>
                      <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800 transition-colors cursor-pointer">
                        <span className="text-lg font-bold text-gray-300 dark:text-gray-600 dark:text-gray-400 dark:text-gray-500 w-6 text-center">{i + 1}</span>
                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          {doc.thumbnail_url ? (
                            <img src={doc.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">📄</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{getCategoryLabel(doc.category)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{doc.view_count.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">조회수</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 py-8">아직 업로드한 문서가 없습니다</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ━━━ 콘텐츠 탭 ━━━ */}
          {activeTab === 'content' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  내 문서 ({documents.length}개)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">정렬:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900"
                  >
                    <option value="date">최신순</option>
                    <option value="views">조회수순</option>
                    <option value="time">읽기 시간순</option>
                    <option value="revenue">수익순</option>
                  </select>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">아직 업로드한 문서가 없습니다</p>
                  <Link href="/upload"><Button>첫 문서 업로드하기</Button></Link>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {/* 테이블 헤더 */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <div className="col-span-5">문서</div>
                    <div className="col-span-1 text-center">조회수</div>
                    <div className="col-span-2 text-center">읽기 시간</div>
                    <div className="col-span-1 text-center">좋아요</div>
                    <div className="col-span-1 text-center">수익</div>
                    <div className="col-span-2 text-center">관리</div>
                  </div>
                  {sortedDocuments.map(doc => (
                    <div key={doc.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-800 transition-colors items-center">
                      {/* 문서 정보 */}
                      <div className="col-span-5 flex items-center gap-3">
                        <Link href={`/read/${doc.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            {doc.thumbnail_url ? (
                              <img src={doc.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">📄</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">
                              <span>{getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}</span>
                              <span>{getLanguageFlag(doc.language)}</span>
                              <span>{new Date(doc.created_at).toLocaleDateString('ko-KR')}</span>
                            </div>
                          </div>
                        </Link>
                      </div>
                      {/* 통계 (모바일에서는 한 줄로) */}
                      <div className="col-span-1 text-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.view_count.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 md:hidden">조회수</p>
                      </div>
                      <div className="col-span-2 text-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatTime(doc.total_reading_time)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 md:hidden">읽기 시간</p>
                      </div>
                      <div className="col-span-1 text-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.likes_count}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 md:hidden">좋아요</p>
                      </div>
                      <div className="col-span-1 text-center">
                        <p className="text-sm font-medium text-green-600">
                          ${((doc.view_count * 0.01) + ((doc.total_reading_time / 60) * 0.05)).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 md:hidden">수익</p>
                      </div>
                      {/* 관리 버튼 */}
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingDescription(doc.id)
                            setNewDescription(doc.description || '')
                          }}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 transition-colors"
                          title="설명 수정"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingThumbnail(doc.id); setNewThumbnail(null); setThumbnailPreview(null) }}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 transition-colors"
                          title="썸네일 변경"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:bg-red-950/30 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ 분석 탭 ━━━ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* 기간별 통계 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 조회수 추이 (텍스트 기반 차트) */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">문서별 조회수</h3>
                  <div className="space-y-3">
                    {[...documents].sort((a, b) => b.view_count - a.view_count).slice(0, 8).map(doc => {
                      const maxViews = Math.max(...documents.map(d => d.view_count), 1)
                      const width = (doc.view_count / maxViews) * 100
                      return (
                        <div key={doc.id}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-300 dark:text-gray-600 dark:text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{doc.title}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{doc.view_count.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div className="bg-blue-50 dark:bg-blue-950/300 h-2 rounded-full transition-all" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 읽기 시간 분포 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">문서별 읽기 시간</h3>
                  <div className="space-y-3">
                    {[...documents].sort((a, b) => b.total_reading_time - a.total_reading_time).slice(0, 8).map(doc => {
                      const maxTime = Math.max(...documents.map(d => d.total_reading_time), 1)
                      const width = (doc.total_reading_time / maxTime) * 100
                      return (
                        <div key={doc.id}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-300 dark:text-gray-600 dark:text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{doc.title}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatTime(doc.total_reading_time)}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div className="bg-green-50 dark:bg-green-950/300 h-2 rounded-full transition-all" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 카테고리 분포 */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">카테고리별 현황</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(
                    documents.reduce((acc, doc) => {
                      acc[doc.category] = (acc[doc.category] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).sort(([, a], [, b]) => b - a).map(([cat, count]) => (
                    <div key={cat} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <div className="text-2xl mb-1">{getCategoryIcon(cat)}</div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{getCategoryLabel(cat)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{count}개 문서</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ━━━ 수익 탭 ━━━ */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* 수익화 상태 */}
              <div className={`rounded-xl border p-6 ${
                (authorTier?.tier || 0) === 0 
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' 
                  : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
              }`}>
                <div className="flex items-start gap-3">
                  {(authorTier?.tier || 0) === 0 ? (
                    <>
                      <Shield className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-amber-800 dark:text-amber-300">수익화 자격 미달성</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          수익화를 시작하려면 최근 12개월 누적 읽기 시간 100시간과 계정 생성 후 30일이 필요합니다.
                          현재 광고 수익은 Textry에 귀속됩니다.
                        </p>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 mb-1">
                            <span>읽기 시간: {formatReadingHours(authorTier?.total_reading_hours_12m || 0)}시간 / 100시간</span>
                            <span>{Math.min(tierProgress.progress, 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
                            <div className="bg-amber-50 dark:bg-amber-950/300 h-2 rounded-full" style={{ width: `${Math.min(tierProgress.progress, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Award className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-green-800 dark:text-green-300">수익화 활성 — {tierInfo.label}</h3>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                          광고 및 프리미엄 구독 수익의 {((authorTier?.revenue_share || 0.7) * 100).toFixed(0)}%가 수익으로 배분됩니다.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 수익 요약 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">총 누적 수익</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">출금 가능 금액</p>
                  <p className="text-3xl font-bold text-green-600">${(profile?.pending_payout_usd || 0).toFixed(2)}</p>
                  {(profile?.pending_payout_usd || 0) >= 10 && (
                    <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700 text-xs">
                      <CreditCard className="w-3 h-3 mr-1" /> 출금 요청
                    </Button>
                  )}
                  {(profile?.pending_payout_usd || 0) < 10 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">최소 출금: $10.00</p>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">이번 달 수익</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${revenueRecords.length > 0 ? Number(revenueRecords[0].total_author_revenue).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              {/* 월별 수익 내역 */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">월별 수익 내역</h3>
                {revenueRecords.length === 0 ? (
                  <p className="text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 py-8">아직 수익 기록이 없습니다</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                          <th className="text-left py-3 px-2">월</th>
                          <th className="text-right py-3 px-2">광고 노출</th>
                          <th className="text-right py-3 px-2">광고 수익</th>
                          <th className="text-right py-3 px-2">프리미엄 시간</th>
                          <th className="text-right py-3 px-2">프리미엄 수익</th>
                          <th className="text-right py-3 px-2 font-bold">총 수익</th>
                          <th className="text-center py-3 px-2">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueRecords.map(record => (
                          <tr key={record.month} className="border-b border-gray-50 hover:bg-gray-50 dark:bg-gray-800">
                            <td className="py-3 px-2 font-medium">{record.month}</td>
                            <td className="py-3 px-2 text-right">{record.ad_impressions_count.toLocaleString()}</td>
                            <td className="py-3 px-2 text-right">${Number(record.ad_author_share).toFixed(2)}</td>
                            <td className="py-3 px-2 text-right">{record.premium_reading_minutes}분</td>
                            <td className="py-3 px-2 text-right">${Number(record.premium_author_share).toFixed(2)}</td>
                            <td className="py-3 px-2 text-right font-bold text-green-600">${Number(record.total_author_revenue).toFixed(2)}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                record.status === 'paid' ? 'bg-green-100 text-green-700 dark:text-green-400' :
                                record.status === 'confirmed' ? 'bg-blue-100 text-blue-700 dark:text-blue-400' :
                                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500'
                              }`}>
                                {record.status === 'paid' ? '지급완료' : record.status === 'confirmed' ? '확정' : '정산중'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ━━━ 썸네일 변경 다이얼로그 ━━━ */}
      <Dialog open={!!editingThumbnail} onOpenChange={() => {
        setEditingThumbnail(null); setNewThumbnail(null); setThumbnailPreview(null)
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>썸네일 변경</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            {editingDoc && (
              <>
                <div>
                  <Label>현재 썸네일</Label>
                  <div className="mt-2 w-48 aspect-[3/4] rounded-lg overflow-hidden border bg-gray-100 dark:bg-gray-800">
                    {editingDoc.thumbnail_url ? (
                      <img src={editingDoc.thumbnail_url} alt="현재 썸네일" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><div className="text-6xl opacity-20">📄</div></div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-thumbnail">새 썸네일</Label>
                  <Input id="new-thumbnail" type="file" accept="image/*" onChange={handleThumbnailChange} className="mt-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">권장: 600x800px (3:4 비율), 최대 5MB</p>
                </div>
                {thumbnailPreview && (
                  <div>
                    <Label>미리보기</Label>
                    <div className="mt-2 w-48 aspect-[3/4] rounded-lg overflow-hidden border">
                      <img src={thumbnailPreview} alt="미리보기" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setEditingThumbnail(null); setNewThumbnail(null); setThumbnailPreview(null) }}>취소</Button>
                  <Button onClick={() => handleUpdateThumbnail(editingDoc.id, editingDoc.thumbnail_url)} disabled={!newThumbnail}>변경</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ━━━ 설명 수정 다이얼로그 ━━━ */}
      <Dialog open={!!editingDescription} onOpenChange={() => {
        setEditingDescription(null); setNewDescription('')
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>설명 수정</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            {(() => {
              const descDoc = documents.find(d => d.id === editingDescription)
              if (!descDoc) return null
              return (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{descDoc.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">카드 호버 시 표시되는 설명입니다</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">설명 (최대 50자)</Label>
                    <textarea
                      id="edit-description"
                      value={newDescription}
                      onChange={(e) => { if (e.target.value.length <= 50) setNewDescription(e.target.value) }}
                      placeholder="문서에 대한 간단한 설명"
                      rows={2}
                      maxLength={50}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-right">{newDescription.length}/50</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setEditingDescription(null); setNewDescription('') }}>취소</Button>
                    <Button onClick={() => handleUpdateDescription(descDoc.id)} disabled={savingDescription}>
                      {savingDescription ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
