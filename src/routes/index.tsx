import { createFileRoute } from "@tanstack/react-router";
import { CliTerminal } from "@/components/game/CliTerminal";
import { BattleStage } from "@/components/game/BattleStage";
import { SidePanel } from "@/components/game/SidePanel";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "CodeQuest — Roguelike paced by your AI coding" },
      {
        name: "description",
        content:
          "A Diablo-difficulty, Grim Dawn-styled roguelike card game that's paced by your Claude Code CLI: AI streams = combat advances, AI idle = you must prompt to resume.",
      },
    ],
  }),
});

function Index() {
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
        <div className="text-right text-[10px] text-muted-foreground">
          v0.1 MVP · localStorage save · Electron build adds real PTY
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        <div className="col-span-4 flex min-h-0 flex-col">
          <CliTerminal />
        </div>
        <div className="col-span-5 flex min-h-0 flex-col">
          <BattleStage />
        </div>
        <div className="col-span-3 flex min-h-0 flex-col">
          <SidePanel />
        </div>
      </div>
    </div>
  );
}
