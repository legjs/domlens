import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download, Github } from 'lucide-react'

export function HeroSection() {
  const t = useTranslations('HomePage')

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />

      <div className="container relative mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Chrome Extension + MCP Server
          </div>

          {/* Title */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t('heroTitle')}{' '}
            <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              {t('heroTitleHighlight')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-lg text-muted-foreground md:text-xl">
            {t('heroSubtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              {t('ctaInstall')}
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Github className="h-5 w-5" />
              {t('ctaGithub')}
            </Button>
          </div>

          {/* Hero visual */}
          <div className="mt-16 rounded-xl border bg-card/50 p-2 shadow-2xl backdrop-blur-sm">
            <div className="rounded-lg border bg-inspector-bg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-inspector-primary font-mono">
                  DomLens Inspector
                </span>
              </div>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-inspector-primary">&lt;header&gt;</span>
                  <div className="flex-1 h-8 rounded border border-inspector-primary/30 bg-inspector-surface flex items-center px-3">
                    <span className="text-xs text-inspector-primary">nav.navbar</span>
                  </div>
                  <span className="text-xs text-muted-foreground">320 x 64</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-inspector-primary">&lt;main&gt;</span>
                  <div className="flex-1 h-24 rounded border border-inspector-primary/30 bg-inspector-surface flex items-center justify-center">
                    <span className="text-xs text-inspector-primary">
                      hero.section
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">1200 x 480</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-inspector-primary">&lt;div&gt;</span>
                  <div className="flex-1 h-16 rounded border border-inspector-primary/30 bg-inspector-surface" />
                  <span className="text-xs text-muted-foreground">1200 x 200</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded bg-inspector-surface px-3 py-2">
                <span className="text-xs text-inspector-primary font-mono">
                  MCP: get_latest_context → Claude Code → AI Response
                </span>
                <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
