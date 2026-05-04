import type { Affix, Card, Enemy, Rarity, TalentNode } from "./types";

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  magic: "Magic",
  rare: "Rare",
  set: "Set",
  legendary: "Legendary",
};

export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 60,
  magic: 25,
  rare: 10,
  set: 4,
  legendary: 1,
};

export const RARITY_AFFIX_COUNT: Record<Rarity, number> = {
  common: 0,
  magic: 1,
  rare: 2,
  set: 3,
  legendary: 4,
};

export const AFFIX_POOL: Affix[] = [
  { id: "atk1", text: "+4 Attack", atk: 4 },
  { id: "atk2", text: "+8 Attack", atk: 8 },
  { id: "atk3", text: "+14 Attack", atk: 14 },
  { id: "hp1", text: "+12 Max HP", hp: 12 },
  { id: "hp2", text: "+25 Max HP", hp: 25 },
  { id: "hp3", text: "+50 Max HP", hp: 50 },
  { id: "crit1", text: "+5% Crit", crit: 5 },
  { id: "crit2", text: "+12% Crit", crit: 12 },
  { id: "drop1", text: "+10% Magic Find", dropBonus: 10 },
  { id: "drop2", text: "+25% Magic Find", dropBonus: 25 },
  { id: "ls1", text: "+3% Lifesteal", lifesteal: 3 },
  { id: "ls2", text: "+8% Lifesteal", lifesteal: 8 },
  // weapon firing modes
  { id: "fm_shot", text: "Shotgun: 5-spread", fireMode: "shotgun" },
  { id: "fm_burst", text: "Burst: 3-round", fireMode: "burst" },
  { id: "fm_charge", text: "Charge Beam (heavy)", fireMode: "charge" },
  { id: "fm_aoe", text: "AOE Mortar", fireMode: "aoe" },
  // weapon stats
  { id: "rof1", text: "+0.6/s Fire Rate", fireRate: 0.6 },
  { id: "rof2", text: "+1.2/s Fire Rate", fireRate: 1.2 },
  { id: "ps1", text: "+120 Projectile Speed", projSpeed: 120 },
  { id: "rng1", text: "+80 Range", range: 80 },
  { id: "pi1", text: "Pierce +1", pierce: 1 },
  { id: "pi2", text: "Pierce +2", pierce: 2 },
  // active skills (auto-cast on cooldown)
  { id: "sk_nova", text: "Skill: Nova Burst", skill: "nova", skillCd: 6 },
  { id: "sk_laser", text: "Skill: Laser Sweep", skill: "laser", skillCd: 9 },
  { id: "sk_missile", text: "Skill: Homing Missiles", skill: "missile", skillCd: 5 },
  { id: "sk_slow", text: "Skill: Time Warp (slow)", skill: "slow", skillCd: 12 },
];

export const ITEM_NAMES: Record<string, string[]> = {
  weapon: ["Code Slicer", "Refactor Blade", "Null Pointer", "Recursion Edge", "Stack Smasher"],
  armor: ["Plate of Patches", "Hotfix Mail", "Compiled Cuirass"],
  helm: ["Helm of Linting", "Crown of Tokens"],
  boots: ["Async Striders", "Bootstraps"],
  ring: ["Ring of O(1)", "Loop Band"],
  amulet: ["Amulet of Context", "Pendant of Promise"],
};

export const STARTER_DECK: Card[] = [
  { id: "strike", name: "Strike", kind: "attack", cost: 1, desc: "Deal 6 damage.", damage: 6 },
  { id: "strike2", name: "Strike", kind: "attack", cost: 1, desc: "Deal 6 damage.", damage: 6 },
  { id: "strike3", name: "Strike", kind: "attack", cost: 1, desc: "Deal 6 damage.", damage: 6 },
  { id: "strike4", name: "Strike", kind: "attack", cost: 1, desc: "Deal 6 damage.", damage: 6 },
  { id: "guard1", name: "Guard", kind: "defense", cost: 1, desc: "Gain 5 Block.", block: 5 },
  { id: "guard2", name: "Guard", kind: "defense", cost: 1, desc: "Gain 5 Block.", block: 5 },
  { id: "guard3", name: "Guard", kind: "defense", cost: 1, desc: "Gain 5 Block.", block: 5 },
  { id: "fireball", name: "Fireball", kind: "spell", cost: 2, desc: "Deal 12 damage.", damage: 12 },
  { id: "rage", name: "Rage", kind: "buff", cost: 1, desc: "+4 ATK for 2 turns.", buff: { atk: 4, turns: 2 } },
  { id: "chain", name: "Chain Bolt", kind: "spell", cost: 2, desc: "3 hits of 4 damage.", damage: 4, hits: 3 },
];

export const REWARD_POOL: Card[] = [
  { id: "heavy", name: "Heavy Strike", kind: "attack", cost: 2, desc: "Deal 14 damage.", damage: 14 },
  { id: "bulwark", name: "Bulwark", kind: "defense", cost: 2, desc: "Gain 14 Block.", block: 14 },
  { id: "ignite", name: "Ignite", kind: "spell", cost: 1, desc: "Deal 8 damage.", damage: 8 },
  { id: "frenzy", name: "Frenzy", kind: "buff", cost: 1, desc: "+6 ATK, +10% Crit (2 turns).", buff: { atk: 6, crit: 10, turns: 2 } },
  { id: "volley", name: "Volley", kind: "spell", cost: 3, desc: "5 hits of 5 damage.", damage: 5, hits: 5 },
  { id: "execute", name: "Execute", kind: "attack", cost: 2, desc: "Deal 18 damage.", damage: 18 },
  { id: "barrier", name: "Barrier", kind: "defense", cost: 1, desc: "Gain 8 Block.", block: 8 },
  { id: "spark", name: "Spark", kind: "spell", cost: 0, desc: "Deal 3 damage.", damage: 3 },
];

const ENEMY_NAMES = ["Bug Sprite", "Null Wraith", "Memory Leak", "Race Condition", "Off-By-One"];
const ELITE_NAMES = ["Stack Overflow", "Heisenbug", "Deadlock Knight"];
const BOSS_NAMES = ["The Linter", "Compiler Demon", "Lord of Legacy Code"];

export function rollEnemy(wave: number): Enemy {
  const isBoss = wave > 0 && wave % 5 === 0;
  const isElite = !isBoss && wave % 3 === 0;
  const rarity: Rarity = isBoss ? "legendary" : isElite ? "rare" : "common";
  const name = isBoss
    ? BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]
    : isElite
      ? ELITE_NAMES[Math.floor(Math.random() * ELITE_NAMES.length)]
      : ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
  const base = 14 + wave * 6;
  const hp = isBoss ? base * 4 : isElite ? base * 2 : base;
  const atk = isBoss ? 8 + wave : isElite ? 5 + Math.floor(wave / 2) : 3 + Math.floor(wave / 3);
  return {
    id: `e_${wave}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    hp,
    maxHp: hp,
    atk,
    rarity,
    intent: atk,
  };
}

export function rollRarity(magicFind = 0): Rarity {
  const weights: [Rarity, number][] = [
    ["common", RARITY_WEIGHT.common - magicFind * 0.4],
    ["magic", RARITY_WEIGHT.magic + magicFind * 0.2],
    ["rare", RARITY_WEIGHT.rare + magicFind * 0.15],
    ["set", RARITY_WEIGHT.set + magicFind * 0.03],
    ["legendary", RARITY_WEIGHT.legendary + magicFind * 0.02],
  ];
  const total = weights.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let r = Math.random() * total;
  for (const [k, w] of weights) {
    r -= Math.max(0, w);
    if (r <= 0) return k;
  }
  return "common";
}

export const TALENT_TREE: TalentNode[] = [
  { id: "core", name: "Awakening", desc: "+5 Max HP per rank.", x: 50, y: 50, maxRank: 3, effect: { hp: 5 } },
  { id: "atk1", name: "Sharpened Mind", desc: "+1 Attack per rank.", x: 25, y: 30, maxRank: 5, requires: ["core"], effect: { atk: 1 } },
  { id: "atk2", name: "Critical Insight", desc: "+2% Crit per rank.", x: 10, y: 15, maxRank: 5, requires: ["atk1"], effect: { crit: 2 } },
  { id: "hp1", name: "Iron Will", desc: "+8 Max HP per rank.", x: 75, y: 30, maxRank: 5, requires: ["core"], effect: { hp: 8 } },
  { id: "hp2", name: "Stalwart", desc: "+15 Max HP per rank.", x: 90, y: 15, maxRank: 5, requires: ["hp1"], effect: { hp: 15 } },
  { id: "drop1", name: "Greedy Eye", desc: "+5% Magic Find per rank.", x: 25, y: 75, maxRank: 5, requires: ["core"], effect: { dropBonus: 5 } },
  { id: "drop2", name: "Treasure Hunter", desc: "+10% Magic Find per rank.", x: 10, y: 90, maxRank: 5, requires: ["drop1"], effect: { dropBonus: 10 } },
  { id: "energy", name: "Overclock", desc: "+1 starting Energy per rank.", x: 75, y: 75, maxRank: 2, requires: ["core"], effect: { energy: 1 } },
  { id: "energy2", name: "Flow State", desc: "+1 Energy & +5% Crit.", x: 90, y: 90, maxRank: 1, requires: ["energy"], effect: { energy: 1, crit: 5 } },
];
