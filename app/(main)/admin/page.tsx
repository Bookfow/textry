'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  BarChart3, Users, DollarSign, FileText, Eye, Clock,
  TrendingUp, Crown, Shield, AlertTriangle, ChevronDown,
  ChevronUp, Search, Download, RefreshCw, Award, Flag,
  CheckCircle, XCircle, Trash2, ExternalLink,
} from 'lucide-react'
import { useToast } from '@/components/toast'

type TabType = 'overview' | 'authors' | 'revenue' | 'content' | 'premium' | 'reports'

type AuthorRow = {
  id: string
  email: string
  username: string | null
  role: string
  subscribers_count: number
  author_tier: number
  total_revenue_usd: number
  is_premium: boolean
  created_at: string
}

type PlatformStats = {
  totalUsers: number
  totalAuthors: number
  totalReaders: number
  premiumCount: number
  totalDocuments: number
  totalViews: number
  totalReadingTimeSec: number
  tier0Authors: number
  tier1Authors: number
  tier2Authors: number
  totalPlatformRevenue: number
  totalAuthorPayout: number
  premiumMonthlyRevenue: number
}

export default function AdminPage() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, totalAuthors: 0, totalReaders: 0, premiumCount: 0,
    totalDocuments: 0, totalViews: 0, totalReadingTimeSec: 0,
    tier0Authors: 0, tier1Authors: 0, tier2Authors: 0,
    totalPlatformRevenue: 0, totalAuthorPayout: 0, premiumMonthlyRevenue: 0,
  })
  const [authors, setAuthors] = useState<AuthorRow[]>([])
  const [allUsers, setAllUsers] = useState<AuthorRow[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [authorSort, setAuthorSort] = useState<'revenue' | 'subscribers' | 'views' | 'date'>('revenue')
  const [docSort, setDocSort] = useState<'views' | 'time' | 'likes' | 'date'>('views')
  const [reports, setReports] = useState<any[]>([])
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>('pending')
  const { toast } = useToast()

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    setLoading(true)
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      const allProfiles = profiles || []
      setAllUsers(allProfiles)

      const authorProfiles = allProfiles.filter(p => p.role === 'author')
      setAuthors(authorProfiles)

      const { data: docs } = await supabase
        .from('documents')
        .select('*, profiles!documents_author_id_fkey(username, email)')
        .order('view_count', { ascending: false })
      setDocuments(docs || [])

      const totalViews = docs?.reduce((s, d) => s + d.view_count, 0) || 0
      const totalReadingTimeSec = docs?.reduce((s, d) => s + d.total_reading_time, 0) || 0

      const { data: premiumSubs } = await supabase
        .from('premium_subscriptions')
        .select('id, price_usd')
        .eq('status', 'active')
      const premiumCount = premiumSubs?.length || 0
      const premiumMonthlyRevenue = premiumSubs?.reduce((s, p) => s + Number(p.price_usd), 0) || 0

      const { data: tiers } = await supabase.from('author_tiers').select('tier')
      const tier0 = tiers?.filter(t => t.tier === 0).length || 0
      const tier1 = tiers?.filter(t => t.tier === 1).length || 0
      const tier2 = tiers?.filter(t => t.tier === 2).length || 0

      const { data: revenue } = await supabase
        .from('revenue_records')
        .select('total_author_revenue, total_platform_revenue')
      const totalAuthorPayout = revenue?.reduce((s, r) => s + Number(r.total_author_revenue), 0) || 0
      const totalPlatformRevenue = revenue?.reduce((s, r) => s + Number(r.total_platform_revenue), 0) || 0

      setStats({
        totalUsers: allProfiles.length,
        totalAuthors: authorProfiles.length,
        totalReaders: allProfiles.filter(p => p.role === 'reader').length,
        premiumCount,
        totalDocuments: docs?.length || 0,
        totalViews,
        totalReadingTimeSec,
        tier0Authors: tier0,
        tier1Authors: tier1,
        tier2Authors: tier2,
        totalPlatformRevenue,
        totalAuthorPayout,
        premiumMonthlyRevenue,
      })

      // 신고 데이터 로딩
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      // 신고된 문서 + 신고자 정보 매칭
      if (reportsData && reportsData.length > 0) {
        const docIds = [...new Set(reportsData.map((r: any) => r.document_id).filter(Boolean))]
        const reporterIds = [...new Set(reportsData.map((r: any) => r.reporter_id).filter(Boolean))]

        const { data: reportDocs } = await supabase.from('documents').select('id, title, author_id, thumbnail_url').in('id', docIds)
        const { data: reporters } = await supabase.from('profiles').select('id, username, email').in('id', reporterIds)

        const docMap = Object.fromEntries((reportDocs || []).map((d: any) => [d.id, d]))
        const reporterMap = Object.fromEntries((reporters || []).map((p: any) => [p.id, p]))

        setReports(reportsData.map((r: any) => ({
          ...r,
          documents: docMap[r.document_id] || null,
          reporter: reporterMap[r.reporter_id] || null,
        })))
      } else {
        setReports([])
      }
    } catch (err) {
      console.error('Admin data load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours.toLocaleString()}h ${minutes}m`
    return `${minutes}m`
  }

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 0: return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Tier 0</span>
      case 1: return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:text-blue-400">Tier 1</span>
      case 2: return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">Tier 2</span>
      default: return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">-</span>
    }
  }

  const filteredAuthors = authors.filter(a =>
    (a.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    switch (authorSort) {
      case 'revenue': return (b.total_revenue_usd || 0) - (a.total_revenue_usd || 0)
      case 'subscribers': return b.subscribers_count - a.subscribers_count
      case 'date': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default: return 0
    }
  })

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a: any, b: any) => {
    switch (docSort) {
      case 'views': return b.view_count - a.view_count
      case 'time': return b.total_reading_time - a.total_reading_time
      case 'likes': return b.likes_count - a.likes_count
      case 'date': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default: return 0
    }
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">관리자 대시보드 로딩 중...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Textry Admin</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">플랫폼 운영 대시보드</p>
              </div>
            </div>
            <Button variant="outline" onClick={loadAdminData} className="gap-2">
              <RefreshCw className="w-4 h-4" /> 새로고침
            </Button>
          </div>

          <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            {([
              { id: 'overview', label: '개요', icon: BarChart3 },
              { id: 'authors', label: '작가 관리', icon: Users },
              { id: 'content', label: '콘텐츠', icon: FileText },
              { id: 'revenue', label: '수익', icon: DollarSign },
              { id: 'premium', label: '프리미엄', icon: Crown },
              { id: 'reports', label: '신고 관리', icon: Flag },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600 dark:text-red-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: '전체 사용자', value: formatNumber(stats.totalUsers), icon: Users, color: 'text-blue-500', sub: `작가 ${stats.totalAuthors} / 독자 ${stats.totalReaders}` },
                  { label: '프리미엄', value: formatNumber(stats.premiumCount), icon: Crown, color: 'text-amber-500', sub: `전환율 ${stats.totalUsers > 0 ? ((stats.premiumCount / stats.totalUsers) * 100).toFixed(1) : 0}%` },
                  { label: '총 문서', value: formatNumber(stats.totalDocuments), icon: FileText, color: 'text-green-500', sub: `작가당 ${stats.totalAuthors > 0 ? (stats.totalDocuments / stats.totalAuthors).toFixed(1) : 0}개` },
                  { label: '총 조회수', value: formatNumber(stats.totalViews), icon: Eye, color: 'text-purple-500', sub: `문서당 ${stats.totalDocuments > 0 ? Math.round(stats.totalViews / stats.totalDocuments) : 0}회` },
                  { label: '총 읽기 시간', value: formatTime(stats.totalReadingTimeSec), icon: Clock, color: 'text-teal-500', sub: '' },
                  { label: '플랫폼 수익', value: `$${stats.totalPlatformRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-red-500', sub: `작가 지급: $${stats.totalAuthorPayout.toFixed(2)}` },
                  { label: '신고 접수', value: formatNumber(reports.length), icon: Flag, color: 'text-orange-500', sub: `대기중 ${reports.filter(r => r.status === 'pending').length}건` },
                ].map((item, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                    {item.sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.sub}</p>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">사용자 활동 (추정)</h3>
                  <div className="space-y-4">
                    {(() => {
                      const dau = Math.max(Math.round(stats.totalUsers * 0.15), 1)
                      const wau = Math.max(Math.round(stats.totalUsers * 0.35), 1)
                      const mau = Math.max(Math.round(stats.totalUsers * 0.6), 1)
                      return (
                        <>
                          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">DAU (일간 활성)</p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">전체의 ~15%</p>
                            </div>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{dau.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">WAU (주간 활성)</p>
                              <p className="text-xs text-purple-600 dark:text-purple-400">전체의 ~35%</p>
                            </div>
                            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{wau.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-green-800 dark:text-green-300">MAU (월간 활성)</p>
                              <p className="text-xs text-green-600 dark:text-green-400">전체의 ~60%</p>
                            </div>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{mau.toLocaleString()}</p>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">DAU/MAU 비율 (Stickiness)</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full" style={{ width: `${Math.round((dau / mau) * 100)}%` }} />
                              </div>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.round((dau / mau) * 100)}%</span>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">* 사용자 활동 데이터는 전체 사용자 수 기반 추정치입니다</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">월별 매출 추이</h3>
                  {(() => {
                    const months = ['1월', '2월', '3월', '4월', '5월', '6월']
                    const baseRevenue = stats.premiumMonthlyRevenue || 10
                    const data = months.map((m, i) => ({
                      month: m,
                      platform: Math.round(baseRevenue * (0.4 + i * 0.12) * 100) / 100,
                      author: Math.round(baseRevenue * (0.3 + i * 0.1) * 100) / 100,
                    }))
                    const maxVal = Math.max(...data.map(d => d.platform + d.author), 1)
                    return (
                      <div className="space-y-3">
                        {data.map(d => (
                          <div key={d.month}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-700 dark:text-gray-300 w-10">{d.month}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-red-500">플랫폼 ${d.platform.toFixed(0)}</span>
                                <span className="text-blue-500">작가 ${d.author.toFixed(0)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 flex overflow-hidden">
                              <div className="bg-red-400 h-3 transition-all" style={{ width: `${(d.platform / maxVal) * 50}%` }} />
                              <div className="bg-blue-400 h-3 transition-all" style={{ width: `${(d.author / maxVal) * 50}%` }} />
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm" /> 플랫폼 수익</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded-sm" /> 작가 지급</span>
                        </div>
                      </div>
                    )
                  })()}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">* 매출 추이는 현재 데이터 기반 시뮬레이션입니다</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">작가 Tier 분포</h3>
                  <div className="space-y-4">
                    {[
                      { tier: 'Tier 0 (일반)', count: stats.tier0Authors, color: 'bg-gray-400', share: '0%' },
                      { tier: 'Tier 1 (파트너)', count: stats.tier1Authors, color: 'bg-blue-500', share: '70%' },
                      { tier: 'Tier 2 (프로)', count: stats.tier2Authors, color: 'bg-purple-500', share: '80%' },
                    ].map(t => {
                      const total = stats.tier0Authors + stats.tier1Authors + stats.tier2Authors
                      const pct = total > 0 ? (t.count / total) * 100 : 0
                      return (
                        <div key={t.tier}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-700 dark:text-gray-300">{t.tier}</span>
                            <span className="text-gray-500 dark:text-gray-400">{t.count}명 ({pct.toFixed(1)}%) — 배분 {t.share}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                            <div className={`${t.color} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">수익 구조</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Textry 수익</p>
                        <p className="text-xs text-red-600 dark:text-red-400">광고 + 프리미엄 수수료</p>
                      </div>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-400">${stats.totalPlatformRevenue.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">작가 지급 총액</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">광고 + 프리미엄 배분</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.totalAuthorPayout.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">프리미엄 월 매출</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{stats.premiumCount}명 × $3.99</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">${stats.premiumMonthlyRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">인기 문서 TOP 10 (전체)</h3>
                <div className="space-y-2">
                  {documents.slice(0, 10).map((doc: any, i: number) => (
                    <div key={doc.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <span className={`text-lg font-bold w-6 text-center ${i < 3 ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{doc.profiles?.username || doc.profiles?.email || '알 수 없음'}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(doc.view_count)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(doc.total_reading_time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'authors' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="작가 검색 (이름, 이메일)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
                <select value={authorSort} onChange={e => setAuthorSort(e.target.value as any)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  <option value="revenue">수익순</option>
                  <option value="subscribers">구독자순</option>
                  <option value="date">가입순</option>
                </select>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <div className="col-span-4">작가</div>
                  <div className="col-span-1 text-center">Tier</div>
                  <div className="col-span-1 text-center">구독자</div>
                  <div className="col-span-2 text-center">총 수익</div>
                  <div className="col-span-1 text-center">프리미엄</div>
                  <div className="col-span-2 text-center">가입일</div>
                  <div className="col-span-1 text-center">상태</div>
                </div>
                {filteredAuthors.map(author => (
                  <div key={author.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors items-center">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(author.username || author.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{author.username || '미설정'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{author.email}</p>
                      </div>
                    </div>
                    <div className="col-span-1 text-center">{getTierBadge(author.author_tier || 0)}</div>
                    <div className="col-span-1 text-center text-sm font-medium text-gray-900 dark:text-white">{author.subscribers_count}</div>
                    <div className="col-span-2 text-center text-sm font-medium text-green-600">${(author.total_revenue_usd || 0).toFixed(2)}</div>
                    <div className="col-span-1 text-center">
                      {author.is_premium ? <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Premium</span> : <span className="text-xs text-gray-400">-</span>}
                    </div>
                    <div className="col-span-2 text-center text-xs text-gray-500 dark:text-gray-400">{new Date(author.created_at).toLocaleDateString()}</div>
                    <div className="col-span-1 text-center"><button className="text-xs text-blue-600 hover:underline">상세</button></div>
                  </div>
                ))}
                {filteredAuthors.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 py-8">검색 결과가 없습니다</p>}
              </div>
              <p className="text-xs text-gray-400">총 {filteredAuthors.length}명의 작가</p>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="문서 검색" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
                <select value={docSort} onChange={e => setDocSort(e.target.value as any)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  <option value="views">조회수순</option>
                  <option value="time">읽기시간순</option>
                  <option value="likes">좋아요순</option>
                  <option value="date">최신순</option>
                </select>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <div className="col-span-5">문서</div>
                  <div className="col-span-2">작가</div>
                  <div className="col-span-1 text-center">조회수</div>
                  <div className="col-span-2 text-center">읽기 시간</div>
                  <div className="col-span-1 text-center">좋아요</div>
                  <div className="col-span-1 text-center">업로드</div>
                </div>
                {filteredDocs.slice(0, 50).map((doc: any) => (
                  <div key={doc.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors items-center text-sm">
                    <div className="col-span-5 truncate font-medium text-gray-900 dark:text-white">{doc.title}</div>
                    <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400 truncate">{doc.profiles?.username || doc.profiles?.email || '-'}</div>
                    <div className="col-span-1 text-center text-gray-900 dark:text-white">{formatNumber(doc.view_count)}</div>
                    <div className="col-span-2 text-center text-gray-900 dark:text-white">{formatTime(doc.total_reading_time)}</div>
                    <div className="col-span-1 text-center text-gray-900 dark:text-white">{doc.likes_count}</div>
                    <div className="col-span-1 text-center text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">총 {filteredDocs.length}개 문서 (상위 50개 표시)</p>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Textry 총 수익</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">${stats.totalPlatformRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">작가 총 지급액</p>
                  <p className="text-3xl font-bold text-blue-600">${stats.totalAuthorPayout.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">프리미엄 월 매출</p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">${stats.premiumMonthlyRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">수익 배분율</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.totalPlatformRevenue + stats.totalAuthorPayout > 0
                      ? ((stats.totalPlatformRevenue / (stats.totalPlatformRevenue + stats.totalAuthorPayout)) * 100).toFixed(1)
                      : '30'}%
                  </p>
                  <p className="text-xs text-gray-400">Textry 평균</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">작가별 수익 랭킹</h3>
                <div className="space-y-2">
                  {[...authors].sort((a, b) => (b.total_revenue_usd || 0) - (a.total_revenue_usd || 0)).slice(0, 15).map((author, i) => (
                    <div key={author.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <span className={`text-lg font-bold w-6 text-center ${i < 3 ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`}>{i + 1}</span>
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {(author.username || author.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{author.username || author.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">구독자 {author.subscribers_count}명</p>
                      </div>
                      <div className="text-right">{getTierBadge(author.author_tier || 0)}</div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-sm font-bold text-green-600">${(author.total_revenue_usd || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'premium' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">활성 구독자</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.premiumCount}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">전체 사용자의 {stats.totalUsers > 0 ? ((stats.premiumCount / stats.totalUsers) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">월 구독 매출</p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">${stats.premiumMonthlyRevenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">@$3.99/월</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">연간 예상 매출 (ARR)</p>
                  <p className="text-3xl font-bold text-green-600">${(stats.premiumMonthlyRevenue * 12).toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">프리미엄 구독자 목록</h3>
                <div className="space-y-2">
                  {allUsers.filter(u => u.is_premium).map(u => (
                    <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {(u.username || u.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{u.username || u.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Premium</span>
                    </div>
                  ))}
                  {allUsers.filter(u => u.is_premium).length === 0 && (
                    <p className="text-center text-gray-400 dark:text-gray-500 py-8">아직 프리미엄 구독자가 없습니다</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              {/* 필터 */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map(f => (
                  <button key={f} onClick={() => setReportFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      reportFilter === f
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                    {{ all: '전체', pending: '대기중', reviewed: '검토중', resolved: '처리완료', dismissed: '기각' }[f]}
                    {f !== 'all' && (
                      <span className="ml-1 opacity-70">
                        ({reports.filter(r => r.status === f).length})
                      </span>
                    )}
                    {f === 'all' && <span className="ml-1 opacity-70">({reports.length})</span>}
                  </button>
                ))}
              </div>

              {/* 신고 목록 */}
              <div className="space-y-3">
                {reports
                  .filter(r => reportFilter === 'all' || r.status === reportFilter)
                  .map((report: any) => (
                  <div key={report.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            report.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            report.status === 'reviewed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            report.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {{ pending: '대기중', reviewed: '검토중', resolved: '처리완료', dismissed: '기각' }[report.status as string] || report.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            {{ copyright: '저작권 침해', inappropriate: '부적절한 콘텐츠', spam: '스팸', misinformation: '허위 정보', other: '기타' }[report.reason as string] || report.reason}
                          </span>
                          <span className="text-[10px] text-gray-400">{new Date(report.created_at).toLocaleString('ko-KR')}</span>
                        </div>

                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          📄 {report.documents?.title || '삭제된 문서'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          신고자: {report.reporter?.username || report.reporter?.email || '알 수 없음'}
                        </p>
                        {report.detail && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mt-2">
                            {report.detail}
                          </p>
                        )}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {report.documents?.id && (
                          <button onClick={() => window.open(`/read/${report.documents.id}`, '_blank')}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <ExternalLink className="w-3 h-3" /> 문서 보기
                          </button>
                        )}
                        {report.status === 'pending' && (
                          <>
                            <button onClick={async () => {
                              const { error } = await supabase.from('reports').update({ status: 'reviewed' }).eq('id', report.id)
                              if (!error) { setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'reviewed' } : r)); toast.info('검토중으로 변경되었습니다.') }
                            }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                              <Eye className="w-3 h-3" /> 검토 시작
                            </button>
                          </>
                        )}
                        {(report.status === 'pending' || report.status === 'reviewed') && (
                          <>
                            <button onClick={async () => {
                              if (!confirm('해당 문서를 삭제하고 신고를 처리하시겠습니까?')) return
                              const { error: delErr } = await supabase.from('documents').delete().eq('id', report.documents?.id)
                              if (delErr) { toast.error('문서 삭제 실패'); return }
                              const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id)
                              if (!error) { setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r)); toast.success('문서 삭제 및 신고 처리 완료') }
                            }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                              <Trash2 className="w-3 h-3" /> 문서 삭제
                            </button>
                            <button onClick={async () => {
                              const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', report.id)
                              if (!error) { setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'dismissed' } : r)); toast.info('신고가 기각되었습니다.') }
                            }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                              <XCircle className="w-3 h-3" /> 기각
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {reports.filter(r => reportFilter === 'all' || r.status === reportFilter).length === 0 && (
                  <div className="text-center py-12">
                    <Flag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 dark:text-gray-500">
                      {reportFilter === 'all' ? '신고 내역이 없습니다' : `${
                        { pending: '대기중', reviewed: '검토중', resolved: '처리완료', dismissed: '기각' }[reportFilter]
                      } 상태의 신고가 없습니다`}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">총 {reports.filter(r => reportFilter === 'all' || r.status === reportFilter).length}건</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
