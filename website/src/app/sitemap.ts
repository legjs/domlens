import type { MetadataRoute } from 'next'
import { getBlogPosts } from '@/lib/mdx'

export const dynamic = 'force-static'

const baseUrl = 'https://domcontext.dev'
const locales = ['en', 'zh']

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    entries.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    })
    entries.push({
      url: `${baseUrl}/${locale}/help`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
    entries.push({
      url: `${baseUrl}/${locale}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    })

    const posts = getBlogPosts(locale)
    for (const post of posts) {
      entries.push({
        url: `${baseUrl}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  }

  return entries
}
