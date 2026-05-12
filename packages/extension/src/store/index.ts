import { create } from "zustand"
import type { ElementInfo, SelectedContext, CompressedContext, ShortcutConfig } from "~shared/types"
import { DEFAULT_SHORTCUT_CONFIG, SK_SHORTCUT_CONFIG } from "~shared/constants"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PopupState {
  /** Real-time inspect state (toggle ON or Alt held) — for UI display */
  inspectorActive: boolean
  /** Toggle button state — persisted across popup close/reopen */
  toggleActive: boolean
  selectedContexts: SelectedContext[]
  promptText: string
  copied: boolean
  serverPort: number | null

  setInspectorActive: (active: boolean) => void
  setToggleActive: (active: boolean) => void
  setSelectedContexts: (contexts: SelectedContext[]) => void
  updateDescription: (id: string, description: string) => void
  removeContext: (id: string) => void
  clearContexts: () => void
  setPromptText: (text: string) => void
  setCopied: (value: boolean) => void
  setServerPort: (port: number | null) => void
  reset: () => void
}

// ---------------------------------------------------------------------------
// Storage keys & persist helpers
// ---------------------------------------------------------------------------

const SK_TOGGLE = "inspector_toggle"
const SK_CONTEXTS = "selected_contexts"
const SK_PROMPT = "prompt_text"

async function save(key: string, value: unknown) {
  try {
    await chrome.storage.local.set({ [key]: value })
  } catch {
    /* noop */
  }
}

/** Load persisted state from chrome.storage.local (call on popup mount) */
export async function loadPersistedState(): Promise<Partial<PopupState>> {
  try {
    const r = await chrome.storage.local.get([SK_TOGGLE, SK_CONTEXTS, SK_PROMPT])
    return {
      toggleActive: r[SK_TOGGLE] ?? true,
      inspectorActive: r[SK_TOGGLE] ?? true,
      selectedContexts: r[SK_CONTEXTS] ?? [],
      promptText: r[SK_PROMPT] ?? "",
    }
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const usePopupStore = create<PopupState>((set) => ({
  inspectorActive: false,
  toggleActive: false,
  selectedContexts: [],
  promptText: "",
  copied: false,
  serverPort: null,

  /** Update real-time inspect state (from Alt key or content script status) — NOT persisted */
  setInspectorActive: (active: boolean) => {
    set({ inspectorActive: active })
  },

  /** Update toggle state (from popup button) — persisted */
  setToggleActive: (active: boolean) => {
    set({ toggleActive: active, inspectorActive: active })
    save(SK_TOGGLE, active)
  },

  setSelectedContexts: (contexts: SelectedContext[]) => {
    set({ selectedContexts: contexts })
    save(SK_CONTEXTS, contexts)
  },

  updateDescription: (id: string, description: string) => {
    set((state) => {
      const updated = state.selectedContexts.map((ctx) =>
        ctx.id === id ? { ...ctx, description } : ctx
      )
      save(SK_CONTEXTS, updated)
      return { selectedContexts: updated }
    })
  },

  removeContext: (id: string) => {
    set((state) => {
      const updated = state.selectedContexts.filter((ctx) => ctx.id !== id)
      save(SK_CONTEXTS, updated)
      return { selectedContexts: updated }
    })
  },

  clearContexts: () => {
    set({ selectedContexts: [] })
    save(SK_CONTEXTS, [])
  },

  setPromptText: (text: string) => {
    set({ promptText: text })
    save(SK_PROMPT, text)
  },

  setCopied: (value: boolean) =>
    set({ copied: value }),

  setServerPort: (port: number | null) => set({ serverPort: port }),

  reset: () =>
    set({
      inspectorActive: false,
      toggleActive: false,
      selectedContexts: [],
      promptText: "",
      copied: false,
      serverPort: null,
    }),
}))

export default usePopupStore
