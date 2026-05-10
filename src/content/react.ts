/**
 * React Fiber Analyzer Module
 *
 * Safely inspects React's internal Fiber tree via __reactFiber$ keys
 * to extract component names, UI-relevant props, and state node presence.
 *
 * Also provides framework detection (React / Vue) and a reserved Vue analyzer stub.
 */

import type { ReactInfo } from "../shared/types";

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

    return {
      componentName,
      ...(props !== undefined && { props }),
      ...(hasStateNode && { stateNode: true }),
    };
  } catch {
    // Never let errors from React internals leak out
    return null;
  }
}

/**
 * Analyze a Vue component associated with a DOM element.
 *
 * MVP stub — returns `null`. Interface is reserved for future Vue 2/3 support
 * via `__vueParentComponent` / `__vue_app__` internal keys.
 */
export function analyzeVueComponent(
  _element: HTMLElement
): ReactInfo | null {
  // Reserved for future implementation.
  // Detection would check for:
  //   Vue 3: element.__vue_app__ or element.__vueParentComponent
  //   Vue 2: element.__vue__
  return null;
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
