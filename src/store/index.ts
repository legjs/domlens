import { create } from "zustand"
import type { ElementInfo, CompressedContext } from "~shared/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectedElementDisplay {
  tag: string
  className: string
  id: string
  text: string
  size?: string
  position?: string
  componentName?: string
}

interface PopupState {
  inspectorActive: boolean
  selectedElement: SelectedElementDisplay | null
  compressedContext: CompressedContext | null
  promptText: string
  copied: boolean
  serverConnected: boolean

  setInspectorActive: (active: boolean) => void
  setSelectedElement: (info: ElementInfo) => void
  setCompressedContext: (context: CompressedContext | null) => void
  setPromptText: (text: string) => void
  setCopied: (value: boolean) => void
  setServerConnected: (connected: boolean) => void
  reset: () => void
}

// ---------------------------------------------------------------------------
// Storage keys & persist helpers
// ---------------------------------------------------------------------------

const SK_ACTIVE = "inspector_active"
const SK_ELEMENT = "selected_element"
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
    const r = await chrome.storage.local.get([SK_ACTIVE, SK_ELEMENT, SK_PROMPT])
    return {
      inspectorActive: r[SK_ACTIVE] ?? false,
      selectedElement: r[SK_ELEMENT] ?? null,
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
  selectedElement: null,
  compressedContext: null,
  promptText: "",
  copied: false,
  serverConnected: false,

  setInspectorActive: (active: boolean) => {
    set({ inspectorActive: active })
    save(SK_ACTIVE, active)
  },

  setSelectedElement: (info: ElementInfo) => {
    const display: SelectedElementDisplay = {
      tag: info.tagName,
      className: info.className,
      id: info.id,
      text: info.innerText,
    }
    set({ selectedElement: display })
    save(SK_ELEMENT, display)
  },

  setCompressedContext: (context: CompressedContext | null) =>
    set({ compressedContext: context }),

  setPromptText: (text: string) => {
    set({ promptText: text })
    save(SK_PROMPT, text)
  },

  setCopied: (value: boolean) =>
    set({ copied: value }),

  setServerConnected: (connected: boolean) =>
    set({ serverConnected: connected }),

  reset: () =>
    set({
      inspectorActive: false,
      selectedElement: null,
      compressedContext: null,
      promptText: "",
      copied: false,
      serverConnected: false,
    }),
}))

export default usePopupStore
