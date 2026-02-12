import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export type Profile = {
  id: string
  email: string
  username: string | null
  avatar_url: string | null
  bio: string
  banner_url: string | null
  role: 'reader' | 'author'
  subscribers_count: number
  is_premium: boolean
  premium_expires_at: string | null
  author_tier: number
  total_revenue_usd: number
  pending_payout_usd: number
  created_at: string
}
export type Document = {
  id: string
  title: string
  description: string | null
  category: string
  language: string
  file_path: string
  thumbnail_url: string | null
  author_id: string
  file_size: number
  total_reading_time: number
  view_count: number
  likes_count: number
  dislikes_count: number
  is_published: boolean
  created_at: string
  updated_at: string
}
export type Comment = {
  id: string
  document_id: string
  user_id: string
  content: string
  parent_id: string | null
  likes_count: number
  created_at: string
}
export type CommentWithProfile = Comment & {
  profile: Profile
  replies?: CommentWithProfile[]
}
export type ReadingProgress = {
  id: string
  user_id: string
  document_id: string
  progress: number
  last_position: number
  updated_at: string
}
export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}
