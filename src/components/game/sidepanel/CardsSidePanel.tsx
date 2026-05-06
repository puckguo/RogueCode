import { useGame } from "@/game/store";
import type { Card } from "@/game/types";
import { StatusStrip, TalentsSection, RewardModals, RunSummaryModal, Section } from "./shared";

const kindColor: Record<Card["kind"], string> = {
  attack: "border-rose-500/50 text-rose-300",
  spell: "border-violet-500/50 text-violet-300",
  defense: "border-sky-500/50 text-sky-300",
  buff: "border-emerald-500/50 text-emerald-300",
};

function CardTile({ card }: { card: Card }) {
  return (
    <div className={`rounded border bg-card/60 px-2 py-1 ${kindColor[card.kind]}`}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold">{card.name}</span>
        <span className="text-[10px] text-energy">{card.cost}⚡</span>
      </div>
      <div className="text-[10px] uppercase opacity-60">{card.kind}</div>
      <div className="mt-0.5 text-[10px] text-foreground/80 leading-snug">{card.desc}</div>
    </div>
  );
}

export function CardsSidePanel() {
  const { hand, draw, discard, exhaust, deck, wave, inRun, player } = useGame();

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
      <StatusStrip />

      <Section title="Run Progress" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Wave</div>
            <div className="text-lg font-bold text-primary">{inRun ? wave : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">HP</div>
            <div className="text-lg font-bold text-rose-300">
              {inRun ? `${player.hp}/${player.maxHp}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Energy</div>
            <div className="text-lg font-bold text-energy">
              {inRun ? `${player.energy}/${player.maxEnergy}` : "—"}
            </div>
          </div>
        </div>
      </Section>

      {inRun && (
        <Section title="Piles" defaultOpen={true}>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Draw</div>
              <div className="text-lg font-bold">{draw.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Hand</div>
              <div className="text-lg font-bold text-primary">{hand.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Discard</div>
              <div className="text-lg font-bold">{discard.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Exhaust</div>
              <div className="text-lg font-bold text-amber-300">{exhaust.length}</div>
            </div>
          </div>
        </Section>
      )}

      <Section
        title={`Deck (${deck.length})`}
        defaultOpen={false}
        right={<span className="text-[10px] font-normal opacity-70">your master deck</span>}
        bodyClassName="max-h-80 overflow-y-auto space-y-1"
      >
        {deck.length === 0 && (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">Empty deck.</div>
        )}
        {deck.map((c) => (
          <CardTile key={c.id} card={c} />
        ))}
      </Section>

      <TalentsSection />

      <RewardModals />
      <RunSummaryModal />
    </div>
  );
}
