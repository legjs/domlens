# DomLens i18n + Icons + Color Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add internationalization (Chinese + English), replace all inline SVGs with Lucide Icons, and improve color contrast across the DomLens Chrome extension.

**Architecture:** Use Chrome's native `chrome.i18n` API with `_locales/` JSON files for translations. Lucide provides `lucide-react` for the Popup (React) and `lucide` for content scripts (SVG string generation). Color fixes apply WCAG AA contrast standards (4.5:1 minimum) to all low-contrast text/icons.

**Tech Stack:** Chrome i18n API, lucide-react, lucide, Plasmo, React, Tailwind CSS

---

## File Structure

### New Files
- `packages/extension/_locales/en/messages.json` — English translations
- `packages/extension/_locales/zh_CN/messages.json` — Chinese translations
- `packages/extension/src/lib/i18n.ts` — Shared i18n helper (wraps `chrome.i18n.getMessage` for content scripts)

### Modified Files
- `packages/extension/package.json` — Add lucide-react, lucide dependencies
- `packages/extension/src/popup.tsx` — i18n strings, Lucide icons, color fixes
- `packages/extension/src/style.css` — Scrollbar color fixes
- `packages/extension/src/lib/panel.ts` — i18n strings, Lucide icons, color fixes
- `packages/extension/src/lib/inline-prompt.ts` — i18n strings, Lucide icons, color fixes
- `packages/extension/src/lib/overlay.ts` — Lucide icons for delete button
- `packages/extension/src/shared/constants.ts` — Add locale constants
- `packages/extension/src/shared/types.ts` — Add `LocaleType` type

---

### Task 1: Install Dependencies

**Files:**
- Modify: `packages/extension/package.json`

- [ ] **Step 1: Install lucide-react and lucide**

```bash
cd packages/extension && pnpm add lucide-react lucide
```

Run: `cd packages/extension && pnpm add lucide-react lucide`
Expected: Dependencies added to package.json and node_modules updated.

- [ ] **Step 2: Commit**

```bash
git add packages/extension/package.json packages/extension/pnpm-lock.yaml
git commit -m "chore: add lucide-react and lucide dependencies"
```

---

### Task 2: Create i18n Translation Files

**Files:**
- Create: `packages/extension/_locales/en/messages.json`
- Create: `packages/extension/_locales/zh_CN/messages.json`

- [ ] **Step 1: Create English translations**

Create `packages/extension/_locales/en/messages.json`:

```json
{
  "appName": {
    "message": "DomLens"
  },
  "settings": {
    "message": "Settings"
  },
  "back": {
    "message": "Back"
  },
  "inspectorOn": {
    "message": "Inspector ON"
  },
  "inspectorOff": {
    "message": "Inspector OFF"
  },
  "offline": {
    "message": "Offline"
  },
  "elementsSelected": {
    "message": "$1 element$2 selected"
  },
  "noElementsSelected": {
    "message": "No elements selected"
  },
  "holdAltClick": {
    "message": "Hold Alt + Click to inspect"
  },
  "seeFloatingPanel": {
    "message": "See the floating panel on the page"
  },
  "clickToSelect": {
    "message": "Click to select | Multi-select: Ctrl+Alt+Click"
  },
  "copyPrompt": {
    "message": "Copy Prompt"
  },
  "copied": {
    "message": "Copied!"
  },
  "inspectKey": {
    "message": "Inspect Key"
  },
  "inspectKeyDesc": {
    "message": "Hold to activate inspection"
  },
  "multiSelectKey": {
    "message": "Multi-select Key"
  },
  "multiSelectKeyDesc": {
    "message": "+ Inspect Key to multi-select"
  },
  "requireKeyToSelect": {
    "message": "Require key to select"
  },
  "requireKeyDesc": {
    "message": "Must hold Inspect Key to click-select"
  },
  "showFloatingPanel": {
    "message": "Show floating panel"
  },
  "showFloatingPanelDesc": {
    "message": "Display element info panel on page"
  },
  "inlinePrompt": {
    "message": "Inline prompt"
  },
  "inlinePromptDesc": {
    "message": "Show input dialog after selecting element"
  },
  "shortcuts": {
    "message": "Shortcuts"
  },
  "activate": {
    "message": "Activate"
  },
  "select": {
    "message": "Select"
  },
  "multiSelect": {
    "message": "Multi-select"
  },
  "clear": {
    "message": "Clear"
  },
  "resetToDefaults": {
    "message": "Reset to defaults"
  },
  "hold": {
    "message": "Hold $1"
  },
  "clickCombo": {
    "message": "$1+Click"
  },
  "multiCombo": {
    "message": "$1+$2+Click"
  },
  "metaKey": {
    "message": "Cmd"
  },
  "elementLabel": {
    "message": "element"
  },
  "elementsLabel": {
    "message": "elements"
  },
  "panelTitle": {
    "message": "DomLens"
  },
  "panelEmptyState": {
    "message": "No elements selected"
  },
  "panelCopyTooltip": {
    "message": "Copy prompt"
  },
  "panelCollapseTooltip": {
    "message": "Collapse"
  },
  "panelExpandTooltip": {
    "message": "Expand"
  },
  "panelRemoveTooltip": {
    "message": "Remove"
  },
  "panelRemoveSelectionTooltip": {
    "message": "Remove selection"
  },
  "panelDescPlaceholder": {
    "message": "Add description..."
  },
  "panelPromptPlaceholder": {
    "message": "Describe what you want to fix or change..."
  },
  "panelSend": {
    "message": "Send"
  },
  "panelSending": {
    "message": "Sending..."
  },
  "panelSent": {
    "message": "Sent!"
  },
  "panelSendToClaude": {
    "message": "Send to Claude Code"
  },
  "panelClearAll": {
    "message": "Clear All"
  },
  "detailCssSelector": {
    "message": "CSS Selector"
  },
  "detailXpath": {
    "message": "XPath"
  },
  "detailBoundingBox": {
    "message": "Bounding Box"
  },
  "detailAccessibility": {
    "message": "Accessibility"
  },
  "detailComputedStyles": {
    "message": "Computed Styles"
  },
  "detailHtml": {
    "message": "HTML"
  },
  "inlinePromptPlaceholder": {
    "message": "Describe what you want to change..."
  },
  "inlinePromptClose": {
    "message": "Close"
  },
  "taskSection": {
    "message": "## Task"
  },
  "taskSingle": {
    "message": "Based on the above element context, please help fix layout or styling issues."
  },
  "taskMultiple": {
    "message": "Based on the above element contexts, please help fix layout or styling issues for the selected elements."
  },
  "elementSelections": {
    "message": "# DomLens - Element Selections\n"
  },
  "elementLabelSection": {
    "message": "## [$1] Element"
  },
  "elementLabelDesc": {
    "message": "## [$1] Element ($2)"
  },
  "tagLabel": {
    "message": "- **Tag**: $1"
  },
  "cssSelectorLabel": {
    "message": "- **CSS Selector**: `$1`"
  },
  "xpathLabel": {
    "message": "- **XPath**: `$1`"
  },
  "idLabel": {
    "message": "- **ID**: $1"
  },
  "classLabel": {
    "message": "- **Class**: $1"
  },
  "textLabel": {
    "message": "- **Text**: $1"
  },
  "sizeLabel": {
    "message": "- **Size**: $1 x $2px"
  },
  "positionLabel": {
    "message": "- **Position**: top=$1, left=$2"
  },
  "roleLabel": {
    "message": "- **Role**: $1"
  },
  "ariaLabelLabel": {
    "message": "- **ARIA Label**: $1"
  },
  "focusableLabel": {
    "message": "- **Focusable**: yes"
  },
  "interactiveLabel": {
    "message": "- **Interactive**: yes"
  },
  "computedStylesLabel": {
    "message": "- **Computed Styles**:"
  },
  "htmlLabel": {
    "message": "- **HTML**:"
  },
  "layoutChainLabel": {
    "message": "- **Layout Chain**:"
  },
  "language": {
    "message": "Language"
  },
  "languageDesc": {
    "message": "Change extension display language"
  },
  "langAuto": {
    "message": "Auto (Browser default)"
  },
  "langEn": {
    "message": "English"
  },
  "langZh": {
    "message": "Chinese (Simplified)"
  }
}
```

- [ ] **Step 2: Create Chinese translations**

Create `packages/extension/_locales/zh_CN/messages.json`:

```json
{
  "appName": {
    "message": "DomLens"
  },
  "settings": {
    "message": "设置"
  },
  "back": {
    "message": "返回"
  },
  "inspectorOn": {
    "message": "检查器已开启"
  },
  "inspectorOff": {
    "message": "检查器已关闭"
  },
  "offline": {
    "message": "离线"
  },
  "elementsSelected": {
    "message": "已选择 $1 个元素"
  },
  "noElementsSelected": {
    "message": "未选择元素"
  },
  "holdAltClick": {
    "message": "按住 Alt + 点击以检查"
  },
  "seeFloatingPanel": {
    "message": "查看页面上的浮动面板"
  },
  "clickToSelect": {
    "message": "点击选择 | 多选: Ctrl+Alt+点击"
  },
  "copyPrompt": {
    "message": "复制提示词"
  },
  "copied": {
    "message": "已复制!"
  },
  "inspectKey": {
    "message": "检查键"
  },
  "inspectKeyDesc": {
    "message": "按住以激活检查模式"
  },
  "multiSelectKey": {
    "message": "多选键"
  },
  "multiSelectKeyDesc": {
    "message": "+ 检查键组合进行多选"
  },
  "requireKeyToSelect": {
    "message": "需要按键选择"
  },
  "requireKeyDesc": {
    "message": "必须按住检查键才能点击选择"
  },
  "showFloatingPanel": {
    "message": "显示浮动面板"
  },
  "showFloatingPanelDesc": {
    "message": "在页面上显示元素信息面板"
  },
  "inlinePrompt": {
    "message": "内联提示"
  },
  "inlinePromptDesc": {
    "message": "选择元素后显示输入对话框"
  },
  "shortcuts": {
    "message": "快捷键"
  },
  "activate": {
    "message": "激活"
  },
  "select": {
    "message": "选择"
  },
  "multiSelect": {
    "message": "多选"
  },
  "clear": {
    "message": "清除"
  },
  "resetToDefaults": {
    "message": "恢复默认设置"
  },
  "hold": {
    "message": "按住 $1"
  },
  "clickCombo": {
    "message": "$1+点击"
  },
  "multiCombo": {
    "message": "$1+$2+点击"
  },
  "metaKey": {
    "message": "Cmd"
  },
  "elementLabel": {
    "message": "元素"
  },
  "elementsLabel": {
    "message": "元素"
  },
  "panelTitle": {
    "message": "DomLens"
  },
  "panelEmptyState": {
    "message": "未选择元素"
  },
  "panelCopyTooltip": {
    "message": "复制提示词"
  },
  "panelCollapseTooltip": {
    "message": "折叠"
  },
  "panelExpandTooltip": {
    "message": "展开"
  },
  "panelRemoveTooltip": {
    "message": "移除"
  },
  "panelRemoveSelectionTooltip": {
    "message": "移除选择"
  },
  "panelDescPlaceholder": {
    "message": "添加描述..."
  },
  "panelPromptPlaceholder": {
    "message": "描述你想要修复或更改的内容..."
  },
  "panelSend": {
    "message": "发送"
  },
  "panelSending": {
    "message": "发送中..."
  },
  "panelSent": {
    "message": "已发送!"
  },
  "panelSendToClaude": {
    "message": "发送到 Claude Code"
  },
  "panelClearAll": {
    "message": "全部清除"
  },
  "detailCssSelector": {
    "message": "CSS 选择器"
  },
  "detailXpath": {
    "message": "XPath"
  },
  "detailBoundingBox": {
    "message": "边界框"
  },
  "detailAccessibility": {
    "message": "无障碍"
  },
  "detailComputedStyles": {
    "message": "计算样式"
  },
  "detailHtml": {
    "message": "HTML"
  },
  "inlinePromptPlaceholder": {
    "message": "描述你想要更改的内容..."
  },
  "inlinePromptClose": {
    "message": "关闭"
  },
  "taskSection": {
    "message": "## 任务"
  },
  "taskSingle": {
    "message": "根据上述元素上下文，请帮助修复布局或样式问题。"
  },
  "taskMultiple": {
    "message": "根据上述元素上下文，请帮助修复所选元素的布局或样式问题。"
  },
  "elementSelections": {
    "message": "# DomLens - 元素选择\n"
  },
  "elementLabelSection": {
    "message": "## [$1] 元素"
  },
  "elementLabelDesc": {
    "message": "## [$1] 元素 ($2)"
  },
  "tagLabel": {
    "message": "- **标签**: $1"
  },
  "cssSelectorLabel": {
    "message": "- **CSS 选择器**: `$1`"
  },
  "xpathLabel": {
    "message": "- **XPath**: `$1`"
  },
  "idLabel": {
    "message": "- **ID**: $1"
  },
  "classLabel": {
    "message": "- **类名**: $1"
  },
  "textLabel": {
    "message": "- **文本**: $1"
  },
  "sizeLabel": {
    "message": "- **尺寸**: $1 x $2px"
  },
  "positionLabel": {
    "message": "- **位置**: top=$1, left=$2"
  },
  "roleLabel": {
    "message": "- **角色**: $1"
  },
  "ariaLabelLabel": {
    "message": "- **ARIA 标签**: $1"
  },
  "focusableLabel": {
    "message": "- **可聚焦**: 是"
  },
  "interactiveLabel": {
    "message": "- **可交互**: 是"
  },
  "computedStylesLabel": {
    "message": "- **计算样式**:"
  },
  "htmlLabel": {
    "message": "- **HTML**:"
  },
  "layoutChainLabel": {
    "message": "- **布局链**:"
  },
  "language": {
    "message": "语言"
  },
  "languageDesc": {
    "message": "更改扩展显示语言"
  },
  "langAuto": {
    "message": "自动（浏览器默认）"
  },
  "langEn": {
    "message": "English"
  },
  "langZh": {
    "message": "中文（简体）"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/extension/_locales/
git commit -m "feat: add i18n translation files for English and Chinese"
```

---

### Task 3: Create i18n Helper Module

**Files:**
- Create: `packages/extension/src/lib/i18n.ts`

This module wraps `chrome.i18n.getMessage` for consistent usage across both popup and content scripts. It handles the case where `chrome.i18n` may not be available (e.g., during development).

- [ ] **Step 1: Create the i18n helper**

Create `packages/extension/src/lib/i18n.ts`:

```typescript
/**
 * i18n Helper Module
 *
 * Wraps chrome.i18n.getMessage for consistent usage
 * across popup (React) and content scripts (DOM).
 */

/**
 * Get a localized message by key.
 * Falls back to the key itself if chrome.i18n is not available.
 *
 * @param key - Message key from _locales/*/messages.json
 * @param substitutions - Optional substitution values
 */
export function t(key: string, ...substitutions: string[]): string {
  try {
    const msg = chrome.i18n.getMessage(key, substitutions)
    return msg || key
  } catch {
    return key
  }
}

/**
 * Get the browser's UI language code.
 * Returns a locale string like "en", "zh-CN", "ja", etc.
 */
export function getBrowserLocale(): string {
  try {
    return chrome.i18n.getUILanguage()
  } catch {
    return "en"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/extension/src/lib/i18n.ts
git commit -m "feat: add i18n helper module wrapping chrome.i18n API"
```

---

### Task 4: Update Popup with i18n, Lucide Icons, and Color Fixes

**Files:**
- Modify: `packages/extension/src/popup.tsx`

This is the largest task. Apply all three changes to popup.tsx:
1. Replace all hardcoded English strings with `t()` calls
2. Replace inline SVGs with Lucide React components
3. Fix all low-contrast colors

- [ ] **Step 1: Update imports and add i18n + Lucide**

In `popup.tsx`, update the imports at the top of the file. Replace the existing import block:

```typescript
import { useEffect, useCallback, useRef, useState } from "react"
import "~src/style.css"
import usePopupStore, { loadPersistedState } from "~store"
import type { SelectedContext, ShortcutConfig } from "~shared/types"
import { SERVER_PORT_RANGE, SK_SERVER_PORT, SK_SHORTCUT_CONFIG, INSPECT_KEYS, MULTI_SELECT_KEYS, DEFAULT_SHORTCUT_CONFIG } from "~shared/constants"
import { t } from "~lib/i18n"
import { Settings, ArrowLeft } from "lucide-react"
```

- [ ] **Step 2: Replace hardcoded strings in the header**

In the `IndexPopup` component's JSX, replace the header title and button titles:

Replace:
```tsx
<h1 className="text-sm font-semibold text-[#e0e0e0] tracking-wide">
  {showSettings ? "Settings" : "DomLens"}
</h1>
```

With:
```tsx
<h1 className="text-sm font-semibold text-[#e0e0e0] tracking-wide">
  {showSettings ? t("settings") : t("appName")}
</h1>
```

Replace the settings button title and SVG icons:

Replace:
```tsx
<button
  onClick={() => setShowSettings(!showSettings)}
  className="text-[#888] hover:text-[#ccc] transition-colors p-1"
  title={showSettings ? "Back" : "Settings"}
>
  {showSettings ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )}
</button>
```

With:
```tsx
<button
  onClick={() => setShowSettings(!showSettings)}
  className="text-[#bbb] hover:text-[#e0e0e0] transition-colors p-1"
  title={showSettings ? t("back") : t("settings")}
>
  {showSettings ? <ArrowLeft size={14} /> : <Settings size={14} />}
</button>
```

- [ ] **Step 3: Fix status indicator colors and text**

Replace the offline indicator:
```tsx
<span className="text-xs text-[#888] ml-1">{serverPort ? ":" + serverPort : "Offline"}</span>
```
With:
```tsx
<span className="text-xs text-[#bbb] ml-1">{serverPort ? ":" + serverPort : t("offline")}</span>
```

Replace the toggle button text:
```tsx
{toggleActive ? "Inspector ON" : "Inspector OFF"}
```
With:
```tsx
{toggleActive ? t("inspectorOn") : t("inspectorOff")}
```

Replace the toggle button OFF state colors:
```tsx
: "w-full py-2 px-4 rounded-lg bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#aaa] text-sm font-medium transition-colors"
```
With:
```tsx
: "w-full py-2 px-4 rounded-lg bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#ccc] text-sm font-medium transition-colors"
```

Replace the hint text:
```tsx
<p className="text-[10px] text-[#555] mt-1.5 text-center">
  Click to select | Multi-select: Ctrl+Alt+Click
</p>
```
With:
```tsx
<p className="text-[10px] text-[#999] mt-1.5 text-center">
  {t("clickToSelect")}
</p>
```

- [ ] **Step 4: Fix status area colors and text**

Replace the selected count text:
```tsx
<p className="text-xs text-[#888]">
  {selectedContexts.length} element{selectedContexts.length > 1 ? "s" : ""} selected
</p>
```
With:
```tsx
<p className="text-xs text-[#bbb]">
  {selectedContexts.length} {t("elementsSelected", String(selectedContexts.length), selectedContexts.length > 1 ? t("elementsLabel") : t("elementLabel"))}
</p>
```

Note: Since `chrome.i18n.getMessage` supports pluralization poorly, we use a simpler approach. Replace:
```tsx
<p className="text-xs text-[#bbb]">
  {t("noElementsSelected").replace("$1", String(selectedContexts.length)).replace("$2", selectedContexts.length > 1 ? "s" : "")}
</p>
```

Wait, actually the cleanest approach: just use inline conditional:
```tsx
<p className="text-xs text-[#bbb]">
  {selectedContexts.length} {selectedContexts.length === 1 ? t("elementLabel") : t("elementsLabel")} {t("noElementsSelected").includes("未选择") ? "" : ""}
</p>
```

Hmm, let me simplify. The Chinese message for `elementsSelected` is `"已选择 $1 个元素"` which handles singular/plural natively. For English, let's use a simpler key structure. Update the approach:

Replace:
```tsx
<p className="text-xs text-[#888]">
  {selectedContexts.length} element{selectedContexts.length > 1 ? "s" : ""} selected
</p>
<p className="text-[10px] text-[#555] mt-1">
  See the floating panel on the page
</p>
```
With:
```tsx
<p className="text-xs text-[#bbb]">
  {selectedContexts.length === 1
    ? t("elementsSelected", "1", "")
    : t("elementsSelected", String(selectedContexts.length), "s")}
</p>
<p className="text-[10px] text-[#999] mt-1">
  {t("seeFloatingPanel")}
</p>
```

Replace the "no elements" empty state:
```tsx
<div className="bg-[#16213e] rounded-lg p-6 text-center">
  <p className="text-xs text-[#555]">
    No elements selected
  </p>
  <p className="text-[10px] text-[#444] mt-1">
    Hold Alt + Click to inspect
  </p>
</div>
```
With:
```tsx
<div className="bg-[#16213e] rounded-lg p-6 text-center">
  <p className="text-xs text-[#999]">
    {t("noElementsSelected")}
  </p>
  <p className="text-[10px] text-[#888] mt-1">
    {t("holdAltClick")}
  </p>
</div>
```

- [ ] **Step 5: Fix copy button text and disabled colors**

Replace:
```tsx
{copied ? "Copied!" : "Copy Prompt"}
```
With:
```tsx
{copied ? t("copied") : t("copyPrompt")}
```

Replace the disabled copy button colors:
```tsx
: "w-full py-2 px-4 rounded-lg bg-[#1a1a2e] text-[#444] text-sm font-medium cursor-not-allowed"
```
With:
```tsx
: "w-full py-2 px-4 rounded-lg bg-[#1a1a2e] text-[#888] text-sm font-medium cursor-not-allowed"
```

- [ ] **Step 6: Fix Settings panel colors and i18n**

In the `SettingsPanel` component, fix all label/description colors and add i18n:

Replace all `text-[#666]` description colors with `text-[#aaa]`.
Replace all `text-[#888]` heading colors with `text-[#bbb]`.
Replace all `text-[#aaa]` shortcut label colors with `text-[#ccc]`.
Replace all `text-[#ccc]` setting label colors with `text-[#e0e0e0]`.

For i18n in SettingsPanel, replace each hardcoded string:

"Inspect Key" → `t("inspectKey")`
"Hold to activate inspection" → `t("inspectKeyDesc")`
"Multi-select Key" → `t("multiSelectKey")`
"+ Inspect Key to multi-select" → `t("multiSelectKeyDesc")`
"Require key to select" → `t("requireKeyToSelect")`
"Must hold Inspect Key to click-select" → `t("requireKeyDesc")`
"Show floating panel" → `t("showFloatingPanel")`
"Display element info panel on page" → `t("showFloatingPanelDesc")`
"Inline prompt" → `t("inlinePrompt")`
"Show input dialog after selecting element" → `t("inlinePromptDesc")`
"Shortcuts" → `t("shortcuts")`
"Activate" → `t("activate")`
"Select" → `t("select")`
"Multi-select" → `t("multiSelect")`
"Clear" → `t("clear")`
"Reset to defaults" → `t("resetToDefaults")`
"Meta (Cmd)" → `t("metaKey")`
"Hold {config.inspectKey}" → `t("hold", config.inspectKey)`
"{config.inspectKey}+Click" → `t("clickCombo", config.inspectKey)`
Multi-select combo → `t("multiCombo", config.multiSelectKey === "Meta" ? t("metaKey") : config.multiSelectKey, config.inspectKey)`

Replace the toggle switch knob OFF color from `bg-[#888]` to `bg-[#bbb]`.

- [ ] **Step 7: Add Language selector to Settings**

Add a new settings section before the Shortcuts section in `SettingsPanel`:

```tsx
{/* Language */}
<div className="bg-[#16213e] rounded-lg p-3">
  <label className="block text-xs font-medium text-[#e0e0e0] mb-1">{t("language")}</label>
  <p className="text-[10px] text-[#aaa] mb-2">{t("languageDesc")}</p>
  <select
    value={config.locale || "auto"}
    onChange={(e) => setConfig({ ...config, locale: e.target.value })}
    className="w-full bg-[#0f1a2e] border border-[#2a2a4a] rounded px-2 py-1.5 text-xs text-[#e0e0e0] focus:outline-none focus:border-blue-500"
  >
    <option value="auto">{t("langAuto")}</option>
    <option value="en">{t("langEn")}</option>
    <option value="zh_CN">{t("langZh")}</option>
  </select>
</div>
```

- [ ] **Step 8: Add locale to ShortcutConfig type**

In `packages/extension/src/shared/types.ts`, add `locale` field to `ShortcutConfig`:

```typescript
export interface ShortcutConfig {
  inspectKey: "Alt" | "Shift" | "Control";
  multiSelectKey: "Control" | "Meta";
  inspectRequiresShortcut: boolean;
  panelVisible: boolean;
  showInlinePrompt: boolean;
  locale?: "auto" | "en" | "zh_CN";
}
```

In `packages/extension/src/shared/constants.ts`, add locale to default:

```typescript
export const DEFAULT_SHORTCUT_CONFIG: import("./types").ShortcutConfig = {
  inspectKey: "Alt",
  multiSelectKey: "Control",
  inspectRequiresShortcut: true,
  panelVisible: false,
  showInlinePrompt: true,
  locale: "auto",
};
```

Add a new storage key constant:
```typescript
export const SK_LOCALE = "domlens_locale";
```

- [ ] **Step 9: Commit**

```bash
git add packages/extension/src/popup.tsx packages/extension/src/shared/types.ts packages/extension/src/shared/constants.ts
git commit -m "feat: add i18n, Lucide icons, and color contrast fixes to popup"
```

---

### Task 5: Update Panel (content script) with i18n, Lucide Icons, and Color Fixes

**Files:**
- Modify: `packages/extension/src/lib/panel.ts`

This file uses inline styles (no Tailwind). Changes:
1. Import `t` from i18n helper
2. Import icons from `lucide`
3. Replace all hardcoded strings
4. Replace all SVG/HTML entity icons with Lucide SVG strings
5. Fix all low-contrast colors in STYLES object

- [ ] **Step 1: Add imports**

At the top of `panel.ts`, add after existing imports:

```typescript
import { t } from "~lib/i18n"
import { icons } from "lucide"
```

- [ ] **Step 2: Create icon helper function**

Add after the imports section:

```typescript
/** Generate an SVG string from a Lucide icon name */
function icon(name: keyof typeof icons, size = 12, stroke = "currentColor"): string {
  const ic = icons[name]
  return ic ? ic.toSvg({ width: size, height: size, stroke, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }) : ""
}
```

- [ ] **Step 3: Fix STYLES colors**

In the STYLES object, apply these color replacements:

- All `color: #555` → `color: #999`
- All `color: #666` → `color: #aaa`
- All `color: #444` → `color: #888`
- All `color: #888` → `color: #bbb`

Specific changes in STYLES:
- `cardArrow`: `color: #555` → `color: #aaa`
- `removeBtn`: `color: #666` → `color: #bbb`
- `sendBtnDisabled`: `color: #444` → `color: #888`
- `clearBtn`: `color: #e74c3c` stays (intentional red)
- `emptyState`: `color: #555` → `color: #999`

- [ ] **Step 4: Replace icons in panel creation**

In `createPanel()`, replace:

Expand tab icon:
```typescript
expandTabEl.innerHTML = `<span style="color:#888;font-size:12px">&#9654;</span>`
```
→
```typescript
expandTabEl.innerHTML = `<span style="color:#bbb;font-size:12px;display:flex;align-items:center;justify-content:center">${icon("panelLeftOpen", 14)}</span>`
```

Header copy button SVG:
```typescript
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
```
→
```typescript
${icon("copy", 12)}
```

Header collapse button:
```typescript
<button style="${STYLES.collapseBtn}" id="dom-ctx-collapse-btn" title="Collapse">&#9664;</button>
```
→
```typescript
<button style="${STYLES.collapseBtn}" id="dom-ctx-collapse-btn" title="${t("panelCollapseTooltip")}">${icon("panelLeftClose", 12)}</button>
```

- [ ] **Step 5: Replace text strings in panel creation**

In `createPanel()`:

Header title:
```typescript
<span style="${STYLES.headerTitle}">DomLens</span>
```
→
```typescript
<span style="${STYLES.headerTitle}">${t("panelTitle")}</span>
```

Empty state:
```typescript
bodyEl.innerHTML = `<div style="${STYLES.emptyState}">No elements selected</div>`
```
→
```typescript
bodyEl.innerHTML = `<div style="${STYLES.emptyState}">${t("panelEmptyState")}</div>`
```

Prompt area:
```typescript
promptArea.innerHTML = `
  <textarea style="${STYLES.promptTextarea}" id="dom-ctx-prompt-input" placeholder="Describe what you want to fix or change..."></textarea>
  <button style="${STYLES.sendBtnDisabled}" id="dom-ctx-send-btn" disabled>Send</button>
  <button style="${STYLES.clearBtn}" id="dom-ctx-clear-btn">Clear All</button>
`
```
→
```typescript
promptArea.innerHTML = `
  <textarea style="${STYLES.promptTextarea}" id="dom-ctx-prompt-input" placeholder="${t("panelPromptPlaceholder")}"></textarea>
  <button style="${STYLES.sendBtnDisabled}" id="dom-ctx-send-btn" disabled>${t("panelSend")}</button>
  <button style="${STYLES.clearBtn}" id="dom-ctx-clear-btn">${t("panelClearAll")}</button>
`
```

- [ ] **Step 6: Replace text strings in updateCards()**

In `updateCards()`:

Empty state:
```typescript
bodyEl.innerHTML = `<div style="${STYLES.emptyState}">No elements selected</div>`
```
→
```typescript
bodyEl.innerHTML = `<div style="${STYLES.emptyState}">${t("panelEmptyState")}</div>`
```

Detail labels:
- "CSS Selector" → `${t("detailCssSelector")}`
- "XPath" → `${t("detailXpath")}`
- "Bounding Box" → `${t("detailBoundingBox")}`
- "Accessibility" → `${t("detailAccessibility")}`
- "Computed Styles" → `${t("detailComputedStyles")}`
- "HTML" → `${t("detailHtml")}`

Remove button:
```typescript
<button class="ctx-card-remove" data-id="${entry.id}" style="${STYLES.removeBtn}" title="Remove">&#10005;</button>
```
→
```typescript
<button class="ctx-card-remove" data-id="${entry.id}" style="${STYLES.removeBtn}" title="${t("panelRemoveTooltip")}">${icon("x", 12)}</button>
```

Card arrow:
```typescript
<span class="ctx-card-arrow" data-id="${entry.id}" style="${STYLES.cardArrow}">&#9660;</span>
```
→
```typescript
<span class="ctx-card-arrow" data-id="${entry.id}" style="${STYLES.cardArrow}">${icon("chevronDown", 10)}</span>
```

Description input:
```typescript
placeholder="Add description..."
```
→
```typescript
placeholder="${t("panelDescPlaceholder")}"
```

- [ ] **Step 7: Replace icons in event handlers**

In `rebindCardEvents()`, the card expand/collapse arrow toggle:
```typescript
if (arrow) arrow.innerHTML = isExpanded ? "&#9660;" : "&#9650;"
```
→
```typescript
if (arrow) arrow.innerHTML = isExpanded ? icon("chevronDown", 10) : icon("chevronUp", 10)
```

In `setupPromptSend()`, button text:
```typescript
sendBtn.textContent = "Sending..."
```
→
```typescript
sendBtn.textContent = t("panelSending")
```

```typescript
sendBtn.textContent = "Sent!"
```
→
```typescript
sendBtn.textContent = t("panelSent")
```

```typescript
sendBtn.textContent = "Send"
```
→
```typescript
sendBtn.textContent = t("panelSend")
```

```typescript
sendBtn.textContent = "Send to Claude Code"
```
→
```typescript
sendBtn.textContent = t("panelSendToClaude")
```

In `setupCopyButton()`, replace the SVG strings:
```typescript
copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4dabf7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
```
→
```typescript
copyBtn.innerHTML = icon("check", 12, "#4dabf7")
```

```typescript
copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
```
→
```typescript
copyBtn.innerHTML = icon("copy", 12)
```

- [ ] **Step 8: Replace strings in buildPanelPrompt()**

In `buildPanelPrompt()`:
- `"# DomLens - Element Selections\n"` → `t("elementSelections")`
- `## [${entry.label}] Element` → use `t("elementLabelSection", entry.label)` for section headers
- All label strings (Tag, CSS Selector, XPath, etc.) → use corresponding `t()` calls with substitutions
- Task section text → `t("taskSingle")` / `t("taskMultiple")`

- [ ] **Step 9: Commit**

```bash
git add packages/extension/src/lib/panel.ts
git commit -m "feat: add i18n, Lucide icons, and color fixes to floating panel"
```

---

### Task 6: Update Inline Prompt with i18n, Lucide Icons, and Color Fixes

**Files:**
- Modify: `packages/extension/src/lib/inline-prompt.ts`

- [ ] **Step 1: Add imports**

```typescript
import { t } from "~lib/i18n"
import { icons } from "lucide"
```

- [ ] **Step 2: Fix STYLES colors**

In the STYLES object:
- `closeBtn`: `color: #666` → `color: #bbb`
- `sendBtnDisabled`: `color: #444` → `color: #888`

- [ ] **Step 3: Replace hardcoded strings and icons**

In `createPrompt()`:

Textarea placeholder:
```typescript
textareaEl.placeholder = "Describe what you want to change..."
```
→
```typescript
textareaEl.placeholder = t("inlinePromptPlaceholder")
```

Close button:
```typescript
closeBtnEl.innerHTML = "&#10005;"
closeBtnEl.title = "Close"
```
→
```typescript
closeBtnEl.innerHTML = icons.x.toSvg({ width: 12, height: 12, stroke: "currentColor", "stroke-width": 2 })
closeBtnEl.title = t("inlinePromptClose")
```

Send button text:
```typescript
sendBtnEl.textContent = "Send"
```
→
```typescript
sendBtnEl.textContent = t("panelSend")
```

In `handleSend()`:
```typescript
sendBtnEl!.textContent = "Sending..."
```
→
```typescript
sendBtnEl!.textContent = t("panelSending")
```

```typescript
sendBtnEl!.textContent = "Sent!"
```
→
```typescript
sendBtnEl!.textContent = t("panelSent")
```

```typescript
sendBtnEl!.textContent = "Send"
```
→
```typescript
sendBtnEl!.textContent = t("panelSend")
```

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/lib/inline-prompt.ts
git commit -m "feat: add i18n, Lucide icons, and color fixes to inline prompt"
```

---

### Task 7: Update Overlay with Lucide Icons

**Files:**
- Modify: `packages/extension/src/lib/overlay.ts`

- [ ] **Step 1: Add import**

```typescript
import { icons } from "lucide"
```

- [ ] **Step 2: Replace delete button SVG**

In `showSelectedElementOverlay()`, replace:
```typescript
delBtn.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
```
With:
```typescript
delBtn.innerHTML = icons.x.toSvg({ width: 8, height: 8, stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" })
```

Also import `t` and replace:
```typescript
delBtn.title = "Remove selection"
```
With:
```typescript
delBtn.title = t("panelRemoveSelectionTooltip")
```

Add the import:
```typescript
import { t } from "~lib/i18n"
```

- [ ] **Step 3: Commit**

```bash
git add packages/extension/src/lib/overlay.ts
git commit -m "feat: add Lucide icon and i18n to overlay delete button"
```

---

### Task 8: Fix style.css Scrollbar Colors

**Files:**
- Modify: `packages/extension/src/style.css`

- [ ] **Step 1: Update scrollbar colors**

```css
::-webkit-scrollbar-track {
  background: #16213e;
}

::-webkit-scrollbar-thumb {
  background: #0f3460;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #1a5276;
}
```

These colors are already decent for contrast. No changes needed here — the scrollbar is a subtle UI element where high contrast would look jarring. Keep as-is.

- [ ] **Step 2: Commit (skip if no changes)**

No changes needed for style.css.

---

### Task 9: Build Verification

- [ ] **Step 1: Run build**

```bash
cd packages/extension && pnpm build
```

Expected: Build completes without errors.

- [ ] **Step 2: Verify _locales included**

Check that the build output contains `_locales/en/messages.json` and `_locales/zh_CN/messages.json`.

```bash
ls packages/extension/build/chrome-mv3-prod/_locales/
```

Expected: `en  zh_CN`

- [ ] **Step 3: Commit any build fixes if needed**

```bash
git add -A
git commit -m "fix: resolve build issues from i18n/icons migration"
```
