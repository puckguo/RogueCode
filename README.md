# roguecode

A roguelike card game **paced by your AI coding agent**. Spawn `claude`, `aider`, or any CLI inside roguecode's real PTY terminal — while the AI streams tokens, the battle advances; when the AI goes idle, the game freezes and forces you back to the terminal.

## Concept

roguecode turns coding sessions into roguelike runs. Your AI coding assistant (Claude Code, aider, etc.) becomes the combat engine — every keystroke advances the battle, every idle moment lets the monsters attack. The longer your AI works without stopping, the stronger your build becomes.

**Key insight:** An AI that outputs code rapidly is a "hot streak" — the game rewards this with bonus damage, energy, and combo multipliers. When the AI goes idle (1.5 seconds without output), combat pauses and you're locked out of the game until the AI starts coding again.

## Game Modes

- **Cards Mode**: Classic Slay the Spire-style deckbuilding — draw cards, manage energy, build combos
- **Arena Mode**: Endless survival against waves of enemies
- **Browser Mode**: View game stats and history

## Features

### Core Mechanics
- **Real PTY terminal** via `node-pty` — full xterm.js integration, not mocked
- **AI idle detection** — 1.5 second timeout freezes the game
- **STREAMING/IDLE_WAITING status** — visual feedback showing AI activity

### Combat System
- Energy-based card play (3 energy per turn)
- Draw/discard mechanics with deck manipulation
- Block stacking with armor mechanics
- Critical hit system with combo multipliers
- Buff/debuff tracking

### Progression
- **Diablo-style loot**: 5 tiers (Common → Legendary) with random affixes
- **Grim Dawn talent tree**: Persistent upgrades saved to localStorage
- **Boss fights**: Every 5 waves
- **Elite enemies**: Every 3 waves

### UI/UX
- Resizable split panels (CLI + game + stats)
- Dark ARPG theme with ember orange accents
- Collapse CLI to narrow/game/full modes
- Maximize game stage option
- Debug mode (run game without CLI requirement)

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
│   │   ├── game/              # Game UI components
│   │   │   ├── BattleStage.tsx    # Card combat view
│   │   │   ├── ArenaStage.tsx     # Arena mode view
│   │   │   ├── BrowserStage.tsx    # Stats/history view
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
| `src/game/store.ts` | Zustand store with game state + sessions |
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

The PTY monitor tracks bytes per 400ms window. When AI output exceeds 80 bytes in a window and no user input for 1.5s, status changes to `STREAMING`. When AI stops for 1.5s, status changes to `IDLE_WAITING` and game pauses.

### Debug Mode

Enable debug mode to run the game without requiring an active CLI session. Useful for testing UI changes.

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
| `storage:list` | List saved games |
| `storage:read` | Load game data |
| `storage:write` | Save game data |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with adequate testing
4. Submit a pull request

## License

MIT License

---

**roguecode** — Where your AI coding streak becomes your combat power.