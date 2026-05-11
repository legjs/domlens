/**
 * Runtime Server Entry Point
 *
 * Dual-mode process:
 * - Terminal (stdin is TTY): starts HTTP server only
 * - Claude Code / MCP client (stdin is NOT TTY): starts HTTP + MCP server
 *
 * Both modes share the same in-memory ContextStore.
 */

import { startServer } from './express';
import { startMcpServer } from './mcp';
import { SERVER_DEFAULT_PORT } from '../shared/constants';

// --- Environment ---
const PORT = parseInt(process.env.PORT || String(SERVER_DEFAULT_PORT), 10);
const isStdio = !process.stdin.isTTY;

// --- Start HTTP Server ---
startServer(PORT).then(() => {
  console.error(`[Runtime Server] Context API at http://localhost:${PORT}`);
});

// --- Start MCP Server (if launched by an MCP client) ---
if (isStdio) {
  startMcpServer().catch((err) => {
    console.error('[Runtime Server] MCP server failed to start:', err);
    process.exit(1);
  });
}

// --- Graceful Shutdown ---
function shutdown(signal: string) {
  console.error(`[Runtime Server] Received ${signal}, shutting down...`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));
