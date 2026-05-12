/**
 * Overlay Module
 * Renders visual overlays on the target page to highlight
 * selected elements and their layout boundaries.
 *
 * Supports multi-select mode: each selected element gets its own overlay
 * and a letter label badge (A, B, C, ...).
 */

import { OVERLAY_STYLES, DEFAULT_CONFIG, LABEL_COLORS, MULTI_OVERLAY_PREFIX, LABEL_BADGE_PREFIX } from "~shared/constants"
import type { BoxModel } from "~shared/types"
import { getShadowRoot } from "~lib/shadow-host"

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

/** Unique ID for hover overlay element */
const HOVER_OVERLAY_ID = "__dom_ctx_hover_overlay__"

/** Hover overlay element (singleton) */
let hoverOverlayElement: HTMLDivElement | null = null

/** Selected overlays map: key -> element */
let selectedOverlays: Map<string, HTMLDivElement> = new Map()

/** Label badges map: key -> element */
let labelBadges: Map<string, HTMLDivElement> = new Map()

/** Delete buttons map: key -> element */
let deleteButtons: Map<string, HTMLDivElement> = new Map()

/** Callback invoked when a delete button is clicked */
let onDeleteSelection: ((key: string) => void) | null = null

/** Set the callback for delete button clicks (called from inspector) */
export function setDeleteCallback(cb: (key: string) => void): void {
  onDeleteSelection = cb
}

// ---------------------------------------------------------------------------
// Hover overlay (single, for mousemove tracking)
// ---------------------------------------------------------------------------

/**
 * Create the hover overlay DOM element.
 * Called once; subsequent calls return the existing element.
 */
function createHoverOverlay(): HTMLDivElement {
  if (hoverOverlayElement && getShadowRoot().contains(hoverOverlayElement)) {
    return hoverOverlayElement
  }

  const el = document.createElement("div")
  el.id = HOVER_OVERLAY_ID
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

  el.style.setProperty("z-index", "2147483646", "important")
  applyStateStyles(el, "hidden")
  getShadowRoot().appendChild(el)
  hoverOverlayElement = el

  return el
}

/**
 * Show the hover overlay at a given position.
 */
export function showOverlay(rect: BoxModel): void {
  const el = createHoverOverlay()
  updateOverlayPosition(el, rect)
  applyStateStyles(el, "hover")
}

/**
 * Show the hover overlay at a given position with selected styling.
 */
export function showSelectedOverlay(rect: BoxModel): void {
  const el = createHoverOverlay()
  updateOverlayPosition(el, rect)
  applyStateStyles(el, "selected")
}

/**
 * Hide the hover overlay (keep in DOM for reuse).
 */
export function hideOverlay(): void {
  if (hoverOverlayElement && getShadowRoot().contains(hoverOverlayElement)) {
    applyStateStyles(hoverOverlayElement, "hidden")
  }
}

// ---------------------------------------------------------------------------
// Selected overlays (multi-select)
// ---------------------------------------------------------------------------

/**
 * Show or update a selected element overlay + label badge.
 * @param key - Unique key for this selection (e.g. UUID)
 * @param rect - Element bounding rect
 * @param label - Letter label (A, B, C, ...)
 * @param labelIndex - Index for color selection
 */
export function showSelectedElementOverlay(
  key: string,
  rect: BoxModel,
  label: string,
  labelIndex: number
): void {
  // Create/update overlay
  let overlay = selectedOverlays.get(key)
  if (!overlay || !getShadowRoot().contains(overlay)) {
    overlay = document.createElement("div")
    overlay.id = MULTI_OVERLAY_PREFIX + key
    overlay.setAttribute("aria-hidden", "true")

    // Apply base styles
    for (const [prop, value] of Object.entries(OVERLAY_STYLES)) {
      try {
        const cssProp = camelToKebab(prop)
        overlay.style.setProperty(cssProp, String(value))
      } catch {
        // Ignore
      }
    }
    overlay.style.setProperty("z-index", "2147483645", "important")

    // Selected style with color
    const colorSet = LABEL_COLORS[labelIndex % LABEL_COLORS.length]
    overlay.style.setProperty("border", `2px solid ${colorSet.bg}`)
    overlay.style.setProperty("background", `${colorSet.bg}15`)
    overlay.style.setProperty("box-shadow", `0 0 8px ${colorSet.bg}80`)

    getShadowRoot().appendChild(overlay)
    selectedOverlays.set(key, overlay)
  }

  updateOverlayPosition(overlay, rect)

  // Create/update label badge
  let badge = labelBadges.get(key)
  if (!badge || !getShadowRoot().contains(badge)) {
    badge = document.createElement("div")
    badge.id = LABEL_BADGE_PREFIX + key
    badge.setAttribute("aria-hidden", "true")

    const colorSet = LABEL_COLORS[labelIndex % LABEL_COLORS.length]
    badge.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 3px 3px 0 0;
      background: ${colorSet.bg};
      color: ${colorSet.text};
      font-size: 10px;
      font-weight: 700;
      font-family: monospace;
      line-height: 1;
      box-shadow: 0 -1px 3px rgba(0,0,0,0.3);
    `
    badge.textContent = label

    getShadowRoot().appendChild(badge)
    labelBadges.set(key, badge)
  }

  // Position badge above top-left of element
  badge.style.top = `${rect.top - 16}px`
  badge.style.left = `${rect.left}px`

  // Create/update delete button above top-right
  let delBtn = deleteButtons.get(key)
  if (!delBtn || !getShadowRoot().contains(delBtn)) {
    delBtn = document.createElement("div")
    delBtn.setAttribute("aria-hidden", "true")
    delBtn.dataset.domCtxInteractive = ""

    const colorSet = LABEL_COLORS[labelIndex % LABEL_COLORS.length]
    delBtn.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 3px 3px 0 0;
      background: ${colorSet.bg};
      color: ${colorSet.text};
      cursor: pointer;
      box-shadow: 0 -1px 3px rgba(0,0,0,0.3);
      opacity: 0;
      transition: opacity 0.15s ease;
    `
    delBtn.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    delBtn.title = "Remove selection"

    delBtn.addEventListener("mouseenter", () => { delBtn!.style.opacity = "1" })
    delBtn.addEventListener("mouseleave", () => { delBtn!.style.opacity = "0" })

    delBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      if (onDeleteSelection) onDeleteSelection(key)
    })

    getShadowRoot().appendChild(delBtn)
    deleteButtons.set(key, delBtn)
  }

  // Position delete button above top-right of element
  delBtn.style.top = `${rect.top - 16}px`
  delBtn.style.left = `${rect.right - 16}px`
}

/**
 * Remove a single selected element overlay and badge.
 */
export function removeSelectedOverlay(key: string): void {
  const overlay = selectedOverlays.get(key)
  if (overlay && getShadowRoot().contains(overlay)) {
    overlay.remove()
  }
  selectedOverlays.delete(key)

  const badge = labelBadges.get(key)
  if (badge && getShadowRoot().contains(badge)) {
    badge.remove()
  }
  labelBadges.delete(key)

  const delBtn = deleteButtons.get(key)
  if (delBtn && getShadowRoot().contains(delBtn)) {
    delBtn.remove()
  }
  deleteButtons.delete(key)
}

/**
 * Remove all selected overlays and badges.
 */
export function removeAllSelectedOverlays(): void {
  for (const overlay of selectedOverlays.values()) {
    if (getShadowRoot().contains(overlay)) overlay.remove()
  }
  selectedOverlays.clear()

  for (const badge of labelBadges.values()) {
    if (getShadowRoot().contains(badge)) badge.remove()
  }
  labelBadges.clear()

  for (const delBtn of deleteButtons.values()) {
    if (getShadowRoot().contains(delBtn)) delBtn.remove()
  }
  deleteButtons.clear()
}

/**
 * Update positions of all overlays after scroll.
 */
export function updateAllOverlayPositions(
  positions: Map<string, { rect: BoxModel; labelIndex: number }>
): void {
  for (const [key, { rect }] of positions) {
    const overlay = selectedOverlays.get(key)
    if (overlay && getShadowRoot().contains(overlay)) {
      updateOverlayPosition(overlay, rect)
    }

    const badge = labelBadges.get(key)
    if (badge && getShadowRoot().contains(badge)) {
      badge.style.top = `${rect.top - 16}px`
      badge.style.left = `${rect.left}px`
    }

    const delBtn = deleteButtons.get(key)
    if (delBtn && getShadowRoot().contains(delBtn)) {
      delBtn.style.top = `${rect.top - 16}px`
      delBtn.style.left = `${rect.right - 16}px`
    }
  }
}

/**
 * Completely remove all overlays from the DOM (hover + selected).
 */
export function destroyAllOverlays(): void {
  if (hoverOverlayElement) {
    hoverOverlayElement.remove()
    hoverOverlayElement = null
  }
  removeAllSelectedOverlays()
}

/**
 * Check if any selected overlay exists.
 */
export function hasSelectedOverlays(): boolean {
  return selectedOverlays.size > 0
}

/**
 * Get the hover overlay element ID (for skip detection in inspector).
 */
export function getHoverOverlayId(): string {
  return HOVER_OVERLAY_ID
}

/**
 * Get all overlay/badge element IDs for skip detection.
 * Returns empty array since elements are inside Shadow DOM and
 * document.elementFromPoint() will not return them.
 */
export function getAllOverlayIds(): string[] {
  return []
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function updateOverlayPosition(el: HTMLDivElement, rect: BoxModel): void {
  el.style.top = `${rect.top}px`
  el.style.left = `${rect.left}px`
  el.style.width = `${rect.width}px`
  el.style.height = `${rect.height}px`
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
