import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { MdxContent } from '@/components/blog/mdx-content'
import { BlogJsonLd } from '@/components/shared/json-ld'
import { getBlogPost, getAllBlogSlugs } from '@/lib/mdx'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAllBlogSlugs(locale).map((slug) => ({ locale, slug }))
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = getBlogPost(locale, slug)

  if (!post) return {}

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
    },
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('BlogPage')
  const post = getBlogPost(locale, slug)

  if (!post) notFound()

  return (
    <>
      <BlogJsonLd
        title={post.title}
        description={post.excerpt}
        date={post.date}
        slug={slug}
      />

      <SectionWrapper className="py-8 md:py-16">
        <Link
          href="/blog"
          className="mb-8 inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('backToBlog')}
        </Link>

        <article className="mx-auto max-w-3xl">
          <header className="mb-8">
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <time dateTime={post.date}>
                {t('publishedOn')}{' '}
                {new Date(post.date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {post.author && (
                <>
                  <span>·</span>
                  <span>{post.author}</span>
                </>
              )}
            </div>
          </header>

          <MdxContent content={post.content} />
        </article>
      </SectionWrapper>
    </>
  )
}
