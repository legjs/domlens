/**
 * Analyzer Module
 * Rule-based layout constraint detection engine.
 * Analyzes DOM elements to find common layout issues
 * without relying on AI — pure CSS/DOM inspection.
 */

import type { ConstraintIssue } from '../shared/types';
import { CONSTRAINT_ISSUE_TEMPLATES } from '../shared/constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Display values that create a flex/grid formatting context */
const FLEX_GRID_DISPLAYS = new Set(['flex', 'inline-flex', 'grid', 'inline-grid']);

/** Overflow values that clip content */
const CLIPPING_OVERFLOWS = new Set(['hidden', 'scroll', 'auto']);

/** Position values that establish a containing block */
const POSITIONING_CONTEXTS = new Set(['relative', 'absolute', 'fixed', 'sticky']);

/** Position values that need a containing block */
const OUT_OF_FLOW_POSITIONS = new Set(['absolute', 'fixed']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect layout constraint issues for the given element.
 *
 * Runs a suite of deterministic rules against the element and its ancestors,
 * returning every issue found.
 */
export function detectConstraints(element: HTMLElement): ConstraintIssue[] {
  const issues: ConstraintIssue[] = [];

  issues.push(...detectFlexShrink(element));
  issues.push(...detectOverflowClip(element));
  issues.push(...detectAbsoluteContext(element));
  issues.push(...detectVisibilityHidden(element));
  issues.push(...detectZIndexConflict(element));

  return issues;
}

// ---------------------------------------------------------------------------
// Rule 1 — Flex Shrink
// ---------------------------------------------------------------------------

function detectFlexShrink(element: HTMLElement): ConstraintIssue[] {
  const issues: ConstraintIssue[] = [];
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style) return issues;

  // The element itself must have flex-shrink != 0
  const flexShrink = style.flexShrink;
  if (flexShrink === '0') return issues;

  // Walk up to find the nearest flex/grid container
  let parent: HTMLElement | null = element.parentElement;
  while (parent) {
    const parentStyle = parent.ownerDocument.defaultView?.getComputedStyle(parent);
    if (!parentStyle) break;

    if (FLEX_GRID_DISPLAYS.has(parentStyle.display)) {
      // We are inside a flex/grid container with shrink enabled
      const template = CONSTRAINT_ISSUE_TEMPLATES['flex-shrink'];
      issues.push({
        type: 'flex-shrink',
        description:
          `Element is inside a ${parentStyle.display} container with flex-shrink: ${flexShrink}. ` +
          'It may shrink when the container is too small.',
        severity: template.severity,
        selector: buildSelector(element),
        suggestedFix: template.suggestedFix,
      });
      break; // Only report once, against the nearest flex/grid parent
    }

    parent = parent.parentElement;
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Rule 2 — Overflow Clip
// ---------------------------------------------------------------------------

function detectOverflowClip(element: HTMLElement): ConstraintIssue[] {
  const issues: ConstraintIssue[] = [];
  const elementRect = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView;
  if (!view) return issues;

  let ancestor: HTMLElement | null = element.parentElement;

  while (ancestor && ancestor !== element.ownerDocument.body) {
    const ancestorStyle = view.getComputedStyle(ancestor);
    if (!ancestorStyle) break;

    const overflowX = ancestorStyle.overflowX || ancestorStyle.overflow;
    const overflowY = ancestorStyle.overflowY || ancestorStyle.overflow;

    const clipsX = CLIPPING_OVERFLOWS.has(overflowX);
    const clipsY = CLIPPING_OVERFLOWS.has(overflowY);

    if (clipsX || clipsY) {
      const ancestorRect = ancestor.getBoundingClientRect();

      const clippedLeft = clipsX && elementRect.left < ancestorRect.left;
      const clippedRight = clipsX && elementRect.right > ancestorRect.right;
      const clippedTop = clipsY && elementRect.top < ancestorRect.top;
      const clippedBottom = clipsY && elementRect.bottom > ancestorRect.bottom;

      if (clippedLeft || clippedRight || clippedTop || clippedBottom) {
        const directions: string[] = [];
        if (clippedLeft) directions.push('left');
        if (clippedRight) directions.push('right');
        if (clippedTop) directions.push('top');
        if (clippedBottom) directions.push('bottom');

        const template = CONSTRAINT_ISSUE_TEMPLATES['overflow-clip'];
        issues.push({
          type: 'overflow-clip',
          description:
            `Element is clipped on the ${directions.join(', ')} side(s) by an ancestor ` +
            `with overflow: ${overflowX}/${overflowY}.`,
          severity: template.severity,
          selector: buildSelector(ancestor),
          suggestedFix: template.suggestedFix,
        });
        break; // Report the innermost clipping ancestor only
      }
    }

    ancestor = ancestor.parentElement;
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Rule 3 — Absolute Context (missing containing block)
// ---------------------------------------------------------------------------

function detectAbsoluteContext(element: HTMLElement): ConstraintIssue[] {
  const issues: ConstraintIssue[] = [];
  const view = element.ownerDocument.defaultView;
  if (!view) return issues;

  const style = view.getComputedStyle(element);
  if (!OUT_OF_FLOW_POSITIONS.has(style.position)) return issues;

  // Walk ancestors looking for a positioned element (skip the element itself)
  let ancestor: HTMLElement | null = element.parentElement;
  while (ancestor && ancestor !== element.ownerDocument.documentElement) {
    const ancestorStyle = view.getComputedStyle(ancestor);
    if (!ancestorStyle) break;

    if (POSITIONING_CONTEXTS.has(ancestorStyle.position)) {
      return issues; // Found a containing block — no issue
    }

    ancestor = ancestor.parentElement;
  }

  // No positioned ancestor found
  const template = CONSTRAINT_ISSUE_TEMPLATES['absolute-context'];
  issues.push({
    type: 'absolute-context',
    description:
      `Element is position:${style.position} but has no positioned ancestor ` +
      '(no relative/absolute/fixed/sticky parent). ' +
      'It will be positioned relative to the initial containing block (viewport).',
    severity: template.severity,
    selector: buildSelector(element),
    suggestedFix: template.suggestedFix,
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Rule 4 — Visibility Hidden
// ---------------------------------------------------------------------------

function detectVisibilityHidden(element: HTMLElement): ConstraintIssue[] {
  const issues: ConstraintIssue[] = [];
  const view = element.ownerDocument.defaultView;
  if (!view) return issues;

  const style = view.getComputedStyle(element);
  if (style.visibility !== 'hidden') return issues;

  const template = CONSTRAINT_ISSUE_TEMPLATES['visibility-hidden'];
  issues.push({
    type: 'visibility-hidden',
    description:
      'Element has visibility:hidden but still occupies layout space. ' +
      'Consider using display:none if the element should be fully removed from the layout.',
    severity: template.severity,
    selector: buildSelector(element),
    suggestedFix: template.suggestedFix,
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Rule 5 — Z-index Conflict
// ---------------------------------------------------------------------------

function detectZIndexConflict(element: HTMLElement): ConstraintIssue[] {
  const issues: ConstraintIssue[] = [];
  const view = element.ownerDocument.defaultView;
  if (!view) return issues;

  const style = view.getComputedStyle(element);
  const elementZ = parseInt(style.zIndex, 10);
  // Only check elements that participate in stacking context with explicit z-index
  if (isNaN(elementZ)) return issues;

  const elementRect = element.getBoundingClientRect();

  // Check siblings for overlapping z-index
  const parent = element.parentElement;
  if (!parent) return issues;

  for (const sibling of Array.from(parent.children) as HTMLElement[]) {
    if (sibling === element) continue;

    const siblingStyle = view.getComputedStyle(sibling);
    const siblingZ = parseInt(siblingStyle.zIndex, 10);
    if (isNaN(siblingZ)) continue;

    // Check if sibling rect overlaps with element rect
    const siblingRect = sibling.getBoundingClientRect();
    if (
      elementRect.right <= siblingRect.left ||
      elementRect.left >= siblingRect.right ||
      elementRect.bottom <= siblingRect.top ||
      elementRect.top >= siblingRect.bottom
    ) {
      continue; // No overlap
    }

    // Sibling overlaps and has a higher or equal z-index
    if (siblingZ >= elementZ) {
      const template = CONSTRAINT_ISSUE_TEMPLATES['z-index-conflict'];
      issues.push({
        type: 'z-index-conflict',
        description:
          `Sibling element has z-index:${siblingZ} which is >= this element's z-index:${elementZ}. ` +
          'The sibling may visually overlap and cover this element.',
        severity: template.severity,
        selector: buildSelector(sibling),
        suggestedFix: template.suggestedFix,
      });
      break; // Report the first conflict only
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a human-readable CSS selector for an element.
 */
function buildSelector(el: HTMLElement): string {
  if (el.id) return `#${CSS.escape(el.id)}`;

  const tag = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    const classes = el.className
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${CSS.escape(c)}`)
      .join('');
    return classes ? `${tag}${classes}` : tag;
  }

  return tag;
}
