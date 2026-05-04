import type { Affix, ArenaUpgrade, Card, Enemy, MythicAffix, Rarity, TalentNode } from "./types";

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

// =====================================================================
// TALENT TREE — Engineer
// Layout (% positions): center hub at 50/50; 4 quadrants ring outward.
//   ↖ Offense    ↗ Defense
//   ↙ Greed      ↘ Arena/Tech
// =====================================================================
export const TALENT_TREE: TalentNode[] = [
  // Hub
  { id: "core", name: "Awakening", desc: "+8 Max HP, +1 ATK per rank.", x: 50, y: 50, maxRank: 3, effect: { hp: 8, atk: 1 } },

  // ↖ Offense
  { id: "atk1", name: "Sharpened Mind", desc: "+1 ATK per rank.", x: 38, y: 38, maxRank: 5, requires: ["core"], effect: { atk: 1 } },
  { id: "atk2", name: "Power Surge", desc: "+2 ATK per rank.", x: 28, y: 28, maxRank: 5, requires: ["atk1"], effect: { atk: 2 } },
  { id: "crit1", name: "Critical Insight", desc: "+2% Crit per rank.", x: 18, y: 38, maxRank: 5, requires: ["atk1"], effect: { crit: 2 } },
  { id: "crit2", name: "Lethal Strike", desc: "+3% Crit per rank.", x: 8, y: 28, maxRank: 5, requires: ["crit1"], effect: { crit: 3 } },
  { id: "lifesteal1", name: "Vampiric Code", desc: "+2% Lifesteal per rank.", x: 18, y: 18, maxRank: 4, requires: ["atk2", "crit1"], effect: { lifesteal: 2 } },
  { id: "exec", name: "Executioner", desc: "+3 ATK & +3% Crit per rank.", x: 5, y: 8, maxRank: 2, requires: ["crit2", "lifesteal1"], effect: { atk: 3, crit: 3 } },

  // ↗ Defense
  { id: "hp1", name: "Iron Will", desc: "+12 Max HP per rank.", x: 62, y: 38, maxRank: 5, requires: ["core"], effect: { hp: 12 } },
  { id: "hp2", name: "Stalwart", desc: "+20 Max HP per rank.", x: 72, y: 28, maxRank: 5, requires: ["hp1"], effect: { hp: 20 } },
  { id: "regen1", name: "Auto-Heal", desc: "+0.5 HP regen / sec per rank.", x: 82, y: 38, maxRank: 5, requires: ["hp1"], effect: { hpRegen: 0.5 } },
  { id: "regen2", name: "Adaptive Patch", desc: "+1 HP regen / sec per rank.", x: 92, y: 28, maxRank: 4, requires: ["regen1"], effect: { hpRegen: 1 } },
  { id: "fortress", name: "Fortress", desc: "+30 HP & +1 HP regen.", x: 95, y: 8, maxRank: 2, requires: ["hp2", "regen2"], effect: { hp: 30, hpRegen: 1 } },

  // ↙ Greed / Resource
  { id: "drop1", name: "Greedy Eye", desc: "+5% Magic Find per rank.", x: 38, y: 62, maxRank: 5, requires: ["core"], effect: { dropBonus: 5 } },
  { id: "drop2", name: "Treasure Hunter", desc: "+10% Magic Find per rank.", x: 28, y: 72, maxRank: 5, requires: ["drop1"], effect: { dropBonus: 10 } },
  { id: "energy", name: "Overclock", desc: "+1 starting Energy per rank.", x: 18, y: 62, maxRank: 2, requires: ["core"], effect: { energy: 1 } },
  { id: "energy2", name: "Flow State", desc: "+1 Energy & +5% Crit.", x: 8, y: 72, maxRank: 1, requires: ["energy"], effect: { energy: 1, crit: 5 } },
  { id: "magnet", name: "Loot Magnet", desc: "+25 pickup radius per rank.", x: 18, y: 82, maxRank: 4, requires: ["drop1"], effect: { magnet: 25 } },
  { id: "midas", name: "Midas Touch", desc: "+15% Magic Find & +1 Energy.", x: 5, y: 92, maxRank: 1, requires: ["drop2", "magnet"], effect: { dropBonus: 15, energy: 1 } },

  // ↘ Arena / Tech
  { id: "rof1", name: "Rapid Fire", desc: "+0.3/s Fire Rate per rank.", x: 62, y: 62, maxRank: 5, requires: ["core"], effect: { fireRate: 0.3 } },
  { id: "rof2", name: "Hyper Trigger", desc: "+0.6/s Fire Rate per rank.", x: 72, y: 72, maxRank: 4, requires: ["rof1"], effect: { fireRate: 0.6 } },
  { id: "speed1", name: "Light Boots", desc: "+12 Move Speed per rank.", x: 82, y: 62, maxRank: 5, requires: ["core"], effect: { speed: 12 } },
  { id: "range1", name: "Long Sights", desc: "+30 Range per rank.", x: 92, y: 72, maxRank: 4, requires: ["speed1"], effect: { range: 30 } },
  { id: "pierce1", name: "Sharp Rounds", desc: "+1 Pierce per rank.", x: 72, y: 82, maxRank: 3, requires: ["rof1"], effect: { pierce: 1 } },
  { id: "skillcd", name: "Cooldown Hacker", desc: "−5% Skill CD per rank.", x: 62, y: 82, maxRank: 5, requires: ["rof1"], effect: { skillCdMul: 0.05 } },
  { id: "tech_master", name: "Tech Master", desc: "+1 Pierce, +0.6/s RoF, −10% Skill CD.", x: 95, y: 92, maxRank: 1, requires: ["rof2", "range1", "pierce1", "skillcd"], effect: { pierce: 1, fireRate: 0.6, skillCdMul: 0.10 } },
];

// =====================================================================
// In-run roguelike upgrades for Arena (Brotato / Vampire Survivors style)
// =====================================================================
export const ARENA_UPGRADES: ArenaUpgrade[] = [
  { id: "u_atk_s", name: "Sharper Code",  rarity: "common", desc: "+3 Damage", atk: 3 },
  { id: "u_atk_m", name: "Optimised Loop", rarity: "magic", desc: "+6 Damage", atk: 6 },
  { id: "u_atk_l", name: "Vectorised Math", rarity: "rare", desc: "+12 Damage", atk: 12 },
  { id: "u_dmg_pct", name: "Algorithm O(1)", rarity: "rare", desc: "+15% All Damage", dmgMul: 1.15 },
  { id: "u_crit_s", name: "Edge Case Hunter", rarity: "common", desc: "+4% Crit", crit: 4 },
  { id: "u_crit_m", name: "Pattern Match", rarity: "magic", desc: "+8% Crit", crit: 8 },

  { id: "u_rof_s", name: "JIT Compile", rarity: "common", desc: "+0.5/s Fire Rate", fireRate: 0.5 },
  { id: "u_rof_m", name: "Hot Path", rarity: "magic", desc: "+1.0/s Fire Rate", fireRate: 1.0 },
  { id: "u_pspd", name: "Async Bullets", rarity: "common", desc: "+120 Projectile Speed", projSpeed: 120 },
  { id: "u_range", name: "Eagle Linter", rarity: "common", desc: "+80 Range", range: 80 },
  { id: "u_pierce", name: "Pointer Pierce", rarity: "magic", desc: "+1 Pierce", pierce: 1 },
  { id: "u_pierce2", name: "Recursive Bullets", rarity: "rare", desc: "+2 Pierce, +60 Range", pierce: 2, range: 60 },

  { id: "u_hp_s", name: "Garbage Collect", rarity: "common", desc: "+20 Max HP", hp: 20 },
  { id: "u_hp_m", name: "Memory Pool", rarity: "magic", desc: "+40 Max HP", hp: 40 },
  { id: "u_regen", name: "Hot Reload", rarity: "magic", desc: "+1 HP / sec", hpRegen: 1 },
  { id: "u_regen2", name: "Live Patching", rarity: "rare", desc: "+2 HP / sec, +20 HP", hpRegen: 2, hp: 20 },
  { id: "u_lifesteal", name: "Vampire Compiler", rarity: "rare", desc: "+5% Lifesteal", lifesteal: 5 },
  { id: "u_speed", name: "Cache Locality", rarity: "common", desc: "+25 Move Speed", speed: 25 },
  { id: "u_speed2", name: "SIMD Stride", rarity: "magic", desc: "+45 Move Speed, +0.3/s RoF", speed: 45, fireRate: 0.3 },
  { id: "u_magnet", name: "Loot Magnet", rarity: "common", desc: "+30 Pickup Radius", magnet: 30 },

  // Weapon-changing
  { id: "u_w_shotgun", name: "★ Buckshot Compiler", rarity: "legendary", desc: "Switch to Shotgun (5-spread)", setFireMode: "shotgun" },
  { id: "u_w_burst",   name: "★ Burst Stream",      rarity: "legendary", desc: "Switch to 3-round Burst", setFireMode: "burst" },
  { id: "u_w_charge",  name: "★ Plasma Compiler",   rarity: "legendary", desc: "Switch to Charge Beam", setFireMode: "charge" },
  { id: "u_w_aoe",     name: "★ Mortar Lobber",     rarity: "legendary", desc: "Switch to AOE Mortar", setFireMode: "aoe" },

  // Skill grants
  { id: "u_sk_nova",    name: "✦ Skill: Nova",      rarity: "set", desc: "Unlock Nova Burst (CD 6s)",     grantSkill: "nova" },
  { id: "u_sk_laser",   name: "✦ Skill: Laser",     rarity: "set", desc: "Unlock Laser Sweep (CD 9s)",    grantSkill: "laser" },
  { id: "u_sk_missile", name: "✦ Skill: Missiles",  rarity: "set", desc: "Unlock Homing Missiles (CD 5s)", grantSkill: "missile" },
  { id: "u_sk_slow",    name: "✦ Skill: Time Warp", rarity: "set", desc: "Unlock Time Warp (CD 12s)",     grantSkill: "slow" },
  { id: "u_skcd",       name: "Cool Mind",           rarity: "magic", desc: "−15% all Skill cooldowns", skillCdMul: 0.85 },
];

export function rollArenaUpgrades(magicFind: number, count = 3): ArenaUpgrade[] {
  const w: Record<Rarity, number> = {
    common: Math.max(1, 50 - magicFind * 0.4),
    magic: 30 + magicFind * 0.2,
    rare: 14 + magicFind * 0.15,
    set: 5 + magicFind * 0.05,
    legendary: 2 + magicFind * 0.03,
  };
  const pool = [...ARENA_UPGRADES];
  const picked: ArenaUpgrade[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = pool.reduce((s, u) => s + (w[u.rarity] || 0), 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= w[pool[j].rarity] || 0;
      if (r <= 0) { idx = j; break; }
    }
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

