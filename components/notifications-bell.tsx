'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, Notification } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Bell, MessageSquare, Heart, UserPlus, DollarSign,
  Award, FileText, Crown, CheckCheck,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'comment': return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50' }
    case 'reply': return { icon: MessageSquare, color: 'text-cyan-500', bg: 'bg-cyan-50' }
    case 'like': return { icon: Heart, color: 'text-red-500', bg: 'bg-red-50' }
    case 'subscribe': return { icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-50' }
    case 'revenue': return { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' }
    case 'tier': return { icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' }
    case 'new_document': return { icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' }
    case 'premium': return { icon: Crown, color: 'text-orange-500', bg: 'bg-orange-50' }
    default: return { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' }
  }
}

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}주 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function NotificationsBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 10000)
    return () => clearInterval(interval)
  }, [user])

  const loadNotifications = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id)
      loadNotifications()
    }
    if (notification.link) router.push(notification.link)
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    loadNotifications()
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label={unreadCount > 0 ? `알림 ${unreadCount}개 읽지 않음` : '알림'}>
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" aria-hidden="true">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0" aria-label="알림 목록">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-bold text-base">알림</span>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline flex items-center gap-1" aria-label="모든 알림 읽음 처리">
              <CheckCheck className="w-3 h-3" aria-hidden="true" /> 모두 읽음
            </button>
          )}
        </div>

        {/* 알림 목록 */}
        {notifications.length === 0 ? (
          <div className="p-8 text-center" role="status">
            <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-gray-400">알림이 없습니다</p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto" role="list" aria-label="알림 목록">
            {notifications.map((notification) => {
              const { icon: Icon, color, bg } = getNotificationIcon(notification.type)
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer rounded-none border-b border-gray-50 ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                  role="listitem"
                  aria-label={`${notification.title} - ${getTimeAgo(notification.created_at)}${!notification.is_read ? ' (읽지 않음)' : ''}`}
                >
                  {/* 아이콘 */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`} aria-hidden="true">
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notification.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{getTimeAgo(notification.created_at)}</p>
                  </div>

                  {/* 읽지 않음 표시 */}
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" aria-hidden="true" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
