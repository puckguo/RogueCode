# CodeQuest

A roguelike card game **paced by your AI coding agent**. Spawn `claude`, `aider`, or any CLI inside CodeQuest's PTY — while the AI streams tokens, the battle advances; when the AI goes idle waiting for you, the game freezes and forces you back to the terminal.

## Features
- **Real PTY (not mocked)** via `node-pty`, full xterm.js terminal embedded in the app
- **Idle detection**: 1.5s without output → `IDLE_WAITING` → game pauses
- Roguelike card combat: energy, hand, draw/discard, buffs, block, crits
- Diablo-style 5-tier loot with affixes; equip / salvage to ether shards
- Grim Dawn-style persistent talent tree (saves to `localStorage`)
- Boss every 5 waves; elites every 3

## Run as a desktop app

```bash
# 1. install
npm install

# 2. native module rebuild (node-pty against Electron's Node ABI)
npm run rebuild

# 3. dev: terminal A
npm run dev
#    terminal B
npm run electron:dev
```

## Package

```bash
npm run package:linux   # → electron-release/CodeQuest-linux-x64/
npm run package:mac
npm run package:win
```

> Browser preview cannot spawn local processes. To play with a real `claude` CLI you must run the Electron build above.
