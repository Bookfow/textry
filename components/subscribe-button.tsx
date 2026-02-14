'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Bell, BellOff } from 'lucide-react'

interface SubscribeButtonProps {
  authorId: string
  authorName: string
  initialSubscribed?: boolean
  initialSubscribersCount: number
}

export function SubscribeButton({ 
  authorId, 
  authorName, 
  initialSubscribed = false,
  initialSubscribersCount 
}: SubscribeButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed)
  const [subscribersCount, setSubscribersCount] = useState(initialSubscribersCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || user.id === authorId) return

    const checkSubscription = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('subscriber_id', user.id)
        .eq('author_id', authorId)
        .single()

      setIsSubscribed(!!data)
    }

    checkSubscription()
  }, [user, authorId])

  const handleSubscribe = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (user.id === authorId) {
      alert('자기 자신을 구독할 수 없습니다.')
      return
    }

    setLoading(true)

    try {
      if (isSubscribed) {
        await supabase
          .from('subscriptions')
          .delete()
          .eq('subscriber_id', user.id)
          .eq('author_id', authorId)

        setIsSubscribed(false)
        setSubscribersCount(subscribersCount - 1)
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            subscriber_id: user.id,
            author_id: authorId,
          })

        setIsSubscribed(true)
        setSubscribersCount(subscribersCount + 1)
      }
    } catch (err) {
      console.error('Error updating subscription:', err)
      alert('구독 처리에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (user?.id === authorId) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Bell className="w-4 h-4" aria-hidden="true" />
        <span>구독자 {subscribersCount.toLocaleString()}명</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={isSubscribed ? 'secondary' : 'default'}
        size="sm"
        onClick={handleSubscribe}
        disabled={loading}
        className={`gap-2 ${isSubscribed ? 'bg-gray-600 text-white hover:bg-gray-700' : ''}`}
        aria-label={isSubscribed ? `${authorName} 구독 취소` : `${authorName} 구독`}
        aria-pressed={isSubscribed}
      >
        {isSubscribed ? (
          <>
            <BellOff className="w-4 h-4" aria-hidden="true" />
            <span className="text-white">구독 중</span>
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" aria-hidden="true" />
            구독
          </>
        )}
      </Button>
      <span className="text-sm text-gray-300" aria-live="polite">
        구독자 {subscribersCount.toLocaleString()}명
      </span>
    </div>
  )
}
