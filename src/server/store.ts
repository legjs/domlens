import type { ContextEntry, CompressedContext, SelectedContext } from '../shared/types';
import { MAX_CONTEXT_HISTORY } from '../shared/constants';

/**
 * User prompt entry submitted from the floating panel.
 */
export interface UserPromptEntry {
  id: string;
  timestamp: number;
  prompt: string;
  contexts: SelectedContext[];
  url: string;
  pageTitle?: string;
  tabId?: number;
}

/**
 * In-memory store for context capture entries.
 * Supports tab isolation: entries are grouped by tabId.
 */
export class ContextStore {
  private buckets: Map<string, Map<string, ContextEntry>> = new Map();
  private promptHistory: UserPromptEntry[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = MAX_CONTEXT_HISTORY) {
    this.maxHistorySize = maxHistorySize;
  }

  private getBucket(tabId?: number): Map<string, ContextEntry> {
    const key = tabId !== undefined ? String(tabId) : "global";
    if (!this.buckets.has(key)) {
      this.buckets.set(key, new Map());
    }
    return this.buckets.get(key)!;
  }

  add(context: CompressedContext, url: string, pageTitle?: string, tabId?: number): ContextEntry {
    const entry: ContextEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      url,
      pageTitle,
      context,
    };
    const bucket = this.getBucket(tabId);
    bucket.set(entry.id, entry);
    this.evictOldEntries(bucket);
    return entry;
  }

  getLatest(tabId?: number): ContextEntry | null {
    const bucket = this.getBucket(tabId);
    if (bucket.size === 0) return null;
    let latest: ContextEntry | null = null;
    for (const entry of bucket.values()) {
      if (!latest || entry.timestamp > latest.timestamp) {
        latest = entry;
      }
    }
    return latest;
  }

  getById(id: string): ContextEntry | null {
    for (const bucket of this.buckets.values()) {
      const entry = bucket.get(id);
      if (entry) return entry;
    }
    return null;
  }

  list(limit?: number, tabId?: number): ContextEntry[] {
    const effectiveLimit = limit ?? this.maxHistorySize;
    if (tabId !== undefined) {
      const bucket = this.getBucket(tabId);
      return this.sortAndSlice(bucket, effectiveLimit);
    }
    const all: ContextEntry[] = [];
    for (const bucket of this.buckets.values()) {
      all.push(...bucket.values());
    }
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, effectiveLimit);
  }

  clear(tabId?: number): void {
    if (tabId !== undefined) {
      this.buckets.delete(String(tabId));
    } else {
      this.buckets.clear();
    }
  }

  addUserPrompt(data: { prompt: string; contexts: SelectedContext[]; url: string; pageTitle?: string; tabId?: number }): UserPromptEntry {
    const entry: UserPromptEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      prompt: data.prompt,
      contexts: data.contexts,
      url: data.url,
      pageTitle: data.pageTitle,
      tabId: data.tabId,
    };
    this.promptHistory.unshift(entry);
    if (this.promptHistory.length > 10) this.promptHistory.pop();
    return entry;
  }

  getLatestPrompt(tabId?: number): UserPromptEntry | null {
    if (tabId !== undefined) {
      const found = this.promptHistory.find((e) => e.tabId === tabId);
      return found || null;
    }
    return this.promptHistory[0] || null;
  }

  get size(): number {
    let total = 0;
    for (const bucket of this.buckets.values()) {
      total += bucket.size;
    }
    return total;
  }

  sizeOf(tabId: number): number {
    return this.getBucket(tabId).size;
  }

  private sortAndSlice(bucket: Map<string, ContextEntry>, limit: number): ContextEntry[] {
    return Array.from(bucket.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  private evictOldEntries(bucket: Map<string, ContextEntry>): void {
    while (bucket.size > this.maxHistorySize) {
      let oldest: ContextEntry | null = null;
      for (const entry of bucket.values()) {
        if (!oldest || entry.timestamp < oldest.timestamp) {
          oldest = entry;
        }
      }
      if (oldest) {
        bucket.delete(oldest.id);
      }
    }
  }
}

export const contextStore = new ContextStore();
