import { useState } from "react";
import { useGame } from "@/game/store";
import type { Relic } from "@/game/types";
import { motion, AnimatePresence } from "framer-motion";
import { Section } from "./shared";

const rarityColors: Record<Relic["rarity"], string> = {
  common: "border-rarity-common/40 text-rarity-common",
  rare: "border-rarity-rare/60 text-rarity-rare",
  legendary: "border-rarity-legendary/70 text-rarity-legendary",
};

function RelicChip({ relic }: { relic: Relic }) {
  const [showTip, setShowTip] = useState(false);
  const tipId = `relic-tip-${relic.id}`;
  return (
    <div className="relative">
      <button
        aria-describedby={showTip ? tipId : undefined}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        className={`w-full rounded border bg-card/60 px-2 py-1 text-left text-xs transition hover:bg-card ${rarityColors[relic.rarity]}`}
      >
        <span className="font-bold">{relic.name}</span>
        <span className="ml-1 text-[10px] opacity-60">{relic.rarity}</span>
      </button>
      <AnimatePresence>
        {showTip && (
          <motion.div
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={`absolute left-0 top-full z-50 mt-1 w-48 rounded border bg-popover p-2 text-xs shadow-lg ${rarityColors[relic.rarity]}`}
          >
            <div className="font-bold">{relic.name}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">{relic.rarity} relic</div>
            <div className="mt-1 text-foreground/80">{relic.desc}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RelicPanel() {
  const { relics } = useGame();

  return (
    <Section title={`Relics (${relics.length})`} defaultOpen={true} bodyClassName="max-h-40 overflow-y-auto">
      {relics.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">No relics yet</div>
      ) : (
        <div className="flex flex-col gap-1">
          {relics.map((rel) => (
            <RelicChip key={rel.id} relic={rel} />
          ))}
        </div>
      )}
    </Section>
  );
}