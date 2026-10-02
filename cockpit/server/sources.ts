// Resolve a surface's `source` into data, lazily and in pages. A block asks for what it renders; nothing ships the whole model.
// Every result names its provenance: "process" (projected from run state), "file" (read from the run directory), or "agent" (inline data the
// agent supplied and the human should treat as a claim, not as state).
import fs from "node:fs";
import path from "node:path";
import type { Database } from "bun:sqlite";
import { entities, entity, searchEntities } from "./db";
import { parseRef, fmtRef } from "../protocol/refs";
import { frontmatter } from "../../hooks/src/lib/md.mjs";

export type Col = { field: string; label?: string; kind?: string; unit?: string };
export type Rows = { kind: "rows"; provenance: "process" | "file" | "agent"; columns: Col[]; rows: Record<string, any>[]; total: number; truncated?: boolean; source?: string };
export type TreeNode = { id: string; label: string; ref?: string; status?: string; duration?: number; detail?: string; children: TreeNode[] };
export type TreeData = { kind: "tree"; provenance: "process" | "file"; nodes: TreeNode[] };
export type DocData = { kind: "doc"; provenance: "file"; path: string; ext: string; text: string; truncated: boolean; anchorLine?: number; bytes: number };
export type GraphData = { kind: "graph"; provenance: "process" | "agent"; nodes: any[]; edges: any[] };
export type Resolved = Rows | TreeData | DocData | GraphData | { kind: "error"; code: string; message: string };

export type Env = { db: Database; runDir: string };
export const MAX_FILE = 240_000;

const PA: Record<string, { kind: string; refKind: string; cols: Col[] }> = {
  claims: { kind: "claim", refKind: "claim", cols: [{ field: "id", kind: "ref" }, { field: "text" }, { field: "grade", kind: "grade" }, { field: "source" }] },
  unknowns: { kind: "unknown", refKind: "unknown", cols: [{ field: "id", kind: "ref" }, { field: "question" }, { field: "blocks" }, { field: "who" }] },
  decisions: { kind: "decision", refKind: "decision", cols: [{ field: "id", kind: "ref" }, { field: "decision" }, { field: "rationale" }, { field: "touched" }, { field: "version", kind: "number" }] },
  proposals: { kind: "proposal", refKind: "proposal", cols: [{ field: "id", kind: "ref" }, { field: "lens" }, { field: "field" }, { field: "kind" }, { field: "proposal" }, { field: "status", kind: "status" }] },
  artifacts: { kind: "artifact", refKind: "artifact", cols: [{ field: "id", label: "artifact", kind: "ref" }, { field: "lens" }, { field: "built", label: "built@", kind: "number" }, { field: "status", kind: "status" }, { field: "public" }] },
  evidence: { kind: "evidence", refKind: "evidence", cols: [{ field: "id", label: "file", kind: "ref" }, { field: "lens" }, { field: "bytes", kind: "number" }] },
  lenses: { kind: "lens", refKind: "lens", cols: [{ field: "name", kind: "ref" }, { field: "status", kind: "status" }, { field: "needs" }, { field: "runs", kind: "number" }] },
  waves: { kind: "wave", refKind: "", cols: [{ field: "wave", kind: "number" }, { field: "lenses" }, { field: "status", kind: "status" }, { field: "done", kind: "number" }, { field: "total", kind: "number" }] },
  blockers: { kind: "blocker", refKind: "", cols: [{ field: "id" }, { field: "text" }, { field: "fix" }] },
  versions: { kind: "version", refKind: "version", cols: [{ field: "version", kind: "ref" }, { field: "claims", kind: "number" }, { field: "unknowns", kind: "number" }, { field: "decisions", kind: "number" }, { field: "latest" }] },
  responses: { kind: "response", refKind: "", cols: [{ field: "id" }, { field: "kind" }, { field: "outcome" }, { field: "ref" }, { field: "value" }, { field: "status", kind: "status" }] },
};

export type Filter = { field: string; op?: string; value: any };
export type Sort = { field: string; dir?: "asc" | "desc" };

const norm = (v: any) => (v === null || v === undefined ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join(",") : String(v));
export function applyFilters(rows: any[], filters: Filter[] = [], sort?: Sort) {
  let out = rows.filter((r) => filters.every((f) => {
    const a = r[f.field]; const b = f.value;
    switch (f.op ?? "eq") {
      case "eq": return norm(a).toLowerCase() === norm(b).toLowerCase();
      case "ne": return norm(a).toLowerCase() !== norm(b).toLowerCase();
      case "contains": return norm(a).toLowerCase().includes(norm(b).toLowerCase());
      case "in": return (Array.isArray(b) ? b : [b]).map((x) => norm(x).toLowerCase()).includes(norm(a).toLowerCase());
      case "gt": return Number(a) > Number(b);
      case "lt": return Number(a) < Number(b);
      default: return true;
    }
  }));
  if (sort) {
    const d = sort.dir === "desc" ? -1 : 1;
    out = [...out].sort((x, y) => { const a = x[sort.field], b = y[sort.field]; const na = Number(a), nb = Number(b); return (Number.isFinite(na) && Number.isFinite(nb) && a !== "" && b !== "" ? na - nb : norm(a).localeCompare(norm(b), undefined, { numeric: true })) * d; });
  }
  return out;
}

const parseQuery = (q?: string): Record<string, string> => Object.fromEntries(new URLSearchParams(q ?? "").entries());

// ---- markdown tables ------------------------------------------------------------------------------------------
export function markdownTables(text: string): { head: string[]; rows: string[][]; line: number }[] {
  const lines = text.split("\n"), out: { head: string[]; rows: string[][]; line: number }[] = [];
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*\|/.test(lines[i]) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = cells(lines[i]); const rows: string[][] = []; let j = i + 2;
      while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(cells(lines[j])); j++; }
      out.push({ head, rows, line: i + 1 }); i = j;
    }
  }
  return out;
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "col";

// ---- files ----------------------------------------------------------------------------------------------------
export function safeRunFile(runDir: string, rel: string): string | null {
  if (!/^(artifacts|evidence|history)\//.test(rel) || rel.includes("..") || path.isAbsolute(rel)) return null;
  const abs = path.resolve(runDir, rel);
  if (!abs.startsWith(path.resolve(runDir) + path.sep)) return null;
  try { const real = fs.realpathSync(abs); if (!real.startsWith(fs.realpathSync(runDir) + path.sep)) return null; return real; } catch { return null; }
}

function readFile(env: Env, rel: string, anchor?: string): Resolved {
  const abs = safeRunFile(env.runDir, rel);
  if (!abs) return { kind: "error", code: "BAD_SOURCE", message: `file:${rel} is not a readable file under artifacts/, evidence/, or history/` };
  const st = fs.statSync(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  if (!st.isFile()) return { kind: "error", code: "BAD_SOURCE", message: `${rel} is not a file` };
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return { kind: "doc", provenance: "file", path: rel, ext, text: "", truncated: false, bytes: st.size };
  const full = fs.readFileSync(abs, "utf8");
  const text = full.length > MAX_FILE ? full.slice(0, MAX_FILE) : full;
  let anchorLine: number | undefined;
  if (anchor && !/^table\d*$/.test(anchor)) {
    const needle = anchor.replace(/^(claim|unknown|proposal|decision):/, "");
    const idx = text.split("\n").findIndex((l) => l.includes(needle));
    if (idx >= 0) anchorLine = idx + 1;
  }
  return { kind: "doc", provenance: "file", path: rel, ext, text, truncated: full.length > MAX_FILE, anchorLine, bytes: st.size };
}

function fileRows(env: Env, rel: string, anchor: string | undefined, f: Filter[] | undefined, s: Sort | undefined, limit: number): Resolved {
  const d = readFile(env, rel);
  if (d.kind !== "doc") return d;
  const body = rel.endsWith(".md") ? d.text.slice(frontmatterEnd(d.text)) : d.text;
  let head: string[], rows: string[][];
  if (rel.endsWith(".csv")) {
    const ls = body.trim().split("\n").map((l) => l.split(",").map((c) => c.trim()));
    head = ls[0] ?? []; rows = ls.slice(1);
  } else {
    const tables = markdownTables(body);
    const n = anchor && /^table\d+$/.test(anchor) ? Number(anchor.slice(5)) - 1 : 0;
    if (!tables[n]) return { kind: "error", code: "BAD_SOURCE", message: `${rel} has ${tables.length} table(s); #table${n + 1} does not exist` };
    ({ head, rows } = tables[n]);
  }
  const fields = head.map(slug);
  const objs = rows.map((r) => Object.fromEntries(fields.map((k, i) => [k, r[i] ?? ""])));
  const all = applyFilters(objs, f, s);
  return { kind: "rows", provenance: "file", columns: fields.map((k, i) => ({ field: k, label: head[i], kind: /^(grade)$/.test(k) ? "grade" : /status|verdict|result/.test(k) ? "status" : "text" })), rows: all.slice(0, limit), total: all.length, source: `file:${rel}` };
}
const frontmatterEnd = (t: string) => { const m = /^(---\n[\s\S]*?\n---\n|(?:[a-z_]+:.*\n)+\n)/.exec(t); return m ? m[0].length : 0; };

// ---- graphs ---------------------------------------------------------------------------------------------------
const toneOfLens: Record<string, string> = { done: "ok", running: "warning", stale: "danger", ready: "neutral", waiting: "neutral", excluded: "unknown", satisfied: "ok", unselected: "unknown" };

function graph(env: Env, name: string, q: Record<string, string>): Resolved {
  const lenses = entities<any>(env.db, "lens"), arts = entities<any>(env.db, "artifact"), decisions = entities<any>(env.db, "decision"), claims = entities<any>(env.db, "claim");
  const nodes: any[] = [], edges: any[] = []; const seen = new Set<string>();
  const node = (n: any) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };
  if (name === "lenses") {
    for (const l of lenses) { if (q.all !== "1" && ["unselected", "excluded"].includes(l.status)) continue; node({ id: l.name, label: l.name, kind: "lens", tone: toneOfLens[l.status] ?? "neutral", ref: `lens:${l.name}`, status: l.status }); }
    for (const l of lenses) for (const d of l.needs) if (seen.has(l.name) && seen.has(d)) edges.push({ from: d, to: l.name });
  } else if (name === "staleness") {
    for (const a of arts.filter((x) => x.status === "stale")) {
      node({ id: `a:${a.id}`, label: a.id, kind: "artifact", tone: "danger", ref: `artifact:${a.id}`, status: "stale" });
      for (const d of a.stale) {
        const dec = decisions.find((x) => x.n === d);
        node({ id: `d:${d}`, label: `${d}`, kind: "decision", tone: "warning", ref: `decision:${d}`, detail: dec?.decision });
        edges.push({ from: `d:${d}`, to: `a:${a.id}`, label: "touched what it reads/cites" });
        for (const t of String(dec?.touched ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
          const fld = t.split(":")[0];
          node({ id: `f:${fld}`, label: fld, kind: "field", ref: `field:${fld}` });
          edges.push({ from: `d:${d}`, to: `f:${fld}`, label: t.includes(":") ? t.split(":")[1].slice(0, 28) : "" });
          if ((a.reads ?? []).includes(fld)) edges.push({ from: `f:${fld}`, to: `a:${a.id}`, label: "reads" });
        }
      }
      node({ id: `l:${a.lens}`, label: `rerun ${a.lens}`, kind: "lens", tone: "neutral", ref: `lens:${a.lens}` });
      edges.push({ from: `a:${a.id}`, to: `l:${a.lens}`, label: "rerun" });
    }
  } else if (name === "claims") {
    const focusRef = q.focus ? parseRef(q.focus) : null;
    const focus = focusRef?.kind === "claim" ? claims.filter((c) => c.id === focusRef.id) : claims.filter((c) => c.grade === "CONTRADICTED");
    if (!focus.length) return { kind: "error", code: "BAD_SOURCE", message: "graph:claims needs ?focus=claim:C<n> (or the model has no CONTRADICTED claims)" };
    for (const c of focus) {
      node({ id: c.id, label: c.id, kind: "claim", tone: c.grade === "CONTRADICTED" ? "danger" : c.grade === "OBSERVED" || c.grade === "VERIFIED" ? "ok" : "warning", ref: `claim:${c.id}`, detail: `${c.grade}: ${c.text}` });
      String(c.source).split(/;\s*/).filter(Boolean).slice(0, 4).forEach((s: string, i: number) => { const id = `s:${c.id}:${i}`; node({ id, label: s.slice(0, 44), kind: "evidence" }); edges.push({ from: id, to: c.id, label: "evidence" }); });
      for (const a of arts.filter((x) => (x.cites ?? []).includes(c.id))) { node({ id: `a:${a.id}`, label: a.id, kind: "artifact", tone: a.status === "stale" ? "danger" : "neutral", ref: `artifact:${a.id}` }); edges.push({ from: c.id, to: `a:${a.id}`, label: a.public ? "public" : "cites" }); }
      for (const d of decisions.filter((x) => String(x.touched).includes(c.id))) { node({ id: `d:${d.n}`, label: d.n, kind: "decision", ref: `decision:${d.n}` }); edges.push({ from: `d:${d.n}`, to: c.id, label: "touched" }); }
    }
  } else if (name === "model") {
    for (const a of arts) { node({ id: `a:${a.id}`, label: a.id, kind: "artifact", tone: a.status === "stale" ? "danger" : a.status === "invalid" ? "danger" : "ok", ref: `artifact:${a.id}` }); for (const f of a.reads ?? []) { node({ id: `f:${f}`, label: f, kind: "field", ref: `field:${f}` }); edges.push({ from: `f:${f}`, to: `a:${a.id}` }); } }
  }
  return { kind: "graph", provenance: "process", nodes, edges };
}

// ---- trace: the run as nested activity ------------------------------------------------------------------------
function trace(env: Env): TreeData {
  const evs = (env.db.query("SELECT ts, type, subject, data FROM events WHERE channel = 'process' ORDER BY seq").all() as any[]).map((e) => ({ ...e, data: JSON.parse(e.data) }));
  const ms = (t: string) => Date.parse(t);
  const root: TreeNode = { id: "run", label: "run", children: [], status: "running" };
  let group: TreeNode | null = null; const open = new Map<string, TreeNode & { t0: number }>();
  const flush = () => { if (group && group.children.length) { group.label = `lenses: ${group.children.map((c) => c.label).join(", ")}`; const t0 = ms(group.detail!); const last = Math.max(...group.children.map((c) => (c.duration ?? 0) + ms((c as any).t0s ?? group!.detail!))); group.duration = Math.max(0, last - t0); root.children.push(group); } group = null; };
  for (const e of evs) {
    if (e.type === "run.started") root.detail = e.data.goal;
    if (e.type === "lenses.selected") root.children.push({ id: `sel-${e.ts}`, label: `selected ${e.data.chosen.join(", ")}`, children: [], status: "ok" });
    if (e.type === "lens.started") { const lens = e.subject.slice(5); group ??= { id: `g-${e.ts}`, label: "wave", children: [], status: "ok", detail: e.ts }; const n: any = { id: `${lens}-${e.ts}`, label: lens, ref: e.subject, children: [], status: "running", t0s: e.ts, t0: ms(e.ts) }; open.set(lens, n); group.children.push(n); }
    if (e.type === "lens.finished") { const lens = e.subject.slice(5); const n = open.get(lens); if (n) { n.duration = ms(e.ts) - n.t0; n.status = "ok"; n.detail = `${e.data.proposals?.length ?? 0} proposal(s), ${e.data.files?.length ?? 0} file(s)`; n.children = (e.data.proposals ?? []).map((p: string) => ({ id: `${n.id}-${p}`, label: p, ref: `proposal:${p}`, children: [] })); open.delete(lens); } }
    if (e.type === "reconcile.started") { flush(); open.set("__rec", { id: `rec-${e.ts}`, label: `reconcile (base model@${e.data.base})`, children: [], status: "running", t0: ms(e.ts) } as any); }
    if (e.type === "model.updated" || e.type === "reconcile.finished") { const n = open.get("__rec"); if (n) { n.duration = ms(e.ts) - n.t0; n.status = "ok"; n.label = e.type === "model.updated" ? `reconcile → model@${e.data.version}` : `reconcile (no change)`; n.ref = `version:${e.data.version}`; root.children.push(n); open.delete("__rec"); } }
    if (e.type === "preflight.required") { flush(); root.children.push({ id: `pf-${e.ts}`, label: "physical action stopped: preflight required", status: "warning", children: [], detail: e.data.command, ref: undefined }); }
    if (e.type === "human.requested") root.children.push({ id: `hr-${e.ts}`, label: `asked the owner: ${e.data.reason}`, status: "warning", children: [] });
    if (e.type === "run.finished") { root.status = "ok"; root.label = `run → ${e.data.verdict}`; }
  }
  flush();
  for (const n of open.values()) { if (n.label === "wave") continue; }
  if (group) root.children.push(group);
  return { kind: "tree", provenance: "process", nodes: [root] };
}

function treeOfPaths(rows: any[], label: (r: any) => string, ref: (r: any) => string, status?: (r: any) => string | undefined): TreeData {
  const root: TreeNode[] = [];
  for (const r of rows) {
    const parts = String(r.id).split("/"); let level = root; let acc = "";
    parts.forEach((p, i) => {
      acc = acc ? `${acc}/${p}` : p; let n = level.find((x) => x.id === acc);
      if (!n) { n = { id: acc, label: p, children: [] }; level.push(n); }
      if (i === parts.length - 1) { n.ref = ref(r); n.status = status?.(r); n.label = label(r); }
      level = n.children;
    });
  }
  return { kind: "tree", provenance: "process", nodes: root };
}

// ---- entry points ---------------------------------------------------------------------------------------------
export type ResolveOpts = { filter?: Filter[]; sort?: Sort; limit?: number; offset?: number; data?: Record<string, any>[]; as?: "rows" | "tree" | "graph" | "doc" };

export function resolve(env: Env, source: string | undefined, o: ResolveOpts = {}): Resolved {
  const limit = o.limit ?? 100;
  if (!source) {
    const rows = applyFilters(o.data ?? [], o.filter, o.sort);
    const cols = Object.keys(rows[0] ?? o.data?.[0] ?? {}).map((k) => ({ field: k, kind: /^(grade)$/.test(k) ? "grade" : /status|verdict/.test(k) ? "status" : "text" }));
    return { kind: "rows", provenance: "agent", columns: cols, rows: rows.slice(0, limit), total: rows.length };
  }
  if (source.startsWith("file:")) {
    const m = /^file:([^#]+)(?:#(.+))?$/.exec(source)!;
    if (o.as === "doc" || (!o.as && !/\.(md|csv)$/.test(m[1])) || (m[2] && !/^table\d*$/.test(m[2]) && o.as !== "rows")) return readFile(env, m[1], m[2]);
    if (o.as === "rows" || m[2]?.startsWith("table")) return fileRows(env, m[1], m[2], o.filter, o.sort, limit);
    return readFile(env, m[1], m[2]);
  }
  const [, kind, name, qs] = /^(pa|graph):([a-z-]+)(\?.*)?$/.exec(source) ?? [];
  if (!kind) return { kind: "error", code: "BAD_SOURCE", message: `cannot parse source ${source}` };
  const q = parseQuery(qs?.slice(1));
  if (kind === "graph") return graph(env, name, q);
  if (name === "trace") return trace(env);
  if (o.as === "tree" && name === "artifacts") return treeOfPaths(entities(env.db, "artifact"), (r) => r.id.split("/").pop(), (r) => `artifact:${r.id}`, (r) => r.status);
  if (o.as === "tree" && name === "evidence") return treeOfPaths(entities(env.db, "evidence"), (r) => r.id.split("/").pop(), (r) => `evidence:${r.id}`);
  const def = PA[name];
  if (!def && name !== "events") return { kind: "error", code: "BAD_SOURCE", message: `unknown projection ${name}` };
  let rows: any[];
  if (name === "events") {
    const where: string[] = ["1=1"], args: any[] = [];
    if (q.type) { where.push("type LIKE ?"); args.push(`${q.type}%`); }
    if (q.subject) { where.push("subject = ?"); args.push(q.subject); }
    rows = (env.db.query(`SELECT seq, ts, channel, type, subject, data FROM events WHERE ${where.join(" AND ")} ORDER BY seq DESC LIMIT 400`).all(...args) as any[]).map((e) => ({ ...e, id: String(e.seq), detail: Object.entries(JSON.parse(e.data)).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("+") : v}`).join(" ").slice(0, 120) }));
    const cols = [{ field: "seq", kind: "number" }, { field: "ts", kind: "text" }, { field: "type" }, { field: "subject", kind: "ref" }, { field: "detail" }];
    const all = applyFilters(rows, o.filter, o.sort);
    return { kind: "rows", provenance: "process", columns: cols, rows: all.slice(0, limit), total: all.length, source };
  }
  rows = entities(env.db, def!.kind).map((r: any) => ({ ...r, id: r.id ?? r.n, _ref: def!.refKind ? fmtRef(def!.refKind as any, String(r.id ?? r.n ?? r.name)) : undefined }));
  if (name === "lenses") rows = rows.map((r) => ({ ...r, id: r.name, needs: (r.needs ?? []).join(", "), _ref: `lens:${r.name}` }));
  const qf: Filter[] = Object.entries(q).filter(([k]) => !["focus", "all"].includes(k)).map(([field, value]) => ({ field, op: "eq", value }));
  if (q.stale === "1") qf.push({ field: "status", op: "eq", value: "stale" });
  const all = applyFilters(rows, [...qf.filter((f) => f.field !== "stale"), ...(o.filter ?? [])], o.sort);
  const off = o.offset ?? 0;
  return { kind: "rows", provenance: "process", columns: def!.cols, rows: all.slice(off, off + limit), total: all.length, source };
}

// ---- entity detail --------------------------------------------------------------------------------------------
export type Detail = { ref: string; kind: string; title: string; tone?: string; fields: { k: string; v: string }[]; related: { label: string; ref: string; note?: string }[]; consequence?: string; next?: { label: string; action: string; ref?: string }[]; exists: boolean };

export function detail(env: Env, ref: string): Detail {
  const r = parseRef(ref);
  if (!r) return { ref, kind: "?", title: ref, fields: [], related: [], exists: false };
  const d = env.db;
  const arts = entities<any>(d, "artifact"), decisions = entities<any>(d, "decision"), proposals = entities<any>(d, "proposal"), claims = entities<any>(d, "claim");
  const base = { ref, kind: r.kind, fields: [] as Detail["fields"], related: [] as Detail["related"], exists: true } as Detail;
  switch (r.kind) {
    case "claim": {
      const c = entity<any>(d, "claim", r.id); if (!c) return { ...base, title: ref, exists: false };
      base.title = c.text; base.tone = c.grade === "CONTRADICTED" ? "danger" : ["OBSERVED", "VERIFIED"].includes(c.grade) ? "ok" : c.grade === "UNKNOWN" ? "unknown" : "warning";
      base.fields = [{ k: "grade", v: c.grade }, { k: "source", v: c.source }];
      for (const a of arts.filter((x) => (x.cites ?? []).includes(r.id))) base.related.push({ label: a.id, ref: `artifact:${a.id}`, note: a.public ? "public, cites this claim" : "cites" });
      for (const x of decisions.filter((x) => String(x.touched).includes(r.id))) base.related.push({ label: x.n, ref: `decision:${x.n}`, note: "touched it" });
      for (const p of proposals.filter((x) => String(x.proposal + x.evidence).includes(`[${r.id}]`) || String(x.proposal).includes(r.id))) base.related.push({ label: p.id, ref: `proposal:${p.id}`, note: p.status });
      const pub = arts.filter((a) => a.public && (a.cites ?? []).includes(r.id));
      if (pub.length && !["OBSERVED", "VERIFIED"].includes(c.grade)) base.consequence = `Public artifact ${pub[0].id} cites this claim at grade ${c.grade}; public copy may cite only OBSERVED or VERIFIED.`;
      base.next = [{ label: "see lineage", action: "graph:claims", ref }, { label: "challenge", action: "annotate", ref }];
      break;
    }
    case "unknown": {
      const u = entity<any>(d, "unknown", r.id); if (!u) return { ...base, title: ref, exists: false };
      base.title = u.question; base.tone = "unknown"; base.fields = [{ k: "blocks", v: u.blocks }, { k: "who can resolve", v: u.who }];
      for (const p of proposals.filter((x) => String(x.proposal).includes(r.id))) base.related.push({ label: p.id, ref: `proposal:${p.id}`, note: p.status });
      base.next = [{ label: "answer", action: "answer", ref }];
      break;
    }
    case "proposal": {
      const p = entity<any>(d, "proposal", r.id); if (!p) return { ...base, title: ref, exists: false };
      base.title = p.proposal; base.tone = p.status === "open" ? "warning" : p.status === "rejected" ? "neutral" : "ok";
      base.fields = [{ k: "lens", v: p.lens }, { k: "field", v: p.field }, { k: "kind", v: p.kind }, { k: "evidence", v: p.evidence }, { k: "status", v: p.status + (p.reason ? `: ${p.reason}` : "") }];
      const readers = arts.filter((a) => (a.reads ?? []).includes(p.field));
      base.consequence = p.status === "open" ? (readers.length ? `Accepting changes field "${p.field}", which ${readers.map((a) => a.id).join(", ")} read; ${p.kind === "change" ? "they go stale unless the decision narrows touched" : "a discovery adds to the field"}.` : `Accepting changes field "${p.field}"; no current artifact reads it.`) : undefined;
      if (p.status.startsWith("accepted:")) base.related.push({ label: p.status.slice(9), ref: `decision:${p.status.slice(9)}`, note: "decision" });
      for (const c of String(p.evidence).match(/C\d+/g) ?? []) base.related.push({ label: c, ref: `claim:${c}` });
      if (p.status === "open") base.next = [{ label: "accept", action: "rule:accept", ref }, { label: "reject", action: "rule:reject", ref }, { label: "ask", action: "rule:question", ref }];
      break;
    }
    case "decision": {
      const x = decisions.find((y) => y.n === r.id); if (!x) return { ...base, title: ref, exists: false };
      base.title = x.decision; base.fields = [{ k: "rationale", v: x.rationale }, { k: "touched", v: x.touched }, { k: "version", v: String(x.version) }];
      for (const a of arts.filter((y) => (y.stale ?? []).includes(r.id))) base.related.push({ label: a.id, ref: `artifact:${a.id}`, note: "stale because of this" });
      for (const p of proposals.filter((y) => y.status === `accepted:${r.id}`)) base.related.push({ label: p.id, ref: `proposal:${p.id}`, note: "accepted as this" });
      const st = arts.filter((a) => (a.stale ?? []).includes(r.id));
      if (st.length) { base.tone = "warning"; base.consequence = `${st.length} artifact(s) went stale: rebuild by re-running ${[...new Set(st.map((a) => a.lens))].join(", ")}.`; }
      break;
    }
    case "artifact": {
      const a = entity<any>(d, "artifact", r.id); if (!a) return { ...base, title: ref, exists: false };
      base.title = a.id; base.tone = a.status === "stale" || a.status === "invalid" ? "danger" : "ok";
      base.fields = [{ k: "lens", v: a.lens }, { k: "built from", v: `model@${a.built}` }, { k: "status", v: a.status + (a.stale?.length ? ` (by ${a.stale.join(", ")})` : "") }, { k: "reads", v: (a.reads ?? []).join(", ") }, { k: "public", v: String(a.public) }];
      for (const c of (a.cites ?? []).slice(0, 8)) { const cl = claims.find((x) => x.id === c); base.related.push({ label: c, ref: `claim:${c}`, note: cl?.grade }); }
      if (a.errors?.length) base.fields.push({ k: "errors", v: a.errors.join("; ") });
      if (a.status === "stale") base.consequence = `Re-run ${a.lens} to rebuild at the current model version.`;
      base.next = [{ label: "open document", action: "document", ref }, { label: "comment", action: "annotate", ref }];
      break;
    }
    case "evidence": {
      const e = entity<any>(d, "evidence", r.id); if (!e) return { ...base, title: ref, exists: false };
      base.title = e.rel; base.fields = [{ k: "lens", v: e.lens }, { k: "bytes", v: String(e.bytes) }];
      base.related = claims.filter((c) => String(c.source).includes(path.basename(e.rel))).slice(0, 8).map((c) => ({ label: c.id, ref: `claim:${c.id}`, note: c.grade }));
      base.next = [{ label: "open", action: "document", ref }];
      break;
    }
    case "lens": {
      const l = entity<any>(d, "lens", r.id); if (!l) return { ...base, title: ref, exists: false };
      base.title = l.name; base.tone = toneOfLens[l.status];
      base.fields = [{ k: "status", v: l.status + (l.reason ? `: ${l.reason}` : "") }, { k: "runs", v: String(l.runs) }, { k: "needs", v: (l.needs ?? []).join(", ") || "-" }, { k: "reads", v: (l.reads ?? []).join(", ") }, { k: "executes with", v: (l.executesWith ?? []).join(", ") || "-" }];
      for (const a of arts.filter((x) => x.lens === r.id)) base.related.push({ label: a.id, ref: `artifact:${a.id}`, note: a.status });
      break;
    }
    case "gate": {
      const run = JSON.parse((d.query("SELECT v FROM meta WHERE k = 'run'").get() as any)?.v ?? "{}");
      const bl = entities<any>(d, "blocker");
      base.title = run.verdict ? `Release gate: ${run.verdict}` : bl.length ? `Gate blocked (${bl.length})` : "Gate open";
      base.tone = run.verdict === "go" ? "ok" : bl.length || run.verdict === "no-go" ? "danger" : "neutral";
      base.fields = bl.map((b: any) => ({ k: b.code, v: b.text }));
      const g = arts.find((a) => a.isGate); if (g) base.related.push({ label: g.id, ref: `artifact:${g.id}`, note: g.verdict ?? undefined });
      break;
    }
    case "field": {
      base.title = r.id;
      const cnt: Record<string, number> = { claims: claims.length, unknowns: entities(d, "unknown").length, decisions: decisions.length };
      base.fields = [{ k: "items", v: String(cnt[r.id] ?? "-") }];
      for (const a of arts.filter((x) => (x.reads ?? []).includes(r.id))) base.related.push({ label: a.id, ref: `artifact:${a.id}`, note: "reads this field" });
      for (const x of decisions.filter((y) => String(y.touched).split(",").some((t) => t.trim().split(":")[0] === r.id))) base.related.push({ label: x.n, ref: `decision:${x.n}`, note: "touched" });
      break;
    }
    case "version": {
      const v = entity<any>(d, "version", r.id); if (!v) return { ...base, title: ref, exists: false };
      base.title = `model@${v.version}`; base.fields = [{ k: "claims", v: String(v.claims) }, { k: "unknowns", v: String(v.unknowns) }, { k: "decisions", v: String(v.decisions) }, { k: "decisions at this version", v: v.latest }];
      break;
    }
  }
  return base;
}

export const search = (env: Env, q: string, limit = 12) => searchEntities(env.db, q, limit).map((h) => ({ ...h, ref: `${h.kind}:${h.id}` }));
