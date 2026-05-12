# DomLens - 开发任务计划

## 项目目标

MVP 第一版：用户点击网页元素 → 自动生成 AI Context → 一键复制

## 技术栈

- Plasmo (Chrome Extension Manifest V3)
- React + TypeScript + Tailwind + Zustand

## 任务依赖图

```
[11] 共享类型和常量
  │
  ▼
[2] 初始化 Plasmo 项目骨架
  │
  ├──────────────┬──────────────┬──────────────┬──────────────┐
  ▼              ▼              ▼              ▼              ▼
[6] Inspector  [5] Collector  [4] Layout    [9] React     [10] Background
  │              │              │              │              │
  └──────┬───────┴──────┬───────┘              │              │
         │              │                      │              │
         ▼              ▼                      ▼              │
      [1] Constraint Detector ◄───────────────┘              │
         │                                                    │
         ▼                                                    │
      [7] Context Compression Engine                          │
         │                                                    │
         ▼                                                    │
      [8] Prompt Builder Engine                               │
         │                                                    │
         └──────────────────┬─────────────────────────────────┘
                            ▼
                      [3] Popup UI + 复制
                            │
                            ▼
                      [12] 集成测试
```

## 任务详情

### Task #11: 定义共享类型和常量
- **文件**: `src/shared/types.ts`, `src/shared/constants.ts`
- **内容**:
  - TypeScript 类型定义: ElementInfo, BoxModel, ComputedStyle, VisibilityInfo, LayoutNode, ReactInfo, ConstraintIssue, CompressedContext
  - 常量: IMPORTANT_STYLES 数组, OVERLAY_STYLES, 安全过滤选择器
- **依赖**: 无

### Task #2: 初始化 Plasmo 项目骨架
- **文件**: 项目根目录配置
- **内容**:
  - Plasmo 初始化 (npm create plasmo)
  - 配置 TypeScript, React, Tailwind, Zustand
  - 创建目录结构: src/content/, src/background/, src/popup/, src/server/, src/shared/
  - Manifest V3 配置 (permissions: activeTab, clipboardWrite)
- **依赖**: #11

### Task #6: 实现元素选择器（Inspector）
- **文件**: `src/content/inspector.ts`, `src/content/overlay.ts`
- **核心逻辑**:
  - mousemove → elementFromPoint → overlay 高亮
  - click → 选中元素 → 触发数据采集
  - overlay: position:fixed, pointer-events:none, 2px solid #00ffff
- **性能**: mousemove 仅轻量检测, click 才深度分析
- **依赖**: #2

### Task #5: 实现 Runtime Data Collector
- **文件**: `src/content/collector.ts`
- **采集数据**:
  1. 基础信息: tagName, className, id, innerText
  2. Box Model: getBoundingClientRect()
  3. 关键 Computed Style: display/position/flex/overflow 等 17 个字段
  4. 可见性: hidden/clipped/opacity/visibility
- **安全**: 过滤 input[type=password], token 敏感字段
- **依赖**: #2

### Task #4: 实现 Layout Chain Analyzer
- **文件**: `src/content/layout.ts`
- **逻辑**: 递归 el.parentElement → document.body
- **过滤**: 只保留 display:flex/grid, overflow:hidden, position:absolute, transform 等
- **输出**: layoutChain 数组
- **依赖**: #2

### Task #9: 实现 React Fiber Analyzer
- **文件**: `src/content/react.ts`
- **逻辑**: 通过 __reactFiber$ 获取 Fiber → 提取 componentName/props/stateNode
- **扩展**: 预留 Vue __vueParentComponent 接口
- **依赖**: #2

### Task #1: 实现 Constraint Detector
- **文件**: `src/content/analyzer.ts`
- **规则**:
  1. Flex Shrink: parent:flex + child:flexShrink!=0
  2. Overflow Clip: overflow:hidden + child.width>parent.width
  3. Absolute Context: position:absolute + ancestor 无 relative
- **输出**: possibleIssues 数组
- **依赖**: #2

### Task #7: 实现 Context Compression Engine
- **逻辑**: 整合 Collector + Layout + Fiber + Detector → 结构化 JSON
- **输出**: { selectedElement, layoutChain, possibleIssues }
- **禁止**: 直接发送 outerHTML
- **依赖**: #5, #4, #9, #1

### Task #8: 实现 Prompt Builder Engine
- **逻辑**: 结构化 JSON → Markdown Prompt
- **模板**: Selected Component / Element Info / Layout Context / Possible Issues / Task
- **依赖**: #7

### Task #10: 实现 Background Service Worker
- **文件**: `src/background/index.ts`
- **职责**: 消息中继, Inspector 状态管理, 扩展图标事件, MCP 预留
- **依赖**: #2

### Task #3: 实现 Popup UI 和复制功能
- **文件**: `src/popup/`
- **功能**: Inspector 开关, 元素信息显示, 复制 Prompt 按钮
- **状态**: Zustand
- **依赖**: #8, #10

### Task #12: 集成测试
- **范围**: 全流程验证
- **测试项**: hover/click, 数据完整性, React Fiber, 规则匹配, Prompt 质量, 剪贴板
- **依赖**: #3

## 执行顺序

```
Phase 1 (基础): #11 → #2
Phase 2 (核心模块 - 可并行): #6, #5, #4, #9, #1, #10
Phase 3 (整合): #7 → #8
Phase 4 (UI): #3
Phase 5 (验证): #12
```
