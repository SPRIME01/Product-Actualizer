// Resolve a surface's `source` into data, lazily and in pages. A block asks for what it renders; nothing ships the whole model.
// Every result names its provenance: "process" (projected from run state), "file" (read from the run directory), or "agent" (inline data the
// agent supplied and the human should treat as a claim, not as state).
import fs from "node:fs";
import path from "node:path";
import type { Database } from "bun:sqlite";
import { entities, entity, searchEntities } from "./db";
import { parseRef, fmtRef } from "../protocol/refs";
import type { Proj } from "./project";
import { worldOfSource, parseWorldId, type Viewing } from "../protocol/world";
import * as K from "./world";
import * as C from "./case";
import * as L from "./learn";
import { frontmatter } from "../../hooks/src/lib/md.mjs";
import { markdownTables, slug } from "./tables";

export type Col = { field: string; label?: string; kind?: string; unit?: string };
export type Rows = { world?: Viewing; kind: "rows"; provenance: "process" | "file" | "agent"; columns: Col[]; rows: Record<string, any>[]; total: number; truncated?: boolean; source?: string };
export type TreeNode = { id: string; label: string; ref?: string; status?: string; duration?: number; detail?: string; children: TreeNode[] };
export type TreeData = { kind: "tree"; provenance: "process" | "file"; nodes: TreeNode[] };
export type DocData = { kind: "doc"; provenance: "file"; path: string; ext: string; text: string; truncated: boolean; anchorLine?: number; bytes: number };
export type GraphData = { world?: Viewing; kind: "graph"; provenance: "process" | "agent"; nodes: any[]; edges: any[] };
export type Resolved = Rows | TreeData | DocData | GraphData | { kind: "error"; code: string; message: string };

export type Env = { db: Database; runDir: string; proj?: Proj; reach?: import("./reach").ReachEnv };
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
  versions: { kind: "version", refKind: "version", cols: [{ field: "version", kind: "ref" }, { field: "world" }, { field: "settled" }, { field: "claims", kind: "number" }, { field: "unknowns", kind: "number" }, { field: "decisions", kind: "number" }, { field: "latest" }, { field: "digest" }] },
  responses: { kind: "response", refKind: "", cols: [{ field: "id" }, { field: "kind" }, { field: "outcome" }, { field: "ref" }, { field: "value" }, { field: "status", kind: "status" }] },
  jobs: { kind: "job", refKind: "job", cols: [{ field: "id", kind: "ref" }, { field: "actor" }, { field: "job" }, { field: "grade", kind: "grade" }, { field: "criteria", label: "judged by" }, { field: "opportunities" }] },
  criteria: { kind: "criterion", refKind: "criterion", cols: [{ field: "id", kind: "ref" }, { field: "job" }, { field: "statement", label: "success criterion" }, { field: "importance" }, { field: "satisfaction" }, { field: "evidence", kind: "status" }, { field: "grade", kind: "grade" }, { field: "score", kind: "status" }] },
  opportunities: { kind: "opportunity", refKind: "opportunity", cols: [{ field: "id", kind: "ref" }, { field: "deficiency" }, { field: "basis", label: "recovers" }, { field: "evidence", kind: "status" }, { field: "alternatives", label: "actor uses today" }, { field: "candidates", label: "candidates" }, { field: "grade", kind: "grade" }] },
  candidates: { kind: "proposal", refKind: "proposal", cols: [{ field: "id", kind: "ref" }, { field: "parent", label: "parent world" }, { field: "intention" }, { field: "producer" }, { field: "delta" }, { field: "status", kind: "status" }, { field: "requires", label: "settles by" }] },
};

export type Filter = { field: string; op?: string; value: any };
export type Sort = { field: string; dir?: "asc" | "desc" };

// "2.76 A" compares as 2.76: evidence tables carry units in the cell
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : parseFloat(String(v)); };
const norm = (v: any) => (v === null || v === undefined ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join(",") : String(v));
export function applyFilters(rows: any[], filters: Filter[] = [], sort?: Sort) {
  let out = rows.filter((r) => filters.every((f) => {
    const a = r[f.field]; const b = f.value;
    switch (f.op ?? "eq") {
      case "eq": return norm(a).toLowerCase() === norm(b).toLowerCase();
      case "ne": return norm(a).toLowerCase() !== norm(b).toLowerCase();
      case "contains": return norm(a).toLowerCase().includes(norm(b).toLowerCase());
      case "in": return (Array.isArray(b) ? b : [b]).map((x) => norm(x).toLowerCase()).includes(norm(a).toLowerCase());
      case "gt": return num(a) > num(b);
      case "lt": return num(a) < num(b);
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
export { markdownTables, slug };

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

// Every result says which world it looked at, so a block can never present history or a candidate as the current world.
export function resolve(env: Env, source: string | undefined, o: ResolveOpts = {}): Resolved {
  const r = resolveInner(env, source, o);
  if ((r.kind === "rows" || r.kind === "graph") && source) { const v = worldOfSource(source); if (v.mode !== "current") r.world = v; }
  return r;
}

function resolveInner(env: Env, source: string | undefined, o: ResolveOpts = {}): Resolved {
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
  const [, kind, name, qs] = /^(pa|graph|world|case):([a-z-]+)(\?.*)?$/.exec(source) ?? [];
  if (!kind) return { kind: "error", code: "BAD_SOURCE", message: `cannot parse source ${source}` };
  const q = parseQuery(qs?.slice(1));
  if (kind === "world") return worldSource(env, name, q, o, source);
  if (kind === "case") return caseSource(env, name, q, o, source);
  if (kind === "graph" && name === "case") { const w = W(env); if (!w) return noProj(); const c = C.caseOf(w, caseIdOf(q)); return c.ok ? { kind: "graph", provenance: "process", ...C.caseGraph(c) } : bad(c.message); }
  if (kind === "graph" && (name === "impact" || name === "why")) return worldGraph(env, name, q);
  if (kind === "graph") return graph(env, name, q);
  if (q.at && q.at !== "current") return historical(env, name, q, o, source);
  if (name === "trace") return trace(env);
  if (o.as === "tree" && name === "artifacts") return treeOfPaths(entities(env.db, "artifact"), (r) => r.id.split("/").pop(), (r) => `artifact:${r.id}`, (r) => r.status);
  if (o.as === "tree" && name === "evidence") return treeOfPaths(entities(env.db, "evidence"), (r) => r.id.split("/").pop(), (r) => `evidence:${r.id}`);
  const def = PA[name];
  if (["decision-states", "experiments", "patterns"].includes(name)) {
    const w = W(env); if (!w) return noProj();
    const { cols, rows } = learnRows(w, name);
    const all = applyFilters(rows.filter((r) => Object.entries(q).every(([k, v]) => !(k in r) || norm(r[k]).toLowerCase() === v.toLowerCase())), o.filter, o.sort);
    return { kind: "rows", provenance: "process", columns: cols, rows: all.slice(0, limit), total: all.length, source };
  }
  if (name === "candidates") {
    if (!env.proj) return noProj();
    const all = applyFilters(K.candidates({ proj: env.proj, runDir: env.runDir }).filter((c) => !q.status || c.status.startsWith(q.status)), o.filter, o.sort);
    return { kind: "rows", provenance: "process", columns: def.cols, rows: all.slice(0, limit), total: all.length, source };
  }
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

// ---- worlds: history, candidates, and the debugger's questions, all read-only ---------------------------------------
const noProj = (): Resolved => ({ kind: "error", code: "BAD_SOURCE", message: "world sources need the run projection (this environment has none)" });
const bad = (message: string): Resolved => ({ kind: "error", code: "BAD_SOURCE", message });
const W = (env: Env): K.WorldEnv | null => (env.proj ? { proj: env.proj, runDir: env.runDir, reach: env.reach, observe: (d) => observe(env, d) } : null);
const refRow = (r: any, ref = r.ref) => ({ ...r, _ref: ref && parseRef(String(ref)) ? ref : undefined });
const rowsOut = (columns: Col[], all: any[], o: ResolveOpts, source: string): Rows => {
  const f = applyFilters(all, o.filter, o.sort); const off = o.offset ?? 0;
  return { kind: "rows", provenance: "process", columns, rows: f.slice(off, off + (o.limit ?? 100)), total: f.length, source };
};

// pa:claims?at=3 and friends: the settled Product Model as it was. Only what the run snapshots can be asked; the rest is "not recorded".
function historical(env: Env, name: string, q: Record<string, string>, o: ResolveOpts, source: string): Resolved {
  const w0 = W(env); if (!w0) return noProj();
  const id = parseWorldId(q.at); if (id === null) return bad(`at=${q.at} is not a world: use at=<model version> or at=current`);
  if (!["claims", "unknowns", "decisions", "versions"].includes(name)) return bad(`pa:${name} has no recorded history: the run versions the Product Model (claims, unknowns, decisions), not ${name}`);
  const wl = K.worlds(w0); const snap = wl.load(id);
  if (!snap) return bad(`no readable snapshot for ${q.at}; recorded versions: ${wl.versions.join(", ") || "none"}`);
  const m = snap.model as any;
  if (name === "claims") return rowsOut(PA.claims.cols, [...m.claims.values()].map((c: any) => ({ ...c, _ref: `claim:${c.id}` })), o, source);
  if (name === "unknowns") return rowsOut(PA.unknowns.cols, [...m.unknowns.values()].map((u: any) => ({ ...u, _ref: `unknown:${u.id}` })), o, source);
  if (name === "decisions") return rowsOut(PA.decisions.cols, m.decisions.map((d: any) => ({ ...d, id: d.n, _ref: `decision:${d.n}` })), o, source);
  return resolveInner(env, `pa:versions`, o);
}

function worldSource(env: Env, name: string, q: Record<string, string>, o: ResolveOpts, source: string): Resolved {
  const w = W(env); if (!w) return noProj();
  const refOf = () => (q.ref && parseRef(q.ref) ? q.ref : null);
  const statusCol = (field: string, label?: string): Col => ({ field, label, kind: "status" });
  switch (name) {
    case "why": {
      const ref = refOf(); if (!ref) return bad("world:why needs ?ref=<ref>");
      const r = C.caseWhy(w, ref); if (!r.ok) return bad(r.message);
      const cols: Col[] = [{ field: "question" }, { field: "answer" }, statusCol("basis"), { field: "refs", label: "refs" }];
      return rowsOut(cols, r.answers.map((a, i) => ({ id: String(i), question: a.q, answer: a.a, basis: a.basis, refs: (a.refs ?? []).map((x) => `[[${x}]]`).join(" ") })), o, source);
    }
    case "diff": {
      const a = parseWorldId(q.a ?? ""), b = parseWorldId(q.b ?? "current");
      if (a === null || b === null) return bad("world:diff needs ?a=<version>&b=<version|current>");
      const d = K.diff(w, a, b); if (!d.ok) return bad(d.message);
      const cols: Col[] = [{ field: "ref", kind: "ref" }, statusCol("change"), { field: "field" }, { field: "before" }, { field: "after" }, { field: "because", label: "because" }];
      return rowsOut(cols, d.rows.map((r) => refRow(r)), o, source);
    }
    case "timeline": {
      const ref = q.ref ? (refOf() ?? undefined) : undefined; if (q.ref && !ref) return bad(`${q.ref} is not a ref`);
      return rowsOut([{ field: "seq", kind: "number" }, { field: "ts" }, { field: "type" }, { field: "subject", kind: "ref" }, { field: "detail" }], K.timeline(w, ref, { git: q.git === "1" }).map((e) => ({ ...e, id: String(e.seq) })).reverse(), o, source);
    }
    case "impact": {
      const ref = refOf(); if (!ref) return bad("world:impact needs ?ref=<ref>");
      const r = K.impact(w, ref, impactOpts(q)); if (!r.ok) return bad(r.message);
      const cols: Col[] = [{ field: "ref", kind: "ref" }, { field: "label" }, statusCol("status"), { field: "distance", label: "hops", kind: "number" }, { field: "via", label: "through" }, { field: "gate", label: "gate" }];
      return rowsOut(cols, r.rows.map((x) => refRow({ ...x, id: x.ref, gate: x.gate ? "gate-relevant" : "" })), o, source);
    }
    case "counterfactual": {
      const ref = refOf(); if (!ref) return bad("world:counterfactual needs ?ref=proposal:P<n>");
      const r = K.counterfactual(w, ref); if (!r.ok) return bad(r.message);
      const cols: Col[] = [statusCol("class"), { field: "subject", kind: "ref" }, { field: "effect" }, { field: "basis" }, { field: "via", label: "reach" }];
      return rowsOut(cols, r.effects.map((e, i) => refRow({ id: String(i), class: e.class, subject: e.subject, effect: e.effect, basis: e.basis, via: e.via ?? "" }, e.subject)), o, source);
    }
    case "reach": {
      const r = K.worldReach(w, { need: q.need, ref: q.ref }); if (!r.ok) return bad(r.message);
      const rung = (f: string): Col => ({ field: f, kind: "status" });
      const cols: Col[] = [{ field: "capability" }, { field: "provider" }, statusCol("status"), rung("available"), rung("installed"), rung("configured"), rung("probed"), rung("reachable"), rung("authorized"), { field: "next" }];
      return rowsOut(cols, ((r as any).rows ?? []).map((x: any, i: number) => ({ id: String(i), ...x })), o, source);
    }
    case "replay": {
      const def = observerOf(q);
      if (typeof def === "string") return bad(def);
      const res = observe(env, def);
      if (res.result === "source-error" || res.result === "not-selected") return rowsOut([{ field: "result", kind: "status" }, { field: "message" }, { field: "observer" }], [{ id: "0", result: res.result, message: res.message, observer: res.observer }], o, source);
      return rowsOut([{ field: "row", kind: "number" }, statusCol("verdict"), { field: "observed" }, { field: "expected" }, { field: "failed" }], res.rows.map((r) => ({ ...r, id: String(r.row) })), o, source);
    }
  }
  return bad(`unknown world source ${name}`);
}

const normPreds = K.normPreds;
export function observerOf(q: Record<string, string>): K.ObserverDef | string {
  const selects = q.selects; if (!selects || !/^file:evidence\/[^?]+#table\d+$/.test(selects) || selects.includes("..")) return "world:replay needs ?selects=file:evidence/<lens>/<file>#tableN, expect=field~op~value[,...] and optionally where=...";
  const expect = K.parsePreds(q.expect); if (!expect.length) return "world:replay needs ?expect=field~op~value";
  return { selects, where: normPreds(K.parsePreds(q.where)), expect: normPreds(expect), discriminates: (q.discriminates ?? "").split(",").filter((x) => parseRef(x)) };
}
// Run an observer over evidence the run already holds. Selection can only read files safeRunFile admits; the result never settles anything.
export function observe(env: Env, def: K.ObserverDef) {
  const m = /^file:([^#]+)(?:#(.+))?$/.exec(def.selects)!;
  return K.replay(def, (_s, where) => { const r = fileRows(env, m[1], m[2], where as Filter[], undefined, 500); return r.kind === "rows" ? { rows: r.rows } : { error: (r as any).message }; }, (row, p) => applyFilters([row], [p as Filter]).length === 1);
}

function impactOpts(q: Record<string, string>): K.ImpactOpts {
  return { dir: q.dir === "up" || q.dir === "both" ? q.dir : "down", depth: q.depth ? Number(q.depth) : undefined, kinds: q.kinds ? q.kinds.split(",") : undefined, status: q.status ? q.status.split(",") : undefined, gate: q.gate === "1", limit: q.limit ? Number(q.limit) : undefined };
}

const nodeLabel = (n: { ref: string; label: string; kind: string }) => (["claim", "unknown", "decision", "proposal"].includes(n.kind) ? n.ref.split(":")[1] : n.kind === "artifact" || n.kind === "evidence" ? n.ref.split("/").pop()! : n.kind === "gate" ? "gate" : n.ref.split(":")[1]);
function worldGraph(env: Env, name: string, q: Record<string, string>): Resolved {
  const w = W(env); if (!w) return noProj();
  const ref = q.focus && parseRef(q.focus) ? q.focus : null; if (!ref) return bad(`graph:${name} needs ?focus=<ref>`);
  const r = K.impact(w, ref, name === "why" ? { dir: "up", depth: q.depth ? Number(q.depth) : 3, limit: 30 } : impactOpts(q)); if (!r.ok) return bad(r.message);
  const nodes = r.graph.nodes.map((n) => ({ id: n.ref, label: nodeLabel(n), kind: n.kind, tone: n.tone, ref: parseRef(n.ref) ? n.ref : undefined, status: n.status, detail: n.label }));
  return { kind: "graph", provenance: "process", nodes, edges: r.graph.edges.map((e) => ({ from: e.from, to: e.to, label: e.rel })) };
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
    case "job": case "criterion": case "opportunity": {
      const row = entity<any>(d, r.kind, r.id); if (!row) return { ...base, title: ref, exists: false };
      base.tone = row.grade === "CONTRADICTED" ? "danger" : ["OBSERVED", "VERIFIED"].includes(row.grade) ? "ok" : "warning";
      if (r.kind === "job") {
        base.title = row.job; base.fields = [{ k: "actor", v: row.actor }, { k: "grade", v: row.grade }, { k: "source", v: row.source }];
        for (const c of entities<any>(d, "criterion").filter((x) => x.job === r.id)) base.related.push({ label: c.id, ref: `criterion:${c.id}`, note: "judges it" });
      } else if (r.kind === "criterion") {
        base.title = row.statement; base.tone = row.evidence === "measured" ? "ok" : "unknown";
        base.fields = [{ k: "job", v: row.job }, { k: "importance", v: row.importance }, { k: "satisfaction", v: row.satisfaction }, { k: "opportunity score", v: "UNCOMPUTED" }, { k: "grade", v: row.grade }, { k: "source", v: row.source }];
        if (row.evidence !== "measured") base.consequence = "Importance or satisfaction is UNKNOWN, so the shortfall this criterion exposes has no size. No score is computed from prose.";
        base.related.push({ label: row.job, ref: `job:${row.job}`, note: "the progress it judges" });
        for (const o of entities<any>(d, "opportunity").filter((x) => x.basis === r.id)) base.related.push({ label: o.id, ref: `opportunity:${o.id}`, note: "exposes" });
      } else {
        base.title = row.deficiency; base.tone = row.evidence === "measured" ? "ok" : "unknown";
        base.fields = [{ k: "recovers", v: `${row.basisKind} ${row.basis}` }, { k: "actor uses today", v: row.alternatives || "not recorded" }, { k: "evidence", v: row.evidence }, { k: "candidates", v: row.candidates || "none yet" }, { k: "grade", v: row.grade }, { k: "source", v: row.source }];
        base.related.push({ label: row.basis, ref: `${row.basisKind}:${row.basis}`, note: "the progress it recovers" });
        for (const id of String(row.candidates || "").split(", ").filter(Boolean)) base.related.push({ label: id, ref: `proposal:${id}`, note: "one possible transformation" });
        if (row.evidence !== "measured") base.consequence = "The shortfall is not yet measured. A candidate is not evidence that it helps.";
      }
      base.next = [{ label: "open as a Case", action: "case", ref }, { label: "see why", action: "why", ref }];
      break;
    }
    case "actor": {
      const a = env.proj?.actors.find((x: any) => x.id === r.id); if (!a) return { ...base, title: ref, exists: false };
      base.title = a.actor; base.fields = [{ k: "job they hire the product for", v: a.job }];
      for (const j of entities<any>(d, "job").filter((x) => x.actor === r.id)) base.related.push({ label: j.id, ref: `job:${j.id}`, note: "pursues" });
      break;
    }
    case "case": {
      const w = W(env); if (!w) return { ...base, title: ref, exists: false };
      const c = C.caseOf(w, r.id); if (!c.ok) return { ...base, title: ref, exists: false };
      base.title = c.purpose.text; base.tone = c.material?.severity === "interrupt" ? "danger" : c.material ? "warning" : "neutral";
      base.fields = [{ k: "now", v: c.now.text }, { k: "deviation", v: c.material?.text ?? "none" }, { k: "settlement", v: `${c.settlement.reachable ? "reachable" : "not reachable"}; ${c.settlement.shouldSettleNow.why}` }];
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

// ---- the Case and what the run has learned, as rows -----------------------------------------------------------------------------------------
const caseIdOf = (q: Record<string, string>) => q.ref || "run";
function caseSource(env: Env, name: string, q: Record<string, string>, o: ResolveOpts, source: string): Resolved {
  const w = W(env); if (!w) return noProj();
  if (name === "prior") { if (!q.q) return bad("case:prior needs ?q=<words about what you are about to investigate>"); const r = L.prior(w, q.q); return rowsOut([{ field: "ref", kind: "ref" }, { field: "kind" }, { field: "status", kind: "status" }, { field: "text" }, { field: "summary" }], r.hits.map((h) => refRow({ ...h, id: h.ref })), o, source); }
  const c = C.caseOf(w, caseIdOf(q)); if (!c.ok) return bad(c.message);
  if (name === "state") return rowsOut([{ field: "part", label: "question" }, { field: "answer" }, { field: "signal", kind: "status" }], C.caseStateRows(c).map((r) => refRow(r, r._ref)), o, source);
  if (name === "affordances") return rowsOut([{ field: "label", label: "move" }, { field: "why" }, { field: "needs", label: "requires" }, { field: "cost" }, { field: "authority" }, { field: "recovery" }, { field: "evidence", label: "how we will know" }, { field: "then", label: "then reachable" }], C.caseMoveRows(c).map((r) => refRow(r, r._ref)), o, source);
  return rowsOut([{ field: "condition" }, { field: "type" }, { field: "status", kind: "status" }], C.caseSettlementRows(c).map((r) => refRow(r, r._ref)), o, source);
}
function learnRows(w: K.WorldEnv, name: string): { cols: Col[]; rows: any[] } {
  if (name === "decision-states") {
    const ds = L.decisionStates(w);
    return { cols: [{ field: "case" }, { field: "actor", kind: "ref" }, { field: "job", kind: "ref" }, { field: "trigger" }, { field: "push" }, { field: "pull" }, { field: "anxiety" }, { field: "habit" }, { field: "grade", kind: "grade" }, { field: "kind", label: "marked", kind: "status" }, { field: "evidence" }],
      rows: ds.rows.map((r) => ({ ...r, kind: r.issues.length ? "invalid" : r.inferred ? "inferred" : "direct", _ref: undefined })) };
  }
  if (name === "experiments") return { cols: [{ field: "id", label: "experiment", kind: "ref" }, { field: "hypothesis" }, { field: "state", kind: "status" }, { field: "frozen", kind: "status" }, { field: "result", kind: "status" }, { field: "ordering", label: "git order", kind: "status" }, { field: "scope" }, { field: "issues" }],
    rows: L.experiments(w).map((e) => ({ ...e, issues: e.issues.join("; "), _ref: e.ref })) };
  const exps = L.experiments(w);
  return { cols: [{ field: "id", label: "claim", kind: "ref" }, { field: "claim" }, { field: "status", kind: "status" }, { field: "supports", kind: "number" }, { field: "contradicts", kind: "number" }, { field: "settings" }, { field: "summary" }],
    rows: L.patterns(w, exps).map((p) => ({ ...p, supports: p.supporting.length, contradicts: p.contradicting.length, settings: p.variationCovered.join(", "), _ref: p.ref })) };
}
