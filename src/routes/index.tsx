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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { PanelLeftClose, PanelLeft, Maximize2, Minimize2 } from "lucide-react";

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
  type CliCollapse = false | "game" | "full";
  const [cliCollapsed, setCliCollapsed] = useState<CliCollapse>(false);
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
            onClick={() => setCliCollapsed((v) => (v === false ? "game" : v === "game" ? "full" : false))}
            className="flex items-center gap-1 rounded border bg-card px-2 py-1 text-xs font-bold text-muted-foreground hover:text-primary"
            title={cliCollapsed === "full" ? "Expand to full" : cliCollapsed === "game" ? "Expand CLI full" : "Collapse CLI to narrow"}
          >
            {cliCollapsed === "full" ? <Maximize2 className="h-3 w-3" /> : cliCollapsed === "game" ? <PanelLeft className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
            {cliCollapsed === "full" ? "Full" : cliCollapsed === "game" ? "Expand" : "Collapse"}
          </button>
          <button
            onClick={() => setStageMax((v) => !v)}
            className="flex items-center gap-1 rounded border bg-card px-2 py-1 text-xs font-bold text-muted-foreground hover:text-primary"
            title="Maximize game stage"
          >
            {stageMax ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {stageMax ? "Restore" : "Maximize"}
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
      ) : cliCollapsed === "full" ? (
        <div className="min-h-0 flex-1">
          <CliTerminal />
        </div>
      ) : cliCollapsed === "game" ? (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={5} minSize={5} maxSize={5} className="flex min-h-0 flex-col">
            <CliTerminal />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel className="flex min-h-0 flex-col">
            {stage}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={30} minSize={15} className="flex min-h-0 flex-col">
            <CliTerminal />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={55} minSize={30} className="flex min-h-0 flex-col">
            {stage}
          </ResizablePanel>
          {mode !== "browser" && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={15} minSize={10} className="flex min-h-0 flex-col">
                {mode === "cards" ? <CardsSidePanel /> : <ArenaSidePanel />}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}
    </div>
  );
}
