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

  // --- Connect via stdio ---
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] Connected via stdio transport');
}
