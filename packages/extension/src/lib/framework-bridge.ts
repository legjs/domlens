/**
 * Framework Analysis Bridge — via Background Script
 *
 * Content scripts run in an ISOLATED JavaScript world where page framework
 * internals (__reactFiber$, __vueParentComponent, etc.) are inaccessible.
 * Inline <script> injection is blocked by CSP on most pages.
 *
 * This module sends a message to the background service worker, which uses
 * chrome.scripting.executeScript with world: "MAIN" to run analysis in the
 * page's JavaScript context. The result is returned via sendResponse.
 */

import type { ReactInfo } from "~shared/types"

/**
 * Request framework analysis from the background script.
 *
 * The background script will use chrome.scripting.executeScript with
 * world: "MAIN" to analyze the element in the page's JS context.
 *
 * @param selector - CSS selector that uniquely identifies the target element
 * @returns Framework analysis result, or null if no framework detected
 */
export async function analyzeFrameworkFromPage(
  selector: string
): Promise<ReactInfo | null> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_FW",
      payload: { selector },
    })
    if (response?.success && response.data) {
      return response.data as ReactInfo
    }
    return null
  } catch {
    return null
  }
}

/**
 * Generate a unique CSS selector for an element.
 * Uses nth-child chaining for reliability.
 */
export function getUniqueSelector(element: HTMLElement): string {
  const parts: string[] = []
  let current: HTMLElement | null = element

  while (current && current !== document.body && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase()
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName
      )
      if (siblings.length === 1) {
        parts.unshift(tag)
      } else {
        const index = siblings.indexOf(current) + 1
        parts.unshift(`${tag}:nth-child(${index})`)
      }
    } else {
      parts.unshift(tag)
    }
    current = parent
  }

  return "body > " + parts.join(" > ")
}
