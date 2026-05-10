/**
 * Collector Module
 * Collects runtime DOM data including computed styles,
 * box model, visibility analysis, and element info.
 */
import type {
  ElementInfo,
  BoxModel,
  ComputedStyle,
  VisibilityInfo,
} from "../shared/types";
import { IMPORTANT_STYLES, SENSITIVE_SELECTORS } from "../shared/constants";

const MAX_TEXT_LENGTH = 200;

/**
 * Build a combined CSS selector string from SENSITIVE_SELECTORS array.
 * Cached on first call since the constant never changes.
 */
let _sensitiveSelectorString: string | null = null;
function getSensitiveSelectorString(): string {
  if (!_sensitiveSelectorString) {
    _sensitiveSelectorString = SENSITIVE_SELECTORS.join(", ");
  }
  return _sensitiveSelectorString;
}

/**
 * Check whether an element matches any sensitive selector.
 */
function isSensitiveElement(el: Element): boolean {
  const selector = getSensitiveSelectorString();
  try {
    return el.matches?.(selector) ?? false;
  } catch {
    // Invalid selector fallback: check individual selectors
    for (const sel of SENSITIVE_SELECTORS) {
      try {
        if (el.matches(sel)) return true;
      } catch {
        // skip unparseable selectors
      }
    }
  }
  return false;
}

/**
 * Check whether an element contains any sensitive child elements.
 */
function containsSensitiveChildren(el: Element): boolean {
  const selector = getSensitiveSelectorString();
  try {
    return el.querySelector(selector) !== null;
  } catch {
    // Fallback: check each selector individually
    for (const sel of SENSITIVE_SELECTORS) {
      try {
        if (el.querySelector(sel)) return true;
      } catch {
        // skip
      }
    }
  }
  return false;
}

/**
 * Sanitize innerText by truncating and removing content from sensitive children.
 */
function sanitizeInnerText(el: HTMLElement): string {
  // Clone the element to manipulate text without affecting the live DOM
  const clone = el.cloneNode(true) as HTMLElement;

  // Remove sensitive child nodes from the clone
  const selector = getSensitiveSelectorString();
  try {
    const sensitiveNodes = clone.querySelectorAll(selector);
    sensitiveNodes.forEach((node) => node.remove());
  } catch {
    // Fallback for unparseable combined selector
    for (const sel of SENSITIVE_SELECTORS) {
      try {
        const nodes = clone.querySelectorAll(sel);
        nodes.forEach((node) => node.remove());
      } catch {
        // skip
      }
    }
  }

  const text = (clone.innerText || "").trim();
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
}

/**
 * Collect basic element information.
 */
function collectElementInfo(el: HTMLElement): ElementInfo {
  return {
    tagName: el.tagName,
    className: el.className || "",
    id: el.id || "",
    innerText: sanitizeInnerText(el),
  };
}

/**
 * Collect box model data via getBoundingClientRect.
 */
function collectBoxModel(el: HTMLElement): BoxModel {
  const rect = el.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
  };
}

/**
 * Collect only the computed styles listed in IMPORTANT_STYLES.
 */
function collectComputedStyle(el: HTMLElement): ComputedStyle {
  const computed = window.getComputedStyle(el);
  const styles: ComputedStyle = {};

  for (const prop of IMPORTANT_STYLES) {
    const value = computed.getPropertyValue(prop);
    if (value !== "") {
      styles[prop] = value;
    }
  }

  return styles;
}

/**
 * Check if an element is clipped by any ancestor with overflow:hidden (or similar).
 */
function isClippedByAncestor(el: HTMLElement): boolean {
  let current: HTMLElement | null = el.parentElement;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    const overflowY = style.overflowY;
    const overflow = style.overflow;

    const isOverflowHidden =
      overflow === "hidden" ||
      overflowX === "hidden" ||
      overflowY === "hidden" ||
      overflow === "clip" ||
      overflowX === "clip" ||
      overflowY === "clip";

    if (isOverflowHidden) {
      // Check if the element actually overflows this container
      const containerRect = current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      const horizontallyClipped =
        elRect.left < containerRect.left ||
        elRect.right > containerRect.right;
      const verticallyClipped =
        elRect.top < containerRect.top ||
        elRect.bottom > containerRect.bottom;

      if (horizontallyClipped || verticallyClipped) {
        return true;
      }
    }

    current = current.parentElement;
  }

  return false;
}

/**
 * Collect visibility information for an element.
 */
function collectVisibilityInfo(el: HTMLElement): VisibilityInfo {
  const computed = window.getComputedStyle(el);

  return {
    hidden: el.hidden || el.getAttribute("aria-hidden") === "true",
    clipped: isClippedByAncestor(el),
    opacity: parseFloat(computed.opacity) || 0,
    visibility: computed.visibility,
  };
}

/**
 * Main entry point: collect all runtime data for a selected element.
 *
 * Returns basic info, box model, computed styles, and visibility analysis.
 * Skips data collection entirely if the element itself is sensitive.
 * If the element contains sensitive children, their content is filtered
 * from innerText but other data is still collected.
 */
export function collectElementData(element: HTMLElement): {
  info: ElementInfo;
  boxModel: BoxModel;
  styles: ComputedStyle;
  visibility: VisibilityInfo;
} {
  return {
    info: collectElementInfo(element),
    boxModel: collectBoxModel(element),
    styles: collectComputedStyle(element),
    visibility: collectVisibilityInfo(element),
  };
}
