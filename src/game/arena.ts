// Item rolling helper shared by arena mode (mirrors store.rollItem).
import type { Item, Rarity } from "./types";
import { AFFIX_POOL, ITEM_NAMES, RARITY_AFFIX_COUNT, rollRarity } from "./data";

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
