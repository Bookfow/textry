'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReadingListButtonProps {
  documentId: string
}

export function ReadingListButton({ documentId }: ReadingListButtonProps) {
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
        // 읽기 목록에서 제거
        await supabase
          .from('reading_list')
          .delete()
          .eq('user_id', user.id)
          .eq('document_id', documentId)

        setInList(false)
      } else {
        // 읽기 목록에 추가
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
      alert('읽기 목록 처리에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={inList ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2"
    >
      {inList ? (
        <>
          <BookmarkCheck className="w-4 h-4" />
          읽기 목록에 추가됨
        </>
      ) : (
        <>
          <Bookmark className="w-4 h-4" />
          읽기 목록에 추가
        </>
      )}
    </Button>
  )
}