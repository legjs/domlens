/**
 * Important CSS styles that affect layout and constraints
 */
export const IMPORTANT_STYLES = [
  'display',
  'position',
  'width',
  'height',
  'overflow',
  'overflowX',
  'overflowY',
  'flex',
  'flexShrink',
  'flexGrow',
  'flexBasis',
  'alignItems',
  'justifyContent',
  'zIndex',
  'margin',
  'padding',
  'transform',
  'top',
  'left',
  'right',
  'bottom',
  'float',
  'clear',
  'visibility',
  'opacity'
] as const;

/**
 * Overlay styles for highlighting elements
 */
export const OVERLAY_STYLES: Record<string, string | number> = {
  position: 'fixed',
  pointerEvents: 'none',
  border: '2px solid #00ffff',
  background: 'rgba(0, 255, 255, 0.08)',
  zIndex: 999999,
  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
  borderRadius: '2px'
};

/**
 * Sensitive selectors that should be filtered out for privacy and security
 */
export const SENSITIVE_SELECTORS = [
  'input[type="password"]',
  'input[type="hidden"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
  'input[name*="password"]',
  'input[name*="pwd"]',
  'input[name*="pass"]',
  'input[password]',
  '[type="password"]',
  '.password',
  '.pwd',
  '[data-testid="password"]',
  '[data-testid="pwd"]',
  '[aria-label*="password"]',
  '[aria-label*="pwd"]',
  '[title*="password"]',
  '[title*="pwd"]'
] as const;

/**
 * Layout constraint issue templates
 */
export const CONSTRAINT_ISSUE_TEMPLATES = {
  'flex-shrink': {
    description: 'Flex shrink issue detected',
    severity: 'warning' as const,
    suggestedFix: 'Check if flex-shrink:0 is needed on this element'
  },
  'overflow-clip': {
    description: 'Content is clipped due to overflow',
    severity: 'error' as const,
    suggestedFix: 'Adjust overflow property or increase container size'
  },
  'absolute-context': {
    description: 'Absolute positioned element needs containing block',
    severity: 'warning' as const,
    suggestedFix: 'Add position:relative to parent or remove absolute positioning'
  },
  'visibility-hidden': {
    description: 'Element has visibility:hidden but still occupies space',
    severity: 'warning' as const,
    suggestedFix: 'Use display:none if element should not be visible'
  },
  'z-index-conflict': {
    description: 'Z-index conflict detected with other elements',
    severity: 'warning' as const,
    suggestedFix: 'Review z-index values and stacking context'
  },
  'margin-collapse': {
    description: 'Margin collapse may cause unexpected spacing',
    severity: 'warning' as const,
    suggestedFix: 'Use padding instead of margin or add border'
  },
  'float-issue': {
    description: 'Float element may cause layout issues',
    severity: 'warning' as const,
    suggestedFix: 'Consider using flexbox or grid instead of float'
  }
} as const;

/**
 * Prompt templates for generating markdown
 */
export const PROMPT_TEMPLATES = {
  ELEMENT_OVERVIEW: `## Element Overview
- **Tag**: {tag}
- **ID**: {id}
- **Class**: {class}
- **Text Content**: {text}`,

  BOX_MODEL: `## Box Model
- **Width**: {width}px
- **Height**: {height}px
- **Position**: top={top}px, left={left}px
- **Computed Position**: right={right}px, bottom={bottom}px`,

  COMPUTED_STYLES: `## Computed Styles
{styles}`,

  VISIBILITY_INFO: `## Visibility Information
- **Hidden**: {hidden}
- **Clipped**: {clipped}
- **Opacity**: {opacity}
- **Visibility**: {visibility}`,

  LAYOUT_CHAIN: `## Layout Chain
{chain}`,

  CONSTRAINT_ISSUES: `## Constraint Issues
{issues}`,

  REACT_INFO: `## React Component Info
- **Component Name**: {componentName}
- **Props**: {props}
- **State Node**: {stateNode}`,

  SUGGESTIONS: `## Suggestions
{suggestions}`
} as const;

/**
 * CSS property names that are important for layout debugging
 */
export const LAYOUT_RELATED_PROPERTIES = [
  'display',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'height',
  'max-width',
  'max-height',
  'min-width',
  'min-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-width',
  'border-style',
  'border-color',
  'overflow',
  'overflow-x',
  'overflow-y',
  'flex-direction',
  'flex-wrap',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'justify-content',
  'align-items',
  'align-self',
  'align-content',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',
  'float',
  'clear',
  'z-index',
  'transform',
  'transform-origin',
  'opacity',
  'visibility',
  'pointer-events'
] as const;

/**
 * Default configuration for the inspector
 */
export const DEFAULT_CONFIG = {
  overlayColor: '#00ffff',
  overlayOpacity: 0.08,
  overlayBorderWidth: 2,
  overlayShadow: true,
  showLayoutChain: true,
  maxLayoutChainDepth: 10,
  maxTextLength: 100,
  enableReactInfo: true,
  showComputationDetails: true
} as const;

/**
 * Severity levels for issues
 */
export const SEVERITY_LEVELS = {
  INFO: { color: '#3498db', label: 'Info' },
  WARNING: { color: '#f39c12', label: 'Warning' },
  ERROR: { color: '#e74c3c', label: 'Error' }
} as const;

/**
 * CSS display values that affect layout
 */
export const DISPLAY_VALUES = [
  'block',
  'inline',
  'inline-block',
  'flex',
  'inline-flex',
  'grid',
  'inline-grid',
  'table',
  'table-row',
  'table-cell',
  'none'
] as const;

// ============================================================
// Runtime Server Configuration
// ============================================================

/** Port range for the local Runtime API server (auto-discovery) */
export const SERVER_PORT_START = 4777;
export const SERVER_PORT_END = 4787;

/** Pre-computed port array for probing [4777, 4778, ..., 4787] */
export const SERVER_PORT_RANGE: readonly number[] = Array.from(
  { length: SERVER_PORT_END - SERVER_PORT_START + 1 },
  (_, i) => SERVER_PORT_START + i,
);

/** Maximum number of context entries stored on the server */
export const MAX_CONTEXT_HISTORY = 20;

/** chrome.storage key for caching the discovered server port */
export const SK_SERVER_PORT = "runtime_server_port";

// ============================================================
// Multi-Select Configuration
// ============================================================

/** Letter labels for multi-select (A-Z) */
export const LABEL_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Overlay colors for each label position */
export const LABEL_COLORS = [
  { bg: "#ff6b6b", text: "#fff" },  // A - red
  { bg: "#ffa94d", text: "#fff" },  // B - orange
  { bg: "#ffd43b", text: "#333" },  // C - yellow
  { bg: "#69db7c", text: "#fff" },  // D - green
  { bg: "#4dabf7", text: "#fff" },  // E - blue
  { bg: "#9775fa", text: "#fff" },  // F - purple
  { bg: "#f783ac", text: "#fff" },  // G - pink
  { bg: "#20c997", text: "#fff" },  // H - teal
  { bg: "#ff922b", text: "#fff" },  // I - deep orange
  { bg: "#845ef7", text: "#fff" },  // J - violet
];

/** Overlay ID prefix for multi-select overlays */
export const MULTI_OVERLAY_PREFIX = "__dom_ctx_overlay_";

/** Label badge overlay ID prefix */
export const LABEL_BADGE_PREFIX = "__dom_ctx_badge_";

// ============================================================
// Shortcut Configuration
// ============================================================

/** chrome.storage key for shortcut configuration */
export const SK_SHORTCUT_CONFIG = "shortcut_config";

/** Available inspect keys */
export const INSPECT_KEYS = ["Alt", "Shift", "Control"] as const;

/** Available multi-select keys */
export const MULTI_SELECT_KEYS = ["Control", "Meta"] as const;

/** Default shortcut configuration */
export const DEFAULT_SHORTCUT_CONFIG: import("./types").ShortcutConfig = {
  inspectKey: "Alt",
  multiSelectKey: "Control",
  inspectRequiresShortcut: true,
  panelVisible: false,
  showInlinePrompt: true,
};
