/**
 * Floating Panel Module
 *
 * Renders an in-page floating panel at the bottom-right corner
 * showing selected element cards, user prompt input, and send button.
 *
 * Features:
 * - Draggable (via header)
 * - Collapsible (shrinks to a thin bar on the right edge)
 * - Auto-updates when inspector selections change
 * - Sends prompt + context to Runtime Server via background script
 */

import type { SelectedContext, CompressedContext } from "~shared/types"
import { LABEL_COLORS, SK_SHORTCUT_CONFIG } from "~shared/constants"
import { getSelections } from "~lib/inspector"
import { getShadowRoot } from "~lib/shadow-host"
import { t } from "~lib/i18n"
import { icons } from "lucide"

// ---------------------------------------------------------------------------
// Icon helper
// ---------------------------------------------------------------------------

/** Generate an SVG string from a Lucide icon name */
function icon(name: keyof typeof icons, size = 12, stroke = "currentColor"): string {
  const nodes = icons[name]
  if (!nodes || !Array.isArray(nodes)) return ""
  const attrs = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
  let inner = ""
  for (const node of nodes) {
    if (!Array.isArray(node)) continue
    const [tag, nodeAttrs] = node
    let attrStr = ""
    if (nodeAttrs && typeof nodeAttrs === "object") {
      for (const [k, v] of Object.entries(nodeAttrs)) {
        attrStr += ` ${k}="${v}"`
      }
    }
    inner += `<${tag}${attrStr}/>`
  }
  return `<svg ${attrs}>${inner}</svg>`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PanelSelection {
  label: string
  tag: string
  cssSelector?: string
  xpath?: string
  text?: string
  rect?: { width: number; height: number; top: number; left: number; right: number; bottom: number }
  accessibility?: {
    role: string
    ariaLabel: string | null
    isFocusable: boolean
    isInteractive: boolean
  }
  styles?: Record<string, string>
  html?: string
  elementInfo: { tagName: string; id: string; className: string; innerText: string }
  description: string
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let panelEl: HTMLDivElement | null = null
let expandTabEl: HTMLDivElement | null = null
let bodyEl: HTMLDivElement | null = null
let isCollapsed = false
let isDragging = false
let dragOffsetX = 0
let dragOffsetY = 0
let panelVisible = false

// Position defaults
const DEFAULT_RIGHT = 16
const DEFAULT_BOTTOM = 16
const PANEL_WIDTH = 340
const COLLAPSED_WIDTH = 36

// Cached position (persists across collapse/expand)
let savedRight = DEFAULT_RIGHT
let savedBottom = DEFAULT_BOTTOM

// ---------------------------------------------------------------------------
// Styles (inline, no Tailwind in content script)
// ---------------------------------------------------------------------------

const STYLES = {
  panel: `
    position: fixed;
    width: ${PANEL_WIDTH}px;
    max-height: 480px;
    background: #0f1629;
    border: 1px solid #2a2a4a;
    border-radius: 10px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    color: #e0e0e0;
    overflow: hidden;
    transition: opacity 0.15s ease;
    pointer-events: auto;
  `,
  header: `
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #2a2a4a;
    cursor: grab;
    user-select: none;
    background: #16213e;
    flex-shrink: 0;
  `,
  headerTitle: `
    font-size: 12px;
    font-weight: 600;
    color: #e0e0e0;
    letter-spacing: 0.5px;
  `,
  headerBadge: `
    font-size: 10px;
    background: #2a2a4a;
    color: #ccc;
    padding: 1px 6px;
    border-radius: 8px;
    margin-left: 6px;
  `,
  collapseBtn: `
    margin-left: auto;
    background: none;
    border: none;
    color: #bbb;
    cursor: pointer;
    padding: 4px 6px;
    font-size: 12px;
    line-height: 1;
  `,
  copyBtn: `
    background: none;
    border: none;
    color: #aaa;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 13px;
    line-height: 1;
    min-width: 28px;
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  `,
  copyBtnHover: `
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 13px;
    line-height: 1;
    min-width: 28px;
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: rgba(255,255,255,0.08);
    transition: color 0.15s, background 0.15s;
  `,
  body: `
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    scrollbar-width: thin;
    scrollbar-color: #2a2a4a transparent;
  `,
  card: `
    background: #16213e;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 6px;
  `,
  cardHeader: `
    padding: 6px 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  cardHeaderHover: `
    padding: 6px 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1a2745;
  `,
  labelBadge: `
    width: 18px;
    height: 18px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    font-family: monospace;
    flex-shrink: 0;
  `,
  cardTag: `
    font-size: 11px;
    color: #ccc;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  removeBtn: `
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
    margin-left: auto;
  `,
  removeBtnHover: `
    background: none;
    border: none;
    color: #e74c3c;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
    margin-left: auto;
  `,
  cardArrow: `
    color: #aaa;
    font-size: 9px;
    flex-shrink: 0;
  `,
  cardDetail: `
    padding: 6px 8px;
    border-top: 1px solid #2a2a4a;
    font-size: 11px;
    overflow: hidden;
    color: #d0d0d0;
  `,
  detailLabel: `
    font-size: 10px;
    color: #b0b0b0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  `,
  detailCode: `
    font-size: 11px;
    word-break: break-all;
    color: #d0d0d0;
  `,
  detailPre: `
    font-size: 11px;
    background: #0a0f1e;
    border-radius: 4px;
    padding: 4px 6px;
    overflow: auto;
    max-height: 80px;
    font-family: monospace;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    color: #d0d0d0;
    margin: 0;
  `,
  descInput: `
    width: calc(100% - 16px);
    padding: 4px 6px;
    font-size: 11px;
    background: #0f1a2e;
    border: 1px solid #2a2a4a;
    border-radius: 4px;
    color: #d0d0d0;
    outline: none;
    box-sizing: border-box;
    margin: 4px 8px 6px;
  `,
  promptArea: `
    padding: 8px;
    border-top: 1px solid #2a2a4a;
    flex-shrink: 0;
  `,
  promptTextarea: `
    width: 100%;
    height: 52px;
    padding: 6px 8px;
    font-size: 11px;
    background: #0a0f1e;
    border: 1px solid #2a2a4a;
    border-radius: 6px;
    color: #e0e0e0;
    resize: none;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
  `,
  promptTextareaFocus: `
    border-color: #4dabf7;
  `,
  sendBtn: `
    width: 100%;
    padding: 6px 0;
    margin-top: 6px;
    border: none;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  `,
  sendBtnHover: `
    background: #1d4ed8;
  `,
  sendBtnDisabled: `
    display: block;
    width: 100%;
    padding: 4px 0;
    margin-top: 4px;
    color: #888;
    cursor: not-allowed;
    font-size: 10px;
  `,
  clearBtn: `
    display: block;
    width: 100%;
    padding: 4px 0;
    margin-top: 4px;
    background: none;
    border: none;
    color: #e74c3c;
    font-size: 10px;
    cursor: pointer;
  `,
  emptyState: `
    padding: 24px 12px;
    text-align: center;
    color: #b0b0b0;
    font-size: 11px;
  `,
  expandTab: `
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${COLLAPSED_WIDTH}px;
    background: #16213e;
    border-right: 1px solid #2a2a4a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    border-radius: 10px 0 0 10px;
  `,
  expandTabVisible: `
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${COLLAPSED_WIDTH}px;
    background: #16213e;
    border-right: 1px solid #2a2a4a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    opacity: 1;
    pointer-events: auto;
    transition: opacity 0.15s ease;
    border-radius: 10px 0 0 10px;
  `,
} as const

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create and mount the floating panel */
export function createPanel(): void {
  // Reuse existing DOM elements if present (e.g. after content script re-injection)
  const existingPanel = getShadowRoot().getElementById("dom-ctx-panel")

  if (existingPanel && getShadowRoot().contains(existingPanel)) {
    // Reconnect module variables to existing DOM
    panelEl = existingPanel as HTMLDivElement
    expandTabEl = getShadowRoot().getElementById("dom-ctx-expand-tab") as HTMLDivElement | null
    bodyEl = getShadowRoot().getElementById("dom-ctx-panel-body") as HTMLDivElement | null
    isCollapsed = panelEl.dataset.collapsed === "1"

    // Re-bind event listeners (old ones were lost when module was re-injected)
    const header = panelEl.querySelector("#dom-ctx-panel-header") as HTMLElement | null
    if (header) setupDrag(header)
    setupCollapseToggle()
    setupCardExpanders()
    setupDescriptionInputs()
    setupPromptSend()
    setupClearAll()
    setupTextareaFocus()
    setupCopyButton()

    // Re-apply current visibility
    if (panelVisible) applyPanelVisibility(true)
    return
  }

  // Load panelVisible setting
  try {
    chrome.storage.local.get(SK_SHORTCUT_CONFIG).then((r) => {
      if (r[SK_SHORTCUT_CONFIG]?.panelVisible) {
        applyPanelVisibility(true)
      }
    }).catch(() => { })
  } catch { /* ignore */ }

  // Create panel
  panelEl = document.createElement("div")
  panelEl.id = "dom-ctx-panel"
  panelEl.setAttribute("aria-hidden", "true")
  panelEl.style.cssText = STYLES.panel
  positionPanel(panelEl, savedRight, savedBottom)

  // Expand tab (left edge, visible when collapsed)
  expandTabEl = document.createElement("div")
  expandTabEl.id = "dom-ctx-expand-tab"
  expandTabEl.style.cssText = STYLES.expandTab
  expandTabEl.innerHTML = `<span style="color:#bbb;font-size:12px;display:flex;align-items:center;justify-content:center">${icon("PanelLeftOpen", 14)}</span>`
  panelEl.appendChild(expandTabEl)

  // Header
  const header = document.createElement("div")
  header.id = "dom-ctx-panel-header"
  header.style.cssText = STYLES.header
  header.innerHTML = `
    <span style="${STYLES.headerTitle}">${t("panelTitle")}</span>
    <span style="${STYLES.headerBadge}" id="dom-ctx-count">0</span>
    <button style="${STYLES.copyBtn}" id="dom-ctx-copy-btn" title="${t("panelCopyTooltip")}">
      ${icon("Copy", 12)}
    </button>
    <button style="${STYLES.collapseBtn}" id="dom-ctx-collapse-btn" title="${t("panelCollapseTooltip")}">${icon("PanelLeftClose", 12)}</button>
  `

  // Body
  bodyEl = document.createElement("div")
  bodyEl.id = "dom-ctx-panel-body"
  bodyEl.style.cssText = STYLES.body
  bodyEl.innerHTML = `<div style="${STYLES.emptyState}">${t("panelEmptyState")}</div>`

  // Prompt area
  const promptArea = document.createElement("div")
  promptArea.style.cssText = STYLES.promptArea
  promptArea.innerHTML = `
    <textarea style="${STYLES.promptTextarea}" id="dom-ctx-prompt-input" placeholder="${t("panelPromptPlaceholder")}"></textarea>
    <button style="${STYLES.sendBtnDisabled}" id="dom-ctx-send-btn" disabled>${t("panelSend")}</button>
    <button style="${STYLES.clearBtn}" id="dom-ctx-clear-btn">${t("panelClearAll")}</button>
  `

  panelEl.appendChild(header)
  panelEl.appendChild(bodyEl)
  panelEl.appendChild(promptArea)
  getShadowRoot().appendChild(panelEl)

  // Event listeners
  setupDrag(header)
  setupCollapseToggle()
  setupCardExpanders()
  setupDescriptionInputs()
  setupPromptSend()
  setupClearAll()
  setupTextareaFocus()
  setupCopyButton()

  // Panel visibility: default hidden, will be updated by async storage read above
  applyPanelVisibility(false)
}

/** Update panel cards from inspector selections */
export function updateCards(selections: Map<string, {
  id: string
  label: string
  element: Element
  elementInfo: { tagName: string; className: string; id: string; innerText: string }
  context: CompressedContext
}>): void {
  if (!bodyEl) return

  const countEl = getShadowRoot().getElementById("dom-ctx-count")
  if (countEl) countEl.textContent = String(selections.size)

  if (selections.size === 0) {
    bodyEl.innerHTML = `<div style="${STYLES.emptyState}">${t("panelEmptyState")}</div>`
    rebindCardEvents()
    return
  }

  const entries = Array.from(selections.values())
  let html = ""

  for (const entry of entries) {
    const se = entry.context.selectedElement
    const colorIndex = entry.label.charCodeAt(0) - 65
    const color = LABEL_COLORS[colorIndex % LABEL_COLORS.length]

    // Build detail sections
    let detailsHtml = ""
    if (se.cssSelector) {
      detailsHtml += `<div><div style="${STYLES.detailLabel}">${t("detailCssSelector")}</div><div><code style="${STYLES.detailCode}; color: #4dabf7">${escHtml(se.cssSelector)}</code></div></div>`
    }
    if (se.xpath) {
      detailsHtml += `<div><div style="${STYLES.detailLabel}">${t("detailXpath")}</div><div><code style="${STYLES.detailCode}; color: #ffa94d">${escHtml(se.xpath)}</code></div></div>`
    }
    if (se.rect) {
      detailsHtml += `<div><div style="${STYLES.detailLabel}">${t("detailBoundingBox")}</div><div><span style="font-size:10px;color:#ccc;font-family:monospace">${Math.round(se.rect.width)} x ${Math.round(se.rect.height)}px | pos: (${Math.round(se.rect.top)}, ${Math.round(se.rect.left)})</span></div></div>`
    }
    if (se.accessibility && se.accessibility.role) {
      const a = se.accessibility
      let accText = `role: <span style="color:#69db7c">${escHtml(a.role)}</span>`
      if (a.ariaLabel) accText += ` | aria-label: <span style="color:#69db7c">${escHtml(a.ariaLabel)}</span>`
      if (a.isFocusable) accText += ` <span style="color:#888">[focusable]</span>`
      if (a.isInteractive) accText += ` <span style="color:#888">[interactive]</span>`
      detailsHtml += `<div><div style="${STYLES.detailLabel}">${t("detailAccessibility")}</div><div><span style="font-size:10px;color:#ccc">${accText}</span></div></div>`
    }
    if (se.styles && Object.keys(se.styles).length > 0) {
      let stylesText = ""
      for (const [k, v] of Object.entries(se.styles)) {
        stylesText += `<div style="display:flex;gap:4px"><span style="color:#888;flex-shrink:0">${escHtml(k)}:</span><span style="color:#ccc;word-break:break-all">${escHtml(v)}</span></div>`
      }
      detailsHtml += `<div><div style="${STYLES.detailLabel}">${t("detailComputedStyles")}</div><div style="max-height:80px;overflow-y:auto">${stylesText}</div></div>`
    }
    if (se.html) {
      detailsHtml += `<div><div style="${STYLES.detailLabel}">${t("detailHtml")}</div><pre style="${STYLES.detailPre}">${escHtml(se.html)}</pre></div>`
    }

    const desc = ""
    const selectorPreview = se.cssSelector
      ? (se.cssSelector.length > 50 ? se.cssSelector.slice(0, 50) + "..." : se.cssSelector)
      : ""
    const textPreview = se.text
      ? (se.text.length > 40 ? se.text.slice(0, 40) + "..." : se.text)
      : ""

    html += `<div class="ctx-card" data-id="${entry.id}" style="${STYLES.card}">
      <div class="ctx-card-header" data-id="${entry.id}" style="${STYLES.cardHeader}">
        <span style="${STYLES.labelBadge};background:${color.bg};color:${color.text}">${entry.label}</span>
        <span style="${STYLES.cardTag}">${escHtml(se.tag)}</span>
        <span class="ctx-card-arrow" data-id="${entry.id}" style="${STYLES.cardArrow}">${icon("ChevronDown", 10)}</span>
        <button class="ctx-card-remove" data-id="${entry.id}" style="${STYLES.removeBtn}" title="${t("panelRemoveTooltip")}">${icon("X", 12)}</button>
      </div>
      ${selectorPreview ? `<div style="padding:2px 8px;font-size:10px;color:#b0b0b0;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(selectorPreview)}</div>` : ""}
      ${textPreview ? `<div style="padding:0 8px 2px;font-size:10px;color:#a0a0a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(textPreview)}</div>` : ""}
      <div class="ctx-card-detail" data-id="${entry.id}" style="${STYLES.cardDetail};display:none">
        ${detailsHtml}
      </div>
      <input class="ctx-desc-input" data-id="${entry.id}" style="${STYLES.descInput}" placeholder="${t("panelDescPlaceholder")}" value="${escAttr(desc)}" />
    </div>`
  }

  bodyEl.innerHTML = html
  rebindCardEvents()
}

/** Destroy the floating panel */
export function destroyPanel(): void {
  if (panelEl && getShadowRoot().contains(panelEl)) {
    panelEl.remove()
    panelEl = null
  }
  expandTabEl = null
  bodyEl = null
  isCollapsed = false
}

// ---------------------------------------------------------------------------
// Internal: Positioning
// ---------------------------------------------------------------------------

function positionPanel(el: HTMLElement, right: number, bottom: number): void {
  el.style.right = `${right}px`
  el.style.bottom = `${bottom}px`
  el.style.left = "auto"
  el.style.top = "auto"
}

// ---------------------------------------------------------------------------
// Internal: Drag (uses Pointer Capture for reliable cross-Shadow-DOM dragging)
// ---------------------------------------------------------------------------

function setupDrag(handle: HTMLElement): void {
  // Clone handle to remove all old listeners (prevents duplication on re-injection)
  const newHandle = handle.cloneNode(true) as HTMLElement
  handle.parentNode?.replaceChild(newHandle, handle)

  newHandle.addEventListener("pointerdown", (e: PointerEvent) => {
    // Don't drag when clicking buttons, SVGs, or interactive elements
    const target = e.target as HTMLElement
    if (target.tagName === "BUTTON" || target.tagName === "SVG" || target.tagName === "USE" ||
        target.closest("button")) return
    isDragging = true
    newHandle.style.cursor = "grabbing"
    const rect = panelEl!.getBoundingClientRect()
    dragOffsetX = e.clientX - rect.left
    dragOffsetY = e.clientY - rect.top
    newHandle.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  newHandle.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isDragging || !panelEl) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    let x = e.clientX - dragOffsetX
    let y = e.clientY - dragOffsetY
    x = Math.max(0, Math.min(x, vw - PANEL_WIDTH))
    y = Math.max(0, Math.min(y, vh - 80))
    savedRight = vw - x - PANEL_WIDTH
    savedBottom = vh - y - panelEl.offsetHeight
    panelEl.style.right = `${Math.max(0, savedRight)}px`
    panelEl.style.bottom = `${Math.max(0, savedBottom)}px`
    panelEl.style.left = "auto"
    panelEl.style.top = "auto"
  })

  const endDrag = () => {
    isDragging = false
    newHandle.style.cursor = "grab"
  }

  newHandle.addEventListener("pointerup", endDrag)
  newHandle.addEventListener("lostpointercapture", endDrag)
}

// ---------------------------------------------------------------------------
// Internal: Collapse/Expand
// ---------------------------------------------------------------------------

function setupCollapseToggle(): void {
  const collapseBtn = getShadowRoot().getElementById("dom-ctx-collapse-btn")
  collapseBtn?.addEventListener("click", () => collapsePanel())
  expandTabEl?.addEventListener("click", () => expandPanel())
}

function collapsePanel(): void {
  if (!panelEl || isCollapsed) return
  isCollapsed = true
  panelEl.dataset.collapsed = "1"
  panelEl.style.right = `${-(PANEL_WIDTH - COLLAPSED_WIDTH)}px`
  if (expandTabEl) expandTabEl.style.cssText = STYLES.expandTabVisible
}

function expandPanel(): void {
  if (!panelEl || !isCollapsed) return
  isCollapsed = false
  panelEl.dataset.collapsed = ""
  positionPanel(panelEl, savedRight, savedBottom)
  if (expandTabEl) expandTabEl.style.cssText = STYLES.expandTab
}

// ---------------------------------------------------------------------------
// Internal: Card expand/collapse
// ---------------------------------------------------------------------------

function setupCardExpanders(): void {
  rebindCardEvents()
}

function rebindCardEvents(): void {
  bodyEl?.querySelectorAll(".ctx-card-header").forEach((headerEl) => {
    const header = headerEl as HTMLElement
    header.addEventListener("click", () => {
      const id = header.dataset.id
      const detail = bodyEl!.querySelector(`.ctx-card-detail[data-id="${id}"]`) as HTMLElement | null
      const arrow = header.querySelector(".ctx-card-arrow")
      if (!detail) return
      const isExpanded = detail.style.display !== "none"
      detail.style.display = isExpanded ? "none" : "block"
      if (arrow) arrow.innerHTML = isExpanded ? icon("ChevronDown", 10) : icon("ChevronUp", 10)
      header.style.cssText = isExpanded ? STYLES.cardHeader : STYLES.cardHeaderHover
    })
    header.addEventListener("mouseenter", () => {
      const id = header.dataset.id
      const detail = bodyEl!.querySelector(`.ctx-card-detail[data-id="${id}"]`) as HTMLElement | null
      if (detail && detail.style.display !== "none") return
      header.style.cssText = STYLES.cardHeaderHover
    })
    header.addEventListener("mouseleave", () => {
      header.style.cssText = STYLES.cardHeader
    })
  })

  // Remove buttons
  bodyEl?.querySelectorAll(".ctx-card-remove").forEach((btnEl) => {
    const btn = btnEl as HTMLElement
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const id = btn.dataset.id
      try { chrome.runtime.sendMessage({ type: "REMOVE_SELECTION", payload: { id } }).catch(() => { }) } catch { /* noop */ }
    })
    btn.addEventListener("mouseenter", () => { btn.style.cssText = STYLES.removeBtnHover })
    btn.addEventListener("mouseleave", () => { btn.style.cssText = STYLES.removeBtn })
  })
}

// ---------------------------------------------------------------------------
// Internal: Description inputs
// ---------------------------------------------------------------------------

function setupDescriptionInputs(): void {
  if (!bodyEl) return
  const observer = new MutationObserver(() => {
    bodyEl?.querySelectorAll(".ctx-desc-input").forEach((inputEl) => {
      const input = inputEl as HTMLInputElement
      if ((input as any)._descBound) return
        ; (input as any)._descBound = true
      input.addEventListener("input", () => {
        const id = input.dataset.id
        try {
          chrome.runtime.sendMessage({
            type: "UPDATE_DESCRIPTION",
            payload: { id, description: input.value },
          }).catch(() => { })
        } catch { /* noop */ }
      })
    })
  })
  observer.observe(bodyEl, { childList: true, subtree: true })
}

// ---------------------------------------------------------------------------
// Internal: Prompt Send
// ---------------------------------------------------------------------------

function setupPromptSend(): void {
  const textarea = getShadowRoot().getElementById("dom-ctx-prompt-input") as HTMLTextAreaElement | null
  const sendBtn = getShadowRoot().getElementById("dom-ctx-send-btn") as HTMLButtonElement | null
  if (!textarea || !sendBtn) return

  textarea.addEventListener("input", () => {
    const hasText = textarea.value.trim().length > 0
    sendBtn.disabled = !hasText
    sendBtn.style.cssText = hasText ? STYLES.sendBtn : STYLES.sendBtnDisabled
  })

  // Send button hover effects
  sendBtn.addEventListener("mouseenter", () => {
    if (!sendBtn.disabled) sendBtn.style.cssText = STYLES.sendBtnHover
  })
  sendBtn.addEventListener("mouseleave", () => {
    sendBtn.style.cssText = sendBtn.disabled ? STYLES.sendBtnDisabled : STYLES.sendBtn
  })

  sendBtn.addEventListener("click", () => {
    const text = textarea.value.trim()
    if (!text) return
    sendBtn.textContent = t("panelSending")
    sendBtn.disabled = true

    // Gather current selections from inspector
    try {
      const contexts: SelectedContext[] = []
      for (const [id, entry] of getSelections()) {
        contexts.push({
          id,
          label: entry.label,
          description: "",
          elementInfo: entry.elementInfo,
          context: entry.context,
          url: window.location.href,
          pageTitle: document.title,
        })
      }
      chrome.runtime.sendMessage({
        type: "SEND_PROMPT",
        payload: { prompt: text, contexts, url: window.location.href, pageTitle: document.title },
      }).then((resp) => {
        sendBtn.textContent = t("panelSent")
        setTimeout(() => {
          sendBtn.textContent = t("panelSend")
          sendBtn.disabled = false
        }, 2000)
      }).catch(() => {
        sendBtn.textContent = t("panelSend")
        sendBtn.disabled = false
      })
    } catch {
      sendBtn.textContent = t("panelSendToClaude")
      sendBtn.disabled = false
    }
  })
}

// ---------------------------------------------------------------------------
// Internal: Textarea focus
// ---------------------------------------------------------------------------

function setupTextareaFocus(): void {
  const textarea = getShadowRoot().getElementById("dom-ctx-prompt-input") as HTMLTextAreaElement | null
  if (!textarea) return
  textarea.addEventListener("focus", () => {
    textarea.style.cssText = STYLES.promptTextarea + STYLES.promptTextareaFocus
  })
  textarea.addEventListener("blur", () => {
    textarea.style.cssText = STYLES.promptTextarea
  })
}

// ---------------------------------------------------------------------------
// Internal: Clear All
// ---------------------------------------------------------------------------

function setupClearAll(): void {
  const clearBtn = getShadowRoot().getElementById("dom-ctx-clear-btn")
  clearBtn?.addEventListener("click", () => {
    try {
      chrome.runtime.sendMessage({ type: "CLEAR_SELECTIONS" }).catch(() => { })
    } catch { /* noop */ }
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function escAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// ---------------------------------------------------------------------------
// Internal: Build prompt for copy
// ---------------------------------------------------------------------------

function buildPanelPrompt(): string {
  const selections = getSelections()
  if (selections.size === 0) return ""

  const lines: string[] = ["# DomLens - Element Selections\n"]
  let hasSourceLocation = false
  for (const [, entry] of selections) {
    const se = entry.context.selectedElement
    lines.push(`## [${entry.label}] Element`)
    lines.push(`- **Tag**: ${se.tag}`)

    // Component info + source location (core differentiator)
    if (se.component) {
      lines.push(`- **Component**: ${se.component.componentName}`)
      if (se.component.sourceLocation) {
        hasSourceLocation = true
        const src = se.component.sourceLocation
        const loc = src.lineNumber > 0 ? `${src.fileName}:${src.lineNumber}` : src.fileName
        lines.push(`- **Source**: \`${loc}\``)
      }
    }

    if (se.cssSelector) lines.push(`- **CSS Selector**: \`${se.cssSelector}\``)
    if (se.xpath) lines.push(`- **XPath**: \`${se.xpath}\``)
    if (entry.elementInfo.id) lines.push(`- **ID**: ${entry.elementInfo.id}`)
    if (entry.elementInfo.className) lines.push(`- **Class**: ${entry.elementInfo.className}`)
    if (se.text) lines.push(`- **Text**: ${se.text.length > 200 ? se.text.slice(0, 200) + "..." : se.text}`)
    if (se.rect) {
      lines.push(`- **Size**: ${Math.round(se.rect.width)} x ${Math.round(se.rect.height)}px`)
      lines.push(`- **Position**: top=${Math.round(se.rect.top)}, left=${Math.round(se.rect.left)}`)
    }
    if (se.accessibility?.role) {
      const a = se.accessibility
      lines.push(`- **Role**: ${a.role}`)
      if (a.ariaLabel) lines.push(`- **ARIA Label**: ${a.ariaLabel}`)
      if (a.isFocusable) lines.push(`- **Focusable**: yes`)
      if (a.isInteractive) lines.push(`- **Interactive**: yes`)
    }
    if (se.styles && Object.keys(se.styles).length > 0) {
      lines.push("- **Computed Styles**:")
      for (const [key, val] of Object.entries(se.styles)) lines.push(`  - ${key}: ${val}`)
    }
    // Layout chain
    if (entry.context.layoutChain && entry.context.layoutChain.length > 0) {
      lines.push("- **Layout Chain**:")
      for (let i = 0; i < entry.context.layoutChain.length; i++) {
        const node = entry.context.layoutChain[i]
        lines.push(`  ${i}: ${node.tag} (${node.display}) ${node.width}px`)
      }
    }
    // Constraint issues
    if (entry.context.possibleIssues && entry.context.possibleIssues.length > 0) {
      lines.push("- **Issues**:")
      for (const issue of entry.context.possibleIssues) {
        lines.push(`  - [${issue.severity}] ${issue.description}`)
      }
    }
    if (se.html) {
      lines.push("- **HTML**:")
      lines.push("```html")
      lines.push(se.html.length > 500 ? se.html.slice(0, 500) + "..." : se.html)
      lines.push("```")
    }
    lines.push("")
  }
  lines.push("## Task")
  if (hasSourceLocation) {
    lines.push("Based on the above runtime context, modify the source file directly. After editing, the page will auto-refresh via HMR.")
  } else {
    lines.push("Based on the above element context, please help fix layout or styling issues.")
  }
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Internal: Copy button
// ---------------------------------------------------------------------------

function setupCopyButton(): void {
  const copyBtn = getShadowRoot().getElementById("dom-ctx-copy-btn")
  if (!copyBtn) return

  copyBtn.addEventListener("mouseenter", () => {
    copyBtn.style.cssText = STYLES.copyBtnHover
  })
  copyBtn.addEventListener("mouseleave", () => {
    copyBtn.style.cssText = STYLES.copyBtn
  })

  copyBtn.addEventListener("click", () => {
    const text = buildPanelPrompt()
    if (!text) return
    try {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = icon("Check", 12, "#4dabf7")
        setTimeout(() => {
          copyBtn.innerHTML = icon("Copy", 12)
        }, 1500)
      }).catch(() => { })
    } catch { /* noop */ }
  })
}

// ---------------------------------------------------------------------------
// Panel visibility control
// ---------------------------------------------------------------------------

function applyPanelVisibility(visible: boolean): void {
  panelVisible = visible
  if (!panelEl) return
  panelEl.style.display = visible ? "flex" : "none"
}

/** Set panel visibility (public API for inspector) */
export function setPanelVisible(visible: boolean): void {
  applyPanelVisibility(visible)
}

// Direct message listener for settings updates (avoids circular dependency issues)
// Use a flag to prevent duplicate registration on content script re-injection
let messageListenerRegistered = false
try {
  if (!messageListenerRegistered) {
    messageListenerRegistered = true
    chrome.runtime.onMessage.addListener((message: { type: string; payload?: unknown }, _sender, sendResponse) => {
      if (message.type === "SETTINGS_UPDATED") {
        const config = message.payload as { panelVisible?: boolean } | undefined
        if (config && config.panelVisible !== undefined) {
          applyPanelVisibility(config.panelVisible)
        }
        sendResponse({ success: true })
        return false
      }
      sendResponse({ success: false, error: "Unknown message type" })
      return false
    })
  }
} catch { /* ignore */ }

// Storage change listener (backup for when content script reloads)
let storageListenerRegistered = false
try {
  if (!storageListenerRegistered) {
    storageListenerRegistered = true
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[SK_SHORTCUT_CONFIG]) {
        const config = changes[SK_SHORTCUT_CONFIG].newValue
        if (config && typeof config.panelVisible === "boolean") {
          applyPanelVisibility(config.panelVisible)
        }
      }
    })
  }
} catch { /* ignore */ }
