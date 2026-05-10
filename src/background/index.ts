/**
 * Background Service Worker
 *
 * Central message hub for the AI Runtime Inspector extension.
 * Routes messages between the popup, content scripts, and future MCP server.
 *
 * Communication flow:
 *   Popup  --[TOGGLE_INSPECTOR]--> Background --[TOGGLE_INSPECTOR]--> Content
 *   Content --[ELEMENT_SELECTED]--> Background --[ELEMENT_SELECTED]--> Popup
 *   Content --[INSPECTOR_STATUS]--> Background --[INSPECTOR_STATUS]--> Popup
 *   Content --[CONTEXT_CAPTURED]--> Background --[HTTP POST]--> Runtime Server
 *
 * Lifecycle note (Manifest V3):
 *   The service worker is stateless — it can be terminated at any time by Chrome.
 *   Inspector state stored here is in-memory only and survives while the SW lives.
 *   For persistent state across SW restarts, use chrome.storage (future enhancement).
 */

import { SERVER_URL } from "../shared/constants"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Union of all message types the background handles */
type MessageType =
  | "TOGGLE_INSPECTOR"
  | "ELEMENT_SELECTED"
  | "INSPECTOR_STATUS"
  | "CONTEXT_CAPTURED"

interface ExtensionMessage {
  type: MessageType
  payload?: unknown
}

// ---------------------------------------------------------------------------
// State (in-memory, service-worker lifetime only)
// ---------------------------------------------------------------------------

/** Whether the inspector is currently active on any tab */
let inspectorActive = false

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[AI Runtime Inspector] Extension installed/updated:", details.reason)
  inspectorActive = false
})

// ---------------------------------------------------------------------------
// Message routing
// ---------------------------------------------------------------------------

/**
 * Central message listener.
 *
 * Routes messages based on source:
 * - From popup  → forward to active tab's content script
 * - From content → forward to popup (chrome.runtime.sendMessage)
 * - Internal    → handle directly
 */
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (!message || !message.type) {
      sendResponse({ success: false, error: "Invalid message format" })
      return false
    }

    switch (message.type) {
      case "TOGGLE_INSPECTOR":
        handleToggleInspector(message, sender, sendResponse)
        return true // async response

      case "ELEMENT_SELECTED":
        handleElementSelected(message, sender, sendResponse)
        return false

      case "INSPECTOR_STATUS":
        handleInspectorStatus(message, sender, sendResponse)
        return false

      case "CONTEXT_CAPTURED":
        handleContextCaptured(message, sender, sendResponse)
        return true // async response

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
 * TOGGLE_INSPECTOR — Popup/toolbar → Background → Content Script
 *
 * When the popup sends this, we forward it to the active tab's content script.
 * When triggered by the toolbar icon click, this is also called.
 */
async function handleToggleInspector(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  const payload = message.payload as { active: boolean } | undefined
  if (!payload || typeof payload.active !== "boolean") {
    sendResponse({ success: false, error: "Invalid TOGGLE_INSPECTOR payload" })
    return
  }

  inspectorActive = payload.active

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (!tab || !tab.id) {
      sendResponse({ success: false, error: "No active tab found" })
      return
    }

    await chrome.tabs.sendMessage(tab.id, {
      type: "TOGGLE_INSPECTOR",
      payload: { active: payload.active },
    })

    sendResponse({ success: true })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    // chrome.tabs.sendMessage fails when content script is not injected
    // (e.g. on chrome:// pages, new tab page, etc.)
    if (errorMsg.includes("Could not establish connection") ||
        errorMsg.includes("Receiving end does not exist")) {
      console.warn(
        "[AI Runtime Inspector] Content script not available on this tab. " +
        "Try a regular web page."
      )
      sendResponse({
        success: false,
        error: "Content script not available on this tab",
      })
      return
    }

    console.error("[AI Runtime Inspector] Error forwarding TOGGLE_INSPECTOR:", err)
    sendResponse({ success: false, error: errorMsg })
  }
}

/**
 * ELEMENT_SELECTED — Content Script → Background → Popup
 *
 * The content script sends this when a user clicks on an element.
 * We store state and relay to the popup via chrome.runtime.sendMessage.
 * (popup picks this up via its own chrome.runtime.onMessage listener)
 *
 * Note: chrome.runtime.sendMessage only reaches other extension pages
 * (popup, options). If popup is closed, this is silently dropped.
 */
function handleElementSelected(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): void {
  // Relay to popup — errors are expected if popup is closed
  try {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup likely closed — not an error condition
    })
  } catch {
    // Extension context may be invalidated
  }

  sendResponse({ success: true })
}

/**
 * INSPECTOR_STATUS — Content Script → Background → Popup
 *
 * The content script sends this when the inspector state changes
 * (activated, deactivated, or Escape pressed).
 */
function handleInspectorStatus(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): void {
  const payload = message.payload as { active: boolean } | undefined
  if (payload && typeof payload.active === "boolean") {
    inspectorActive = payload.active
  }

  // Relay to popup
  try {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup likely closed
    })
  } catch {
    // Extension context may be invalidated
  }

  sendResponse({ success: true })
}

/**
 * CONTEXT_CAPTURED — Content Script → Background → Runtime Server
 *
 * The content script sends this when a user clicks on an element.
 * We forward the compressed context payload to the local Runtime server
 * via HTTP POST for storage and later retrieval by the MCP server.
 */
async function handleContextCaptured(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  const payload = message.payload as
    | { context: unknown; url: string; pageTitle?: string }
    | undefined

  if (!payload || !payload.context || !payload.url) {
    sendResponse({ success: false, error: "Invalid CONTEXT_CAPTURED payload" })
    return
  }

  try {
    const response = await fetch(`${SERVER_URL}/api/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.warn(
        "[AI Runtime Inspector] Server returned status:",
        response.status
      )
    }

    sendResponse({ success: true })
  } catch (err) {
    // Server not running — silent fail
    console.warn(
      "[AI Runtime Inspector] Cannot reach runtime server:",
      err instanceof Error ? err.message : String(err)
    )
    sendResponse({ success: false, error: "Runtime server not available" })
  }
}

// ---------------------------------------------------------------------------
// Toolbar icon click
// ---------------------------------------------------------------------------

/**
 * Toggle the inspector when the user clicks the extension toolbar icon.
 * Falls back to querying the current inspector state if unknown.
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return

  // Cannot use toolbar click on chrome:// pages
  if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://"))) {
    return
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "TOGGLE_INSPECTOR",
      payload: { active: !inspectorActive },
    })
    inspectorActive = !inspectorActive
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    if (errorMsg.includes("Could not establish connection") ||
        errorMsg.includes("Receiving end does not exist")) {
      console.warn(
        "[AI Runtime Inspector] Cannot toggle inspector on this page. " +
        "Navigate to a regular web page first."
      )
      return
    }

    console.error("[AI Runtime Inspector] Error on icon click:", err)
  }
})

// ---------------------------------------------------------------------------
// MCP Integration Points (future)
// ---------------------------------------------------------------------------

// TODO: MCP Server Connection
// When the MCP (Model Context Protocol) server is implemented:
// 1. Establish a long-lived connection via chrome.runtime.connectNative or WebSocket
// 2. Forward ELEMENT_SELECTED payloads to the MCP server for AI processing
// 3. Receive analysis results and relay them back to the popup
//
// Example integration structure:
//   chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
//     if (msg.type === 'MCP_ANALYZE') {
//       forwardToMcpServer(msg.payload)
//         .then(result => sendResponse({ success: true, data: result }))
//         .catch(err => sendResponse({ success: false, error: err.message }))
//       return true // async
//     }
//   })

// TODO: MCP Server Commands
// Future commands that the MCP server may send through the background:
// - INSPECT_ELEMENT: Programmatically select an element by CSS selector
// - GET_PAGE_CONTEXT: Collect full page DOM context
// - EXECUTE_SCRIPT: Run a script in the active tab's content script context
// - NAVIGATE: Open a URL in the current tab
