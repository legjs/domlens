/**
 * Express Server Module
 * Local HTTP server for receiving context data from the extension
 * and providing it to AI coding agents via API endpoints.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { contextStore } from './store';
import type {
  ContextCapturePayload,
  ApiResponse,
  ContextEntry,
} from '../shared/types';
import { SERVER_DEFAULT_PORT } from '../shared/constants';

/**
 * Create and configure the Express application with all middleware and routes.
 */
export function createApp(): Express {
  const app = express();

  // --- Middleware ---

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Request logger
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
  });

  // --- Routes ---

  /**
   * GET /api/health
   * Health check endpoint.
   */
  app.get('/api/health', (_req: Request, res: Response<ApiResponse<{ status: string; storeSize: number }>>) => {
    res.json({
      success: true,
      data: { status: 'ok', storeSize: contextStore.size },
      timestamp: Date.now(),
    });
  });

  /**
   * POST /api/context
   * Receive a new context capture from the extension content script.
   */
  app.post('/api/context', (req: Request<object, ApiResponse<ContextEntry>, ContextCapturePayload>, res: Response<ApiResponse<ContextEntry>>) => {
    const { context, url } = req.body;

    if (!context || !url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Request body must include "context" (CompressedContext) and "url" (string).',
        timestamp: Date.now(),
      });
      return;
    }

    const entry = contextStore.add(context, url, req.body.pageTitle);

    res.status(201).json({
      success: true,
      data: entry,
      timestamp: Date.now(),
    });
  });

  /**
   * GET /api/context/latest
   * Retrieve the most recently captured context entry.
   */
  app.get('/api/context/latest', (_req: Request, res: Response<ApiResponse<ContextEntry>>) => {
    const entry = contextStore.getLatest();

    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'No context entries found.',
        timestamp: Date.now(),
      });
      return;
    }

    res.json({
      success: true,
      data: entry,
      timestamp: Date.now(),
    });
  });

  /**
   * GET /api/contexts?limit=N
   * List stored context entries sorted by timestamp descending.
   */
  app.get('/api/contexts', (req: Request<object, ApiResponse<ContextEntry[]>, object, { limit?: string }>, res: Response<ApiResponse<ContextEntry[]>>) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    if (req.query.limit && (isNaN(limit!) || limit! < 1)) {
      res.status(400).json({
        success: false,
        error: '"limit" query parameter must be a positive integer.',
        timestamp: Date.now(),
      });
      return;
    }

    const entries = contextStore.list(limit);

    res.json({
      success: true,
      data: entries,
      timestamp: Date.now(),
    });
  });

  /**
   * DELETE /api/contexts
   * Clear all stored context entries.
   */
  app.delete('/api/contexts', (_req: Request, res: Response<ApiResponse<{ deleted: boolean }>>) => {
    contextStore.clear();

    res.json({
      success: true,
      data: { deleted: true },
      timestamp: Date.now(),
    });
  });

  // --- Error Handler ---

  app.use((err: Error, _req: Request, res: Response<ApiResponse>, _next: NextFunction) => {
    console.error(`[ERROR] ${err.message}`);

    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error.',
      timestamp: Date.now(),
    });
  });

  return app;
}

/**
 * Start the server on the default port.
 * Exported for use by `runtime:start` / `runtime:dev` scripts.
 */
export function startServer(port: number = SERVER_DEFAULT_PORT) {
  const app = createApp();
  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`Runtime server listening on http://localhost:${port}`);
      resolve();
    });
  });
}
