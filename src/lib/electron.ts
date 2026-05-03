/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    codequest?: {
      isElectron: true;
      spawn: (opts: { id?: string; command?: string; args?: string[]; cwd?: string; cols?: number; rows?: number }) => Promise<{ ok: boolean; id?: string; error?: string }>;
      write: (id: string, data: string) => Promise<{ ok: boolean }>;
      resize: (id: string, cols: number, rows: number) => Promise<{ ok: boolean }>;
      kill: (id: string) => Promise<{ ok: boolean }>;
      listShells: () => Promise<string[]>;
      watchLog: (id: string, file: string) => Promise<{ ok: boolean; error?: string }>;
      storage: {
        dir: () => Promise<string>;
        list: () => Promise<string[]>;
        read: (name: string) => Promise<{ ok: boolean; content?: string; error?: string }>;
        write: (name: string, content: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
        remove: (name: string) => Promise<{ ok: boolean; error?: string }>;
      };
      onData: (cb: (p: { id: string; data: string }) => void) => () => void;
      onStatus: (cb: (p: { id: string; status: "STREAMING" | "IDLE_WAITING" | "ERROR" }) => void) => () => void;
      onExit: (cb: (p: { id: string; exitCode: number }) => void) => () => void;
    };
  }
}

export const cq = (typeof window !== "undefined" ? window.codequest : undefined);
export const isElectron = !!cq?.isElectron;
