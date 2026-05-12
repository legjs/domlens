import { useTranslations } from 'next-intl'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Layers,
  Plug,
  Minimize2,
  PanelRight,
  Wifi,
} from 'lucide-react'

const featureIcons = {
  inspector: Search,
  multiSelect: Layers,
  mcp: Plug,
  compression: Minimize2,
  panel: PanelRight,
  autoDiscovery: Wifi,
}

const featureKeys = [
  'inspector',
  'multiSelect',
  'mcp',
  'compression',
  'panel',
  'autoDiscovery',
] as const

export function FeaturesSection() {
  const t = useTranslations('HomePage')
  const ft = useTranslations('Features')

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-2xl text-center mb-12">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t('featuresTitle')}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t('featuresSubtitle')}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featureKeys.map((key) => {
          const Icon = featureIcons[key]
          return (
            <Card
              key={key}
              className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
            >
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{ft(`${key}.title`)}</CardTitle>
                <CardDescription>{ft(`${key}.description`)}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </SectionWrapper>
  )
}
