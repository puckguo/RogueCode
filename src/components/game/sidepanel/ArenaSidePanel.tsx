import { useGame } from "@/game/store";
import type { Item } from "@/game/types";
import { ItemTile, rarityClass, StatusStrip, TalentsSection, RewardModals, RunSummaryModal } from "./shared";

export function ArenaSidePanel() {
  const {
    inventory, stash, equipment,
    equipItem, salvageItem, stashItem, withdrawStash,
    inRun,
  } = useGame();
  const { mythicLevel, mythicAffixes, setMythicLevel, rerollMythicAffixes } = useGame() as any;
  const slots: Item["slot"][] = ["weapon", "armor", "helm", "boots", "ring", "amulet"];

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <StatusStrip />

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

        <TalentsSection />
      </div>

      <RewardModals />
      <RunSummaryModal />
    </div>
  );
}
