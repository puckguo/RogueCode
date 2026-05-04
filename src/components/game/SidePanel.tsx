import { useState } from "react";
import { useGame } from "@/game/store";
import type { Item, Rarity, TalentNode } from "@/game/types";
import { TALENT_TREE } from "@/game/data";
import { motion, AnimatePresence } from "framer-motion";

// Branch metadata derived from TALENT_TREE quadrants (x/y in 0..100).
// Branch is determined by which quadrant the node sits in relative to the
// central "core" node at (50, 50). The core itself is shown as its own root.
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

const rarityClass: Record<Rarity, string> = {
  common: "text-rarity-common border-rarity-common/40",
  magic: "text-rarity-magic border-rarity-magic/50",
  rare: "text-rarity-rare border-rarity-rare/60",
  set: "text-rarity-set border-rarity-set/60",
  legendary: "text-rarity-legendary border-rarity-legendary/70",
};

function ItemTile({
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

export function SidePanel() {
  const {
    inventory,
    stash,
    equipment,
    equipItem,
    salvageItem,
    stashItem,
    withdrawStash,
    rewardChoices,
    pickReward,
    itemReward,
    takeItemReward,
    inRun,
    startRun,
    endRun,
    shards,
    totalPoints,
    talentRanks,
    spendTalent,
    refundAllTalents,
    cliStatus,
    tokensPerSec,
    combo,
    nextDropLegendary,
    runSummary,
    dismissRunSummary,
  } = useGame();
  const { mythicLevel, mythicAffixes, setMythicLevel, rerollMythicAffixes } = useGame() as any;

  const slots: Item["slot"][] = ["weapon", "armor", "helm", "boots", "ring", "amulet"];

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* Status strip */}
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

      {/* Mythic Keystone */}
      <div className="rounded-lg border border-rarity-legendary/40 bg-card p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <div className="font-bold uppercase tracking-wider text-rarity-legendary">⚷ Mythic Keystone</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMythicLevel(Math.max(1, (mythicLevel || 1) - 1))}
              className="rounded border border-border px-2 text-muted-foreground hover:text-foreground"
            >−</button>
            <span className="w-10 text-center font-mono text-sm text-rarity-legendary">+{mythicLevel || 1}</span>
            <button
              onClick={() => setMythicLevel(Math.min(20, (mythicLevel || 1) + 1))}
              className="rounded border border-border px-2 text-muted-foreground hover:text-foreground"
            >+</button>
            <button
              onClick={rerollMythicAffixes}
              title="Reroll affixes (5 ⟡)"
              className="ml-1 rounded border border-border px-2 text-[10px] text-muted-foreground hover:text-primary"
            >↻ 5⟡</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {(mythicAffixes || []).length === 0 && (
            <div className="text-[10px] text-muted-foreground">Lvl 1: no affixes. Raise level for global Arena modifiers & better loot.</div>
          )}
          {(mythicAffixes || []).map((a: { id: string; name: string; desc: string }) => (
            <span
              key={a.id}
              title={a.desc}
              className="rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive"
            >
              {a.name}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs (simple) */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        {/* Equipment */}
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Equipment</div>
          <div className="grid grid-cols-3 gap-1">
            {slots.map((s) => {
              const it = equipment[s];
              return (
                <div key={s} className={`grid h-14 place-items-center rounded border text-[10px] ${it ? rarityClass[it.rarity] : "border-dashed text-muted-foreground"}`}>
                  {it ? (
                    <div className="text-center">
                      <div className="font-bold leading-tight">{it.name}</div>
                      <div className="opacity-60">{s}</div>
                    </div>
                  ) : (
                    <div>{s}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inventory */}
        <div className="flex-1 overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Inventory ({inventory.length})
          </div>
          <div className="max-h-full space-y-1 overflow-y-auto p-2">
            {inventory.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">No items yet. Defeat elites & bosses for loot.</div>
            )}
            {inventory.map((it) => (
              <ItemTile
                key={it.id}
                item={it}
                actions={[
                  { label: "Equip", primary: true, onClick: () => equipItem(it.id) },
                  { label: "Stash", onClick: () => stashItem(it.id) },
                  { label: "Salvage", onClick: () => salvageItem(it.id) },
                ]}
              />
            ))}
          </div>
        </div>

        {/* Stash */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Stash ({stash.length})</span>
            <span className="text-[10px] font-normal opacity-70">persists across runs</span>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto p-2">
            {stash.length === 0 && (
              <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">Send items here to keep them between runs.</div>
            )}
            {stash.map((it) => (
              <ItemTile
                key={it.id}
                item={it}
                actions={[
                  inRun
                    ? { label: "Withdraw", primary: true, onClick: () => withdrawStash(it.id) }
                    : { label: "(start a run to withdraw)", onClick: () => {} },
                  { label: "Salvage", onClick: () => salvageItem(it.id) },
                ]}
              />
            ))}
          </div>
        </div>

        {/* Talents */}
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
      </div>

      {/* Talent maximize modal */}
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

      {/* Reward modal */}
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

      {/* Run summary */}
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
    </div>
  );
}
