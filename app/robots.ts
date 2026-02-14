import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/settings', '/api/', '/auth/'],
      },
    ],
    sitemap: 'https://textry-v1.vercel.app/sitemap.xml',
  }
}
