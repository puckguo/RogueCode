import { create } from "zustand";
import type { Card, CliStatus, Enemy, Item, Rarity, TalentNode } from "./types";
import {
  AFFIX_POOL,
  ITEM_NAMES,
  REWARD_POOL,
  STARTER_DECK,
  TALENT_TREE,
  rollEnemy,
  rollRarity,
  RARITY_AFFIX_COUNT,
} from "./data";

const STORAGE_KEY = "codequest_save_v1";

type SaveData = {
  shards: number;
  talentRanks: Record<string, number>;
  totalPoints: number;
  stash: Item[];
};

function loadSave(): SaveData {
  if (typeof localStorage === "undefined") return { shards: 0, talentRanks: {}, totalPoints: 0, stash: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { shards: 0, talentRanks: {}, totalPoints: 0, stash: [] };
    return JSON.parse(raw);
  } catch {
    return { shards: 0, talentRanks: {}, totalPoints: 0, stash: [] };
  }
}

function persist(s: SaveData) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function rollItem(ilvl: number, magicFind: number, forceRarity?: Rarity): Item {
  const slots: Item["slot"][] = ["weapon", "armor", "helm", "boots", "ring", "amulet"];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const rarity: Rarity = forceRarity || rollRarity(magicFind);
  const count = RARITY_AFFIX_COUNT[rarity];
  const affixes = Array.from({ length: count }).map(() => AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)]);
  const namePool = ITEM_NAMES[slot] || ["Trinket"];
  const name = namePool[Math.floor(Math.random() * namePool.length)];
  return {
    id: `it_${Math.random().toString(36).slice(2, 9)}`,
    name,
    slot,
    rarity,
    affixes,
    ilvl,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Buff = { atk: number; crit: number; turns: number };

type State = {
  // CLI
  cliStatus: CliStatus;
  cliBuffer: string;
  tokensPerSec: number;
  combo: number;
  comboTimer: number;
  pendingPrompt: string;

  // Run
  inRun: boolean;
  wave: number;
  player: { hp: number; maxHp: number; atk: number; crit: number; energy: number; maxEnergy: number; block: number };
  buffs: Buff;
  equipment: Partial<Record<Item["slot"], Item>>;
  inventory: Item[];
  enemies: Enemy[];
  hand: Card[];
  draw: Card[];
  discard: Card[];
  deck: Card[];
  rewardChoices: Card[] | null;
  itemReward: Item | null;
  log: string[];
  turn: number;

  // Meta
  shards: number;
  talentRanks: Record<string, number>;
  totalPoints: number;
  stash: Item[];

  // Coding-behavior hooks
  nextDropLegendary: boolean;
  recentEvents: { ts: number; text: string }[];
  runSummary: null | { wave: number; shards: number; points: number; events: string[] };

  // Actions
  setCliStatus: (s: CliStatus) => void;
  appendCliOutput: (chunk: string) => void;
  setTokensPerSec: (n: number) => void;
  submitPrompt: (prompt: string) => void;
  setPendingPrompt: (s: string) => void;

  startRun: () => void;
  endRun: () => void;
  playCard: (idx: number) => void;
  endTurn: () => void;
  pickReward: (c: Card | null) => void;
  takeItemReward: () => void;
  equipItem: (id: string) => void;
  salvageItem: (id: string) => void;
  stashItem: (id: string) => void;
  withdrawStash: (id: string) => void;
  spendTalent: (id: string) => void;
  refundAllTalents: () => void;
  dismissRunSummary: () => void;

  tick: () => void;
  winWave: () => void;
};

function computeStats(s: Pick<State, "talentRanks" | "equipment">) {
  let atk = 5;
  let hp = 50;
  let crit = 5;
  let energy = 3;
  let dropBonus = 0;
  for (const node of TALENT_TREE) {
    const r = s.talentRanks[node.id] || 0;
    atk += (node.effect.atk || 0) * r;
    hp += (node.effect.hp || 0) * r;
    crit += (node.effect.crit || 0) * r;
    energy += (node.effect.energy || 0) * r;
    dropBonus += (node.effect.dropBonus || 0) * r;
  }
  for (const it of Object.values(s.equipment)) {
    if (!it) continue;
    for (const a of it.affixes) {
      atk += a.atk || 0;
      hp += a.hp || 0;
      crit += a.crit || 0;
      dropBonus += a.dropBonus || 0;
    }
  }
  return { atk, maxHp: hp, crit, energy, dropBonus };
}

export const useGame = create<State>()((set, get) => {
  const save = loadSave();
  return {
    cliStatus: "IDLE_WAITING",
    cliBuffer: "",
    tokensPerSec: 0,
    combo: 0,
    comboTimer: 0,
    pendingPrompt: "",

    inRun: false,
    wave: 0,
    player: { hp: 50, maxHp: 50, atk: 5, crit: 5, energy: 3, maxEnergy: 3, block: 0 },
    buffs: { atk: 0, crit: 0, turns: 0 },
    equipment: {},
    inventory: [],
    enemies: [],
    hand: [],
    draw: [],
    discard: [],
    deck: [...STARTER_DECK],
    rewardChoices: null,
    itemReward: null,
    log: [],
    turn: 0,

    shards: save.shards,
    talentRanks: save.talentRanks,
    totalPoints: save.totalPoints,
    stash: save.stash,

    nextDropLegendary: false,
    recentEvents: [],
    runSummary: null,

    setCliStatus: (s: CliStatus) => {
      const prev = get().cliStatus;
      if (prev === s) return;
      set({ cliStatus: s });
      if (s === "STREAMING" && prev !== "STREAMING") {
        set({ log: [...get().log, "▶ AI streaming — battle resumes"] });
      }
      if (s === "IDLE_WAITING") {
        // reset combo on long idle
        set({
          log: [...get().log, "⏸ AI idle — talk to your AI to resume"],
          combo: 0,
          comboTimer: 0,
        });
      }
    },
    appendCliOutput: (chunk: string) => {
      const s = get();
      const buf = (s.cliBuffer + chunk).slice(-8000);
      let combo = s.combo;
      let comboTimer = s.comboTimer;
      const events = [...s.recentEvents];
      let nextDropLegendary = s.nextDropLegendary;
      const log = [...s.log];

      if (s.cliStatus === "STREAMING") {
        comboTimer += chunk.length;
        // every ~600 chars of streamed output = +1 combo
        const newCombo = Math.floor(comboTimer / 600);
        if (newCombo > combo) {
          combo = newCombo;
          log.push(`✦ Combo ×${combo} — magic find boosted`);
        }
      }

      // pattern hooks on the rolling buffer
      const hooks: { re: RegExp; text: string; effect: () => void }[] = [
        {
          re: /\b(commit|committed)\b.*?\b[a-f0-9]{7,}\b/i,
          text: "Git commit detected → next loot guaranteed Legendary!",
          effect: () => { nextDropLegendary = true; },
        },
        {
          re: /(✓|PASS|passed|all tests pass|tests? passed)/,
          text: "Tests passing → +5 ether shards",
          effect: () => { set({ shards: get().shards + 5 }); },
        },
        {
          re: /\b(error|Error|FAIL|failed|Traceback)\b/,
          text: "AI hit an error — enemies enraged (+1 ATK)",
          effect: () => {
            set({ enemies: get().enemies.map((e) => ({ ...e, atk: e.atk + 1, intent: e.intent + 1 })) });
          },
        },
      ];
      // only fire each hook once per ~5s window
      const now = Date.now();
      for (const h of hooks) {
        const fired = events.find((e) => e.text === h.text && now - e.ts < 5000);
        if (!fired && h.re.test(buf.slice(-400))) {
          h.effect();
          events.push({ ts: now, text: h.text });
          log.push(`⚡ ${h.text}`);
        }
      }

      set({
        cliBuffer: buf,
        combo, comboTimer,
        recentEvents: events.filter((e) => now - e.ts < 30000),
        nextDropLegendary,
        log: log.slice(-40),
      });
    },
    setTokensPerSec: (n: number) => set({ tokensPerSec: n }),
    setPendingPrompt: (s: string) => set({ pendingPrompt: s }),
    submitPrompt: (prompt: string) => {
      if (!prompt.trim()) return;
      set({
        cliBuffer: get().cliBuffer + `\n$ ${prompt}\n`,
        pendingPrompt: "",
        cliStatus: "STREAMING",
      });
    },

    startRun: () => {
      const stats = computeStats(get());
      const deck = shuffle([...STARTER_DECK]);
      set({
        inRun: true,
        wave: 1,
        player: {
          hp: stats.maxHp,
          maxHp: stats.maxHp,
          atk: stats.atk,
          crit: stats.crit,
          energy: stats.energy,
          maxEnergy: stats.energy,
          block: 0,
        },
        buffs: { atk: 0, crit: 0, turns: 0 },
        enemies: [rollEnemy(1)],
        deck,
        draw: deck,
        discard: [],
        hand: [],
        log: ["⚔ Run started. Focus your AI to advance."],
        turn: 0,
        rewardChoices: null,
        itemReward: null,
      });
      get().endTurn();
    },

    endRun: () => {
      const s = get();
      const earned = Math.floor(s.wave * 5 + s.combo * 2);
      const points = Math.floor(s.wave / 2);
      const newShards = s.shards + earned;
      const newPoints = s.totalPoints + points;
      const save: SaveData = {
        shards: newShards,
        talentRanks: s.talentRanks,
        totalPoints: newPoints,
        stash: s.stash,
      };
      persist(save);
      set({
        inRun: false,
        shards: newShards,
        totalPoints: newPoints,
        log: [...s.log, `☠ Run ended. +${earned} ether shards, +${points} talent points.`],
        runSummary: {
          wave: s.wave,
          shards: earned,
          points,
          events: s.recentEvents.slice(-6).map((e) => e.text),
        },
      });
    },

    dismissRunSummary: () => set({ runSummary: null }),

    stashItem: (id: string) => {
      const s = get();
      const it = s.inventory.find((i) => i.id === id);
      if (!it) return;
      const newInv = s.inventory.filter((i) => i.id !== id);
      const newStash = [...s.stash, it];
      set({ inventory: newInv, stash: newStash });
      persist({ shards: s.shards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: newStash });
    },
    withdrawStash: (id: string) => {
      const s = get();
      const it = s.stash.find((i) => i.id === id);
      if (!it || !s.inRun) return;
      const newStash = s.stash.filter((i) => i.id !== id);
      set({ inventory: [...s.inventory, it], stash: newStash });
      persist({ shards: s.shards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: newStash });
    },

    playCard: (idx: number) => {
      const s = get();
      const card = s.hand[idx];
      if (!card) return;
      if (s.player.energy < card.cost) {
        set({ log: [...s.log, "Not enough energy."] });
        return;
      }
      const totalAtk = s.player.atk + s.buffs.atk;
      const critChance = s.player.crit + s.buffs.crit;
      let enemies = [...s.enemies];
      const log = [...s.log];

      const dealDamage = (target: number, baseDmg: number) => {
        const isCrit = Math.random() * 100 < critChance;
        const dmg = Math.round((baseDmg + totalAtk * 0.3) * (isCrit ? 2 : 1));
        const e = enemies[target];
        if (!e) return;
        e.hp -= dmg;
        log.push(`→ ${card.name} hit ${e.name} for ${dmg}${isCrit ? " (CRIT!)" : ""}`);
      };

      if (card.damage != null) {
        const hits = card.hits || 1;
        for (let h = 0; h < hits; h++) {
          const idxAlive = enemies.findIndex((e) => e.hp > 0);
          if (idxAlive < 0) break;
          dealDamage(idxAlive, card.damage);
        }
        enemies = enemies.filter((e) => e.hp > 0);
      }
      let block = s.player.block;
      if (card.block != null) {
        block += card.block;
        log.push(`→ Gained ${card.block} block.`);
      }
      let buffs = s.buffs;
      if (card.buff) {
        buffs = {
          atk: buffs.atk + (card.buff.atk || 0),
          crit: buffs.crit + (card.buff.crit || 0),
          turns: Math.max(buffs.turns, card.buff.turns),
        };
        log.push(`→ ${card.name} activated.`);
      }

      const newHand = s.hand.filter((_, i) => i !== idx);
      set({
        hand: newHand,
        discard: [...s.discard, card],
        enemies,
        player: { ...s.player, energy: s.player.energy - card.cost, block },
        buffs,
        log: log.slice(-30),
      });

      if (enemies.length === 0) {
        get().winWave();
      }
    },

    endTurn: () => {
      const s = get();
      if (!s.inRun) return;
      let player = { ...s.player };
      const log = [...s.log];
      for (const e of s.enemies) {
        let dmg = e.atk;
        if (player.block > 0) {
          const absorbed = Math.min(player.block, dmg);
          dmg -= absorbed;
          player.block -= absorbed;
        }
        player.hp -= dmg;
        if (dmg > 0) log.push(`✦ ${e.name} hits you for ${dmg}.`);
      }
      if (player.hp <= 0) {
        set({ player, log: [...log, "☠ You died."] });
        get().endRun();
        return;
      }
      const buffs = s.buffs.turns > 0
        ? { ...s.buffs, turns: s.buffs.turns - 1, atk: s.buffs.turns - 1 === 0 ? 0 : s.buffs.atk, crit: s.buffs.turns - 1 === 0 ? 0 : s.buffs.crit }
        : s.buffs;
      let draw = [...s.draw];
      let discard = [...s.discard, ...s.hand];
      const hand: Card[] = [];
      for (let i = 0; i < 5; i++) {
        if (draw.length === 0) {
          draw = shuffle(discard);
          discard = [];
        }
        const c = draw.shift();
        if (c) hand.push(c);
      }
      player.energy = player.maxEnergy;
      player.block = 0;
      const enemies = s.enemies.map((e) => ({ ...e, intent: e.atk }));
      set({
        player,
        enemies,
        hand,
        draw,
        discard,
        buffs,
        turn: s.turn + 1,
        log: log.slice(-30),
      });
    },

    pickReward: (c: Card | null) => {
      const s = get();
      if (c) {
        set({
          deck: [...s.deck, c],
          discard: [...s.discard, c],
          rewardChoices: null,
          log: [...s.log, `+ Added ${c.name} to deck.`],
        });
      } else {
        set({ rewardChoices: null });
      }
    },

    takeItemReward: () => {
      const s = get();
      if (!s.itemReward) return;
      set({ inventory: [...s.inventory, s.itemReward], itemReward: null, log: [...s.log, `+ Looted ${s.itemReward.name}.`] });
    },

    equipItem: (id: string) => {
      const s = get();
      const it = s.inventory.find((i) => i.id === id);
      if (!it) return;
      const prev = s.equipment[it.slot];
      const newEquip = { ...s.equipment, [it.slot]: it };
      const newInv = s.inventory.filter((i) => i.id !== id);
      if (prev) newInv.push(prev);
      const stats = computeStats({ talentRanks: s.talentRanks, equipment: newEquip });
      const ratio = s.player.hp / s.player.maxHp;
      set({
        equipment: newEquip,
        inventory: newInv,
        player: {
          ...s.player,
          atk: stats.atk,
          crit: stats.crit,
          maxHp: stats.maxHp,
          hp: Math.min(stats.maxHp, Math.round(stats.maxHp * ratio)),
        },
      });
    },

    salvageItem: (id: string) => {
      const s = get();
      const inAny = s.inventory.find((i) => i.id === id) || s.stash.find((i) => i.id === id);
      if (!inAny) return;
      const value = { common: 1, magic: 3, rare: 7, set: 15, legendary: 30 }[inAny.rarity];
      const newShards = s.shards + value;
      const newInv = s.inventory.filter((i) => i.id !== id);
      const newStash = s.stash.filter((i) => i.id !== id);
      set({ shards: newShards, inventory: newInv, stash: newStash });
      persist({ shards: newShards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: newStash });
    },

    spendTalent: (id: string) => {
      const s = get();
      const node = TALENT_TREE.find((n) => n.id === id);
      if (!node) return;
      const cur = s.talentRanks[id] || 0;
      if (cur >= node.maxRank) return;
      if (s.totalPoints <= 0) return;
      if (node.requires) {
        for (const r of node.requires) {
          if ((s.talentRanks[r] || 0) === 0) return;
        }
      }
      const newRanks = { ...s.talentRanks, [id]: cur + 1 };
      const newPoints = s.totalPoints - 1;
      set({ talentRanks: newRanks, totalPoints: newPoints });
      persist({ shards: s.shards, talentRanks: newRanks, totalPoints: newPoints, stash: s.stash });
    },

    refundAllTalents: () => {
      const s = get();
      const cost = 25;
      if (s.shards < cost) return;
      const refunded = Object.values(s.talentRanks).reduce((a: number, b) => a + (b as number), 0);
      const newPoints = s.totalPoints + refunded;
      const newShards = s.shards - cost;
      set({ talentRanks: {}, totalPoints: newPoints, shards: newShards });
      persist({ shards: newShards, talentRanks: {}, totalPoints: newPoints, stash: s.stash });
    },

    tick: () => {
      const s = get();
      if (!s.inRun) return;
      if (s.cliStatus !== "STREAMING") return;
      const newComboTimer = s.comboTimer + 1;
      let combo = s.combo;
      if (newComboTimer % 30 === 0) combo += 1;
      set({ comboTimer: newComboTimer, combo });
    },

    winWave: () => {
      const s = get() as any;
      const stats = computeStats(s);
      const magicFind = stats.dropBonus + s.combo * 2;
      const log = [...s.log, `★ Wave ${s.wave} cleared!`];
      const isBoss = s.wave % 5 === 0;
      const choices = shuffle(REWARD_POOL).slice(0, 3);
      let itemReward: Item | null = null;
      if (s.wave % 3 === 0) {
        itemReward = rollItem(s.wave, magicFind);
      }
      const next = s.wave + 1;
      const enemies: Enemy[] = [rollEnemy(next)];
      if (next % 4 === 0) enemies.push(rollEnemy(next));
      set({
        wave: next,
        enemies,
        rewardChoices: choices,
        itemReward,
        log,
        player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + 4), block: 0, energy: s.player.maxEnergy },
        hand: [],
      });
      get().endTurn();
      if (isBoss) {
        const newShards = s.shards + 20;
        set({ shards: newShards });
        persist({ shards: newShards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: s.stash });
      }
    },
  } as any;
});
