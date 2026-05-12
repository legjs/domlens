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
    z-index: 2147483640;
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
    color: #aaa;
    padding: 1px 6px;
    border-radius: 8px;
    margin-left: 6px;
  `,
  collapseBtn: `
    margin-left: auto;
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 12px;
    line-height: 1;
  `,
  copyBtn: `
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 12px;
    line-height: 1;
  `,
  copyBtnHover: `
    background: none;
    border: none;
    color: #ccc;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 12px;
    line-height: 1;
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
    margin-left: auto;
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
  `,
  removeBtnHover: `
    margin-left: auto;
    background: none;
    border: none;
    color: #e74c3c;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
  `,
  cardArrow: `
    margin-left: auto;
    color: #555;
    font-size: 9px;
    flex-shrink: 0;
  `,
  cardDetail: `
    padding: 6px 8px;
    border-top: 1px solid #2a2a4a;
    font-size: 10px;
    overflow: hidden;
  `,
  detailLabel: `
    font-size: 9px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  `,
  detailCode: `
    font-size: 10px;
    word-break: break-all;
  `,
  detailPre: `
    font-size: 10px;
    background: #0a0f1e;
    border-radius: 4px;
    padding: 4px 6px;
    overflow: auto;
    max-height: 80px;
    font-family: monospace;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    color: #ccc;
    margin: 0;
  `,
  descInput: `
    width: 100%;
    padding: 4px 6px;
    font-size: 10px;
    background: #0f1a2e;
    border: 1px solid #2a2a4a;
    border-radius: 4px;
    color: #ccc;
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
    background: #1a1a2e;
    color: #444;
    cursor: not-allowed;
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
    color: #555;
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
    }).catch(() => {})
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
  expandTabEl.innerHTML = `<span style="color:#888;font-size:12px">&#9654;</span>`
  panelEl.appendChild(expandTabEl)

  // Header
  const header = document.createElement("div")
  header.id = "dom-ctx-panel-header"
  header.style.cssText = STYLES.header
  header.innerHTML = `
    <span style="${STYLES.headerTitle}">DOM Context</span>
    <span style="${STYLES.headerBadge}" id="dom-ctx-count">0</span>
    <button style="${STYLES.copyBtn}" id="dom-ctx-copy-btn" title="Copy prompt">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    </button>
    <button style="${STYLES.collapseBtn}" id="dom-ctx-collapse-btn" title="Collapse">&#9664;</button>
  `

  // Body
  bodyEl = document.createElement("div")
  bodyEl.id = "dom-ctx-panel-body"
  bodyEl.style.cssText = STYLES.body
  bodyEl.innerHTML = `<div style="${STYLES.emptyState}">No elements selected</div>`

  // Prompt area
  const promptArea = document.createElement("div")
  promptArea.style.cssText = STYLES.promptArea
  promptArea.innerHTML = `
    <textarea style="${STYLES.promptTextarea}" id="dom-ctx-prompt-input" placeholder="Describe what you want to fix or change..."></textarea>
    <button style="${STYLES.sendBtnDisabled}" id="dom-ctx-send-btn" disabled>Send</button>
    <button style="${STYLES.clearBtn}" id="dom-ctx-clear-btn">Clear All</button>
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
    bodyEl.innerHTML = `<div style="${STYLES.emptyState}">No elements selected</div>`
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
      detailsHtml += `<div><div style="${STYLES.detailLabel}">CSS Selector</div><div><code style="${STYLES.detailCode}; color: #4dabf7">${escHtml(se.cssSelector)}</code></div></div>`
    }
    if (se.xpath) {
      detailsHtml += `<div><div style="${STYLES.detailLabel}">XPath</div><div><code style="${STYLES.detailCode}; color: #ffa94d">${escHtml(se.xpath)}</code></div></div>`
    }
    if (se.rect) {
      detailsHtml += `<div><div style="${STYLES.detailLabel}">Bounding Box</div><div><span style="font-size:10px;color:#ccc;font-family:monospace">${Math.round(se.rect.width)} x ${Math.round(se.rect.height)}px | pos: (${Math.round(se.rect.top)}, ${Math.round(se.rect.left)})</span></div></div>`
    }
    if (se.accessibility && se.accessibility.role) {
      const a = se.accessibility
      let accText = `role: <span style="color:#69db7c">${escHtml(a.role)}</span>`
      if (a.ariaLabel) accText += ` | aria-label: <span style="color:#69db7c">${escHtml(a.ariaLabel)}</span>`
      if (a.isFocusable) accText += ` <span style="color:#888">[focusable]</span>`
      if (a.isInteractive) accText += ` <span style="color:#888">[interactive]</span>`
      detailsHtml += `<div><div style="${STYLES.detailLabel}">Accessibility</div><div><span style="font-size:10px;color:#ccc">${accText}</span></div></div>`
    }
    if (se.styles && Object.keys(se.styles).length > 0) {
      let stylesText = ""
      for (const [k, v] of Object.entries(se.styles)) {
        stylesText += `<div style="display:flex;gap:4px"><span style="color:#888;flex-shrink:0">${escHtml(k)}:</span><span style="color:#ccc;word-break:break-all">${escHtml(v)}</span></div>`
      }
      detailsHtml += `<div><div style="${STYLES.detailLabel}">Computed Styles</div><div style="max-height:80px;overflow-y:auto">${stylesText}</div></div>`
    }
    if (se.html) {
      detailsHtml += `<div><div style="${STYLES.detailLabel}">HTML</div><pre style="${STYLES.detailPre}">${escHtml(se.html)}</pre></div>`
    }

    const desc = entry.context.description || ""
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
        <button class="ctx-card-remove" data-id="${entry.id}" style="${STYLES.removeBtn}" title="Remove">&#10005;</button>
        <span class="ctx-card-arrow" data-id="${entry.id}" style="${STYLES.cardArrow}">&#9660;</span>
      </div>
      ${selectorPreview ? `<div style="padding:2px 8px;font-size:10px;color:#888;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(selectorPreview)}</div>` : ""}
      ${textPreview ? `<div style="padding:0 8px 2px;font-size:10px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(textPreview)}</div>` : ""}
      <div class="ctx-card-detail" data-id="${entry.id}" style="${STYLES.cardDetail};display:none">
        ${detailsHtml}
      </div>
      <input class="ctx-desc-input" data-id="${entry.id}" style="${STYLES.descInput}" placeholder="Add description..." value="${escAttr(desc)}" />
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
    if ((e.target as HTMLElement).tagName === "BUTTON") return
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
  bodyEl?.querySelectorAll(".ctx-card-header").forEach((header) => {
    header.addEventListener("click", () => {
      const id = (header as HTMLElement).dataset.id
      const detail = bodyEl!.querySelector(`.ctx-card-detail[data-id="${id}"]`) as HTMLElement | null
      const arrow = header.querySelector(".ctx-card-arrow")
      if (!detail) return
      const isExpanded = detail.style.display !== "none"
      detail.style.display = isExpanded ? "none" : "block"
      if (arrow) arrow.innerHTML = isExpanded ? "&#9660;" : "&#9650;"
      header.style.cssText = isExpanded ? STYLES.cardHeader : STYLES.cardHeaderHover
    })
    header.addEventListener("mouseenter", () => {
      const id = (header as HTMLElement).dataset.id
      const detail = bodyEl!.querySelector(`.ctx-card-detail[data-id="${id}"]`) as HTMLElement | null
      if (detail && detail.style.display !== "none") return
      header.style.cssText = STYLES.cardHeaderHover
    })
    header.addEventListener("mouseleave", () => {
      header.style.cssText = STYLES.cardHeader
    })
  })

  // Remove buttons
  bodyEl?.querySelectorAll(".ctx-card-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const id = (btn as HTMLElement).dataset.id
      try { chrome.runtime.sendMessage({ type: "REMOVE_SELECTION", payload: { id } }).catch(() => {}) } catch { /* noop */ }
    })
    btn.addEventListener("mouseenter", () => { btn.style.cssText = STYLES.removeBtnHover })
    btn.addEventListener("mouseleave", () => { btn.style.cssText = STYLES.removeBtn })
  })
}

// ---------------------------------------------------------------------------
// Internal: Description inputs
// ---------------------------------------------------------------------------

function setupDescriptionInputs(): void {
  rebindCardEvents() // also rebinds input events
}

// Rebind description inputs is done in rebindCardEvents
function rebindDescriptionInputs(): void {
  bodyEl?.querySelectorAll(".ctx-desc-input").forEach((input) => {
    const id = (input as HTMLElement).dataset.id
    // Remove old listeners by cloning
    const clone = input.cloneNode(true) as HTMLInputElement
    input.parentNode?.replaceChild(clone, input)
    clone.addEventListener("input", () => {
      try {
        chrome.runtime.sendMessage({
          type: "UPDATE_DESCRIPTION",
          payload: { id, description: clone.value },
        }).catch(() => {})
      } catch { /* noop */ }
    })
  })
}

// Override rebindCardEvents to also rebind description inputs
const _origRebind = rebindCardEvents
function rebindCardEventsAll(): void {
  _origRebind()
  rebindDescriptionInputs()
}

// Patch rebindCardEvents to include description inputs
const origRebindCardEvents = rebindCardEvents
// We'll handle this differently - just call rebindDescriptionInputs after

// Actually, let's simplify - just override setupDescriptionInputs to use MutationObserver
function setupDescriptionInputsObserver(): void {
  // Rebind description inputs whenever bodyEl changes
  if (!bodyEl) return
  const observer = new MutationObserver(() => {
    bodyEl?.querySelectorAll(".ctx-desc-input").forEach((input) => {
      if ((input as HTMLInputElement)._bound) return
      ;(input as HTMLInputElement)._bound = true
      input.addEventListener("input", () => {
        const id = (input as HTMLElement).dataset.id
        try {
          chrome.runtime.sendMessage({
            type: "UPDATE_DESCRIPTION",
            payload: { id, description: (input as HTMLInputElement).value },
          }).catch(() => {})
        } catch { /* noop */ }
      })
    })
  })
  observer.observe(bodyEl, { childList: true, subtree: true })
}

// Override setupDescriptionInputs
function setupDescriptionInputs(): void {
  setupDescriptionInputsObserver()
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

  sendBtn.addEventListener("click", () => {
    const text = textarea.value.trim()
    if (!text) return
    sendBtn.textContent = "Sending..."
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
        sendBtn.textContent = "Sent!"
        setTimeout(() => {
          sendBtn.textContent = "Send"
          sendBtn.disabled = false
        }, 2000)
      }).catch(() => {
        sendBtn.textContent = "Send"
        sendBtn.disabled = false
      })
    } catch {
      sendBtn.textContent = "Send to Claude Code"
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
      chrome.runtime.sendMessage({ type: "CLEAR_SELECTIONS" }).catch(() => {})
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

  const lines: string[] = ["# DOM Context - Element Selections\n"]
  for (const [, entry] of selections) {
    const se = entry.context.selectedElement
    lines.push(`## [${entry.label}] Element`)
    lines.push(`- **Tag**: ${se.tag}`)
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
    if (se.html) {
      lines.push("- **HTML**:")
      lines.push("```html")
      lines.push(se.html.length > 500 ? se.html.slice(0, 500) + "..." : se.html)
      lines.push("```")
    }
    lines.push("")
  }
  lines.push("## Task")
  lines.push("Based on the above element context, please help fix layout or styling issues.")
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
        copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4dabf7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
        }, 1500)
      }).catch(() => {})
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
