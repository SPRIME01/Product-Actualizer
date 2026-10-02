// Client state: one WebSocket, one store. The store only holds what the server told it; every mutation is a request that the server validates.
import { useSyncExternalStore, useEffect, useRef, useState } from "react";

export type Panel = { id: string; spec: any; placedBy: "agent" | "human"; pinned: boolean; minimized: boolean; controls: Record<string, any>; selection: Record<string, string | null>; rev: number };
export type State = {
  conn: "connecting" | "live" | "offline"; role: string; rev: number;
  panels: Record<string, Panel>; tree: any; focus: string | null; maximized: string | null; asks: Record<string, any>; notes: any[];
  rail: any | null; hints: any[]; events: any[]; epoch: number; kinds: string[]; toast: { text: string; bad?: boolean } | null; agentToken?: string;
};
const init: State = { conn: "connecting", role: "", rev: 0, panels: {}, tree: null, focus: null, maximized: null, asks: {}, notes: [], rail: null, hints: [], events: [], epoch: 0, kinds: [], toast: null };

let state = init;
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
export const getState = () => state;
export function useStore<T>(sel: (s: State) => T): T {
  const last = useRef<{ s: State; v: T } | null>(null);
  const get = () => { if (last.current && last.current.s === state) return last.current.v; const v = sel(state); if (last.current && Object.is(last.current.v, v)) { last.current.s = state; return last.current.v; } last.current = { s: state, v }; return v; };
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, get);
}

// ---- connection -----------------------------------------------------------------------------------------------
let ws: WebSocket | null = null, rid = 0, retry = 0, timer: any;
const pending = new Map<number, (r: any) => void>();
export const token = (): string => {
  const m = /[#&]t=([\w-]+)/.exec(location.hash);
  if (m) { try { sessionStorage.setItem("cockpit.t", m[1]); } catch { /* private mode */ } history.replaceState(null, "", location.pathname); return m[1]; }
  try { return sessionStorage.getItem("cockpit.t") ?? ""; } catch { return ""; }
};
let TOKEN = "";

function applyDelta(m: any, full: boolean) {
  const panels = full ? {} : { ...state.panels };
  for (const [id, p] of Object.entries(m.panels ?? {})) panels[id] = p as Panel;
  for (const id of m.removed ?? []) delete panels[id];
  set({ panels, rev: m.rev, tree: m.tree, focus: m.focus, maximized: m.maximized, asks: m.asks, notes: m.notes });
}

export function connect() {
  TOKEN = token();
  if (!TOKEN) { set({ conn: "offline", toast: { text: "No cockpit token. Open the cockpit with `actualize cockpit up`.", bad: true } }); return; }
  const open = () => {
    ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?t=${TOKEN}`);
    ws.onopen = () => { retry = 0; };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      switch (m.t) {
        case "snapshot": applyDelta(m.ws, true); set({ conn: "live", rail: m.rail, hints: m.hints ?? [], events: m.events, epoch: state.epoch + 1, kinds: ["all"] }); break;
        case "ws": applyDelta(m, false); break;
        case "rail": set({ rail: m.rail }); break;
        case "hints": set({ hints: m.hints }); break;
        case "events": set({ events: [...state.events, ...m.events].slice(-200) }); break;
        case "invalidate": set({ epoch: state.epoch + 1, kinds: m.kinds }); break;
        case "ack": pending.get(m.rid)?.(m.result); pending.delete(m.rid); break;
      }
    };
    ws.onclose = () => { set({ conn: "offline" }); clearTimeout(timer); timer = setTimeout(open, Math.min(8000, 400 * 2 ** retry++)); };   // the run never depended on us; reconnect restores the snapshot
    ws.onerror = () => ws?.close();
  };
  open();
}

export function send(op: Record<string, any>): Promise<any> {
  return new Promise((resolve) => {
    if (!ws || ws.readyState !== 1) return resolve({ ok: false, code: "OFFLINE", message: "not connected" });
    const id = ++rid; pending.set(id, (r) => { if (!r.ok) toast(r.message ?? r.code, true); resolve(r); });
    ws.send(JSON.stringify({ rid: id, ...op }));
  });
}
export function toast(text: string, bad = false) { set({ toast: { text, bad } }); setTimeout(() => { if (state.toast?.text === text) set({ toast: null }); }, 3500); }

// ---- reads ------------------------------------------------------------------------------------------------------
const hdr = () => ({ "x-cockpit-token": TOKEN, "content-type": "application/json" });
export async function api(path: string, body?: any) { const r = await fetch(path, { method: body ? "POST" : "GET", headers: hdr(), body: body ? JSON.stringify(body) : undefined }); return r.json(); }

// Lazy, paged, refetched when the process says something changed. Identical responses do not re-render.
export function useSource(source: string | undefined, o: { filter?: any; sort?: any; limit?: number; data?: any; as?: string } = {}) {
  const [res, setRes] = useState<any>(null);
  const epoch = useStore((s) => s.epoch);
  const kinds = useStore((s) => s.kinds);
  const key = JSON.stringify([source, o.filter, o.sort, o.limit, o.as, o.data ? o.data.length : 0]);
  const seen = useRef("");
  const reload = useRef(true);
  useEffect(() => { reload.current = true; }, [key]);
  useEffect(() => {
    if (!source && !o.data) return;
    // process-backed sources follow events; file sources only when something was written
    let live = true;
    api("/api/data", { source, ...o }).then((r) => { if (!live) return; const j = JSON.stringify(r); if (j !== seen.current) { seen.current = j; setRes(r); } });
    return () => { live = false; };
  }, [key, epoch]);
  void kinds;
  return res;
}
export function useDetail(ref: string | undefined) {
  const [d, setD] = useState<any>(null); const epoch = useStore((s) => s.epoch);
  useEffect(() => { if (!ref) { setD(null); return; } let live = true; api(`/api/detail?ref=${encodeURIComponent(ref)}`).then((r) => live && setD(r)); return () => { live = false; }; }, [ref, epoch]);
  return d;
}
export const fileUrl = (rel: string) => `/api/file?path=${encodeURIComponent(rel)}&t=${TOKEN}`;
