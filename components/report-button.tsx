'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const REPORT_REASONS = [
  { value: 'copyright', label: '저작권 침해', desc: '저작권자의 허가 없이 업로드된 콘텐츠' },
  { value: 'inappropriate', label: '부적절한 콘텐츠', desc: '폭력적, 선정적 또는 혐오 콘텐츠' },
  { value: 'spam', label: '스팸 / 악성 콘텐츠', desc: '광고, 피싱, 악성코드 등' },
  { value: 'misinformation', label: '허위 정보', desc: '의도적으로 잘못된 정보를 포함' },
  { value: 'other', label: '기타', desc: '위 항목에 해당하지 않는 사유' },
]

interface ReportButtonProps {
  documentId: string
  compact?: boolean
}

export function ReportButton({ documentId, compact = false }: ReportButtonProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!user || !reason) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          document_id: documentId,
          reporter_id: user.id,
          reason,
          detail: detail.trim() || null,
          status: 'pending',
        })
      if (error) throw error
      setSubmitted(true)
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setReason('')
        setDetail('')
      }, 2000)
    } catch (err) {
      console.error('Report error:', err)
      alert('신고 접수에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="콘텐츠 신고"
        >
          <Flag className="w-4 h-4" aria-hidden="true" />
        </button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-gray-500 hover:text-red-500 gap-1" aria-label="콘텐츠 신고">
          <Flag className="w-4 h-4" aria-hidden="true" />
          신고
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[60]" aria-describedby="report-desc">
          <DialogHeader>
            <DialogTitle>콘텐츠 신고</DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-8" role="status">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <Flag className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">신고가 접수되었습니다</h3>
              <p className="text-sm text-gray-500">검토 후 적절한 조치를 취하겠습니다</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-500" id="report-desc">
                이 콘텐츠를 신고하는 이유를 선택해주세요.
              </p>

              <fieldset className="space-y-2" aria-label="신고 사유 선택">
                {REPORT_REASONS.map(r => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reason === r.value
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5"
                      aria-describedby={`reason-desc-${r.value}`}
                    />
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-gray-500" id={`reason-desc-${r.value}`}>{r.desc}</p>
                    </div>
                  </label>
                ))}
              </fieldset>

              <div>
                <label htmlFor="report-detail" className="text-sm font-medium text-gray-700">상세 내용 (선택)</label>
                <textarea
                  id="report-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="추가 설명이 있다면 입력해주세요"
                  rows={3}
                  maxLength={500}
                  className="w-full mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  aria-describedby="report-detail-count"
                />
                <p className="text-xs text-gray-400 text-right" id="report-detail-count" aria-live="polite">{detail.length}/500</p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!reason || submitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  aria-busy={submitting}
                >
                  {submitting ? '접수 중...' : '신고하기'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
