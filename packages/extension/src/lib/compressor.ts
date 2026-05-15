/**
 * Context Compression Engine
 *
 * Integrates all data collection and analysis modules into a single
 * structured CompressedContext object. This is the main orchestration
 * layer that the Prompt Builder (Task #8) will consume.
 *
 * Key principles:
 * - Never sends raw outerHTML — only structured data AI needs
 * - Truncates text content to prevent token bloat
 * - Preserves empty arrays for layoutChain and possibleIssues
 * - Includes viewport dimensions for spatial context
 */

import type { CompressedContext } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/constants';
import { collectElementData } from './collector';
import { analyzeLayoutChain } from './layout';
import { analyzeReactComponent, analyzeVueComponent } from './react';
import { detectConstraints } from './analyzer';
import { generateCSSSelector, generateXPath, generateHTMLSnippet, collectAccessibilityInfo } from './selector';

/**
 * Compress all context for a selected DOM element into a structured object.
 *
 * Calls each analysis module exactly once and assembles the results into
 * a CompressedContext ready for prompt generation.
 *
 * @param element - The HTMLElement selected by the user via Inspector
 * @returns CompressedContext with element data, layout chain, issues, and viewport
 */
export function compressContext(element: HTMLElement): CompressedContext {
  // 1. Collect raw element data (info, box model, styles, visibility)
  const elementData = collectElementData(element);

  // 2. Analyze the layout chain (ancestors up to body)
  const layoutChain = analyzeLayoutChain(element);

  // 3. Detect framework component info (React first, then Vue fallback)
  const reactInfo = analyzeReactComponent(element) || analyzeVueComponent(element);

  // 4. Detect constraint issues
  const possibleIssues = detectConstraints(element);

  // 5. Build the compressed context
  const context: CompressedContext = {
    selectedElement: {
      tag: elementData.info.tagName.toLowerCase(),
      rect: elementData.boxModel,
    },
    layoutChain,
    possibleIssues,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };

  // Attach React component info if available
  if (reactInfo !== null) {
    context.selectedElement.component = reactInfo;
  }

  // Attach truncated text content (only when element has text)
  const text = elementData.info.innerText;
  if (text.length > 0) {
    context.selectedElement.text = text.length > DEFAULT_CONFIG.maxTextLength
      ? text.slice(0, DEFAULT_CONFIG.maxTextLength)
      : text;
  }

  // Attach computed styles (only when there are styles to report)
  if (Object.keys(elementData.styles).length > 0) {
    context.selectedElement.styles = elementData.styles;
  }

  // Attach CSS selector
  context.selectedElement.cssSelector = generateCSSSelector(element);

  // Attach XPath
  context.selectedElement.xpath = generateXPath(element);

  // Attach HTML snippet
  context.selectedElement.html = generateHTMLSnippet(element);

  // Attach accessibility info
  context.selectedElement.accessibility = collectAccessibilityInfo(element);

  return context;
}
