import { useTranslations } from 'next-intl'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { Download, MousePointer, Bot } from 'lucide-react'

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
    <SectionWrapper className="bg-muted/30">
      <div className="mx-auto max-w-2xl text-center mb-12">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t('howItWorksTitle')}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t('howItWorksSubtitle')}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <div key={index} className="relative text-center">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute top-12 left-1/2 hidden h-px w-full bg-border md:block" />
              )}

              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/10" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background text-xs font-bold text-primary border">
                  {step.number}
                </span>
              </div>

              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          )
        })}
      </div>
    </SectionWrapper>
  )
}
