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
  | "ANALYZE_FW"

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
        handleRelayToPopup(message, sender, sendResponse)
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

      case "ANALYZE_FW":
        handleAnalyzeFramework(message, sender, sendResponse)
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
 * Injects tabId into payload, persists to storage, and relays to popup.
 * Storage persistence ensures popup can restore selections on reopen.
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

  // Persist to storage so popup can restore on reopen
  try {
    chrome.storage.local.set({ selected_contexts: payload.contexts }).catch(() => {})
  } catch { /* ignore */ }

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

// ---------------------------------------------------------------------------
// Framework Analysis (MAIN world execution)
// ---------------------------------------------------------------------------

/**
 * ANALYZE_FW — Content Script → Background → executeScript(MAIN world)
 *
 * Uses chrome.scripting.executeScript with world: "MAIN" to run the
 * framework analysis function in the page's JavaScript context, where
 * __reactFiber$, __vueParentComponent, etc. are accessible.
 */
async function handleAnalyzeFramework(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  const payload = message.payload as { selector?: string } | undefined
  if (!payload?.selector || !sender.tab?.id) {
    sendResponse({ success: false, error: "Missing selector or tabId" })
    return
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: "MAIN" as any,
      func: FW_ANALYZER_FN,
      args: [payload.selector],
    })

    const result = results?.[0]?.result ?? null
    sendResponse({ success: true, data: result })
  } catch (err) {
    // Some pages (chrome://, etc.) don't allow scripting
    sendResponse({ success: false, error: String(err) })
  }
}

/**
 * This function is serialized by chrome.scripting.executeScript and
 * runs in the page's MAIN world. DO NOT reference external variables.
 */
function FW_ANALYZER_FN(selector: string): any {
  const el = document.querySelector(selector) as HTMLElement | null
  if (!el) return null

  let result: any = null

  // --- React Fiber ---
  try {
    const keys = Object.keys(el)
    for (const key of keys) {
      if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) {
        const fiber = (el as any)[key]
        if (fiber) {
          result = fwAnalyzeReact(fiber)
          break
        }
      }
    }
  } catch {}

  // --- Vue ---
  if (!result) {
    try { result = fwAnalyzeVue(el) } catch {}
  }

  return result
}

function fwAnalyzeReact(fiber: any): any {
  let current = fiber
  let depth = 0
  let componentName = "Unknown"

  while (current && depth < 30) {
    const ft = current.type
    if (typeof ft === "function") {
      componentName = ft.displayName || ft.name || "Unknown"
      if (componentName !== "Unknown") break
    } else if (ft && typeof ft === "object") {
      componentName = ft.displayName || ft.name || (ft.render && (ft.render.displayName || ft.render.name)) || "Unknown"
      if (componentName !== "Unknown") break
    }
    current = current.return
    depth++
  }

  // _debugSource for source mapping
  let sourceLocation = null
  current = fiber
  depth = 0
  while (current && depth < 40) {
    if (typeof current.type !== "string" && current._debugSource) {
      const src = current._debugSource
      if (src && src.fileName) {
        sourceLocation = { fileName: src.fileName, lineNumber: src.lineNumber || 0 }
        if (src.columnNumber != null) (sourceLocation as any).columnNumber = src.columnNumber
        break
      }
    }
    current = current.return
    depth++
  }

  // UI-relevant props
  const props = fiber.memoizedProps
  const allowlist = ["className", "style", "disabled", "placeholder", "href", "src", "alt", "title", "role", "aria-label", "type", "name", "value"]
  let uiProps: any = null
  if (props && typeof props === "object") {
    uiProps = {}
    for (const k of Object.keys(props)) {
      if (allowlist.indexOf(k) !== -1) {
        const v = props[k]
        if (v === null || v === undefined || typeof v !== "object") {
          uiProps[k] = v
        } else if (typeof v === "object" && !Array.isArray(v)) {
          try { uiProps[k] = Object.assign({}, v) } catch { uiProps[k] = "[Object]" }
        }
      }
    }
    if (Object.keys(uiProps).length === 0) uiProps = null
  }

  return {
    componentName,
    ...(uiProps ? { props: uiProps } : {}),
    ...(fiber.stateNode ? { stateNode: true } : {}),
    ...(sourceLocation ? { sourceLocation } : {}),
  }
}

function fwAnalyzeVue(el: HTMLElement): any {
  // Strategy 1: __vueParentComponent (Vue 3 dev)
  let current: HTMLElement | null = el
  let depth = 0
  while (current && depth < 20) {
    const instance = (current as any).__vueParentComponent
    if (instance) {
      const r = fwExtractVue3(instance)
      if (r) return r
    }
    current = current.parentElement
    depth++
  }

  // Strategy 2: Vue 2 __vue__
  current = el
  depth = 0
  while (current && depth < 20) {
    const instance = (current as any).__vue__
    if (instance) return fwExtractVue2(instance)
    current = current.parentElement
    depth++
  }

  // Strategy 3: VNode tree (production-safe)
  let container: HTMLElement | null = el
  while (container && !(container as any).__vue_app__) {
    container = container.parentElement
  }
  if (container) {
    const rootVNode = (container as any)._vnode
    if (rootVNode) {
      const instance = fwFindDeepest(rootVNode, el)
      if (instance) return fwExtractVue3(instance)
    }
  }

  return null
}

function fwExtractVue3(instance: any): any {
  try {
    const type = instance && instance.type
    if (!type) return null
    const componentName = type.displayName || type.name || (typeof type === "string" ? type : "Anonymous") || "Anonymous"
    const sourceFile = type.__file
    let sourceLocation = null
    if (sourceFile) {
      const m = sourceFile.match(/[\\/]src[\\/](.+)/)
      const cleanPath = m ? "src/" + m[1].replace(/\\/g, "/") : sourceFile.replace(/\\/g, "/").split("/").slice(-3).join("/")
      sourceLocation = { fileName: cleanPath, lineNumber: 0 }
    }
    return { componentName, ...(sourceLocation ? { sourceLocation } : {}) }
  } catch { return null }
}

function fwExtractVue2(instance: any): any {
  try {
    const options = instance && instance.$options
    if (!options) return null
    const componentName = options.name || options._componentTag || (instance.$root === instance ? "Root" : "Anonymous")
    const sourceFile = options.__file
    let sourceLocation = null
    if (sourceFile) {
      const m = sourceFile.match(/[\\/]src[\\/](.+)/)
      const cleanPath = m ? "src/" + m[1].replace(/\\/g, "/") : sourceFile.replace(/\\/g, "/").split("/").slice(-3).join("/")
      sourceLocation = { fileName: cleanPath, lineNumber: 0 }
    }
    return { componentName, ...(sourceLocation ? { sourceLocation } : {}) }
  } catch { return null }
}

function fwFindDeepest(vnode: any, targetEl: HTMLElement): any {
  if (!vnode) return null
  if (vnode.component) {
    const instance = vnode.component
    const subTree = instance.subTree
    if (subTree && fwIsInTree(subTree, targetEl)) {
      const deeper = fwFindInChildren(subTree, targetEl)
      if (deeper) return deeper
      return instance
    }
  }
  if (Array.isArray(vnode.children)) {
    for (let i = 0; i < vnode.children.length; i++) {
      const r = fwFindDeepest(vnode.children[i], targetEl)
      if (r) return r
    }
  }
  return null
}

function fwFindInChildren(subTree: any, targetEl: HTMLElement): any {
  if (!subTree) return null
  if (Array.isArray(subTree.children)) {
    for (let i = 0; i < subTree.children.length; i++) {
      const r = fwFindDeepest(subTree.children[i], targetEl)
      if (r) return r
    }
  }
  if (Array.isArray(subTree.dynamicChildren)) {
    for (let i = 0; i < subTree.dynamicChildren.length; i++) {
      const r = fwFindDeepest(subTree.dynamicChildren[i], targetEl)
      if (r) return r
    }
  }
  return null
}

function fwIsInTree(vnode: any, target: HTMLElement): boolean {
  if (!vnode) return false
  if (vnode.el === target) return true
  if (Array.isArray(vnode.children)) {
    for (let i = 0; i < vnode.children.length; i++) {
      if (fwIsInTree(vnode.children[i], target)) return true
    }
  }
  if (vnode.component && vnode.component.subTree) return fwIsInTree(vnode.component.subTree, target)
  if (Array.isArray(vnode.dynamicChildren)) {
    for (let i = 0; i < vnode.dynamicChildren.length; i++) {
      if (fwIsInTree(vnode.dynamicChildren[i], target)) return true
    }
  }
  return false
}