/**
 * Inline Prompt Module
 *
 * Shows a small input dialog near the last selected element
 * for quickly sending a prompt + context to Claude Code.
 */

import type { SelectedContext } from "~shared/types"
import { getSelections } from "~lib/inspector"
import { getShadowRoot } from "~lib/shadow-host"

const INLINE_PROMPT_ID = "dom-ctx-inline-prompt"
let promptEl: HTMLDivElement | null = null
let textareaEl: HTMLTextAreaElement | null = null
let sendBtnEl: HTMLButtonElement | null = null
let closeBtnEl: HTMLButtonElement | null = null
let visible = false

const STYLES = {
  container: `
    position: fixed;
    z-index: 2147483648;
    width: 280px;
    background: #0f1629;
    border: 1px solid #2a2a4a;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    padding: 8px;
    display: none;
    flex-direction: column;
    gap: 6px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    pointer-events: auto;
  `,
  textarea: `
    width: 100%;
    min-height: 54px;
    max-height: 120px;
    resize: vertical;
    background: #0a0f1e;
    border: 1px solid #2a2a4a;
    border-radius: 4px;
    padding: 6px 8px;
    color: #e0e0e0;
    font-size: 12px;
    font-family: inherit;
    line-height: 1.4;
    outline: none;
    box-sizing: border-box;
  `,
  textareaFocus: `
    border-color: #4dabf7;
    box-shadow: 0 0 0 1px #4dabf7;
  `,
  btnRow: `
    display: flex;
    gap: 4px;
    align-items: center;
  `,
  sendBtn: `
    flex: 1;
    padding: 5px 10px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  `,
  sendBtnDisabled: `
    flex: 1;
    padding: 5px 10px;
    background: #1a1a2e;
    color: #444;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: not-allowed;
    font-family: inherit;
  `,
  closeBtn: `
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: #666;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
    font-family: inherit;
  `,
}

function createPrompt(): void {
  if (promptEl) return

  promptEl = document.createElement("div")
  promptEl.id = INLINE_PROMPT_ID
  promptEl.style.cssText = STYLES.container
  promptEl.setAttribute("aria-hidden", "true")

  // Textarea
  textareaEl = document.createElement("textarea")
  textareaEl.style.cssText = STYLES.textarea
  textareaEl.placeholder = "Describe what you want to change..."

  // Button row
  const btnRow = document.createElement("div")
  btnRow.style.cssText = STYLES.btnRow

  sendBtnEl = document.createElement("button")
  sendBtnEl.textContent = "Send"
  sendBtnEl.style.cssText = STYLES.sendBtnDisabled
  sendBtnEl.disabled = true

  closeBtnEl = document.createElement("button")
  closeBtnEl.innerHTML = "&#10005;"
  closeBtnEl.style.cssText = STYLES.closeBtn
  closeBtnEl.title = "Close"

  btnRow.appendChild(sendBtnEl)
  btnRow.appendChild(closeBtnEl)
  promptEl.appendChild(textareaEl)
  promptEl.appendChild(btnRow)

  // Event: textarea input
  textareaEl.addEventListener("input", () => {
    const hasText = textareaEl!.value.trim().length > 0
    sendBtnEl!.disabled = !hasText
    sendBtnEl!.style.cssText = hasText ? STYLES.sendBtn : STYLES.sendBtnDisabled
  })

  // Event: textarea focus/blur
  textareaEl.addEventListener("focus", () => {
    textareaEl!.style.cssText = STYLES.textarea + STYLES.textareaFocus
  })
  textareaEl.addEventListener("blur", () => {
    textareaEl!.style.cssText = STYLES.textarea
  })

  // Event: send
  sendBtnEl.addEventListener("click", handleSend)

  // Event: close
  closeBtnEl.addEventListener("click", hideInlinePrompt)

  // Prevent clicks inside prompt from propagating to inspector
  promptEl.addEventListener("mousedown", (e) => e.stopPropagation())
  promptEl.addEventListener("click", (e) => e.stopPropagation())

  getShadowRoot().appendChild(promptEl)
}

function handleSend(): void {
  const text = textareaEl?.value.trim()
  if (!text) return

  sendBtnEl!.textContent = "Sending..."
  sendBtnEl!.disabled = true

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
  }).then(() => {
    textareaEl!.value = ""
    sendBtnEl!.textContent = "Sent!"
    setTimeout(() => {
      sendBtnEl!.textContent = "Send"
      sendBtnEl!.disabled = true
      sendBtnEl!.style.cssText = STYLES.sendBtnDisabled
      hideInlinePrompt()
    }, 800)
  }).catch(() => {
    sendBtnEl!.textContent = "Send"
    sendBtnEl!.disabled = false
    sendBtnEl!.style.cssText = STYLES.sendBtn
  })
}

function positionNearElement(rect: DOMRect): void {
  if (!promptEl) return

  const gap = 8
  const promptWidth = 280
  const vpWidth = window.innerWidth
  const vpHeight = window.innerHeight

  // Try right-bottom first, then left-bottom
  let left = rect.right + gap
  let top = rect.bottom + gap

  if (left + promptWidth > vpWidth - 16) {
    left = rect.left - promptWidth - gap
  }
  if (left < 8) {
    left = 8
  }
  // If still overflowing right, just align to right edge
  if (left + promptWidth > vpWidth - 8) {
    left = Math.max(8, vpWidth - promptWidth - 8)
  }
  // Clamp vertically
  if (top + 120 > vpHeight) {
    top = Math.max(8, vpHeight - 140)
  }

  promptEl.style.left = `${left}px`
  promptEl.style.top = `${top}px`
}

/**
 * Show the inline prompt near the given element's bounding rect.
 */
export function showInlinePrompt(rect: DOMRect): void {
  createPrompt()
  if (!promptEl) return

  positionNearElement(rect)
  promptEl.style.display = "flex"
  visible = true

  // Focus textarea
  setTimeout(() => textareaEl?.focus(), 50)
}

/**
 * Move the inline prompt to a new position near the given element.
 */
export function moveInlinePrompt(rect: DOMRect): void {
  if (!visible || !promptEl) return
  positionNearElement(rect)
}

/**
 * Hide the inline prompt.
 */
export function hideInlinePrompt(): void {
  if (!promptEl) return
  promptEl.style.display = "none"
  visible = false
}

/**
 * Check if the inline prompt is currently visible.
 */
export function isInlinePromptVisible(): boolean {
  return visible
}

/**
 * Destroy the inline prompt element.
 */
export function destroyInlinePrompt(): void {
  if (promptEl && getShadowRoot().contains(promptEl)) {
    promptEl.remove()
  }
  promptEl = null
  textareaEl = null
  sendBtnEl = null
  closeBtnEl = null
  visible = false
}
