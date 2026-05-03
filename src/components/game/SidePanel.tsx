import { useGame } from "@/game/store";
import type { Item, Rarity } from "@/game/types";
import { TALENT_TREE } from "@/game/data";
import { motion, AnimatePresence } from "framer-motion";

const rarityClass: Record<Rarity, string> = {
  common: "text-rarity-common border-rarity-common/40",
  magic: "text-rarity-magic border-rarity-magic/50",
  rare: "text-rarity-rare border-rarity-rare/60",
  set: "text-rarity-set border-rarity-set/60",
  legendary: "text-rarity-legendary border-rarity-legendary/70",
};

function ItemTile({ item, onEquip, onSalvage }: { item: Item; onEquip?: () => void; onSalvage?: () => void }) {
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
      <div className="mt-2 flex gap-1">
        {onEquip && (
          <button onClick={onEquip} className="rounded bg-primary/20 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/30">
            Equip
          </button>
        )}
        {onSalvage && (
          <button onClick={onSalvage} className="rounded bg-muted px-2 py-0.5 text-[10px] hover:bg-muted/70">
            Salvage
          </button>
        )}
      </div>
    </div>
  );
}

export function SidePanel() {
  const {
    inventory,
    equipment,
    equipItem,
    salvageItem,
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
  } = useGame();

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
              <ItemTile key={it.id} item={it} onEquip={() => equipItem(it.id)} onSalvage={() => salvageItem(it.id)} />
            ))}
          </div>
        </div>

        {/* Talents */}
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Talent Tree (Engineer)</span>
            <button onClick={refundAllTalents} className="text-[10px] font-normal text-muted-foreground hover:text-primary">
              Respec (25 ⟡)
            </button>
          </div>
          <div className="relative h-44 rounded bg-background/40">
            {/* connections */}
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
            {TALENT_TREE.map((n) => {
              const rank = talentRanks[n.id] || 0;
              const unlocked = !n.requires || n.requires.every((r) => (talentRanks[r] || 0) > 0);
              const maxed = rank >= n.maxRank;
              return (
                <button
                  key={n.id}
                  onClick={() => spendTalent(n.id)}
                  title={`${n.name}\n${n.desc}\n${rank}/${n.maxRank}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-[10px] font-bold transition ${
                    rank > 0
                      ? "border-primary bg-primary text-primary-foreground"
                      : unlocked
                        ? "border-primary/50 bg-card hover:border-primary"
                        : "border-border bg-card/50 opacity-40 cursor-not-allowed"
                  } ${maxed ? "ring-2 ring-rarity-legendary" : ""} grid size-8 place-items-center`}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  disabled={!unlocked || maxed || totalPoints <= 0}
                >
                  {rank}/{n.maxRank}
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
    </div>
  );
}
