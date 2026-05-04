import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/store";
import { rollItem } from "@/game/arena";

type Vec = { x: number; y: number };
type Entity = Vec & { id: number; hp: number; maxHp: number; r: number };
type Bullet = Vec & { vx: number; vy: number; dmg: number; life: number; crit: boolean };
type Enemy = Entity & { atk: number; speed: number; tier: "minion" | "elite" | "boss" };
type Pickup = Vec & { id: number; kind: "shard" | "heal" };

const ARENA_W = 900;
const ARENA_H = 540;

let _id = 1;
const nextId = () => _id++;

export function ArenaStage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    player: { x: ARENA_W / 2, y: ARENA_H / 2, hp: 100, maxHp: 100, r: 14, speed: 180, atk: 8, crit: 5, fireCd: 0, fireRate: 2.5, range: 320, projSpeed: 480 },
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    pickups: [] as Pickup[],
    keys: {} as Record<string, boolean>,
    waveTime: 0,
    waveDuration: 25,
    wave: 1,
    spawnCd: 0,
    pendingReward: false,
    runShards: 0,
    kills: 0,
  });

  const [, setTick] = useState(0);
  const force = () => setTick((t) => (t + 1) % 1000000);

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

  // Apply talents/equipment buffs
  useEffect(() => {
    const s = stateRef.current.player;
    let atk = 8;
    let hp = 100;
    let crit = 5;
    let fireRate = 2.5;
    for (const it of Object.values(equipment) as any[]) {
      if (!it) continue;
      for (const a of it.affixes) {
        atk += a.atk || 0;
        hp += a.hp || 0;
        crit += a.crit || 0;
      }
    }
    // talent ranks (reuse atk/hp/crit fields)
    Object.entries(talentRanks as Record<string, number>).forEach(([id, r]) => {
      if (id.startsWith("atk")) atk += r;
      if (id.startsWith("hp")) hp += r * 8;
      if (id.startsWith("crit")) crit += r * 2;
      if (id === "energy" || id === "energy2") fireRate += r * 0.3;
    });
    s.atk = atk;
    s.maxHp = hp;
    s.hp = Math.min(s.hp || hp, hp);
    if (!s.hp) s.hp = hp;
    s.crit = crit;
    s.fireRate = fireRate;
  }, [equipment, talentRanks, inRun]);

  // input
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

  // game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;
      const paused = !inRun || cliStatus !== "STREAMING" || st.pendingReward;
      if (!paused) step(dt);
      draw();
      force();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRun, cliStatus]);

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

    // auto shoot
    p.fireCd -= dt;
    if (p.fireCd <= 0) {
      const target = nearestEnemy(p, p.range);
      if (target) {
        p.fireCd = 1 / p.fireRate;
        const ang = Math.atan2(target.y - p.y, target.x - p.x);
        const isCrit = Math.random() * 100 < p.crit;
        st.bullets.push({
          x: p.x, y: p.y,
          vx: Math.cos(ang) * p.projSpeed,
          vy: Math.sin(ang) * p.projSpeed,
          dmg: Math.round(p.atk * (isCrit ? 2 : 1)),
          life: 1.2,
          crit: isCrit,
        });
      }
    }

    // bullets
    for (const b of st.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    st.bullets = st.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < ARENA_W && b.y > 0 && b.y < ARENA_H);

    // enemies move toward player
    for (const e of st.enemies) {
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += Math.cos(ang) * e.speed * dt;
      e.y += Math.sin(ang) * e.speed * dt;
      // collision with player
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
        p.hp -= e.atk * dt * 2;
      }
    }

    // bullet vs enemy
    for (const b of st.bullets) {
      for (const e of st.enemies) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 4) {
          e.hp -= b.dmg;
          b.life = 0;
          break;
        }
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
      // drop item
      const isBoss = (st.wave - 1) % 5 === 0;
      const force = nextDropLegendary ? "legendary" : isBoss ? "rare" : undefined;
      const it = rollItem(st.wave, 0, force);
      addInventoryItem?.(it, !!nextDropLegendary);
    }

    // death
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
    // spawn from edge
    const side = Math.floor(Math.random() * 4);
    const r = tier === "boss" ? 26 : tier === "elite" ? 18 : 12;
    const pos =
      side === 0 ? { x: Math.random() * ARENA_W, y: -r } :
      side === 1 ? { x: ARENA_W + r, y: Math.random() * ARENA_H } :
      side === 2 ? { x: Math.random() * ARENA_W, y: ARENA_H + r } :
      { x: -r, y: Math.random() * ARENA_H };
    st.enemies.push({ id: nextId(), x: pos.x, y: pos.y, hp, maxHp: hp, atk, speed, r, tier });
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
      enemies: [], bullets: [], pickups: [], waveTime: 0, wave: 1, spawnCd: 0, pendingReward: false, runShards: 0, kills: 0,
    });
    p.x = ARENA_W / 2; p.y = ARENA_H / 2; p.hp = p.maxHp;
  }

  function nextWave() {
    stateRef.current.pendingReward = false;
  }

  function draw() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const st = stateRef.current;
    // background
    ctx.fillStyle = "#0e1018";
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < ARENA_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); ctx.stroke();
    }
    for (let y = 0; y < ARENA_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); ctx.stroke();
    }

    // pickups
    for (const pk of st.pickups) {
      ctx.fillStyle = pk.kind === "shard" ? "#7dd3fc" : "#f87171";
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    // enemies
    for (const e of st.enemies) {
      ctx.fillStyle = e.tier === "boss" ? "#f59e0b" : e.tier === "elite" ? "#a78bfa" : "#ef4444";
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      // hp bar
      const w = e.r * 2;
      ctx.fillStyle = "#222"; ctx.fillRect(e.x - w / 2, e.y - e.r - 8, w, 3);
      ctx.fillStyle = "#22c55e"; ctx.fillRect(e.x - w / 2, e.y - e.r - 8, w * (e.hp / e.maxHp), 3);
    }
    // bullets
    for (const b of st.bullets) {
      ctx.fillStyle = b.crit ? "#fde047" : "#fbbf24";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.crit ? 5 : 3, 0, Math.PI * 2); ctx.fill();
    }
    // player
    const p = st.player;
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(96,165,250,0.25)";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.range, 0, Math.PI * 2); ctx.stroke();
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

      <div className="border-t bg-background/40 px-4 py-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex w-64 items-center gap-2">
            <span className="text-hp">❤</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-hp transition-[width]" style={{ width: `${(st.player.hp / st.player.maxHp) * 100}%` }} />
            </div>
            <span className="font-mono">{Math.max(0, Math.round(st.player.hp))}/{st.player.maxHp}</span>
          </div>
          <div>ATK {st.player.atk}</div>
          <div>CRIT {st.player.crit}%</div>
          <div>RoF {st.player.fireRate.toFixed(1)}/s</div>
          <div>Range {st.player.range}</div>
        </div>
      </div>
    </div>
  );
}
