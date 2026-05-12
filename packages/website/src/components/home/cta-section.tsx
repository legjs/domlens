import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download, Github } from 'lucide-react'

export function CtaSection() {
  const t = useTranslations('HomePage')

  return (
    <section className="relative py-20 md:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
      <div className="container relative mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {t('ctaTitle')}
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            {t('ctaSubtitle')}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              {t('ctaInstall')}
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Github className="h-5 w-5" />
              {t('ctaStar')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
