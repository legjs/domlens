import { useEffect, useCallback, useRef } from "react"
import "~src/style.css"
import usePopupStore from "~store"
import type { ElementInfo } from "~shared/types"

// ---------------------------------------------------------------------------
// Popup Component
// ---------------------------------------------------------------------------

function IndexPopup() {
  const {
    inspectorActive,
    selectedElement,
    promptText,
    copied,
    setInspectorActive,
    setSelectedElement,
    setPromptText,
    setCopied,
  } = usePopupStore()

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // -----------------------------------------------------------------------
  // Message listener — receive ELEMENT_SELECTED and INSPECTOR_STATUS
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Toggle inspector handler
  // -----------------------------------------------------------------------
  const handleToggle = useCallback(async () => {
    const newState = !inspectorActive
    setInspectorActive(newState)

    try {
      await chrome.runtime.sendMessage({
        type: "TOGGLE_INSPECTOR",
        payload: { active: newState },
      })
    } catch {
      // Extension context may be invalidated or no active tab
    }
  }, [inspectorActive, setInspectorActive])

  // -----------------------------------------------------------------------
  // Copy prompt to clipboard
  // -----------------------------------------------------------------------
  const handleCopy = useCallback(async () => {
    if (!promptText) return

    try {
      await navigator.clipboard.writeText(promptText)
    } catch {
      // Fallback: use the Chrome extension clipboard API
      try {
        await navigator.clipboard.writeText(promptText)
      } catch {
        // If both fail, create a temporary textarea
        const textarea = document.createElement("textarea")
        textarea.value = promptText
        textarea.style.position = "fixed"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
    }

    setCopied(true)

    // Clear the "Copied!" feedback after 2 seconds
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current)
    }
    copiedTimerRef.current = setTimeout(() => {
      setCopied(false)
      copiedTimerRef.current = null
    }, 2000)
  }, [promptText, setCopied])

  // -----------------------------------------------------------------------
  // Cleanup timer on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current)
      }
    }
  }, [])

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="w-80 min-h-[200px] flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b border-[#2a2a4a]">
        <h1 className="text-sm font-semibold text-[#e0e0e0] tracking-wide">
          AI Runtime Inspector
        </h1>
      </header>

      {/* Inspector Toggle */}
      <div className="px-4 py-4">
        <button
          onClick={handleToggle}
          className={`
            w-full py-2.5 px-4 rounded-lg text-sm font-medium
            transition-all duration-200 border
            ${
              inspectorActive
                ? "bg-[#00ffff]/10 border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff]/20"
                : "bg-[#16213e] border-[#2a2a4a] text-[#888] hover:bg-[#1a2744] hover:text-[#aaa]"
            }
          `}
        >
          <span className="flex items-center justify-center gap-2">
            {/* Toggle indicator dot */}
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                inspectorActive ? "bg-[#00ffff]" : "bg-[#555]"
              }`}
            />
            {inspectorActive ? "Inspector ON" : "Inspector OFF"}
          </span>
        </button>
      </div>

      {/* Selected Element Info */}
      <div className="flex-1 px-4 pb-3">
        {selectedElement ? (
          <div className="bg-[#16213e] rounded-lg p-3 space-y-2">
            <div className="text-xs text-[#888] uppercase tracking-wider mb-2">
              Selected Element
            </div>

            <InfoRow label="Tag" value={`<${selectedElement.tag}>`} />
            {selectedElement.className && (
              <InfoRow label="Class" value={selectedElement.className} />
            )}
            {selectedElement.id && (
              <InfoRow label="ID" value={`#${selectedElement.id}`} />
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

      {/* Copy Prompt Button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleCopy}
          disabled={!promptText}
          className={`
            w-full py-2.5 px-4 rounded-lg text-sm font-medium
            transition-all duration-200
            ${
              promptText
                ? copied
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-[#00ffff] text-[#1a1a2e] hover:bg-[#00ffff]/90"
                : "bg-[#16213e] text-[#444] border border-[#2a2a4a] cursor-not-allowed"
            }
          `}
        >
          {copied ? "Copied!" : "Copy Prompt"}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-[#666] min-w-[40px] shrink-0">
        {label}
      </span>
      <span className="text-xs text-[#ccc] break-all font-mono">
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prompt Builder (lightweight, runs in popup context)
// ---------------------------------------------------------------------------

/**
 * Build a simple Markdown prompt from ElementInfo.
 *
 * This is a lightweight version that runs in the popup context.
 * It produces a clean, structured prompt that AI coding assistants
 * can use to help debug or modify the selected element.
 *
 * The full-featured prompt builder (with layout chain, constraint issues,
 * React component info) runs in the content script context and produces
 * a CompressedContext. When that data is available via the store,
 * the popup can use it instead.
 */
function buildSimplePrompt(info: ElementInfo): string {
  const lines: string[] = []

  lines.push("# AI Runtime Inspector - Element Context\n")

  lines.push("## Element Info")
  lines.push(`- **Tag**: <${info.tagName}>`)
  if (info.className) {
    lines.push(`- **Class**: ${info.className}`)
  }
  if (info.id) {
    lines.push(`- **ID**: #${info.id}`)
  }
  if (info.innerText) {
    const text = info.innerText.length > 200
      ? info.innerText.slice(0, 200) + "..."
      : info.innerText
    lines.push(`- **Text**: "${text}"`)
  }

  lines.push("\n## Task")
  lines.push(
    "Based on the above element context, please help fix layout or styling issues."
  )

  return lines.join("\n")
}

export default IndexPopup
