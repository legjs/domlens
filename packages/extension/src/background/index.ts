/**
 * Background Service Worker
 *
 * Central message hub for the DomLens extension.
 * Routes messages between the popup, content scripts, and runtime server.
 *
 * Communication flow:
 *   Content --[MULTI_ELEMENTS_SELECTED]--> Background --[relay]--> Popup
 *   Content --[INSPECTOR_STATUS]---------> Background --[relay]--> Popup
 *   Content --[CONTEXT_CAPTURED]---------> Background --[HTTP POST]--> Runtime Server
 *   Popup   --[TOGGLE_INSPECTOR]---------> Background --[forward]--> Content
 *   Popup   --[CLEAR_SELECTIONS]---------> Background --[forward]--> Content
 *   Popup   --[REMOVE_SELECTION]---------> Background --[forward]--> Content
 */

import { SERVER_PORT_RANGE, SK_SERVER_PORT } from "../shared/constants"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageType =
  | "TOGGLE_INSPECTOR"
  | "ELEMENT_SELECTED"
  | "INSPECTOR_STATUS"
  | "CONTEXT_CAPTURED"
  | "MULTI_ELEMENTS_SELECTED"
  | "CLEAR_SELECTIONS"
  | "REMOVE_SELECTION"
  | "SEND_PROMPT"
  | "UPDATE_DESCRIPTION"
  | "SETTINGS_UPDATED"

interface ExtensionMessage {
  type: MessageType
  payload?: unknown
}

// ---------------------------------------------------------------------------
// State (in-memory, service-worker lifetime only)
// ---------------------------------------------------------------------------

/** Inspector active state per tab */
const inspectorState = new Map<number, boolean>()

/** Cached server port */
let cachedPort: number | null = null

async function discoverServerPort(): Promise<number | null> {
  if (cachedPort !== null) return cachedPort
  try {
    const r = await chrome.storage.local.get(SK_SERVER_PORT)
    if (r[SK_SERVER_PORT]) {
      cachedPort = r[SK_SERVER_PORT]
      return cachedPort
    }
  } catch { /* ignore */ }
  for (const port of SERVER_PORT_RANGE) {
    try {
      const res = await fetch('http://localhost:' + port + '/api/health', { signal: AbortSignal.timeout(500) })
      if (res.ok) {
        cachedPort = port
        try { await chrome.storage.local.set({ [SK_SERVER_PORT]: port }) } catch { /* ignore */ }
        return port
      }
    } catch { /* next */ }
  }
  return null
}

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[DomLens] Extension installed/updated:", details.reason)
  inspectorState.clear()
})

// ---------------------------------------------------------------------------
// Message routing
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (!message || !message.type) {
      sendResponse({ success: false, error: "Invalid message format" })
      return false
    }

    switch (message.type) {
      case "TOGGLE_INSPECTOR":
        handleToggleInspector(message, sender, sendResponse)
        return true

      case "ELEMENT_SELECTED":
        handleRelayToPopup(message, sendResponse)
        return false

      case "MULTI_ELEMENTS_SELECTED":
        handleMultiElementsSelected(message, sender, sendResponse)
        return false

      case "INSPECTOR_STATUS":
        handleInspectorStatus(message, sender, sendResponse)
        return false

      case "CONTEXT_CAPTURED":
        handleContextCaptured(message, sender, sendResponse)
        return true

      case "CLEAR_SELECTIONS":
      case "REMOVE_SELECTION":
      case "UPDATE_DESCRIPTION":
      case "SETTINGS_UPDATED":
        handleForwardToContentScript(message, sender, sendResponse)
        return true

      case "SEND_PROMPT":
        handleSendPrompt(message, sender, sendResponse)
        return true

      default:
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` })
        return false
    }
  }
)

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

/**
 * TOGGLE_INSPECTOR — Popup → Background → Content Script
 */
async function handleToggleInspector(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  const payload = message.payload as { active: boolean } | undefined
  if (!payload || typeof payload.active !== "boolean") {
    sendResponse({ success: false, error: "Invalid payload" })
    return
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab || !tab.id) {
      sendResponse({ success: false, error: "No active tab" })
      return
    }

    inspectorState.set(tab.id, payload.active)

    await chrome.tabs.sendMessage(tab.id, {
      type: "TOGGLE_INSPECTOR",
      payload: { active: payload.active },
    })

    sendResponse({ success: true })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    if (errorMsg.includes("Could not establish connection") ||
        errorMsg.includes("Receiving end does not exist")) {
      sendResponse({ success: false, error: "Content script not available" })
      return
    }
    console.error("[DomLens] Error forwarding TOGGLE_INSPECTOR:", err)
    sendResponse({ success: false, error: errorMsg })
  }
}

/**
 * MULTI_ELEMENTS_SELECTED — Content → Background → Popup
 *
 * Injects tabId into payload and relays to popup.
 */
function handleMultiElementsSelected(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): void {
  // Inject tabId if not present
  const payload = message.payload as { contexts: unknown[]; tabId?: number }
  if (sender.tab?.id && !payload.tabId) {
    payload.tabId = sender.tab.id
  }

  // Relay to popup
  try {
    chrome.runtime.sendMessage({
      type: "MULTI_ELEMENTS_SELECTED",
      payload,
    }).catch(() => {
      // Popup likely closed
    })
  } catch {
    // Extension context invalidated
  }

  sendResponse({ success: true })
}

/**
 * ELEMENT_SELECTED — Legacy relay to popup
 */
function handleRelayToPopup(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): void {
  try {
    chrome.runtime.sendMessage(message).catch(() => {})
  } catch {}
  sendResponse({ success: true })
}

/**
 * INSPECTOR_STATUS — Content → Background → Popup
 */
function handleInspectorStatus(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): void {
  const payload = message.payload as { active: boolean } | undefined
  if (payload && typeof payload.active === "boolean" && sender.tab?.id) {
    inspectorState.set(sender.tab.id, payload.active)
  }

  try {
    chrome.runtime.sendMessage(message).catch(() => {})
  } catch {}

  sendResponse({ success: true })
}

/**
 * CONTEXT_CAPTURED — Content → Background → Runtime Server
 *
 * Injects tabId into payload for server-side isolation.
 */
async function handleContextCaptured(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  const payload = message.payload as
    | { context: unknown; url: string; pageTitle?: string; tabId?: number; selectionId?: string; selectionLabel?: string }
    | undefined

  if (!payload || !payload.context || !payload.url) {
    sendResponse({ success: false, error: "Invalid CONTEXT_CAPTURED payload" })
    return
  }

  // Inject tabId
  if (sender.tab?.id && !payload.tabId) {
    payload.tabId = sender.tab.id
  }

  try {
    const port = await discoverServerPort()
    if (!port) {
      sendResponse({ success: false, error: "Runtime server not available" })
      return
    }
    const response = await fetch(`http://localhost:${port}/api/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.warn("[DomLens] Server returned status:", response.status)
    }

    sendResponse({ success: true })
  } catch (err) {
    console.warn("[DomLens] Cannot reach runtime server:", err instanceof Error ? err.message : String(err))
    sendResponse({ success: false, error: "Runtime server not available" })
  }
}

/**
 * Forward messages to content script in active tab.
 * Used for CLEAR_SELECTIONS and REMOVE_SELECTION.
 */
async function handleForwardToContentScript(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab || !tab.id) {
      sendResponse({ success: false, error: "No active tab" })
      return
    }

    await chrome.tabs.sendMessage(tab.id, message)
    sendResponse({ success: true })
  } catch (err) {
    sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
}

/**
 * SEND_PROMPT — Panel → Background → Runtime Server
 *
 * Receives user prompt + element contexts from the floating panel
 * and forwards them to the Runtime Server's /api/prompt endpoint.
 */
async function handleSendPrompt(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  const payload = message.payload as {
    prompt: string
    contexts?: unknown[]
    url?: string
    pageTitle?: string
  } | undefined

  if (!payload || !payload.prompt) {
    sendResponse({ success: false, error: "Invalid SEND_PROMPT payload" })
    return
  }

  try {
    const port = await discoverServerPort()
    if (!port) {
      sendResponse({ success: false, error: "Runtime server not available" })
      return
    }

    const tabId = sender.tab?.id
    const response = await fetch(`http://localhost:${port}/api/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: payload.prompt,
        contexts: payload.contexts || [],
        url: payload.url || "",
        pageTitle: payload.pageTitle,
        tabId,
      }),
    })

    if (!response.ok) {
      console.warn("[DomLens] Server returned status:", response.status)
      sendResponse({ success: false, error: "Server error" })
      return
    }

    sendResponse({ success: true })
  } catch (err) {
    console.warn("[DomLens] Cannot reach runtime server:", err instanceof Error ? err.message : String(err))
    sendResponse({ success: false, error: "Runtime server not available" })
  }
}

// ---------------------------------------------------------------------------
// Toolbar icon click
// ---------------------------------------------------------------------------

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return
  if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://"))) {
    return
  }

  const currentState = inspectorState.get(tab.id) ?? false

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "TOGGLE_INSPECTOR",
      payload: { active: !currentState },
    })
    inspectorState.set(tab.id, !currentState)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    if (errorMsg.includes("Could not establish connection") ||
        errorMsg.includes("Receiving end does not exist")) {
      console.warn("[DomLens] Cannot toggle on this page.")
      return
    }
    console.error("[DomLens] Error on icon click:", err)
  }
})
