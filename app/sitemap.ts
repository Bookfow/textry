import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://textry-v1.vercel.app'

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/home`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/premium`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/policies/about`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/policies/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/policies/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/policies/copyright`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/policies/safety`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // 동적 페이지 - 문서
  let documentPages: MetadataRoute.Sitemap = []
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: docs } = await supabase
      .from('documents')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5000)

    if (docs) {
      documentPages = docs.map((doc) => ({
        url: `${baseUrl}/document/${doc.id}`,
        lastModified: new Date(doc.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    }
  } catch (err) {
    console.error('Sitemap: Error fetching documents:', err)
  }

  // 동적 페이지 - 작가 프로필
  let authorPages: MetadataRoute.Sitemap = []
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (authors) {
      authorPages = authors.map((author) => ({
        url: `${baseUrl}/profile/${author.id}`,
        lastModified: new Date(author.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    }
  } catch (err) {
    console.error('Sitemap: Error fetching authors:', err)
  }

  return [...staticPages, ...documentPages, ...authorPages]
}
