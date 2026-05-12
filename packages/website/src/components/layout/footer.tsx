import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  const t = useTranslations('Footer')

  return (
    <footer className="border-t">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                DL
              </div>
              <span className="text-lg font-bold">DomLens</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI Runtime DOM Inspector for Chrome
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t('product')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  {t('features')}
                </Link>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {t('install')}
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {t('github')}
                </span>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t('resources')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {t('docs')}
                </span>
              </li>
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  {t('blog')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-foreground transition-colors">
                  {t('helpCenter')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t('legal')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {t('privacy')}
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {t('terms')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-center text-sm text-muted-foreground">
          {t('copyright')}
        </p>
      </div>
    </footer>
  )
}
