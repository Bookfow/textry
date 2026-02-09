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
  created_at: string
  updated_at: string
}

export type ReadingSession = {
  id: string
  document_id