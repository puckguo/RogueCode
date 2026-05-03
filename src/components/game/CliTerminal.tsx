import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/store";

// Simulated CLI: streams "AI tokens" then goes idle waiting for prompt.
// In Electron, this gets replaced with a node-pty bridge over IPC.

const SAMPLE_CHUNKS = [
  "Reading project structure...\n",
  "Found 23 source files. Analyzing imports.\n",
  "Refactoring utils/helpers.ts → extracting pure fns.\n",
  "  + export function memoize<T>(fn: T): T { ... }\n",
  "  + export function debounce(fn, ms) { ... }\n",
  "Writing src/game/store.ts (zustand slice)...\n",
  "Adding tests for combat resolution...\n",
  "  ✓ deals correct damage with crit\n",
  "  ✓ end turn refreshes energy\n",
  "  ✓ enemy intent decremented on death\n",
  "Running tsc --noEmit ...\n",
  "  no errors found.\n",
  "Committing: feat(game): wave progression & rewards\n",
  "  [main 9f3a1c2] feat(game): wave progression & rewards\n",
  "Patch applied. Shall I continue with the talent UI?\n",
];

export function CliTerminal() {
  const { cliBuffer, cliStatus, pendingPrompt, setPendingPrompt, submitPrompt, appendCliOutput, setCliStatus, setTokensPerSec, tick } =
    useGame();
  const scrollRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number | null>(null);
  const [autoLoop, setAutoLoop] = useState(false);

  // Game tick
  useEffect(() => {
    const id = window.setInterval(() => tick(), 200);
    return () => clearInterval(id);
  }, [tick]);

  // Stream tokens while STREAMING. After the script ends, go IDLE_WAITING.
  useEffect(() => {
    if (cliStatus !== "STREAMING") return;
    let cancelled = false;
    let chunkIdx = 0;
    let charIdx = 0;
    let tokensThisSec = 0;
    let secStart = Date.now();

    const step = () => {
      if (cancelled) return;
      if (chunkIdx >= SAMPLE_CHUNKS.length) {
        setCliStatus("IDLE_WAITING");
        setTokensPerSec(0);
        if (autoLoop) {
          window.setTimeout(() => {
            if (!cancelled) submitPrompt("continue");
          }, 1500);
        }
        return;
      }
      const chunk = SAMPLE_CHUNKS[chunkIdx];
      const piece = chunk.slice(charIdx, charIdx + 4);
      appendCliOutput(piece);
      charIdx += 4;
      tokensThisSec += piece.length;
      if (Date.now() - secStart > 1000) {
        setTokensPerSec(tokensThisSec);
        tokensThisSec = 0;
        secStart = Date.now();
      }
      if (charIdx >= chunk.length) {
        charIdx = 0;
        chunkIdx += 1;
      }
      window.setTimeout(step, 35 + Math.random() * 60);
    };
    step();
    return () => {
      cancelled = true;
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [cliStatus, autoLoop, appendCliOutput, setCliStatus, setTokensPerSec, submitPrompt]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [cliBuffer]);

  const statusColor =
    cliStatus === "STREAMING" ? "text-emerald-400" : cliStatus === "ERROR" ? "text-destructive" : "text-amber-400";

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-2 rounded-full ${cliStatus === "STREAMING" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span className={statusColor + " font-mono"}>{cliStatus}</span>
          <span className="text-muted-foreground font-mono">claude-code · session#1</span>
        </div>
        <label className="flex items-center gap-1 text-muted-foreground">
          <input type="checkbox" checked={autoLoop} onChange={(e) => setAutoLoop(e.target.checked)} />
          auto-loop
        </label>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[oklch(0.12_0.01_260)] p-3 terminal-text">
        <pre className="whitespace-pre-wrap text-emerald-200/90">{cliBuffer || "$ claude\nReady. Type a prompt below to begin.\n"}</pre>
        {cliStatus === "IDLE_WAITING" && (
          <div className="mt-2 text-amber-300">
            ⏸ AI is waiting for your input <span className="caret">▍</span>
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t bg-card px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitPrompt(pendingPrompt);
        }}
      >
        <span className="font-mono text-xs text-primary">›</span>
        <input
          value={pendingPrompt}
          onChange={(e) => setPendingPrompt(e.target.value)}
          placeholder={cliStatus === "IDLE_WAITING" ? "Type a prompt to resume the game…" : "Send instruction"}
          className="flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
          autoFocus
        />
        <button
          type="submit"
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Send ⏎
        </button>
      </form>
    </div>
  );
}
