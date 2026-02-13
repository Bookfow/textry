import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  if (!supabaseUrl || !supabaseKey) {
    return {
      title: 'Textry',
      description: 'Textry - 지식을 스트리밍하다',
    }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: doc, error } = await supabase
      .from('documents')
      .select('title, description, thumbnail_url, category, view_count, author_id')
      .eq('id', id)
      .single()

    if (error || !doc) {
      return {
        title: 'Textry',
        description: 'Textry - 지식을 스트리밍하다',
      }
    }

    const { data: author } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', doc.author_id)
      .single()

    const authorName = author?.username || author?.email || '작가'
    const title = `${doc.title} | Textry`
    const description = doc.description || `${authorName}님의 문서 — Textry에서 읽기`
    const ogImage = doc.thumbnail_url || 'https://textry-v1.vercel.app/og-default.png'

    return {
      title,
      description,
      openGraph: {
        title: doc.title,
        description,
        type: 'article',
        siteName: 'Textry',
        images: [
          {
            url: ogImage,
            width: 600,
            height: 800,
            alt: doc.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: doc.title,
        description,
        images: [ogImage],
      },
      other: {
        'article:author': authorName,
      },
    }
  } catch {
    return {
      title: 'Textry',
      description: 'Textry - 지식을 스트리밍하다',
    }
  }
}

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
