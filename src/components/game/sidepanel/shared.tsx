import { useState, type ReactNode } from "react";
import { useGame } from "@/game/store";
import type { Item, Rarity, Relic, TalentNode } from "@/game/types";
import { TALENT_TREE } from "@/game/data";
import { motion, AnimatePresence } from "framer-motion";

export function Section({
  title,
  right,
  defaultOpen = true,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: ReactNode;
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-lg border bg-card ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
          {title}
        </span>
        {right && <span onClick={(e) => e.stopPropagation()}>{right}</span>}
      </button>
      {open && <div className={`border-t px-3 py-2 ${bodyClassName}`}>{children}</div>}
    </div>
  );
}
const TALENT_BRANCHES = {
  core: { name: "Awakening", color: "text-amber-300", short: "★" },
  offense: { name: "Offense — Sharpened Mind", color: "text-rose-400", short: "⚔" },
  defense: { name: "Defense — Iron Will", color: "text-sky-400", short: "🛡" },
  greed: { name: "Greed — Treasure Hunter", color: "text-emerald-400", short: "💰" },
  tech: { name: "Arena-Tech — Hyper Trigger", color: "text-violet-400", short: "⚙" },
} as const;
type BranchKey = keyof typeof TALENT_BRANCHES;

function branchOf(n: TalentNode): BranchKey {
  if (n.id === "core") return "core";
  const left = n.x < 50;
  const top = n.y < 50;
  if (top && left) return "offense";
  if (top && !left) return "defense";
  if (!top && left) return "greed";
  return "tech";
}

export const rarityClass: Record<Rarity, string> = {
  common: "text-rarity-common border-rarity-common/40",
  magic: "text-rarity-magic border-rarity-magic/50",
  rare: "text-rarity-rare border-rarity-rare/60",
  set: "text-rarity-set border-rarity-set/60",
  legendary: "text-rarity-legendary border-rarity-legendary/70",
};

export function ItemTile({
  item,
  actions,
}: {
  item: Item;
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
}) {
  return (
    <div className={`group relative rounded border bg-card/60 p-2 ${rarityClass[item.rarity]}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold">{item.name}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-70">{item.slot}</span>
      </div>
      <div className="mt-0.5 text-[10px] uppercase opacity-70">ilvl {item.ilvl} · {item.rarity}</div>
      <ul className="mt-1 space-y-0.5 text-[11px] text-foreground/80">
        {item.affixes.map((a, i) => (
          <li key={i}>· {a.text}</li>
        ))}
      </ul>
      {actions && actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className={`rounded px-2 py-0.5 text-[10px] ${a.primary ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-muted hover:bg-muted/70"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TalentTreeView({
  talentRanks,
  spendTalent,
  totalPoints,
  expanded,
}: {
  talentRanks: Record<string, number>;
  spendTalent: (id: string) => void;
  totalPoints: number;
  expanded: boolean;
}) {
  const branchAnchors: { branch: BranchKey; x: number; y: number; align: string }[] = [
    { branch: "offense", x: 2, y: 2, align: "items-start text-left" },
    { branch: "defense", x: 98, y: 2, align: "items-end text-right" },
    { branch: "greed", x: 2, y: 98, align: "items-start text-left" },
    { branch: "tech", x: 98, y: 98, align: "items-end text-right" },
  ];

  return (
    <div className={`relative rounded bg-background/40 ${expanded ? "h-full w-full" : "h-44"}`}>
      <svg className="absolute inset-0 h-full w-full">
        {TALENT_TREE.map((n) =>
          (n.requires || []).map((r) => {
            const p = TALENT_TREE.find((x) => x.id === r);
            if (!p) return null;
            return (
              <line
                key={`${n.id}-${r}`}
                x1={`${p.x}%`}
                y1={`${p.y}%`}
                x2={`${n.x}%`}
                y2={`${n.y}%`}
                stroke="currentColor"
                className={(talentRanks[r] || 0) > 0 ? "text-primary/70" : "text-border"}
                strokeWidth={1.5}
              />
            );
          })
        )}
      </svg>

      {expanded && branchAnchors.map(({ branch, x, y, align }) => {
        const meta = TALENT_BRANCHES[branch];
        return (
          <div
            key={branch}
            className={`absolute flex flex-col ${align} ${meta.color} pointer-events-none`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(${x < 50 ? "0" : "-100%"}, ${y < 50 ? "0" : "-100%"})`,
            }}
          >
            <div className="text-xs font-bold uppercase tracking-wider opacity-90">{meta.short} {meta.name}</div>
          </div>
        );
      })}

      {TALENT_TREE.map((n) => {
        const rank = talentRanks[n.id] || 0;
        const unlocked = !n.requires || n.requires.every((r) => (talentRanks[r] || 0) > 0);
        const maxed = rank >= n.maxRank;
        const meta = TALENT_BRANCHES[branchOf(n)];
        const size = expanded ? "size-14" : "size-8";
        return (
          <div
            key={n.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <button
              onClick={() => spendTalent(n.id)}
              title={`${n.name}\n${n.desc}\n${rank}/${n.maxRank}`}
              className={`rounded-full border-2 text-[10px] font-bold transition ${
                rank > 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : unlocked
                    ? `border-primary/50 bg-card hover:border-primary ${meta.color}`
                    : "border-border bg-card/50 opacity-40 cursor-not-allowed"
              } ${maxed ? "ring-2 ring-rarity-legendary" : ""} grid ${size} place-items-center`}
              disabled={!unlocked || maxed || totalPoints <= 0}
            >
              {rank}/{n.maxRank}
            </button>
            {expanded && (
              <div className="mt-1 w-32 text-center">
                <div className={`text-[11px] font-bold leading-tight ${rank > 0 ? "text-foreground" : "text-foreground/80"}`}>
                  {n.name}
                </div>
                <div className="text-[10px] leading-snug text-muted-foreground">{n.desc}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatusStrip() {
  const {
    inRun, startRun, endRun,
    shards, totalPoints, tokensPerSec, combo,
    cliStatus, nextDropLegendary,
  } = useGame();
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between text-xs">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Ether Shards</div>
          <div className="text-lg font-bold text-primary">⟡ {shards}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Talent Pts</div>
          <div className="text-lg font-bold text-accent">✦ {totalPoints}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">AI tok/s</div>
          <div className="text-lg font-bold text-emerald-400">{tokensPerSec}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Combo</div>
          <div className="text-lg font-bold text-combo">×{combo}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {!inRun ? (
          <button
            onClick={startRun}
            className="flex-1 rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground pulse-glow"
          >
            ⚔ Start Run
          </button>
        ) : (
          <button
            onClick={endRun}
            className="flex-1 rounded border border-destructive bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/20"
          >
            Abandon Run
          </button>
        )}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Status: <span className={cliStatus === "STREAMING" ? "text-emerald-400" : "text-amber-400"}>{cliStatus}</span>
      </div>
      {nextDropLegendary && (
        <div className="mt-2 rounded border border-rarity-legendary/60 bg-rarity-legendary/10 px-2 py-1 text-[10px] text-rarity-legendary">
          ⚡ Next loot will be Legendary (commit detected)
        </div>
      )}
    </div>
  );
}

export function TalentsSection() {
  const { totalPoints, talentRanks, spendTalent, refundAllTalents } = useGame();
  const [talentMax, setTalentMax] = useState(false);
  return (
    <>
      <div className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Talent Tree (Engineer)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTalentMax(true)}
              className="text-[10px] font-normal text-muted-foreground hover:text-primary"
              title="Maximize"
            >
              ⛶ Expand
            </button>
            <button onClick={refundAllTalents} className="text-[10px] font-normal text-muted-foreground hover:text-primary">
              Respec (25 ⟡)
            </button>
          </div>
        </div>
        <TalentTreeView
          talentRanks={talentRanks}
          spendTalent={spendTalent}
          totalPoints={totalPoints}
          expanded={false}
        />
      </div>
      <AnimatePresence>
        {talentMax && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/90 backdrop-blur-sm p-6"
            onClick={() => setTalentMax(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-[90vh] w-[min(1400px,95vw)] flex-col rounded-xl border bg-card p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">Talent Tree — Engineer</div>
                  <div className="text-xs text-muted-foreground">
                    {Object.entries(TALENT_BRANCHES).map(([k, v]) => (
                      <span key={k} className={`mr-3 ${v.color}`}>{v.short} {v.name}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Pts left: <b className="text-primary">{totalPoints}</b></span>
                  <button onClick={refundAllTalents} className="rounded border px-2 py-1 text-[11px] hover:border-primary">Respec (25 ⟡)</button>
                  <button onClick={() => setTalentMax(false)} className="rounded border px-2 py-1 text-[11px] hover:border-primary">Close ✕</button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <TalentTreeView
                  talentRanks={talentRanks}
                  spendTalent={spendTalent}
                  totalPoints={totalPoints}
                  expanded={true}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function RewardModals() {
  const { rewardChoices, pickReward, itemReward, takeItemReward } = useGame();
  return (
    <AnimatePresence>
      {(rewardChoices || itemReward) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-[640px] max-w-[90vw] rounded-xl border bg-card p-6 shadow-2xl"
          >
            <h2 className="text-center text-lg font-bold text-primary">Wave Cleared — Choose Reward</h2>
            {rewardChoices && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {rewardChoices.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickReward(c)}
                    className="flex h-44 flex-col rounded-lg border-2 border-primary/40 bg-card p-3 text-left transition hover:border-primary hover:bg-primary/10"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="uppercase opacity-70">{c.kind}</span>
                      <span className="font-bold text-energy">{c.cost} ⚡</span>
                    </div>
                    <div className="mt-2 text-base font-bold">{c.name}</div>
                    <div className="mt-auto text-xs text-muted-foreground">{c.desc}</div>
                  </button>
                ))}
              </div>
            )}
            {itemReward && (
              <div className="mt-4">
                <div className="text-xs uppercase text-muted-foreground">Loot</div>
                <div className="mt-1">
                  <ItemTile item={itemReward} />
                </div>
                <button
                  onClick={takeItemReward}
                  className="mt-2 w-full rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                >
                  Take Item
                </button>
              </div>
            )}
            {rewardChoices && (
              <button
                onClick={() => pickReward(null)}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Skip card reward
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RunSummaryModal() {
  const { runSummary, dismissRunSummary, startRun } = useGame();
  return (
    <AnimatePresence>
      {runSummary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-[480px] max-w-[90vw] rounded-xl border bg-card p-6 text-center shadow-2xl"
          >
            <div className="text-5xl">☠</div>
            <h2 className="mt-2 text-xl font-bold text-primary">Run Ended</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Wave</div>
                <div className="text-2xl font-bold">{runSummary.wave}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">+ Shards</div>
                <div className="text-2xl font-bold text-primary">⟡ {runSummary.shards}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">+ Talent Pts</div>
                <div className="text-2xl font-bold text-accent">✦ {runSummary.points}</div>
              </div>
            </div>
            {runSummary.events.length > 0 && (
              <div className="mt-4 rounded border bg-background/40 p-3 text-left text-xs text-muted-foreground">
                <div className="mb-1 text-[10px] uppercase">Coding events this run:</div>
                {runSummary.events.map((e, i) => (
                  <div key={i}>· {e}</div>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={dismissRunSummary}
                className="flex-1 rounded border px-3 py-2 text-sm hover:bg-muted"
              >
                Close
              </button>
              <button
                onClick={() => { dismissRunSummary(); startRun(); }}
                className="flex-1 rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
              >
                ⚔ Start New Run
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RelicToast() {
  const { relicDropToast, clearRelicToast } = useGame();
  return (
    <AnimatePresence>
      {relicDropToast && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed left-1/2 top-8 z-50 -translate-x-1/2 rounded-xl border-2 bg-card px-6 py-3 shadow-xl ${
            relicDropToast.rarity === "legendary"
              ? "border-rarity-legendary/80 text-rarity-legendary"
              : relicDropToast.rarity === "rare"
              ? "border-rarity-rare/70 text-rarity-rare"
              : "border-rarity-common/50 text-rarity-common"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✦</span>
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">Relic Acquired</div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{relicDropToast.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  relicDropToast.rarity === "legendary"
                    ? "bg-rarity-legendary/20 text-rarity-legendary"
                    : relicDropToast.rarity === "rare"
                    ? "bg-rarity-rare/20 text-rarity-rare"
                    : "bg-rarity-common/20 text-rarity-common"
                }`}>
                  {relicDropToast.rarity}
                </span>
              </div>
              <div className="text-xs text-foreground/70">{relicDropToast.desc}</div>
            </div>
            <button
              aria-label="Dismiss relic notification"
              onClick={clearRelicToast}
              className="ml-2 rounded px-2 py-1 text-xs hover:bg-muted"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
