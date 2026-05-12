# DomLens Extension: i18n + Icons + Color Optimization

Date: 2026-05-12
Status: Approved

## Overview

Three improvements to the DomLens Chrome extension:
1. **i18n** — Internationalization with Chrome i18n API (Chinese + English, extensible)
2. **Icons** — Replace inline SVGs and HTML entities with Lucide Icons
3. **Color** — Improve contrast ratios for better readability on dark backgrounds

## 1. Internationalization (i18n)

### Architecture

- Use Chrome's native `chrome.i18n` API
- Translation files in `_locales/` directory
- Default language follows `chrome.i18n.getUILanguage()`
- Language switchable in Settings panel via dropdown

### File Structure

```
packages/extension/
  _locales/
    en/messages.json
    zh_CN/messages.json
```

### Message Format

```json
{
  "key": {
    "message": "English text",
    "description": "Context for translators"
  }
}
```

### Usage

- **Popup (React)**: `chrome.i18n.getMessage("key")`
- **Content Scripts (panel, inline-prompt)**: `chrome.i18n.getMessage("key")` — available in all extension contexts
- **Manifest fields**: Can use `__MSG_key__` syntax for localized manifest entries

### Key Strings to Translate

**Popup**:
- Title: "DomLens" / "Settings"
- Toggle: "Inspector ON" / "Inspector OFF"
- Status: "Offline", "N elements selected", "No elements selected"
- Buttons: "Copy Prompt", "Copied!"
- Settings labels: "Inspect Key", "Multi-select Key", "Require key to select", etc.
- Shortcut summary: "Activate", "Select", "Multi-select", "Clear"

**Panel (content script)**:
- Header: "DomLens"
- Empty state: "No elements selected"
- Buttons: "Send", "Clear All", "Sending...", "Sent!"
- Input placeholders: "Describe what you want to fix or change...", "Add description..."
- Detail labels: "CSS Selector", "XPath", "Bounding Box", "Accessibility", "Computed Styles", "HTML"
- Button titles: "Copy prompt", "Collapse", "Remove", "Remove selection"

**Inline Prompt (content script)**:
- Placeholder: "Describe what you want to change..."
- Buttons: "Send", "Sending...", "Sent!", "Close"

### Extensibility

Adding a new language requires only:
1. Create `_locales/<locale>/messages.json`
2. Add the locale option to the Settings dropdown

No code changes needed beyond the dropdown options list.

## 2. Lucide Icons

### Dependencies

```bash
pnpm add lucide-react   # For Popup (React components)
pnpm add lucide         # For content scripts (SVG string generation)
```

### Replacement Map

**Popup (`popup.tsx`)**:
| Current | Lucide Component |
|---------|-----------------|
| Settings SVG (gear icon) | `<Settings size={14} />` |
| Back arrow SVG | `<ArrowLeft size={14} />` |

**Panel (`panel.ts`)**:
| Current | Lucide Icon |
|---------|------------|
| Copy SVG | `icons.copy` |
| Collapse `&#9664;` | `icons.panelLeftClose` |
| Expand `&#9654;` | `icons.panelLeftOpen` |
| Remove `&#10005;` | `icons.x` |
| Card arrow `&#9660;` / `&#9650;` | `icons.chevronDown` / `icons.chevronUp` |

**Inline Prompt (`inline-prompt.ts`)**:
| Current | Lucide Icon |
|---------|------------|
| Close `&#10005;` | `icons.x` |

**Overlay (`overlay.ts`)**:
| Current | Lucide Icon |
|---------|------------|
| Delete SVG (X) | `icons.x` |

### Content Script Usage Pattern

```typescript
import { icons } from "lucide"

const svgString = icons.x.toSvg({
  width: 12,
  height: 12,
  stroke: "currentColor",
  "stroke-width": 2
})
element.innerHTML = svgString
```

## 3. Color Contrast Optimization

### Problem

Multiple text/icon colors have insufficient contrast against dark backgrounds (`#0f1629`, `#16213e`, `#1a1a2e`), making them hard to read.

### Solution

Follow WCAG AA standard (minimum 4.5:1 contrast ratio for normal text).

### Color Mapping

| Current | Contrast (on #0f1629) | New | Contrast (on #0f1629) | Usage |
|---------|----------------------|-----|----------------------|-------|
| `#444` | ~1.7:1 | `#888` | ~5.1:1 | Disabled text |
| `#555` | ~2.5:1 | `#999` | ~6.8:1 | Hint text, secondary text |
| `#666` | ~3.3:1 | `#aaa` | ~8.2:1 | Icons, auxiliary text |
| `#888` | ~5.1:1 | `#bbb` | ~9.8:1 | General icons, setting labels |
| `#aaa` | ~8.2:1 | (keep) | — | Primary text |
| `#ccc` | ~12.2:1 | (keep) | — | Labels |
| `#e0e0e0` | ~14:1 | (keep) | — | Headings |

### Files to Modify

- **`popup.tsx`**: Tailwind color classes (`text-[#555]` -> `text-[#999]`, etc.)
- **`panel.ts`**: STYLES object color values
- **`inline-prompt.ts`**: STYLES object color values
- **`overlay.ts`**: Delete button colors
- **`style.css`**: Scrollbar colors

## Implementation Order

1. Install dependencies (`lucide-react`, `lucide`)
2. Create `_locales/en/messages.json` and `_locales/zh_CN/messages.json`
3. Add i18n helper function for content scripts
4. Replace all hardcoded strings with `chrome.i18n.getMessage()` calls
5. Replace all SVGs/HTML entities with Lucide Icons
6. Apply color contrast optimizations
7. Add language selector to Settings panel
8. Test with both English and Chinese locales
