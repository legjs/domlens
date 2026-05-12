import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  author?: string
  coverImage?: string
  content: string
}

const blogDir = path.join(process.cwd(), 'src/content/blog')

export function getBlogPosts(locale: string): BlogPost[] {
  const dir = path.join(blogDir, locale)

  if (!fs.existsSync(dir)) return []

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'))

  const posts = files.map((filename) => {
    const filePath = path.join(dir, filename)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(fileContent)

    return {
      slug: filename.replace(/\.mdx$/, ''),
      title: data.title || '',
      date: data.date || '',
      excerpt: data.excerpt || '',
      author: data.author,
      coverImage: data.coverImage,
      content,
    }
  })

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export function getBlogPost(locale: string, slug: string): BlogPost | null {
  const filePath = path.join(blogDir, locale, `${slug}.mdx`)

  if (!fs.existsSync(filePath)) return null

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)

  return {
    slug,
    title: data.title || '',
    date: data.date || '',
    excerpt: data.excerpt || '',
    author: data.author,
    coverImage: data.coverImage,
    content,
  }
}

export function getAllBlogSlugs(locale: string): string[] {
  const dir = path.join(blogDir, locale)

  if (!fs.existsSync(dir)) return []

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))
}
