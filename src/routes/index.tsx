import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CliTerminal } from "@/components/game/CliTerminal";
import { BattleStage } from "@/components/game/BattleStage";
import { ArenaStage } from "@/components/game/ArenaStage";
import { SidePanel } from "@/components/game/SidePanel";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "CodeQuest — Roguelike paced by your AI coding" },
      {
        name: "description",
        content:
          "A Diablo-difficulty, Grim Dawn-styled roguelike paced by your Claude Code CLI. Cards mode and Brotato-style arena mode.",
      },
    ],
  }),
});

function Index() {
  const [mode, setMode] = useState<"cards" | "arena">("cards");
  return (
    <div className="flex h-screen w-screen flex-col gap-3 overflow-hidden p-3">
      <header className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-primary">Code</span>Quest
          </h1>
          <p className="text-xs text-muted-foreground">
            A roguelike paced by your AI. Keep Claude Code streaming to keep the battle alive.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5 text-xs">
            <button
              onClick={() => setMode("cards")}
              className={`rounded px-3 py-1.5 font-bold ${mode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              🃏 Cards
            </button>
            <button
              onClick={() => setMode("arena")}
              className={`rounded px-3 py-1.5 font-bold ${mode === "arena" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              🎯 Arena
            </button>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            v0.2 · Electron build adds real PTY
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        <div className="col-span-4 flex min-h-0 flex-col">
          <CliTerminal />
        </div>
        <div className="col-span-5 flex min-h-0 flex-col">
          {mode === "cards" ? <BattleStage /> : <ArenaStage />}
        </div>
        <div className="col-span-3 flex min-h-0 flex-col">
          <SidePanel />
        </div>
      </div>
    </div>
  );
}
