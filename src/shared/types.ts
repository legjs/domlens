// Element Information
export interface ElementInfo {
  tagName: string;
  className: string;
  id: string;
  innerText: string;
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

// React Component Information
export interface ReactInfo {
  componentName: string;
  props?: Record<string, any>;
  stateNode?: any;
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