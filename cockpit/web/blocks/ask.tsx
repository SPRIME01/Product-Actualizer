import React, { useEffect, useRef, useState } from "react";
import { api, send, useSource, getState, useStore } from "../store";
import { RefChip, RichText, BlockTitle } from "../ui";
import { type BP } from "./data";

// Drafts survive a workspace re-layout (which remounts panels) because they live outside React.
const drafts = new Map<string, any>();
const useDraft = <T,>(key: string, init: T): [T, (v: T) => void] => {
  const [v, setV] = useState<T>(() => (drafts.has(key) ? drafts.get(key) : init));
  return [v, (x) => { drafts.set(key, x); setV(x); }];
};

function AskView({ ask, panelId }: { ask: any; panelId: string }) {
  const st = useStore((s) => s.asks[ask.id]);
  const responses = useSource("pa:responses", { limit: 100 });
  const [val, setVal] = useDraft<any>(`${panelId}/${ask.id}`, ask.input === "multiselect" ? [] : ask.default ?? "");
  const [q, setQ] = useState(""); const [hits, setHits] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (ask.input !== "search" && ask.input !== "path") return; const t = setTimeout(() => api(`/api/search?q=${encodeURIComponent(q)}`).then((r) => setHits(r.hits ?? [])), 120); return () => clearTimeout(t); }, [q, ask.input]);
  const open = !st || st.state === "open";
  const echo = (responses?.rows ?? []).find((r: any) => r.ask === ask.id || r.id === undefined && false);
  const submit = (outcome: "answered" | "deferred" | "cancelled", value?: any) => { setBusy(true); send({ op: "human.answer", surface: panelId, ask: ask.id, outcome, value }).then(() => setBusy(false)); };
  const canSend = ask.input === "confirm" ? false : Array.isArray(val) ? val.length > 0 : String(val).trim().length > 0;
  if (!open) {
    const handled = (responses?.rows ?? []).find((r: any) => r.value !== undefined && String(r.ask ?? "") === ask.id);
    return (
      <div className="ask closed">
        <h4>{ask.prompt}</h4>
        <div className="sent"><b>{st.state}</b>{st.value !== undefined && st.state === "answered" ? `: ${Array.isArray(st.value) ? st.value.join(", ") : String(st.value)}` : ""}{st.state === "deferred" ? " (stays an open question)" : ""}
          <span className="muted"> · {handled?.status === "handled" ? `routed: ${handled.handled?.as}` : st.state === "withdrawn" ? "withdrawn by the agent" : "recorded, waiting for the router"}</span></div>
      </div>
    );
  }
  void echo;
  const opts: any[] = ask.options ?? [];
  const sel = (v: string) => (ask.input === "multiselect" ? setVal(val.includes(v) ? val.filter((x: string) => x !== v) : [...val, v]) : setVal(v));
  return (
    <div className="ask" role="group" aria-label={ask.prompt}>
      <h4><RichText text={ask.prompt} /></h4>
      {ask.why ? <p className="why">{ask.why}</p> : null}
      {ask.refs?.length ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>{ask.refs.map((r: string) => <RefChip key={r} ref_={r} />)}</div> : null}
      {ask.input === "confirm" ? <div style={{ display: "flex", gap: 6 }}><button className="btn primary" disabled={busy} onClick={() => submit("answered", true)} autoFocus>Yes</button><button className="btn" disabled={busy} onClick={() => submit("answered", false)}>No</button></div> : null}
      {(ask.input === "select" || ask.input === "multiselect") ? opts.map((o, i) => {
        const on = ask.input === "multiselect" ? val.includes(o.value) : val === o.value;
        return (
          <label key={o.value} className={`opt ${on ? "on" : ""}`}>
            <input type={ask.input === "select" ? "radio" : "checkbox"} name={ask.id} checked={on} onChange={() => sel(o.value)} />
            <span><b>{o.label}</b> <span className="kbd">{i + 1}</span>{o.hint ? <small>{o.hint}</small> : null}{o.consequence ? <small className="cons">→ {o.consequence}</small> : null}{o.refs?.length ? <span style={{ display: "flex", gap: 4 }}>{o.refs.map((r: string) => <RefChip key={r} ref_={r} />)}</span> : null}</span>
          </label>
        );
      }) : null}
      {ask.input === "text" ? <input type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder={ask.placeholder} aria-label={ask.prompt} onKeyDown={(e) => e.key === "Enter" && canSend && submit("answered", val)} /> : null}
      {ask.input === "multiline" ? <textarea rows={4} value={val} onChange={(e) => setVal(e.target.value)} placeholder={ask.placeholder} aria-label={ask.prompt} /> : null}
      {(ask.input === "search" || ask.input === "path") ? (
        <div>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={ask.input === "path" ? "find an artifact or evidence file" : ask.placeholder ?? "search claims, unknowns, proposals…"} aria-label="search" />
          {(ask.input === "search" && !q ? opts.map((o) => ({ ref: o.value, kind: "option", id: o.label })) : hits.filter((h) => ask.input === "path" ? ["artifact", "evidence"].includes(h.kind) : true)).slice(0, 8).map((h) => (
            <label key={h.ref} className={`opt ${val === h.ref ? "on" : ""}`}><input type="radio" name={ask.id} checked={val === h.ref} onChange={() => setVal(h.ref)} /><span className="mono">{h.ref}</span></label>
          ))}
        </div>
      ) : null}
      <div className="ask-foot">
        {ask.input !== "confirm" ? <button className="btn primary" disabled={!canSend || busy} onClick={() => submit("answered", val)}>Answer</button> : null}
        <button className="btn" disabled={busy} onClick={() => submit("deferred")} title="Keep this as an open question; the process continues without it">Not yet</button>
        <button className="btn" disabled={busy} onClick={() => submit("cancelled")} title="Dismiss; recorded as declined">Skip</button>
        <span className="sp" />{ask.resolves ? <span className="muted">bears on <RefChip ref_={ask.resolves} /></span> : null}
      </div>
    </div>
  );
}
export const AskBlock = ({ block, panel }: BP) => <AskView ask={block} panelId={panel.id} />;
export function FormBlock({ block, panel }: BP) {
  return <div><BlockTitle title={block.title} /><div style={{ display: "grid", gap: 8 }}>{block.asks.map((a: any) => <AskView key={a.id} ask={a} panelId={panel.id} />)}</div></div>;
}

export function PreflightBlock({ block, panel }: BP) {
  const key = `pf:${panel.id}/${block.id}`;
  const st = useStore((s) => s.asks[key]);
  const [note, setNote] = useState(""); const a = block.action;
  const rows: [string, string][] = [["target", a.target], ["current state", a.currentState], ["expected", a.expected], ["stop if", a.stopIf], ["known bounds", a.bounds], ["action", a.action], ["bounded by", a.boundedBy], ["observation", a.observation], ["recovery", a.recovery]];
  return (
    <div className={`pf ${a.class}`}>
      <header>Physical action preflight <span className="status warn">{a.class}</span></header>
      <dl>{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
      {block.evidence?.length ? <div className="rel" style={{ padding: "0 10px 6px", display: "flex", gap: 4 }}>{block.evidence.map((r: string) => <RefChip key={r} ref_={r} />)}</div> : null}
      <div className="actions">
        {st && st.state !== "open" ? <div className="sent"><b>{st.value === "confirmed" ? "You confirmed" : "You declined"}.</b> The agent performs it only through the normal preflight and records the result.</div> : (
          <>
            <input className="reason" style={{ flex: "1 1 200px" }} placeholder="optional note (e.g. who is watching)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="note" />
            <button className="btn primary" onClick={() => send({ op: "human.confirm", surface: panel.id, block: block.id, outcome: "confirmed", note })}>Confirm this action</button>
            <button className="btn danger" onClick={() => send({ op: "human.confirm", surface: panel.id, block: block.id, outcome: "declined", note })}>Decline</button>
          </>
        )}
      </div>
    </div>
  );
}
