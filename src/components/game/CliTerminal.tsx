import { useEffect, useRef, useState } from "react";
import type { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useGame } from "@/game/store";
import { cq, isElectron } from "@/lib/electron";

export function CliTerminal() {
  const { cliStatus, setCliStatus, appendCliOutput, setTokensPerSec, tick } = useGame();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionId = useRef<string | null>(null);

  const [command, setCommand] = useState<string>("claude");
  const [cwd, setCwd] = useState<string>("");
  const [shells, setShells] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Game tick
  useEffect(() => {
    const id = window.setInterval(() => tick(), 200);
    return () => clearInterval(id);
  }, [tick]);

  // Init xterm
  useEffect(() => {
    if (!containerRef.current) return;

    let term: XTerminal | null = null;

    async function initTerminal() {
      const mod: any = await import("@xterm/xterm");
      const Terminal = mod.Terminal;
      const container = containerRef.current;
      if (!container) return () => {};
      const t: any = new Terminal({
        fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
        fontSize: 12,
        theme: {
          background: "#15131c",
          foreground: "#d4ebd1",
          cursor: "#ffb86b",
        },
        cursorBlink: true,
        convertEol: true,
        scrollback: 4000,
      });
      term = t;
      const fit = new FitAddon();
      t.loadAddon(fit);
      t.open(container);
      try { fit.fit(); } catch {}
      termRef.current = t;
      fitRef.current = fit;

      t.onData((data: string) => {
        if (sessionId.current && cq) cq.write(sessionId.current, data);
      });

      const ro = new ResizeObserver(() => {
        try {
          fit.fit();
          if (sessionId.current && cq) cq.resize(sessionId.current, t.cols, t.rows);
        } catch {}
      });
      ro.observe(container);

      if (!isElectron) {
        t.writeln("\x1b[33m⚠  Browser preview mode\x1b[0m");
        t.writeln("This panel is a real PTY when launched as a desktop app.");
        t.writeln("Run:  \x1b[36mnpm run electron:dev\x1b[0m  to attach to claude / aider / your shell.");
        t.writeln("");
        t.writeln("Browser sandbox cannot spawn local processes — the simulated game loop is disabled");
        t.writeln("to honor your 'no mock' request. Open in Electron to play.");
      } else {
        cq!.listShells().then(setShells).catch(() => {});
      }

      return () => {
        ro.disconnect();
        term?.dispose();
        termRef.current = null;
      };
    }

    const cleanup = initTerminal();

    return () => {
      cleanup.then(fn => fn?.());
    };
  }, []);

  // Wire IPC -> xterm + game store
  useEffect(() => {
    if (!cq) return;
    let tokensThisSec = 0;
    let secStart = Date.now();
    const offData = cq.onData(({ id, data }) => {
      if (id !== sessionId.current) return;
      termRef.current?.write(data);
      appendCliOutput(data);
      tokensThisSec += data.length;
      if (Date.now() - secStart > 1000) {
        setTokensPerSec(Math.round(tokensThisSec / 4));
        tokensThisSec = 0;
        secStart = Date.now();
      }
    });
    const offStatus = cq.onStatus(({ id, status }) => {
      if (id !== sessionId.current) return;
      setCliStatus(status);
      if (status !== "STREAMING") setTokensPerSec(0);
    });
    const offExit = cq.onExit(({ id }) => {
      if (id !== sessionId.current) return;
      setRunning(false);
      sessionId.current = null;
      termRef.current?.writeln("\r\n\x1b[31m[process exited]\x1b[0m");
    });
    return () => { offData(); offStatus(); offExit(); };
  }, [appendCliOutput, setCliStatus, setTokensPerSec]);

  async function start() {
    setError(null);
    if (!cq) { setError("Open this app in Electron to spawn a PTY."); return; }
    const t = termRef.current;
    if (!t) return;
    const res = await cq.spawn({
      command,
      cols: t.cols, rows: t.rows,
      cwd: cwd || undefined,
    });
    if (!res.ok) { setError(res.error || "spawn failed"); return; }
    sessionId.current = res.id!;
    setRunning(true);
    t.focus();
  }
  async function stop() {
    if (sessionId.current && cq) await cq.kill(sessionId.current);
    sessionId.current = null;
    setRunning(false);
  }

  const statusColor =
    cliStatus === "STREAMING" ? "text-emerald-400" : cliStatus === "ERROR" ? "text-destructive" : "text-amber-400";

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
        <span className={`inline-block size-2 rounded-full ${cliStatus === "STREAMING" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
        <span className={statusColor + " font-mono"}>{cliStatus}</span>
        <span className="text-muted-foreground font-mono">{running ? `pty · ${command}` : "no session"}</span>
        <div className="ml-auto flex items-center gap-1">
          <input
            list="cq-shells"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={running}
            placeholder="claude"
            className="w-28 rounded border border-border bg-input px-2 py-1 font-mono text-[11px] outline-none disabled:opacity-50"
          />
          <datalist id="cq-shells">
            {shells.map((s) => <option key={s} value={s} />)}
          </datalist>
          <input
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            disabled={running}
            placeholder="cwd (optional)"
            className="w-40 rounded border border-border bg-input px-2 py-1 font-mono text-[11px] outline-none disabled:opacity-50"
          />
          {!running ? (
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
      <div ref={containerRef} className="flex-1 min-h-0 bg-[#15131c] p-2" />
      <div className="border-t bg-card px-3 py-1.5 text-[10px] text-muted-foreground">
        While the PTY streams, the battle advances. When the AI stops outputting for ~1.5s, the game pauses until you type & press Enter in the terminal.
      </div>
    </div>
  );
}
