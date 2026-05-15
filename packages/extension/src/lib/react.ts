/**
 * React Fiber Analyzer Module
 *
 * Safely inspects React's internal Fiber tree via __reactFiber$ keys
 * to extract component names, UI-relevant props, and state node presence.
 *
 * Also provides framework detection (React / Vue) and a reserved Vue analyzer stub.
 */

import type { ReactInfo, SourceLocation } from "../shared/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** UI-relevant props we want to capture (skip children, complex objects) */
const UI_PROPS_ALLOWLIST = new Set([
  "className",
  "style",
  "onClick",
  "onChange",
  "onSubmit",
  "onFocus",
  "onBlur",
  "disabled",
  "placeholder",
  "href",
  "src",
  "alt",
  "title",
  "role",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "data-testid",
  "type",
  "name",
  "value",
  "tabIndex",
]);

/**
 * Find the React Fiber node attached to a DOM element.
 * Searches for __reactFiber$<randomKey> or __reactInternalInstance$<randomKey>.
 */
function getFiberNode(element: HTMLElement): any | null {
  try {
    const keys = Object.keys(element);
    for (const key of keys) {
      if (
        key.startsWith("__reactFiber$") ||
        key.startsWith("__reactInternalInstance$")
      ) {
        return (element as any)[key];
      }
    }
  } catch {
    // Property access may throw in restricted contexts (e.g. sandboxed iframes)
  }
  return null;
}

/**
 * Extract component name from a Fiber node.
 */
function getComponentName(fiber: any): string {
  try {
    const fiberType = fiber?.type;
    if (typeof fiberType === "function") {
      return fiberType.displayName || fiberType.name || "Unknown";
    }
    if (typeof fiberType === "string") {
      // Host component (div, span, etc.) — walk up to find nearest user component
      return fiberType;
    }
    if (fiberType && typeof fiberType === "object") {
      // ForwardRef, Memo, Lazy, etc.
      return (
        fiberType.displayName ||
        fiberType.name ||
        fiberType.render?.displayName ||
        fiberType.render?.name ||
        "Unknown"
      );
    }
    if (fiber?.elementType) {
      const et = fiber.elementType;
      if (typeof et === "function") {
        return et.displayName || et.name || "Unknown";
      }
      if (typeof et === "string") {
        return et;
      }
    }
  } catch {
    // Best-effort; don't let extraction failures propagate
  }
  return "Unknown";
}

/**
 * Walk up the Fiber tree to find the nearest named user-defined component.
 * Stops at the root or after a reasonable depth to avoid infinite loops.
 */
function findNearestUserComponent(fiber: any, depth = 0): string {
  if (!fiber || depth > 30) return "Unknown";

  const name = getComponentName(fiber);

  // Skip host elements (div, span, ...) — keep walking up
  if (typeof fiber.type === "string") {
    return findNearestUserComponent(fiber.return, depth + 1);
  }

  // If we found a real component name (not "Unknown"), return it
  if (name !== "Unknown") return name;

  return findNearestUserComponent(fiber.return, depth + 1);
}

/**
 * Extract a safe, shallow snapshot of UI-relevant props from a Fiber node.
 */
function extractUIProps(fiber: any): Record<string, any> | undefined {
  try {
    const props = fiber?.memoizedProps;
    if (!props || typeof props !== "object") return undefined;

    const result: Record<string, any> = {};
    for (const key of Object.keys(props)) {
      if (UI_PROPS_ALLOWLIST.has(key)) {
        const val = props[key];
        // Only include primitive / simple values — skip functions and complex objects
        if (val === null || val === undefined || typeof val !== "object") {
          result[key] = val;
        } else if (typeof val === "object" && !Array.isArray(val)) {
          // Shallow-copy plain objects like style
          try {
            result[key] = { ...val };
          } catch {
            // If spread fails (e.g. Proxy), stringify a summary
            result[key] = "[Object]";
          }
        }
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Source Location Extraction
// ---------------------------------------------------------------------------

/**
 * Walk up the Fiber tree to find a _debugSource annotation.
 *
 * React DevTools (or babel plugin transform-react-jsx-source) injects
 * `_debugSource: { fileName, lineNumber, columnNumber }` on Fiber nodes
 * during development. This information allows mapping a runtime DOM element
 * back to its exact source file and line.
 *
 * The walk prefers the closest user-defined component (skipping host elements)
 * so the returned location points at the component definition, not a wrapper.
 */
function findSourceLocation(fiber: any): SourceLocation | null {
  try {
    let current = fiber;
    let depth = 0;

    while (current && depth < 40) {
      // Skip host elements (div, span, ...) — their _debugSource points at JSX usage, not component definition
      if (typeof current.type !== "string" && current._debugSource) {
        const src = current._debugSource;
        if (src?.fileName) {
          return {
            fileName: src.fileName,
            lineNumber: src.lineNumber ?? 0,
            ...(src.columnNumber != null && { columnNumber: src.columnNumber }),
          };
        }
      }

      current = current.return;
      depth++;
    }
  } catch {
    // Best-effort
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze the React component associated with a DOM element.
 *
 * Returns `null` if the element is not part of a React tree or if access fails.
 */
export function analyzeReactComponent(
  element: HTMLElement
): ReactInfo | null {
  try {
    const fiber = getFiberNode(element);
    if (!fiber) return null;

    const componentName = findNearestUserComponent(fiber);
    const props = extractUIProps(fiber);
    const hasStateNode = fiber.stateNode !== null && fiber.stateNode !== undefined;
    const sourceLocation = findSourceLocation(fiber);

    return {
      componentName,
      ...(props !== undefined && { props }),
      ...(hasStateNode && { stateNode: true }),
      ...(sourceLocation && { sourceLocation }),
    };
  } catch {
    // Never let errors from React internals leak out
    return null;
  }
}

/**
 * Analyze a Vue component associated with a DOM element.
 *
 * Three-layer strategy:
 *   1. Fast path: __vueParentComponent (dev mode only, non-enumerable)
 *   2. Vue 2 fallback: __vue__ direct access
 *   3. VNode tree traversal via __vue_app__ + _vnode (works in all modes)
 */
export function analyzeVueComponent(element: HTMLElement): ReactInfo | null {
  try {
    // --- Strategy 1: __vueParentComponent (dev mode, fast path) ---
    // This property is set via Object.defineProperty with enumerable:false
    // We must use 'in' operator or direct access, not Object.keys()
    const devInstance = findVue3DevInstance(element);
    if (devInstance) {
      return extractVue3Info(devInstance);
    }

    // --- Strategy 2: Vue 2 __vue__ ---
    const vue2Result = findVue2Instance(element);
    if (vue2Result) {
      return extractVue2Info(vue2Result);
    }

    // --- Strategy 3: VNode tree traversal (production-safe) ---
    const vnodeResult = findComponentViaVNodeTree(element);
    if (vnodeResult) {
      return extractVue3Info(vnodeResult);
    }
  } catch {
    // Never let errors from Vue internals leak out
  }
  return null;
}

/**
 * Find Vue 3 __vueParentComponent by walking up DOM.
 * Only works in dev builds (__DEV__ or __FEATURE_PROD_DEVTOOLS__).
 * The property is non-enumerable, so we use direct property access.
 */
function findVue3DevInstance(element: HTMLElement): any | null {
  // Check current element and walk up
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && depth < 20) {
    // Direct access works even for non-enumerable properties
    const instance = (current as any).__vueParentComponent;
    if (instance) return instance;
    current = current.parentElement;
    depth++;
  }
  return null;
}

/**
 * Find Vue 2 __vue__ instance by walking up DOM.
 */
function findVue2Instance(element: HTMLElement): any | null {
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && depth < 20) {
    const instance = (current as any).__vue__;
    if (instance) return instance;
    current = current.parentElement;
    depth++;
  }
  return null;
}

/**
 * Find component via VNode tree traversal.
 * Works in both dev and production because __vue_app__ and _vnode
 * are always attached unconditionally by Vue 3.
 */
function findComponentViaVNodeTree(targetEl: HTMLElement): any | null {
  // Step 1: Find the Vue app root container
  let container: HTMLElement | null = targetEl;
  while (container && !(container as any).__vue_app__) {
    container = container.parentElement;
  }
  if (!container) return null;

  const app = (container as any).__vue_app__;
  if (!app) return null;

  // Step 2: Get root vnode — prefer _vnode on container, fallback to app._instance
  const rootVNode = (container as any)._vnode;
  if (!rootVNode) return null;

  // Step 3: Traverse vnode tree to find the deepest component whose subtree contains targetEl
  return findDeepestComponent(rootVNode, targetEl);
}

/**
 * Recursively find the deepest component whose rendered output contains targetEl.
 */
function findDeepestComponent(vnode: any, targetEl: HTMLElement): any | null {
  if (!vnode) return null;

  // If this is a component vnode
  if (vnode.component) {
    const instance = vnode.component;
    const subTree = instance.subTree;

    // Check if this component's subtree contains the target element
    if (subTree && isElementInVNodeTree(subTree, targetEl)) {
      // Try to find a deeper (more specific) child component first
      const deeper = findDeepestComponentInChildren(subTree, targetEl);
      if (deeper) return deeper;

      // No deeper match — this is the most specific component
      return instance;
    }
  }

  // Check children array
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      const result = findDeepestComponent(child, targetEl);
      if (result) return result;
    }
  }

  // Handle Fragment (type === Symbol('v-fgt'))
  if (vnode.type === Symbol.for('v-fgt') && Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      const result = findDeepestComponent(child, targetEl);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Search for deepest component within a component's subTree children.
 */
function findDeepestComponentInChildren(subTree: any, targetEl: HTMLElement): any | null {
  if (!subTree) return null;

  // Check component children in subTree
  if (Array.isArray(subTree.children)) {
    for (const child of subTree.children) {
      const result = findDeepestComponent(child, targetEl);
      if (result) return result;
    }
  }

  // Check dynamicChildren (used in Block Tree optimization)
  if (Array.isArray(subTree.dynamicChildren)) {
    for (const child of subTree.dynamicChildren) {
      const result = findDeepestComponent(child, targetEl);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Check if a VNode tree contains the target DOM element.
 */
function isElementInVNodeTree(vnode: any, target: HTMLElement): boolean {
  if (!vnode) return false;

  // Direct match
  if (vnode.el === target) return true;

  // Fragment: check all children's els
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      if (isElementInVNodeTree(child, target)) return true;
    }
  }

  // Component: check its subTree
  if (vnode.component?.subTree) {
    return isElementInVNodeTree(vnode.component.subTree, target);
  }

  // Check dynamicChildren
  if (Array.isArray(vnode.dynamicChildren)) {
    for (const child of vnode.dynamicChildren) {
      if (isElementInVNodeTree(child, target)) return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Vue extraction helpers
// ---------------------------------------------------------------------------

function extractVue3Info(instance: any): ReactInfo | null {
  try {
    const type = instance?.type;
    if (!type) return null;

    const componentName =
      type.displayName ||
      type.name ||
      (typeof type === "string" ? type : "Anonymous") ||
      "Anonymous";

    // Source file from SFC __file property
    const sourceFile: string | undefined = type.__file;
    const sourceLocation = sourceFile
      ? normalizeVueSourcePath(sourceFile)
      : undefined;

    return {
      componentName,
      ...(sourceLocation && { sourceLocation }),
    };
  } catch {
    return null;
  }
}

function extractVue2Info(instance: any): ReactInfo | null {
  try {
    const options = instance?.$options;
    if (!options) return null;

    const componentName =
      options.name ||
      options._componentTag ||
      (instance.$root === instance ? "Root" : "Anonymous");

    // Source file from SFC __file
    const sourceFile: string | undefined = options.__file;
    const sourceLocation = sourceFile
      ? normalizeVueSourcePath(sourceFile)
      : undefined;

    return {
      componentName,
      ...(sourceLocation && { sourceLocation }),
    };
  } catch {
    return null;
  }
}

/**
 * Normalize a Vue SFC __file path to a project-relative path.
 *
 * Vue's __file is typically an absolute path. We strip common prefixes
 * to produce a clean relative path suitable for AI context.
 */
function normalizeVueSourcePath(filePath: string): SourceLocation | null {
  try {
    if (!filePath) return null;

    // Try to extract project-relative path
    // Common patterns: /src/components/X.vue, C:\project\src\components\X.vue
    const srcMatch = filePath.match(/[\\/]src[\\/](.+)/);
    const cleanPath = srcMatch
      ? "src/" + srcMatch[1].replace(/\\/g, "/")
      : filePath.replace(/\\/g, "/").split("/").slice(-3).join("/");

    return {
      fileName: cleanPath,
      lineNumber: 0, // Vue doesn't provide line numbers via __file
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Framework detection
// ---------------------------------------------------------------------------

interface FrameworkInfo {
  name: string;
  version?: string;
}

/**
 * Detect which frontend framework (if any) is managing a given DOM element.
 *
 * Checks for React and Vue internal keys on the element and nearby nodes.
 * Returns `null` if no known framework is detected.
 */
export function detectFramework(
  element: HTMLElement
): FrameworkInfo | null {
  try {
    // --- React ---
    const keys = Object.keys(element);
    const hasReactFiber = keys.some(
      (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
    );
    if (hasReactFiber) {
      const version = resolveReactVersion(element);
      return { name: "React", ...(version && { version }) };
    }

    // --- Vue ---
    const hasVue =
      "__vue_app__" in element ||
      "__vueParentComponent" in element ||
      "__vue__" in element;
    if (hasVue) {
      const version = resolveVueVersion(element);
      return { name: "Vue", ...(version && { version }) };
    }
  } catch {
    // Restricted contexts may throw
  }

  return null;
}

// ---------------------------------------------------------------------------
// Version resolution helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to resolve React version from the DOM.
 *
 * Strategy:
 *  1. Look for __reactFiber$ key on the element, then walk fiber._debugOwner
 *     chain — React 18+ attaches version info on the renderer.
 *  2. Check for ReactDOMRoot.__SECRET_INTERNALS_DO_NOT_USE_OR_USERS_WILL_BE_FIRED
 *     (not reliable from content script context).
 *  3. Fall back to `React.version` if the global is accessible.
 */
function resolveReactVersion(element: HTMLElement): string | null {
  try {
    // Try global React
    const win = element.ownerDocument.defaultView;
    if (win) {
      // React may be exposed via __REACT_DEVTOOLS_GLOBAL_HOOK__
      const hook = (win as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook?.renderers) {
        const renderers = hook.renderers;
        for (const rid of Object.keys(renderers)) {
          const renderer = renderers[rid];
          if (renderer?.version) {
            return String(renderer.version);
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Attempt to resolve Vue version from the DOM.
 */
function resolveVueVersion(element: HTMLElement): string | null {
  try {
    // Vue 3: __vue_app__.version
    const vueApp = (element as any).__vue_app__;
    if (vueApp?.version) return String(vueApp.version);

    // Vue 2: walk __vue__ chain for $root.$options.version or similar
    const vueInstance = (element as any).__vue__;
    if (vueInstance?.$root?.$options?.version) {
      return String(vueInstance.$root.$options.version);
    }
  } catch {
    // Ignore
  }
  return null;
}
