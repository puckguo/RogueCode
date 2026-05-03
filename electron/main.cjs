// Electron main process
// Spawns user's CLI (e.g. `claude`) under a real PTY and bridges data to the renderer.
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

let pty;
try {
  pty = require("node-pty");
} catch (err) {
  console.error("[codequest] node-pty not built. Run `npm run rebuild`.", err);
}

const isDev = !!process.env.CODEQUEST_DEV_URL;

/** @type {Map<string, any>} */
const sessions = new Map();
/** @type {Map<string, { status: string, lastOutput: number, buffer: string }>} */
const sessionState = new Map();

let mainWindow;
let idleWatcher;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#1a1622",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.CODEQUEST_DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "client", "index.html"));
  }

  mainWindow.on("closed", () => {
    for (const p of sessions.values()) {
      try { p.kill(); } catch {}
    }
    sessions.clear();
    sessionState.clear();
  });
}

function broadcast(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function startIdleWatcher() {
  if (idleWatcher) return;
  idleWatcher = setInterval(() => {
    const now = Date.now();
    for (const [id, st] of sessionState.entries()) {
      if (st.status === "STREAMING" && now - st.lastOutput > 1500) {
        st.status = "IDLE_WAITING";
        broadcast("pty:status", { id, status: "IDLE_WAITING" });
      }
    }
  }, 400);
}

ipcMain.handle("pty:list-shells", () => {
  const candidates = [
    "claude",
    "codex",
    "aider",
    process.env.SHELL || (process.platform === "win32" ? "powershell.exe" : "bash"),
  ];
  return candidates;
});

ipcMain.handle("pty:spawn", (_evt, opts) => {
  if (!pty) {
    return { ok: false, error: "node-pty native module is not built. Run `npm run rebuild` first." };
  }
  const id = opts?.id || `s_${Date.now().toString(36)}`;
  const command = opts?.command || (process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash");
  const cwd = opts?.cwd && fs.existsSync(opts.cwd) ? opts.cwd : os.homedir();
  const cols = opts?.cols || 100;
  const rows = opts?.rows || 30;
  try {
    const proc = pty.spawn(command, opts?.args || [], {
      name: "xterm-256color",
      cols, rows, cwd,
      env: { ...process.env, TERM: "xterm-256color", FORCE_COLOR: "1" },
    });
    sessions.set(id, proc);
    sessionState.set(id, { status: "IDLE_WAITING", lastOutput: Date.now(), buffer: "" });
    proc.onData((data) => {
      const st = sessionState.get(id);
      if (st) {
        const wasIdle = st.status !== "STREAMING";
        st.lastOutput = Date.now();
        st.status = "STREAMING";
        st.buffer = (st.buffer + data).slice(-2000);
        if (wasIdle) broadcast("pty:status", { id, status: "STREAMING" });
      }
      broadcast("pty:data", { id, data });
    });
    proc.onExit(({ exitCode }) => {
      broadcast("pty:exit", { id, exitCode });
      sessions.delete(id);
      sessionState.delete(id);
    });
    startIdleWatcher();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});

ipcMain.handle("pty:write", (_evt, { id, data }) => {
  const proc = sessions.get(id);
  if (!proc) return { ok: false };
  try { proc.write(data); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e) }; }
});

ipcMain.handle("pty:resize", (_evt, { id, cols, rows }) => {
  const proc = sessions.get(id);
  if (!proc) return { ok: false };
  try { proc.resize(cols, rows); return { ok: true }; }
  catch { return { ok: false }; }
});

ipcMain.handle("pty:kill", (_evt, { id }) => {
  const proc = sessions.get(id);
  if (proc) try { proc.kill(); } catch {}
  sessions.delete(id);
  sessionState.delete(id);
  return { ok: true };
});

// Optional log-file watcher fallback
ipcMain.handle("logwatch:start", (_evt, { id, file }) => {
  if (!fs.existsSync(file)) return { ok: false, error: "file not found" };
  const state = { status: "IDLE_WAITING", lastOutput: Date.now(), buffer: "" };
  sessionState.set(id, state);
  let lastSize = fs.statSync(file).size;
  const watcher = fs.watch(file, { persistent: true }, () => {
    try {
      const stat = fs.statSync(file);
      if (stat.size > lastSize) {
        const stream = fs.createReadStream(file, { start: lastSize, end: stat.size });
        let buf = "";
        stream.on("data", (c) => (buf += c.toString()));
        stream.on("end", () => {
          state.lastOutput = Date.now();
          if (state.status !== "STREAMING") {
            state.status = "STREAMING";
            broadcast("pty:status", { id, status: "STREAMING" });
          }
          broadcast("pty:data", { id, data: buf });
        });
        lastSize = stat.size;
      }
    } catch {}
  });
  startIdleWatcher();
  sessions.set(id, { kill: () => watcher.close() });
  return { ok: true };
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
