import { create } from "zustand";
import type { Card, CliSession, CliStatus, Enemy, Item, MythicAffix, Rarity, Relic, TalentNode } from "./types";
import {
  AFFIX_POOL,
  ITEM_NAMES,
  REWARD_POOL,
  STARTER_DECK,
  TALENT_TREE,
  rollEnemy,
  rollRarity,
  RARITY_AFFIX_COUNT,
  rollMythicAffixes,
  generateRunPath,
} from "./data";
import type { PathNode } from "./types";
import { writeSaveMd, readSaveMd, writeSkillMd, writeStateMd, appendLogMd } from "./mdStorage";

const STORAGE_KEY = "codequest_save_v1";

type SaveData = {
  shards: number;
  talentRanks: Record<string, number>;
  totalPoints: number;
  stash: Item[];
  relics: Relic[];
};

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

function persist(s: SaveData) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
  // Mirror to markdown file (Electron ~/.codequest/save.md, browser localStorage).
  void writeSaveMd(s);
}

export function rollItem(ilvl: number, magicFind: number, forceRarity?: Rarity): Item {
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
  // CLI (active session — kept for back-compat with existing UI)
  cliStatus: CliStatus;
  cliBuffer: string;
  tokensPerSec: number;
  combo: number;
  comboTimer: number;
  pendingPrompt: string;

  // Debug mode: ignore CLI idle state, game never pauses
  debugMode: boolean;
  setDebugMode: (b: boolean) => void;

  // Multi-CLI: tabs the user can switch between
  sessions: CliSession[];
  activeSessionId: string | null;

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
  exhaust: Card[];           // StS: cards exhausted this combat (return to deck on combat end)
  deck: Card[];
  rewardChoices: Card[] | null;
  itemReward: Item | null;
  log: string[];
  turn: number;

  // Run path (StS-style)
  path: PathNode[];
  pathIdx: number;            // index into path of current node
  inCombat: boolean;          // true while resolving an enemy/elite/boss node
  pendingEvent: null | { title: string; desc: string; choices: { label: string; effect: () => void }[] };
  pendingRest: boolean;
  pendingShop: null | { cards: Card[]; removeCost: number };

  // Meta
  shards: number;
  talentRanks: Record<string, number>;
  totalPoints: number;
  stash: Item[];
  relics: Relic[];
  relicDropToast: Relic | null;

  // Mythic Keystone (Arena difficulty)
  mythicLevel: number;
  mythicAffixes: MythicAffix[];

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

  // Multi-CLI actions
  addSession: (label?: string) => string;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  renameSession: (id: string, label: string) => void;
  updateSessionStatus: (id: string, status: CliStatus, hasStarted?: boolean) => void;

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

  setShardsAdd: (n: number) => void;
  addInventoryItem: (it: Item, consumeLegendary?: boolean) => void;
  clearRelicToast: () => void;

  // Mythic actions
  setMythicLevel: (n: number) => void;
  rerollMythicAffixes: () => void;

  tick: () => void;
  winWave: () => void;

  // Path / non-combat node actions
  advancePath: () => void;
  chooseEventOption: (idx: number) => void;
  doRest: (mode: "heal" | "upgrade") => void;
  closeShop: () => void;
  shopBuyCard: (c: Card) => void;
  shopRemoveCard: (cardId: string) => void;
};

// Derived helper (call with current state). Game is paused if ANY started CLI is not streaming.
export function isAnyCliIdle(s: Pick<State, "sessions">, debugMode?: boolean): boolean {
  if (debugMode) return false; // debug mode ignores idle check
  const started = s.sessions.filter((x) => x.hasStarted);
  if (started.length === 0) return true; // no CLI at all → paused
  return started.some((x) => x.status !== "STREAMING");
}

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
    exhaust: [],
    deck: [...STARTER_DECK],
    rewardChoices: null,
    itemReward: null,
    log: [],
    turn: 0,
    path: [],
    pathIdx: -1,
    inCombat: false,
    pendingEvent: null,
    pendingRest: false,
    pendingShop: null,

    shards: save.shards,
    talentRanks: save.talentRanks,
    totalPoints: save.totalPoints,
    stash: save.stash,
    relics: save.relics,
    relicDropToast: null,

    sessions: [{ id: "cli_1", label: "CLI 1", status: "IDLE_WAITING", hasStarted: false, lastActivityTs: 0 }],
    activeSessionId: "cli_1",

    debugMode: false,
    setDebugMode: (b: boolean) => set({ debugMode: b }),

    mythicLevel: 1,
    mythicAffixes: [],

    nextDropLegendary: false,
    recentEvents: [],
    runSummary: null,

    addSession: (label?: string) => {
      const s = get();
      const n = s.sessions.length + 1;
      const id = `cli_${Date.now().toString(36)}`;
      const sess: CliSession = { id, label: label || `CLI ${n}`, status: "IDLE_WAITING", hasStarted: false, lastActivityTs: 0 };
      set({ sessions: [...s.sessions, sess], activeSessionId: id });
      return id;
    },
    removeSession: (id: string) => {
      const s = get();
      const next = s.sessions.filter((x) => x.id !== id);
      const active = s.activeSessionId === id ? next[0]?.id ?? null : s.activeSessionId;
      set({ sessions: next.length ? next : [{ id: "cli_1", label: "CLI 1", status: "IDLE_WAITING", hasStarted: false, lastActivityTs: 0 }], activeSessionId: active ?? "cli_1" });
    },
    setActiveSession: (id: string) => {
      const s = get();
      const sess = s.sessions.find((x) => x.id === id);
      if (!sess) return;
      set({ activeSessionId: id, cliStatus: sess.status });
    },
    renameSession: (id: string, label: string) => {
      const s = get();
      set({ sessions: s.sessions.map((x) => x.id === id ? { ...x, label } : x) });
    },
    updateSessionStatus: (id: string, status: CliStatus, hasStarted?: boolean) => {
      const s = get();
      const sessions = s.sessions.map((x) =>
        x.id === id
          ? {
              ...x,
              status,
              hasStarted: hasStarted ?? x.hasStarted,
              lastActivityTs: status === "STREAMING" ? Date.now() : x.lastActivityTs,
            }
          : x,
      );
      const patch: Partial<State> = { sessions };
      if (s.activeSessionId === id) patch.cliStatus = status;
      set(patch as any);
    },

    setMythicLevel: (n: number) => {
      const lvl = Math.max(1, Math.min(20, Math.floor(n)));
      const aff = rollMythicAffixes(lvl);
      set({ mythicLevel: lvl, mythicAffixes: aff });
    },
    rerollMythicAffixes: () => {
      const s = get();
      // 1 reroll costs 5 shards
      if (s.shards < 5) return;
      const aff = rollMythicAffixes(s.mythicLevel, Math.random() * 1e9);
      const newShards = s.shards - 5;
      set({ mythicAffixes: aff, shards: newShards });
      persist({ shards: newShards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: s.stash, relics: s.relics });
    },

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
      const path = generateRunPath(15);
      set({
        inRun: true,
        wave: 0,
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
        enemies: [],
        deck: [...STARTER_DECK],
        draw: [],
        discard: [],
        exhaust: [],
        hand: [],
        log: ["⚔ Run started. Focus your AI to advance."],
        turn: 0,
        rewardChoices: null,
        itemReward: null,
        path,
        pathIdx: -1,
        inCombat: false,
        pendingEvent: null,
        pendingRest: false,
        pendingShop: null,
      });
      get().advancePath();
    },

    endRun: () => {
      const s = get();
      const earned = Math.floor(s.wave * 5 + s.combo * 2);
      const points = Math.floor(s.wave * 0.6);
      const newShards = s.shards + earned;
      const newPoints = s.totalPoints + points;
      const save: SaveData = {
        shards: newShards,
        talentRanks: s.talentRanks,
        totalPoints: newPoints,
        stash: s.stash,
        relics: s.relics,
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
    clearRelicToast: () => set({ relicDropToast: null }),

    setShardsAdd: (n: number) => {
      const s = get();
      const newShards = s.shards + n;
      set({ shards: newShards });
      persist({ shards: newShards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: s.stash, relics: s.relics });
    },
    addInventoryItem: (it: Item, consumeLegendary?: boolean) => {
      const s = get();
      set({
        inventory: [...s.inventory, it],
        log: [...s.log, `+ Looted ${it.name} (${it.rarity})`].slice(-30),
        nextDropLegendary: consumeLegendary ? false : s.nextDropLegendary,
      });
    },

    stashItem: (id: string) => {
      const s = get();
      const it = s.inventory.find((i) => i.id === id);
      if (!it) return;
      const newInv = s.inventory.filter((i) => i.id !== id);
      const newStash = [...s.stash, it];
      set({ inventory: newInv, stash: newStash });
      persist({ shards: s.shards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: newStash, relics: s.relics });
    },
    withdrawStash: (id: string) => {
      const s = get();
      const it = s.stash.find((i) => i.id === id);
      if (!it || !s.inRun) return;
      const newStash = s.stash.filter((i) => i.id !== id);
      set({ inventory: [...s.inventory, it], stash: newStash });
      persist({ shards: s.shards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: newStash, relics: s.relics });
    },

    playCard: (idx: number) => {
      const s = get();
      const card = s.hand[idx];
      if (!card) return;
      if (!s.inCombat) {
        set({ log: [...s.log, "Not in combat."] });
        return;
      }
      if (s.player.energy < card.cost) {
        set({ log: [...s.log, "Not enough energy."] });
        return;
      }
      const totalAtk = s.player.atk + s.buffs.atk;
      const critChance = s.player.crit + s.buffs.crit;
      const stats = computeStats(s);
      const lifestealPct = stats.lifesteal;
      let enemies = [...s.enemies];
      const log = [...s.log];
      let healFromLifesteal = 0;

      const dealDamage = (target: number, baseDmg: number) => {
        const isCrit = Math.random() * 100 < critChance;
        const dmg = Math.round((baseDmg + totalAtk) * (isCrit ? 2 : 1));
        const e = enemies[target];
        if (!e) return;
        e.hp -= dmg;
        if (lifestealPct > 0) healFromLifesteal += (dmg * lifestealPct) / 100;
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
      const healFromCard = card.heal || 0;
      const totalHeal = Math.round(healFromLifesteal) + healFromCard;
      const newHp = Math.min(s.player.maxHp, s.player.hp + totalHeal);
      if (healFromCard > 0) log.push(`→ ${card.name} healed ${healFromCard} HP.`);
      else if (totalHeal > 0) log.push(`→ Lifesteal restored ${totalHeal} HP.`);

      // StS-style exhaust: card goes to exhaust pile (returns to deck on combat end)
      const isExhaust = !!card.exhaust;
      const newDiscard = isExhaust ? s.discard : [...s.discard, card];
      const newExhaust = isExhaust ? [...s.exhaust, card] : s.exhaust;
      if (isExhaust) log.push(`→ ${card.name} exhausted (back next combat).`);

      set({
        hand: newHand,
        discard: newDiscard,
        exhaust: newExhaust,
        enemies,
        player: { ...s.player, hp: newHp, energy: s.player.energy - card.cost, block },
        buffs,
        log: log.slice(-30),
      });

      if (enemies.length === 0) {
        get().winWave();
      }
    },

    endTurn: () => {
      const s = get();
      if (!s.inRun || !s.inCombat) return;
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
          rewardChoices: null,
          log: [...s.log, `+ Added ${c.name} to deck.`],
        });
      } else {
        set({ rewardChoices: null });
      }
      const ns = get();
      if (!ns.rewardChoices && !ns.itemReward) get().advancePath();
    },

    takeItemReward: () => {
      const s = get();
      if (!s.itemReward) return;
      set({ inventory: [...s.inventory, s.itemReward], itemReward: null, log: [...s.log, `+ Looted ${s.itemReward.name}.`] });
      const ns = get();
      if (!ns.rewardChoices && !ns.itemReward) get().advancePath();
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
      persist({ shards: newShards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: newStash, relics: s.relics });
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
      persist({ shards: s.shards, talentRanks: newRanks, totalPoints: newPoints, stash: s.stash, relics: s.relics });
    },

    refundAllTalents: () => {
      const s = get();
      const cost = 25;
      if (s.shards < cost) return;
      const refunded = Object.values(s.talentRanks).reduce((a: number, b) => a + (b as number), 0);
      const newPoints = s.totalPoints + refunded;
      const newShards = s.shards - cost;
      set({ talentRanks: {}, totalPoints: newPoints, shards: newShards });
      persist({ shards: newShards, talentRanks: {}, totalPoints: newPoints, stash: s.stash, relics: s.relics });
    },

    tick: () => {
      const s = get();
      if (!s.inRun) return;
      // Pause card-mode advancement if any started CLI is idle.
      if (isAnyCliIdle({ sessions: s.sessions })) return;
      const newComboTimer = s.comboTimer + 1;
      let combo = s.combo;
      if (newComboTimer % 30 === 0) combo += 1;
      set({ comboTimer: newComboTimer, combo });
    },

    winWave: () => {
      const s = get() as any;
      const stats = computeStats(s);
      const magicFind = stats.dropBonus + s.combo * 2;
      const node = s.path[s.pathIdx] as PathNode | undefined;
      const isBoss = node?.type === "boss";
      const isElite = node?.type === "elite";
      const log = [...s.log, `★ ${node?.type === "boss" ? "Boss" : node?.type === "elite" ? "Elite" : "Wave"} ${s.wave} cleared!`];
      const choices = shuffle(REWARD_POOL).slice(0, 3);
      let itemReward: Item | null = null;
      let consumedLegendary = false;
      if (isBoss || isElite || s.nextDropLegendary) {
        const force: Rarity | undefined = s.nextDropLegendary ? "legendary" : isBoss ? "rare" : undefined;
        itemReward = rollItem(s.wave, magicFind, force);
        if (s.nextDropLegendary) consumedLegendary = true;
      }
      if (consumedLegendary) log.push("⚡ Legendary drop triggered by your commit!");

      // --- Relic drop check ---
      let relicDrop: Relic | null = null;
      const dropChance = node?.type === "boss" ? 0.40
        : node?.type === "elite" ? 0.25
        : 0.25 + s.wave * 0.01;
      if (Math.random() < dropChance) {
        const rolled = rollRelic(s.wave);
        relicDrop = { ...rolled, id: `rel_${Math.random().toString(36).slice(2, 9)}` };
        log.push(`✦ Relic obtained: ${rolled.name}`);
      }

      // End combat: hand + discard + exhaust all return to master deck (StS-style).
      const path = s.path.map((n: PathNode, i: number) => i === s.pathIdx ? { ...n, cleared: true } : n);
      const newRelics = relicDrop ? [...s.relics, relicDrop] : s.relics;

      set({
        rewardChoices: choices,
        itemReward,
        relicDropToast: relicDrop,
        relics: newRelics,
        log: log.slice(-30),
        nextDropLegendary: consumedLegendary ? false : s.nextDropLegendary,
        inCombat: false,
        enemies: [],
        hand: [],
        draw: [],
        discard: [],
        exhaust: [],
        buffs: { atk: 0, crit: 0, turns: 0 },
        path,
      });

      if (isBoss) {
        const newShards = s.shards + 20;
        set({ shards: newShards });
        persist({ shards: newShards, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: s.stash, relics: get().relics });
      }
    },

    advancePath: () => {
      const s = get();
      if (!s.inRun) return;
      const nextIdx = s.pathIdx + 1;
      if (nextIdx >= s.path.length) {
        // Run complete!
        set({ log: [...s.log, "🏆 You conquered the path!"] });
        get().endRun();
        return;
      }
      const node = s.path[nextIdx];
      const baseSet: Partial<State> = { pathIdx: nextIdx, wave: node.wave };

      if (node.type === "enemy" || node.type === "elite" || node.type === "boss") {
        const enemies: Enemy[] =
          node.type === "boss"
            ? [rollEnemy(node.wave * 5)] // boss-tier scaling via mod-5 trick in rollEnemy
            : node.type === "elite"
              ? [rollEnemy(node.wave * 3)]
              : [rollEnemy(node.wave)];
        if (node.type === "enemy" && node.wave % 4 === 0) enemies.push(rollEnemy(node.wave));
        // Begin combat: shuffle deck into draw, reset buffs/block, deal opening hand.
        const draw = shuffle([...s.deck]);
        const hand: Card[] = [];
        const drawArr = [...draw];
        for (let i = 0; i < 5 && drawArr.length > 0; i++) hand.push(drawArr.shift()!);
        set({
          ...baseSet,
          inCombat: true,
          enemies,
          draw: drawArr,
          discard: [],
          exhaust: [],
          hand,
          turn: 1,
          buffs: { atk: 0, crit: 0, turns: 0 },
          player: { ...s.player, energy: s.player.maxEnergy, block: 0 },
          log: [...s.log, `⚔ ${node.type === "boss" ? "BOSS" : node.type === "elite" ? "Elite" : "Combat"} — Wave ${node.wave}`],
        } as any);
        return;
      }

      if (node.type === "rest") {
        set({ ...baseSet, pendingRest: true, log: [...s.log, `🔥 Rest site at wave ${node.wave}`] } as any);
        return;
      }

      if (node.type === "shop") {
        const cards = shuffle(REWARD_POOL).slice(0, 4);
        set({ ...baseSet, pendingShop: { cards, removeCost: 15 }, log: [...s.log, `🛒 Shop at wave ${node.wave}`] } as any);
        return;
      }

      // event
      const events = [
        {
          title: "Mysterious Console",
          desc: "An old terminal blinks in the dark. You can offer some HP for ether shards.",
          choices: [
            { label: "Sacrifice 8 HP → +12 ⟡", effect: () => {
              const ss = get();
              const newHp = Math.max(1, ss.player.hp - 8);
              const newSh = ss.shards + 12;
              set({ player: { ...ss.player, hp: newHp }, shards: newSh });
              persist({ shards: newSh, talentRanks: ss.talentRanks, totalPoints: ss.totalPoints, stash: ss.stash, relics: ss.relics });
            }},
            { label: "Leave", effect: () => {} },
          ],
        },
        {
          title: "Refactor Shrine",
          desc: "A shrine asks you to remove a card from your deck.",
          choices: [
            { label: "Remove a Strike", effect: () => {
              const ss = get();
              const idx = ss.deck.findIndex((c) => c.id.startsWith("strike"));
              if (idx >= 0) {
                const newDeck = ss.deck.filter((_, i) => i !== idx);
                set({ deck: newDeck, log: [...ss.log, "✦ A Strike was removed from your deck."] });
              }
            }},
            { label: "Leave", effect: () => {} },
          ],
        },
        {
          title: "Whispering Cache",
          desc: "A cache offers a random reward — or a curse.",
          choices: [
            { label: "Open it (50/50: +20 ⟡ or -10 HP)", effect: () => {
              const ss = get();
              if (Math.random() < 0.5) {
                const newSh = ss.shards + 20;
                set({ shards: newSh, log: [...ss.log, "✨ +20 ⟡!"] });
                persist({ shards: newSh, talentRanks: ss.talentRanks, totalPoints: ss.totalPoints, stash: ss.stash, relics: ss.relics });
              } else {
                const newHp = Math.max(1, ss.player.hp - 10);
                set({ player: { ...ss.player, hp: newHp }, log: [...ss.log, "💀 Cursed! -10 HP"] });
              }
            }},
            { label: "Leave", effect: () => {} },
          ],
        },
      ];
      const ev = events[Math.floor(Math.random() * events.length)];
      set({ ...baseSet, pendingEvent: ev, log: [...s.log, `❓ Event: ${ev.title}`] } as any);
    },

    chooseEventOption: (idx: number) => {
      const s = get();
      const ev = s.pendingEvent;
      if (!ev) return;
      ev.choices[idx]?.effect();
      set({ pendingEvent: null });
      get().advancePath();
    },

    doRest: (mode: "heal" | "upgrade") => {
      const s = get();
      if (!s.pendingRest) return;
      if (mode === "heal") {
        const heal = Math.floor(s.player.maxHp * 0.3);
        set({
          player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + heal) },
          pendingRest: false,
          log: [...s.log, `🔥 Rested. +${heal} HP.`],
        });
      } else {
        // "Upgrade": gain a free reward card (one of 3)
        const choices = shuffle(REWARD_POOL).slice(0, 3);
        set({ pendingRest: false, rewardChoices: choices, log: [...s.log, "✦ Smith — pick a free card."] });
        return;
      }
      get().advancePath();
    },

    closeShop: () => {
      set({ pendingShop: null });
      get().advancePath();
    },

    shopBuyCard: (c: Card) => {
      const s = get();
      const cost = 12;
      if (!s.pendingShop || s.shards < cost) return;
      const newSh = s.shards - cost;
      const newCards = s.pendingShop.cards.filter((x) => x !== c);
      set({
        shards: newSh,
        deck: [...s.deck, c],
        pendingShop: { ...s.pendingShop, cards: newCards },
        log: [...s.log, `🛒 Bought ${c.name} for ${cost} ⟡.`],
      });
      persist({ shards: newSh, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: s.stash, relics: s.relics });
    },

    shopRemoveCard: (cardId: string) => {
      const s = get();
      if (!s.pendingShop || s.shards < s.pendingShop.removeCost) return;
      const idx = s.deck.findIndex((c) => c.id === cardId);
      if (idx < 0) return;
      const newSh = s.shards - s.pendingShop.removeCost;
      const newDeck = s.deck.filter((_, i) => i !== idx);
      set({
        shards: newSh,
        deck: newDeck,
        log: [...s.log, `🗑 Removed a card for ${s.pendingShop.removeCost} ⟡.`],
      });
      persist({ shards: newSh, talentRanks: s.talentRanks, totalPoints: s.totalPoints, stash: s.stash, relics: s.relics });
    },
  } as any;
});

// ----- Markdown bootstrap -----
// Write the AI skill guide and hydrate from save.md if it exists.
void writeSkillMd();
void (async () => {
  const md = await readSaveMd();
  if (md) {
    useGame.setState({
      shards: md.shards ?? 0,
      talentRanks: md.talentRanks ?? {},
      totalPoints: md.totalPoints ?? 0,
      stash: md.stash ?? [],
    });
  }
})();

// Periodically mirror the live game state to state.md and flush log.md
if (typeof window !== "undefined") {
  setInterval(() => {
    const s = useGame.getState();
    void writeStateMd({
      inRun: s.inRun,
      wave: s.wave,
      hp: s.player.hp,
      maxHp: s.player.maxHp,
      combo: s.combo,
      cliStatus: s.cliStatus,
      enemies: s.enemies.map((e) => ({ name: e.name, hp: e.hp, maxHp: e.maxHp })),
      inventory: s.inventory,
      equipment: s.equipment as Record<string, Item | undefined>,
      recentEvents: s.recentEvents.map((e) => e.text),
    });
    void appendLogMd(s.log);
  }, 3000);
}
