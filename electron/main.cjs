// Electron main process
// Spawns user's CLI (e.g. `claude`) under a real PTY and bridges data to the renderer.
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
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
/**
 * @type {Map<string, {
 *   status: string,
 *   lastOutput: number,
 *   buffer: string,
 *   lastUserWrite: number,
 *   pendingEchoBytes: number,
 *   aiBytesWindow: number,
 *   windowStart: number
 * }>}
 */
const sessionState = new Map();
const ECHO_WINDOW_MS = 200;     // data within this window after a user keypress is treated as terminal echo
const AI_ACTIVE_THRESHOLD = 24; // need this many net AI bytes per ~400ms window to be considered STREAMING

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
      webviewTag: true,
    },
  });

  console.log("[codequest] Window created, loading URL...");

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[codequest] Page loaded successfully");
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("[codequest] Page failed to load:", errorCode, errorDescription);
  });

  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    if (level >= 2) { // warning or error
      console.log("[codequest:console]", message);
    }
  });

  if (isDev) {
    console.log("[codequest] Loading dev URL:", process.env.CODEQUEST_DEV_URL);
    mainWindow.loadURL(process.env.CODEQUEST_DEV_URL);
  } else {
    const filePath = path.join(__dirname, "..", "dist", "client", "index.html");
    console.log("[codequest] Loading file:", filePath);
    mainWindow.loadFile(filePath);
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
      // reset rolling AI byte window
      if (now - st.windowStart > 400) {
        st.aiBytesWindow = 0;
        st.windowStart = now;
      }
      if (st.status === "STREAMING" && now - st.lastOutput > 1500) {
        st.status = "IDLE_WAITING";
        broadcast("pty:status", { id, status: "IDLE_WAITING" });
      }
    }
  }, 400);
}

ipcMain.handle("pty:list-shells", () => {
  const candidates = [
    "powershell.exe",
    "cmd.exe",
    "claude",
    "clauded",
    "codex",
    "aider",
    process.env.SHELL || "bash",
  ];
  return candidates;
});
ipcMain.handle("pty:get-path", () => {  return process.env.PATH || "";});

ipcMain.handle("pty:spawn", (_evt, opts) => {
  if (!pty) {
    return { ok: false, error: "node-pty native module is not built. Run `npm run rebuild` first." };
  }
  const id = opts?.id || `s_${Date.now().toString(36)}`;
  const command = opts?.command || (process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash");
  const cwd = opts?.cwd && fs.existsSync(opts.cwd) ? opts.cwd : os.homedir();
  const cols = opts?.cols || 100;
  const rows = opts?.rows || 30;
  // Preserve full user PATH and ensure npm bin is accessible
  const userPath = process.env.PATH || "";
  const npmBin = "C:\\Users\\Administrator\\AppData\\Roaming\\npm";
  const fullPath = userPath.includes(npmBin) ? userPath : `${userPath};${npmBin}`;
  try {
    const proc = pty.spawn(command, opts?.args || [], {
      name: "xterm-256color",
      cols, rows, cwd,
      env: { ...process.env, PATH: fullPath, TERM: "xterm-256color", FORCE_COLOR: "1" },
    });
    sessions.set(id, proc);
    sessionState.set(id, {
      status: "IDLE_WAITING", lastOutput: Date.now(), buffer: "",
      lastUserWrite: 0, pendingEchoBytes: 0, aiBytesWindow: 0, windowStart: Date.now(),
    });
    proc.onData((data) => {
      const st = sessionState.get(id);
      if (st) {
        const now = Date.now();
        const len = data.length;
        // Discount bytes that look like terminal echo of recent user keystrokes.
        let aiBytes = len;
        if (st.pendingEchoBytes > 0 && now - st.lastUserWrite < ECHO_WINDOW_MS) {
          const eaten = Math.min(st.pendingEchoBytes, len);
          aiBytes -= eaten;
          st.pendingEchoBytes -= eaten;
        }
        if (now - st.windowStart > 400) {
          st.aiBytesWindow = 0;
          st.windowStart = now;
        }
        st.aiBytesWindow += aiBytes;
        st.buffer = (st.buffer + data).slice(-2000);

        // Flip to STREAMING only when the AI is producing meaningful output,
        // not when the user is just typing into the terminal.
        if (st.aiBytesWindow >= AI_ACTIVE_THRESHOLD) {
          st.lastOutput = now;
          if (st.status !== "STREAMING") {
            st.status = "STREAMING";
            broadcast("pty:status", { id, status: "STREAMING" });
          }
        }
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
  const st = sessionState.get(id);
  if (st) {
    st.lastUserWrite = Date.now();
    // Most TTYs echo each typed char; CR (\r) is often echoed as \r\n. Reserve a small allowance.
    const extra = (String(data).match(/\r/g) || []).length;
    st.pendingEchoBytes = Math.min(2048, (st.pendingEchoBytes || 0) + String(data).length + extra);
  }
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

// =================== Folder picker dialog ===================
ipcMain.handle("dialog:pick-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select working directory for PTY",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// =================== Local .md storage ===================
// Persists game data as plain markdown files in ~/.codequest/
// Also writes SKILL.md so the AI in your CLI can read game context.
const DATA_DIR = path.join(os.homedir(), ".codequest");
function ensureDataDir() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
function safeName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}
ipcMain.handle("storage:dir", () => { ensureDataDir(); return DATA_DIR; });
ipcMain.handle("storage:list", () => {
  ensureDataDir();
  try {
    return fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".md"));
  } catch { return []; }
});
ipcMain.handle("storage:read", (_e, { name }) => {
  ensureDataDir();
  const p = path.join(DATA_DIR, safeName(name));
  try {
    if (!fs.existsSync(p)) return { ok: false, error: "not found" };
    return { ok: true, content: fs.readFileSync(p, "utf8") };
  } catch (e) { return { ok: false, error: String(e) }; }
});
ipcMain.handle("storage:write", (_e, { name, content }) => {
  ensureDataDir();
  const p = path.join(DATA_DIR, safeName(name));
  try {
    fs.writeFileSync(p, String(content), "utf8");
    return { ok: true, path: p };
  } catch (e) { return { ok: false, error: String(e) }; }
});
ipcMain.handle("storage:delete", (_e, { name }) => {
  const p = path.join(DATA_DIR, safeName(name));
  try { if (fs.existsSync(p)) fs.unlinkSync(p); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e) }; }
});

app.whenReady().then(() => { ensureDataDir(); createWindow(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
