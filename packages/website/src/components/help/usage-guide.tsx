'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

export function UsageGuide() {
  const t = useTranslations('HelpPage')

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight">{t('guideTitle')}</h2>
      <p className="mb-8 text-muted-foreground">{t('guideSubtitle')}</p>

      <div className="space-y-8">
        {/* Step 1 */}
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            1
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Install Extension</h3>
            <p className="mb-3 text-sm text-muted-foreground">{t('installStep1')}</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            2
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Setup Project</h3>
            <p className="mb-3 text-sm text-muted-foreground">{t('installStep2')}</p>
            <pre className="overflow-x-auto rounded-lg bg-inspector-bg p-4 font-mono text-sm">
              <code>{`git clone https://github.com/user/domlens.git
cd domlens
pnpm install`}</code>
            </pre>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            3
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Start Runtime Server</h3>
            <p className="mb-3 text-sm text-muted-foreground">{t('installStep3')}</p>
            <pre className="overflow-x-auto rounded-lg bg-inspector-bg p-4 font-mono text-sm">
              <code>{`pnpm runtime:start`}</code>
            </pre>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Auto-discovery: ports 4777-4787
              </Badge>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            4
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Configure MCP</h3>
            <p className="mb-3 text-sm text-muted-foreground">{t('installStep4')}</p>
            <pre className="overflow-x-auto rounded-lg bg-inspector-bg p-4 font-mono text-sm">
              <code>{`{
  "mcpServers": {
    "domlens": {
      "command": "node",
      "args": ["src/server/index.ts"],
      "type": "stdio"
    }
  }
}`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
