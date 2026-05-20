import { useTranslations } from 'next-intl'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { Badge } from '@/components/ui/badge'
import { FileText, ArrowRight } from 'lucide-react'

export function ContextShowcase() {
  const t = useTranslations('ContextShowcase')

  return (
    <SectionWrapper className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.015] to-transparent" />

      <div className="relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-mono">
            {t('badge')}
          </Badge>
          <h2 className="mb-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="text-lg text-muted-foreground/80">
            {t('subtitle')}
          </p>
        </div>

        {/* Context output preview */}
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-muted/20">
              <FileText className="h-4 w-4 text-primary/60" />
              <span className="text-xs font-mono text-muted-foreground/60">{t('headerLabel')}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-emerald-400/80">{t('headerStatus')}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
              </div>
            </div>

            {/* Content - realistic markdown output */}
            <div className="p-5 md:p-6 font-mono text-sm space-y-3 max-h-[520px] overflow-y-auto">
              <div className="text-primary/90 font-semibold">{t('outputTitle')}</div>

              <div>
                <span className="text-muted-foreground/50">- **{t('fieldTag')}**:</span>{' '}
                <span className="text-amber-400/80">button</span>
              </div>
              <div>
                <span className="text-muted-foreground/50">- **{t('fieldSelector')}**:</span>{' '}
                <span className="text-inspector-primary/80">{t('valueSelector')}</span>
              </div>
              <div>
                <span className="text-muted-foreground/50">- **{t('fieldClass')}**:</span>{' '}
                <span className="text-cyan-300/70">{t('valueClass')}</span>
              </div>
              <div>
                <span className="text-muted-foreground/50">- **{t('fieldText')}**:</span>{' '}
                <span className="text-foreground/80">{t('valueText')}</span>
              </div>
              <div>
                <span className="text-muted-foreground/50">- **{t('fieldSize')}**:</span>{' '}
                <span className="text-foreground/70">{t('valueSize')}</span>
              </div>
              <div>
                <span className="text-muted-foreground/50">- **{t('fieldPosition')}**:</span>{' '}
                <span className="text-foreground/70">{t('valuePosition')}</span>
              </div>

              {/* Computed Styles */}
              <div className="mt-2">
                <span className="text-muted-foreground/50">- **{t('fieldStyles')}**:</span>
              </div>
              <div className="ml-4 space-y-1 text-xs">
                <div><span className="text-muted-foreground/40">display:</span> <span className="text-foreground/60">flex</span></div>
                <div><span className="text-muted-foreground/40">align-items:</span> <span className="text-foreground/60">center</span></div>
                <div><span className="text-muted-foreground/40">padding:</span> <span className="text-foreground/60">12px 24px</span></div>
                <div><span className="text-muted-foreground/40">background:</span> <span className="text-primary/50">#00e5ff</span></div>
                <div><span className="text-muted-foreground/40">border-radius:</span> <span className="text-foreground/60">8px</span></div>
              </div>

              {/* Framework info */}
              <div className="mt-2">
                <span className="text-muted-foreground/50">- **{t('fieldFramework')}**:</span>{' '}
                <span className="text-emerald-400/80">{t('valueFramework')}</span>
              </div>
              <div>
                <span className="text-muted-foreground/50">- **{t('fieldSource')}**:</span>{' '}
                <span className="text-inspector-primary/70">{t('valueSource')}</span>
              </div>

              {/* HTML snippet */}
              <div className="mt-2">
                <span className="text-muted-foreground/50">- **{t('fieldHtml')}**:</span>
              </div>
              <div className="ml-2 rounded-lg bg-inspector-bg/50 border border-inspector-border/20 p-3 text-xs">
                <code className="text-inspector-primary/70">{t('valueHtml')}</code>
              </div>

              {/* Layout chain */}
              <div className="mt-2">
                <span className="text-muted-foreground/50">- **{t('fieldLayout')}**:</span>
              </div>
              <div className="ml-4 space-y-0.5 text-xs">
                <div><span className="text-muted-foreground/40">0:</span> <span className="text-foreground/60">button (flex) 120px</span></div>
                <div><span className="text-muted-foreground/40">1:</span> <span className="text-foreground/60">div (flex) 800px</span></div>
                <div><span className="text-muted-foreground/40">2:</span> <span className="text-foreground/60">section (block) 1200px</span></div>
                <div><span className="text-muted-foreground/40">3:</span> <span className="text-foreground/60">main (block) 1280px</span></div>
              </div>
            </div>

            {/* Footer - AI action */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-border/40 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-mono flex-1">
                <span className="text-muted-foreground/40">{t('footerFlow1')}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                <span className="text-primary/80">{t('footerFlow2')}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                <span className="text-emerald-400/80">{t('footerFlow3')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
