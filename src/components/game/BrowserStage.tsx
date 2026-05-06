import React, { useEffect, useRef, useState } from "react";
import { useGame, isAnyCliIdle } from "@/game/store";
import { isElectron } from "@/lib/electron";

type Preset = { name: string; url: string; icon: string };

const PRESETS: Preset[] = [
  { name: "Bilibili", icon: "📺", url: "https://www.bilibili.com" },
  { name: "YouTube", icon: "▶️", url: "https://www.youtube.com" },
  { name: "Twitch", icon: "🎮", url: "https://www.twitch.tv" },
  { name: "Niconico", icon: "🎵", url: "https://www.nicovideo.jp" },
];

// JS injected into the webview to control video playback.
const PAUSE_JS = `
  (function(){
    try {
      const vids = document.querySelectorAll('video');
      vids.forEach(v => { try { v.pause(); v.dataset.cqPaused = '1'; } catch(e){} });
      // Also try YouTube/Bilibili player APIs via space key fallback
    } catch(e){}
  })();
`;

const RESUME_JS = `
  (function(){
    try {
      const vids = document.querySelectorAll('video');
      vids.forEach(v => {
        if (v.dataset.cqPaused === '1') {
          try { v.play(); } catch(e){}
          delete v.dataset.cqPaused;
        }
      });
    } catch(e){}
  })();
`;

export function BrowserStage() {
  const idle = useGame((s) => isAnyCliIdle({ sessions: s.sessions }, s.debugMode));
  const [url, setUrl] = useState("https://www.bilibili.com");
  const [input, setInput] = useState(url);
  const [loading, setLoading] = useState(false);
  const webviewRef = useRef<HTMLElement | null>(null);
  const electron = isElectron;

  // Apply pause/resume to webview when idle state changes.
  useEffect(() => {
    if (!electron) return;
    const wv = webviewRef.current as any;
    if (!wv) return;
    const apply = () => {
      try {
        wv.executeJavaScript(idle ? PAUSE_JS : RESUME_JS, true);
      } catch {}
    };
    // Re-apply periodically while idle (handles ad transitions / SPA navigations).
    apply();
    if (!idle) return;
    const t = setInterval(apply, 1000);
    return () => clearInterval(t);
  }, [idle, electron, url]);

  // Wire webview events.
  useEffect(() => {
    if (!electron) return;
    const wv = webviewRef.current as any;
    if (!wv) return;
    const onStart = () => setLoading(true);
    const onStop = () => setLoading(false);
    const onNav = (e: any) => {
      if (e?.url) setInput(e.url);
    };
    // Intercept popups (target=_blank, window.open) and open them in the same
    // webview so the global pause logic still applies. Otherwise videos open
    // in a separate Electron window that we cannot control.
    const onNewWindow = (e: any) => {
      try { e.preventDefault?.(); } catch {}
      if (e?.url) {
        try { wv.loadURL(e.url); } catch {}
        setUrl(e.url);
        setInput(e.url);
      }
    };
    // Newer Electron event name.
    const onWillNavigate = (e: any) => {
      if (e?.url) setInput(e.url);
    };
    // Inject a script that rewrites all _blank targets to _self and overrides
    // window.open to navigate the current page instead of opening a popup.
    // This is the most reliable way to keep video playback inside our webview.
    const REWRITE_JS = `
      (function(){
        try {
          if (window.__cqRewroteOpen) return;
          window.__cqRewroteOpen = true;
          const _open = window.open;
          window.open = function(url){
            if (url) { try { window.location.href = url; } catch(e){} }
            return null;
          };
          const fix = (root) => {
            try {
              root.querySelectorAll('a[target="_blank"], a[target=_blank]').forEach(a => {
                a.setAttribute('target','_self');
                a.removeAttribute('rel');
              });
              root.querySelectorAll('base[target]').forEach(b => b.setAttribute('target','_self'));
            } catch(e){}
          };
          fix(document);
          const mo = new MutationObserver(() => fix(document));
          mo.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['target']});
          // Capture-phase click handler as a final safety net.
          document.addEventListener('click', (ev) => {
            const a = ev.target && ev.target.closest && ev.target.closest('a[target]');
            if (a && a.target && a.target !== '_self' && a.href) {
              ev.preventDefault();
              ev.stopPropagation();
              window.location.href = a.href;
            }
          }, true);
        } catch(e){}
      })();
    `;
    const onDomReady = () => {
      try { wv.executeJavaScript(REWRITE_JS, true); } catch {}
    };
    wv.addEventListener("did-start-loading", onStart);
    wv.addEventListener("did-stop-loading", onStop);
    wv.addEventListener("did-navigate", onNav);
    wv.addEventListener("did-navigate-in-page", onNav);
    wv.addEventListener("did-frame-finish-load", onDomReady);
    wv.addEventListener("dom-ready", onDomReady);
    wv.addEventListener("will-navigate", onWillNavigate);
    wv.addEventListener("new-window", onNewWindow);
    return () => {
      wv.removeEventListener("did-start-loading", onStart);
      wv.removeEventListener("did-stop-loading", onStop);
      wv.removeEventListener("did-navigate", onNav);
      wv.removeEventListener("did-navigate-in-page", onNav);
      wv.removeEventListener("did-frame-finish-load", onDomReady);
      wv.removeEventListener("dom-ready", onDomReady);
      wv.removeEventListener("will-navigate", onWillNavigate);
      wv.removeEventListener("new-window", onNewWindow);
    };
  }, [electron]);

  const navigate = (target: string) => {
    let u = target.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      // Treat as search query if it has spaces or no dot
      u = u.includes(".") && !u.includes(" ") ? `https://${u}` : `https://www.google.com/search?q=${encodeURIComponent(u)}`;
    }
    setUrl(u);
    setInput(u);
    if (electron && webviewRef.current) {
      try {
        (webviewRef.current as any).loadURL(u);
      } catch {}
    }
  };

  const reload = () => {
    if (electron && webviewRef.current) {
      try { (webviewRef.current as any).reload(); } catch {}
    } else {
      // Force iframe reload by toggling key via state
      setUrl((u) => u + (u.includes("#") ? "" : "#") + Date.now().toString().slice(-3));
      setTimeout(() => setUrl(input), 0);
    }
  };

  const back = () => electron && (webviewRef.current as any)?.goBack?.();
  const forward = () => electron && (webviewRef.current as any)?.goForward?.();

  return (
    <div className="relative flex h-full min-h-0 flex-col rounded-lg border bg-card">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <button onClick={back} className="rounded px-2 py-1 text-xs hover:bg-muted" title="Back">←</button>
        <button onClick={forward} className="rounded px-2 py-1 text-xs hover:bg-muted" title="Forward">→</button>
        <button onClick={reload} className="rounded px-2 py-1 text-xs hover:bg-muted" title="Reload">⟳</button>
        <form
          className="flex flex-1 items-center"
          onSubmit={(e) => { e.preventDefault(); navigate(input); }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
            placeholder="https://..."
          />
        </form>
        <span className={`ml-1 text-[10px] ${idle ? "text-amber-400" : "text-emerald-400"}`}>
          {idle ? "⏸ Paused" : "▶ Live"}
        </span>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1 border-b px-2 py-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => navigate(p.url)}
            className="rounded border bg-background px-2 py-1 text-[11px] hover:border-primary"
          >
            {p.icon} {p.name}
          </button>
        ))}
        {loading && <span className="ml-auto self-center text-[10px] text-muted-foreground">loading…</span>}
      </div>

      {/* Viewport */}
      <div className="relative min-h-0 flex-1 bg-black">
        {electron ? (
          React.createElement("webview", {
            ref: (el: any) => { webviewRef.current = el; },
            src: url,
            allowpopups: "true",
            partition: "persist:cqbrowser",
            style: { width: "100%", height: "100%", display: "inline-flex" },
          })
        ) : (
          <iframe
            key={url}
            src={url}
            title="browser"
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        )}

        {/* Pause overlay — always shown when idle. In web mode it actually blocks playback by covering the iframe. */}
        {idle && (
          <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-sm">
            <div className="text-4xl">⏸</div>
            <div className="text-sm font-bold text-amber-300">Video Paused — AI is idle</div>
            <div className="text-xs text-muted-foreground">
              {electron
                ? "Auto-paused all <video> elements. Resume your AI to continue."
                : "Web preview cannot control cross-origin video. Run the desktop build for true auto-pause."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
