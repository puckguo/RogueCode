import { useEffect, useRef, useState } from "react";
import type { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useGame } from "@/game/store";
import { cq, isElectron } from "@/lib/electron";
import type { CliStatus } from "@/game/types";

type TermBundle = {
  term: XTerminal;
  fit: FitAddon;
  el: HTMLDivElement;
  ptyId: string | null;
  command: string;
  cwd: string;
  running: boolean;
  // tokens-per-second tracking, per session
  tokensThisSec: number;
  secStart: number;
};

export function CliTerminal() {
  const {
    sessions,
    activeSessionId,
    addSession,
    removeSession,
    setActiveSession,
    renameSession,
    updateSessionStatus,
    updateSessionCommand,
    updateSessionCwd,
    appendCliOutput,
    setTokensPerSec,
    tick,
  } = useGame();

  const hostRef = useRef<HTMLDivElement>(null);
  const bundlesRef = useRef<Map<string, TermBundle>>(new Map());
  const [shells, setShells] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tickN, setTickN] = useState(0); // re-render for running flag etc.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Game tick (keep at the component level so it survives session switches).
  useEffect(() => {
    const id = window.setInterval(() => tick(), 200);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    if (isElectron && cq) cq.listShells().then(setShells).catch(() => {});
  }, []);

  // Make sure each session in the store has a matching xterm instance.
  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;

    async function ensureBundles() {
      const mod: any = await import("@xterm/xterm");
      const Terminal = mod.Terminal;
      if (cancelled) return;
      for (const sess of sessions) {
        if (bundlesRef.current.has(sess.id)) continue;
        const el = document.createElement("div");
        el.className = "absolute inset-0 p-2";
        el.style.display = sess.id === activeSessionId ? "block" : "none";
        hostRef.current!.appendChild(el);
        const t: any = new Terminal({
          fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
          fontSize: 12,
          theme: { background: "#15131c", foreground: "#d4ebd1", cursor: "#ffb86b" },
          cursorBlink: true,
          convertEol: true,
          scrollback: 4000,
        });
        const fit = new FitAddon();
        t.loadAddon(fit);
        t.open(el);
        try { fit.fit(); } catch {}
        const bundle: TermBundle = {
          term: t, fit, el, ptyId: null,
          command: "claude", cwd: "", running: false,
          tokensThisSec: 0, secStart: Date.now(),
        };
        bundlesRef.current.set(sess.id, bundle);

        t.onData((data: string) => {
          if (bundle.ptyId && cq) cq.write(bundle.ptyId, data);
        });

        const ro = new ResizeObserver(() => {
          try {
            fit.fit();
            if (bundle.ptyId && cq) cq.resize(bundle.ptyId, t.cols, t.rows);
          } catch {}
        });
        ro.observe(el);

        if (!isElectron) {
          t.writeln("\x1b[33m⚠  Browser preview mode\x1b[0m");
          t.writeln(`This is "${sess.label}". In Electron, this attaches to a real PTY.`);
          t.writeln("Run:  \x1b[36mnpm run electron:dev\x1b[0m");
        }
      }

      // Remove bundles whose session is gone
      for (const [id, b] of bundlesRef.current.entries()) {
        if (!sessions.find((s) => s.id === id)) {
          if (b.ptyId && cq) cq.kill(b.ptyId).catch(() => {});
          b.term.dispose();
          b.el.remove();
          bundlesRef.current.delete(id);
        }
      }

      // Toggle visibility based on activeSessionId
      for (const [id, b] of bundlesRef.current.entries()) {
        b.el.style.display = id === activeSessionId ? "block" : "none";
        if (id === activeSessionId) {
          try { b.fit.fit(); b.term.focus(); } catch {}
        }
      }
    }

    void ensureBundles();
    return () => { cancelled = true; };
  }, [sessions, activeSessionId]);

  // Wire one set of IPC listeners that route by ptyId → session id.
  useEffect(() => {
    if (!cq) return;
    const offData = cq.onData(({ id: ptyId, data }) => {
      // find which session owns this pty
      let owningSessionId: string | null = null;
      for (const [sid, b] of bundlesRef.current.entries()) {
        if (b.ptyId === ptyId) { owningSessionId = sid; break; }
      }
      if (!owningSessionId) return;
      const b = bundlesRef.current.get(owningSessionId)!;
      b.term.write(data);
      // route store updates only for the active session (game effects)
      if (owningSessionId === useGame.getState().activeSessionId) {
        appendCliOutput(data);
      }
      b.tokensThisSec += data.length;
      if (Date.now() - b.secStart > 1000) {
        if (owningSessionId === useGame.getState().activeSessionId) {
          setTokensPerSec(Math.round(b.tokensThisSec / 4));
        }
        b.tokensThisSec = 0;
        b.secStart = Date.now();
      }
    });
    const offStatus = cq.onStatus(({ id: ptyId, status }) => {
      let owning: string | null = null;
      for (const [sid, b] of bundlesRef.current.entries()) {
        if (b.ptyId === ptyId) { owning = sid; break; }
      }
      if (!owning) return;
      updateSessionStatus(owning, status as CliStatus);
      if (status !== "STREAMING" && owning === useGame.getState().activeSessionId) {
        setTokensPerSec(0);
      }
    });
    const offExit = cq.onExit(({ id: ptyId }) => {
      for (const [sid, b] of bundlesRef.current.entries()) {
        if (b.ptyId === ptyId) {
          b.running = false;
          b.ptyId = null;
          b.term.writeln("\r\n\x1b[31m[process exited]\x1b[0m");
          updateSessionStatus(sid, "IDLE_WAITING");
          setTickN((n) => n + 1);
        }
      }
    });
    return () => { offData(); offStatus(); offExit(); };
  }, [appendCliOutput, setTokensPerSec, updateSessionStatus]);

  const activeBundle = activeSessionId ? bundlesRef.current.get(activeSessionId) : undefined;
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  async function start() {
    setError(null);
    if (!cq || !activeSessionId || !activeSession) { setError("Open this app in Electron to spawn a PTY."); return; }
    const b = bundlesRef.current.get(activeSessionId);
    if (!b) return;
    // Sync command/cwd from store to bundle before spawning
    b.command = activeSession.command;
    b.cwd = activeSession.cwd;
    const res = await cq.spawn({
      command: b.command, cols: b.term.cols, rows: b.term.rows,
      cwd: b.cwd || undefined,
    });
    if (!res.ok) { setError(res.error || "spawn failed"); return; }
    b.ptyId = res.id!;
    b.running = true;
    updateSessionStatus(activeSessionId, "STREAMING", true);
    b.term.focus();
    setTickN((n) => n + 1);
  }
  async function stop() {
    if (!activeSessionId) return;
    const b = bundlesRef.current.get(activeSessionId);
    if (b?.ptyId && cq) await cq.kill(b.ptyId);
    if (b) { b.ptyId = null; b.running = false; }
    updateSessionStatus(activeSessionId, "IDLE_WAITING");
    setTickN((n) => n + 1);
  }

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b bg-background/40 px-2 py-1.5 text-xs overflow-x-auto">
        {sessions.map((s) => {
          const isActive = s.id === activeSessionId;
          // Idle = hasStarted && status !== STREAMING. Blink to alert the user.
          const idleAlert = s.hasStarted && s.status !== "STREAMING";
          const dotColor =
            s.status === "STREAMING" ? "bg-emerald-400" :
            s.status === "ERROR" ? "bg-destructive" : "bg-amber-400";
          return (
            <div
              key={s.id}
              className={`group flex items-center gap-1.5 rounded border px-2 py-1 cursor-pointer transition ${
                isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/40"
              } ${idleAlert ? "cli-idle-blink" : ""}`}
              onClick={() => setActiveSession(s.id)}
              title={`${s.label} · ${s.status}${idleAlert ? " — idle, game paused" : ""}`}
            >
              <span className={`inline-block size-2 rounded-full ${dotColor} ${s.status === "STREAMING" ? "animate-pulse" : ""}`} />
              {editingId === s.id ? (
                <input
                  autoFocus
                  defaultValue={s.label}
                  onBlur={(e) => { renameSession(s.id, e.target.value || s.label); setEditingId(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { renameSession(s.id, (e.target as HTMLInputElement).value || s.label); setEditingId(null); }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-20 bg-transparent font-mono text-[11px] outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="font-mono"
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingId(s.id); }}
                >
                  {s.label}
                </span>
              )}
              {sessions.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                  className="ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                  title="Close"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={() => addSession()}
          className="rounded border border-dashed border-border px-2 py-1 text-muted-foreground hover:text-primary hover:border-primary"
          title="New CLI tab"
        >
          + New
        </button>
        <div className="ml-auto text-[10px] text-muted-foreground font-mono">
          {sessions.filter((x) => x.hasStarted).length === 0
            ? "no CLI started"
            : sessions.some((x) => x.hasStarted && x.status !== "STREAMING")
              ? <span className="text-amber-400">⏸ {sessions.filter((x) => x.hasStarted && x.status !== "STREAMING").length} idle — game paused</span>
              : <span className="text-emerald-400">▶ all streaming</span>}
        </div>
      </div>

      {/* Active session controls */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
        {activeSession && (
          <>
            <span className={`inline-block size-2 rounded-full ${activeSession.status === "STREAMING" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className={(activeSession.status === "STREAMING" ? "text-emerald-400" : "text-amber-400") + " font-mono"}>{activeSession.status}</span>
            <span className="text-muted-foreground font-mono">
              {activeBundle?.running ? `pty · ${activeBundle.command}` : "no session"}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <input
            list="cq-shells"
            value={activeSession?.command ?? "claude"}
            onChange={(e) => { if (activeSessionId) { updateSessionCommand(activeSessionId, e.target.value); } }}
            disabled={activeBundle?.running}
            placeholder="claude"
            className="w-28 rounded border border-border bg-input px-2 py-1 font-mono text-[11px] outline-none disabled:opacity-50"
          />
          <datalist id="cq-shells">
            {shells.map((s) => <option key={s} value={s} />)}
          </datalist>
          <input
            value={activeSession?.cwd ?? ""}
            onChange={(e) => { if (activeSessionId) { updateSessionCwd(activeSessionId, e.target.value); } }}
            disabled={activeBundle?.running}
            placeholder="cwd"
            className="w-32 rounded border border-border bg-input px-2 py-1 font-mono text-[11px] outline-none disabled:opacity-50"
          />
          <button
            onClick={async () => {
              if (!cq || !activeSessionId) return;
              const folder = await cq.pickFolder();
              if (folder) { updateSessionCwd(activeSessionId, folder); }
            }}
            disabled={activeBundle?.running}
            className="rounded border border-border bg-secondary px-2 py-1 text-[11px] text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            📁
          </button>
          {!activeBundle?.running ? (
            <button onClick={start} className="rounded bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90">
              ▶ Spawn
            </button>
          ) : (
            <button onClick={stop} className="rounded border border-destructive bg-destructive/10 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20">
              ■ Kill
            </button>
          )}
        </div>
      </div>
      {error && <div className="border-b border-destructive/40 bg-destructive/10 px-3 py-1 text-[11px] text-destructive">{error}</div>}

      {/* Terminal host: all xterm panes are rendered here, only the active one is visible. */}
      <div className="relative flex-1 min-h-0 bg-[#15131c]">
        <div ref={hostRef} className="absolute inset-0" />
      </div>

      <div className="border-t bg-card px-3 py-1.5 text-[10px] text-muted-foreground">
        Multi-CLI: any idle terminal pauses the game and blinks its tab. Resume by giving the AI a new prompt.
      </div>
    </div>
  );
}
