// Dockview hosts the spatial workspace. The server's tree is authoritative; this component applies it, and reports the human's gestures.
import React, { useCallback, useEffect, useRef } from "react";
import { DockviewReact, type DockviewReadyEvent, type IDockviewPanelProps, type IDockviewPanelHeaderProps, type DockviewApi } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { send, useStore, getState } from "./store";
import { SurfaceView } from "./Surface";
import { toDockview, fromDockview } from "./layoutMap";

const canon = (n: any): any => (!n ? null : n.t === "tabs" ? { t: "tabs", p: n.panels } : { t: "split", d: n.dir, k: n.kids.map(canon) });

function Tab(props: IDockviewPanelHeaderProps) {
  const id = props.api.id;
  const panel = useStore((s) => s.panels[id]);
  const asking = useStore((s) => Object.values(s.asks).some((a: any) => a.surface === id && a.state === "open"));
  return (
    <div className="tab-title">
      {asking ? <span className="ask-dot" title="waiting for your answer" /> : null}
      <span>{panel?.spec.title ?? id}</span>
      <button className="tab-btn" title={panel?.pinned ? "unpin (the agent may then close it)" : "pin (the agent cannot close or move it)"} aria-label="pin" onClick={(e) => { e.stopPropagation(); send({ op: "human.pin", id, pinned: !panel?.pinned }); }}><span className={panel?.pinned ? "pinned" : ""}>{panel?.pinned ? "◆" : "◇"}</span></button>
      <button className="tab-btn" title="minimize to the strip" aria-label="minimize" onClick={(e) => { e.stopPropagation(); send({ op: "human.size", id, state: "minimized" }); }}>–</button>
      <button className="tab-btn" title="close" aria-label="close" onClick={(e) => { e.stopPropagation(); send({ op: "human.close", id }); }}>×</button>
    </div>
  );
}
const Body = (p: IDockviewPanelProps) => <SurfaceView id={p.api.id} />;

export function Workspace() {
  const apiRef = useRef<DockviewApi | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const applying = useRef(false);
  const moved = useRef(new Set<string>());
  const timer = useRef<any>(null);
  const tree = useStore((s) => s.tree);
  const maximized = useStore((s) => s.maximized);
  const titles = useStore((s) => Object.fromEntries(Object.values(s.panels).map((p) => [p.id, p.spec.title])));
  const live = useStore((s) => s.conn === "live");

  const apply = useCallback(() => {
    const api = apiRef.current, host = hostRef.current; if (!api || !host) return;
    const st = getState();
    const cur = (() => { try { return api.panels.length ? fromDockview(api.toJSON()) : null; } catch { return null; } })();
    if (JSON.stringify(canon(cur)) === JSON.stringify(canon(st.tree))) {
      // same topology: only the active tab and focus may differ
      const active = st.focus && api.getPanel(st.focus); if (active && !active.api.isActive) { applying.current = true; active.api.setActive(); applying.current = false; }
      return;
    }
    applying.current = true;
    try {
      const w = host.clientWidth || 1200, h = host.clientHeight || 700;
      if (!st.tree) api.clear(); else api.fromJSON(toDockview(st.tree, titles, w, h) as any);
      const f = st.focus && api.getPanel(st.focus); if (f) f.api.setActive();
    } finally { setTimeout(() => { applying.current = false; }, 50); }
  }, [titles]);

  useEffect(() => { apply(); }, [tree, apply, live]);
  useEffect(() => {
    const api = apiRef.current; if (!api) return;
    for (const g of api.groups) { if (maximized && g.panels.some((p) => p.id === maximized)) { if (!g.api.isMaximized()) g.api.maximize(); } else if (g.api.isMaximized()) g.api.exitMaximized(); }
  }, [maximized, tree]);

  const report = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const api = apiRef.current; if (!api || applying.current) return;
      const t = fromDockview(api.toJSON()); const st = getState();
      if (JSON.stringify(canon(t)) === JSON.stringify(canon(st.tree)) && !moved.current.size) { /* sizes only */ }
      const ids = [...moved.current]; moved.current.clear();
      send({ op: "human.layout", tree: t, moved: ids, focus: api.activePanel?.id ?? null });
    }, 250);
  }, []);

  const onReady = (e: DockviewReadyEvent) => {
    apiRef.current = e.api;
    e.api.onDidLayoutChange(report);
    e.api.onDidMovePanel((m) => { moved.current.add(m.panel.id); });
    e.api.onDidActivePanelChange((p) => { if (!applying.current && p) report(); });
    apply();
  };

  return (
    <div className="dock dockview-theme-cockpit" ref={hostRef}>
      <DockviewReact className="dockview-theme-cockpit" components={{ surface: Body }} defaultTabComponent={Tab} onReady={onReady} disableFloatingGroups />
    </div>
  );
}
