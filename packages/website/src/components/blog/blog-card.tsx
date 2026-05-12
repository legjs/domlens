import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import type { BlogPost } from '@/lib/mdx'

export function BlogCard({
  post,
  locale,
}: {
  post: BlogPost
  locale: string
}) {
  const t = useTranslations('BlogPage')

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <Card className="h-full transition-all hover:shadow-lg hover:border-primary/20">
        {post.coverImage && (
          <div className="aspect-video rounded-t-lg bg-muted" />
        )}
        <CardHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString(
                locale === 'zh' ? 'zh-CN' : 'en-US',
                { year: 'numeric', month: 'short', day: 'numeric' }
              )}
            </time>
            {post.author && (
              <>
                <span>·</span>
                <span>{post.author}</span>
              </>
            )}
          </div>
          <CardTitle className="text-lg group-hover:text-primary transition-colors">
            {post.title}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {post.excerpt}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-sm text-primary font-medium">
            {t('readMore')}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
