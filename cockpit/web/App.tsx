import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore, send, getState, toast } from "./store";
import { Workspace } from "./Workspace";
import { openRef } from "./ui";

type Rail = any;

function Chip({ n, label, kind, onClick }: { n: number; label: string; kind?: string; onClick: () => void }) {
  return <button className={`chip ${n === 0 ? "zero" : kind ?? ""}`} onClick={onClick} title={`${n} ${label}`} aria-label={`${n} ${label}`}><b>{n}</b>{label}</button>;
}
const open = (template: string, ref?: string) => send({ op: "human.open", template, ref });

function RailView() {
  const r: Rail = useStore((s) => s.rail);
  const conn = useStore((s) => s.conn);
  const [drawer, setDrawer] = useState(false);
  const lenses = useStore((s) => s.epoch) && null;
  void lenses;
  if (!r) return <header className="rail"><div className="rail-main"><span className="muted">connecting…</span></div></header>;
  const c = r.counts;
  const verdict = r.gate;
  const vk = verdict === "go" || verdict === "ready" ? "ok" : verdict === "no-go" || verdict === "blocked" ? "danger" : "warn";
  return (
    <header className="rail" aria-label="Product Actualizer process status">
      <div className="rail-main">
        <span className={`pulse ${conn === "live" ? "live" : "off"}`} title={conn === "live" ? "live: following the process" : "disconnected: the run continues without the cockpit; reconnecting"} />
        <div className="rail-id" title={r.goal}><b>{r.hasRun ? r.product : "No run yet"}</b><span>{r.hasRun ? `${r.goal}` : "actualize begin --goal …"}</span></div>
        {r.hasRun ? <>
          <span className="rail-sep" />
          <div className="rail-phase" title="model version · phase"><b>model@{r.version} · {r.bar}</b><span>{r.lenses.length ? `lens: ${r.lenses.join(", ")}` : r.phase}{r.wave ? ` · wave ${r.wave.n}/${r.wave.of}` : ""} · {r.done}/{r.selected} done</span></div>
          <span className="rail-sep" />
          <div className="chips" role="group" aria-label="what needs attention">
            <Chip n={c.proposals} label="proposals" kind={c.proposals ? "warn" : ""} onClick={() => open("proposals")} />
            <Chip n={c.unknowns} label="unknowns" onClick={() => open("unknowns")} />
            <Chip n={c.contradictions} label="contradicted" kind={c.contradictions ? "danger" : ""} onClick={() => open("contradictions")} />
            <Chip n={c.stale} label="stale" kind={c.stale ? "danger" : ""} onClick={() => open("staleness")} />
            <Chip n={c.blockers} label="blockers" kind={c.blockers ? "danger" : ""} onClick={() => open("gate")} />
          </div>
          <div className="rail-next" title={r.next}><b>next</b>{r.next}</div>
          {r.humanInput ? <button className="needs" onClick={() => open(r.asking ? "inbox" : "inbox")} title={r.humanInput}>needs you · {r.humanInput}</button> : null}
          <button className={`verdict ${vk}`} onClick={() => open("gate")} title="release gate">{verdict}</button>
        </> : <div className="rail-next" />}
        <button className="iconbtn" aria-expanded={drawer} aria-label="details" title="details" onClick={() => setDrawer(!drawer)}>{drawer ? "▴" : "▾"}</button>
        <button className="iconbtn" aria-label="command palette" title="Ctrl/⌘ K" onClick={() => window.dispatchEvent(new Event("cockpit:palette"))}><span className="kbd">⌘K</span></button>
        <button className="iconbtn" aria-label="toggle theme" onClick={() => { const el = document.documentElement; const dark = el.dataset.theme ? el.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; el.dataset.theme = dark ? "light" : "dark"; }}>◐</button>
      </div>
      {drawer ? <RailDrawer r={r} /> : null}
    </header>
  );
}

function RailDrawer({ r }: { r: Rail }) {
  const lenses = useStoreLenses();
  return (
    <div className="rail-drawer">
      {r.blockers.length ? <ul>{r.blockers.map((b: string, i: number) => <li key={i}><span className="status bad">blocker</span>{b}</li>)}</ul> : <div className="muted">No blockers.</div>}
      <div className="lens-row" style={{ marginTop: 6 }}>{lenses.map((l: any) => <button key={l.name} className={`lens-pill ${l.status}`} title={`${l.status}${l.reason ? ": " + l.reason : ""}`} onClick={() => openRef(`lens:${l.name}`)}>{l.name}</button>)}</div>
    </div>
  );
}
import { useSource } from "./store";
function useStoreLenses() { const r = useSource("pa:lenses", { limit: 50 }); return (r?.rows ?? []) as any[]; }

function EmptyState() {
  const hints = useStore((s) => s.hints); const conn = useStore((s) => s.conn); const has = useStore((s) => s.rail?.hasRun);
  return (
    <div className="empty">
      <div className="empty-card">
        <h2>{has ? "Nothing open." : "No actualization run yet."}</h2>
        <p>{has ? "Surfaces appear here as the agent shows you evidence, comparisons, and questions. Where you could start:" : "Start one in your agent session; this view will follow the process as it happens."}</p>
        {hints.map((h: any) => <button key={h.template} className="hint" onClick={() => open(h.template)}><b>{h.label}</b><span>{h.why}</span></button>)}
        {conn !== "live" ? <p className="muted">Reconnecting to the cockpit server…</p> : <p className="muted"><span className="kbd">⌘K</span> opens anything else.</p>}
      </div>
    </div>
  );
}

function Palette() {
  const [on, setOn] = useState(false); const [q, setQ] = useState(""); const [i, setI] = useState(0);
  const panels = useStore((s) => s.panels);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOn((v) => !v); setQ(""); setI(0); } else if (e.key === "Escape") setOn(false); };
    const p = () => { setOn(true); setQ(""); setI(0); };
    window.addEventListener("keydown", k); window.addEventListener("cockpit:palette", p);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("cockpit:palette", p); };
  }, []);
  const items = useMemo(() => {
    const T: [string, string, () => void][] = [
      ["Run trace", "nested activity with durations", () => open("trace")], ["Open proposals", "rule on lens findings", () => open("proposals")], ["Claims ledger", "grades and sources", () => open("claims")],
      ["Contradictions", "claims the evidence disagrees on", () => open("contradictions")], ["Unknowns", "what the evidence does not say", () => open("unknowns")], ["Why stale", "decisions → artifacts", () => open("staleness")],
      ["Lens map", "which lenses ran", () => open("lenses")], ["Release gate", "blockers and verdict", () => open("gate")], ["Your responses", "what you told the process", () => open("inbox")], ["Events", "process event stream", () => open("events")],
    ];
    const P: [string, string, () => void][] = Object.values(panels).map((p: any) => [`Go to: ${p.spec.title}`, p.minimized ? "minimized" : "open", () => send({ op: "human.size", id: p.id, state: "normal" })]);
    const all = [...P, ...T]; const ql = q.toLowerCase();
    return all.filter(([a, b]) => !ql || (a + b).toLowerCase().includes(ql));
  }, [q, panels]);
  const [refs, setRefs] = useState<any[]>([]);
  useEffect(() => { if (!on || q.length < 2) { setRefs([]); return; } const t = setTimeout(() => import("./store").then(({ api }) => api(`/api/search?q=${encodeURIComponent(q)}`)).then((r) => setRefs(r.hits ?? [])), 120); return () => clearTimeout(t); }, [q, on]);
  if (!on) return null;
  const rows = [...items.map(([a, b, f]) => ({ a, b, f })), ...refs.map((h) => ({ a: h.ref, b: "open beside", f: () => openRef(h.ref) }))];
  const run = (n: number) => { rows[n]?.f(); setOn(false); };
  return (
    <div className="pal-back" onMouseDown={() => setOn(false)}>
      <div className="pal" role="dialog" aria-label="command palette" onMouseDown={(e) => e.stopPropagation()}>
        <input autoFocus value={q} placeholder="Open a view, or find a claim, proposal, artifact…" onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setI(Math.min(rows.length - 1, i + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setI(Math.max(0, i - 1)); } else if (e.key === "Enter") run(i); }} />
        <ul role="listbox">{rows.slice(0, 40).map((r, n) => <li key={n} role="option" aria-selected={n === i} className={n === i ? "on" : ""} onMouseEnter={() => setI(n)} onClick={() => run(n)}>{r.a}<span>{r.b}</span></li>)}</ul>
      </div>
    </div>
  );
}

function Minimized() {
  const mins = useStore((s) => Object.values(s.panels).filter((p: any) => p.minimized).map((p: any) => ({ id: p.id, title: p.spec.title })));
  const key = JSON.stringify(mins);
  const list = useMemo(() => mins, [key]);
  if (!list.length) return null;
  return <div className="mini" role="toolbar" aria-label="minimized surfaces"><span className="muted">minimized</span>{list.map((m) => <button key={m.id} onClick={() => send({ op: "human.size", id: m.id, state: "normal" })}>{m.title}</button>)}</div>;
}

export function App() {
  const conn = useStore((s) => s.conn);
  const has = useStore((s) => Object.keys(s.panels).filter((id) => !s.panels[id].minimized).length > 0);
  const t = useStore((s) => s.toast);
  return (
    <div className="app">
      <RailView />
      <main className="work">
        {conn === "offline" ? <div className="offline" role="status">disconnected. The run continues without the cockpit; reconnecting…</div> : null}
        <Workspace />
        {!has ? <EmptyState /> : null}
        <Minimized />
      </main>
      <Palette />
      {t ? <div className={`toast ${t.bad ? "bad" : ""}`} role="status">{t.text}</div> : null}
    </div>
  );
}
