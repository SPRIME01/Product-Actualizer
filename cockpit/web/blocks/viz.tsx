import React, { Suspense, lazy } from "react";
import { useSource, useStore } from "../store";
import { RichText, RefChip } from "../ui";
import { type BP } from "./data";

export function MetricBlock({ block }: BP) {
  return (
    <div className={`metric ${block.tone ?? ""}`}>
      <div className="l">{block.label}</div>
      <div className="v">{block.value}{block.unit ? <small style={{ fontSize: 13, marginLeft: 3 }}>{block.unit}</small> : null}</div>
      {block.of !== undefined ? <div className="of">of {String(block.of)}</div> : null}
      {block.delta ? <div className="of">{block.delta}</div> : null}
      {block.refs?.length ? <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>{block.refs.map((r: string) => <RefChip key={r} ref_={r} />)}</div> : null}
    </div>
  );
}

export function CalloutBlock({ block }: BP) {
  return (
    <div className={`callout ${block.tone}`} role={block.tone === "danger" || block.tone === "warning" ? "alert" : "note"}>
      {block.title ? <h4>{block.title}</h4> : null}
      <div><RichText text={block.text} /></div>
      {block.refs?.length ? <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>{block.refs.map((r: string) => <RefChip key={r} ref_={r} />)}</div> : null}
    </div>
  );
}

// Progress is bound to process state. The agent can name what to show but cannot set a number.
export function ProgressBlock({ block }: BP) {
  const rail = useStore((s) => s.rail);
  const waves = useSource(block.source === "wave" ? "pa:waves" : undefined);
  const lenses = useSource(block.source === "lens" || block.source === "run" ? "pa:lenses" : undefined);
  let done = 0, total = 0, live = false, text = "";
  if (block.source === "wave" && waves?.rows) { const w = waves.rows.find((r: any) => r.status !== "done") ?? waves.rows[waves.rows.length - 1]; if (w) { done = w.done; total = w.total; live = w.status === "running"; text = `wave ${w.wave}: ${w.lenses}`; } }
  else if (block.source === "lens" && lenses?.rows) { const l = lenses.rows.find((r: any) => r.name === block.lens); if (l) { done = l.status === "done" ? 1 : 0; total = 1; live = l.status === "running"; text = `${l.name}: ${l.status}`; } }
  else if (block.source === "gate") { total = Math.max(1, rail?.counts?.blockers ?? 0); done = rail?.counts?.blockers ? 0 : 1; text = rail?.counts?.blockers ? `${rail.counts.blockers} blocker(s)` : "no blockers"; }
  else if (lenses?.rows) { const sel = lenses.rows.filter((r: any) => !["unselected", "excluded", "satisfied"].includes(r.status)); done = sel.filter((r: any) => r.status === "done").length; total = sel.length; live = sel.some((r: any) => r.status === "running"); text = `${done} of ${total} lenses done`; }
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={block.label}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ fontSize: 12 }}>{block.label}</b><span className="muted">{text}</span></div>
      <div className={`bar ${live ? "live" : ""}`}><div style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
    </div>
  );
}


// Charts and graphs are loaded when first drawn: they are the heaviest dependencies and most surfaces never need them.
const ChartImpl = lazy(() => import("./chart-impl").then((m) => ({ default: m.ChartImpl })));
const GraphImpl = lazy(() => import("./graph-impl").then((m) => ({ default: m.GraphImpl })));
const Wait = <div className="muted">loading…</div>;
export const ChartBlock = (p: BP) => <Suspense fallback={Wait}><ChartImpl {...p} /></Suspense>;
export const GraphBlock = (p: BP) => <Suspense fallback={Wait}><GraphImpl {...p} /></Suspense>;
