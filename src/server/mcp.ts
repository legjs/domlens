/**
 * MCP (Model Context Protocol) Server Module
 *
 * Exposes 4 tools over stdio transport for AI coding agents:
 *   - get_latest_context: Return the most recent DOM context entry
 *   - get_prompt:          Build a Markdown prompt from the latest context
 *   - list_contexts:       List stored context history (with optional limit)
 *   - clear_contexts:      Clear all stored context entries
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';
import { contextStore } from './store.js';
import { buildPrompt } from '../lib/prompt-builder.js';

/**
 * Start the MCP server on stdio transport.
 *
 * Call this when the process detects it was launched by an MCP client
 * (i.e. stdin is NOT a TTY).
 */
export async function startMcpServer(): Promise<void> {
  const server = new McpServer(
    { name: 'dom-context-runtime', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  // --- Tool: get_latest_context ---
  server.registerTool(
    'get_latest_context',
    {
      description:
        'Get the latest DOM context captured by the Chrome extension inspector.',
      inputSchema: z.object({}),
    },
    async () => {
      const entry = contextStore.getLatest();
      if (!entry) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error:
                  'No context available. Use the Chrome extension to inspect an element first.',
              }),
            },
          ],
        };
      }
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(entry, null, 2) },
        ],
      };
    },
  );

  // --- Tool: get_prompt ---
  server.registerTool(
    'get_prompt',
    {
      description:
        'Get the generated Markdown prompt for the latest DOM context, ready to paste into AI chat.',
      inputSchema: z.object({}),
    },
    async () => {
      const entry = contextStore.getLatest();
      if (!entry) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No context available. Use the Chrome extension to inspect an element first.',
            },
          ],
        };
      }
      const prompt = buildPrompt(entry.context);
      return { content: [{ type: 'text' as const, text: prompt }] };
    },
  );

  // --- Tool: list_contexts ---
  server.registerTool(
    'list_contexts',
    {
      description: 'List all stored DOM context history entries.',
      inputSchema: z.object({
        limit: z
          .number()
          .optional()
          .describe('Maximum entries to return (default: 20)'),
      }),
    },
    async ({ limit }) => {
      const entries = contextStore.list(limit);
      const summary = entries.map((e) => ({
        id: e.id,
        timestamp: new Date(e.timestamp).toISOString(),
        url: e.url,
        pageTitle: e.pageTitle,
        tag: e.context.selectedElement.tag,
      }));
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(summary, null, 2) },
        ],
      };
    },
  );

  // --- Tool: clear_contexts ---
  server.registerTool(
    'clear_contexts',
    {
      description: 'Clear all stored DOM context history.',
      inputSchema: z.object({}),
    },
    async () => {
      contextStore.clear();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: 'All contexts cleared',
            }),
          },
        ],
      };
    },
  );

  // --- Tool: get_user_prompt ---
  server.registerTool(
    'get_user_prompt',
    {
      description: 'Get the latest user prompt submitted from the Chrome extension floating panel, including selected element contexts. Returns the user\'s description/intent along with full element details.',
      inputSchema: z.object({}),
    },
    async () => {
      const entry = contextStore.getLatestPrompt();
      if (!entry) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No user prompt available. Use the Chrome extension to select elements and submit a prompt from the floating panel.',
            },
          ],
        };
      }

      const lines: string[] = ['# DOM Context - User Request\n'];
      lines.push(`**Page**: ${entry.pageTitle || entry.url}`);
      lines.push(`**URL**: ${entry.url}`);
      lines.push(`**Time**: ${new Date(entry.timestamp).toISOString()}\n`);

      for (const ctx of entry.contexts) {
        const se = ctx.context?.selectedElement;
        lines.push(`## [${ctx.label}] Element${ctx.description ? ` (${ctx.description})` : ''}`);
        lines.push(`- **Tag**: ${se?.tag || ctx.elementInfo.tagName}`);
        if (se?.cssSelector) lines.push(`- **CSS Selector**: \`${se.cssSelector}\``);
        if (se?.xpath) lines.push(`- **XPath**: \`${se.xpath}\``);
        if (ctx.elementInfo.id) lines.push(`- **ID**: ${ctx.elementInfo.id}`);
        if (ctx.elementInfo.className) lines.push(`- **Class**: ${ctx.elementInfo.className}`);
        if (se?.text) lines.push(`- **Text**: ${se.text.length > 200 ? se.text.slice(0, 200) + '...' : se.text}`);
        if (se?.rect) {
          lines.push(`- **Size**: ${Math.round(se.rect.width)} x ${Math.round(se.rect.height)}px`);
          lines.push(`- **Position**: top=${Math.round(se.rect.top)}, left=${Math.round(se.rect.left)}`);
        }
        if (se?.accessibility?.role) {
          const a = se.accessibility;
          lines.push(`- **Role**: ${a.role}`);
          if (a.ariaLabel) lines.push(`- **ARIA Label**: ${a.ariaLabel}`);
          if (a.isFocusable) lines.push(`- **Focusable**: yes`);
          if (a.isInteractive) lines.push(`- **Interactive**: yes`);
        }
        if (se?.styles && Object.keys(se.styles).length > 0) {
          lines.push('- **Computed Styles**:');
          for (const [key, val] of Object.entries(se.styles)) {
            lines.push(`  - ${key}: ${val}`);
          }
        }
        if (se?.html) {
          lines.push('- **HTML**:');
          lines.push('```html');
          lines.push(se.html.length > 500 ? se.html.slice(0, 500) + '...' : se.html);
          lines.push('```');
        }
        if (ctx.context?.layoutChain && ctx.context.layoutChain.length > 0) {
          lines.push('- **Layout Chain**:');
          for (let i = 0; i < ctx.context.layoutChain.length; i++) {
            const node = ctx.context.layoutChain[i];
            lines.push(`  ${i}: ${node.tag} (${node.display}) ${node.width}px`);
          }
        }
        lines.push('');
      }

      lines.push('## User Request');
      lines.push(entry.prompt);

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );

  // --- Connect via stdio ---
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] Connected via stdio transport');
}
