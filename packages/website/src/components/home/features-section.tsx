import { useTranslations } from 'next-intl'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Search,
  Layers,
  Plug,
  Minimize2,
  PanelRight,
  Wifi,
  Code2,
  MessageSquare,
  Zap,
} from 'lucide-react'

const featureIcons = {
  inspector: Search,
  multiSelect: Layers,
  mcp: Plug,
  compression: Minimize2,
  panel: PanelRight,
  autoDiscovery: Wifi,
  frameworkAware: Code2,
  inlinePrompt: MessageSquare,
  livePatch: Zap,
} as const

const featureKeys = [
  'inspector',
  'multiSelect',
  'frameworkAware',
  'mcp',
  'compression',
  'inlinePrompt',
  'panel',
  'livePatch',
  'autoDiscovery',
] as const

export function FeaturesSection() {
  const t = useTranslations('HomePage')
  const ft = useTranslations('Features')

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-2xl text-center mb-16">
        <h2 className="mb-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {t('featuresTitle')}
        </h2>
        <p className="text-lg text-muted-foreground/80">
          {t('featuresSubtitle')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {featureKeys.map((key) => {
          const Icon = featureIcons[key]
          const isHighlight = key === 'frameworkAware' || key === 'livePatch'
          return (
            <Card
              key={key}
              className={`group relative overflow-hidden transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm
                ${isHighlight ? 'border-primary/20 hover:border-primary/40' : 'hover:border-primary/20'}
                hover:shadow-lg hover:shadow-primary/[0.03] hover:-translate-y-0.5`}
            >
              {isHighlight && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
              )}
              <CardHeader className="relative">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300
                  ${isHighlight
                    ? 'bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                    : 'bg-primary/10 text-primary/80 group-hover:bg-primary/15 group-hover:text-primary'
                  }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-heading">{ft(`${key}.title`)}</CardTitle>
                <CardDescription className="text-muted-foreground/70">{ft(`${key}.description`)}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </SectionWrapper>
  )
}
