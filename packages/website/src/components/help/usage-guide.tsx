'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Terminal, Puzzle, Settings, CheckCircle2 } from 'lucide-react'

export function UsageGuide() {
  const t = useTranslations('HelpPage')

  return (
    <div>
      <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight">{t('guideTitle')}</h2>
      <p className="mb-8 text-muted-foreground/70">{t('guideSubtitle')}</p>

      {/* Method A: Natural Language (Recommended) */}
      <div className="mb-10 rounded-2xl border border-primary/20 bg-primary/[0.03] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-semibold text-lg">{t('methodATitle')}</h3>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
            {t('recommended')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground/70 mb-4">{t('methodADesc')}</p>

        <div className="rounded-xl bg-inspector-bg border border-inspector-border/40 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-inspector-dim">{t('methodALabel')}</span>
          </div>
          <pre className="font-mono text-sm text-inspector-primary whitespace-pre-wrap">
            {t('methodACommand')}
          </pre>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground/60 leading-relaxed">{t('methodANote')}</p>
        </div>
      </div>

      {/* Method B: Manual Setup */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <Terminal className="h-5 w-5 text-muted-foreground/60" />
          <h3 className="font-heading font-semibold text-lg">{t('methodBTitle')}</h3>
        </div>

        <div className="space-y-8">
          {/* Step 1: Extension */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-sm font-mono font-bold text-primary">
              1
            </div>
            <div>
              <h4 className="mb-2 font-semibold">{t('installStep1Title')}</h4>
              <p className="text-sm text-muted-foreground/70">{t('installStep1')}</p>
            </div>
          </div>

          {/* Step 2: Runtime */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-sm font-mono font-bold text-primary">
              2
            </div>
            <div>
              <h4 className="mb-2 font-semibold">{t('installStep2Title')}</h4>
              <p className="mb-3 text-sm text-muted-foreground/70">{t('installStep2')}</p>
              <pre className="overflow-x-auto rounded-xl bg-inspector-bg border border-inspector-border/30 p-4 font-mono text-sm">
                <code>{`npx @domlens/runtime`}</code>
              </pre>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-secondary/50">
                  Auto-discovery: ports 4777-4787
                </Badge>
              </div>
            </div>
          </div>

          {/* Step 3: MCP Config */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-sm font-mono font-bold text-primary">
              3
            </div>
            <div>
              <h4 className="mb-2 font-semibold">{t('installStep3Title')}</h4>
              <p className="mb-3 text-sm text-muted-foreground/70">{t('installStep3')}</p>
              <pre className="overflow-x-auto rounded-xl bg-inspector-bg border border-inspector-border/30 p-4 font-mono text-sm">
                <code>{`{
  "mcpServers": {
    "domlens": {
      "command": "npx",
      "args": ["-y", "@domlens/runtime"],
      "type": "stdio"
    }
  }
}`}</code>
              </pre>
            </div>
          </div>

          {/* Step 4: Verify */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-sm font-mono font-bold text-primary">
              4
            </div>
            <div>
              <h4 className="mb-2 font-semibold">{t('installStep4Title')}</h4>
              <p className="text-sm text-muted-foreground/70">{t('installStep4')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compatible Tools */}
      <div className="mt-10 rounded-2xl border border-border/50 bg-card/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Puzzle className="h-5 w-5 text-muted-foreground/60" />
          <h3 className="font-heading font-semibold text-lg">{t('compatibleTitle')}</h3>
        </div>
        <p className="text-sm text-muted-foreground/70 mb-5">{t('compatibleDesc')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: 'Claude Code', config: '~/.claude/settings.json' },
            { name: 'Cursor', config: '.cursor/mcp.json' },
            { name: 'Windsurf', config: '.windsurf/mcp.json' },
            { name: 'VS Code + Cline', config: '.vscode/mcp.json' },
            { name: 'Warp', config: 'Settings → MCP' },
            { name: 'Any MCP Client', config: 'stdio transport' },
          ].map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-3 rounded-xl border border-border/40 px-4 py-3 bg-background/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/10 shrink-0">
                <Settings className="h-4 w-4 text-primary/60" />
              </div>
              <div>
                <div className="text-sm font-medium">{tool.name}</div>
                <div className="text-[11px] text-muted-foreground/50 font-mono">{tool.config}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
