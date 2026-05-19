# roguecode

**Your AI agent's co-pilot — entertainment that moves with your workflow.**

A terminal supercharged for AI agents. Run Claude Code, aider, or any AI CLI tool in roguecode's real PTY terminal — and your entertainment flows with your agent's activity. When your agent works, things happen. When it pauses, entertainment pauses too.

## Concept

roguecode adds a dynamic entertainment layer on top of your AI agent workflow — without slowing you down. It's designed to make long coding sessions more engaging and keep you in flow.

**The mechanic:** Your agent's activity drives entertainment. Idle for 1.5 seconds? Entertainment pauses and you're locked out until work resumes. It's a gentle nudge to keep the momentum going.

## Features

### Core Terminal

- **Real PTY terminal** via `node-pty` — full xterm.js integration, no mocks
- **AI CLI ready** — run Claude Code, aider, or any CLI tool natively
- **Split-panel layout** — adjustable terminal + entertainment + stats
- **Dark theme** — designed for long sessions, ember orange accents

### AI Productivity

- **Activity-driven entertainment** — your agent's output keeps things moving
- **Status indicators** — STREAMING / IDLE_WAITING so you always know what's happening
- **Idle detection** — 1.5s timeout pauses entertainment, keeps you focused
- **Session memory** — progress saved locally, pick up where you left off

### Extras

- **Entertainment modes** — games, video, or just ambient visuals
- **Progress tracking** — stats and history of your work sessions
- **Talent system** — persistent upgrades that enhance your experience

## Requirements

- **Node.js** 20+ (for development)
- **Windows** 10/11, **macOS**, or **Linux**
- **npm** 9+

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd roguecode
npm install
```

### 2. Development Mode

```bash
# Start Vite dev server
npm run dev

# In another terminal, run Electron with dev server
npm run electron:dev

# Or specify custom URL
CODEQUEST_DEV_URL=http://localhost:5173 npm run electron
```

### 3. Production Build

```bash
# Build frontend
npm run build

# Package for Windows (portable exe)
npm run package:win
```

Output: `electron-release/roguecode-win32-x64/roguecode.exe`

## Project Structure

```
roguecode/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx                # Main application component
│   ├── styles.css             # Tailwind CSS + custom styles
│   ├── components/
│   │   ├── game/              # Entertainment UI components
│   │   │   ├── BattleStage.tsx    # Combat view
│   │   │   ├── ArenaStage.tsx     # Arena mode
│   │   │   ├── BrowserStage.tsx    # Stats/history
│   │   │   ├── CliTerminal.tsx     # PTY terminal wrapper
│   │   │   └── sidepanel/          # Side panels
│   │   └── ui/                 # UI primitives
│   └── game/
│       ├── store.ts           # Zustand state management
│       └── types.ts           # TypeScript types
├── electron/
│   └── main.cjs               # Electron main process
├── dist/client/                # Built frontend (do not edit)
└── electron-release/          # Packaged applications
```

## Architecture

### Frontend Stack
- **React 19** with hooks
- **Vite 7** for bundling
- **Tailwind CSS v4** with `@tailwindcss/vite` plugin
- **Zustand** for state management
- **TanStack Router** for routing (SPA mode)

### Electron Architecture
- Main process (`electron/main.cjs`) spawns PTY sessions
- Local HTTP server serves built frontend (avoids file:// CORS issues)
- IPC bridge for PTY communication with renderer

### Key Files

| File | Purpose |
|------|---------|
| `electron/main.cjs` | PTY spawning, HTTP server, IPC handlers |
| `src/game/store.ts` | Zustand store with state + sessions |
| `src/components/game/CliTerminal.tsx` | xterm.js integration |

## Package for Distribution

### Windows

```bash
npm run package:win
```

Produces: `electron-release/roguecode-win32-x64/roguecode.exe`

The Windows build is a **portable executable** — no installation required. Just double-click to run.

### Other Platforms

```bash
# macOS
npm run package:mac

# Linux
npm run package:linux
```

### Manual Packaging

If you need custom packaging:

1. Build: `npm run build`
2. Package with electron-packager or electron-builder
3. Include these native modules:
   - `node_modules/node-pty/`
   - `node_modules/nan/`

## Technical Notes

### Why local HTTP server?

Electron's `file://` protocol has CORS restrictions that break ES modules. The app runs a local HTTP server on a random port to serve the built frontend. This is an implementation detail — end users don't notice it.

### GPU errors in Windows

You may see these errors in Windows logs:
```
[roguecode] GPU process exited unexpectedly
[roguecode] Network service crashed
```

These are harmless. The app runs fine. Use `--disable-gpu` flag if needed.

### Idle Detection Logic

The PTY monitor tracks bytes per 400ms window. When AI output exceeds 80 bytes in a window and no user input for 1.5s, status changes to `STREAMING`. When AI stops for 1.5s, status changes to `IDLE_WAITING` and entertainment pauses.

### Debug Mode

Enable debug mode to run entertainment without requiring an active CLI session. Useful for testing UI changes.

## API Reference

### PTY IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `pty:spawn` | main→renderer | Start new PTY session |
| `pty:write` | renderer→main | Write to PTY |
| `pty:data` | main→renderer | PTY output |
| `pty:status` | main→renderer | Session status changes |
| `pty:kill` | renderer→main | Terminate session |

### Storage IPC

| Channel | Purpose |
|---------|---------|
| `storage:dir` | Get data directory path |
| `storage:list` | List saved sessions |
| `storage:read` | Load session data |
| `storage:write` | Save session data |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with adequate testing
4. Submit a pull request

## License

MIT License

---

**roguecode** — Work happily. Work productively.