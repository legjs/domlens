import { useTranslations } from 'next-intl'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { Badge } from '@/components/ui/badge'

const toolKeys = [
  'getLatestContext',
  'getPrompt',
  'listContexts',
  'clearContexts',
  'getUserPrompt',
] as const

export function McpSection() {
  const t = useTranslations('HomePage')
  const tt = useTranslations('McpTools')

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-2xl text-center mb-12">
        <Badge className="mb-4" variant="secondary">MCP Protocol</Badge>
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t('mcpTitle')}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t('mcpSubtitle')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Config example */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            .mcp.json
          </h3>
          <pre className="overflow-x-auto rounded-lg bg-inspector-bg p-4 font-mono text-sm">
            <code>{`{
  "mcpServers": {
    "dom-context": {
      "command": "node",
      "args": ["path/to/server/index.ts"],
      "type": "stdio"
    }
  }
}`}</code>
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            {t('mcpDesc')}
          </p>
        </div>

        {/* Tools list */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t('mcpTools')}
          </h3>
          <div className="space-y-3">
            {toolKeys.map((key) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <code className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                  {tt(`${key}.name`)}
                </code>
                <span className="text-sm text-muted-foreground">
                  {tt(`${key}.desc`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
