// Element Information
export interface ElementInfo {
  tagName: string;
  className: string;
  id: string;
  innerText: string;
}

// Accessibility Information
export interface AccessibilityInfo {
  role: string;
  ariaLabel: string | null;
  ariaDescribedBy: string | null;
  ariaHidden: string | null;
  tabIndex: string | null;
  isFocusable: boolean;
  isInteractive: boolean;
}

// Shortcut Configuration
export interface ShortcutConfig {
  inspectKey: "Alt" | "Shift" | "Control";
  multiSelectKey: "Control" | "Meta";
  inspectRequiresShortcut: boolean;
  panelVisible: boolean;
  showInlinePrompt: boolean;
}

// Box Model from getBoundingClientRect
export interface BoxModel {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

// Computed Style - only key fields
export interface ComputedStyle {
  [key: string]: string;
}

// Visibility Information
export interface VisibilityInfo {
  hidden: boolean;
  clipped: boolean;
  opacity: number;
  visibility: string;
}

// Layout Node in layout chain
export interface LayoutNode {
  tag: string;
  class: string;
  display: string;
  width: number;
  overflow?: string;
  position?: string;
  transform?: string;
}

// Source location extracted from framework internals
export interface SourceLocation {
  /** Source file path relative to project root */
  fileName: string;
  /** Line number in the source file (1-based) */
  lineNumber: number;
  /** Column number in the source file (1-based, optional) */
  columnNumber?: number;
}

// React Component Information
export interface ReactInfo {
  componentName: string;
  props?: Record<string, any>;
  stateNode?: any;
  /** Source file location extracted from framework internals */
  sourceLocation?: SourceLocation;
}

// Constraint Issue
export type ConstraintIssueType =
  | 'flex-shrink'
  | 'overflow-clip'
  | 'absolute-context'
  | 'visibility-hidden'
  | 'z-index-conflict'
  | 'margin-collapse'
  | 'float-issue';

export type ConstraintSeverity = 'warning' | 'error';

export interface ConstraintIssue {
  type: ConstraintIssueType;
  description: string;
  severity: ConstraintSeverity;
  selector?: string;
  suggestedFix?: string;
}

// Compressed Context for prompt generation
export interface CompressedContext {
  selectedElement: {
    component?: ReactInfo;
    tag: string;
    text?: string;
    rect: BoxModel;
    styles?: ComputedStyle;
    cssSelector?: string;
    xpath?: string;
    html?: string;
    accessibility?: AccessibilityInfo;
  };
  layoutChain: LayoutNode[];
  possibleIssues: ConstraintIssue[];
  viewport?: {
    width: number;
    height: number;
  };
}

// Prompt Template for final markdown output
export interface PromptTemplate {
  title: string;
  overview: string;
  elementInfo: ElementInfo;
  boxModel: BoxModel;
  computedStyles: ComputedStyle;
  visibilityInfo: VisibilityInfo;
  layoutChain: LayoutNode[];
  reactInfo?: ReactInfo;
  constraintIssues: ConstraintIssue[];
  suggestions: string[];
  generatedMarkdown: string;
}

// ============================================================
// Server-side types for Runtime API
// ============================================================

/**
 * ContextEntry - A stored context capture entry.
 * Each entry represents one element inspection snapshot, persisted
 * on the local Runtime server with a unique ID and timestamp.
 */
export interface ContextEntry {
  /** Unique identifier (UUID) for this context entry */
  id: string;
  /** Unix timestamp (ms) when the context was captured */
  timestamp: number;
  /** URL of the page where the context was captured */
  url: string;
  /** Title of the page where the context was captured */
  pageTitle?: string;
  /** The compressed context data for the inspected element */
  context: CompressedContext;
}

/**
 * ContextCapturePayload - Message payload sent from the content script
 * to the background script when a context is captured.
 */
export interface ContextCapturePayload {
  /** The compressed context data from the element inspector */
  context: CompressedContext;
  /** URL of the page where the context was captured */
  url: string;
  /** Title of the page where the context was captured */
  pageTitle?: string;
  /** Tab ID for isolation between tabs */
  tabId?: number;
}

/**
 * SelectedContext - A single element selected by the user in multi-select mode.
 * Includes an auto-assigned letter label and optional user description.
 */
export interface SelectedContext {
  /** Unique identifier for this selection (UUID) */
  id: string;
  /** Auto-assigned letter label (A, B, C, ...) */
  label: string;
  /** User-defined description for this element */
  description: string;
  /** Lightweight element info */
  elementInfo: ElementInfo;
  /** Compressed context data */
  context: CompressedContext;
  /** URL of the page */
  url: string;
  /** Page title */
  pageTitle?: string;
  /** Tab ID for isolation */
  tabId?: number;
}

/**
 * MultiSelectMessage - Message sent when multiple elements are selected.
 */
export interface MultiSelectMessage {
  type: "MULTI_ELEMENTS_SELECTED";
  payload: {
    contexts: SelectedContext[];
    tabId?: number;
  };
}

/**
 * ApiResponse - Standardized REST API response wrapper.
 * All Runtime server endpoints use this shape for consistency.
 *
 * @typeparam T - The type of the `data` field on success responses.
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request succeeded */
  success: boolean;
  /** Response payload on success */
  data?: T;
  /** Error message on failure */
  error?: string;
  /** Server-side timestamp (ms) of when the response was created */
  timestamp: number;
}

/**
 * ServerConfig - Configuration options for the local Runtime server.
 */
export interface ServerConfig {
  /** Port number the HTTP server listens on */
  port: number;
  /** Maximum number of context entries retained in history */
  maxHistorySize: number;
  /** Allowed CORS origin (used in Access-Control-Allow-Origin header) */
  corsOrigin: string;
}
