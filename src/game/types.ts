export type CliStatus = "STREAMING" | "IDLE_WAITING" | "ERROR";

export type Rarity = "common" | "magic" | "rare" | "set" | "legendary";

export type FireMode = "normal" | "shotgun" | "burst" | "charge" | "aoe";
export type SkillKind = "nova" | "laser" | "missile" | "slow";

export type Affix = {
  id: string;
  text: string;
  // simple stat deltas
  atk?: number;
  hp?: number;
  crit?: number; // %
  dropBonus?: number; // %
  lifesteal?: number; // %
  // arena weapon/skill modifiers
  fireMode?: FireMode;
  fireRate?: number; // additive shots per second
  projSpeed?: number;
  range?: number;
  pierce?: number;
  skill?: SkillKind;
  skillCd?: number; // seconds
};

export type Item = {
  id: string;
  name: string;
  slot: "weapon" | "armor" | "ring" | "amulet" | "boots" | "helm";
  rarity: Rarity;
  affixes: Affix[];
  ilvl: number;
};

export type CardKind = "attack" | "spell" | "defense" | "buff";

export type Card = {
  id: string;
  name: string;
  kind: CardKind;
  cost: number;
  desc: string;
  damage?: number;
  block?: number;
  hits?: number;
  buff?: { atk?: number; crit?: number; turns: number };
};

export type Enemy = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  rarity: Rarity;
  intent: number; // damage they will do next turn
};

// In-run roguelike upgrade (Arena mode). Pure additive modifiers.
export type ArenaUpgrade = {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  // Stat deltas applied to the arena player loadout.
  atk?: number;
  hp?: number;
  crit?: number;
  speed?: number;
  fireRate?: number;
  projSpeed?: number;
  range?: number;
  pierce?: number;
  lifesteal?: number;        // % of damage healed
  magnet?: number;           // pickup radius bonus
  dmgMul?: number;           // multiplicative damage (1.1 = +10%)
  hpRegen?: number;          // per second
  // Granting / changing weapons & skills:
  setFireMode?: FireMode;
  grantSkill?: SkillKind;    // adds new skill if not present
  skillCdMul?: number;       // multiply all skill cooldowns (0.85 = -15% cd)
};

export type TalentNode = {
  id: string;
  name: string;
  desc: string;
  x: number;
  y: number;
  maxRank: number;
  requires?: string[];
  effect: {
    atk?: number;
    hp?: number;
    crit?: number;
    dropBonus?: number;
    energy?: number;
    lifesteal?: number;
    fireRate?: number;
    projSpeed?: number;
    range?: number;
    pierce?: number;
    speed?: number;
    skillCdMul?: number; // additive reduction per rank, e.g. 0.05 = -5% per rank
    magnet?: number;
    hpRegen?: number;
  };
};
