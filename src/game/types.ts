export type CliStatus = "STREAMING" | "IDLE_WAITING" | "ERROR";

export type CliSession = {
  id: string;
  label: string;
  status: CliStatus;
  hasStarted: boolean;     // true once user has spawned this PTY at least once
  lastActivityTs: number;  // ms since epoch — last time we saw STREAMING
  command: string;         // shell command (e.g. "claude")
  cwd: string;             // working directory for this session
};

// =====================================================================
// Mythic+ style global affix system (inspired by WoW Mythic Keystones).
// Affixes apply to every enemy & the arena globally; difficulty scales
// with `mythicLevel`. Higher level → more affixes + multipliers.
// =====================================================================
export type MythicAffixId =
  | "fortified"   // minions +50% HP
  | "tyrannical"  // bosses/elites +30% HP, +15% dmg
  | "raging"      // enemies <50% HP get +50% atk speed (here: +50% move speed)
  | "bursting"    // on death, leaves a small AOE that damages player
  | "volcanic"    // periodic ground AOEs (warning then dmg)
  | "necrotic"    // melee hits stack a HoT debuff (dmg/sec)
  | "sanguine"    // dead enemies leave healing pools that also slow player
  | "bolstering"  // killing a minion buffs nearby allies (+atk, +hp)
  | "explosive"   // periodically spawns explosive orbs the player must shoot
  | "quaking"     // periodic shockwaves around player slow & damage
  | "spiteful"    // when an enemy dies, spawns a fast spite shade
  | "afflicted";  // periodic curses tick player HP

export type MythicAffix = {
  id: MythicAffixId;
  name: string;
  desc: string;
  unlockLevel: number; // appears at this mythic level and above
  // tuning hints (read by ArenaStage)
  enemyHpMul?: number;
  enemyAtkMul?: number;
  enemySpeedMul?: number;
  bossExtraHpMul?: number;
  bossExtraAtkMul?: number;
};

export type Rarity = "common" | "magic" | "rare" | "set" | "legendary";

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
  exhaust?: boolean;            // StS-style: removed from combat after play; returns to deck next combat
  heal?: number;                // self-heal on play (used by some exhaust cards)
};

// Slay-the-Spire style path node.
export type PathNodeType = "enemy" | "elite" | "boss" | "event" | "rest" | "shop";
export type PathNode = {
  type: PathNodeType;
  wave: number;     // 1-indexed position in the run
  cleared?: boolean;
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
