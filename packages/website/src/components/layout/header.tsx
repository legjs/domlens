'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from './language-switcher'
import { Menu, X, Crosshair, Download } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { href: '/' as const, label: t('home') },
    { href: '/help' as const, label: t('help') },
    { href: '/blog' as const, label: t('blog') },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <Crosshair className="h-4 w-4" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">
            Dom<span className="text-primary">Lens</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200
                ${isActive(item.href)
                  ? 'text-primary bg-primary/[0.06]'
                  : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            size="sm"
            className="hidden md:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-medium gap-2 h-9"
          >
            <Download className="h-3.5 w-3.5" />
            {t('install')}
          </Button>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border/40 md:hidden bg-background/95 backdrop-blur-xl">
          <nav className="container mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors
                  ${isActive(item.href)
                    ? 'text-primary bg-primary/[0.06]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                {item.label}
              </Link>
            ))}
            <Button size="sm" className="mt-2 bg-primary text-primary-foreground font-heading">
              {t('install')}
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
