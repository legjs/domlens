import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download, Github } from 'lucide-react'

export function CtaSection() {
  const t = useTranslations('HomePage')

  return (
    <section className="relative py-24 md:py-36 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>

      <div className="container relative mx-auto max-w-6xl px-4 z-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-5 font-heading text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t('ctaTitle')}
          </h2>
          <p className="mb-10 text-lg text-muted-foreground/80 leading-relaxed">
            {t('ctaSubtitle')}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="gap-2.5 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-heading font-semibold px-8 h-12 text-base"
            >
              <Download className="h-5 w-5" />
              {t('ctaInstall')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2.5 font-heading font-medium px-8 h-12 text-base border-border/60 hover:bg-muted/50"
            >
              <Github className="h-5 w-5" />
              {t('ctaStar')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
