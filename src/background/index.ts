/**
 * Background Service Worker
 * Handles extension lifecycle events, message routing,
 * and provides elevated permission operations (clipboard, storage).
 */
export {}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("[AI Runtime Inspector] Extension installed")
})

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log("[AI Runtime Inspector] Message received:", request.type)
  sendResponse({ success: true })
})
