# Local Runtime Server - 开发任务计划

## 1. 架构概述

Runtime 服务是一个本地 Node.js 进程，同时运行 Express HTTP 服务器和 MCP 服务器，共享内存中的上下文存储。

```
┌─────────────────┐     HTTP POST        ┌──────────────────────────┐
│ Chrome Extension │ ──────────────────> │    Local Runtime Server  │
│   Content Script │                     │    (port 3777)           │
│                  │                     │                          │
│  inspector.ts    │  chrome.runtime.     │  ┌────────────────────┐  │
│  compressor.ts   │  sendMessage        │  │  Express Server    │  │
│  collector.ts    │  ──────────────────> │  │  REST API          │  │
│                  │                     │  └────────┬───────────┘  │
└─────────────────┘                     │           │              │
                                        │  ┌────────▼───────────┐  │
┌─────────────────┐     stdio MCP       │  │  Context Store     │  │
│   Claude Code   │ ◄────────────────── │  │  (in-memory)       │  │
│                 │                     │  └────────▲───────────┘  │
│  MCP Tools:     │                     │           │              │
│  · get_context  │                     │  ┌────────┴───────────┐  │
│  · get_prompt   │                     │  │  MCP Server        │  │
│  · list_history │                     │  │  (stdio transport) │  │
└─────────────────┘                     │  └────────────────────┘  │
                                        └──────────────────────────┘
```

**关键设计决策**：
- 单进程：Express + MCP 在同一进程，共享 ContextStore
- 扩展 → 服务器：Content Script → Background → HTTP POST（绕过 CORS）
- Claude Code → 服务器：MCP stdio transport（标准 MCP 集成）
- 纯数据模块（prompt-builder.ts）可在扩展和服务端共享
- 浏览器 API 模块（collector.ts 等）仅在扩展端使用

## 2. 数据流

### 2.1 元素选中 → 服务器存储
```
1. 用户点击页面元素
2. inspector.ts 捕获 HTMLElement
3. inspector.ts 调用 compressor.ts → CompressedContext
4. inspector.ts 发送 ELEMENT_SELECTED (ElementInfo) 给 Popup（已有）
5. inspector.ts 发送 CONTEXT_CAPTURED (CompressedContext) 给 Background（新增）
6. Background 发送 HTTP POST /api/context 到本地服务器（新增）
7. 服务器存储到 ContextStore
```

### 2.2 Claude Code 查询上下文
```
1. Claude Code 调用 MCP tool: get_latest_context
2. MCP Server 从 ContextStore 获取最新 CompressedContext
3. 返回结构化 JSON 给 Claude Code
4. Claude Code 基于上下文进行代码分析和修复建议
```

## 3. 技术选型

| 组件 | 技术选择 | 说明 |
|------|----------|------|
| HTTP 服务器 | Express | 成熟稳定，中间件生态丰富 |
| MCP SDK | @modelcontextprotocol/sdk | 官方 MCP SDK |
| TypeScript 运行 | tsx | 直接运行 TS，无需预编译 |
| 唯一 ID | crypto.randomUUID() | Node.js 内置，无需额外依赖 |
| CORS | cors 中间件 | 虽然主要走 Background 中转，保留备用 |
| 端口 | 3777 | 易记，冲突概率低 |

### 依赖清单
```json
{
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17"
  }
}
```

## 4. 文件结构

```
src/server/
├── index.ts          # 入口：启动 Express + MCP，优雅退出
├── express.ts        # Express 服务器 + REST API 路由（已有占位）
├── mcp.ts            # MCP 服务器 + tool 定义（已有占位）
├── store.ts          # 内存上下文存储（新增）
└── prompt.ts         # 服务端 prompt 构建辅助（已有占位）
```

## 5. MCP Tools 定义

| Tool 名称 | 描述 | 输入 | 输出 |
|-----------|------|------|------|
| `get_latest_context` | 获取最新的 DOM 上下文 | 无 | CompressedContext JSON |
| `get_prompt` | 获取最新上下文的 Markdown 提示词 | 无 | Markdown 字符串 |
| `list_contexts` | 列出所有存储的上下文历史 | `{ limit?: number }` | ContextEntry[] |
| `clear_contexts` | 清除所有存储的上下文 | 无 | `{ success: boolean }` |

## 6. REST API 端点

| 方法 | 路径 | 描述 | 请求体/参数 |
|------|------|------|-------------|
| POST | /api/context | 接收扩展发来的上下文 | CompressedContext + metadata |
| GET | /api/context/latest | 获取最新上下文 | - |
| GET | /api/contexts | 列出所有上下文 | ?limit=N |
| DELETE | /api/contexts | 清除所有上下文 | - |
| GET | /api/health | 健康检查 | - |

## 7. 任务列表

### Phase 1: 基础设施

**Task 1: 项目基础设施与依赖安装**
- 安装 express, cors, @modelcontextprotocol/sdk, tsx 及类型定义
- 在 package.json 添加 scripts: `runtime:start`, `runtime:dev`
- 确认 Plasmo 构建不会打包 server/ 目录代码
- **涉及文件**: package.json, tsconfig.json

**Task 2: 服务端类型定义**
- 在 shared/types.ts 中扩展服务端需要的类型
- 定义 ContextEntry（存储条目）、ApiResponse（REST 响应）、ServerConfig
- 定义扩展 → 服务器消息协议（CONTEXT_CAPTURED 消息类型）
- **涉及文件**: src/shared/types.ts

**Task 3: 上下文存储模块**
- 实现 src/server/store.ts
- ContextStore 类：内存存储，保留最近 20 条记录
- 方法：add(), getLatest(), getById(), list(), clear()
- 每条记录包含：id, timestamp, url, context (CompressedContext)
- **涉及文件**: src/server/store.ts（新建）

### Phase 2: HTTP 服务器

**Task 4: Express REST API**
- 实现 src/server/express.ts
- POST /api/context - 接收并存储上下文（验证数据格式）
- GET /api/context/latest - 返回最新上下文
- GET /api/contexts - 列出历史（支持 ?limit=N）
- DELETE /api/contexts - 清空
- GET /api/health - 健康检查
- CORS、JSON 解析、错误处理中间件
- **涉及文件**: src/server/express.ts

**Task 5: 服务器入口与启动流程**
- 实现 src/server/index.ts
- 启动 Express（端口 3777，支持 PORT 环境变量覆盖）
- 启动 MCP Server（stdio transport）
- 优雅退出处理（SIGINT, SIGTERM）
- 启动日志输出
- **涉及文件**: src/server/index.ts（新建）

### Phase 3: 插件联动

**Task 6: 内容脚本上下文推送**
- 修改 inspector.ts：元素点击时调用 compressor.ts 生成 CompressedContext
- 新增消息类型 CONTEXT_CAPTURED 发送给 Background
- 修改 background/index.ts：接收 CONTEXT_CAPTURED 并通过 HTTP POST 转发到服务器
- 添加服务器连接失败的静默处理（console.warn）
- **涉及文件**: src/lib/inspector.ts, src/background/index.ts

**Task 7: Popup UI 服务器集成**
- 添加服务器连接状态指示器（绿色/红色圆点）
- 添加"Send to Runtime"按钮（手动触发发送最新上下文）
- 修改 Popup 在收到 ELEMENT_SELECTED 时自动触发上下文推送
- 服务器离线时显示提示
- **涉及文件**: src/popup.tsx, src/store/index.ts

### Phase 4: MCP 服务器

**Task 8: MCP 服务器实现**
- 实现 src/server/mcp.ts
- stdio transport 连接
- 定义 4 个 MCP tools：get_latest_context, get_prompt, list_contexts, clear_contexts
- 每个 tool 的 input schema 和 handler 实现
- 连接共享的 ContextStore
- **涉及文件**: src/server/mcp.ts

**Task 9: Claude Code MCP 配置**
- 在项目根目录创建 .mcp.json 配置文件
- 配置 Claude Code 启动 runtime server 进程
- 验证 Claude Code 能发现并调用 MCP tools
- **涉及文件**: .mcp.json（新建）

### Phase 5: 集成测试

**Task 10: 端到端集成验证**
- 启动 runtime server
- 构建扩展并加载到 Chrome
- 验证：选中元素 → 上下文推送到服务器 → MCP tool 返回正确数据
- 验证：Claude Code 通过 MCP 获取上下文并生成修复建议
- 验证错误场景：服务器离线、无效数据、网络中断
- **涉及文件**: 所有相关文件

## 8. 注意事项

1. **浏览器 API 隔离**：collector.ts 使用了 `window.getComputedStyle()` 等 API，不能在服务端导入。服务端仅使用 types.ts（类型）、constants.ts（常量）、prompt-builder.ts（纯函数）
2. **Plasmo 构建隔离**：server/ 目录不应被 Plasmo 打包。确保扩展代码不 import server/ 下的模块
3. **消息通道**：扩展 → 服务器必须经过 Background 中转（Content Script 受 CORS 限制）
4. **错误容忍**：服务器离线时扩展应静默失败，不影响核心检查功能
5. **内存管理**：ContextStore 限制历史条目数量，防止内存泄漏
