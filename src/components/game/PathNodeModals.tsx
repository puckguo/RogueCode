import { useGame } from "@/game/store";
import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "@/game/types";

const kindColor: Record<Card["kind"], string> = {
  attack: "border-rose-500/50 text-rose-300",
  spell: "border-violet-500/50 text-violet-300",
  defense: "border-sky-500/50 text-sky-300",
  buff: "border-emerald-500/50 text-emerald-300",
};

function CardPreview({ c, onClick, disabled, footer }: { c: Card; onClick?: () => void; disabled?: boolean; footer?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full flex-col rounded-lg border-2 bg-card p-3 text-left transition disabled:opacity-40 ${kindColor[c.kind]} hover:bg-primary/10`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase opacity-70">{c.kind}</span>
        <span className="font-bold text-energy">{c.cost} ⚡</span>
      </div>
      <div className="mt-1 text-sm font-bold">{c.name}</div>
      <div className="mt-1 text-[11px] text-foreground/80">{c.desc}</div>
      {c.exhaust && <div className="mt-1 text-[10px] text-amber-300">⌧ Exhaust</div>}
      {footer && <div className="mt-2 text-[10px] uppercase text-muted-foreground">{footer}</div>}
    </button>
  );
}

export function PathNodeModals() {
  const {
    pendingEvent, chooseEventOption,
    pendingRest, doRest,
    pendingShop, closeShop, shopBuyCard, shopRemoveCard,
    deck, shards,
  } = useGame();

  const open = !!(pendingEvent || pendingRest || pendingShop);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 grid place-items-center bg-background/85 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="w-[640px] max-w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-2xl"
          >
            {pendingEvent && (
              <>
                <h2 className="text-center text-xl font-bold text-violet-300">❓ {pendingEvent.title}</h2>
                <p className="mt-3 text-center text-sm text-muted-foreground">{pendingEvent.desc}</p>
                <div className="mt-5 flex flex-col gap-2">
                  {pendingEvent.choices.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => chooseEventOption(i)}
                      className="rounded border border-primary/40 bg-card px-4 py-2 text-sm hover:border-primary hover:bg-primary/10"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {pendingRest && (
              <>
                <h2 className="text-center text-xl font-bold text-emerald-300">🔥 Rest Site</h2>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Choose one. The fire will warm only one wish.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => doRest("heal")}
                    className="rounded-lg border-2 border-rose-500/50 bg-rose-500/5 p-4 text-rose-300 hover:bg-rose-500/15"
                  >
                    <div className="text-2xl">❤</div>
                    <div className="mt-1 font-bold">Rest</div>
                    <div className="text-xs text-muted-foreground">Heal 30% Max HP</div>
                  </button>
                  <button
                    onClick={() => doRest("upgrade")}
                    className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-4 text-amber-300 hover:bg-amber-500/15"
                  >
                    <div className="text-2xl">✦</div>
                    <div className="mt-1 font-bold">Smith</div>
                    <div className="text-xs text-muted-foreground">Pick a free card</div>
                  </button>
                </div>
              </>
            )}

            {pendingShop && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-sky-300">🛒 Shop</h2>
                  <div className="text-sm">⟡ <b className="text-primary">{shards}</b></div>
                </div>
                <div className="mt-3 text-xs uppercase text-muted-foreground">Cards (12 ⟡ each)</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {pendingShop.cards.map((c, i) => (
                    <CardPreview
                      key={i}
                      c={c}
                      onClick={() => shopBuyCard(c)}
                      disabled={shards < 12}
                      footer="Buy 12 ⟡"
                    />
                  ))}
                  {pendingShop.cards.length === 0 && (
                    <div className="col-span-2 py-4 text-center text-xs text-muted-foreground">
                      Sold out.
                    </div>
                  )}
                </div>

                <div className="mt-4 text-xs uppercase text-muted-foreground">
                  Remove a card from your deck ({pendingShop.removeCost} ⟡)
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto rounded border bg-background/40 p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {deck.map((c) => (
                      <button
                        key={c.id}
                        disabled={shards < pendingShop.removeCost}
                        onClick={() => shopRemoveCard(c.id)}
                        className="rounded border bg-card px-2 py-1 text-left text-[11px] hover:border-destructive disabled:opacity-40"
                      >
                        🗑 {c.name} <span className="opacity-60">({c.cost}⚡)</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={closeShop}
                  className="mt-4 w-full rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                >
                  Leave Shop ▶
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
