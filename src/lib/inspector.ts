/**
 * Inspector Module
 * Handles element selection, hover highlighting, and click interception
 * on the target web page.
 *
 * Communication protocol (Chrome Extension messaging):
 *   IN  (from popup/background):
 *     { type: 'TOGGLE_INSPECTOR', payload: { active: boolean } }
 *   OUT (from content script):
 *     { type: 'ELEMENT_SELECTED', payload: ElementInfo }
 *     { type: 'INSPECTOR_STATUS', payload: { active: boolean } }
 */

import type { ElementInfo } from "~shared/types"
import { SENSITIVE_SELECTORS, DEFAULT_CONFIG } from "~shared/constants"
import { compressContext } from "~lib/compressor"
import {
  showOverlay,
  showSelectedOverlay,
  hideOverlay,
  destroyOverlay,
} from "~lib/overlay"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let active = false
let selectedElement: Element | null = null

/** Bound event handlers stored for cleanup */
let onMouseMove: ((e: MouseEvent) => void) | null = null
let onClick: ((e: MouseEvent) => void) | null = null
let onKeyDown: ((e: KeyboardEvent) => void) | null = null
let onScroll: (() => void) | null = null

/** Throttle timestamp for mousemove */
let lastMoveTime = 0
const MOVE_THROTTLE_MS = 16 // ~60fps

/** Reference to the current hovered element (for dedup) */
let lastHoveredElement: Element | null = null

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Activate or deactivate the inspector.
 * This is the main entry point called in response to TOGGLE_INSPECTOR messages.
 */
export function setInspectorActive(value: boolean): void {
  if (value === active) return

  active = value

  if (active) {
    attachListeners()
    notifyStatus(true)
  } else {
    detachListeners()
    cleanup()
    notifyStatus(false)
  }
}

/**
 * Returns whether the inspector is currently active.
 */
export function isInspectorActive(): boolean {
  return active
}

/**
 * Returns the currently selected element, if any.
 */
export function getSelectedElement(): Element | null {
  return selectedElement
}

/**
 * Programmatically clear the current selection.
 */
export function clearSelection(): void {
  selectedElement = null
  lastHoveredElement = null
  hideOverlay()
}

// ---------------------------------------------------------------------------
// Event listener attachment / detachment
// ---------------------------------------------------------------------------

function attachListeners(): void {
  // Create bound handlers once
  onMouseMove = handleMouseMove.bind(null)
  onClick = handleClick.bind(null)
  onKeyDown = handleKeyDown.bind(null)
  onScroll = handleScroll.bind(null)

  document.addEventListener("mousemove", onMouseMove, true)
  document.addEventListener("click", onClick, true)
  document.addEventListener("keydown", onKeyDown, true)
  window.addEventListener("scroll", onScroll, true)
}

function detachListeners(): void {
  if (onMouseMove) document.removeEventListener("mousemove", onMouseMove, true)
  if (onClick) document.removeEventListener("click", onClick, true)
  if (onKeyDown) document.removeEventListener("keydown", onKeyDown, true)
  if (onScroll) window.removeEventListener("scroll", onScroll, true)

  onMouseMove = null
  onClick = null
  onKeyDown = null
  onScroll = null
}

function cleanup(): void {
  selectedElement = null
  lastHoveredElement = null
  destroyOverlay()
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * mousemove — lightweight element detection with throttle.
 * Only updates the overlay; does NOT perform deep analysis.
 */
function handleMouseMove(e: MouseEvent): void {
  if (!active) return

  // Throttle to ~60fps
  const now = performance.now()
  if (now - lastMoveTime < MOVE_THROTTLE_MS) return
  lastMoveTime = now

  const target = document.elementFromPoint(e.clientX, e.clientY)
  if (!target) {
    hideOverlay()
    lastHoveredElement = null
    return
  }

  // Skip overlay element itself and extension UI
  if (target.id === "__ai_runtime_inspector_overlay__") return

  // Skip if hovering the same element (avoid unnecessary DOM reads)
  if (target === lastHoveredElement) return
  lastHoveredElement = target

  // Skip sensitive elements — do not highlight password fields etc.
  if (isSensitiveElement(target)) {
    hideOverlay()
    return
  }

  const rect = target.getBoundingClientRect()
  showOverlay({
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  })
}

/**
 * click — select the element and trigger data collection flow.
 * Prevents default to avoid triggering page interactions.
 */
function handleClick(e: MouseEvent): void {
  if (!active) return

  const target = document.elementFromPoint(e.clientX, e.clientY)
  if (!target) return

  // Skip overlay and extension UI
  if (target.id === "__ai_runtime_inspector_overlay__") return

  // Skip sensitive elements
  if (isSensitiveElement(target)) return

  // Prevent the click from reaching the page
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()

  selectedElement = target

  // Update overlay to "selected" (orange) style
  const rect = target.getBoundingClientRect()
  showSelectedOverlay({
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  })

  // Build lightweight ElementInfo and emit
  const elementInfo = buildElementInfo(target)
  notifyElementSelected(elementInfo)

  // Generate CompressedContext and forward to background for server delivery
  try {
    if (target instanceof HTMLElement) {
      const compressed = compressContext(target)
      chrome.runtime.sendMessage({
        type: "CONTEXT_CAPTURED",
        payload: {
          context: compressed,
          url: window.location.href,
          pageTitle: document.title,
        },
      })
    }
  } catch (err) {
    console.warn("[AI Runtime Inspector] Failed to compress context:", err)
  }
}

/**
 * keydown — Escape cancels the inspector.
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (!active) return

  if (e.key === "Escape") {
    e.preventDefault()
    e.stopPropagation()
    setInspectorActive(false)
  }
}

/**
 * scroll — reposition overlay for the selected/hovered element.
 */
function handleScroll(): void {
  if (!active) return

  const target = selectedElement || lastHoveredElement
  if (!target) return

  // Element may have been removed from DOM
  if (!document.contains(target)) {
    hideOverlay()
    lastHoveredElement = null
    if (target === selectedElement) {
      selectedElement = null
    }
    return
  }

  const rect = target.getBoundingClientRect()
  const isCurrentlySelected = target === selectedElement

  if (isCurrentlySelected) {
    showSelectedOverlay({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    })
  } else {
    showOverlay({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a lightweight ElementInfo from a DOM element.
 * This is intentionally minimal — deep analysis happens in the collector module.
 */
function buildElementInfo(el: Element): ElementInfo {
  const textContent =
    el instanceof HTMLElement
      ? (el.innerText || "").slice(0, DEFAULT_CONFIG.maxTextLength)
      : ""

  return {
    tagName: el.tagName.toLowerCase(),
    className: el.className || "",
    id: el.id || "",
    innerText: textContent,
  }
}

/**
 * Check if an element matches any sensitive selector (e.g. password inputs).
 */
function isSensitiveElement(el: Element): boolean {
  for (const selector of SENSITIVE_SELECTORS) {
    try {
      if (el.matches && el.matches(selector)) {
        return true
      }
    } catch {
      // Invalid selector — skip
    }
  }
  return false
}

/**
 * Notify the background/popup that an element was selected.
 */
function notifyElementSelected(info: ElementInfo): void {
  try {
    chrome.runtime.sendMessage({
      type: "ELEMENT_SELECTED",
      payload: info,
    })
  } catch (err) {
    // Extension context may be invalidated (e.g. page navigated)
    console.warn("[AI Runtime Inspector] Failed to send ELEMENT_SELECTED:", err)
  }
}

/**
 * Notify the background/popup of inspector status change.
 */
function notifyStatus(isActive: boolean): void {
  try {
    chrome.runtime.sendMessage({
      type: "INSPECTOR_STATUS",
      payload: { active: isActive },
    })
  } catch (err) {
    console.warn("[AI Runtime Inspector] Failed to send INSPECTOR_STATUS:", err)
  }
}

// ---------------------------------------------------------------------------
// Message listener — respond to TOGGLE_INSPECTOR from popup/background
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: unknown }, _sender, sendResponse) => {
    if (message.type === "TOGGLE_INSPECTOR") {
      const payload = message.payload as { active: boolean } | undefined
      if (payload && typeof payload.active === "boolean") {
        setInspectorActive(payload.active)
      }
      sendResponse({ success: true })
      return true // Keep the message channel open for async response
    }

    sendResponse({ success: false, error: "Unknown message type" })
    return false
  }
)

// ---------------------------------------------------------------------------
// Cleanup on page unload
// ---------------------------------------------------------------------------

window.addEventListener("unload", () => {
  detachListeners()
  cleanup()
})
