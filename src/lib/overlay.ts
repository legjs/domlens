/**
 * Overlay Module
 * Renders visual overlays on the target page to highlight
 * selected elements and their layout boundaries.
 */

import { OVERLAY_STYLES, DEFAULT_CONFIG } from "~shared/constants"
import type { BoxModel } from "~shared/types"

/** Overlay element states */
export type OverlayState = "hover" | "selected" | "hidden"

/** Styles for different overlay states */
const OVERLAY_STATE_STYLES: Record<
  Exclude<OverlayState, "hidden">,
  Record<string, string>
> = {
  hover: {
    border: `${DEFAULT_CONFIG.overlayBorderWidth}px solid ${DEFAULT_CONFIG.overlayColor}`,
    background: `rgba(0, 255, 255, ${DEFAULT_CONFIG.overlayOpacity})`,
    boxShadow: DEFAULT_CONFIG.overlayShadow
      ? `0 0 10px rgba(0, 255, 255, 0.5)`
      : "none",
  },
  selected: {
    border: `${DEFAULT_CONFIG.overlayBorderWidth}px solid #ff8800`,
    background: "rgba(255, 136, 0, 0.12)",
    boxShadow: "0 0 12px rgba(255, 136, 0, 0.6)",
  },
}

/** Unique ID for overlay elements */
const OVERLAY_ID = "__ai_runtime_inspector_overlay__"

let overlayElement: HTMLDivElement | null = null

/**
 * Create the overlay DOM element with base styles.
 * Called once; subsequent calls return the existing element.
 */
export function createOverlay(): HTMLDivElement {
  if (overlayElement && document.contains(overlayElement)) {
    return overlayElement
  }

  const el = document.createElement("div")
  el.id = OVERLAY_ID
  el.setAttribute("aria-hidden", "true")

  // Apply base OVERLAY_STYLES
  for (const [prop, value] of Object.entries(OVERLAY_STYLES)) {
    try {
      const cssProp = camelToKebab(prop)
      el.style.setProperty(cssProp, String(value))
    } catch {
      // Ignore invalid property assignments
    }
  }

  // Ensure overlay sits above everything on the page
  el.style.setProperty("z-index", "2147483647", "important")

  // Start in hidden state
  applyStateStyles(el, "hidden")

  document.documentElement.appendChild(el)
  overlayElement = el

  return el
}

/**
 * Update the overlay position and dimensions to match a BoxModel rect.
 */
export function updateOverlay(rect: BoxModel): void {
  const el = getOverlay()
  if (!el) return

  el.style.top = `${rect.top}px`
  el.style.left = `${rect.left}px`
  el.style.width = `${rect.width}px`
  el.style.height = `${rect.height}px`
}

/**
 * Set the visual state of the overlay.
 */
export function setOverlayState(state: OverlayState): void {
  const el = getOverlay()
  if (!el) return

  applyStateStyles(el, state)
}

/**
 * Show the overlay at a given position with hover styling.
 */
export function showOverlay(rect: BoxModel): void {
  const el = createOverlay()
  updateOverlay(rect)
  setOverlayState("hover")
}

/**
 * Show the overlay at a given position with selected (orange) styling.
 */
export function showSelectedOverlay(rect: BoxModel): void {
  const el = createOverlay()
  updateOverlay(rect)
  setOverlayState("selected")
}

/**
 * Hide the overlay (keep it in the DOM for reuse).
 */
export function hideOverlay(): void {
  const el = getOverlay()
  if (!el) return

  setOverlayState("hidden")
}

/**
 * Completely remove the overlay element from the DOM.
 * Call this when the inspector is deactivated to clean up.
 */
export function destroyOverlay(): void {
  if (overlayElement) {
    overlayElement.remove()
    overlayElement = null
  }
}

/**
 * Check if the overlay currently exists in the DOM.
 */
export function overlayExists(): boolean {
  return overlayElement !== null && document.contains(overlayElement)
}

// --- Internal helpers ---

function getOverlay(): HTMLDivElement | null {
  if (overlayElement && document.contains(overlayElement)) {
    return overlayElement
  }
  overlayElement = null
  return null
}

function applyStateStyles(el: HTMLDivElement, state: OverlayState): void {
  if (state === "hidden") {
    el.style.display = "none"
    return
  }

  el.style.display = "block"
  const styles = OVERLAY_STATE_STYLES[state]
  if (!styles) return

  for (const [prop, value] of Object.entries(styles)) {
    try {
      const cssProp = camelToKebab(prop)
      el.style.setProperty(cssProp, value)
    } catch {
      // Ignore
    }
  }
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}
