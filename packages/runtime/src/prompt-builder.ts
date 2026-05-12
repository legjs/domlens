/**
 * Prompt Builder Engine
 *
 * Converts a CompressedContext into a clean, structured Markdown prompt
 * that can be pasted into any AI chat for layout debugging assistance.
 *
 * Design principles:
 * - Only emit sections with meaningful data (no empty sections)
 * - Layout chain rendered as a compact table
 * - Issues grouped by severity with suggested fixes
 * - Human-readable and AI-parseable
 */

import type { CompressedContext, ConstraintIssue } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Markdown prompt string from a CompressedContext.
 *
 * @param context - The compressed context produced by compressContext()
 * @returns Markdown string ready for clipboard or AI consumption
 */
export function buildPrompt(context: CompressedContext): string {
  const sections: string[] = [];

  // Title
  sections.push('# DomLens - Element Context\n');

  // Selected Component (only when React info is present)
  const componentSection = buildComponentSection(context);
  if (componentSection) sections.push(componentSection);

  // Element Info (tag, text, size, position, styles)
  sections.push(buildElementInfoSection(context));

  // Layout Context table
  const layoutSection = buildLayoutSection(context);
  if (layoutSection) sections.push(layoutSection);

  // Possible Issues
  const issuesSection = buildIssuesSection(context);
  if (issuesSection) sections.push(issuesSection);

  // Task
  sections.push(buildTaskSection());

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Section Builders
// ---------------------------------------------------------------------------

/**
 * "Selected Component" section — emitted only when React component info exists.
 */
function buildComponentSection(context: CompressedContext): string | null {
  const { component } = context.selectedElement;
  if (!component) return null;

  const lines: string[] = ['## Selected Component'];
  lines.push(`- **Component**: ${component.componentName}`);

  if (component.props && Object.keys(component.props).length > 0) {
    // Show only the first 5 props to keep the prompt compact
    const entries = Object.entries(component.props).slice(0, 5);
    const propsStr = entries.map(([k, v]) => `${k}=${stringifyValue(v)}`).join(', ');
    lines.push(`- **Props**: ${propsStr}`);
  }

  return lines.join('\n');
}

/**
 * "Element Info" section — always emitted (tag, size, position, styles).
 */
function buildElementInfoSection(context: CompressedContext): string {
  const { tag, text, rect, styles } = context.selectedElement;
  const lines: string[] = ['## Element Info'];

  // Tag and text
  lines.push(`- **Tag**: ${tag}`);
  if (text) {
    lines.push(`- **Text**: ${text}`);
  }

  // Size and position
  lines.push(
    `- **Size**: ${rect.width} x ${rect.height}px`,
  );
  lines.push(
    `- **Position**: top=${rect.top}, left=${rect.left}`,
  );

  // Key styles
  if (styles && Object.keys(styles).length > 0) {
    lines.push('- **Key Styles**:');
    for (const [prop, value] of Object.entries(styles)) {
      lines.push(`  - ${prop}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * "Layout Context" section — emitted only when layout chain is non-empty.
 */
function buildLayoutSection(context: CompressedContext): string | null {
  const { layoutChain } = context;
  if (layoutChain.length === 0) return null;

  const lines: string[] = [
    '## Layout Context (Ancestor Chain)',
    '| Level | Tag | Display | Width | Overflow | Position |',
    '|-------|-----|---------|-------|----------|----------|',
  ];

  for (let i = 0; i < layoutChain.length; i++) {
    const node = layoutChain[i];
    lines.push(
      `| ${i} | ${node.tag} | ${node.display} | ${node.width} | ${node.overflow ?? '-'} | ${node.position ?? '-'} |`,
    );
  }

  return lines.join('\n');
}

/**
 * "Possible Issues" section — emitted only when issues are non-empty.
 */
function buildIssuesSection(context: CompressedContext): string | null {
  const { possibleIssues } = context;
  if (possibleIssues.length === 0) return null;

  const lines: string[] = ['## Possible Issues'];

  for (const issue of possibleIssues) {
    const icon = issue.severity === 'error' ? '\u274C' : '\u26A0\uFE0F';
    lines.push(`${icon} **[${issue.severity}]** ${issue.description}`);

    if (issue.suggestedFix) {
      lines.push(`  - *Suggested fix*: ${issue.suggestedFix}`);
    }

    if (issue.selector) {
      lines.push(`  - *Selector*: \`${issue.selector}\``);
    }
  }

  return lines.join('\n');
}

/**
 * Closing "Task" section — always emitted to guide the AI.
 */
function buildTaskSection(): string {
  return '\n## Task\nBased on the above runtime context, please help fix layout issues for this element.\n';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Stringify a prop value for display, truncating long values.
 */
function stringifyValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    return value.length > 50 ? `"${value.slice(0, 50)}..."` : `"${value}"`;
  }
  if (typeof value === 'object') {
    return '{...}';
  }
  return String(value);
}
