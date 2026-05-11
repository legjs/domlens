/**
 * Runtime Server Entry Point
 *
 * Dual-mode process:
 * - Terminal (stdin is TTY): starts HTTP server only
 * - Claude Code / MCP client (stdin is NOT a TTY): starts HTTP + MCP server
 *
 * Port auto-discovery: tries ports SERVER_PORT_START..SERVER_PORT_END,
 * binds Express directly and retries on EADDRINUSE.
 */

import { createApp } from './express';
import { startMcpServer } from './mcp';
import { SERVER_PORT_START, SERVER_PORT_END } from '../shared/constants';

const isStdio = !process.stdin.isTTY;

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function main() {
  const envPort = parseInt(process.env.PORT || '', 10);
  const app = createApp();

  let port: number;

  if (envPort > 0 && envPort <= 65535) {
    // Explicit PORT env var — bind directly, fail if occupied
    port = envPort;
    await new Promise<void>((resolve, reject) => {
      const server = app.listen(port);
      server.once('listening', () => resolve());
      server.once('error', reject);
    });
  } else {
    // Auto-discovery: try each port until one succeeds
    port = await (async () => {
      for (let p = SERVER_PORT_START; p <= SERVER_PORT_END; p++) {
        try {
          await new Promise<void>((resolve, reject) => {
            const server = app.listen(p);
            server.once('listening', () => resolve());
            server.once('error', reject);
          });
          return p;
        } catch (err: any) {
          if (err.code === 'EADDRINUSE') {
            console.error(`[Runtime Server] Port ${p} in use, trying ${p + 1}...`);
            continue;
          }
          throw err;
        }
      }
      throw new Error(`All ports ${SERVER_PORT_START}-${SERVER_PORT_END} are in use`);
    })();
    console.error(`[Runtime Server] Auto-selected port ${port}`);
  }

  console.error(`[Runtime Server] Context API at http://localhost:${port}`);

  // Start MCP (when launched by Claude Code via stdio)
  if (isStdio) {
    await startMcpServer();
  }
}

main().catch((err) => {
  console.error('[Runtime Server] Fatal:', err);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string) {
  console.error(`[Runtime Server] Received ${signal}, shutting down...`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));
