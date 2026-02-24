import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/json-ld'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const baseUrl = 'https://textreme-v1.vercel.app'

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  if (!supabaseUrl || !supabaseKey) {
    return { title: 'TeXTREME', description: 'TeXTREME - 지식을 스트리밍하다' }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: doc, error } = await supabase
      .from('documents')
      .select('title, description, thumbnail_url, category, view_count, page_count, author_id')
      .eq('id', id)
      .single()

    if (error || !doc) {
      return { title: 'TeXTREME', description: 'TeXTREME - 지식을 스트리밍하다' }
    }

    const { data: author } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', doc.author_id)
      .single()

    const authorName = author?.username || author?.email || '큐레이터'
    const title = `${doc.title} — ${authorName}`
    const description = doc.description
      || `${authorName}님의 ${doc.category || '콘텐츠'} · ${doc.page_count || 0}페이지 · 조회 ${doc.view_count?.toLocaleString() || 0}회 — TeXTREME에서 무료로 읽기`
    const ogImage = doc.thumbnail_url || `${baseUrl}/og-default.png`
    const url = `${baseUrl}/document/${id}`

    return {
      title,
      description,
      openGraph: {
        title: doc.title,
        description,
        type: 'article',
        siteName: 'TeXTREME',
        url,
        images: [{ url: ogImage, width: 600, height: 800, alt: doc.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: doc.title,
        description,
        images: [ogImage],
      },
      alternates: {
        canonical: url,
      },
      other: {
        'article:author': authorName,
        'article:section': doc.category || '',
      },
    }
  } catch {
    return { title: 'TeXTREME', description: 'TeXTREME - 지식을 스트리밍하다' }
  }
}

export default async function DocumentDetailLayout({ params, children }: Props) {
  const { id } = await params

  let jsonLdProps = null

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { data: doc } = await supabase
        .from('documents')
        .select('title, description, thumbnail_url, created_at, updated_at, author_id')
        .eq('id', id)
        .single()

      if (doc) {
        const { data: author } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', doc.author_id)
          .single()

        jsonLdProps = {
          title: doc.title,
          description: doc.description || '',
          authorName: author?.username || author?.email || '큐레이터',
          datePublished: doc.created_at,
          dateModified: doc.updated_at,
          thumbnailUrl: doc.thumbnail_url || undefined,
          url: `${baseUrl}/document/${id}`,
        }
      }
    } catch {}
  }

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: baseUrl },
          { name: '탐색', url: `${baseUrl}/browse` },
          { name: jsonLdProps?.title || '콘텐츠', url: `${baseUrl}/document/${id}` },
        ]}
      />
      {jsonLdProps && <ArticleJsonLd {...jsonLdProps} />}
      {children}
    </>
  )
}
