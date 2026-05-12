/**
 * Shadow Host Module
 *
 * Creates a single Shadow DOM container to isolate all extension UI
 * (overlays, panel, inline prompt) from the host page's DOM and styles.
 *
 * Architecture:
 *   document.documentElement
 *     └── <div#__dom_ctx_shadow_host__>   ← pointer-events: none, covers viewport
 *           └── #shadow-root (open)
 *                 ├── overlays (pointer-events: none)
 *                 ├── panel (pointer-events: auto)
 *                 └── inline prompt (pointer-events: auto)
 */

const SHADOW_HOST_ID = "__dom_ctx_shadow_host__"

/** IDs of interactive UI containers inside the shadow root */
const INTERACTIVE_IDS = new Set([
  "dom-ctx-panel",
  "dom-ctx-inline-prompt",
])

let hostEl: HTMLDivElement | null = null
let shadowRootRef: ShadowRoot | null = null

/**
 * Get or create the shadow root for extension UI.
 * Lazily initializes on first call.
 */
export function getShadowRoot(): ShadowRoot {
  if (shadowRootRef && hostEl && document.contains(hostEl)) {
    return shadowRootRef
  }

  // Reuse existing host (e.g. after content script re-injection)
  const existing = document.getElementById(SHADOW_HOST_ID) as HTMLDivElement | null
  if (existing && existing.shadowRoot) {
    hostEl = existing
    shadowRootRef = existing.shadowRoot
    return shadowRootRef
  }

  // Create new host
  hostEl = document.createElement("div")
  hostEl.id = SHADOW_HOST_ID
  hostEl.setAttribute("aria-hidden", "true")
  hostEl.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483640;
    pointer-events: none;
    overflow: visible;
  `

  shadowRootRef = hostEl.attachShadow({ mode: "open" })
  document.documentElement.appendChild(hostEl)

  return shadowRootRef
}

/**
 * Check if a viewport point is over any interactive extension UI
 * (panel, inline prompt). Uses shadowRoot.elementFromPoint() which
 * respects pointer-events settings inside the shadow root.
 */
export function isPointOverUI(x: number, y: number): boolean {
  const root = getShadowRoot()
  const el = root.elementFromPoint(x, y)
  if (!el) return false

  if (INTERACTIVE_IDS.has(el.id)) return true

  // Check if the element is inside an interactive container
  for (const id of INTERACTIVE_IDS) {
    const container = root.getElementById(id)
    if (container && container.contains(el)) return true
  }

  // Check for interactive elements marked with data attribute (e.g. delete buttons)
  if (el.hasAttribute("data-dom-ctx-interactive")) return true
  if (el.closest("[data-dom-ctx-interactive]")) return true

  return false
}

/**
 * Destroy the shadow host and all its contents.
 */
export function destroyShadowHost(): void {
  if (hostEl && document.contains(hostEl)) {
    hostEl.remove()
  }
  hostEl = null
  shadowRootRef = null
}
