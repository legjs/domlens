/**
 * i18n Helper Module
 *
 * Wraps chrome.i18n.getMessage for consistent usage
 * across popup (React) and content scripts (DOM).
 */

/**
 * Get a localized message by key.
 * Falls back to the key itself if chrome.i18n is not available.
 *
 * @param key - Message key from _locales/\<locale\>/messages.json
 * @param substitutions - Optional substitution values (string or string[])
 */
export function t(key: string, ...substitutions: string[]): string {
  try {
    const subs = substitutions.length > 0 ? substitutions : undefined
    const msg = chrome.i18n.getMessage(key, subs)
    return msg || key
  } catch {
    return key
  }
}

/**
 * Get the browser's UI language code.
 * Returns a locale string like "en", "zh-CN", "ja", etc.
 */
export function getBrowserLocale(): string {
  try {
    return chrome.i18n.getUILanguage()
  } catch {
    return "en"
  }
}