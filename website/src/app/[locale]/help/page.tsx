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

  const faqs = [
    { q: t('faq.0.q'), a: t('faq.0.a') },
    { q: t('faq.1.q'), a: t('faq.1.a') },
    { q: t('faq.2.q'), a: t('faq.2.a') },
    { q: t('faq.3.q'), a: t('faq.3.a') },
    { q: t('faq.4.q'), a: t('faq.4.a') },
    { q: t('faq.5.q'), a: t('faq.5.a') },
    { q: t('faq.6.q'), a: t('faq.6.a') },
    { q: t('faq.7.q'), a: t('faq.7.a') },
  ]

  return (
    <>
      <FaqJsonLd faqs={faqs} />

      {/* Header */}
      <SectionWrapper className="pb-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>
      </SectionWrapper>

      {/* FAQ */}
      <SectionWrapper>
        <FaqSection faqs={faqs} />
      </SectionWrapper>

      {/* Usage Guide */}
      <SectionWrapper className="bg-muted/30">
        <UsageGuide />
      </SectionWrapper>

      {/* Shortcuts */}
      <SectionWrapper>
        <ShortcutsTable />
      </SectionWrapper>
    </>
  )
}
