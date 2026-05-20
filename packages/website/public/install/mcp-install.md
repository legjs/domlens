# DomLens MCP Server 安装指南

## 给 AI 的指令

请按照以下步骤为用户配置 DomLens MCP Server。

---

## 第 1 步：确认环境

运行以下命令检查 Node.js 版本（需要 >= 18）：

```bash
node -v
```

如果未安装或版本过低，提示用户先安装 Node.js。

## 第 2 步：写入 MCP 配置

将以下配置写入用户的 Claude Code MCP 设置文件。

**配置内容**：

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

**写入方式**（按优先级尝试）：

1. 读取用户已有的 `~/.claude/settings.json`（全局配置），将其中的 `mcpServers` 字段与上面的配置合并（保留用户已有的 MCP Server，只添加或更新 `domlens` 这一项），然后写回。
2. 如果文件不存在或读取失败，创建文件并写入完整内容：

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

**注意**：不要覆盖用户已有的其他 MCP Server 配置，只合并 `domlens` 这一项。

## 第 3 步：安装 Chrome 扩展

提示用户安装 DomLens Chrome 扩展：

- Chrome Web Store 链接（发布后填写）
- 或从源码构建：`pnpm build:extension`，然后在 `chrome://extensions` 加载 `packages/extension/build/chrome-mv3-prod/`

## 第 4 步：验证安装

1. 提示用户重启 Claude Code 会话（MCP 配置需要重新加载）
2. 重启后，检查 `domlens` MCP Server 是否可用
3. 在浏览器中按住 Alt + 点击选中一个页面元素
4. 调用 `get_latest_context` 工具验证上下文是否成功捕获

---

## 可用工具

安装成功后，以下工具可用：

| 工具 | 说明 |
|---|---|
| `get_latest_context` | 获取最新捕获的 DOM 上下文 |
| `get_prompt` | 生成完整的 Markdown Prompt |
| `list_contexts` | 列出历史上下文记录 |
| `clear_contexts` | 清空历史记录 |
| `get_user_prompt` | 获取用户在面板中输入的 Prompt |
| `apply_runtime_patch` | 通知浏览器刷新（源码修改后） |

## 卸载

从 `~/.claude/settings.json` 的 `mcpServers` 中删除 `domlens` 条目即可。
