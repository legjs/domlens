import { useEffect, useCallback, useRef, useState } from "react"
import "~src/style.css"
import usePopupStore, { loadPersistedState } from "~store"
import type { SelectedContext, ShortcutConfig } from "~shared/types"
import { SERVER_PORT_RANGE, SK_SERVER_PORT, SK_SHORTCUT_CONFIG, INSPECT_KEYS, MULTI_SELECT_KEYS, DEFAULT_SHORTCUT_CONFIG } from "~shared/constants"

function IndexPopup() {
  const {
    inspectorActive,
    toggleActive,
    selectedContexts,
    copied,
    serverPort,
    setInspectorActive,
    setToggleActive,
    setSelectedContexts,
    setPromptText,
    setCopied,
    setServerPort,
  } = usePopupStore()

  const [showSettings, setShowSettings] = useState(false)
  const [shortcutConfig, setShortcutConfig] = useState<ShortcutConfig>({ ...DEFAULT_SHORTCUT_CONFIG })
  // Load shortcut config on mount
  useEffect(() => {
    chrome.storage.local.get(SK_SHORTCUT_CONFIG).then((r) => {
      if (r[SK_SHORTCUT_CONFIG]) {
        setShortcutConfig({ ...DEFAULT_SHORTCUT_CONFIG, ...(r[SK_SHORTCUT_CONFIG] as Partial<ShortcutConfig>) })
      }
    }).catch(() => {})
  }, [])

  // Auto-save settings on every change
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    chrome.storage.local.set({ [SK_SHORTCUT_CONFIG]: shortcutConfig })
      .then(() => {
        chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED", payload: shortcutConfig }).catch(() => {})
      })
      .catch(() => {})
  }, [shortcutConfig])

  const handleResetSettings = useCallback(async () => {
    const defaults = { ...DEFAULT_SHORTCUT_CONFIG }
    setShortcutConfig(defaults)
  }, [])

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On mount: restore persisted toggle state
  useEffect(() => {
    loadPersistedState().then((persisted) => {
      if (persisted.toggleActive) {
        usePopupStore.setState({ toggleActive: persisted.toggleActive, inspectorActive: persisted.toggleActive })
      }
      if (persisted.selectedContexts) {
        usePopupStore.setState({ selectedContexts: persisted.selectedContexts })
      }
    })
  }, [])

  // Message listener
  useEffect(() => {
    function handleMessage(message: { type: string; payload?: unknown }) {
      switch (message.type) {
        case "MULTI_ELEMENTS_SELECTED": {
          const payload = message.payload as { contexts: SelectedContext[]; tabId?: number }
          if (payload?.contexts) {
            setSelectedContexts(payload.contexts)
          }
          break
        }
        case "INSPECTOR_STATUS": {
          const payload = message.payload as { active: boolean } | undefined
          if (payload && typeof payload.active === "boolean") {
            setInspectorActive(payload.active)
          }
          break
        }
      }
    }
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [setSelectedContexts, setInspectorActive])

  // Server port discovery
  useEffect(() => {
    const probeServer = async () => {
      try {
        const r = await chrome.storage.local.get(SK_SERVER_PORT)
        if (r[SK_SERVER_PORT]) {
          try {
            const res = await fetch("http://localhost:" + r[SK_SERVER_PORT] + "/api/health", { signal: AbortSignal.timeout(1000) })
            if (res.ok) { setServerPort(r[SK_SERVER_PORT]); return }
          } catch { /* stale cache */ }
        }
      } catch { /* ignore */ }
      for (const port of SERVER_PORT_RANGE) {
        try {
          const res = await fetch("http://localhost:" + port + "/api/health", { signal: AbortSignal.timeout(500) })
          if (res.ok) {
            setServerPort(port)
            try { await chrome.storage.local.set({ [SK_SERVER_PORT]: port }) } catch { /* ignore */ }
            return
          }
        } catch { /* next port */ }
      }
      setServerPort(null)
    }
    probeServer()
    const interval = setInterval(probeServer, 5000)
    return () => clearInterval(interval)
  }, [setServerPort])

  const handleToggle = useCallback(async () => {
    const newState = !toggleActive
    setToggleActive(newState)
    try {
      await chrome.runtime.sendMessage({
        type: "TOGGLE_INSPECTOR",
        payload: { active: newState },
      })
    } catch { /* no active tab */ }
  }, [toggleActive, setToggleActive])

  const handleCopy = useCallback(async () => {
    const text = buildMultiPrompt(selectedContexts)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.cssText = "position:fixed;left:-9999px"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setPromptText(text)
    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [selectedContexts, setCopied, setPromptText])

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const dotClass = inspectorActive
    ? "w-2 h-2 rounded-full bg-green-400 animate-pulse"
    : toggleActive
      ? "w-2 h-2 rounded-full bg-green-400"
      : "w-2 h-2 rounded-full bg-[#555]"

  return (
    <div className="w-80 min-h-[200px] flex flex-col max-h-[500px]">
      <header className="px-4 py-3 border-b border-[#2a2a4a] flex items-center justify-between shrink-0">
        <h1 className="text-sm font-semibold text-[#e0e0e0] tracking-wide">
          {showSettings ? "Settings" : "DOM Context"}
        </h1>
        <span className="flex items-center gap-2">
          {!showSettings && (
            <span className="flex items-center gap-1">
              <span className={serverPort ? "w-2 h-2 rounded-full bg-green-400" : "w-2 h-2 rounded-full bg-red-400"} />
              <span className="text-xs text-[#888] ml-1">{serverPort ? ":" + serverPort : "Offline"}</span>
            </span>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-[#888] hover:text-[#ccc] transition-colors p-1"
            title={showSettings ? "Back" : "Settings"}
          >
            {showSettings ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            )}
          </button>
        </span>
      </header>

      {showSettings ? (
        <SettingsPanel
          config={shortcutConfig}
          setConfig={setShortcutConfig}
          onReset={handleResetSettings}
        />
      ) : (
        <>
          {/* Toggle button */}
          <div className="px-4 py-2 border-b border-[#2a2a4a] shrink-0">
            <button
              onClick={handleToggle}
              className={
                toggleActive
                  ? "w-full py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                  : "w-full py-2 px-4 rounded-lg bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#aaa] text-sm font-medium transition-colors"
              }
            >
              <span className="flex items-center justify-center gap-2">
                <span className={dotClass} />
                {toggleActive ? "Inspector ON" : "Inspector OFF"}
              </span>
            </button>
            <p className="text-[10px] text-[#555] mt-1.5 text-center">
              Click to select | Multi-select: Ctrl+Alt+Click
            </p>
          </div>

          {/* Status info */}
          <div className="flex-1 px-4 py-3 flex flex-col items-center justify-center gap-3">
            {selectedContexts.length > 0 ? (
              <div className="text-center">
                <p className="text-xs text-[#888]">
                  {selectedContexts.length} element{selectedContexts.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-[10px] text-[#555] mt-1">
                  See the floating panel on the page
                </p>
              </div>
            ) : (
              <div className="bg-[#16213e] rounded-lg p-6 text-center">
                <p className="text-xs text-[#555]">
                  No elements selected
                </p>
                <p className="text-[10px] text-[#444] mt-1">
                  Hold Alt + Click to inspect
                </p>
              </div>
            )}
          </div>

          {/* Copy button */}
          <div className="px-4 pb-4 shrink-0">
            <button
              onClick={handleCopy}
              disabled={selectedContexts.length === 0}
              className={
                selectedContexts.length > 0
                  ? "w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                  : "w-full py-2 px-4 rounded-lg bg-[#1a1a2e] text-[#444] text-sm font-medium cursor-not-allowed"
              }
            >
              {copied ? "Copied!" : "Copy Prompt"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function SettingsPanel({
  config,
  setConfig,
  onReset,
}: {
  config: ShortcutConfig
  setConfig: (c: ShortcutConfig) => void
  onReset: () => void
}) {
  return (
    <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3">
      {/* Inspect Key */}
      <div className="bg-[#16213e] rounded-lg p-3">
        <label className="block text-xs font-medium text-[#ccc] mb-1">Inspect Key</label>
        <p className="text-[10px] text-[#666] mb-2">Hold to activate inspection</p>
        <select
          value={config.inspectKey}
          onChange={(e) => setConfig({ ...config, inspectKey: e.target.value as ShortcutConfig["inspectKey"] })}
          className="w-full bg-[#0f1a2e] border border-[#2a2a4a] rounded px-2 py-1.5 text-xs text-[#e0e0e0] focus:outline-none focus:border-blue-500"
        >
          {INSPECT_KEYS.map((key) => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>

      {/* Multi-select Key */}
      <div className="bg-[#16213e] rounded-lg p-3">
        <label className="block text-xs font-medium text-[#ccc] mb-1">Multi-select Key</label>
        <p className="text-[10px] text-[#666] mb-2">+ Inspect Key to multi-select</p>
        <select
          value={config.multiSelectKey}
          onChange={(e) => setConfig({ ...config, multiSelectKey: e.target.value as ShortcutConfig["multiSelectKey"] })}
          className="w-full bg-[#0f1a2e] border border-[#2a2a4a] rounded px-2 py-1.5 text-xs text-[#e0e0e0] focus:outline-none focus:border-blue-500"
        >
          {MULTI_SELECT_KEYS.map((key) => (
            <option key={key} value={key}>
              {key === "Meta" ? "Meta (Cmd)" : key}
            </option>
          ))}
        </select>
      </div>

      {/* Require Shortcut Toggle */}
      <div className="bg-[#16213e] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-medium text-[#ccc]">Require key to select</label>
            <p className="text-[10px] text-[#666] mt-0.5">Must hold Inspect Key to click-select</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, inspectRequiresShortcut: !config.inspectRequiresShortcut })}
            className={
              config.inspectRequiresShortcut
                ? "relative w-10 h-5 rounded-full bg-blue-600 transition-colors"
                : "relative w-10 h-5 rounded-full bg-[#2a2a4a] transition-colors"
            }
          >
            <span
              className={
                config.inspectRequiresShortcut
                  ? "absolute top-0.5 left-4.5 w-4 h-4 rounded-full bg-white transition-transform"
                  : "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#888] transition-transform"
              }
            />
          </button>
        </div>
      </div>

      {/* Panel Visibility Toggle */}
      <div className="bg-[#16213e] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-medium text-[#ccc]">Show floating panel</label>
            <p className="text-[10px] text-[#666] mt-0.5">Display element info panel on page</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, panelVisible: !config.panelVisible })}
            className={
              config.panelVisible
                ? "relative w-10 h-5 rounded-full bg-blue-600 transition-colors"
                : "relative w-10 h-5 rounded-full bg-[#2a2a4a] transition-colors"
            }
          >
            <span
              className={
                config.panelVisible
                  ? "absolute top-0.5 left-4.5 w-4 h-4 rounded-full bg-white transition-transform"
                  : "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#888] transition-transform"
              }
            />
          </button>
        </div>
      </div>

      {/* Inline Prompt Toggle */}
      <div className="bg-[#16213e] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-medium text-[#ccc]">Inline prompt</label>
            <p className="text-[10px] text-[#666] mt-0.5">Show input dialog after selecting element</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, showInlinePrompt: !config.showInlinePrompt })}
            className={
              config.showInlinePrompt
                ? "relative w-10 h-5 rounded-full bg-blue-600 transition-colors"
                : "relative w-10 h-5 rounded-full bg-[#2a2a4a] transition-colors"
            }
          >
            <span
              className={
                config.showInlinePrompt
                  ? "absolute top-0.5 left-4.5 w-4 h-4 rounded-full bg-white transition-transform"
                  : "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#888] transition-transform"
              }
            />
          </button>
        </div>
      </div>

      {/* Shortcut summary */}
      <div className="bg-[#0f1a2e] border border-[#2a2a4a] rounded-lg p-3">
        <h3 className="text-[10px] text-[#888] uppercase tracking-wider mb-2">Shortcuts</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#aaa]">Activate</span>
            <span className="text-[#e0e0e0] font-mono text-[11px]">Hold {config.inspectKey}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#aaa]">Select</span>
            <span className="text-[#e0e0e0] font-mono text-[11px]">{config.inspectKey}+Click</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#aaa]">Multi-select</span>
            <span className="text-[#e0e0e0] font-mono text-[11px]">
              {config.multiSelectKey === "Meta" ? "Cmd" : config.multiSelectKey}+{config.inspectKey}+Click
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#aaa]">Clear</span>
            <span className="text-[#e0e0e0] font-mono text-[11px]">Esc</span>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="pb-2">
        <button
          onClick={onReset}
          className="w-full py-2 px-3 rounded-lg bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#aaa] text-xs font-medium transition-colors"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}

/**
 * Build a multi-element prompt with labels and descriptions.
 */
function buildMultiPrompt(contexts: SelectedContext[]): string {
  if (contexts.length === 0) return ""

  const lines: string[] = ["# DOM Context - Element Selections\n"]

  for (const ctx of contexts) {
    const se = ctx.context?.selectedElement
    const descLine = ctx.description ? ` (${ctx.description})` : ""
    lines.push(`## [${ctx.label}] Element${descLine}`)
    lines.push(`- **Tag**: ${se?.tag || ctx.elementInfo.tagName}`)

    if (se?.cssSelector) lines.push(`- **CSS Selector**: \`${se.cssSelector}\``)
    if (se?.xpath) lines.push(`- **XPath**: \`${se.xpath}\``)
    if (ctx.elementInfo.id) lines.push(`- **ID**: ${ctx.elementInfo.id}`)
    if (ctx.elementInfo.className) lines.push(`- **Class**: ${ctx.elementInfo.className}`)
    if (se?.text) {
      const t = se.text.length > 200 ? se.text.slice(0, 200) + "..." : se.text
      lines.push(`- **Text**: ${t}`)
    }
    if (se?.rect) {
      const r = se.rect
      lines.push(`- **Size**: ${Math.round(r.width)} x ${Math.round(r.height)}px`)
      lines.push(`- **Position**: top=${Math.round(r.top)}, left=${Math.round(r.left)}`)
    }
    if (se?.accessibility?.role) {
      const a = se.accessibility
      lines.push(`- **Role**: ${a.role}`)
      if (a.ariaLabel) lines.push(`- **ARIA Label**: ${a.ariaLabel}`)
      if (a.isFocusable) lines.push(`- **Focusable**: yes`)
      if (a.isInteractive) lines.push(`- **Interactive**: yes`)
    }
    if (se?.styles && Object.keys(se.styles).length > 0) {
      lines.push("- **Computed Styles**:")
      for (const [key, val] of Object.entries(se.styles)) {
        lines.push(`  - ${key}: ${val}`)
      }
    }
    if (se?.html) {
      lines.push(`- **HTML**:`)
      lines.push("```html")
      lines.push(se.html.length > 500 ? se.html.slice(0, 500) + "..." : se.html)
      lines.push("```")
    }
    if (ctx.context?.layoutChain && ctx.context.layoutChain.length > 0) {
      lines.push("- **Layout Chain**:")
      for (let i = 0; i < ctx.context.layoutChain.length; i++) {
        const node = ctx.context.layoutChain[i]
        lines.push(`  ${i}: ${node.tag} (${node.display}) ${node.width}px`)
      }
    }
    lines.push("")
  }

  lines.push("## Task")
  if (contexts.length === 1) {
    lines.push("Based on the above element context, please help fix layout or styling issues.")
  } else {
    lines.push("Based on the above element contexts, please help fix layout or styling issues for the selected elements.")
  }

  return lines.join("\n")
}

export default IndexPopup
