'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download, Github, ArrowRight, Copy, Puzzle, Terminal } from 'lucide-react'

export function HeroSection() {
  const t = useTranslations('HomePage')

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Multi-layer background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent" />
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[800px] w-[800px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full bg-accent/[0.03] blur-[100px]" />
      </div>

      <div className="container relative mx-auto max-w-6xl px-4 z-10">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/[0.06] px-5 py-2 text-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-primary/90 font-medium">Chrome Extension + MCP Server</span>
          </div>

          {/* Title */}
          <h1 className="mb-6 font-heading text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl leading-[1.1]">
            <span className="block">{t('heroTitle')}</span>
            <span className="block mt-2 bg-gradient-to-r from-primary via-cyan-300 to-primary bg-clip-text text-transparent gradient-animate">
              {t('heroTitleHighlight')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-lg text-muted-foreground/80 md:text-xl max-w-2xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>

          {/* Dual Install Steps */}
          <div className="mx-auto max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Step 1: Extension */}
              <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 text-left hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Puzzle className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider">{t('installStep1Label')}</span>
                </div>
                <h3 className="font-heading font-semibold text-sm mb-2">{t('installStep1Title')}</h3>
                <p className="text-xs text-muted-foreground/60 mb-4 leading-relaxed">{t('installStep1Desc')}</p>
                <Button
                  size="sm"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-medium gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('installStep1Btn')}
                </Button>
              </div>

              {/* Step 2: MCP */}
              <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] backdrop-blur-sm p-5 text-left hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider">{t('installStep2Label')}</span>
                </div>
                <h3 className="font-heading font-semibold text-sm mb-2">{t('installStep2Title')}</h3>
                <p className="text-xs text-muted-foreground/60 mb-3 leading-relaxed">{t('installStep2Desc')}</p>
                <div className="rounded-lg bg-inspector-bg border border-inspector-border/30 px-3 py-2.5 flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-inspector-primary whitespace-pre-wrap leading-relaxed">
                    {t('installHintCommand')}
                  </code>
                  <button
                    className="shrink-0 flex h-6 w-6 items-center justify-center rounded bg-inspector-surface border border-inspector-border/50 text-inspector-dim hover:text-inspector-primary transition-colors"
                    title="Copy"
                    onClick={() => navigator.clipboard?.writeText(t('installHintCopy'))}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary link */}
            <div className="mt-5">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground/50 hover:text-foreground/80"
              >
                <Github className="h-4 w-4" />
                {t('ctaGithub')}
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Inspector Visual */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 -m-8 rounded-3xl bg-primary/[0.03] blur-3xl" />
          <div className="relative rounded-2xl border border-border/60 bg-card/80 p-1.5 shadow-2xl backdrop-blur-sm glow-primary-lg overflow-hidden">
            <div className="rounded-xl bg-inspector-bg p-6 md:p-8 scanlines relative overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center gap-2 mb-6">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs text-inspector-dim font-mono">
                  DomLens Inspector — localhost:3000
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] font-mono text-inspector-dim bg-inspector-surface px-2 py-0.5 rounded">
                    MCP Connected
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* DOM tree visualization */}
              <div className="space-y-2.5 font-mono text-sm stagger-children">
                <div className="flex items-center gap-3 group">
                  <div className="w-20 shrink-0 text-inspector-dim text-xs">3:12</div>
                  <span className="text-inspector-primary/70">&lt;header</span>
                  <span className="text-amber-400/60 text-xs">className="site-nav"</span>
                  <span className="text-inspector-primary/70">&gt;</span>
                  <div className="flex-1 h-8 rounded border border-inspector-primary/20 bg-inspector-primary/[0.03] flex items-center px-3 group-hover:border-inspector-primary/40 transition-colors">
                    <span className="text-xs text-inspector-primary/60">nav.main-nav</span>
                    <span className="ml-auto text-[10px] text-inspector-dim">1280 × 64</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 group relative">
                  <div className="w-20 shrink-0 text-inspector-dim text-xs">4:8</div>
                  <span className="text-inspector-primary/70">&lt;main</span>
                  <span className="text-amber-400/60 text-xs">id="app"</span>
                  <span className="text-inspector-primary/70">&gt;</span>
                  <div className="flex-1 h-24 rounded border border-primary/30 bg-primary/[0.04] flex flex-col items-center justify-center relative group-hover:border-primary/50 transition-colors">
                    <span className="text-xs text-inspector-primary font-medium">section.hero</span>
                    <span className="text-[10px] text-inspector-dim mt-1">React Component</span>
                    <div className="absolute -top-2.5 -left-2.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5">
                      <span className="text-[10px] font-bold text-inspector-bg">A</span>
                    </div>
                    <span className="absolute top-1 right-2 text-[10px] text-inspector-dim">1200 × 480</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 group relative">
                  <div className="w-20 shrink-0 text-inspector-dim text-xs">5:24</div>
                  <span className="text-inspector-primary/70">&lt;button</span>
                  <span className="text-amber-400/60 text-xs">class="cta"</span>
                  <span className="text-inspector-primary/70">&gt;</span>
                  <div className="flex-1 h-12 rounded border border-amber-400/20 bg-amber-400/[0.03] flex items-center px-4 group-hover:border-amber-400/40 transition-colors">
                    <span className="text-xs text-amber-400/70">Submit</span>
                    <div className="absolute -top-2.5 -left-2.5 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5">
                      <span className="text-[10px] font-bold text-inspector-bg">B</span>
                    </div>
                    <span className="ml-auto text-[10px] text-inspector-dim">120 × 40</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-20 shrink-0 text-inspector-dim text-xs">6:1</div>
                  <span className="text-inspector-primary/70">&lt;footer&gt;</span>
                  <div className="flex-1 h-10 rounded border border-inspector-border bg-inspector-surface/50" />
                </div>
              </div>

              {/* Bottom bar - MCP flow */}
              <div className="mt-6 flex items-center gap-3 rounded-lg bg-inspector-surface/80 px-4 py-3 border border-inspector-border/50">
                <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                  <span className="text-inspector-dim">MCP</span>
                  <span className="text-inspector-primary">get_latest_context</span>
                  <ArrowRight className="h-3 w-3 text-inspector-dim" />
                  <span className="text-emerald-400">AI Agent</span>
                  <ArrowRight className="h-3 w-3 text-inspector-dim" />
                  <span className="text-amber-400">apply_patch</span>
                  <ArrowRight className="h-3 w-3 text-inspector-dim" />
                  <span className="text-inspector-primary">HMR Refresh</span>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
