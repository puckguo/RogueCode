const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codequest", {
  isElectron: true,
  spawn: (opts) => ipcRenderer.invoke("pty:spawn", opts),
  write: (id, data) => ipcRenderer.invoke("pty:write", { id, data }),
  resize: (id, cols, rows) => ipcRenderer.invoke("pty:resize", { id, cols, rows }),
  kill: (id) => ipcRenderer.invoke("pty:kill", { id }),
  listShells: () => ipcRenderer.invoke("pty:list-shells"),
  watchLog: (id, file) => ipcRenderer.invoke("logwatch:start", { id, file }),
  onData: (cb) => {
    const fn = (_e, p) => cb(p);
    ipcRenderer.on("pty:data", fn);
    return () => ipcRenderer.removeListener("pty:data", fn);
  },
  onStatus: (cb) => {
    const fn = (_e, p) => cb(p);
    ipcRenderer.on("pty:status", fn);
    return () => ipcRenderer.removeListener("pty:status", fn);
  },
  onExit: (cb) => {
    const fn = (_e, p) => cb(p);
    ipcRenderer.on("pty:exit", fn);
    return () => ipcRenderer.removeListener("pty:exit", fn);
  },
});
