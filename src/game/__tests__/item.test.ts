import { describe, it, expect } from "vitest";
import { AFFIX_POOL, RARITY_AFFIX_COUNT, ITEM_NAMES, rollRarity, RARITY_WEIGHT } from "../data";
import { rollItem } from "../store";
import type { Rarity } from "../types";

describe("Item System", () => {
  describe("AFFIX_POOL", () => {
    it("should have affixes with valid structure", () => {
      for (const affix of AFFIX_POOL) {
        expect(affix.id).toBeTruthy();
        expect(affix.text).toBeTruthy();
      }
    });

    it("should have stat affixes and mode affixes", () => {
      const statAffixes = AFFIX_POOL.filter(
        (a) => a.atk !== undefined || a.hp !== undefined || a.crit !== undefined
      );
      const modeAffixes = AFFIX_POOL.filter(
        (a) => a.fireMode !== undefined || a.fireRate !== undefined
      );
      expect(statAffixes.length).toBeGreaterThan(0);
      expect(modeAffixes.length).toBeGreaterThan(0);
    });
  });

  describe("RARITY_AFFIX_COUNT", () => {
    it("common should have 0 affixes", () => {
      expect(RARITY_AFFIX_COUNT.common).toBe(0);
    });

    it("magic should have 1 affix", () => {
      expect(RARITY_AFFIX_COUNT.magic).toBe(1);
    });

    it("rare should have 2 affixes", () => {
      expect(RARITY_AFFIX_COUNT.rare).toBe(2);
    });

    it("set should have 3 affixes", () => {
      expect(RARITY_AFFIX_COUNT.set).toBe(3);
    });

    it("legendary should have 4 affixes", () => {
      expect(RARITY_AFFIX_COUNT.legendary).toBe(4);
    });
  });

  describe("ITEM_NAMES", () => {
    it("should have names for all equipment slots", () => {
      const slots = ["weapon", "armor", "helm", "boots", "ring", "amulet"];
      for (const slot of slots) {
        expect(ITEM_NAMES[slot]).toBeDefined();
        expect(ITEM_NAMES[slot].length).toBeGreaterThan(0);
      }
    });
  });

  describe("rollRarity()", () => {
    it("should return a valid rarity", () => {
      const validRarities: Rarity[] = ["common", "magic", "rare", "set", "legendary"];
      for (let i = 0; i < 100; i++) {
        const rarity = rollRarity(0);
        expect(validRarities).toContain(rarity);
      }
    });

    it("should return mostly common with no magic find (statistical)", () => {
      const counts = { common: 0, magic: 0, rare: 0, set: 0, legendary: 0 };
      for (let i = 0; i < 1000; i++) {
        counts[rollRarity(0)]++;
      }
      expect(counts.common).toBeGreaterThan(500); // >50%
    });

    it("higher magic find should increase rare+ drops", () => {
      const countsNoFind = { rare: 0, legendary: 0 };
      const countsHighFind = { rare: 0, legendary: 0 };
      for (let i = 0; i < 1000; i++) {
        const r1 = rollRarity(0);
        const r2 = rollRarity(50); // high magic find
        if (r1 === "rare" || r1 === "legendary") countsNoFind[r1]++;
        if (r2 === "rare" || r2 === "legendary") countsHighFind[r2]++;
      }
      // High magic find should produce more rare/legendary
      const totalNoFind = countsNoFind.rare + countsNoFind.legendary;
      const totalHighFind = countsHighFind.rare + countsHighFind.legendary;
      expect(totalHighFind).toBeGreaterThanOrEqual(totalNoFind);
    });
  });

  describe("rollItem()", () => {
    it("should return an item with valid structure", () => {
      const item = rollItem(1, 0);
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.slot).toMatch(/^(weapon|armor|helm|boots|ring|amulet)$/);
      expect(item.rarity).toMatch(/^(common|magic|rare|set|legendary)$/);
      expect(Array.isArray(item.affixes)).toBe(true);
      expect(item.ilvl).toBe(1);
    });

    it("common items should have 0 affixes", () => {
      const item = rollItem(1, 0, "common");
      expect(item.rarity).toBe("common");
      expect(item.affixes.length).toBe(0);
    });

    it("magic items should have 1 affix", () => {
      const item = rollItem(1, 0, "magic");
      expect(item.rarity).toBe("magic");
      expect(item.affixes.length).toBe(1);
    });

    it("rare items should have 2 affixes", () => {
      const item = rollItem(1, 0, "rare");
      expect(item.rarity).toBe("rare");
      expect(item.affixes.length).toBe(2);
    });

    it("set items should have 3 affixes", () => {
      const item = rollItem(1, 0, "set");
      expect(item.rarity).toBe("set");
      expect(item.affixes.length).toBe(3);
    });

    it("legendary items should have 4 affixes", () => {
      const item = rollItem(1, 0, "legendary");
      expect(item.rarity).toBe("legendary");
      expect(item.affixes.length).toBe(4);
    });

    it("forced rarity should override magic find", () => {
      const item = rollItem(10, 100, "legendary");
      expect(item.rarity).toBe("legendary");
    });

    it("item name should match the slot's name pool", () => {
      const slots = ["weapon", "armor", "helm", "boots", "ring", "amulet"] as const;
      for (let i = 0; i < 50; i++) {
        const item = rollItem(1, 0);
        expect(slots).toContain(item.slot);
        const names = ITEM_NAMES[item.slot];
        expect(names).toContain(item.name);
      }
    });

    it("each item should have a unique id", () => {
      const items = Array.from({ length: 100 }, () => rollItem(1, 0));
      const ids = items.map((i) => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });
  });
});
