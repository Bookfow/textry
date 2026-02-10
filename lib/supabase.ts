import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 타입 정의
export type Profile = {
  id: string
  email: string
  username: string | null
  role: 'author' | 'reader'
  subscribers_count: number
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  author_id: string
  title: string
  description: string | null
  file_path: string
  file_size: number | null
  page_count: number | null
  cover_image_url: string | null
  category: string | null
  is_published: boolean
  view_count: number
  total_reading_time: number
  likes_count: number
  dislikes_count: number
  comments_count: number
  created_at: string
  updated_at: string
}

export type ReadingSession = {
  id: string
  document_id: string
  reader_id: string
  reading_time: number
  current_page: number
  completed: boolean
  started_at: string
  last_read_at: string
}

export type DocumentReaction = {
  id: string
  document_id: string
  user_id: string
  reaction_type: 'like' | 'dislike'
  created_at: string
  updated_at: string
}

export type Subscription = {
  id: string
  subscriber_id: string
  author_id: string
  created_at: string
}

export type Comment = {
  id: string
  document_id: string
  user_id: string
  parent_id: string | null
  content: string
  likes_count: number
  created_at: string
  updated_at: string
}

export type CommentLike = {
  id: string
  comment_id: string
  user_id: string
  created_at: string
}

export type CommentWithProfile = Comment & {
  profile: Profile
  replies?: CommentWithProfile[]
}