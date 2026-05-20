/**
 * Express Server Module
 * Local HTTP server for receiving context data from the extension
 * and providing it to AI coding agents via API endpoints.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { contextStore, type RefreshPatch } from './store';
import type {
  ContextCapturePayload,
  ApiResponse,
  ContextEntry,
} from './types';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
  });

  // GET /api/health
  app.get('/api/health', (_req: Request, res: Response<ApiResponse<{ status: string; storeSize: number }>>) => {
    res.json({
      success: true,
      data: { status: 'ok', storeSize: contextStore.size },
      timestamp: Date.now(),
    });
  });

  // POST /api/context — receives context with optional tabId
  app.post('/api/context', (req: Request<object, ApiResponse<ContextEntry>, ContextCapturePayload>, res: Response<ApiResponse<ContextEntry>>) => {
    const { context, url } = req.body;
    const tabId = req.body.tabId as number | undefined;

    if (!context || !url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Request body must include "context" and "url".',
        timestamp: Date.now(),
      });
      return;
    }

    const entry = contextStore.add(context, url, req.body.pageTitle, tabId);

    res.status(201).json({
      success: true,
      data: entry,
      timestamp: Date.now(),
    });
  });

  // GET /api/context/latest?tabId=N
  app.get('/api/context/latest', (req: Request<object, ApiResponse<ContextEntry>, object, { tabId?: string }>, res: Response<ApiResponse<ContextEntry>>) => {
    const tabId = req.query.tabId ? parseInt(req.query.tabId, 10) : undefined;
    const entry = contextStore.getLatest(tabId);

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

  // GET /api/contexts?limit=N&tabId=N
  app.get('/api/contexts', (req: Request<object, ApiResponse<ContextEntry[]>, object, { limit?: string; tabId?: string }>, res: Response<ApiResponse<ContextEntry[]>>) => {
    let limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    let tabId = req.query.tabId ? parseInt(req.query.tabId, 10) : undefined;

    if (req.query.limit && (isNaN(limit!) || limit! < 1)) {
      res.status(400).json({
        success: false,
        error: '"limit" must be a positive integer.',
        timestamp: Date.now(),
      });
      return;
    }

    if (req.query.tabId && isNaN(tabId!)) {
      res.status(400).json({
        success: false,
        error: '"tabId" must be a number.',
        timestamp: Date.now(),
      });
      return;
    }

    const entries = contextStore.list(limit, tabId);

    res.json({
      success: true,
      data: entries,
      timestamp: Date.now(),
    });
  });

  // DELETE /api/contexts?tabId=N
  app.delete('/api/contexts', (req: Request<object, ApiResponse<{ deleted: boolean }>, object, { tabId?: string }>, res: Response<ApiResponse<{ deleted: boolean }>>) => {
    const tabId = req.query.tabId ? parseInt(req.query.tabId, 10) : undefined;
    contextStore.clear(tabId);

    res.json({
      success: true,
      data: { deleted: true },
      timestamp: Date.now(),
    });
  });

  // POST /api/prompt — receives user prompt + element contexts from floating panel
  app.post('/api/prompt', (req: Request, res: Response<ApiResponse>) => {
    const { prompt, contexts, url, pageTitle, tabId } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Request body must include "prompt".',
        timestamp: Date.now(),
      });
      return;
    }

    const entry = contextStore.addUserPrompt({
      prompt,
      contexts: contexts || [],
      url: url || '',
      pageTitle,
      tabId: tabId ? parseInt(tabId, 10) : undefined,
    });

    res.status(201).json({
      success: true,
      data: entry,
      timestamp: Date.now(),
    });
  });

  // GET /api/prompt/latest?tabId=N
  app.get('/api/prompt/latest', (req: Request<object, ApiResponse, object, { tabId?: string }>, res: Response<ApiResponse>) => {
    const tabId = req.query.tabId ? parseInt(req.query.tabId, 10) : undefined;
    const entry = contextStore.getLatestPrompt(tabId);

    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'No prompt entries found.',
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

  // GET /api/patches — pop pending refresh patches (consumed by extension polling)
  app.get('/api/patches', (_req: Request, res: Response<ApiResponse<RefreshPatch[]>>) => {
    const patches = contextStore.popPatches();
    res.json({
      success: true,
      data: patches,
      timestamp: Date.now(),
    });
  });

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
