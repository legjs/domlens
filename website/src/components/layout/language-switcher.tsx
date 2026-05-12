'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() =>
        switchLocale(locale === 'en' ? 'zh' : 'en')
      }
      className="gap-1.5 text-sm"
    >
      <Globe className="h-4 w-4" />
      {locale === 'en' ? '中文' : 'EN'}
    </Button>
  )
}
