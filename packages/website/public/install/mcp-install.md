# DomLens MCP Server Installation Guide

## Instructions for AI Agents

Follow these steps to configure DomLens MCP Server for the user.

---

## Step 1: Verify Environment

Run the following command to check the Node.js version (requires >= 18):

```bash
node -v
```

If Node.js is not installed or the version is too low, prompt the user to install it first.

## Step 2: Write MCP Configuration

Write the following configuration to the user's Claude Code MCP settings file.

**Configuration**:

```json
{
  "mcpServers": {
    "domlens": {
      "command": "npx",
      "args": ["-y", "@domlens/runtime"],
      "type": "stdio"
    }
  }
}
```

**How to write** (try in order of priority):

1. Read the user's existing `~/.claude/settings.json` (global config), merge the `mcpServers` field with the above configuration (keep the user's existing MCP Servers, only add or update the `domlens` entry), then write back.
2. If the file does not exist or reading fails, create the file with the full content:

```json
{
  "mcpServers": {
    "domlens": {
      "command": "npx",
      "args": ["-y", "@domlens/runtime"],
      "type": "stdio"
    }
  }
}
```

**Note**: Do not overwrite the user's existing MCP Server configurations. Only merge the `domlens` entry.

## Step 3: Install Chrome Extension

Prompt the user to install the DomLens Chrome extension:

- Chrome Web Store link (to be filled after publication)
- Or build from source: `pnpm build:extension`, then load `packages/extension/build/chrome-mv3-prod/` in `chrome://extensions`

## Step 4: Verify Installation

1. Prompt the user to restart their Claude Code session (MCP configuration requires a reload)
2. After restarting, check that the `domlens` MCP Server is available
3. Hold Alt + click to select a page element in the browser
4. Call the `get_latest_context` tool to verify that context is captured successfully

---

## Available Tools

After successful installation, the following tools are available:

| Tool | Description |
|---|---|
| `get_latest_context` | Get the latest captured DOM context |
| `get_prompt` | Generate a complete Markdown prompt |
| `list_contexts` | List historical context records |
| `clear_contexts` | Clear history |
| `get_user_prompt` | Get the prompt entered by the user in the panel |
| `apply_runtime_patch` | Notify the browser to refresh (after source code changes) |

## Uninstall

Remove the `domlens` entry from `mcpServers` in `~/.claude/settings.json`.
