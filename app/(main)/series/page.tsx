'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, Document } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'
import {
  Plus, GripVertical, Trash2, Play, Edit2, BookOpen, Eye,
  ChevronUp, ChevronDown, X,
} from 'lucide-react'

type Series = {
  id: string
  author_id: string
  title: string
  description: string
  thumbnail_url: string | null
  is_published: boolean
  documents_count: number
  created_at: string
}

type SeriesDoc = {
  id: string
  series_id: string
  document_id: string
  position: number
  document?: Document
}

export default function SeriesPage() {
  const { user } = useAuth()
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [myDocuments, setMyDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  // 시리즈 생성/편집
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingSeries, setEditingSeries] = useState<Series | null>(null)
  const [seriesTitle, setSeriesTitle] = useState('')
  const [seriesDescription, setSeriesDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // 시리즈 문서 관리
  const [managingSeries, setManagingSeries] = useState<Series | null>(null)
  const [seriesDocs, setSeriesDocs] = useState<SeriesDoc[]>([])
  const [showAddDocDialog, setShowAddDocDialog] = useState(false)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    try {
      const { data: series } = await supabase
        .from('document_series')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
      setSeriesList(series || [])

      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
      setMyDocuments(docs || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSeries = async () => {
    if (!user || !seriesTitle.trim()) return
    setSaving(true)
    try {
      if (editingSeries) {
        const { error } = await supabase
          .from('document_series')
          .update({ title: seriesTitle, description: seriesDescription })
          .eq('id', editingSeries.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('document_series')
          .insert({ author_id: user.id, title: seriesTitle, description: seriesDescription })
        if (error) throw error
      }
      setShowCreateDialog(false)
      setEditingSeries(null)
      setSeriesTitle('')
      setSeriesDescription('')
      loadData()
    } catch (err) {
      console.error('Error:', err)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSeries = async (series: Series) => {
    if (!confirm(`"${series.title}" 시리즈를 삭제하시겠습니까?`)) return
    try {
      await supabase.from('series_documents').delete().eq('series_id', series.id)
      await supabase.from('document_series').delete().eq('id', series.id)
      loadData()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const loadSeriesDocs = async (series: Series) => {
    setManagingSeries(series)
    const { data } = await supabase
      .from('series_documents')
      .select('*')
      .eq('series_id', series.id)
      .order('position', { ascending: true })

    if (data && data.length > 0) {
      const docIds = data.map(d => d.document_id)
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .in('id', docIds)

      const enriched = data.map(sd => ({
        ...sd,
        document: docs?.find(d => d.id === sd.document_id),
      }))
      setSeriesDocs(enriched)
    } else {
      setSeriesDocs([])
    }
  }

  const handleAddDocToSeries = async (docId: string) => {
    if (!managingSeries) return
    const maxPos = seriesDocs.length > 0 ? Math.max(...seriesDocs.map(d => d.position)) + 1 : 0
    try {
      const { error } = await supabase
        .from('series_documents')
        .insert({ series_id: managingSeries.id, document_id: docId, position: maxPos })
      if (error) throw error

      // 문서 수 업데이트
      await supabase
        .from('document_series')
        .update({ documents_count: seriesDocs.length + 1 })
        .eq('id', managingSeries.id)

      setShowAddDocDialog(false)
      loadSeriesDocs(managingSeries)
      loadData()
    } catch (err: any) {
      if (err?.code === '23505') alert('이미 시리즈에 포함된 문서입니다.')
      else alert('추가에 실패했습니다.')
    }
  }

  const handleRemoveDoc = async (seriesDocId: string) => {
    if (!managingSeries) return
    try {
      await supabase.from('series_documents').delete().eq('id', seriesDocId)
      await supabase
        .from('document_series')
        .update({ documents_count: Math.max(seriesDocs.length - 1, 0) })
        .eq('id', managingSeries.id)
      loadSeriesDocs(managingSeries)
      loadData()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleMoveDoc = async (index: number, direction: 'up' | 'down') => {
    const newDocs = [...seriesDocs]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newDocs.length) return

    // swap positions
    const tempPos = newDocs[index].position
    newDocs[index].position = newDocs[swapIndex].position
    newDocs[swapIndex].position = tempPos

    ;[newDocs[index], newDocs[swapIndex]] = [newDocs[swapIndex], newDocs[index]]
    setSeriesDocs(newDocs)

    // DB 업데이트
    await supabase.from('series_documents').update({ position: newDocs[index].position }).eq('id', newDocs[index].id)
    await supabase.from('series_documents').update({ position: newDocs[swapIndex].position }).eq('id', newDocs[swapIndex].id)
  }

  const availableDocs = myDocuments.filter(d => !seriesDocs.some(sd => sd.document_id === d.id))

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p>로그인이 필요합니다.</p></div>
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[1200px] mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">시리즈 관리</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">문서를 시리즈로 묶어 순서대로 제공하세요</p>
            </div>
            <Button onClick={() => { setShowCreateDialog(true); setEditingSeries(null); setSeriesTitle(''); setSeriesDescription('') }}>
              <Plus className="w-4 h-4 mr-2" /> 새 시리즈
            </Button>
          </div>

          {/* 시리즈 관리 중이 아닐 때 - 시리즈 목록 */}
          {!managingSeries ? (
            <>
              {seriesList.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">아직 시리즈가 없습니다</p>
                  <Button onClick={() => setShowCreateDialog(true)}>첫 시리즈 만들기</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {seriesList.map(series => (
                    <div key={series.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{series.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{series.description || '설명 없음'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                          <span>{series.documents_count}개 문서</span>
                          <span>{new Date(series.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => loadSeriesDocs(series)}>
                            <Edit2 className="w-3 h-3 mr-1" /> 문서 관리
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingSeries(series); setSeriesTitle(series.title); setSeriesDescription(series.description); setShowCreateDialog(true) }}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSeries(series)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* 시리즈 문서 관리 */
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Button variant="outline" size="sm" onClick={() => setManagingSeries(null)}>← 목록으로</Button>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{managingSeries.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{seriesDocs.length}개 문서</p>
                </div>
                <div className="ml-auto">
                  <Button size="sm" onClick={() => setShowAddDocDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" /> 문서 추가
                  </Button>
                </div>
              </div>

              {seriesDocs.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">시리즈에 문서를 추가해주세요</p>
                  <Button onClick={() => setShowAddDocDialog(true)}>문서 추가</Button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {seriesDocs.map((sd, i) => (
                    <div key={sd.id} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {/* 순서 */}
                      <span className="text-lg font-bold text-gray-300 dark:text-gray-600 w-8 text-center">{i + 1}</span>

                      {/* 순서 변경 */}
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => handleMoveDoc(i, 'up')} disabled={i === 0}
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-20">
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => handleMoveDoc(i, 'down')} disabled={i === seriesDocs.length - 1}
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-20">
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>

                      {/* 썸네일 */}
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        {sd.document?.thumbnail_url ? (
                          <img src={sd.document.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl opacity-20">📄</div>
                        )}
                      </div>

                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/read/${sd.document_id}`}>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-blue-600">{sd.document?.title || '알 수 없는 문서'}</p>
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{sd.document?.view_count?.toLocaleString() || 0}</span>
                          <span>{Math.floor((sd.document?.total_reading_time || 0) / 60)}분</span>
                        </div>
                      </div>

                      {/* 삭제 */}
                      <button onClick={() => handleRemoveDoc(sd.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 시리즈 생성/편집 다이얼로그 */}
      <Dialog open={showCreateDialog} onOpenChange={() => { setShowCreateDialog(false); setEditingSeries(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeries ? '시리즈 수정' : '새 시리즈 만들기'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>시리즈 제목</Label>
              <Input value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)} placeholder="예: Next.js 입문 시리즈" />
            </div>
            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <textarea
                value={seriesDescription}
                onChange={e => setSeriesDescription(e.target.value)}
                placeholder="시리즈에 대한 설명"
                rows={3}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingSeries(null) }}>취소</Button>
              <Button onClick={handleCreateSeries} disabled={saving || !seriesTitle.trim()}>
                {saving ? '저장 중...' : editingSeries ? '수정' : '만들기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 문서 추가 다이얼로그 */}
      <Dialog open={showAddDocDialog} onOpenChange={setShowAddDocDialog}>
        <DialogContent className="max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>문서 추가</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] space-y-2 pt-2">
            {availableDocs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">추가 가능한 문서가 없습니다</p>
            ) : (
              availableDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => handleAddDocToSeries(doc.id)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                >
                  <div className="w-10 h-14 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                    {doc.thumbnail_url ? (
                      <img src={doc.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg opacity-20">📄</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">{doc.view_count}회 조회</p>
                  </div>
                  <Plus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
