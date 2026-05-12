'use client'

import { useTranslations } from 'next-intl'

export function ShortcutsTable() {
  const t = useTranslations('HelpPage')
  const st = useTranslations('Shortcuts')

  const shortcuts = [
    { action: st('inspectElement'), key: st('inspectShortcut') },
    { action: st('selectElement'), key: st('selectShortcut') },
    { action: st('multiSelect'), key: st('multiSelectShortcut') },
    { action: st('closeOverlay'), key: st('closeShortcut') },
  ]

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight">
        {t('shortcutsTitle')}
      </h2>
      <p className="mb-8 text-muted-foreground">{t('shortcutsSubtitle')}</p>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left font-semibold">
                {t('action')}
              </th>
              <th className="px-6 py-3 text-left font-semibold">
                {t('shortcut')}
              </th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map((s, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-6 py-4">{s.action}</td>
                <td className="px-6 py-4">
                  <kbd className="rounded border bg-muted px-2 py-1 font-mono text-xs">
                    {s.key}
                  </kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
