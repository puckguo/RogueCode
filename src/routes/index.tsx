import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CliTerminal } from "@/components/game/CliTerminal";
import { BattleStage } from "@/components/game/BattleStage";
import { ArenaStage } from "@/components/game/ArenaStage";
import { BrowserStage } from "@/components/game/BrowserStage";
import { ArenaSidePanel } from "@/components/game/sidepanel/ArenaSidePanel";
import { CardsSidePanel } from "@/components/game/sidepanel/CardsSidePanel";
import { PathBar } from "@/components/game/PathBar";
import { PathNodeModals } from "@/components/game/PathNodeModals";
import { useGame } from "@/game/store";

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
  const [mode, setMode] = useState<"cards" | "arena" | "browser">("cards");
  const [stageMax, setStageMax] = useState(false);
  const { debugMode, setDebugMode } = useGame();

  const stageInner =
    mode === "cards" ? <BattleStage /> : mode === "arena" ? <ArenaStage /> : <BrowserStage />;
  const stage = mode === "cards" ? (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <PathBar />
      <div className="min-h-0 flex-1">{stageInner}</div>
    </div>
  ) : stageInner;

  return (
    <div className="flex h-screen w-screen flex-col gap-3 overflow-hidden p-3">
      <PathNodeModals />
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
            <button
              onClick={() => setMode("browser")}
              className={`rounded px-3 py-1.5 font-bold ${mode === "browser" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              🌐 Browser
            </button>
          </div>
          <button
            onClick={() => setStageMax((v) => !v)}
            className="rounded border bg-card px-2 py-1 text-xs font-bold text-muted-foreground hover:text-primary"
            title="Maximize game stage"
          >
            {stageMax ? "🗗 Restore" : "⛶ Maximize"}
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right text-[10px] text-muted-foreground">
              v0.2 · Electron build adds real PTY
            </div>
            <button
              onClick={() => setDebugMode(!debugMode)}
              className={`rounded px-2 py-1 text-xs font-bold transition-colors ${debugMode ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              title="Debug mode: game runs without waiting for CLI"
            >
              🛠 Debug {debugMode ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </header>

      {stageMax ? (
        <div className="min-h-0 flex-1">{stage}</div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
          <div className="col-span-4 flex min-h-0 flex-col">
            <CliTerminal />
          </div>
          <div className={`flex min-h-0 flex-col ${mode === "browser" ? "col-span-8" : "col-span-5"}`}>
            {stage}
          </div>
          {mode !== "browser" && (
            <div className="col-span-3 flex min-h-0 flex-col">
              {mode === "cards" ? <CardsSidePanel /> : <ArenaSidePanel />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
