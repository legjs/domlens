import { useEffect, useCallback, useRef, useState } from "react"
import "~src/style.css"
import usePopupStore, { loadPersistedState } from "~store"
import type { ElementInfo } from "~shared/types"
import { SERVER_PORT_RANGE, SK_SERVER_PORT } from "~shared/constants"

function IndexPopup() {
  const {
    inspectorActive,
    selectedElement,
    promptText,
    copied,
    serverPort,
    setInspectorActive,
    setSelectedElement,
    setPromptText,
    setCopied,
    setServerPort,
  } = usePopupStore()

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ready, setReady] = useState(false)

  // On mount: restore persisted state from chrome.storage
  useEffect(() => {
    loadPersistedState().then((persisted) => {
      if (persisted.inspectorActive !== undefined) {
        usePopupStore.setState({ inspectorActive: persisted.inspectorActive })
      }
      if (persisted.selectedElement) {
        usePopupStore.setState({ selectedElement: persisted.selectedElement })
      }
      if (persisted.promptText) {
        usePopupStore.setState({ promptText: persisted.promptText })
      }
      setReady(true)
    })
  }, [])

  // Message listener
  useEffect(() => {
    function handleMessage(message: { type: string; payload?: unknown }) {
      switch (message.type) {
        case "ELEMENT_SELECTED": {
          const info = message.payload as ElementInfo
          if (info) {
            setSelectedElement(info)
            setPromptText(buildSimplePrompt(info))
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
  }, [setSelectedElement, setInspectorActive, setPromptText])

  // Server port discovery - probe on mount and every 5 seconds
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
    const newState = !inspectorActive
    setInspectorActive(newState)
    try {
      await chrome.runtime.sendMessage({
        type: "TOGGLE_INSPECTOR",
        payload: { active: newState },
      })
    } catch {
      /* no active tab */
    }
  }, [inspectorActive, setInspectorActive])

  const handleCopy = useCallback(async () => {
    if (!promptText) return
    try {
      await navigator.clipboard.writeText(promptText)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = promptText
      ta.style.cssText = "position:fixed;left:-9999px"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [promptText, setCopied])

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const toggleBtnClass = inspectorActive
    ? "w-full py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
    : "w-full py-2 px-4 rounded-lg bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#aaa] text-sm font-medium transition-colors"

  const dotClass = inspectorActive
    ? "w-2 h-2 rounded-full bg-green-400"
    : "w-2 h-2 rounded-full bg-[#555]"

  const copyBtnClass = promptText
    ? "w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
    : "w-full py-2 px-4 rounded-lg bg-[#1a1a2e] text-[#444] text-sm font-medium cursor-not-allowed"

  return (
    <div className="w-80 min-h-[200px] flex flex-col">
      <header className="px-4 py-3 border-b border-[#2a2a4a] flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[#e0e0e0] tracking-wide">
          AI Runtime Inspector
        </h1>
        <span className="flex items-center gap-1">
          <span className={serverPort ? "w-2 h-2 rounded-full bg-green-400" : "w-2 h-2 rounded-full bg-red-400"} />
          <span className="text-xs text-[#888] ml-1">{serverPort ? ":" + serverPort : "Runtime"}</span>
        </span>
      </header>

      <div className="px-4 py-4">
        <button onClick={handleToggle} className={toggleBtnClass}>
          <span className="flex items-center justify-center gap-2">
            <span className={dotClass} />
            {inspectorActive ? "Inspector ON" : "Inspector OFF"}
          </span>
        </button>
      </div>

      <div className="flex-1 px-4 pb-3">
        {selectedElement ? (
          <div className="bg-[#16213e] rounded-lg p-3 space-y-2">
            <div className="text-xs text-[#888] uppercase tracking-wider mb-2">
              Selected Element
            </div>
            <InfoRow label="Tag" value={selectedElement.tag} />
            {selectedElement.className && (
              <InfoRow label="Class" value={selectedElement.className} />
            )}
            {selectedElement.id && (
              <InfoRow label="ID" value={selectedElement.id} />
            )}
            {selectedElement.text && (
              <InfoRow
                label="Text"
                value={
                  selectedElement.text.length > 60
                    ? selectedElement.text.slice(0, 60) + "..."
                    : selectedElement.text
                }
              />
            )}
          </div>
        ) : (
          <div className="bg-[#16213e] rounded-lg p-6 text-center">
            <p className="text-xs text-[#555]">
              {inspectorActive
                ? "Click an element on the page to inspect it"
                : "Enable Inspector to select elements"}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={handleCopy}
          disabled={!promptText}
          className={copyBtnClass}
        >
          {copied ? "Copied!" : "Copy Prompt"}
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-[#666] min-w-[40px] shrink-0">
        {label}
      </span>
      <span className="text-xs text-[#ccc] break-all font-mono">{value}</span>
    </div>
  )
}

function buildSimplePrompt(info: ElementInfo): string {
  var lines: string[] = []
  lines.push("# AI Runtime Inspector - Element Context\n")
  lines.push("## Element Info")
  lines.push("- Tag: " + info.tagName)
  if (info.className) {
    lines.push("- Class: " + info.className)
  }
  if (info.id) {
    lines.push("- ID: " + info.id)
  }
  if (info.innerText) {
    var t =
      info.innerText.length > 200
        ? info.innerText.slice(0, 200) + "..."
        : info.innerText
    lines.push("- Text: " + t)
  }
  lines.push("\n## Task")
  lines.push(
    "Based on the above element context, please help fix layout or styling issues."
  )
  return lines.join("\n")
}

export default IndexPopup
