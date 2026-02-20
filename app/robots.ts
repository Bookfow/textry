import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/read/'],
      },
    ],
    sitemap: 'https://textry-v1.vercel.app/sitemap.xml',
  }
}
