// Shared primitives: ref chips, grades, statuses, rich text with [[refs]], a small markdown renderer.
import React from "react";
import { send, useDetail } from "./store";

export const GRADES = ["OBSERVED", "VERIFIED", "REPORTED", "INFERRED", "PROPOSED", "UNKNOWN", "CONTRADICTED"];
export const Grade = ({ g }: { g: string }) => <span className={`grade g-${g}`} title={`claim grade: ${g}`}>{g}</span>;
export const Status = ({ s }: { s: string }) => { const k = String(s ?? "").toLowerCase(); return <span className={`status ${k.replace(/[^a-z-]/g, "")}`}>{s}</span>; };
export const toneDot = (t?: string) => (t === "ok" || t === "done" ? "ok" : t === "danger" || t === "bad" ? "bad" : t === "warning" || t === "running" ? "warning" : "");

export const openRef = (ref: string) => send({ op: "human.open", template: "ref", ref });

const KIND_OF: Record<string, string> = { C: "claim", U: "unknown", P: "proposal", D: "decision" };
export const refOf = (token: string): string | null => {
  if (/^(claim|unknown|proposal|decision|artifact|evidence|lens|field|version):/.test(token) || token === "gate") return token;
  const m = /^([CUPD])(\d+)$/.exec(token); return m ? `${KIND_OF[m[1]]}:${token}` : null;
};

export function RefChip({ ref_, label }: { ref_: string; label?: string }) {
  const d = useDetail(ref_);
  const grade = ref_.startsWith("claim:") ? d?.fields?.find((f: any) => f.k === "grade")?.v : null;
  const color = grade ? `var(--g-${grade.toLowerCase()})` : d?.tone === "danger" ? "var(--danger)" : d?.tone === "ok" ? "var(--ok)" : d?.tone === "warning" ? "var(--warn)" : "var(--unk)";
  return (
    <button type="button" className="refchip" title={d?.title ? `${ref_}: ${d.title}` : ref_} onClick={(e) => { e.stopPropagation(); openRef(ref_); }} style={{ background: "none" }}>
      <i style={{ background: color }} />{label ?? ref_.replace(/^(claim|unknown|proposal|decision):/, "")}{grade ? <span className={`g-${grade}`} style={{ fontSize: 10 }}>{grade.slice(0, 3)}</span> : null}
    </button>
  );
}

// "[[C42]]" in text becomes a chip; everything else is plain text.
export function RichText({ text }: { text: string }) {
  const parts = String(text ?? "").split(/(\[\[[^\]\n]+\]\])/g);
  return <>{parts.map((p, i) => { const m = /^\[\[([^\]]+)\]\]$/.exec(p); const r = m ? refOf(m[1].trim()) : null; return r ? <RefChip key={i} ref_={r} /> : <React.Fragment key={i}>{p}</React.Fragment>; })}</>;
}

// Inline: `code`, **bold**, [[ref]], and bare [C42] cites as written by the lenses.
function inline(s: string, k: string): React.ReactNode[] {
  const out: React.ReactNode[] = []; const re = /(`[^`]+`|\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\[(?:C|U|P|D)\d+\])/g; let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("`")) out.push(<code key={k + i} className="mono">{t.slice(1, -1)}</code>);
    else if (t.startsWith("**")) out.push(<b key={k + i}>{t.slice(2, -2)}</b>);
    else { const tok = t.replace(/^\[\[?|\]\]?$/g, ""); const r = refOf(tok); out.push(r ? <RefChip key={k + i} ref_={r} /> : t); }
    last = m.index + t.length; i++;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n"); const els: React.ReactNode[] = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) { const buf: string[] = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; els.push(<pre key={i} className="mono" style={{ background: "var(--panel)", padding: 8, overflow: "auto", borderRadius: 4 }}>{buf.join("\n")}</pre>); continue; }
    const h = /^(#{1,4})\s+(.*)/.exec(l);
    if (h) { const L = h[1].length; els.push(React.createElement(`h${Math.min(L + 2, 6)}`, { key: i, style: { margin: "10px 0 4px", fontSize: L === 1 ? 15 : 13 } }, inline(h[2], `h${i}`))); i++; continue; }
    if (/^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const cells = (x: string) => x.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(l); const rows: string[][] = []; let j = i + 2; while (j < lines.length && /^\s*\|/.test(lines[j])) rows.push(cells(lines[j++]));
      els.push(<table key={i} className="t"><thead><tr>{head.map((c, k) => <th key={k}>{c}</th>)}</tr></thead><tbody>{rows.map((r, a) => <tr key={a}>{r.map((c, b) => <td key={b} className="wrap">{inline(c, `t${a}${b}`)}</td>)}</tr>)}</tbody></table>); i = j; continue;
    }
    if (/^\s*[-*]\s+/.test(l)) { const items: string[] = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, "")); els.push(<ul key={i} style={{ margin: "4px 0", paddingLeft: 18 }}>{items.map((t, k) => <li key={k}>{inline(t, `l${i}${k}`)}</li>)}</ul>); continue; }
    if (!l.trim()) { i++; continue; }
    const buf = [l]; i++; while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*\||\s*[-*]\s)/.test(lines[i])) buf.push(lines[i++]);
    els.push(<p key={i} style={{ margin: "4px 0" }}>{inline(buf.join(" "), `p${i}`)}</p>);
  }
  return <div>{els}</div>;
}

export const AgentTag = () => <span className="agent-tag" title="This data was supplied by the agent as part of the surface. It is not read from the run.">agent-supplied</span>;
export const BlockTitle = ({ title, prov, children }: { title?: string; prov?: string; children?: React.ReactNode }) =>
  title || prov === "agent" || children ? <h5 className="block-title"><span>{title}</span><span style={{ display: "flex", gap: 6 }}>{children}{prov === "agent" ? <AgentTag /> : null}</span></h5> : null;

export const fmtDur = (ms?: number) => (ms === undefined ? "" : ms < 1000 ? `${ms}ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`);
export const fmtTime = (ts: string) => { const d = new Date(ts); return Number.isNaN(+d) ? ts : d.toLocaleTimeString([], { hour12: false }); };
