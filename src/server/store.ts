import type { ContextEntry, CompressedContext } from '../shared/types';
import { MAX_CONTEXT_HISTORY } from '../shared/constants';

/**
 * In-memory store for context capture entries.
 *
 * Retains up to `maxHistorySize` entries, evicting the oldest
 * (by timestamp) whenever a new entry causes the store to exceed
 * its capacity limit.
 */
export class ContextStore {
  private entries: Map<string, ContextEntry> = new Map();
  private maxHistorySize: number;

  constructor(maxHistorySize: number = MAX_CONTEXT_HISTORY) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Add a new context entry and auto-evict oldest entries if over capacity.
   */
  add(context: CompressedContext, url: string, pageTitle?: string): ContextEntry {
    const entry: ContextEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      url,
      pageTitle,
      context,
    };

    this.entries.set(entry.id, entry);
    this.evictOldEntries();
    return entry;
  }

  /**
   * Get the most recently captured entry, or null if the store is empty.
   */
  getLatest(): ContextEntry | null {
    if (this.entries.size === 0) return null;

    let latest: ContextEntry | null = null;
    for (const entry of this.entries.values()) {
      if (!latest || entry.timestamp > latest.timestamp) {
        latest = entry;
      }
    }
    return latest;
  }

  /**
   * Get an entry by its unique ID, or null if not found.
   */
  getById(id: string): ContextEntry | null {
    return this.entries.get(id) ?? null;
  }

  /**
   * List entries sorted by timestamp descending (newest first).
   * @param limit Maximum number of entries to return (defaults to maxHistorySize).
   */
  list(limit?: number): ContextEntry[] {
    const effectiveLimit = limit ?? this.maxHistorySize;
    const sorted = Array.from(this.entries.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    return sorted.slice(0, effectiveLimit);
  }

  /**
   * Clear all stored entries.
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Current number of entries in the store.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Remove oldest entries when the store exceeds maxHistorySize.
   * Entries are sorted by timestamp ascending; the oldest are removed first.
   */
  private evictOldEntries(): void {
    while (this.entries.size > this.maxHistorySize) {
      let oldest: ContextEntry | null = null;
      for (const entry of this.entries.values()) {
        if (!oldest || entry.timestamp < oldest.timestamp) {
          oldest = entry;
        }
      }
      if (oldest) {
        this.entries.delete(oldest.id);
      }
    }
  }
}

/** Singleton store instance used by the Runtime server. */
export const contextStore = new ContextStore();
