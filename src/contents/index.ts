/**
 * Content Script Entry Point
 *
 * Plasmo requires a default export to register this as a content script.
 * The inspector module registers its own message listener as a side effect
 * when imported, so we just need to trigger the import here.
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

// Side-effect import — registers chrome.runtime.onMessage listener
// and makes inspector functions available in content script context
import "~lib/inspector"

export default function contentScriptMain() {
  // Inspector is initialized via side-effect import above.
  // chrome.runtime.onMessage listener in inspector.ts handles
  // TOGGLE_INSPECTOR messages from popup/background.
}
