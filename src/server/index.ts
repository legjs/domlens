/**
 * Runtime Server Entry Point
 *
 * Starts the HTTP server on the configured port and sets up
 * graceful shutdown handling for process signals.
 *
 * MCP Server (stdio transport) will be integrated in a future task.
 */

import { startServer } from './express';
import { SERVER_DEFAULT_PORT } from '../shared/constants';

// --- Environment ---
const PORT = parseInt(process.env.PORT || String(SERVER_DEFAULT_PORT), 10);

// --- Start HTTP Server ---
startServer(PORT).then(() => {
  console.log(`[Runtime Server] Context API available at http://localhost:${PORT}`);
});

// --- MCP Server (stdio) ---
// MCP server will be integrated in Task 8.
// When Claude Code launches this process via stdio, stdin will NOT be a TTY.
// If stdin is a TTY (terminal) -> only start HTTP server.
// If stdin is NOT a TTY (pipe/stdio) -> also start MCP server.
// Currently only the HTTP server is started here.

// --- Graceful Shutdown ---
function shutdown(signal: string) {
  console.log(`[Runtime Server] Received ${signal}, shutting down...`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));
