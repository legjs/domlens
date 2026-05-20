import { useTranslations } from 'next-intl'
import { SectionWrapper } from '@/components/shared/section-wrapper'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import { Settings, ArrowRight } from 'lucide-react'

const tools = [
  { name: 'Claude Code', config: '~/.claude/settings.json', color: 'from-orange-500/10 to-orange-600/5' },
  { name: 'Cursor', config: '.cursor/mcp.json', color: 'from-blue-500/10 to-blue-600/5' },
  { name: 'Windsurf', config: '.windsurf/mcp.json', color: 'from-teal-500/10 to-teal-600/5' },
  { name: 'VS Code + Cline', config: '.vscode/mcp.json', color: 'from-indigo-500/10 to-indigo-600/5' },
  { name: 'Warp', config: 'Settings → MCP', color: 'from-violet-500/10 to-violet-600/5' },
] as const

export function McpSection() {
  const t = useTranslations('HomePage')

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-2xl text-center mb-12">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-mono">
          MCP Protocol
        </Badge>
        <h2 className="mb-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {t('mcpTitle')}
        </h2>
        <p className="text-lg text-muted-foreground/80">
          {t('mcpSubtitle')}
        </p>
      </div>

      {/* Compatible tools grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto stagger-children">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className={`group rounded-2xl border border-border/50 bg-gradient-to-br ${tool.color} backdrop-blur-sm p-5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/[0.03] transition-all duration-300`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/40 group-hover:border-primary/20 transition-colors">
                <Settings className="h-5 w-5 text-primary/60" />
              </div>
              <div>
                <div className="font-heading font-semibold text-sm">{tool.name}</div>
                <div className="text-[11px] text-muted-foreground/40 font-mono">{tool.config}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Link to help for setup details */}
      <div className="mt-8 text-center">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors font-medium"
        >
          {t('mcpSetupLink')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </SectionWrapper>
  )
}
