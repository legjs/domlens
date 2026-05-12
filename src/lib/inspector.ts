/**
 * Inspector Module
 *
 * Two activation modes:
 *   1. Hold Alt (Win) / Option (Mac) - temporary inspect mode, releases on key up
 *   2. Popup toggle - persistent inspect mode until toggled off or Escape
 *
 * Selection modes:
 *   - Alt + Click (or toggle + Click): Single select (replaces previous)
 *   - Ctrl+Alt (Win) / Cmd+Option (Mac) + Click: Multi-select (appends)
 *   - Escape: Clear all selections
 */

import type { ElementInfo, SelectedContext, CompressedContext, ShortcutConfig } from "~shared/types"
import { SENSITIVE_SELECTORS, DEFAULT_CONFIG, LABEL_SEQUENCE, SK_SHORTCUT_CONFIG, DEFAULT_SHORTCUT_CONFIG } from "~shared/constants"
import { compressContext } from "~lib/compressor"
import {
  showOverlay,
  hideOverlay,
  destroyAllOverlays,
  showSelectedElementOverlay,
  removeAllSelectedOverlays,
  removeSelectedOverlay,
  updateAllOverlayPositions,
  setDeleteCallback,
} from "~lib/overlay"
import { createPanel, updateCards, destroyPanel } from "~lib/panel"
import { showInlinePrompt, moveInlinePrompt, hideInlinePrompt, destroyInlinePrompt, isInlinePromptVisible } from "~lib/inline-prompt"
import { isPointOverUI } from "~lib/shadow-host"

let inspectActive = false
let altHeld = false
let toggleActive = false
let lastMoveTime = 0
const MOVE_THROTTLE_MS = 16
let lastHoveredElement: Element | null = null
let scrollAttached = false
let lastMouseX = 0
let lastMouseY = 0
let shortcutConfig: ShortcutConfig = { ...DEFAULT_SHORTCUT_CONFIG }

// Load shortcut config from storage
async function loadShortcutConfig(): Promise<void> {
  try {
    const r = await chrome.storage.local.get(SK_SHORTCUT_CONFIG)
    if (r[SK_SHORTCUT_CONFIG]) {
      shortcutConfig = r[SK_SHORTCUT_CONFIG] as ShortcutConfig
    }
  } catch { /* ignore */ }
}

// Listen for shortcut config changes
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[SK_SHORTCUT_CONFIG]) {
      shortcutConfig = changes[SK_SHORTCUT_CONFIG].newValue as ShortcutConfig ?? { ...DEFAULT_SHORTCUT_CONFIG }
    }
  })
} catch { /* ignore */ }

// Load config on module init
loadShortcutConfig()

interface SelectionEntry {
  id: string
  label: string
  element: Element
  elementInfo: ElementInfo
  context: CompressedContext
}

let selections: Map<string, SelectionEntry> = new Map()
let nextLabelIndex = 0

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function shouldBeActive(): boolean {
  return altHeld || toggleActive
}

function activateInspect(): void {
  if (inspectActive) return
  inspectActive = true
  document.addEventListener("mousemove", onMouseMove, true)
  document.addEventListener("click", onClick, true)
  attachScrollListener()
  notifyStatus(true)
}

function deactivateInspect(): void {
  if (!inspectActive) return
  inspectActive = false
  document.removeEventListener("mousemove", onMouseMove, true)
  document.removeEventListener("click", onClick, true)
  if (selections.size === 0) detachScrollListener()
  hideOverlay()
  lastHoveredElement = null
  notifyStatus(false)
}

function attachScrollListener(): void {
  if (scrollAttached) return
  scrollAttached = true
  window.addEventListener("scroll", onScroll, true)
}

function detachScrollListener(): void {
  if (!scrollAttached) return
  scrollAttached = false
  window.removeEventListener("scroll", onScroll, true)
}

function recomputeActivation(): void {
  if (shouldBeActive()) { activateInspect() } else { deactivateInspect() }
}

export function setInspectorActive(value: boolean): void {
  toggleActive = value
  recomputeActivation()
}

export function isInspectorActive(): boolean { return inspectActive }

export function getSelections(): Map<string, SelectionEntry> { return selections }

export function clearSelections(): void {
  selections.clear()
  nextLabelIndex = 0
  removeAllSelectedOverlays()
  if (!inspectActive) detachScrollListener()
  hideInlinePrompt()
  updatePanel()
}

// Keyboard listeners (ALWAYS attached at module load)

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === shortcutConfig.inspectKey && !altHeld) {
    e.preventDefault() // Prevent browser menu bar activation on Windows
    altHeld = true
    recomputeActivation()
    return
  }
  // ESC: remove last selection in multi-select, clear all in single-select
  if (e.key === "Escape" && selections.size > 0) {
    e.preventDefault()
    e.stopPropagation()
    if (selections.size === 1) {
      toggleActive = false
      clearSelections()
      deactivateInspect()
    } else {
      // Find which selected element the mouse is currently over
      let targetKey: string | undefined
      for (const [id, entry] of selections) {
        if (!document.contains(entry.element)) continue
        const r = entry.element.getBoundingClientRect()
        if (lastMouseX >= r.left && lastMouseX <= r.right &&
            lastMouseY >= r.top && lastMouseY <= r.bottom) {
          targetKey = id
          break
        }
      }
      // Fallback: remove the last added selection
      if (!targetKey) {
        targetKey = Array.from(selections.keys()).pop()!
      }
      selections.delete(targetKey)
      removeSelectedOverlay(targetKey)
      notifyMultiSelected()
      updatePanel()
    }
    return
  }
  if (!inspectActive) return
}

function onKeyUp(e: KeyboardEvent): void {
  if (e.key === shortcutConfig.inspectKey && altHeld) {
    e.preventDefault() // Prevent browser menu bar activation on Windows
    altHeld = false
    recomputeActivation()
  }
}

document.addEventListener("keydown", onKeyDown, true)
document.addEventListener("keyup", onKeyUp, true)

// Always track mouse position for ESC-specific-removal hit-testing
document.addEventListener("mousemove", (e: MouseEvent) => {
  lastMouseX = e.clientX
  lastMouseY = e.clientY
}, true)

// Mouse listeners (attached/detached dynamically)

function onMouseMove(e: MouseEvent): void {
  if (!inspectActive) return
  // When toggleActive + inspectRequiresShortcut, only show hover overlay when key is held
  if (toggleActive && !altHeld && shortcutConfig.inspectRequiresShortcut) { hideOverlay(); lastHoveredElement = null; return }
  const now = performance.now()
  if (now - lastMoveTime < MOVE_THROTTLE_MS) return
  lastMoveTime = now
  const target = document.elementFromPoint(e.clientX, e.clientY)
  if (!target) { hideOverlay(); lastHoveredElement = null; return }
  if (isPointOverUI(e.clientX, e.clientY)) return
  if (target === lastHoveredElement) return
  lastHoveredElement = target
  if (isSensitiveElement(target)) { hideOverlay(); return }
  const rect = target.getBoundingClientRect()
  showOverlay({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom })
}

function onClick(e: MouseEvent): void {
  if (!inspectActive) return

  // If toggleActive + inspectRequiresShortcut, only allow click when inspect key is held
  if (toggleActive && !altHeld && shortcutConfig.inspectRequiresShortcut) return

  const target = document.elementFromPoint(e.clientX, e.clientY)
  if (!target) return
  if (isPointOverUI(e.clientX, e.clientY)) return
  if (isSensitiveElement(target)) return
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()

  // Dynamic multi-select detection
  let isMultiSelect = false
  if (shortcutConfig.multiSelectKey === "Meta") {
    isMultiSelect = e.metaKey && altHeld
  } else {
    isMultiSelect = e.ctrlKey && altHeld
  }

  // Toggle: if target is already selected, remove that specific selection
  for (const [id, entry] of selections) {
    if (entry.element === target) {
      selections.delete(id)
      removeSelectedOverlay(id)
      notifyMultiSelected()
      updatePanel()
      hideInlinePrompt()
      if (selections.size === 0) { hideOverlay(); if (!inspectActive) detachScrollListener() }
      hideOverlay()
      return
    }
  }

  if (isMultiSelect) { addSelection(target) } else { clearSelections(); addSelection(target) }
  hideOverlay()
}

function onScroll(): void {
  if (selections.size === 0) return
  const positions = new Map<string, { rect: { top: number; left: number; width: number; height: number; right: number; bottom: number }; labelIndex: number }>()
  for (const [id, entry] of selections) {
    if (!document.contains(entry.element)) { selections.delete(id); continue }
    const rect = entry.element.getBoundingClientRect()
    positions.set(id, {
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
      labelIndex: LABEL_SEQUENCE.indexOf(entry.label),
    })
  }
  updateAllOverlayPositions(positions)
}

// Selection management

function addSelection(element: Element): void {
  // Skip if element is already selected
  for (const [, entry] of selections) {
    if (entry.element === element) return
  }
  const id = generateId()
  const label = LABEL_SEQUENCE[nextLabelIndex % LABEL_SEQUENCE.length]
  nextLabelIndex++
  const elementInfo = buildElementInfo(element)
  let context: CompressedContext | null = null
  try { if (element instanceof HTMLElement) { context = compressContext(element) } } catch (err) { console.warn("[DOM Context] compress failed:", err) }
  if (!context) return
  selections.set(id, { id, label, element, elementInfo, context })
  const rect = element.getBoundingClientRect()
  showSelectedElementOverlay(id, { top: rect.top, left: rect.left, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }, label, LABEL_SEQUENCE.indexOf(label))
  notifyMultiSelected()
  sendContextToServer(id, label, context)
  updatePanel()

  // Show inline prompt near the selected element
  if (shortcutConfig.showInlinePrompt !== false) {
    if (isInlinePromptVisible()) {
      moveInlinePrompt(rect)
    } else {
      showInlinePrompt(rect)
    }
  }
}

// Helpers

function buildElementInfo(el: Element): ElementInfo {
  const t = el instanceof HTMLElement ? (el.innerText || "").slice(0, DEFAULT_CONFIG.maxTextLength) : ""
  return { tagName: el.tagName.toLowerCase(), className: el.className || "", id: el.id || "", innerText: t }
}

function isSensitiveElement(el: Element): boolean {
  for (const s of SENSITIVE_SELECTORS) { try { if (el.matches && el.matches(s)) return true } catch {} }
  return false
}

function notifyMultiSelected(): void {
  const contexts: SelectedContext[] = []
  for (const [id, entry] of selections) {
    contexts.push({ id, label: entry.label, description: "", elementInfo: entry.elementInfo, context: entry.context, url: window.location.href, pageTitle: document.title })
  }
  try { chrome.runtime.sendMessage({ type: "MULTI_ELEMENTS_SELECTED", payload: { contexts, tabId: undefined } }) } catch {}
}

function sendContextToServer(id: string, label: string, context: CompressedContext): void {
  try { chrome.runtime.sendMessage({ type: "CONTEXT_CAPTURED", payload: { context, url: window.location.href, pageTitle: document.title, selectionId: id, selectionLabel: label } }) } catch {}
}

function notifyStatus(isActive: boolean): void {
  try { chrome.runtime.sendMessage({ type: "INSPECTOR_STATUS", payload: { active: isActive } }) } catch {}
}

function updatePanel(): void {
  try { updateCards(selections) } catch { /* panel not yet created */ }
}

// Create floating panel on module load
try { createPanel() } catch { /* ignore */ }

// Set up delete button callback for overlay badges
setDeleteCallback((id: string) => {
  selections.delete(id)
  removeSelectedOverlay(id)
  notifyMultiSelected()
  updatePanel()
  hideInlinePrompt()
  if (selections.size === 0 && !inspectActive) detachScrollListener()
})

// Message listener

chrome.runtime.onMessage.addListener((message: { type: string; payload?: unknown }, _sender, sendResponse) => {
  if (message.type === "TOGGLE_INSPECTOR") {
    const p = message.payload as { active: boolean } | undefined
    if (p && typeof p.active === "boolean") setInspectorActive(p.active)
    sendResponse({ success: true }); return true
  }
  if (message.type === "CLEAR_SELECTIONS") { clearSelections(); sendResponse({ success: true }); return false }
  if (message.type === "REMOVE_SELECTION") {
    const p = message.payload as { id: string } | undefined
    if (p && p.id && selections.has(p.id)) { selections.delete(p.id); removeSelectedOverlay(p.id); notifyMultiSelected(); updatePanel() }
    sendResponse({ success: true }); return false
  }
  if (message.type === "SETTINGS_UPDATED") {
    const config = message.payload as ShortcutConfig | undefined
    if (config) {
      shortcutConfig = { ...DEFAULT_SHORTCUT_CONFIG, ...config }
    }
    sendResponse({ success: true }); return false
  }
  sendResponse({ success: false, error: "Unknown message type" }); return false
})

window.addEventListener("unload", () => { deactivateInspect(); toggleActive = false; altHeld = false; destroyAllOverlays(); destroyPanel(); destroyInlinePrompt(); selections.clear() })
