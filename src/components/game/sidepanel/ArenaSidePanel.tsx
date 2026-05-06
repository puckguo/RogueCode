import { useGame } from "@/game/store";
import type { Item } from "@/game/types";
import { ItemTile, rarityClass, StatusStrip, TalentsSection, RewardModals, RunSummaryModal, Section } from "./shared";

export function ArenaSidePanel() {
  const {
    inventory, stash, equipment,
    equipItem, salvageItem, stashItem, withdrawStash,
    inRun,
  } = useGame();
  const { mythicLevel, mythicAffixes, setMythicLevel, rerollMythicAffixes } = useGame() as any;
  const slots: Item["slot"][] = ["weapon", "armor", "helm", "boots", "ring", "amulet"];

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
      <StatusStrip />

      <Section
        title={<span className="text-rarity-legendary">⚷ Mythic Keystone</span>}
        defaultOpen={false}
        className="border-rarity-legendary/40"
        right={
          <span className="flex items-center gap-1">
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
          </span>
        }
      >
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
      </Section>

      <Section title="Equipment" defaultOpen={true}>
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
      </Section>

      <Section title={`Inventory (${inventory.length})`} defaultOpen={true} bodyClassName="max-h-72 overflow-y-auto space-y-1">
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
      </Section>

      <Section
        title={`Stash (${stash.length})`}
        defaultOpen={false}
        right={<span className="text-[10px] font-normal opacity-70">persists across runs</span>}
        bodyClassName="max-h-60 overflow-y-auto space-y-1"
      >
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
      </Section>

      <Section title="Talent Tree" defaultOpen={false} bodyClassName="p-0">
        <div className="p-2"><TalentsSection /></div>
      </Section>

      <RewardModals />
      <RunSummaryModal />
    </div>
  );
}
