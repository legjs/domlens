import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Separator } from '@/components/ui/separator'
import { Crosshair, Github } from 'lucide-react'

export function Footer() {
  const t = useTranslations('Footer')

  return (
    <footer className="border-t border-border/40">
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <Crosshair className="h-4 w-4" />
              </div>
              <span className="font-heading text-lg font-bold tracking-tight">
                Dom<span className="text-primary">Lens</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground/60 leading-relaxed">
              AI Runtime DOM Inspector for Chrome.
              <br />
              Bridge the gap between AI agents and the live DOM.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">{t('product')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  {t('features')}
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer">
                  {t('install')}
                </span>
              </li>
              <li>
                <a
                  href="https://github.com/nicepkg/domlens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground/60 hover:text-primary transition-colors"
                >
                  <Github className="h-3.5 w-3.5" />
                  {t('github')}
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">{t('resources')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer">
                  {t('docs')}
                </span>
              </li>
              <li>
                <Link href="/blog" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  {t('blog')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted-foreground/60 hover:text-primary transition-colors">
                  {t('helpCenter')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">{t('legal')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer">
                  {t('privacy')}
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer">
                  {t('terms')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-10 bg-border/40" />

        <p className="text-center text-xs text-muted-foreground/40 font-mono">
          {t('copyright')}
        </p>
      </div>
    </footer>
  )
}
