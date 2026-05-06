import { useGame } from "@/game/store";
import type { Card, Enemy } from "@/game/types";
import { motion, AnimatePresence } from "framer-motion";

const cardKindStyles: Record<Card["kind"], string> = {
  attack: "from-[oklch(0.4_0.18_25)] to-[oklch(0.25_0.1_25)] border-[oklch(0.6_0.22_25)]",
  spell: "from-[oklch(0.4_0.18_280)] to-[oklch(0.25_0.1_280)] border-[oklch(0.65_0.2_280)]",
  defense: "from-[oklch(0.4_0.1_220)] to-[oklch(0.25_0.06_220)] border-[oklch(0.65_0.16_220)]",
  buff: "from-[oklch(0.4_0.16_140)] to-[oklch(0.25_0.08_140)] border-[oklch(0.65_0.18_140)]",
};

function EnemyCard({ e }: { e: Enemy }) {
  const pct = Math.max(0, e.hp / e.maxHp);
  const ringColor =
    e.rarity === "legendary"
      ? "ring-rarity-legendary"
      : e.rarity === "rare"
        ? "ring-rarity-rare"
        : e.rarity === "set"
          ? "ring-rarity-set"
          : e.rarity === "magic"
            ? "ring-rarity-magic"
            : "ring-border";
  return (
    <motion.div
      layout
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      className={`relative flex w-36 flex-col items-center gap-2 rounded-lg border bg-card/80 p-3 ring-2 ${ringColor}`}
    >
      <div className="text-3xl">{e.rarity === "legendary" ? "👹" : e.rarity === "rare" ? "👺" : "🐛"}</div>
      <div className="text-center text-sm font-semibold leading-tight">{e.name}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.rarity}</div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-hp transition-[width]"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="flex w-full justify-between text-xs">
        <span>❤ {e.hp}/{e.maxHp}</span>
        <span className="text-destructive">⚔ {e.intent}</span>
      </div>
    </motion.div>
  );
}

function HandCard({ c, idx, disabled, onClick }: { c: Card; idx: number; disabled: boolean; onClick: () => void }) {
  return (
    <motion.button
      layout
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0, scale: 0.8 }}
      whileHover={{ y: -10, scale: 1.04 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex h-44 w-32 shrink-0 flex-col rounded-lg border-2 bg-gradient-to-b p-2 text-left shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${cardKindStyles[c.kind]}`}
      key={`${c.id}-${idx}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-primary-foreground/80">{c.kind}</span>
        <span className="grid size-6 place-items-center rounded-full bg-energy text-[11px] font-bold text-background">
          {c.cost}
        </span>
      </div>
      <div className="mt-2 text-sm font-bold text-foreground">{c.name}</div>
      <div className="mt-auto text-[10px] leading-snug text-foreground/80">{c.desc}</div>
    </motion.button>
  );
}

export function BattleStage() {
  const { enemies, hand, player, buffs, turn, wave, combo, playCard, endTurn, cliStatus, log, inRun, debugMode } = useGame();
  const paused = !debugMode && cliStatus !== "STREAMING";

  return (
    <div className="relative flex h-full flex-col rounded-lg border bg-card overflow-hidden">
      {/* HUD */}
      <div className="flex items-center justify-between border-b bg-background/40 px-4 py-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="font-mono">
            Wave <span className="text-primary text-base font-bold">{wave}</span>
          </div>
          <div>Turn {turn}</div>
          <div className="text-combo">Combo ×{combo}</div>
          {buffs.turns > 0 && (
            <div className="text-amber-300">Buff +{buffs.atk}atk +{buffs.crit}% crit ({buffs.turns}t)</div>
          )}
        </div>
        <button
          onClick={endTurn}
          disabled={paused || !inRun}
          className="rounded border border-primary bg-primary/20 px-3 py-1 text-primary hover:bg-primary/30 disabled:opacity-40"
        >
          End Turn ▶
        </button>
      </div>

      {/* Enemies */}
      <div className="relative flex flex-1 items-start justify-center gap-4 p-6">
        <AnimatePresence>
          {enemies.map((e) => (
            <EnemyCard key={e.id} e={e} />
          ))}
        </AnimatePresence>

        {/* Pause overlay */}
        <AnimatePresence>
          {paused && inRun && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 grid place-items-center bg-background/80 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="text-5xl">⏸</div>
                <div className="mt-3 text-xl font-bold">AI is idle</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Send a prompt in the terminal to resume the battle.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player bar */}
      <div className="border-t bg-background/40 px-4 py-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex w-48 items-center gap-2">
            <span className="text-hp">❤</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-hp transition-[width]" style={{ width: `${(player.hp / player.maxHp) * 100}%` }} />
            </div>
            <span className="font-mono">{player.hp}/{player.maxHp}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-energy">⚡</span>
            <span className="font-mono">{player.energy}/{player.maxEnergy}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🛡</span>
            <span className="font-mono">{player.block}</span>
          </div>
          <div>ATK {player.atk + buffs.atk}</div>
          <div>CRIT {player.crit + buffs.crit}%</div>
        </div>
      </div>

      {/* Hand */}
      <div className="flex min-h-[12rem] items-end justify-center gap-2 border-t bg-background/30 px-4 pt-3 pb-4">
        <AnimatePresence>
          {hand.map((c, i) => (
            <HandCard
              key={`${c.id}-${i}-${turn}`}
              c={c}
              idx={i}
              disabled={paused || player.energy < c.cost}
              onClick={() => playCard(i)}
            />
          ))}
        </AnimatePresence>
        {hand.length === 0 && !inRun && (
          <div className="text-sm text-muted-foreground">Press "Start Run" to begin.</div>
        )}
      </div>

      {/* Log */}
      <div className="h-20 overflow-y-auto border-t bg-background/60 p-2 font-mono text-[11px] text-muted-foreground">
        {log.slice(-10).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
