# DomLens

AI 驱动的浏览器 DOM 检查与上下文桥接工具，将页面运行时上下文直接同步给 Claude Code。

## 工作原理

```
Browser Extension (元素选择)
    ↓  上下文捕获
Runtime Server (本地桥接)
    ↓  MCP 协议
Claude Code (理解页面 → 修改源码)
    ↓  HMR
Browser (自动刷新)
```

## 架构

本项目为 pnpm monorepo，包含三个包：

| 包 | 说明 |
|---|---|
| `packages/extension` | Chrome 扩展 — 页面元素选择、上下文捕获、浮窗面板 |
| `packages/runtime` | 本地 Runtime Server — HTTP API + MCP Server，桥接扩展与 AI |
| `packages/website` | 文档网站 (Next.js) |

## 功能

### 元素选择

- **按住 Alt 不放** 进入检查模式，点击选中元素
- **Ctrl + Alt + 点击** 多选模式，可连续选中多个元素
- **Esc** 移除最后一个选中 / 清空全部
- 每个选中元素自动标注标签（A、B、C...），带颜色区分
- 选中后自动提取：CSS 选择器、XPath、无障碍信息、计算样式、HTML 源码、React/Vue 组件名及源码位置

### 浮窗面板

- 页面右下角浮动面板，实时展示所有选中元素
- 每张卡片可展开查看详细信息（样式、HTML、布局链等）
- 内置 Prompt 输入框，直接发送上下文 + 问题到 Runtime Server
- 支持拖拽、折叠、单独删除元素

### Popup 弹窗

- 开关检查模式
- 展示所有选中元素卡片（与浮窗效果一致）
- 支持展开查看详情、单独删除
- 一键复制 Markdown 格式的 Prompt

### Runtime Server

- 本地 HTTP API（端口 4777-4787 自动发现）
- MCP Server（stdio 传输），提供 6 个工具给 Claude Code：
  - `get_latest_context` — 获取最新捕获的 DOM 上下文
  - `get_prompt` — 生成 Markdown 格式的 Prompt
  - `list_contexts` — 列出历史上下文记录
  - `clear_contexts` — 清空历史记录
  - `get_user_prompt` — 获取用户在面板中输入的 Prompt
  - `apply_runtime_patch` — 通知浏览器刷新

### 其他

- React / Vue 组件名与源码位置自动识别
- Shadow DOM 隔离，不影响页面样式
- 内联 Prompt 提示（选中元素旁显示）
- 快捷键可自定义（Alt / Shift / Ctrl + Ctrl / Cmd）
- 中英文国际化

## 快速开始

### 用户安装（推荐）

在 Claude Code 中直接发送：

```
安装 DomLens MCP：
https://domlens.com/install/mcp-install.md
```

AI 会自动读取安装文档并完成配置，无需手动编辑任何文件。

### 开发

```bash
# 克隆项目
git clone <repo-url>
cd claude-dom-context

# 安装依赖
pnpm install

# 启动扩展开发模式（热重载）
pnpm dev:extension

# 启动 Runtime Server（开发模式）
pnpm dev:runtime

# 启动文档网站
pnpm dev:website
```

### 构建

```bash
# 构建所有（Runtime + 扩展 + 网站）
pnpm build

# 单独构建
pnpm build:runtime    # 产物: packages/runtime/dist/index.js
pnpm build:extension  # 产物: packages/extension/build/chrome-mv3-prod/
```

扩展在 Chrome 的 `chrome://extensions` 页面加载已解压的扩展即可。

### 手动配置 MCP（可选）

如果不想使用自动安装，也可以手动添加到 `~/.claude/settings.json`：

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

### 发布 Runtime（维护者）

```bash
cd packages/runtime
pnpm build
npm publish --access public
```

## 快捷键

| 操作 | 快捷键 | 可自定义 |
|---|---|---|
| 激活检查模式 | 按住 Alt（需持续按住 150ms） | Alt / Shift / Ctrl |
| 选中元素 | Alt + 点击 | - |
| 多选元素 | Ctrl + Alt + 点击 | 组合键可配置 |
| 取消选中 | 点击已选中的元素 | - |
| 清空全部 | Esc（单选时） | - |
| 移除单个 | Esc（多选时，鼠标悬停在目标上） | - |

## 技术栈

- **扩展**: Plasmo (React + TypeScript), Tailwind CSS, Shadow DOM, Lucide Icons
- **Runtime**: Express, @modelcontextprotocol/sdk, Zod
- **网站**: Next.js
- **构建**: pnpm workspaces, tsup, Plasmo bundler

## 项目结构

```
claude-dom-context/
├── packages/
│   ├── extension/          # Chrome 扩展
│   │   ├── src/
│   │   │   ├── background/     # Service Worker (消息路由)
│   │   │   ├── contents/       # Content Scripts
│   │   │   ├── lib/            # 核心模块
│   │   │   │   ├── inspector.ts    # 检查器（键盘/鼠标事件）
│   │   │   │   ├── panel.ts        # 浮窗面板
│   │   │   │   ├── overlay.ts      # 高亮覆盖层
│   │   │   │   ├── compressor.ts   # 上下文压缩
│   │   │   │   ├── selector.ts     # CSS选择器/XPath生成
│   │   │   │   ├── layout.ts       # 布局链分析
│   │   │   │   ├── analyzer.ts     # 约束问题检测
│   │   │   │   ├── framework-bridge.ts  # React/Vue组件识别
│   │   │   │   ├── shadow-host.ts  # Shadow DOM 容器
│   │   │   │   ├── i18n.ts         # 国际化
│   │   │   │   └── inline-prompt.ts # 内联提示
│   │   │   ├── popup.tsx       # Popup 弹窗
│   │   │   ├── store/          # Zustand 状态管理
│   │   │   └── shared/         # 共享类型与常量
│   │   └── package.json
│   ├── runtime/            # Runtime Server
│   │   ├── src/
│   │   │   ├── index.ts         # 入口（HTTP + MCP）
│   │   │   ├── express.ts       # REST API
│   │   │   ├── mcp.ts           # MCP Server
│   │   │   ├── prompt-builder.ts # Prompt 生成
│   │   │   ├── store.ts         # 内存存储
│   │   │   └── types.ts         # 类型定义
│   │   └── package.json
│   └── website/            # 文档网站
│       └── package.json
├── docs/                   # 设计文档
├── pnpm-workspace.yaml
└── package.json
```

## License

MIT
