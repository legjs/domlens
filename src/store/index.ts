import { create } from "zustand"
import type { ElementInfo, CompressedContext } from "~shared/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Summary of a selected element shown in the Popup UI */
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
  // Inspector toggle
  inspectorActive: boolean

  // Selected element data
  selectedElement: SelectedElementDisplay | null
  compressedContext: CompressedContext | null

  // Prompt & clipboard
  promptText: string
  copied: boolean

  // Actions
  setInspectorActive: (active: boolean) => void
  setSelectedElement: (info: ElementInfo) => void
  setCompressedContext: (context: CompressedContext | null) => void
  setPromptText: (text: string) => void
  setCopied: (value: boolean) => void
  reset: () => void
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

  setInspectorActive: (active: boolean) =>
    set({ inspectorActive: active }),

  setSelectedElement: (info: ElementInfo) =>
    set({
      selectedElement: {
        tag: info.tagName,
        className: info.className,
        id: info.id,
        text: info.innerText,
      },
    }),

  setCompressedContext: (context: CompressedContext | null) =>
    set({ compressedContext: context }),

  setPromptText: (text: string) =>
    set({ promptText: text }),

  setCopied: (value: boolean) =>
    set({ copied: value }),

  reset: () =>
    set({
      inspectorActive: false,
      selectedElement: null,
      compressedContext: null,
      promptText: "",
      copied: false,
    }),
}))

export default usePopupStore
