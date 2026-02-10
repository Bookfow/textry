'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReactionButtonsProps {
  documentId: string
  initialLikes: number
  initialDislikes: number
}

export function ReactionButtons({ documentId, initialLikes, initialDislikes }: ReactionButtonsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [likes, setLikes] = useState(initialLikes)
  const [dislikes, setDislikes] = useState(initialDislikes)
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null)
  const [loading, setLoading] = useState(false)

  // 사용자의 기존 반응 확인
  useEffect(() => {
    if (!user) return

    const checkUserReaction = async () => {
      const { data } = await supabase
        .from('document_reactions')
        .select('reaction_type')
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .single()

      if (data) {
        setUserReaction(data.reaction_type as 'like' | 'dislike')
      }
    }

    checkUserReaction()
  }, [user, documentId])

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    setLoading(true)

    try {
      // 이미 같은 반응을 했으면 취소
      if (userReaction === type) {
        await supabase
          .from('document_reactions')
          .delete()
          .eq('document_id', documentId)
          .eq('user_id', user.id)

        setUserReaction(null)
        if (type === 'like') {
          setLikes(likes - 1)
        } else {
          setDislikes(dislikes - 1)
        }
      }
      // 다른 반응으로 변경
      else if (userReaction) {
        await supabase
          .from('document_reactions')
          .update({ reaction_type: type })
          .eq('document_id', documentId)
          .eq('user_id', user.id)

        if (type === 'like') {
          setLikes(likes + 1)
          setDislikes(dislikes - 1)
        } else {
          setLikes(likes - 1)
          setDislikes(dislikes + 1)
        }
        setUserReaction(type)
      }
      // 새로 반응 추가
      else {
        await supabase
          .from('document_reactions')
          .insert({
            document_id: documentId,
            user_id: user.id,
            reaction_type: type,
          })

        setUserReaction(type)
        if (type === 'like') {
          setLikes(likes + 1)
        } else {
          setDislikes(dislikes + 1)
        }
      }
    } catch (err) {
      console.error('Error updating reaction:', err)
      alert('반응 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Button
        variant={userReaction === 'like' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleReaction('like')}
        disabled={loading}
        className={`gap-2 ${userReaction === 'like' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white text-gray-900 border-gray-300'}`}
      >
        <ThumbsUp className={`w-4 h-4 ${userReaction === 'like' ? 'fill-current' : ''}`} />
        <span className="font-semibold">{likes.toLocaleString()}</span>
      </Button>

      <Button
        variant={userReaction === 'dislike' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleReaction('dislike')}
        disabled={loading}
        className={`gap-2 ${userReaction === 'dislike' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-white text-gray-900 border-gray-300'}`}
      >
        <ThumbsDown className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-current' : ''}`} />
        <span className="font-semibold">{dislikes.toLocaleString()}</span>
      </Button>
    </div>
  )
}