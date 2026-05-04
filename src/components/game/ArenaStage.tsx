import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/game/store";
import { rollItem } from "@/game/arena";
import { rollArenaUpgrades } from "@/game/data";
import type { ArenaUpgrade, FireMode, Item, Rarity, SkillKind } from "@/game/types";

type Vec = { x: number; y: number };
type Entity = Vec & { id: number; hp: number; maxHp: number; r: number };
type Bullet = Vec & {
  vx: number; vy: number; dmg: number; life: number; crit: boolean;
  pierce: number; aoe?: number; color?: string; size?: number;
};
type Enemy = Entity & { atk: number; speed: number; tier: "minion" | "elite" | "boss"; slow: number };
type Pickup = Vec & { id: number; kind: "shard" | "heal" };
type Fx = Vec & { id: number; r: number; maxR: number; life: number; maxLife: number; color: string };
type SkillState = { kind: SkillKind; cd: number; max: number; ready: number };

const ARENA_W = 900;
const ARENA_H = 540;

let _id = 1;
const nextId = () => _id++;

type DerivedLoadout = {
  fireMode: FireMode;
  fireRate: number;
  projSpeed: number;
  range: number;
  pierce: number;
  dmgMul: number;
  magnet: number;        // pickup-magnet radius bonus
  hpRegen: number;       // hp/sec
  lifesteal: number;     // %
  speedBonus: number;    // additive move speed
  skills: SkillState[];
};

function deriveLoadout(
  equipment: Record<string, Item | undefined>,
  talentRanks: Record<string, number>,
  runUpgrades: ArenaUpgrade[],
): DerivedLoadout {
  let fireMode: FireMode = "normal";
  let fireRate = 2.5;
  let projSpeed = 480;
  let range = 320;
  let pierce = 0;
  let dmgMul = 1;
  let magnet = 0;
  let hpRegen = 0;
  let lifesteal = 0;
  let speedBonus = 0;
  let skillCdMul = 1; // multiplier; 0.85 = -15% cd

  const skillEntries: Array<{ kind: SkillKind; cd: number }> = [];

  // Equipment affixes
  for (const it of Object.values(equipment)) {
    if (!it) continue;
    for (const a of it.affixes) {
      if (a.fireMode) fireMode = a.fireMode;
      if (a.fireRate) fireRate += a.fireRate;
      if (a.projSpeed) projSpeed += a.projSpeed;
      if (a.range) range += a.range;
      if (a.pierce) pierce += a.pierce;
      if (a.lifesteal) lifesteal += a.lifesteal;
      if (a.skill && a.skillCd) skillEntries.push({ kind: a.skill, cd: a.skillCd });
    }
  }

  // Talents
  for (const [id, rank] of Object.entries(talentRanks)) {
    if (!rank) continue;
    // Match by id prefix → known effects (mirrors data.ts)
    // We rely on effect carried via the actual TALENT_TREE walk instead — see below.
  }
  // Use the actual TALENT_TREE-resolved effects via dynamic import-free lookup.
  // (We import TALENT_TREE only to read effects — but to avoid a circular import here,
  // we do a tiny inline walk via a list of known effect keys.)
  // Simpler: re-import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TALENT_TREE } = require("@/game/data") as typeof import("@/game/data");
  for (const node of TALENT_TREE) {
    const r = talentRanks[node.id] || 0;
    if (!r) continue;
    fireRate += (node.effect.fireRate || 0) * r;
    projSpeed += (node.effect.projSpeed || 0) * r;
    range += (node.effect.range || 0) * r;
    pierce += (node.effect.pierce || 0) * r;
    speedBonus += (node.effect.speed || 0) * r;
    magnet += (node.effect.magnet || 0) * r;
    hpRegen += (node.effect.hpRegen || 0) * r;
    lifesteal += (node.effect.lifesteal || 0) * r;
    skillCdMul *= 1 - (node.effect.skillCdMul || 0) * r;
  }

  // In-run upgrades
  for (const u of runUpgrades) {
    if (u.fireRate) fireRate += u.fireRate;
    if (u.projSpeed) projSpeed += u.projSpeed;
    if (u.range) range += u.range;
    if (u.pierce) pierce += u.pierce;
    if (u.dmgMul) dmgMul *= u.dmgMul;
    if (u.magnet) magnet += u.magnet;
    if (u.hpRegen) hpRegen += u.hpRegen;
    if (u.lifesteal) lifesteal += u.lifesteal;
    if (u.speed) speedBonus += u.speed;
    if (u.setFireMode) fireMode = u.setFireMode;
    if (u.skillCdMul) skillCdMul *= u.skillCdMul;
    if (u.grantSkill) {
      const cd = u.grantSkill === "missile" ? 5 : u.grantSkill === "nova" ? 6 : u.grantSkill === "laser" ? 9 : 12;
      skillEntries.push({ kind: u.grantSkill, cd });
    }
  }

  // Dedupe skills by kind (keep min cd) and apply skillCdMul
  const byKind = new Map<SkillKind, number>();
  for (const sk of skillEntries) {
    const cur = byKind.get(sk.kind);
    byKind.set(sk.kind, cur === undefined ? sk.cd : Math.min(cur, sk.cd));
  }
  const skills: SkillState[] = Array.from(byKind.entries()).map(([kind, cd]) => ({
    kind, cd: 0, max: Math.max(1, cd * skillCdMul), ready: 1,
  }));

  return { fireMode, fireRate, projSpeed, range, pierce, dmgMul, magnet, hpRegen, lifesteal, speedBonus, skills };
}

const SKILL_LABEL: Record<SkillKind, { name: string; icon: string }> = {
  nova: { name: "Nova", icon: "✦" },
  laser: { name: "Laser", icon: "═" },
  missile: { name: "Missiles", icon: "➹" },
  slow: { name: "Time Warp", icon: "⧖" },
};

const FIRE_LABEL: Record<FireMode, string> = {
  normal: "Single",
  shotgun: "Shotgun",
  burst: "Burst",
  charge: "Charge",
  aoe: "AOE Mortar",
};

export function ArenaStage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    cliStatus,
    inRun,
    startRun,
    endRun,
    nextDropLegendary,
    talentRanks,
    equipment,
    setShardsAdd,
    addInventoryItem,
  } = useGame() as any;

  // In-run upgrades chosen between waves (Brotato style).
  const [runUpgrades, setRunUpgrades] = useState<ArenaUpgrade[]>([]);
  const [upgradeChoices, setUpgradeChoices] = useState<ArenaUpgrade[] | null>(null);

  const loadout = useMemo(
    () => deriveLoadout(equipment, talentRanks, runUpgrades),
    [equipment, talentRanks, runUpgrades],
  );

  const stateRef = useRef({
    player: {
      x: ARENA_W / 2, y: ARENA_H / 2, hp: 100, maxHp: 100, r: 14,
      speed: 180, atk: 8, crit: 5, fireCd: 0, chargeT: 0,
    },
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    pickups: [] as Pickup[],
    fx: [] as Fx[],
    keys: {} as Record<string, boolean>,
    waveTime: 0,
    waveDuration: 25,
    wave: 1,
    spawnCd: 0,
    pendingReward: false,
    runShards: 0,
    kills: 0,
    skills: [] as SkillState[],
    loadoutSig: "",
  });

  const [, setTick] = useState(0);
  const force = () => setTick((t) => (t + 1) % 1000000);

  // Sync derived stats from talents + equipment + in-run upgrades
  useEffect(() => {
    const s = stateRef.current.player;
    let atk = 8;
    let hp = 100;
    let crit = 5;
    for (const it of Object.values(equipment) as any[]) {
      if (!it) continue;
      for (const a of it.affixes) {
        atk += a.atk || 0;
        hp += a.hp || 0;
        crit += a.crit || 0;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TALENT_TREE } = require("@/game/data") as typeof import("@/game/data");
    for (const node of TALENT_TREE) {
      const r = (talentRanks as Record<string, number>)[node.id] || 0;
      if (!r) continue;
      atk += (node.effect.atk || 0) * r;
      hp += (node.effect.hp || 0) * r;
      crit += (node.effect.crit || 0) * r;
    }
    for (const u of runUpgrades) {
      atk += u.atk || 0;
      hp += u.hp || 0;
      crit += u.crit || 0;
    }
    s.atk = Math.round(atk * loadout.dmgMul);
    s.maxHp = hp;
    if (!s.hp) s.hp = hp;
    s.hp = Math.min(s.hp, hp);
    s.crit = crit;
    s.speed = 180 + loadout.speedBonus;

    const sig = loadout.skills.map((sk) => `${sk.kind}:${sk.max}`).join("|");
    if (sig !== stateRef.current.loadoutSig) {
      const prev = stateRef.current.skills;
      stateRef.current.skills = loadout.skills.map((sk) => {
        const old = prev.find((p) => p.kind === sk.kind);
        return old ? { ...sk, cd: Math.min(old.cd, sk.max) } : { ...sk };
      });
      stateRef.current.loadoutSig = sig;
    }
  }, [equipment, talentRanks, loadout, runUpgrades]);

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => { stateRef.current.keys[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { stateRef.current.keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;
      const paused = !inRun || cliStatus !== "STREAMING" || st.pendingReward || !!upgradeChoices;
      if (!paused) step(dt);
      draw();
      force();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRun, cliStatus, upgradeChoices]);

  function fireWeapon(angOverride?: number) {
    const st = stateRef.current;
    const p = st.player;
    const target = nearestEnemy(p, loadout.range);
    const ang = angOverride ?? (target ? Math.atan2(target.y - p.y, target.x - p.x) : 0);
    if (!target && angOverride === undefined) return false;
    const isCrit = Math.random() * 100 < p.crit;
    const baseDmg = Math.round(p.atk * (isCrit ? 2 : 1));
    const mode = loadout.fireMode;

    const mk = (a: number, dmgMul = 1, opts: Partial<Bullet> = {}) => {
      st.bullets.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * loadout.projSpeed,
        vy: Math.sin(a) * loadout.projSpeed,
        dmg: Math.max(1, Math.round(baseDmg * dmgMul)),
        life: loadout.range / loadout.projSpeed,
        crit: isCrit,
        pierce: loadout.pierce,
        ...opts,
      });
    };

    if (mode === "shotgun") {
      const n = 5;
      const spread = 0.5;
      for (let i = 0; i < n; i++) {
        const a = ang + ((i - (n - 1) / 2) / (n - 1)) * spread;
        mk(a, 0.55);
      }
    } else if (mode === "burst") {
      // 3-round burst with small delay
      mk(ang, 0.7);
      setTimeout(() => { if (stateRef.current.player.hp > 0) mk(ang, 0.7); }, 80);
      setTimeout(() => { if (stateRef.current.player.hp > 0) mk(ang, 0.7); }, 160);
    } else if (mode === "charge") {
      // Handled by chargeT in step; this branch only fires on release
      mk(ang, 1, { size: 8, color: "#a855f7", pierce: loadout.pierce + 2 });
    } else if (mode === "aoe") {
      mk(ang, 1.1, { aoe: 70, color: "#fb923c", size: 6 });
    } else {
      mk(ang, 1);
    }
    return true;
  }

  function castSkill(sk: SkillState) {
    const st = stateRef.current;
    const p = st.player;
    const dmg = Math.round(p.atk * 1.5);
    if (sk.kind === "nova") {
      st.fx.push({ id: nextId(), x: p.x, y: p.y, r: 0, maxR: 180, life: 0.35, maxLife: 0.35, color: "#22d3ee" });
      for (const e of st.enemies) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 180) e.hp -= dmg * 1.2;
      }
    } else if (sk.kind === "laser") {
      const target = nearestEnemy(p, 9999);
      const ang = target ? Math.atan2(target.y - p.y, target.x - p.x) : 0;
      const len = 600;
      const ex = p.x + Math.cos(ang) * len;
      const ey = p.y + Math.sin(ang) * len;
      st.fx.push({ id: nextId(), x: (p.x + ex) / 2, y: (p.y + ey) / 2, r: ang, maxR: len, life: 0.25, maxLife: 0.25, color: "#f43f5e" });
      // damage enemies along line
      for (const e of st.enemies) {
        const dx = e.x - p.x, dy = e.y - p.y;
        const t = (dx * Math.cos(ang) + dy * Math.sin(ang));
        if (t < 0 || t > len) continue;
        const px = p.x + Math.cos(ang) * t;
        const py = p.y + Math.sin(ang) * t;
        if (Math.hypot(e.x - px, e.y - py) < e.r + 10) e.hp -= dmg * 1.5;
      }
    } else if (sk.kind === "missile") {
      // launch 4 homing as fast bullets toward random enemies
      const targets = [...st.enemies].sort(() => Math.random() - 0.5).slice(0, 4);
      for (const t of targets) {
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        st.bullets.push({
          x: p.x, y: p.y,
          vx: Math.cos(ang) * 600, vy: Math.sin(ang) * 600,
          dmg, life: 1.2, crit: false, pierce: 0, aoe: 40, color: "#facc15", size: 5,
        });
      }
    } else if (sk.kind === "slow") {
      for (const e of st.enemies) e.slow = Math.max(e.slow, 3);
      st.fx.push({ id: nextId(), x: p.x, y: p.y, r: 0, maxR: 260, life: 0.5, maxLife: 0.5, color: "#94a3b8" });
    }
    sk.cd = sk.max;
  }

  function step(dt: number) {
    const st = stateRef.current;
    const p = st.player;
    // movement
    const k = st.keys;
    let dx = 0, dy = 0;
    if (k["w"] || k["arrowup"]) dy -= 1;
    if (k["s"] || k["arrowdown"]) dy += 1;
    if (k["a"] || k["arrowleft"]) dx -= 1;
    if (k["d"] || k["arrowright"]) dx += 1;
    const m = Math.hypot(dx, dy) || 1;
    p.x = Math.max(p.r, Math.min(ARENA_W - p.r, p.x + (dx / m) * p.speed * dt));
    p.y = Math.max(p.r, Math.min(ARENA_H - p.r, p.y + (dy / m) * p.speed * dt));

    // wave timer
    st.waveTime += dt;
    st.spawnCd -= dt;
    if (st.spawnCd <= 0) {
      st.spawnCd = Math.max(0.35, 1.4 - st.wave * 0.05);
      spawnEnemy(st.wave);
    }

    // weapon fire
    if (loadout.fireMode === "charge") {
      // charge up over 1s, fire when full and target exists
      p.chargeT = Math.min(1, p.chargeT + dt * 1.2);
      if (p.chargeT >= 1) {
        if (fireWeapon()) p.chargeT = 0;
      }
    } else {
      p.fireCd -= dt;
      if (p.fireCd <= 0) {
        if (fireWeapon()) p.fireCd = 1 / loadout.fireRate;
      }
    }

    // skills auto-cast
    for (const sk of st.skills) {
      sk.cd = Math.max(0, sk.cd - dt);
      if (sk.cd <= 0 && st.enemies.length > 0) castSkill(sk);
    }

    // bullets
    for (const b of st.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    // bullet vs enemy
    for (const b of st.bullets) {
      if (b.life <= 0) continue;
      for (const e of st.enemies) {
        if (e.hp <= 0) continue;
        const hitR = e.r + (b.size ?? 4);
        if (Math.hypot(e.x - b.x, e.y - b.y) < hitR) {
          e.hp -= b.dmg;
          if (b.aoe) {
            st.fx.push({ id: nextId(), x: b.x, y: b.y, r: 0, maxR: b.aoe, life: 0.3, maxLife: 0.3, color: b.color || "#fb923c" });
            for (const e2 of st.enemies) {
              if (e2 === e || e2.hp <= 0) continue;
              if (Math.hypot(e2.x - b.x, e2.y - b.y) < b.aoe) e2.hp -= b.dmg * 0.6;
            }
            b.life = 0;
            break;
          }
          if (b.pierce > 0) { b.pierce--; }
          else { b.life = 0; break; }
        }
      }
    }
    st.bullets = st.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < ARENA_W + 20 && b.y > -20 && b.y < ARENA_H + 20);

    // enemies
    for (const e of st.enemies) {
      const slowMul = e.slow > 0 ? 0.4 : 1;
      e.slow = Math.max(0, e.slow - dt);
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += Math.cos(ang) * e.speed * slowMul * dt;
      e.y += Math.sin(ang) * e.speed * slowMul * dt;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
        p.hp -= e.atk * dt * 2;
      }
    }

    // dead enemies → pickups
    for (const e of st.enemies) {
      if (e.hp <= 0) {
        st.kills++;
        st.pickups.push({ id: nextId(), x: e.x, y: e.y, kind: Math.random() < 0.1 ? "heal" : "shard" });
      }
    }
    st.enemies = st.enemies.filter((e) => e.hp > 0);

    // fx tick
    for (const f of st.fx) {
      f.life -= dt;
      if (f.color === "#f43f5e") { /* laser keeps r as angle */ }
      else f.r = f.maxR * (1 - f.life / f.maxLife);
    }
    st.fx = st.fx.filter((f) => f.life > 0);

    // pickup magnet + pick
    for (const pk of st.pickups) {
      const dist = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (dist < 90) {
        const ang = Math.atan2(p.y - pk.y, p.x - pk.x);
        pk.x += Math.cos(ang) * 240 * dt;
        pk.y += Math.sin(ang) * 240 * dt;
      }
      if (dist < p.r + 6) {
        if (pk.kind === "shard") {
          st.runShards += 1;
          setShardsAdd?.(1);
        } else {
          p.hp = Math.min(p.maxHp, p.hp + 15);
        }
        pk.id = -1;
      }
    }
    st.pickups = st.pickups.filter((pk) => pk.id > 0);

    // wave complete
    if (st.waveTime >= st.waveDuration) {
      st.waveTime = 0;
      st.wave += 1;
      st.pendingReward = true;
      const isBoss = (st.wave - 1) % 5 === 0;
      const force = nextDropLegendary ? "legendary" : isBoss ? "rare" : undefined;
      const it = rollItem(st.wave, 0, force);
      addInventoryItem?.(it, !!nextDropLegendary);
    }

    if (p.hp <= 0) {
      endRun();
      resetArena();
    }
  }

  function spawnEnemy(wave: number) {
    const st = stateRef.current;
    const isBoss = wave % 5 === 0 && st.enemies.filter((e) => e.tier === "boss").length === 0 && st.waveTime < 2;
    const elite = !isBoss && Math.random() < 0.1 + wave * 0.01;
    const tier: Enemy["tier"] = isBoss ? "boss" : elite ? "elite" : "minion";
    const hp = tier === "boss" ? 200 + wave * 40 : tier === "elite" ? 40 + wave * 8 : 12 + wave * 3;
    const atk = tier === "boss" ? 25 + wave : tier === "elite" ? 12 + wave / 2 : 6 + wave / 3;
    const speed = tier === "boss" ? 55 : tier === "elite" ? 75 : 95;
    const side = Math.floor(Math.random() * 4);
    const r = tier === "boss" ? 26 : tier === "elite" ? 18 : 12;
    const pos =
      side === 0 ? { x: Math.random() * ARENA_W, y: -r } :
      side === 1 ? { x: ARENA_W + r, y: Math.random() * ARENA_H } :
      side === 2 ? { x: Math.random() * ARENA_W, y: ARENA_H + r } :
      { x: -r, y: Math.random() * ARENA_H };
    st.enemies.push({ id: nextId(), x: pos.x, y: pos.y, hp, maxHp: hp, atk, speed, r, tier, slow: 0 });
  }

  function nearestEnemy(p: Vec, range: number) {
    const st = stateRef.current;
    let best: Enemy | null = null;
    let bd = range;
    for (const e of st.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function resetArena() {
    const p = stateRef.current.player;
    Object.assign(stateRef.current, {
      enemies: [], bullets: [], pickups: [], fx: [], waveTime: 0, wave: 1,
      spawnCd: 0, pendingReward: false, runShards: 0, kills: 0,
    });
    p.x = ARENA_W / 2; p.y = ARENA_H / 2; p.hp = p.maxHp; p.chargeT = 0;
    for (const sk of stateRef.current.skills) sk.cd = sk.max * 0.5;
  }

  function nextWave() {
    stateRef.current.pendingReward = false;
  }

  function draw() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const st = stateRef.current;
    ctx.fillStyle = "#0e1018";
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < ARENA_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); ctx.stroke();
    }
    for (let y = 0; y < ARENA_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); ctx.stroke();
    }

    // fx (under entities)
    for (const f of st.fx) {
      const alpha = f.life / f.maxLife;
      if (f.color === "#f43f5e") {
        // laser line: r holds angle, maxR length, x/y midpoint
        const ang = f.r;
        const len = f.maxR;
        const sx = f.x - Math.cos(ang) * len / 2;
        const sy = f.y - Math.sin(ang) * len / 2;
        const ex = f.x + Math.cos(ang) * len / 2;
        const ey = f.y + Math.sin(ang) * len / 2;
        ctx.strokeStyle = `rgba(244,63,94,${alpha})`;
        ctx.lineWidth = 8 * alpha + 2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = f.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    for (const pk of st.pickups) {
      ctx.fillStyle = pk.kind === "shard" ? "#7dd3fc" : "#f87171";
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const e of st.enemies) {
      ctx.fillStyle = e.tier === "boss" ? "#f59e0b" : e.tier === "elite" ? "#a78bfa" : "#ef4444";
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      if (e.slow > 0) {
        ctx.strokeStyle = "rgba(148,163,184,0.7)";
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2); ctx.stroke();
      }
      const w = e.r * 2;
      ctx.fillStyle = "#222"; ctx.fillRect(e.x - w / 2, e.y - e.r - 8, w, 3);
      ctx.fillStyle = "#22c55e"; ctx.fillRect(e.x - w / 2, e.y - e.r - 8, w * (e.hp / e.maxHp), 3);
    }
    for (const b of st.bullets) {
      ctx.fillStyle = b.color || (b.crit ? "#fde047" : "#fbbf24");
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size ?? (b.crit ? 5 : 3), 0, Math.PI * 2); ctx.fill();
    }
    const p = st.player;
    // charge ring
    if (loadout.fireMode === "charge" && p.chargeT > 0) {
      ctx.strokeStyle = `rgba(168,85,247,${0.3 + p.chargeT * 0.7})`;
      ctx.lineWidth = 2 + p.chargeT * 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.chargeT); ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(96,165,250,0.25)";
    ctx.beginPath(); ctx.arc(p.x, p.y, loadout.range, 0, Math.PI * 2); ctx.stroke();
  }

  const st = stateRef.current;
  const paused = !inRun || cliStatus !== "STREAMING";

  return (
    <div className="relative flex h-full flex-col rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b bg-background/40 px-4 py-2 text-xs">
        <div className="flex items-center gap-4">
          <div>Wave <span className="text-primary text-base font-bold">{st.wave}</span></div>
          <div>{Math.max(0, Math.ceil(st.waveDuration - st.waveTime))}s</div>
          <div>Kills {st.kills}</div>
          <div>+⟡ {st.runShards}</div>
        </div>
        <div className="flex gap-2">
          {!inRun ? (
            <button onClick={() => { resetArena(); startRun(); }} className="rounded bg-primary px-3 py-1 text-primary-foreground">⚔ Start</button>
          ) : (
            <button onClick={() => { endRun(); resetArena(); }} className="rounded border border-destructive px-3 py-1 text-destructive">Abandon</button>
          )}
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-background/30 p-2">
        <canvas
          ref={canvasRef}
          width={ARENA_W}
          height={ARENA_H}
          tabIndex={0}
          className="max-h-full max-w-full rounded border outline-none"
          style={{ aspectRatio: `${ARENA_W}/${ARENA_H}` }}
        />
        {paused && inRun && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-5xl">⏸</div>
              <div className="mt-2 font-bold">AI is idle</div>
              <div className="text-xs text-muted-foreground">Send a prompt to your CLI to resume.</div>
            </div>
          </div>
        )}
        {!inRun && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <div className="text-center text-sm text-muted-foreground">
              <div className="text-2xl">🎯 Arena Mode</div>
              <div className="mt-1">WASD to move · auto-fires nearest enemy</div>
              <div className="text-xs">Press Start to deploy</div>
            </div>
          </div>
        )}
        {st.pendingReward && inRun && (
          <div className="absolute inset-0 grid place-items-center bg-background/85">
            <div className="rounded-xl border bg-card p-6 text-center">
              <div className="text-2xl">★ Wave {st.wave - 1} cleared</div>
              <div className="mt-2 text-xs text-muted-foreground">Loot dropped to inventory.</div>
              <button
                onClick={nextWave}
                className="mt-4 rounded bg-primary px-4 py-2 font-bold text-primary-foreground"
              >
                Next Wave →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD: stats + skills */}
      <div className="border-t bg-background/40 px-4 py-2 text-xs space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex w-64 items-center gap-2">
            <span className="text-hp">❤</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-hp transition-[width]" style={{ width: `${(st.player.hp / st.player.maxHp) * 100}%` }} />
            </div>
            <span className="font-mono">{Math.max(0, Math.round(st.player.hp))}/{st.player.maxHp}</span>
          </div>
          <div>ATK {st.player.atk}</div>
          <div>CRIT {st.player.crit}%</div>
          <div>RoF {loadout.fireRate.toFixed(1)}/s</div>
          <div>Range {loadout.range}</div>
          {loadout.pierce > 0 && <div>Pierce +{loadout.pierce}</div>}
          <div className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
            ◎ {FIRE_LABEL[loadout.fireMode]}
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Skills:</span>
          {st.skills.length === 0 && <span className="text-muted-foreground/60">none — equip skill affixes to unlock</span>}
          {st.skills.map((sk) => {
            const ratio = 1 - sk.cd / sk.max;
            const ready = sk.cd <= 0;
            return (
              <div
                key={sk.kind}
                className={`relative flex items-center gap-1.5 rounded border px-2 py-1 ${ready ? "border-accent bg-accent/15 text-accent" : "border-muted bg-muted/20 text-muted-foreground"}`}
                title={`${SKILL_LABEL[sk.kind].name} · CD ${sk.max}s`}
              >
                <span className="text-base leading-none">{SKILL_LABEL[sk.kind].icon}</span>
                <span className="font-medium">{SKILL_LABEL[sk.kind].name}</span>
                <div className="relative h-1.5 w-12 overflow-hidden rounded-full bg-background/60">
                  <div className="h-full bg-accent transition-[width]" style={{ width: `${ratio * 100}%` }} />
                </div>
                <span className="font-mono text-[10px]">{ready ? "READY" : sk.cd.toFixed(1) + "s"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
