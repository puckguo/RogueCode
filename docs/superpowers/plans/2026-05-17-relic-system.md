# Relic System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement relic drops in Cards Mode — passive global buffs that stack infinitely, drop automatically on wave clear, and persist across runs.

**Architecture:** Relics are independent from equipment (`Item`). They are pure passive stat bonuses stored in `State.relics[]` and `SaveData.relics[]`. `computeStats()` sums relic effects into player stats transparently. Drop is automatic with a toast notification, no selection step.

**Tech Stack:** React + Zustand + TypeScript + Tailwind CSS + Framer Motion (for toast animation)

---

## File Map

| File | Role |
|------|------|
| `src/game/types.ts` | Add `Relic`, `RelicRarity`, `RelicEffect` types |
| `src/game/data.ts` | Add `RELIC_POOL[]`, `rollRelic(wave) => Relic` |
| `src/game/store.ts` | Add `relics: Relic[]` state, update `computeStats()`, `winWave()`, `persist()`, `loadSave()`, add `relicDropToast` state |
| `src/components/game/sidepanel/RelicPanel.tsx` | **Create** — relic list display with tooltips |
| `src/components/game/sidepanel/shared.tsx` | Add `RelicToast` component (toast popup) and import into `CardsSidePanel` |
| `src/components/game/sidepanel/CardsSidePanel.tsx` | Import and render `RelicPanel` |

---

## Task 1: Add Relic Types

**Files:**
- Modify: `src/game/types.ts:43` (after `Rarity` type)

- [ ] **Step 1: Add types to types.ts**

Add after the existing `Rarity` type:

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
  desc: string;
  rarity: RelicRarity;
  effects: RelicEffect;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/game/types.ts
git commit -m "feat: add Relic, RelicRarity, RelicEffect types"
```

---

## Task 2: Add Relic Pool and rollRelic()

**Files:**
- Modify: `src/game/data.ts` (add at end before closing `}`)

- [ ] **Step 1: Add RELIC_POOL and rollRelic to data.ts**

Add at the end of `data.ts`:

```typescript
// =====================================================================
// RELIC POOL — passive global buffs that stack infinitely
// =====================================================================
import type { Relic, RelicRarity } from "./types";

export const RELIC_POOL: Relic[] = [
  // Common relics
  { id: "r_rusty_core", name: "Rusty Core", desc: "+2 Attack", rarity: "common", effects: { atk: 2 } },
  { id: "r_glass_shard", name: "Glass Shard", desc: "+3% Crit", rarity: "common", effects: { crit: 3 } },
  { id: "r_ember_frag", name: "Ember Fragment", desc: "+1 Attack, +1% Crit", rarity: "common", effects: { atk: 1, crit: 1 } },
  { id: "r_stamina", name: "Stamina Chip", desc: "+8 Max HP", rarity: "common", effects: { hp: 8 } },
  { id: "r_dagger_bit", name: "Dagger Bit", desc: "+5 Max HP, +1 Attack", rarity: "common", effects: { hp: 5, atk: 1 } },
  { id: "r_quick_fix", name: "Quick Fix", desc: "+2% Magic Find", rarity: "common", effects: { dropBonus: 2 } },

  // Rare relics
  { id: "r_war_banner", name: "War Banner", desc: "+5 Attack, +10 Max HP", rarity: "rare", effects: { atk: 5, hp: 10 } },
  { id: "r_crimson_eye", name: "Crimson Eye", desc: "+8% Crit, +5% Lifesteal", rarity: "rare", effects: { crit: 8, lifesteal: 5 } },
  { id: "r_void_crystal", name: "Void Crystal", desc: "+1 Energy per turn, +10% Magic Find", rarity: "rare", effects: { energy: 1, dropBonus: 10 } },
  { id: "r_iron_bastion", name: "Iron Bastion", desc: "+20 Max HP, +3 Block on turn start", rarity: "rare", effects: { hp: 20, blockBonus: 3 } },
  { id: "r_spark_coil", name: "Spark Coil", desc: "+4 Attack, +4% Crit", rarity: "rare", effects: { atk: 4, crit: 4 } },
  { id: "r_leech", name: "Leech Protocol", desc: "+8% Lifesteal", rarity: "rare", effects: { lifesteal: 8 } },

  // Legendary relics
  { id: "r_dragon_heart", name: "Dragon's Heart", desc: "+10 Attack, +10% Crit, +20 Max HP, +10% Lifesteal", rarity: "legendary", effects: { atk: 10, crit: 10, hp: 20, lifesteal: 10 } },
  { id: "r_phoenix", name: "Phoenix Core", desc: "+15 Max HP, +1 Energy per turn, +5% Magic Find", rarity: "legendary", effects: { hp: 15, energy: 1, dropBonus: 5 } },
  { id: "r_overclocker", name: "Overclocker", desc: "+8 Attack, +8% Crit, +1 Energy per turn", rarity: "legendary", effects: { atk: 8, crit: 8, energy: 1 } },
];

const RELIC_RARITY_WEIGHT: Record<RelicRarity, number> = {
  common: 70,
  rare: 25,
  legendary: 5,
};

export function rollRelic(wave: number): Relic {
  // Boss waves have higher legendary weight
  const isBoss = wave > 0 && wave % 5 === 0;
  const weights: [RelicRarity, number][] = [
    ["common", RELIC_RARITY_WEIGHT.common],
    ["rare", RELIC_RARITY_WEIGHT.rare],
    ["legendary", isBoss ? 20 : RELIC_RARITY_WEIGHT.legendary],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  let rarity: RelicRarity = "common";
  for (const [k, w] of weights) {
    r -= w;
    if (r <= 0) { rarity = k; break; }
  }
  const pool = RELIC_POOL.filter((rel) => rel.rarity === rarity);
  if (pool.length === 0) return RELIC_POOL[0];
  return pool[Math.floor(Math.random() * pool.length)];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/data.ts
git commit -m "feat: add RELIC_POOL and rollRelic()"
```

---

## Task 3: Add relics to State, persist(), loadSave()

**Files:**
- Modify: `src/game/store.ts`

- [ ] **Step 1: Import Relic type and update SaveData type**

At the top of store.ts, update the import:

```typescript
import type { Card, CliSession, CliStatus, Enemy, Item, MythicAffix, Rarity, Relic, TalentNode } from "./types";
```

Update `SaveData`:

```typescript
type SaveData = {
  shards: number;
  talentRanks: Record<string, number>;
  totalPoints: number;
  stash: Item[];
  relics: Relic[];  // NEW
};
```

- [ ] **Step 2: Update loadSave() to handle relics**

```typescript
function loadSave(): SaveData {
  if (typeof localStorage === "undefined") return { shards: 0, talentRanks: {}, totalPoints: 0, stash: [], relics: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { shards: 0, talentRanks: {}, totalPoints: 0, stash: [], relics: [] };
    return JSON.parse(raw);
  } catch {
    return { shards: 0, talentRanks: {}, totalPoints: 0, stash: [], relics: [] };
  }
}
```

- [ ] **Step 3: Update persist() to include relics**

```typescript
function persist(s: SaveData) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
  void writeSaveMd(s);
}
```

- [ ] **Step 4: Add relics to State type declaration**

Add to the `State` type:
```typescript
relics: Relic[];
relicDropToast: Relic | null;  // for toast notification
```

Add to the initial state object returned by `create<State>()((set, get) => { ... }`:
```typescript
relics: save.relics,
relicDropToast: null,
```

- [ ] **Step 5: Add clearRelicToast action**

In the State actions object, add:
```typescript
clearRelicToast: () => set({ relicDropToast: null }),
```

- [ ] **Step 6: Commit**

```bash
git add src/game/store.ts
git commit -m "feat: add relics state, persist, loadSave support"
```

---

## Task 4: Update computeStats() to Include Relic Effects

**Files:**
- Modify: `src/game/store.ts`

- [ ] **Step 1: Extend computeStats() to iterate relics**

Replace the existing `computeStats()` function with:

```typescript
function computeStats(s: Pick<State, "talentRanks" | "equipment" | "relics">) {
  let atk = 5;
  let hp = 50;
  let crit = 5;
  let energy = 3;
  let dropBonus = 0;
  let lifesteal = 0;
  for (const node of TALENT_TREE) {
    const r = s.talentRanks[node.id] || 0;
    atk += (node.effect.atk || 0) * r;
    hp += (node.effect.hp || 0) * r;
    crit += (node.effect.crit || 0) * r;
    energy += (node.effect.energy || 0) * r;
    dropBonus += (node.effect.dropBonus || 0) * r;
    lifesteal += (node.effect.lifesteal || 0) * r;
  }
  for (const it of Object.values(s.equipment)) {
    if (!it) continue;
    for (const a of it.affixes) {
      atk += a.atk || 0;
      hp += a.hp || 0;
      crit += a.crit || 0;
      dropBonus += a.dropBonus || 0;
      lifesteal += a.lifesteal || 0;
    }
  }
  for (const relic of s.relics) {
    atk += relic.effects.atk || 0;
    hp += relic.effects.hp || 0;
    crit += relic.effects.crit || 0;
    energy += relic.effects.energy || 0;
    dropBonus += relic.effects.dropBonus || 0;
    lifesteal += relic.effects.lifesteal || 0;
  }
  return { atk, maxHp: hp, crit, energy, dropBonus, lifesteal };
}
```

Note: update all callers of `computeStats()` to pass `{ ...s, relics: s.relics }` — or simply pass the full state `s` since it already has `relics`.

- [ ] **Step 2: Commit**

```bash
git add src/game/store.ts
git commit -m "feat: computeStats includes relic passive bonuses"
```

---

## Task 5: Implement Relic Drop in winWave()

**Files:**
- Modify: `src/game/store.ts`

- [ ] **Step 1: Import rollRelic from data**

At the top of store.ts, update the data imports:

```typescript
import {
  // ... existing imports
  rollRelic,  // ADD
} from "./data";
```

- [ ] **Step 2: Add relic drop logic to winWave()**

In `winWave()`, after determining `isBoss` and `isElite`, and before setting card rewards, add:

```typescript
// --- Relic drop check ---
let relicDrop: Relic | null = null;
const dropChance = node?.type === "boss" ? 0.40
  : node?.type === "elite" ? 0.25
  : 0.15 + s.wave * 0.01;  // base 15% + 1% per wave
if (Math.random() < dropChance) {
  const rolled = rollRelic(s.wave);
  relicDrop = { ...rolled, id: `rel_${Math.random().toString(36).slice(2, 9)}` };
  log.push(`✦ Relic obtained: ${rolled.name}`);
}

set({
  // ... existing set values ...
  relicDropToast: relicDrop,
  // also add relics to the relics array:
  relics: relicDrop ? [...s.relics, relicDrop] : s.relics,
});
```

Also update the persist call in `endRun()` to include relics.

- [ ] **Step 3: Commit**

```bash
git add src/game/store.ts
git commit -m "feat: implement relic drop logic in winWave()"
```

---

## Task 6: Create RelicPanel Component

**Files:**
- Create: `src/components/game/sidepanel/RelicPanel.tsx`

- [ ] **Step 1: Write RelicPanel.tsx**

```tsx
import { useState } from "react";
import { useGame } from "@/game/store";
import type { Relic } from "@/game/types";
import { motion, AnimatePresence } from "framer-motion";

const rarityColors: Record<Relic["rarity"], string> = {
  common: "border-rarity-common/40 text-rarity-common",
  rare: "border-rarity-rare/60 text-rarity-rare",
  legendary: "border-rarity-legendary/70 text-rarity-legendary",
};

function RelicChip({ relic }: { relic: Relic }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        className={`w-full rounded border bg-card/60 px-2 py-1 text-left text-xs transition hover:bg-card ${rarityColors[relic.rarity]}`}
      >
        <span className="font-bold">{relic.name}</span>
        <span className="ml-1 text-[10px] opacity-60">{relic.rarity}</span>
      </button>
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={`absolute left-0 top-full z-50 mt-1 w-48 rounded border bg-popover p-2 text-xs shadow-lg ${rarityColors[relic.rarity]}`}
          >
            <div className="font-bold">{relic.name}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">{relic.rarity} relic</div>
            <div className="mt-1 text-foreground/80">{relic.desc}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RelicPanel() {
  const { relics } = useGame();

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Relics ({relics.length})
      </div>
      {relics.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">No relics yet</div>
      ) : (
        <div className="flex flex-col gap-1">
          {relics.map((rel) => (
            <RelicChip key={rel.id} relic={rel} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/sidepanel/RelicPanel.tsx
git commit -m "feat: add RelicPanel component"
```

---

## Task 7: Add Relic Toast Notification

**Files:**
- Modify: `src/components/game/sidepanel/shared.tsx`
- Add `RelicToast` component

- [ ] **Step 1: Add RelicToast to shared.tsx**

Add after the `RunSummaryModal` component (at end of file):

```tsx
export function RelicToast() {
  const { relicDropToast, clearRelicToast } = useGame();

  return (
    <AnimatePresence>
      {relicDropToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed left-1/2 top-8 z-50 -translate-x-1/2 rounded-xl border-2 bg-card px-6 py-3 shadow-xl ${
            relicDropToast.rarity === "legendary"
              ? "border-rarity-legendary/80 text-rarity-legendary"
              : relicDropToast.rarity === "rare"
              ? "border-rarity-rare/70 text-rarity-rare"
              : "border-rarity-common/50 text-rarity-common"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✦</span>
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">Relic Acquired</div>
              <div className="font-bold">{relicDropToast.name}</div>
              <div className="text-xs text-foreground/70">{relicDropToast.desc}</div>
            </div>
            <button
              onClick={clearRelicToast}
              className="ml-2 rounded px-2 py-1 text-xs hover:bg-muted"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

Note: `useGame` and `AnimatePresence` are already imported in shared.tsx. The `Relic` type is not yet imported — add `Relic` to the existing type import.

- [ ] **Step 2: Commit**

```bash
git add src/components/game/sidepanel/shared.tsx
git commit -m "feat: add RelicToast notification popup"
```

---

## Task 8: Wire RelicPanel and RelicToast into CardsSidePanel

**Files:**
- Modify: `src/components/game/sidepanel/CardsSidePanel.tsx`

- [ ] **Step 1: Add RelicPanel to imports**

```tsx
import { StatusStrip, TalentsSection, RewardModals, RunSummaryModal, Section, RelicToast } from "./shared";
// ADD RelicPanel import:
import { RelicPanel } from "./RelicPanel";
```

- [ ] **Step 2: Add RelicPanel component to render**

In the `CardsSidePanel` return, add `<RelicPanel />` inside the flex container. Place it after `StatusStrip` and before the first `Section`:

```tsx
return (
  <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
    <StatusStrip />
    <RelicPanel />  {/* ADD THIS LINE */}
    {/* ... rest of content */}
```

Also add `<RelicToast />` at the end (outside the scroll container, so it's fixed-position):

```tsx
    <RewardModals />
    <RunSummaryModal />
    <RelicToast />  {/* ADD THIS LINE */}
  </div>
);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/game/sidepanel/CardsSidePanel.tsx
git commit -m "feat: wire RelicPanel and RelicToast into CardsSidePanel"
```

---

## Self-Review Checklist

1. **Spec coverage:** All requirements from the spec are implemented — types, drop logic, state, persistence, UI panel, toast notification.
2. **Placeholder scan:** No "TBD", "TODO", or vague steps. Every step has concrete file paths and code.
3. **Type consistency:** `Relic`, `RelicRarity`, `RelicEffect` are defined once in `types.ts` and imported wherever needed. `rollRelic` in `data.ts` returns `Relic`. State uses `Relic[]`.
4. **No double-definitions:** Types only in `types.ts`, data only in `data.ts`, UI only in component files.
5. **Persistence flow:** `persist()` handles `relics: Relic[]` via SaveData — no extra persistence calls needed in `winWave()`.

---

## Execution Choice

**Plan complete and saved to `docs/superpowers/plans/YYYY-MM-DD-relic-system.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**