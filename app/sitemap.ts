import { createClient } from '@supabase/supabase-js'
import { MetadataRoute } from 'next'

const baseUrl = 'https://textry-v1.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return staticPages

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 최근 문서 1000개
    const { data: docs } = await supabase
      .from('documents')
      .select('id, updated_at, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    const documentPages: MetadataRoute.Sitemap = (docs || []).map((doc) => ({
      url: `${baseUrl}/document/${doc.id}`,
      lastModified: new Date(doc.updated_at || doc.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // 작가 프로필
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .gt('documents_count', 0)
      .order('subscribers_count', { ascending: false })
      .limit(500)

    const profilePages: MetadataRoute.Sitemap = (profiles || []).map((p) => ({
      url: `${baseUrl}/profile/${p.id}`,
      lastModified: new Date(p.updated_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))

    return [...staticPages, ...documentPages, ...profilePages]
  } catch {
    return staticPages
  }
}
