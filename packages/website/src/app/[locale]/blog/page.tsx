import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { BlogCard } from '@/components/blog/blog-card'
import { getBlogPosts } from '@/lib/mdx'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'BlogPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
    },
    alternates: {
      canonical: `/${locale}/blog`,
      languages: {
        en: '/en/blog',
        zh: '/zh/blog',
      },
    },
  }
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('BlogPage')
  const posts = getBlogPosts(locale)

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-2xl text-center mb-12">
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
      </div>

      {posts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">No posts yet.</p>
      )}
    </SectionWrapper>
  )
}
