/**
 * Selector Generation Module
 *
 * Generates CSS selectors, XPath expressions, HTML snippets,
 * and accessibility info for DOM elements.
 */

import type { AccessibilityInfo } from "~shared/types";

const MAX_SELECTOR_DEPTH = 5;
const MAX_HTML_LENGTH = 500;

// ---------------------------------------------------------------------------
// CSS Selector
// ---------------------------------------------------------------------------

/**
 * Generate a unique CSS selector for an element.
 * Strategy: id > class > tag:nth-child, walking up to body (max depth 5).
 */
export function generateCSSSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && current !== document.documentElement) {
    if (parts.length >= MAX_SELECTOR_DEPTH) break;

    let segment = "";
    if (current.id) {
      segment = "#" + CSS.escape(current.id);
      parts.unshift(segment);
      break; // id is unique, stop
    }

    const tag = current.tagName.toLowerCase();
    if (current.className && typeof current.className === "string") {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter((c) => c.length > 0)
        .slice(0, 2);
      if (classes.length > 0) {
        segment = tag + "." + classes.map((c) => CSS.escape(c)).join(".");
      } else {
        segment = tag;
      }
    } else {
      segment = tag;
    }

    // Add nth-child for disambiguation
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        (s) => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        segment += `:nth-child(${index})`;
      }
    }

    parts.unshift(segment);
    current = current.parentElement;
  }

  const selector = parts.join(" > ");
  return selector || el.tagName.toLowerCase();
}

// ---------------------------------------------------------------------------
// XPath
// ---------------------------------------------------------------------------

/**
 * Generate an absolute XPath for an element from the document root.
 */
export function generateXPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    let index = 1;
    let sibling: Element | null = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) index++;
      sibling = sibling.previousElementSibling;
    }

    const tag = current.tagName.toLowerCase();
    parts.unshift(`${tag}[${index}]`);
    current = current.parentElement;
  }

  parts.unshift("/html");
  return parts.join("/");
}

// ---------------------------------------------------------------------------
// HTML Snippet
// ---------------------------------------------------------------------------

/**
 * Generate an HTML snippet for an element (outerHTML, truncated).
 */
export function generateHTMLSnippet(el: HTMLElement, maxLength = MAX_HTML_LENGTH): string {
  let html = el.outerHTML;
  if (html.length > maxLength) {
    html = html.slice(0, maxLength) + "...";
  }
  return html;
}

// ---------------------------------------------------------------------------
// Accessibility Info
// ---------------------------------------------------------------------------

const INTERACTIVE_TAGS = new Set([
  "a", "button", "input", "select", "textarea", "details", "summary",
  "dialog", "menu", "menuitem",
]);

/**
 * Collect accessibility-related information for an element.
 */
export function collectAccessibilityInfo(el: Element): AccessibilityInfo {
  const htmlEl = el as HTMLElement;
  const computed = htmlEl.style ? null : null; // no-op, kept for safety

  const role = el.getAttribute("role") || getImplicitRole(el);
  const ariaLabel = el.getAttribute("aria-label");
  const ariaDescribedBy = el.getAttribute("aria-describedby");
  const ariaHidden = el.getAttribute("aria-hidden");
  const tabIndex = el.getAttribute("tabindex");

  const isFocusable = tabIndex !== null || INTERACTIVE_TAGS.has(el.tagName.toLowerCase());
  const isInteractive =
    INTERACTIVE_TAGS.has(el.tagName.toLowerCase()) ||
    role === "button" ||
    role === "link" ||
    role === "menuitem" ||
    role === "tab" ||
    el.getAttribute("onclick") !== null ||
    tabIndex !== null;

  return {
    role,
    ariaLabel,
    ariaDescribedBy,
    ariaHidden,
    tabIndex,
    isFocusable,
    isInteractive,
  };
}

/**
 * Get implicit ARIA role based on tag name.
 */
function getImplicitRole(el: Element): string {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "a": return el.hasAttribute("href") ? "link" : "";
    case "button": return "button";
    case "input": {
      const type = (el as HTMLInputElement).type?.toLowerCase();
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "submit" || type === "reset" || type === "button") return "button";
      return "textbox";
    }
    case "select": return "listbox";
    case "textarea": return "textbox";
    case "nav": return "navigation";
    case "main": return "main";
    case "header": return "banner";
    case "footer": return "contentinfo";
    case "article": return "article";
    case "aside": return "complementary";
    case "section": return "region";
    case "img": return "img";
    case "table": return "table";
    default: return "";
  }
}
