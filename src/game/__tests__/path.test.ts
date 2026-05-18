import { describe, it, expect } from "vitest";
import { generateRunPath, rollEnemy } from "../data";

describe("Run Path System", () => {
  describe("generateRunPath()", () => {
    it("should generate a path of specified length", () => {
      const path = generateRunPath(15);
      expect(path.length).toBe(15);
    });

    it("should always have boss at last position (wave 15)", () => {
      const path = generateRunPath(15);
      expect(path[14].type).toBe("boss");
      expect(path[14].wave).toBe(15);
    });

    it("should have every 5th wave as elite", () => {
      const path = generateRunPath(15);
      for (let i = 0; i < path.length; i++) {
        const wave = path[i].wave;
        if (wave === 15) continue; // boss
        if (wave % 5 === 0) {
          expect(path[i].type).toBe("elite");
        }
      }
    });

    it("should assign correct wave numbers", () => {
      const path = generateRunPath(15);
      for (let i = 0; i < path.length; i++) {
        expect(path[i].wave).toBe(i + 1);
      }
    });

    it("should only have enemy/elite/boss/event/rest/shop node types", () => {
      const path = generateRunPath(15);
      const validTypes = ["enemy", "elite", "boss", "event", "rest", "shop"];
      for (const node of path) {
        expect(validTypes).toContain(node.type);
      }
    });

    it("wave 1 should always be enemy", () => {
      const path = generateRunPath(15);
      expect(path[0].type).toBe("enemy");
      expect(path[0].wave).toBe(1);
    });

    it("nodes should have cleared property as undefined initially", () => {
      const path = generateRunPath(15);
      for (const node of path) {
        expect(node.cleared).toBeUndefined();
      }
    });
  });

  describe("rollEnemy()", () => {
    it("should return an enemy with valid structure", () => {
      const enemy = rollEnemy(1);
      expect(enemy.id).toBeTruthy();
      expect(enemy.name).toBeTruthy();
      expect(enemy.hp).toBeGreaterThan(0);
      expect(enemy.maxHp).toBe(enemy.hp);
      expect(enemy.atk).toBeGreaterThan(0);
      expect(enemy.rarity).toMatch(/^(common|rare|legendary)$/);
    });

    it("wave 5 should be boss (legendary)", () => {
      const boss = rollEnemy(5);
      expect(boss.rarity).toBe("legendary");
    });

    it("wave 3 should be elite (rare)", () => {
      const elite = rollEnemy(3);
      expect(elite.rarity).toBe("rare");
    });

    it("wave 1 should be common enemy", () => {
      const enemy = rollEnemy(1);
      expect(enemy.rarity).toBe("common");
    });

    it("boss should have more HP than elite", () => {
      const boss = rollEnemy(5);
      const elite = rollEnemy(3);
      const normal = rollEnemy(1);
      expect(boss.hp).toBeGreaterThan(elite.hp);
      expect(elite.hp).toBeGreaterThan(normal.hp);
    });

    it("boss intent should equal boss atk", () => {
      const boss = rollEnemy(5);
      expect(boss.intent).toBe(boss.atk);
    });

    it("HP and ATK should scale with wave", () => {
      const e1 = rollEnemy(1);
      const e10 = rollEnemy(10);
      expect(e10.hp).toBeGreaterThan(e1.hp);
      expect(e10.atk).toBeGreaterThan(e1.atk);
    });
  });
});
