import { create } from "zustand"
import type { CompressedContext } from "~shared/types"

interface InspectorState {
  isEnabled: boolean
  selectedElement: CompressedContext | null
  isInspecting: boolean

  // Actions
  toggleInspector: () => void
  setInspecting: (value: boolean) => void
  setSelectedElement: (element: CompressedContext | null) => void
  reset: () => void
}

const useInspectorStore = create<InspectorState>((set) => ({
  isEnabled: false,
  selectedElement: null,
  isInspecting: false,

  toggleInspector: () =>
    set((state) => ({ isEnabled: !state.isEnabled })),

  setInspecting: (value: boolean) =>
    set({ isInspecting: value }),

  setSelectedElement: (element) =>
    set({ selectedElement: element }),

  reset: () =>
    set({
      isEnabled: false,
      selectedElement: null,
      isInspecting: false,
    }),
}))

export default useInspectorStore
