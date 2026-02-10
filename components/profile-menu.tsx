'use client'

import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function ProfileMenu() {
  const { user, profile } = useAuth()
  const router = useRouter()

  if (!user || !profile) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // 프로필 이니셜 (첫 글자)
  const initial = (profile.username || profile.email)[0].toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold hover:opacity-80"
        >
          {initial}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <p className="font-semibold">{profile.username || profile.email}</p>
          <p className="text-xs text-gray-500">{profile.email}</p>
          <p className="text-xs text-gray-400 mt-1">
            {profile.role === 'author' ? '작가' : '독자'}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/profile/${user.id}`} className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            내 프로필
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}