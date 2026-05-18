# roguecode

**Your AI agent's co-pilot — entertainment that moves with your workflow.**

让 AI 编程变成一场闯关。roguecode 是一个集成游戏化激励系统的终端——在你的 AI CLI（Claude Code、aider 或任何 CLI 工具）中运行它，看着它变成街机游戏。你的编码活动驱动游戏进行；休息一下，游戏就等你。

## 概念

roguecode 是一个以终端为核心的工具，在你的 AI agent 工作流上叠加了一层娱乐层。你的 AI agent 不再只是工作——它协调娱乐与你的活动同步进行。

**机制很简单：** 当 agent 活跃工作时，娱乐进行。当它空闲 1.5 秒，娱乐暂停，你被锁在外面直到它恢复工作。

这不是为了娱乐——而是让你的工作过程更有动力。

## 功能特性

### 核心终端

- **真实 PTY 终端** via `node-pty` — 完整的 xterm.js 集成，非模拟
- **无缝 AI CLI 集成** — 运行 Claude Code、aider 或任何 CLI 工具
- **分割面板 UI** — 可调节的终端 + 游戏 + 统计布局
- **深色 ARPG 主题** — 火焰橙强调色，为长时间工作 sessions 设计

### 游戏化激励层

- **AI 活动驱动游戏** — token 流式输出推进战斗
- **热 streak 系统** — AI 快速输出奖励额外伤害、能量、连击
- **Idle 锁定机制** — AI 空闲 1.5 秒冻结游戏，必须恢复编码才能解锁
- **可视化状态反馈** — STREAMING / IDLE_WAITING 状态指示

### 成长系统

- **暗黑破坏神风格掉落** — 5 个等级（普通 → 传说），随机词缀
- **Grim Dawn 天赋树** — 持久升级，保存到 localStorage
- **Boss 战斗** — 每 5 波 / **精英敌人** — 每 3 波
- **多种游戏模式** — 卡牌（牌组构建）、竞技场（生存）、浏览器（统计）

## 系统要求

- **Node.js** 20+（用于开发）
- **Windows** 10/11、**macOS** 或 **Linux**
- **npm** 9+

## 快速开始

### 1. 克隆并安装

```bash
git clone <repository-url>
cd roguecode
npm install
```

### 2. 开发模式

```bash
# 启动 Vite 开发服务器
npm run dev

# 在另一个终端中，用开发服务器运行 Electron
npm run electron:dev

# 或指定自定义 URL
CODEQUEST_DEV_URL=http://localhost:5173 npm run electron
```

### 3. 生产构建

```bash
# 构建前端
npm run build

# 打包为 Windows 便携版
npm run package:win
```

输出：`electron-release/roguecode-win32-x64/roguecode.exe`

## 项目结构

```
roguecode/
├── src/
│   ├── main.tsx              # React 入口点
│   ├── App.tsx                # 主应用组件
│   ├── styles.css             # Tailwind CSS + 自定义样式
│   ├── components/
│   │   ├── game/              # 游戏 UI 组件
│   │   │   ├── BattleStage.tsx    # 卡牌战斗视图
│   │   │   ├── ArenaStage.tsx     # 竞技场模式视图
│   │   │   ├── BrowserStage.tsx    # 统计/历史视图
│   │   │   ├── CliTerminal.tsx     # PTY 终端封装
│   │   │   └── sidepanel/          # 侧边面板
│   │   └── ui/                 # UI 原语组件
│   └── game/
│       ├── store.ts           # Zustand 状态管理
│       └── types.ts           # TypeScript 类型定义
├── electron/
│   └── main.cjs               # Electron 主进程
├── dist/client/                # 构建后的前端（勿编辑）
└── electron-release/          # 打包后的应用
```

## 架构

### 前端技术栈
- **React 19** 搭配 hooks
- **Vite 7** 用于打包
- **Tailwind CSS v4** 配合 `@tailwindcss/vite` 插件
- **Zustand** 状态管理
- **TanStack Router** 路由（SPA 模式）

### Electron 架构
- 主进程（`electron/main.cjs`）生成 PTY 会话
- 本地 HTTP 服务器提供构建后的前端（避免 file:// CORS 问题）
- PTY 与渲染器通信的 IPC 桥接

### 关键文件

| 文件 | 用途 |
|------|---------|
| `electron/main.cjs` | PTY 生成、HTTP 服务器、IPC 处理器 |
| `src/game/store.ts` | Zustand 存储游戏状态 + 会话 |
| `src/components/game/CliTerminal.tsx` | xterm.js 集成 |

## 打包分发

### Windows

```bash
npm run package:win
```

产出：`electron-release/roguecode-win32-x64/roguecode.exe`

Windows 构建为**便携式可执行文件**——无需安装，双击即运行。

### 其他平台

```bash
# macOS
npm run package:mac

# Linux
npm run package:linux
```

### 手动打包

如需自定义打包：

1. 构建：`npm run build`
2. 使用 electron-packager 或 electron-builder 打包
3. 包含这些原生模块：
   - `node_modules/node-pty/`
   - `node_modules/nan/`

## 技术说明

### 为什么使用本地 HTTP 服务器？

Electron 的 `file://` 协议有 CORS 限制，会破坏 ES 模块。应用在随机端口上运行本地 HTTP 服务器来提供构建后的前端。这是一个实现细节——最终用户不会注意到。

### Windows GPU 错误

你可能在 Windows 日志中看到这些错误：
```
[roguecode] GPU process exited unexpectedly
[roguecode] Network service crashed
```

这些是无害的。应用运行正常。如需可使用 `--disable-gpu` 标志。

### 空闲检测逻辑

PTY 监控器追踪每 400ms 窗口的字节数。当 AI 输出超过 80 字节且用户无输入 1.5s 时，状态变为 `STREAMING`。当 AI 停止 1.5s，状态变为 `IDLE_WAITING` 且游戏暂停。

### 调试模式

启用调试模式可在无需活跃 CLI 会话的情况下运行游戏。用于测试 UI 更改。

## API 参考

### PTY IPC 通道

| 通道 | 方向 | 用途 |
|---------|-----------|---------|
| `pty:spawn` | main→renderer | 启动新 PTY 会话 |
| `pty:write` | renderer→main | 写入 PTY |
| `pty:data` | main→renderer | PTY 输出 |
| `pty:status` | main→renderer | 会话状态变更 |
| `pty:kill` | renderer→main | 终止会话 |

### 存储 IPC

| 通道 | 用途 |
|---------|---------|
| `storage:dir` | 获取数据目录路径 |
| `storage:list` | 列出已保存游戏 |
| `storage:read` | 加载游戏数据 |
| `storage:write` | 保存游戏数据 |

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行变更并充分测试
4. 提交 pull request

## 许可证

MIT 许可证

---

**roguecode** — 快乐工作，高效工作。
