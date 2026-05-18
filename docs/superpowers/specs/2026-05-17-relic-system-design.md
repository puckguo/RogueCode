# Relic System Design — 2026-05-17

## Overview

Add a **Relic** system to Cards Mode. Relics are passive global buffs that drop independently from equipment and persist across the run. They stack additively — the more relics you collect, the stronger your build becomes.

---

## 1. Data Model

### Relic Types

```typescript
export type RelicRarity = "common" | "rare" | "legendary";

export type RelicEffect = {
  atk?: number;
  hp?: number;
  crit?: number;
  energy?: number;        // bonus energy per turn
  blockBonus?: number;    // bonus block at turn start
  lifesteal?: number;
  dropBonus?: number;
};

export type Relic = {
  id: string;
  name: string;
  desc: string;           // flavor text shown in UI
  rarity: RelicRarity;
  effects: RelicEffect;  // passive stat deltas, always active
};
```

### Relic Pool (examples)

| Name | Rarity | Effects |
|------|--------|---------|
| Rusty Core | common | atk+2 |
| Glass Shard | common | crit+3 |
| Ember Fragment | common | atk+1, crit+1 |
| War Banner | rare | atk+5, hp+10 |
| Crimson Eye | rare | crit+8, lifesteal+5 |
| Void Crystal | rare | energy+1, dropBonus+10 |
| Dragon's Heart | legendary | atk+10, crit+10, hp+20, lifesteal+10 |

---

## 2. State Management

### State Changes

- `State` gains `relics: Relic[]` — all relics collected this run
- `SaveData` gains `relics: Relic[]` — persisted across runs
- Relics are **permanent** — cannot be salvaged, sold, or unequipped (simpler logic)

### Stat Computation

`computeStats()` in `store.ts` already iterates over `equipment`. Extend it to also iterate over `relics`:

```typescript
for (const relic of s.relics) {
  for (const [key, val] of Object.entries(relic.effects)) {
    stats[key] += val;
  }
}
```

This makes relics transparent to all existing systems — `player.atk`, `player.crit`, etc. already reflect relic bonuses everywhere they are used.

---

## 3. Drop Logic

### Drop Probability

- **Base**: each wave completion — 15% chance for a relic drop
- **Boss waves**: 40% chance for a relic, with higher legendary weight
- **Elite waves**: 25% chance for a relic
- **Wave scaling**: drop chance += `wave * 1%` (wave 20 → +20%)

### Rarity Distribution

| Roll | Weight |
|------|--------|
| common | 70% |
| rare | 25% |
| legendary | 5% (boss only) |

### Generation

`rollRelic(wave: number): Relic` — picks from the relic pool based on wave and rarity distribution.

---

## 4. Reward Flow

`winWave()` in `store.ts` handles wave completion:

1. Determine if relic drops (probability check)
2. Call `rollRelic(wave)` to generate the relic
3. Add to `s.relics[]`
4. Show a notification toast: `"Relic obtained: {name} — {desc}"`
5. Relic drop does **not** block card reward selection — independent

---

## 5. UI

### Relic Panel

- New `RelicPanel.tsx` component in the sidepanel area
- Shows all collected relics as small icon/text chips
- Tooltip on hover shows full `desc` text
- Empty state: "No relics yet"

### Drop Notification

- Toast-style popup on relic acquisition
- Auto-dismisses after 3 seconds
- Shows relic name, rarity badge, and effect summary

---

## 6. Persistence

`persist()` in `store.ts` already handles `SaveData`. Extend it:

```typescript
type SaveData = {
  shards: number;
  talentRanks: Record<string, number>;
  totalPoints: number;
  stash: Item[];
  relics: Relic[];  // NEW
};
```

`loadSave()` initializes `relics: []` if absent.

---

## 7. Implementation Scope

### Files to Modify

| File | Change |
|------|--------|
| `src/game/types.ts` | Add `RelicRarity`, `RelicEffect`, `Relic` types |
| `src/game/data.ts` | Add `RELIC_POOL`, `rollRelic()` function |
| `src/game/store.ts` | Add `relics` state, update `computeStats()`, `winWave()`, `persist()`, `loadSave()` |
| `src/components/game/sidepanel/` | Add `RelicPanel.tsx` |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/game/sidepanel/RelicPanel.tsx` | Relic display component |

---

## 8. Self-Review

- All relics provide passive buffs — no trigger/charge mechanics
- Relics stack infinitely — no slot limit
- Drop is automatic with toast notification — no selection step
- Persisted across runs via `localStorage` + `save.md`
- Relics do not interfere with existing card reward flow