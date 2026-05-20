import { useTranslations } from 'next-intl'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { MousePointerClick, FileCode2, Bot, Wrench, RefreshCw } from 'lucide-react'

const steps = [
  { key: 'select', icon: MousePointerClick, color: 'text-primary' },
  { key: 'context', icon: FileCode2, color: 'text-cyan-300' },
  { key: 'ai', icon: Bot, color: 'text-emerald-400' },
  { key: 'patch', icon: Wrench, color: 'text-amber-400' },
  { key: 'refresh', icon: RefreshCw, color: 'text-primary' },
] as const

export function WorkflowSection() {
  const t = useTranslations('Workflow')

  return (
    <SectionWrapper className="relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />

      <div className="relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="mb-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="text-lg text-muted-foreground/80">
            {t('subtitle')}
          </p>
        </div>

        {/* Desktop: horizontal flow */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between max-w-5xl mx-auto">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.key} className="flex items-start gap-3 flex-1">
                  {/* Step */}
                  <div className="flex flex-col items-center text-center flex-1">
                    <div className="relative mb-4">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border/60 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.05]`}>
                        <Icon className={`h-7 w-7 ${step.color}`} />
                      </div>
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-mono font-bold text-primary border border-primary/20">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-sm mb-1.5">{t(`${step.key}.title`)}</h3>
                    <p className="text-xs text-muted-foreground/70 max-w-[140px] leading-relaxed">{t(`${step.key}.desc`)}</p>
                  </div>

                  {/* Arrow connector */}
                  {i < steps.length - 1 && (
                    <div className="flex items-center pt-8 -mx-1">
                      <div className="w-12 h-px bg-gradient-to-r from-border to-border/30 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent border-l-border/60" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Loop indicator */}
          <div className="mt-10 flex justify-center">
            <div className="flex items-center gap-3 rounded-full border border-primary/15 bg-primary/[0.04] px-6 py-2.5">
              <RefreshCw className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-sm font-mono text-primary/80">{t('loopLabel')}</span>
            </div>
          </div>
        </div>

        {/* Mobile: vertical flow */}
        <div className="md:hidden space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.key} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card border border-border/60 shrink-0">
                    <Icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px h-6 bg-border/60 mt-2" />
                  )}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-primary/60">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="font-heading font-semibold text-sm">{t(`${step.key}.title`)}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">{t(`${step.key}.desc`)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </SectionWrapper>
  )
}
