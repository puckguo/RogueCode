export type CliStatus = "STREAMING" | "IDLE_WAITING" | "ERROR";

export type Rarity = "common" | "magic" | "rare" | "set" | "legendary";

export type Affix = {
  id: string;
  text: string;
  // simple stat deltas
  atk?: number;
  hp?: number;
  crit?: number; // %
  dropBonus?: number; // %
  lifesteal?: number; // %
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

export type TalentNode = {
  id: string;
  name: string;
  desc: string;
  x: number;
  y: number;
  maxRank: number;
  requires?: string[];
  effect: { atk?: number; hp?: number; crit?: number; dropBonus?: number; energy?: number };
};
