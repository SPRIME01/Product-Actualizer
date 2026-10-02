import React, { useMemo, useState } from "react";
import { send, useSource, type Panel } from "../store";
import { Grade, Status, RefChip, RichText, BlockTitle, fmtDur, fmtTime, toneDot, openRef } from "../ui";

export type BP = { block: any; panel: Panel };
export const ctrlOf = (p: Panel, b: any) => ({ ...b, ...(p.controls[b.id] ?? {}) });
const select = (p: Panel, b: any, ref: string | null) => send({ op: "human.select", surface: p.id, block: b.id, ref });

const refKind: Record<string, string> = { claims: "claim", unknowns: "unknown", decisions: "decision", proposals: "proposal", artifacts: "artifact", lenses: "lens", evidence: "evidence", versions: "version" };
function rowRef(row: any, source?: string): string | null {
  if (row._ref) return row._ref;
  const m = /^pa:([a-z]+)/.exec(source ?? ""); const k = m && refKind[m[1]];
  return k && row.id ? `${k}:${row.id}`: null;
}

function Cell({ row, col, source }: { row: any; col: any; source?: string }) {
  const v = row[col.field];
  switch (col.kind) {
    case "grade": return v ? <Grade g={String(v)} />: null;
    case "status": return v === "" || v == null ? null: <Status s={String(v)} />;
    case "ref": { const r = rowRef(row, source) ?? (typeof v === "string" && /^[CUPD]\d+$/.test(v) ? v: null); return r ? <RefChip ref_={/^[CUPD]\d+$/.test(r) ? ({ C: "claim", U: "unknown", P: "proposal", D: "decision" } as any)[r[0]] + ":" + r: r} label={String(v)} />: <span className="mono">{String(v ?? "")}</span>; }
    case "number": return <>{v === "" || v == null ? "": String(v)}</>;
    default: return <RichText text={String(v ?? "")} />;
  }
}

export function TableBlock({ block, panel }: BP) {
  const b = ctrlOf(panel, block);
  const [localSort, setLocalSort] = useState<any>(null); const [q, setQ] = useState("");
  const sort = localSort ?? b.sort;
  const res = useSource(b.source, { filter: b.filter, sort, limit: b.limit ?? 100, data: block.data, as: "rows" });
  const sel = panel.selection[block.id] ?? null;
  const hl = new Set<string>((b.highlight ?? []).map(String));
  const columns = block.columns ?? res?.columns ?? [];
  const rows: any[] = useMemo(() => (res?.rows ?? []).filter((r: any) => !q || JSON.stringify(Object.values(r)).toLowerCase().includes(q.toLowerCase())), [res, q]);
  if (!res) return <div className="muted">loading…</div>;
  if (res.kind === "error") return <div className="callout danger">{res.message}</div>;
  const groups: [string, any[]][] = block.group ? Object.entries(rows.reduce((a: any, r) => ((a[String(r[block.group] ?? "")] ??= []).push(r), a), {})): [["", rows]];
  const tone = (g: string) => (/fail|no-go|stale|invalid|exceed|contradicted|bad/i.test(g) ? "bad": /pass|ok|go|done|current|observed|verified/i.test(g) ? "ok": "");
  return (
    <div>
      <BlockTitle title={block.title ?? `${res.total > rows.length ? `${rows.length} of ${res.total}`: res.total} ${res.total === 1 ? "row": "rows"}`} prov={res.provenance}>
        {rows.length > 8 || q ? <input className="reason" style={{ width: 120, padding: "0 5px" }} placeholder="filter" aria-label="filter rows" value={q} onChange={(e) => setQ(e.target.value)} />: null}
      </BlockTitle>
      <table className="t">
        <thead><tr>{columns.map((c: any) => <th key={c.field} onClick={() => { const next = { field: c.field, dir: sort?.field === c.field && sort.dir === "asc" ? "desc": "asc" }; setLocalSort(next); send({ op: "human.control", surface: panel.id, block: block.id, set: { sort: next } }); }} aria-sort={sort?.field === c.field ? (sort.dir === "asc" ? "ascending": "descending"): "none"}>{c.label ?? c.field}{sort?.field === c.field ? (sort.dir === "asc" ? " ▲": " ▼"): ""}</th>)}</tr></thead>
        <tbody>
          {groups.map(([g, rs]) => (
            <React.Fragment key={g}>
              {block.group ? <tr className="group"><td colSpan={columns.length}><span className={`dotc ${tone(g)}`} style={{ display: "inline-block", marginRight: 6 }} />{g || "(none)"} <span className="muted">· {rs.length}</span></td></tr>: null}
              {rs.map((r, i) => {
                const ref = rowRef(r, b.source); const rid = ref ?? String(r.id ?? i);
                const on = block.select !== false && sel === rid;
                const isHl = hl.size > 0 && (hl.has(String(r.id)) || Object.values(r).some((v) => hl.has(String(v))));
                return (
                  <tr key={rid + i} className={`${on ? "sel": ""} ${isHl ? "hl": ""}`} onClick={() => block.select !== false && select(panel, block, ref ?? rid)} tabIndex={0} aria-selected={on}
                    onKeyDown={(e) => { if (e.key === "Enter" && ref) openRef(ref); if (e.key === " ") { e.preventDefault(); select(panel, block, ref ?? rid); } }}>
                    {columns.map((c: any) => <td key={c.field} className={(c.kind === "number" ? "num ": "") + (["text", undefined].includes(c.kind) ? "wrap": "")}><Cell row={r} col={c} source={b.source} /></td>)}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {!rows.length ? <div className="muted" style={{ padding: 8 }}>nothing matches</div>: null}
    </div>
  );
}

function TreeRow({ n, depth, open, toggle, max, show, sel, onSel }: any) {
  const kids = n.children ?? []; const isOpen = open(n.id, depth);
  return (
    <>
      <div className={`tree-row ${sel === n.ref ? "sel": ""}`} style={{ paddingLeft: 4 + depth * 14 }} onClick={() => n.ref && onSel(n.ref)}>
        <span className="tw" onClick={(e) => { e.stopPropagation(); toggle(n.id, depth); }}>{kids.length ? (isOpen ? "▾": "▸"): ""}</span>
        {show.includes("status") ? <span className={`dotc ${toneDot(n.status)}`} title={n.status} />: null}
        <span className="lab" title={n.detail}>{n.label}{n.detail && depth > 0 ? <span className="muted">: {n.detail}</span>: null}</span>
        {n.ref ? <RefChip ref_={n.ref} label="↗" />: null}
        {show.includes("duration") && n.duration !== undefined ? <><div style={{ width: 70 }}><div className="dur-bar" style={{ width: `${Math.max(3, Math.min(100, (n.duration / max) * 100))}%` }} /></div><span className="dur" style={{ minWidth: 48, textAlign: "right" }}>{fmtDur(n.duration)}</span></>: null}
      </div>
      {isOpen ? kids.map((c: any) => <TreeRow key={c.id} n={c} depth={depth + 1} open={open} toggle={toggle} max={max} show={show} sel={sel} onSel={onSel} />): null}
    </>
  );
}
export function TreeBlock({ block, panel }: BP) {
  const b = ctrlOf(panel, block);
  const res = useSource(b.source, { as: "tree", data: block.data });
  const [flip, setFlip] = useState<Record<string, boolean>>({});
  if (!res) return <div className="muted">loading…</div>;
  if (res.kind === "error") return <div className="callout danger">{res.message}</div>;
  if (res.kind !== "tree") return <div className="callout danger">this source is not hierarchical</div>;
  const expand = block.expand ?? 1;
  const open = (id: string, depth: number) => (id in flip ? flip[id]: depth < expand);
  const all: number[] = []; const walk = (n: any) => { if (n.duration !== undefined) all.push(n.duration); (n.children ?? []).forEach(walk); }; res.nodes.forEach(walk);
  const max = Math.max(1, ...all);
  return <div className="tree"><BlockTitle title={block.title} prov={res.provenance} />{res.nodes.map((n: any) => <TreeRow key={n.id} n={n} depth={0} open={open} toggle={(id: string, d: number) => setFlip({ ...flip, [id]: !open(id, d) })} max={max} show={block.show ?? ["status"]} sel={panel.selection[block.id]} onSel={(r: string) => select(panel, block, r)} />)}</div>;
}

export function TimelineBlock({ block, panel }: BP) {
  const b = ctrlOf(panel, block); const [type, setType] = useState("");
  const res = useSource(b.source, { filter: b.filter, sort: b.sort, limit: block.window ?? 40, data: block.data, as: "rows" });
  if (!res) return <div className="muted">loading…</div>;
  if (res.kind === "error") return <div className="callout danger">{res.message}</div>;
  const rows = (res.rows as any[]).filter((r) => !type || String(r.type ?? "").startsWith(type));
  const types = [...new Set((res.rows as any[]).map((r) => String(r.type ?? "").split(".")[0]).filter(Boolean))];
  const sev = (t: string) => (/stale|contradict|rejected|required|requested/.test(t) ? "warn": /fail|invalid/.test(t) ? "bad": "");
  return (
    <div>
      <BlockTitle title={block.title} prov={res.provenance}>
        {types.length > 1 ? <select aria-label="event type" value={type} onChange={(e) => setType(e.target.value)} style={{ background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 3 }}><option value="">all</option>{types.map((t) => <option key={t}>{t}</option>)}</select>: null}
      </BlockTitle>
      <div className="tl">
        {rows.map((r, i) => (
          <div key={r.seq ?? i} className={`tl-item ${sev(String(r.type ?? ""))}`}>
            {r.ts ? <time>{fmtTime(r.ts)}</time>: null}<b>{r.type ?? r.label ?? ""}</b> {r.subject ? <RefChip ref_={String(r.subject)} />: null} <span className="muted">{r.detail ?? ""}</span>
          </div>
        ))}
        {!rows.length ? <div className="muted">no events yet</div>: null}
      </div>
    </div>
  );
}
