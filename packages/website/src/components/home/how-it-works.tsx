import { useTranslations } from 'next-intl'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { Download, MousePointer, Bot, ArrowRight } from 'lucide-react'

export function HowItWorksSection() {
  const t = useTranslations('HomePage')

  const steps = [
    {
      icon: Download,
      number: '01',
      title: t('step1Title'),
      description: t('step1Desc'),
    },
    {
      icon: MousePointer,
      number: '02',
      title: t('step2Title'),
      description: t('step2Desc'),
    },
    {
      icon: Bot,
      number: '03',
      title: t('step3Title'),
      description: t('step3Desc'),
    },
  ]

  return (
    <SectionWrapper className="relative bg-muted/20">
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="mb-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-lg text-muted-foreground/80">
            {t('howItWorksSubtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 stagger-children">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative text-center group">
                {/* Step circle */}
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-primary/[0.06] rotate-6 group-hover:rotate-3 transition-transform duration-300" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-mono font-bold text-primary">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-2 font-heading text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow between steps (desktop) */}
                {index < steps.length - 1 && (
                  <div className="absolute top-10 -right-4 hidden md:flex">
                    <ArrowRight className="h-4 w-4 text-border" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </SectionWrapper>
  )
}
