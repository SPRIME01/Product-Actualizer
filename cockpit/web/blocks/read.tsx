import React, { useEffect, useRef, useState } from "react";
import { api, fileUrl, send, useDetail, useSource, useStore, getState, type Panel } from "../store";
import { Markdown, RefChip, RichText, BlockTitle, Grade, openRef, GRADES } from "../ui";
import { type BP } from "./data";

const refOfPath = (p: string) => (p.startsWith("artifacts/") ? `artifact:${p.slice(10)}` : p.startsWith("evidence/") ? `evidence:${p.slice(9)}` : null);

function lineDiff(a: string[], b: string[]) {
  const n = a.length, m = b.length;
  if (n * m > 4_000_000) return [...a.map((t) => ({ k: "del", t })), ...b.map((t) => ({ k: "add", t }))];
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: { k: string; t: string }[] = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { out.push({ k: "same", t: a[i] }); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ k: "del", t: a[i++] }); else out.push({ k: "add", t: b[j++] }); }
  while (i < n) out.push({ k: "del", t: a[i++] }); while (j < m) out.push({ k: "add", t: b[j++] });
  return out;
}

function Annotator({ target, surface, block, hint }: { target: string | null; surface: string; block: string; hint: string }) {
  const [text, setText] = useState(""); const [sent, setSent] = useState(false);
  const t = target ?? `surface:${surface}#${block}`;
  if (sent) return <div className="sent"><b>Recorded.</b> The router will route your comment.</div>;
  return (
    <div className="annotate">
      <input className="reason" value={text} onChange={(e) => setText(e.target.value)} placeholder={hint} aria-label="comment" onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { send({ op: "human.annotate", target: t, text, kind: "comment" }).then((r) => r.ok && setSent(true)); } }} />
      <button className="btn" disabled={!text.trim()} onClick={() => send({ op: "human.annotate", target: t, text, kind: "comment" }).then((r) => r.ok && setSent(true))}>Comment</button>
    </div>
  );
}

export function DocBody({ source, anchor, lines, as: asRaw, marks }: { source: string; anchor?: string; lines?: number[]; as?: "raw"; marks?: string[] }) {
  const res = useSource(source, { as: "doc" });
  const [raw, setRaw] = useState(asRaw === "raw");
  const hlRef = useRef<HTMLDivElement>(null);
  useEffect(() => { hlRef.current?.scrollIntoView({ block: "center" }); }, [res?.anchorLine, lines?.[0], res?.path]);
  if (!res) return <div className="muted">loading…</div>;
  if (res.kind === "error") return <div className="callout danger">{res.message}</div>;
  if (res.kind !== "doc") return <div className="callout danger">not a document source</div>;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(res.ext)) return <img src={fileUrl(res.path)} alt={res.path} style={{ maxWidth: "100%" }} />;
  const hlFrom = lines?.[0] ?? res.anchorLine, hlTo = lines?.[1] ?? hlFrom;
  const isMd = res.ext === "md" && !raw;
  return (
    <div className={`doc ${isMd ? "md" : ""}`}>
      {res.ext === "md" ? <div style={{ textAlign: "right", padding: "2px 6px" }}><button className="tab-btn" onClick={() => setRaw(!raw)}>{raw ? "rendered" : "raw"}</button></div> : null}
      {isMd ? <Markdown text={res.text} /> : (
        <pre>{res.text.split("\n").map((l: string, i: number) => { const n = i + 1; const on = hlFrom !== undefined && n >= hlFrom && n <= (hlTo ?? hlFrom); return <div key={i} ref={on && n === hlFrom ? hlRef : undefined} className={`ln ${on ? "hl" : ""}`}><i>{n}</i><span>{l || " "}</span></div>; })}</pre>
      )}
      {res.truncated ? <div className="muted" style={{ padding: 6 }}>truncated at {Math.round(res.bytes / 1000)} kB total</div> : null}
    </div>
  );
}

export function DocumentBlock({ block, panel }: BP) {
  const rel = /^file:([^#]+)/.exec(block.source)?.[1] ?? "";
  const target = refOfPath(rel);
  return (
    <div>
      <BlockTitle title={block.title ?? rel}>{target ? <RefChip ref_={target} /> : null}</BlockTitle>
      <DocBody source={block.source} anchor={block.anchor} lines={block.lines} />
      <Annotator target={target} surface={panel.id} block={block.id} hint={`Comment on ${rel.split("/").pop()}…`} />
    </div>
  );
}

function Pins({ item, i, panel, block }: { item: any; i: number; panel: Panel; block: any }) {
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null); const [text, setText] = useState(""); const [mine, setMine] = useState<any[]>([]);
  const ref = refOfPath((item.src as string).replace(/^file:/, ""));
  return (
    <div>
      <div className="imgwrap" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setDraft({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); }}>
        <img src={fileUrl(item.src.replace(/^file:/, ""))} alt={item.alt ?? item.label} />
        {[...(item.pins ?? []), ...mine].map((p: any, k: number) => <span key={k} className="pin" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} title={p.text}>{k + 1}</span>)}
        {draft ? <span className="pin" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, background: "var(--accent)" }}>+</span> : null}
      </div>
      {draft ? (
        <div className="annotate" style={{ display: "flex", gap: 6, padding: 6 }}>
          <input className="reason" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="What is wrong here?" aria-label="pin text" />
          <button className="btn primary" disabled={!text.trim()} onClick={() => send({ op: "human.annotate", target: ref ?? `surface:${panel.id}#${block.id}`, text, kind: "issue", at: { ...draft, item: item.label.slice(0, 60) } }).then((r) => { if (r.ok) { setMine([...mine, { ...draft, text }]); setDraft(null); setText(""); } })}>Pin</button>
          <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
        </div>
      ) : null}
    </div>
  );
}
export function MediaBlock({ block, panel }: BP) {
  return (
    <div>
      <BlockTitle title={block.title}><span className="muted">click an image to pin a defect</span></BlockTitle>
      <div className="media">{block.items.map((it: any, i: number) => <figure key={i}><Pins item={it} i={i} panel={panel} block={block} /><figcaption>{it.label}</figcaption></figure>)}</div>
    </div>
  );
}

function CompareItem({ it }: { it: any }) {
  return (
    <div className="cmp-col">
      <h5>{it.ref ? <RefChip ref_={it.ref} label={it.label} /> : it.label}</h5>
      <div style={{ padding: 6 }}>
        {it.source ? <DocBody source={it.source} /> : it.image ? <img src={fileUrl(it.image.replace(/^file:/, ""))} alt={it.label} style={{ maxWidth: "100%" }} /> : it.data ? <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{it.data}</pre> : it.ref ? <EntityMini r={it.ref} /> : null}
      </div>
    </div>
  );
}
function EntityMini({ r }: { r: string }) { const d = useDetail(r); return d ? <div><b>{d.title}</b>{d.fields.map((f: any) => <div key={f.k}><span className="muted">{f.k}: </span>{f.v}</div>)}</div> : <span className="muted">loading…</span>; }

export function CompareBlock({ block, panel }: BP) {
  const a = useSource(block.mode === "diff" ? block.items[0]?.source : undefined, { as: "doc" });
  const b = useSource(block.mode === "diff" ? block.items[1]?.source : undefined, { as: "doc" });
  const [cut, setCut] = useState(50);
  if (block.mode === "matrix") {
    return (
      <div>
        <BlockTitle title={block.title} />
        <table className="t matrix"><thead><tr><th>criterion</th>{block.items.map((it: any, i: number) => <th key={i}>{it.ref ? <RefChip ref_={it.ref} label={it.label} /> : it.label}</th>)}</tr></thead>
          <tbody>{block.criteria.map((c: any) => <tr key={c.name}><td><b>{c.name}</b></td>{c.cells.map((cell: any, i: number) => <td key={i} className={`wrap ${cell.tone ?? ""}`}><RichText text={cell.text} />{cell.refs?.map((r: string) => <RefChip key={r} ref_={r} />)}</td>)}</tr>)}</tbody></table>
      </div>
    );
  }
  if (block.mode === "diff") {
    if (!a || !b) return <div className="muted">loading…</div>;
    if (a.kind !== "doc" || b.kind !== "doc") return <div className="callout danger">{(a.message ?? b.message) || "cannot diff these"}</div>;
    const d = lineDiff(a.text.split("\n"), b.text.split("\n")); const changed = d.filter((x) => x.k !== "same").length;
    return (
      <div>
        <BlockTitle title={block.title ?? `${block.items[0].label} → ${block.items[1].label}`}><span className="muted">{changed} changed line(s)</span></BlockTitle>
        <div className="doc diff"><pre>{d.map((x, i) => <div key={i} className={`ln ${x.k}`}><i>{x.k === "add" ? "+" : x.k === "del" ? "−" : " "}</i><span>{x.t || " "}</span></div>)}</pre></div>
      </div>
    );
  }
  if (block.mode === "overlay") {
    const [ra, rb] = block.items.map((it: any) => it.image ?? it.source ?? "");
    return (
      <div>
        <BlockTitle title={block.title}><span className="muted">{block.items[0].label} | {block.items[1].label}</span></BlockTitle>
        <div className="overlay" style={{ "--cut": `${100 - cut}%` } as any}>
          <img src={fileUrl(rb.replace(/^file:/, ""))} alt={block.items[1].label} style={{ width: "100%", display: "block" }} />
          <img className="top" src={fileUrl(ra.replace(/^file:/, ""))} alt={block.items[0].label} />
        </div>
        <input type="range" min={0} max={100} value={cut} onChange={(e) => setCut(Number(e.target.value))} aria-label="overlay position" style={{ width: "100%" }} />
      </div>
    );
  }
  return (<div><BlockTitle title={block.title} /><div className="cmp side">{block.items.map((it: any, i: number) => <CompareItem key={i} it={it} />)}</div></div>);
}

// ---- entity ----------------------------------------------------------------------------------------------------
function Rule({ d, ref_ }: { d: any; ref_: string }) {
  const responses = useSource("pa:responses", { limit: 100 });
  const mine = (responses?.rows ?? []).filter((r: any) => r.ref === ref_);
  const [mode, setMode] = useState<null | "reject" | "question" | "answer">(null); const [text, setText] = useState("");
  const kind = ref_.split(":")[0];
  const submit = (ruling: string, reason?: string) => send({ op: "human.rule", ref: ref_, ruling, reason }).then((r) => { if (r.ok) { setMode(null); setText(""); } });
  return (
    <div className="actions" style={{ flexDirection: "column" }}>
      {mine.length ? <div className="sent">{mine.map((r: any) => <div key={r.id}><b>{r.outcome}</b>{r.note ? `: ${r.note}` : ""} <span className="muted">· {r.status === "handled" ? `routed: ${r.handled?.as}` : "recorded, waiting for the router"}</span></div>)}</div> : null}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {kind === "proposal" && d.fields.find((f: any) => f.k === "status")?.v === "open" ? <>
          <button className="btn primary" onClick={() => submit("accept")}>Accept</button>
          <button className="btn danger" onClick={() => setMode("reject")}>Reject…</button>
          <button className="btn" onClick={() => setMode("question")}>Ask about it…</button></> : null}
        {kind === "unknown" ? <button className="btn primary" onClick={() => setMode("answer")}>Answer…</button> : null}
        {kind === "claim" || kind === "artifact" || kind === "evidence" ? <button className="btn" onClick={() => setMode("question")}>{kind === "claim" ? "Challenge…" : "Comment…"}</button> : null}
      </div>
      {mode ? (
        <div style={{ width: "100%" }}>
          <textarea className="reason" rows={2} autoFocus value={text} onChange={(e) => setText(e.target.value)} aria-label={mode} placeholder={mode === "reject" ? "Why? (specific; the router logs it)" : mode === "answer" ? "Your answer, and how you know" : "What should the agent look at?"} />
          <div className="ask-foot"><button className="btn primary" disabled={text.trim().length < 4}
            onClick={() => (kind === "claim" || kind === "artifact" || kind === "evidence") ? send({ op: "human.annotate", target: ref_, text, kind: kind === "claim" ? "issue" : "comment" }).then((r) => { if (r.ok) { setMode(null); setText(""); } }) : submit(mode, text)}>Send</button>
            <button className="btn" onClick={() => setMode(null)}>Cancel</button><span className="sp" /><span className="muted">recorded for the router; the model is not edited</span></div>
        </div>
      ) : null}
    </div>
  );
}

export function EntityBlock({ block, panel }: BP) {
  const ref_ = block.ref ?? panel.selection[block.follow] ?? undefined;
  const d = useDetail(ref_);
  const show = new Set(block.show ?? ["sources", "touches", "consequence", "actions"]);
  if (!ref_) return <div className="muted" style={{ padding: 8 }}>Select a row to see it in full.</div>;
  if (!d) return <div className="muted">loading…</div>;
  if (!d.exists) return <div className="callout warning">{ref_} is not in this run (it may have been removed by a reconciliation).</div>;
  const grade = d.fields.find((f: any) => f.k === "grade")?.v;
  return (
    <div className="entity">
      <header><span className="refchip" style={{ cursor: "default" }}>{ref_}</span>{grade ? <Grade g={grade} /> : null}<h4><RichText text={d.title} /></h4></header>
      <dl>{d.fields.filter((f: any) => f.k !== "grade" && (show.has("sources") || f.k !== "source")).map((f: any) => <React.Fragment key={f.k}><dt>{f.k}</dt><dd><RichText text={f.v} /></dd></React.Fragment>)}</dl>
      {d.consequence && show.has("consequence") ? <div className="cons">{d.consequence}</div> : null}
      {d.related.length && show.has("touches") ? <div className="rel">{d.related.map((r: any) => <span key={r.ref}><RefChip ref_={r.ref} label={r.label} />{r.note ? <span className="muted" style={{ fontSize: 11 }}> {r.note}</span> : null}</span>)}</div> : null}
      {show.has("actions") ? <Rule d={d} ref_={ref_} /> : null}
      {show.has("actions") && d.next?.some((n: any) => n.action === "document" || n.action === "graph:claims") ? <div className="actions" style={{ paddingTop: 0 }}>
        {d.next.some((n: any) => n.action === "document") ? <button className="btn" onClick={() => send({ op: "human.open", template: "ref", ref: ref_, as: "document" })}>Open document</button> : null}
        {d.next.some((n: any) => n.action === "graph:claims") ? <button className="btn" onClick={() => send({ op: "human.open", template: "ref", ref: ref_, as: "lineage" })}>Show lineage</button> : null}</div> : null}
    </div>
  );
}
