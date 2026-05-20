import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { FaqSection } from '@/components/help/faq-section'
import { UsageGuide } from '@/components/help/usage-guide'
import { ShortcutsTable } from '@/components/help/shortcuts-table'
import { FaqJsonLd } from '@/components/shared/json-ld'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'HelpPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
    },
    alternates: {
      canonical: `/${locale}/help`,
      languages: {
        en: '/en/help',
        zh: '/zh/help',
      },
    },
  }
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HelpPage')

  const faqs = Array.from({ length: 10 }, (_, i) => ({
    q: t(`faq.${i}.q`),
    a: t(`faq.${i}.a`),
  }))

  return (
    <>
      <FaqJsonLd faqs={faqs} />

      {/* Header */}
      <SectionWrapper className="pb-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground/70">{t('subtitle')}</p>
        </div>
      </SectionWrapper>

      {/* Usage Guide (now includes natural language install) */}
      <SectionWrapper>
        <UsageGuide />
      </SectionWrapper>

      {/* FAQ */}
      <SectionWrapper className="bg-muted/20">
        <FaqSection faqs={faqs} />
      </SectionWrapper>

      {/* Shortcuts */}
      <SectionWrapper>
        <ShortcutsTable />
      </SectionWrapper>
    </>
  )
}
