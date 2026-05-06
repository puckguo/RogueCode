import { useGame } from "@/game/store";
import type { PathNodeType } from "@/game/types";

const NODE_META: Record<PathNodeType, { icon: string; label: string; color: string }> = {
  enemy: { icon: "👾", label: "Enemy", color: "border-rose-500/60 text-rose-300" },
  elite: { icon: "💀", label: "Elite", color: "border-amber-500/70 text-amber-300" },
  boss: { icon: "🐉", label: "Boss", color: "border-rarity-legendary text-rarity-legendary" },
  event: { icon: "❓", label: "Event", color: "border-violet-500/60 text-violet-300" },
  rest: { icon: "🔥", label: "Rest", color: "border-emerald-500/60 text-emerald-300" },
  shop: { icon: "🛒", label: "Shop", color: "border-sky-500/60 text-sky-300" },
};

export function PathBar() {
  const { path, pathIdx, inRun } = useGame();
  if (!inRun || path.length === 0) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-card/80 px-2 py-2">
      {path.map((n, i) => {
        const meta = NODE_META[n.type];
        const isCurrent = i === pathIdx;
        const isPast = i < pathIdx || n.cleared;
        return (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <div
              title={`${meta.label} — wave ${n.wave}`}
              className={`grid size-9 place-items-center rounded-md border-2 text-base transition ${meta.color} ${
                isCurrent
                  ? "scale-110 ring-2 ring-primary bg-primary/20"
                  : isPast
                    ? "opacity-40 grayscale"
                    : "bg-background/40"
              }`}
            >
              {meta.icon}
            </div>
            {i < path.length - 1 && (
              <div className={`h-0.5 w-3 ${isPast ? "bg-primary/60" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
