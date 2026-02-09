import { createClient } from '@supabase/supabase-js'

// 임시: 환경변수가 안 먹히므로 직접 하드코딩 (테스트용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qurknvhesqtuivipdyyu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cmtudmhlc3F0dWl2aXBkeXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTE2OTMsImV4cCI6MjA4NjEyNzY5M30.GFlt2rmzZndjyD0CvnXFNTcjgbJx7xVClsCg-rFo9QE'

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
  document_id: string
  reader_id: string
  reading_time: number
  current_page: number
  completed: boolean
  started_at: string
  last_read_at: string
}