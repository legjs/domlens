/**
 * Layout Chain Analyzer Module
 * Traverses the DOM tree to build a layout chain
 * from the selected element up to the document.body,
 * keeping only "layout-critical" ancestor nodes.
 */

import type { LayoutNode } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/constants';

/** CSS display values that create a layout context */
const LAYOUT_DISPLAYS = new Set([
  'flex',
  'grid',
  'inline-flex',
  'inline-grid',
]);

/** CSS overflow values that constrain content */
const CONSTRAINING_OVERFLOWS = new Set([
  'hidden',
  'scroll',
  'auto',
]);

/** CSS position values that create a positioning context */
const POSITIONING_CONTEXTS = new Set([
  'absolute',
  'fixed',
  'relative',
  'sticky',
]);

/**
 * Quick check: does the element's tagName suggest it's worth inspecting?
 * Elements like <div>, <section>, <main>, <article>, <nav>, <header>, <footer>,
 * <aside>, <ul>, <ol>, <li>, <form>, <table>, <tr>, <td>, <th>, <span> are
 * common layout containers. We don't exclude anything here — this is just for
 * early bail-out on obviously irrelevant nodes like text nodes.
 */
function isElementLikelyRelevant(el: HTMLElement): boolean {
  // Every HTMLElement could be a layout node; we rely on computed style checks
  return true;
}

/**
 * Determine if an element is a "layout-critical" ancestor by checking
 * its computed styles against the filter criteria.
 *
 * Performance note: getComputedStyle is only called once per candidate node,
 * and we extract all needed properties in that single call.
 */
function isLayoutCritical(style: CSSStyleDeclaration): boolean {
  // 1. display: flex, grid, inline-flex, inline-grid
  if (LAYOUT_DISPLAYS.has(style.display)) {
    return true;
  }

  // 2. overflow: hidden, scroll, auto
  if (CONSTRAINING_OVERFLOWS.has(style.overflow)) {
    return true;
  }

  // 3. position: absolute, fixed, relative, sticky
  if (POSITIONING_CONTEXTS.has(style.position)) {
    return true;
  }

  // 4. transform: not none
  if (style.transform && style.transform !== 'none') {
    return true;
  }

  // 5. width/height explicitly set (not auto)
  if (style.width !== 'auto' || style.height !== 'auto') {
    return true;
  }

  return false;
}

/**
 * Build a LayoutNode from an element using its already-fetched computed style.
 * Only includes optional fields when they carry meaningful values.
 */
function buildLayoutNode(el: HTMLElement, style: CSSStyleDeclaration): LayoutNode {
  const node: LayoutNode = {
    tag: el.tagName.toLowerCase(),
    class: el.className || '',
    display: style.display,
    width: Math.round(el.getBoundingClientRect().width * 100) / 100,
  };

  // Include overflow only when it constrains content
  if (CONSTRAINING_OVERFLOWS.has(style.overflow)) {
    node.overflow = style.overflow;
  }

  // Include position when it creates a positioning context
  if (POSITIONING_CONTEXTS.has(style.position)) {
    node.position = style.position;
  }

  // Include transform when it is not none
  if (style.transform && style.transform !== 'none') {
    node.transform = style.transform;
  }

  return node;
}

/**
 * Analyze the layout chain from the selected element up to document.body.
 *
 * Walks parentElement recursively, filters for layout-critical nodes only,
 * and returns an ordered array (innermost first, body last).
 *
 * @param element - The selected HTMLElement to start from
 * @returns Array of LayoutNode from element to body (inclusive of body)
 */
export function analyzeLayoutChain(element: HTMLElement): LayoutNode[] {
  const chain: LayoutNode[] = [];
  const maxDepth = DEFAULT_CONFIG.maxLayoutChainDepth;
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && depth < maxDepth) {
    // Stop when we reach or pass body
    if (current === document.body) {
      const bodyStyle = getComputedStyle(current);
      chain.push(buildLayoutNode(current, bodyStyle));
      break;
    }

    // Quick relevance gate (currently all HTMLElements pass)
    if (!isElementLikelyRelevant(current)) {
      current = current.parentElement;
      depth++;
      continue;
    }

    // Single getComputedStyle call per node
    const style = getComputedStyle(current);

    if (isLayoutCritical(style)) {
      chain.push(buildLayoutNode(current, style));
    }

    current = current.parentElement;
    depth++;
  }

  return chain;
}
