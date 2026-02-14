'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReadingListButtonProps {
  documentId: string
  compact?: boolean
}

export function ReadingListButton({ documentId, compact = false }: ReadingListButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [inList, setInList] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    checkInList()
  }, [user, documentId])

  const checkInList = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('reading_list')
        .select('id')
        .eq('user_id', user.id)
        .eq('document_id', documentId)
        .single()
      setInList(!!data)
    } catch (err) {
      // 없으면 에러 발생 (정상)
    }
  }

  const handleToggle = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    setLoading(true)
    try {
      if (inList) {
        await supabase
          .from('reading_list')
          .delete()
          .eq('user_id', user.id)
          .eq('document_id', documentId)
        setInList(false)
      } else {
        await supabase
          .from('reading_list')
          .insert({
            user_id: user.id,
            document_id: documentId,
          })
        setInList(true)
      }
    } catch (err) {
      console.error('Error toggling reading list:', err)
      alert('처리에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 상단 바용 컴팩트 모드
  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`p-2 rounded-lg transition-colors ${
          inList
            ? 'text-red-500 hover:bg-gray-800'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
        aria-label={inList ? '읽기 목록에서 제거' : '읽기 목록에 추가'}
        aria-pressed={inList}
      >
        <Heart className="w-5 h-5" fill={inList ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    )
  }

  // 사이드 패널용 기본 모드
  return (
    <Button
      variant={inList ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={`gap-2 ${inList ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white text-gray-900 border-gray-300'}`}
      aria-label={inList ? '읽기 목록에서 제거' : '읽기 목록에 추가'}
      aria-pressed={inList}
    >
      <Heart className="w-4 h-4" fill={inList ? 'currentColor' : 'none'} aria-hidden="true" />
      <span className="font-semibold">{inList ? '찜함' : '찜하기'}</span>
    </Button>
  )
}
