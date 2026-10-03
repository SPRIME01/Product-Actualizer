// The world kernel: questions about the product world, answered from the run directory and nothing else.
//
//   SETTLED WORLD -> unresolved delta -> POSSIBILITY -> OBSERVATION -> EVIDENCE -> GAUNTLET -> SETTLEMENT -> NEW SETTLED WORLD
//
// Everything here is a read. It never writes a file, never reaches SQLite, and never promotes a candidate: settlement is the router's
// reconciliation, which this module only describes. Given the same run files it returns the same answers, so a cockpit that is closed,
// deleted, or rebuilt changes nothing about them.
//
// What "world" means today, truthfully: a settled world is the Product Model at version N (history/model-vN.md; the current one is
// product-model.md). Artifacts, evidence and proposals are not versioned by the run, so history questions about them say "not recorded"
// instead of guessing. The identity below is an interface a fully content-addressed world root can later replace without changing callers.
import crypto from "node:crypto";
import path from "node:path";
import { parseModel, SECTION_KEY } from "../../hooks/src/lib/md.mjs";
import { readText } from "../../hooks/src/lib/store.mjs";
import type { Proj } from "./project";
import { parseRef, fmtRef } from "../protocol/refs";
import { worldId, parseWorldId, type Basis, type Capability, type EffectClass } from "../protocol/world";
import { inRepo, firstCommit, logOf } from "./git";
import { reach as reachFor, suggestNeeds, hostEnv, isCapability, type ReachEnv } from "./reach";

// `observe` evaluates an observer over evidence the run holds; the source layer supplies it, so the kernel never reads files by itself.
export type WorldEnv = { proj: Proj; runDir: string; reach?: ReachEnv; observe?: (def: ObserverDef) => ReturnType<typeof replay> };
export type Row = Record<string, any>;
type Model = ReturnType<typeof parseModel>;

// ---- identity -------------------------------------------------------------------------------------------------------
export type Digest = { scope: "product-model"; algo: "sha256"; value: string; covers: string[]; omits: string[]; complete: false };
export type Identity = { id: string; scheme: "model-version"; version: number; current: boolean; settledAt: string | null; digest: Digest };
const TABLES = new Set(["Claims ledger", "Unknowns", "Decision log", "Capabilities", "Jobs", "Success criteria", "Opportunities"]);
const squash = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim();

// Intrinsic semantic content only. Version numbers, timestamps, front matter and whitespace are excluded, so two runs that settle the same
// claims, unknowns, decisions, and narrative get the same digest however and whenever they got there. Artifacts, evidence and proposals are
// outside it, which is why `complete` is false: this is a digest of the model, never a claim to be the world's root.
export function digestModel(m: Model): Digest {
  const sorted = <T,>(xs: T[], key: (x: T) => string) => [...xs].sort((a, b) => key(a).localeCompare(key(b), undefined, { numeric: true }));
  const body = {
    claims: sorted([...m.claims.values()], (c: any) => c.id).map((c: any) => [c.id, squash(c.text), c.grade, squash(c.source)]),
    unknowns: sorted([...m.unknowns.values()], (u: any) => u.id).map((u: any) => [u.id, squash(u.question), squash(u.blocks), squash(u.who)]),
    decisions: m.decisions.map((d: any) => [d.n, squash(d.decision), squash(d.rationale), squash(d.touched)]),
    capabilities: m.capabilities.map((k: any) => [k.id, squash(k.capability), squash(k.claims)]),
    narrative: Object.fromEntries(m.heads.filter((h: string) => !TABLES.has(h)).map((h: string) => [h, squash(m.sections[h])])),
    // present only when the model has them, so a model without demand sections keeps the digest it always had
    ...(m.jobs?.size ? { jobs: sorted([...m.jobs.values()], (j: any) => j.id).map((j: any) => [j.id, squash(j.actor), squash(j.job), j.grade, squash(j.source)]) } : {}),
    ...(m.criteria?.size ? { criteria: sorted([...m.criteria.values()], (c: any) => c.id).map((c: any) => [c.id, c.job, c.direction, squash(c.measure), squash(c.object), squash(c.context), squash(c.importance), squash(c.satisfaction), c.grade, squash(c.source)]) } : {}),
    ...(m.opportunities?.size ? { opportunities: sorted([...m.opportunities.values()], (o: any) => o.id).map((o: any) => [o.id, o.basis, squash(o.deficiency), squash(o.alternatives), o.grade, squash(o.source)]) } : {}),
  };
  const demand = m.jobs?.size || m.criteria?.size || m.opportunities?.size;
  return { scope: "product-model", algo: "sha256", value: crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex"), covers: ["claims", "unknowns", "decisions (without version)", "capabilities", "narrative sections", ...(demand ? ["jobs", "success criteria", "opportunities"] : [])], omits: ["front matter", "artifacts", "evidence", "proposals"], complete: false };
}

// ---- worlds ---------------------------------------------------------------------------------------------------------
export type Ent = { ref: string; kind: string; label: string; fields: Record<string, string> };
export type Snap = { id: string; version: number; current: boolean; model: Model; ents: Map<string, Ent>; narrative: Record<string, string>; identity: Identity };

const cache = new Map<string, { key: string; model: Model }>();
function readModelFile(file: string): Model | null {
  const text = readText(file, null); if (text == null) return null;
  const key = `${text.length}:${Bun.hash(text)}`;
  const hit = cache.get(file); if (hit?.key === key) return hit.model;
  const model = parseModel(text); cache.set(file, { key, model }); return model;
}

export function worlds(W: WorldEnv) {
  const cur = W.proj.run.modelVersion;
  const histDir = path.join(W.runDir, "history");
  const files = new Map<number, string>();
  for (const f of W.proj.versions) files.set(f.version, path.join(histDir, `model-v${f.version}.md`));
  const versions = [...new Set([...files.keys(), ...(cur ? [cur] : [])])].sort((a, b) => a - b);
  const settled = new Map<number, string>();
  for (const e of W.proj.log) if (e.type === "reconcile_done" && e.version) settled.set(e.version, e.ts);
  const loaded = new Map<number, Snap | null>();
  const load = (id: number | "current"): Snap | null => {
    const v = id === "current" ? cur : id;
    if (!v) return null;
    if (loaded.has(v)) return loaded.get(v)!;
    const file = v === cur ? path.join(W.runDir, "product-model.md") : files.get(v);
    const model = file ? readModelFile(file) : null;
    if (!model) { loaded.set(v, null); return null; }
    const ents = new Map<string, Ent>();
    for (const c of model.claims.values() as any) ents.set(`claim:${c.id}`, { ref: `claim:${c.id}`, kind: "claim", label: c.text, fields: { text: c.text, grade: c.grade, source: c.source } });
    for (const u of model.unknowns.values() as any) ents.set(`unknown:${u.id}`, { ref: `unknown:${u.id}`, kind: "unknown", label: u.question, fields: { question: u.question, blocks: u.blocks, who: u.who } });
    for (const d of model.decisions as any[]) ents.set(`decision:${d.n}`, { ref: `decision:${d.n}`, kind: "decision", label: d.decision, fields: { decision: d.decision, rationale: d.rationale, touched: d.touched } });
    for (const j of model.jobs.values() as any) ents.set(`job:${j.id}`, { ref: `job:${j.id}`, kind: "job", label: j.job, fields: { job: j.job, actor: j.actor, grade: j.grade, source: j.source } });
    for (const c of model.criteria.values() as any) ents.set(`criterion:${c.id}`, { ref: `criterion:${c.id}`, kind: "criterion", label: `${c.direction} ${c.measure}`, fields: { job: c.job, direction: c.direction, measure: c.measure, object: c.object, context: c.context, importance: c.importance, satisfaction: c.satisfaction, grade: c.grade, source: c.source } });
    for (const o of model.opportunities.values() as any) ents.set(`opportunity:${o.id}`, { ref: `opportunity:${o.id}`, kind: "opportunity", label: o.deficiency, fields: { basis: o.basis, deficiency: o.deficiency, alternatives: o.alternatives, grade: o.grade, source: o.source } });
    const narrative: Record<string, string> = {};
    for (const h of model.heads as string[]) if (!TABLES.has(h)) narrative[SECTION_KEY[h]] = squash(model.sections[h]);
    for (const k of model.capabilities as any[]) narrative.capabilities = `${narrative.capabilities ?? ""} ${k.id} ${k.capability} ${k.claims}`.trim();
    const snap: Snap = { id: worldId(v), version: v, current: v === cur, model, ents, narrative, identity: { id: worldId(v), scheme: "model-version", version: v, current: v === cur, settledAt: settled.get(v) ?? null, digest: digestModel(model) } };
    loaded.set(v, snap); return snap;
  };
  return { current: cur, versions, load, settledAt: (v: number) => settled.get(v) ?? null };
}

// ---- which decision touched what ------------------------------------------------------------------------------------
type Touch = { all: boolean; fields: Set<string>; claims: Set<string> };
export function touchOf(touched: string): Touch {
  const t: Touch = { all: false, fields: new Set(), claims: new Set() };
  for (const tok of String(touched ?? "").split(/[,;]\s*/).map((x) => x.trim()).filter(Boolean)) {
    if (tok === "all") { t.all = true; continue; }
    const [f, rest] = [tok.split(":")[0], tok.includes(":") ? tok.slice(tok.indexOf(":") + 1) : ""];
    const ids = rest.match(/C\d+/g);
    if (f === "claims" && ids) ids.forEach((i) => t.claims.add(i)); else t.fields.add(f);
  }
  return t;
}
// "id": the decision names this entity. "field": it touched the whole field the entity lives in, so it may have. null: it did not.
export function touches(d: { touched: string }, ref: string): "id" | "field" | null {
  const r = parseRef(ref); if (!r) return null; const t = touchOf(d.touched);
  if (r.kind === "claim") return t.claims.has(r.id) ? "id" : t.all || t.fields.has("claims") ? "field" : null;
  if (r.kind === "unknown") return t.all || t.fields.has("unknowns") ? "field" : null;
  if (r.kind === "field") return t.all || t.fields.has(r.id) ? "field" : null;
  const demand: Record<string, string> = { job: "jobs", criterion: "criteria", opportunity: "opportunities" };
  if (demand[r.kind]) return t.all || t.fields.has(demand[r.kind]) ? "field" : null;
  return null;
}

// ---- diff: what changed between two worlds (Dolt's diff table, over our entities) -----------------------------------
const short = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
export function diff(W: WorldEnv, a: number | "current", b: number | "current") {
  const w = worlds(W); const A = w.load(a), B = w.load(b);
  if (!A || !B) return { ok: false as const, message: `no recorded world ${!A ? worldId(a) : worldId(b)}; recorded: ${w.versions.map((v) => worldId(v)).join(", ") || "none"}` };
  const [lo, hi] = [Math.min(A.version, B.version), Math.max(A.version, B.version)];
  const decisions = (B.version >= A.version ? B : A).model.decisions.filter((d: any) => d.version > lo && d.version <= hi);
  const because = (ref: string) => decisions.map((d: any) => ({ d, p: touches(d, ref) })).filter((x) => x.p).map((x) => `${x.d.n}${x.p === "field" ? " (whole field)" : ""}`).join(", ");
  const rows: Row[] = [];
  for (const [ref, e] of B.ents) {
    const o = A.ents.get(ref);
    if (!o) rows.push({ ref, kind: e.kind, change: "added", field: "", before: "", after: short(e.label), because: e.kind === "decision" ? "" : because(ref), basis: "recorded" });
    else for (const k of Object.keys(e.fields)) if (squash(e.fields[k]) !== squash(o.fields[k] ?? "")) rows.push({ ref, kind: e.kind, change: "changed", field: k, before: short(o.fields[k] ?? ""), after: short(e.fields[k]), because: because(ref), basis: "recorded" });
  }
  for (const [ref, e] of A.ents) if (!B.ents.has(ref)) rows.push({ ref, kind: e.kind, change: "removed", field: "", before: short(e.label), after: "", because: because(ref), basis: "recorded" });
  for (const k of new Set([...Object.keys(A.narrative), ...Object.keys(B.narrative)])) {
    const x = A.narrative[k] ?? "", y = B.narrative[k] ?? "";
    if (x !== y) rows.push({ ref: fmtRef("field", k), kind: "field", change: !x ? "added" : !y ? "removed" : "changed", field: "text", before: x ? short(x, 60) : "", after: y ? short(y, 60) : "", because: because(fmtRef("field", k)), basis: "recorded" });
  }
  const order = { added: 0, changed: 1, removed: 2 } as any;
  rows.sort((p, q) => order[p.change] - order[q.change] || p.ref.localeCompare(q.ref, undefined, { numeric: true }));
  return { ok: true as const, a: A.identity, b: B.identity, same: A.identity.digest.value === B.identity.digest.value, rows, coverage: { covers: A.identity.digest.covers, omits: A.identity.digest.omits }, note: "Differences are in the Product Model only. Artifacts, evidence and proposals are not versioned by the run." };
}

// ---- timeline: settled transitions, optionally for one ref ----------------------------------------------------------
export function timeline(W: WorldEnv, ref?: string, o: { git?: boolean } = {}) {
  const w = worlds(W); const out: Row[] = []; let prev: Snap | null = null;
  for (const v of w.versions) {
    const s = w.load(v); if (!s) continue;
    const ts = w.settledAt(v) ?? "";
    if (!prev) { if (!ref || s.ents.has(ref)) out.push({ seq: v, ts, type: ref ? "ref.appeared" : "model.settled", subject: ref ?? `version:${v}`, detail: ref ? short(s.ents.get(ref)!.label, 100) : `${s.ents.size} entities, digest ${s.identity.digest.value.slice(0, 10)}`, version: v, world: s.id }); prev = s; continue; }
    const d = diff(W, prev.version, v); prev = s;
    if (!d.ok) continue;
    const rows = ref ? d.rows.filter((r) => r.ref === ref) : d.rows;
    const dec = s.model.decisions.filter((x: any) => x.version === v).map((x: any) => x.n).join(", ");
    if (ref) for (const r of rows) out.push({ seq: v, ts, type: r.change === "added" ? "ref.appeared" : r.change === "removed" ? "ref.removed" : "ref.changed", subject: ref, detail: `${r.field ? r.field + ": " : ""}${r.before ? r.before + " → " : ""}${r.after}${r.because ? `  (by ${r.because})` : ""}`, version: v, world: s.id });
    else out.push({ seq: v, ts, type: d.same ? "model.settled-unchanged" : "model.settled", subject: `version:${v}`, detail: `${rows.filter((x) => x.change === "added").length} added, ${rows.filter((x) => x.change === "changed").length} changed, ${rows.filter((x) => x.change === "removed").length} removed${dec ? `; decisions ${dec}` : ""}${d.same ? "; no semantic change" : ""}`, version: v, world: s.id });
  }
  if (o.git) {
    // commits that touched the run directory, from local git: provenance for the same history, never a substitute for it
    const rel = ref && /^(artifact|evidence):/.test(ref) ? `${ref.startsWith("artifact:") ? "artifacts" : "evidence"}/${ref.slice(ref.indexOf(":") + 1)}` : null;
    const cs = inRepo(W.runDir) ? logOf(W.runDir, rel, { limit: 30 }) : null;
    if (cs) cs.slice().reverse().forEach((c, i) => out.push({ seq: 1000 + i, ts: c.ts, type: "git.commit", subject: ref ?? "run", detail: `${c.short} ${c.author}: ${short(c.subject, 90)}`, version: 0, world: "git" }));
    else out.push({ seq: 1000, ts: "", type: "git.unavailable", subject: ref ?? "run", detail: "the run directory is not in a git work tree, so no commit history is recorded", version: 0, world: "git" });
  }
  return out;
}

// ---- the dependency graph: Y depends on X means an edge X -> Y ------------------------------------------------------
export type GNode = { ref: string; kind: string; label: string; status?: string; tone?: string };
export type GEdge = { from: string; to: string; rel: string; basis: Basis };
export function graphOf(W: WorldEnv) {
  const p = W.proj; const nodes = new Map<string, GNode>(); const edges: GEdge[] = [];
  const node = (n: GNode) => { if (!nodes.has(n.ref)) nodes.set(n.ref, n); };
  const edge = (from: string, to: string, rel: string, basis: Basis = "recorded") => { if (from !== to && !edges.some((e) => e.from === from && e.to === to && e.rel === rel)) edges.push({ from, to, rel, basis }); };
  const tone = (g: string) => (g === "CONTRADICTED" ? "danger" : g === "OBSERVED" || g === "VERIFIED" ? "ok" : g === "UNKNOWN" ? "unknown" : "warning");
  for (const c of p.claims) node({ ref: `claim:${c.id}`, kind: "claim", label: c.text, status: c.grade, tone: tone(c.grade) });
  for (const u of p.unknowns) node({ ref: `unknown:${u.id}`, kind: "unknown", label: u.question, tone: "unknown" });
  for (const d of p.decisions) node({ ref: `decision:${d.n}`, kind: "decision", label: d.decision });
  for (const x of p.proposals) node({ ref: `proposal:${x.id}`, kind: "proposal", label: x.proposal, status: x.status, tone: x.status === "open" ? "warning" : x.status === "rejected" ? "neutral" : "ok" });
  for (const a of p.artifacts) node({ ref: `artifact:${a.id}`, kind: "artifact", label: a.id, status: a.status, tone: a.status === "current" ? "ok" : "danger" });
  for (const e of p.evidence) node({ ref: `evidence:${e.id}`, kind: "evidence", label: e.id });
  for (const l of p.lenses) node({ ref: `lens:${l.name}`, kind: "lens", label: l.name, status: l.status });
  for (const f of ["purpose", "actors", "capabilities", "constraints", "form", "voice", "positioning", "claims", "unknowns", "decisions", "jobs", "criteria", "opportunities"]) node({ ref: `field:${f}`, kind: "field", label: f });
  const dtone = (g: string) => (g === "CONTRADICTED" ? "danger" : g === "OBSERVED" || g === "VERIFIED" ? "ok" : g === "UNKNOWN" ? "unknown" : "warning");
  const usedActors = new Set((p.jobs ?? []).map((j: any) => j.actor));
  for (const a of p.actors ?? []) if (usedActors.has(a.id)) node({ ref: `actor:${a.id}`, kind: "actor", label: a.actor });
  for (const j of p.jobs ?? []) node({ ref: `job:${j.id}`, kind: "job", label: j.job, status: j.grade, tone: dtone(j.grade) });
  for (const c of p.criteria ?? []) node({ ref: `criterion:${c.id}`, kind: "criterion", label: c.statement, status: c.evidence === "measured" ? "measured" : c.evidence === "partial" ? "partly measured" : "unmeasured", tone: c.evidence === "measured" ? "ok" : "unknown" });
  for (const o of p.opportunities ?? []) node({ ref: `opportunity:${o.id}`, kind: "opportunity", label: o.deficiency, status: o.addressed ? "addressed" : o.evidence === "measured" ? "measured" : "evidence insufficient", tone: o.evidence === "measured" ? "ok" : "unknown" });
  node({ ref: "gate", kind: "gate", label: "release gate", status: p.run.verdict ?? (p.run.ready ? "ready" : "blocked"), tone: p.run.verdict === "go" ? "ok" : p.blockers.length ? "danger" : "neutral" });

  for (const c of p.claims) {
    const cr = `claim:${c.id}`;
    for (const e of p.evidence) if (c.source.includes(e.id)) edge(`evidence:${e.id}`, cr, "evidence for");
    if (c.grade === "INFERRED") for (const par of c.source.match(/C\d+/g) ?? []) if (par !== c.id) edge(`claim:${par}`, cr, "inferred from");
    for (const u of `${c.text} ${c.source}`.match(/U\d+/g) ?? []) if (nodes.has(`unknown:${u}`)) edge(`unknown:${u}`, cr, "left open by");
  }
  // demand: actor pursues job, job is judged by criterion, criterion exposes opportunity, opportunity is addressed by candidates
  const evidenceIn = (to: string, source: string) => { for (const e of p.evidence) if (source.includes(e.id)) edge(`evidence:${e.id}`, to, "evidence for"); for (const c of source.match(/C\d+/g) ?? []) if (nodes.has(`claim:${c}`)) edge(`claim:${c}`, to, "evidence for"); };
  for (const j of p.jobs ?? []) { edge(`actor:${j.actor}`, `job:${j.id}`, "pursues"); evidenceIn(`job:${j.id}`, j.source); }
  for (const c of p.criteria ?? []) { edge(`job:${c.job}`, `criterion:${c.id}`, "judged by"); evidenceIn(`criterion:${c.id}`, `${c.source} ${c.importance} ${c.satisfaction}`); }
  for (const o of p.opportunities ?? []) {
    edge(`${o.basisKind}:${o.basis}`, `opportunity:${o.id}`, "exposes"); evidenceIn(`opportunity:${o.id}`, o.source);
    for (const id of String(o.candidates || "").split(", ").filter(Boolean)) edge(`opportunity:${o.id}`, `proposal:${id}`, "addressed by");
  }
  for (const a of p.artifacts) {
    const ar = `artifact:${a.id}`;
    edge(`lens:${a.lens}`, ar, "built by");
    for (const c of a.cites ?? []) edge(`claim:${c}`, ar, a.public ? "cited publicly by" : "cited by");
    for (const f of a.reads ?? []) edge(`field:${f}`, ar, "read by");
    for (const d of a.stale ?? []) edge(`decision:${d}`, ar, "made stale");
  }
  for (const d of p.decisions) {
    const t = touchOf(d.touched);
    for (const c of t.claims) edge(`decision:${d.n}`, `claim:${c}`, "touched");
    for (const f of t.fields) edge(`decision:${d.n}`, `field:${f}`, "touched");
    if (t.all) for (const f of ["claims", "unknowns", "decisions", "positioning"]) edge(`decision:${d.n}`, `field:${f}`, "touched");
  }
  for (const x of p.proposals) {
    const pr = `proposal:${x.id}`;
    const m = /^accepted:(D\d+)$/.exec(x.status); if (m) edge(pr, `decision:${m[1]}`, "accepted as");
    edge(pr, `field:${x.field}`, x.status === "open" ? "would change" : "changed");
    for (const c of `${x.proposal} ${x.evidence}`.match(/C\d+/g) ?? []) edge(`claim:${c}`, pr, "evidence for");
    for (const e of p.evidence) if (String(x.evidence).includes(e.id)) edge(`evidence:${e.id}`, pr, "evidence for");
  }
  for (const l of p.lenses) for (const n of l.needs ?? []) edge(`lens:${n}`, `lens:${l.name}`, "needed by");
  // Gate: only what currently blocks it connects to it, taken from the engine's own blockers.
  for (const b of p.blockers) {
    for (const rel of b.text.match(/artifacts\/(\S+?)(?= is |:)/g) ?? []) edge(`artifact:${rel.slice(10)}`, "gate", `blocks gate (${b.code})`);
    if (b.code === "proposals-open") for (const id of b.text.match(/P\d+/g) ?? []) edge(`proposal:${id}`, "gate", "blocks gate (proposals-open)");
    if (b.code === "lens-open" || b.code === "lens-not-run") for (const l of p.lenses) if (b.text.includes(l.name)) edge(`lens:${l.name}`, "gate", `blocks gate (${b.code})`);
    if (b.code === "gate-stale" || b.code === "no-gate") for (const a of p.artifacts) if (a.isGate) edge(`artifact:${a.id}`, "gate", `blocks gate (${b.code})`);
  }
  return { nodes, edges };
}

const walk = (edges: GEdge[], from: string, dir: "down" | "up", depth = Infinity) => {
  const dist = new Map<string, number>([[from, 0]]); const via = new Map<string, GEdge>(); let frontier = [from];
  for (let d = 1; d <= depth && frontier.length; d++) {
    const next: string[] = [];
    for (const n of frontier) for (const e of edges) {
      const [a, b] = dir === "down" ? [e.from, e.to] : [e.to, e.from];
      if (a === n && !dist.has(b)) { dist.set(b, d); via.set(b, e); next.push(b); }
    }
    frontier = next;
  }
  dist.delete(from);
  return { dist, via };
};

export type ImpactOpts = { dir?: "up" | "down" | "both"; depth?: number; kinds?: string[]; status?: string[]; gate?: boolean; limit?: number };
export function impact(W: WorldEnv, ref: string, o: ImpactOpts = {}) {
  const g = graphOf(W); const subject = g.nodes.get(ref);
  if (!subject) return { ok: false as const, message: `${ref} does not exist in this run` };
  const dir = o.dir ?? "down", depth = Math.min(o.depth ?? 2, 6), limit = o.limit ?? 30;
  const dirs: ("down" | "up")[] = dir === "both" ? ["down", "up"] : [dir];
  const toGate = walk(g.edges, "gate", "up").dist;   // everything with a path to the gate as it currently stands
  const picked = new Map<string, { n: GNode; distance: number; dir: string; via: GEdge }>(); const all = new Set<string>();
  for (const d of dirs) {
    const full = walk(g.edges, ref, d); for (const k of full.dist.keys()) all.add(k);
    const near = walk(g.edges, ref, d, depth);
    for (const [k, dist] of near.dist) { const n = g.nodes.get(k)!; if (picked.has(k)) continue; picked.set(k, { n, distance: dist, dir: d, via: near.via.get(k)! }); }
  }
  let rows = [...picked.values()].map(({ n, distance, dir: dd, via }) => ({ ref: n.ref, kind: n.kind, label: short(n.label, 70), status: n.status ?? "", tone: n.tone ?? "", distance, direction: dd, via: via.rel, gate: toGate.has(n.ref) || n.ref === "gate", stale: n.status === "stale" }));
  if (o.kinds?.length) rows = rows.filter((r) => o.kinds!.includes(r.kind));
  if (o.status?.length) rows = rows.filter((r) => o.status!.map((s) => s.toLowerCase()).includes(r.status.toLowerCase()));
  if (o.gate) rows = rows.filter((r) => r.gate);
  rows.sort((a, b) => Number(b.gate) - Number(a.gate) || a.distance - b.distance || a.ref.localeCompare(b.ref, undefined, { numeric: true }));
  const kept = rows.slice(0, limit); const keep = new Set([ref, ...kept.map((r) => r.ref)]);
  const gatePath = (() => { if (!all.has("gate") && ref !== "gate") return null; const { via } = walk(g.edges, ref, "down"); const path: string[] = []; let cur = "gate"; while (cur !== ref && via.has(cur)) { path.unshift(cur); cur = via.get(cur)!.from; } return cur === ref ? [ref, ...path] : null; })();
  const pathSet = new Set(gatePath ?? []); for (const r of gatePath ?? []) keep.add(r);
  const nodes = [...keep].map((k) => g.nodes.get(k)!).filter(Boolean);
  const es = g.edges.filter((e) => keep.has(e.from) && keep.has(e.to) && (picked.has(e.from) || e.from === ref) && (picked.has(e.to) || e.to === ref || pathSet.has(e.to)));
  return { ok: true as const, subject: { ref, kind: subject.kind, label: short(subject.label, 90), status: subject.status ?? "" }, direction: dir, depth, affected: all.size, direct: rows.filter((r) => r.distance === 1).length, stale: rows.filter((r) => r.stale).length, gateRelevant: rows.filter((r) => r.gate).length, truncated: rows.length > limit, rows: kept, gatePath, graph: { nodes, edges: es }, basis: "recorded relationships in the run (cites, reads, touched, accepted-as, built-by, blockers); no inferred dependencies" };
}

// ---- why: how the ref came to be what it is -------------------------------------------------------------------------
export type Answer = { q: string; a: string; basis: Basis; refs?: string[] };
const A_ = (q: string, a: string, basis: Basis, refs?: string[]): Answer => ({ q, a, basis, ...(refs?.length ? { refs } : {}) });
const NOT_RECORDED = "not recorded by the run";

export function why(W: WorldEnv, ref: string) {
  const r = parseRef(ref); const p = W.proj;
  if (!r) return { ok: false as const, message: `${ref} is not a ref` };
  const g = graphOf(W); const me = g.nodes.get(ref);
  if (!me && r.kind !== "version") return { ok: false as const, message: `${ref} does not exist in this run` };
  const w = worlds(W);
  // the run's log first; when it has no entry for a version, the commit that recorded the snapshot (read-only git), labelled as such
  const gitTime = (v: number) => { if (!inRepo(W.runDir)) return null; const c = v === w.current ? logOf(W.runDir, "product-model.md", { limit: 1 })?.[0] : firstCommit(W.runDir, `history/model-v${v}.md`); return c ? `${c.ts} (git ${c.short})` : null; };
  const ts = (v: number) => w.settledAt(v) ?? gitTime(v);
  const when = (v: number) => (ts(v) ? `model@${v}, settled ${ts(v)}` : `model@${v} (settlement time ${NOT_RECORDED})`);
  const ans: Answer[] = [];
  const up = (rels?: RegExp) => g.edges.filter((e) => e.to === ref && (!rels || rels.test(e.rel)));
  const down = g.edges.filter((e) => e.from === ref);
  const responses = p.responses.filter((x: any) => (x.ref ?? x.target) === ref);

  const lensOfEvidence = (id: string) => id.split("/")[0];
  const logTsForProposal = (id: string) => p.log.find((e: any) => e.type === "lens_done" && (e.proposals ?? []).includes(id))?.ts;

  switch (r.kind) {
    case "claim": {
      const c = p.claims.find((x) => x.id === r.id)!;
      ans.push(A_("What is it?", c.text, "recorded"), A_("What is its state?", `${c.grade}, source: ${c.source || "(none)"}`, "recorded"));
      // walk the settled versions to find when the current grade began and what changed it
      const trail: { v: number; from: string | null; to: string }[] = []; let last: string | null = null;
      for (const v of w.versions) { const s = w.load(v); const e = s?.ents.get(ref); const gr = e?.fields.grade ?? null; if (gr !== last && gr !== null) trail.push({ v, from: last, to: gr }); last = gr; }
      const seen = w.versions.length ? w.versions.filter((v) => w.load(v)).length : 0;
      if (trail.length) {
        const t = trail[trail.length - 1]; const decs = (w.load(t.v)?.model.decisions ?? []).filter((d: any) => d.version === t.v).map((d: any) => ({ d, p: touches(d, ref) })).filter((x: any) => x.p);
        ans.push(A_("When did it reach this grade?", `${t.from ? `${t.from} → ${t.to}` : `first recorded as ${t.to}`} at ${when(t.v)}${trail.slice(0, -1).some((x) => x.from) ? `; ${trail.slice(0, -1).filter((x) => x.from).length} earlier grade change(s)` : ""}`, "recorded", [`version:${t.v}`]));
        ans.push(decs.length ? A_("Which transition changed it?", `${decs.map((x: any) => `${x.d.n}${x.p === "field" ? " (named the whole field, not this claim)" : ""}: ${short(x.d.decision, 100)}`).join("; ")}`, decs.every((x: any) => x.p === "id") ? "recorded" : "derived", decs.map((x: any) => `decision:${x.d.n}`)) : A_("Which transition changed it?", `no decision at model@${t.v} names this claim${seen < w.versions.length ? "; some earlier snapshots are missing" : ""}`, "unavailable"));
      } else ans.push(A_("When did it reach this grade?", `no settled snapshot contains it (${seen} readable of ${w.versions.length})`, "unavailable"));
      const props = p.proposals.filter((x: any) => new RegExp(`\\b${r.id}\\b`).test(`${x.proposal}`));
      ans.push(props.length ? A_("Who proposed or observed it?", props.map((x: any) => `${x.id} by ${x.lens} (${x.status}${logTsForProposal(x.id) ? `, written ${logTsForProposal(x.id)}` : ""})`).join("; "), "recorded", props.map((x: any) => `proposal:${x.id}`)) : A_("Who proposed or observed it?", `no proposal names ${r.id}; its source is the only attribution`, "unavailable"));
      const files = up(/evidence for/).filter((e) => e.from.startsWith("evidence:"));
      const parts = String(c.source).split(/;\s*/).filter(Boolean);
      ans.push(A_("What supports it?", parts.length ? `${parts.length} source(s): ${parts.map((s) => short(s, 70)).join(" | ")}${files.length ? `; ${files.length} reopenable in the run` : "; none reopenable in the run"}` : "no source", parts.length ? "recorded" : "unavailable", files.map((e) => e.from)));
      ans.push(A_("What contradicts it?", c.grade === "CONTRADICTED" ? `its own sources disagree: ${parts.map((s) => short(s, 70)).join("  vs  ")}` : "no contradiction is recorded against it", c.grade === "CONTRADICTED" ? "recorded" : "derived"));
      const parents = up(/inferred from|left open by/);
      ans.push(A_("What does it depend on?", parents.length ? parents.map((e) => `${e.from} (${e.rel})`).join(", ") : files.length ? "its evidence files only" : "nothing recorded", "recorded", [...parents.map((e) => e.from), ...files.map((e) => e.from)]));
      const arts = down.filter((e) => e.to.startsWith("artifact:"));
      const pub = arts.filter((e) => /publicly/.test(e.rel));
      ans.push(A_("What depends on it?", `${arts.length} artifact(s)${pub.length ? `, ${pub.length} public` : ""}${down.filter((e) => e.to.startsWith("claim:")).length ? `; also infers ${down.filter((e) => e.to.startsWith("claim:")).map((e) => e.to).join(", ")}` : ""}`, "recorded", down.map((e) => e.to).filter((x) => !x.startsWith("field"))));
      if (pub.length && !["OBSERVED", "VERIFIED"].includes(c.grade)) ans.push(A_("What is the consequence?", `public artifact(s) ${pub.map((e) => e.to.slice(9)).join(", ")} cite it at ${c.grade}; public copy may cite only OBSERVED or VERIFIED, so this blocks release`, "derived", pub.map((e) => e.to)));
      break;
    }
    case "unknown": {
      const u = p.unknowns.find((x) => x.id === r.id)!;
      ans.push(A_("What is it?", u.question, "recorded"), A_("What does it block?", u.blocks || "nothing recorded", "recorded"), A_("Who can resolve it?", u.who || NOT_RECORDED, u.who ? "recorded" : "unavailable"));
      let firstV: number | null = null; for (const v of w.versions) if (w.load(v)?.ents.has(ref)) { firstV = v; break; }
      ans.push(firstV ? A_("When was it opened?", `first recorded in ${when(firstV)}`, "recorded", [`version:${firstV}`]) : A_("When was it opened?", "no settled snapshot contains it", "unavailable"));
      const deps = down.map((e) => e.to);
      ans.push(A_("What depends on it?", deps.length ? `${deps.join(", ")} (claims left open by it)` : "no claim names it", "recorded", deps));
      break;
    }
    case "proposal": {
      const x = p.proposals.find((y: any) => y.id === r.id)!;
      ans.push(A_("What is it?", `${x.kind} to ${x.field}: ${x.proposal}`, "recorded"), A_("What is its state?", `${x.status}${x.reason ? `: ${x.reason}` : ""}`, "recorded"));
      ans.push(A_("Who proposed it?", `lens ${x.lens}${logTsForProposal(x.id) ? `, recorded at ${logTsForProposal(x.id)}` : `; time ${NOT_RECORDED}`}`, "recorded", [`lens:${x.lens}`]));
      const m = /^accepted:(D\d+)$/.exec(x.status);
      if (m) { const d = p.decisions.find((y: any) => y.n === m[1]); ans.push(A_("What settled it?", d ? `${m[1]} at ${when(d.version)}: ${short(d.decision, 100)}` : `${m[1]} (decision row missing)`, d ? "recorded" : "unavailable", [`decision:${m[1]}`])); }
      else if (x.status === "open") ans.push(A_("What would settle it?", "reconciliation: the router accepts or rejects it with a logged reason. Nothing in the cockpit or this debugger can.", "derived"));
      else ans.push(A_("What settled it?", `rejected${x.reason ? `: ${x.reason}` : ""}`, "recorded"));
      const sup = up(/evidence for/);
      ans.push(A_("What supports it?", sup.length ? sup.map((e) => e.from).join(", ") : x.evidence || "no evidence column", sup.length ? "recorded" : "unavailable", sup.map((e) => e.from)));
      ans.push(A_("What would it touch?", `field ${x.field}${g.edges.filter((e) => e.from === `field:${x.field}` && e.to.startsWith("artifact:")).length ? `, read by ${g.edges.filter((e) => e.from === `field:${x.field}` && e.to.startsWith("artifact:")).map((e) => e.to.slice(9)).join(", ")}` : ""}`, "derived", [`field:${x.field}`]));
      break;
    }
    case "decision": {
      const d = p.decisions.find((y: any) => y.n === r.id)!;
      ans.push(A_("What is it?", d.decision, "recorded"), A_("Why was it made?", d.rationale || NOT_RECORDED, d.rationale ? "recorded" : "unavailable"), A_("When did it settle?", when(d.version), ts(d.version) ? "recorded" : "unavailable", [`version:${d.version}`]));
      const acc = p.proposals.filter((x: any) => x.status === `accepted:${r.id}`);
      ans.push(acc.length ? A_("What produced it?", `accepted proposal(s) ${acc.map((x: any) => `${x.id} (${x.lens})`).join(", ")}`, "recorded", acc.map((x: any) => `proposal:${x.id}`)) : A_("What produced it?", "no proposal is marked accepted as this decision", "unavailable"));
      ans.push(A_("What did it touch?", d.touched, "recorded", down.filter((e) => e.rel === "touched").map((e) => e.to)));
      const st = down.filter((e) => e.rel === "made stale");
      ans.push(A_("What did it make stale?", st.length ? st.map((e) => e.to.slice(9)).join(", ") : "nothing currently stale because of it", "recorded", st.map((e) => e.to)));
      break;
    }
    case "artifact": {
      const a = p.artifacts.find((x) => x.id === r.id)!;
      ans.push(A_("What is it?", `${a.id}, built by lens ${a.lens}${a.public ? ", public" : ""}`, "recorded", [`lens:${a.lens}`]), A_("What is its state?", `${a.status}${a.errors?.length ? `: ${a.errors[0]}` : ""}`, "recorded"));
      ans.push(A_("What was it built from?", `model@${a.built}; reads ${(a.reads ?? []).join(", ") || "nothing"}; cites ${(a.cites ?? []).join(", ") || "nothing"}`, "recorded", [`version:${a.built}`, ...(a.cites ?? []).map((c: string) => `claim:${c}`)]));
      if (a.stale?.length) {
        const decs = a.stale.map((n: string) => p.decisions.find((d: any) => d.n === n)).filter(Boolean);
        ans.push(A_("Why is it stale?", decs.map((d: any) => `${d.n} (${when(d.version)}) touched ${d.touched}, which it reads or cites`).join("; "), "recorded", a.stale.map((n: string) => `decision:${n}`)));
        ans.push(A_("What fixes it?", `re-run lens ${a.lens} against model@${p.run.modelVersion}`, "derived", [`lens:${a.lens}`]));
      }
      ans.push(A_("What do earlier builds look like?", `see history/${a.id.split("/").pop()!.replace(/\.md$/, "")}@N.md when the run kept one`, "unavailable"));
      ans.push(A_("What depends on it?", down.some((e) => e.to === "gate") ? "it currently blocks the release gate" : "nothing blocks on it", "recorded", down.map((e) => e.to)));
      break;
    }
    case "evidence": {
      ans.push(A_("What is it?", `evidence file ${r.id}, produced under lens ${lensOfEvidence(r.id)}`, "recorded", [`lens:${lensOfEvidence(r.id)}`]));
      const cl = down.filter((e) => e.to.startsWith("claim:")), pr = down.filter((e) => e.to.startsWith("proposal:"));
      ans.push(A_("What does it support?", `${cl.length} claim(s)${cl.length ? ": " + cl.map((e) => e.to.slice(6)).join(", ") : ""}; ${pr.length} proposal(s)`, "recorded", [...cl, ...pr].map((e) => e.to)));
      ans.push(A_("When was it observed?", `the run does not timestamp evidence files; the lens run that wrote it is in the event log`, "unavailable"));
      break;
    }
    case "lens": {
      const l = p.lenses.find((x) => x.name === r.id)!;
      ans.push(A_("What is it?", l.description, "recorded"), A_("What is its state?", `${l.status}${l.reason ? `: ${l.reason}` : ""}; ran ${l.runs} time(s)`, "recorded"));
      const ev = p.log.filter((e: any) => (e.type === "lens_start" || e.type === "lens_done") && e.lens === r.id);
      ans.push(ev.length ? A_("When did it run?", ev.map((e: any) => `${e.type === "lens_start" ? "started" : "finished"} ${e.ts}`).join("; "), "recorded") : A_("When did it run?", "no run recorded in the log", "unavailable"));
      ans.push(A_("What does it need?", (l.needs ?? []).join(", ") || "nothing", "recorded", (l.needs ?? []).map((n: string) => `lens:${n}`)));
      break;
    }
    case "gate": {
      ans.push(A_("What is its state?", p.run.verdict ? `verdict ${p.run.verdict}` : p.blockers.length ? `blocked by ${p.blockers.length}` : "open", "recorded"));
      const done = p.log.filter((e: any) => e.type === "done").pop();
      ans.push(done ? A_("When was the verdict given?", `${done.verdict} at ${done.ts}`, "recorded") : A_("When was the verdict given?", "no verdict has been given yet", "recorded"));
      for (const b of p.blockers) ans.push(A_(`Blocker ${b.code}`, `${b.text} Fix: ${b.fix}`, "recorded", up().filter((e) => new RegExp(`\\(${b.code}\\)`).test(e.rel)).map((e) => e.from)));
      if (!p.blockers.length) ans.push(A_("What blocks it?", "no blocker is currently recorded", "recorded"));
      break;
    }
    case "field": {
      const ds = p.decisions.filter((d: any) => touches(d, ref));
      ans.push(A_("What is it?", `the model field ${r.id}`, "recorded"), A_("What changed it?", ds.length ? ds.map((d: any) => `${d.n} (${when(d.version)})`).join("; ") : "no decision names it", "recorded", ds.map((d: any) => `decision:${d.n}`)));
      ans.push(A_("What reads it?", down.filter((e) => e.to.startsWith("artifact:")).map((e) => e.to.slice(9)).join(", ") || "no artifact", "recorded", down.filter((e) => e.to.startsWith("artifact:")).map((e) => e.to)));
      break;
    }
    case "job": case "criterion": case "opportunity": {
      const row: any = (r.kind === "job" ? p.jobs : r.kind === "criterion" ? p.criteria : p.opportunities).find((x: any) => x.id === r.id)!;
      const statement = r.kind === "job" ? row.job : r.kind === "criterion" ? row.statement : row.deficiency;
      ans.push(A_("What is it?", statement, "recorded"), A_("What is its state?", `${row.grade}, source: ${row.source || "(none)"}`, "recorded"));
      if (r.kind === "criterion") {
        ans.push(A_("What does it judge?", `job ${row.job}: how well that progress was made. It is an expectation, not a settlement outcome`, "recorded", [`job:${row.job}`]));
        ans.push(row.evidence === "measured"
          ? A_("Is it measured?", `importance ${row.importance}; satisfaction ${row.satisfaction}`, "recorded")
          : A_("Is it measured?", `importance ${row.importance}; satisfaction ${row.satisfaction}. ${row.evidence === "partial" ? "One side is measured" : "Neither is measured"}, so no opportunity score exists and none is computed`, "unavailable"));
      }
      if (r.kind === "opportunity") {
        ans.push(A_("Which progress shortfall does it recover?", `${row.basisKind} ${row.basis}${row.basisKind === "criterion" ? ` (${p.criteria.find((c: any) => c.id === row.basis)?.statement ?? ""})` : ""}`, "recorded", [`${row.basisKind}:${row.basis}`]));
        ans.push(A_("What does the actor use today?", row.alternatives || "not recorded", row.alternatives ? "recorded" : "unavailable"));
        ans.push(A_("Is the evidence enough to size it?", row.evidence === "measured" ? "importance and satisfaction are both measured on its criterion" : `no: ${row.evidence === "partial" ? "only one of importance and satisfaction" : "neither importance nor satisfaction"} is measured, so its size is unknown`, row.evidence === "measured" ? "derived" : "unavailable"));
        const cand = String(row.candidates || "").split(", ").filter(Boolean);
        ans.push(cand.length ? A_("What addresses it?", `candidate(s) ${cand.join(", ")}${row.addressed ? " (one is accepted)" : "; none accepted"}. A candidate is one possible transformation, not the opportunity`, "recorded", cand.map((c) => `proposal:${c}`)) : A_("What addresses it?", "no proposal names it yet", "recorded"));
      }
      let firstV: number | null = null; for (const v of w.versions) if (w.load(v)?.ents.has(ref)) { firstV = v; break; }
      ans.push(firstV ? A_("When was it first recorded?", `in ${when(firstV)}`, "recorded", [`version:${firstV}`]) : A_("When was it first recorded?", "no settled snapshot contains it", "unavailable"));
      if (firstV) { const decs = (w.load(firstV)?.model.decisions ?? []).filter((d: any) => d.version === firstV).map((d: any) => ({ d, p: touches(d, ref) })).filter((x: any) => x.p); if (decs.length) ans.push(A_("Which decision recorded it?", decs.map((x: any) => `${x.d.n}${x.p === "field" ? " (named the whole field)" : ""}: ${short(x.d.decision, 100)}`).join("; "), decs.every((x: any) => x.p === "id") ? "recorded" : "derived", decs.map((x: any) => `decision:${x.d.n}`))); }
      const sup = up(/evidence for|pursues|judged by|exposes/);
      ans.push(A_("What supports it?", sup.length ? sup.map((e) => `${e.from} (${e.rel})`).join(", ") : "no recorded evidence file or claim is named in its source", sup.length ? "recorded" : "unavailable", sup.map((e) => e.from)));
      ans.push(A_("What depends on it?", down.length ? down.map((e) => `${e.to} (${e.rel})`).join(", ") : "nothing is recorded as depending on it", "recorded", down.map((e) => e.to)));
      break;
    }
    case "actor": {
      const a: any = (p.actors ?? []).find((x: any) => x.id === r.id);
      ans.push(A_("Who is it?", a ? `${a.actor}: ${a.job}` : r.id, "recorded"), A_("What progress do they pursue?", down.filter((e) => e.rel === "pursues").map((e) => e.to).join(", ") || "no Job row names this actor", "recorded", down.filter((e) => e.rel === "pursues").map((e) => e.to)));
      ans.push(A_("Is a mindset or type recorded?", "no: situational salience belongs to a Case (a DecisionState), never to the actor", "derived"));
      break;
    }
    case "version": {
      const s = w.load(Number(r.id));
      if (!s) return { ok: false as const, message: `no readable snapshot for model@${r.id}; recorded: ${w.versions.join(", ") || "none"}` };
      ans.push(A_("What is it?", `the settled Product Model at version ${r.id}${s.current ? " (current)" : ""}`, "recorded"), A_("When did it settle?", ts(s.version) ?? `time ${NOT_RECORDED}`, ts(s.version) ? "recorded" : "unavailable"));
      ans.push(A_("What is its identity?", `sha256 ${s.identity.digest.value.slice(0, 16)}… over ${s.identity.digest.covers.join(", ")}; not a world root (omits ${s.identity.digest.omits.join(", ")})`, "derived"));
      const prev = w.versions.filter((v) => v < s.version).pop();
      const d = prev ? diff(W, prev, s.version) : null;
      ans.push(d?.ok ? A_("What changed from the previous version?", `${d.rows.length} difference(s) from model@${prev}${d.same ? "; no semantic change" : ""}`, "recorded") : A_("What changed from the previous version?", prev ? "previous snapshot unreadable" : "this is the first recorded version", "unavailable"));
      break;
    }
  }
  // local git, when the run is in a repository: which commits recorded this file (read-only; absent git adds nothing)
  if ((r.kind === "artifact" || r.kind === "evidence") && inRepo(W.runDir)) {
    const cs = logOf(W.runDir, `${r.kind === "artifact" ? "artifacts" : "evidence"}/${r.id}`, { limit: 3 });
    if (cs) ans.push(cs.length ? A_("Which commits recorded it?", cs.map((c) => `${c.short} ${c.ts.slice(0, 10)} ${c.author}: ${short(c.subject, 60)}`).join("; "), "recorded") : A_("Which commits recorded it?", "none: the file is not committed yet", "recorded"));
  }
  if (responses.length) ans.push(A_("Has the owner weighed in?", responses.map((x: any) => `${x.id}: ${x.kind}/${x.outcome ?? ""} via ${x.via === "cockpit" ? "the owner" : "relay (REPORTED)"} (${x.handled ? `handled by ${x.handled.as}` : "waiting on the router"})`).join("; "), "recorded"));
  const downN = walk(g.edges, ref, "down").dist.size;
  return { ok: true as const, ref, kind: r.kind, title: me ? short(me.label, 110) : ref, state: me?.status ?? "", answers: ans, downstream: downN, unavailable: ans.filter((x) => x.basis === "unavailable").length };
}

// ---- counterfactual: a candidate, previewed, never applied -----------------------------------------------------------
export type Effect = { class: EffectClass; subject: string; effect: string; basis: string; needs?: Capability[]; via?: string; refs?: string[] };
export function candidates(W: WorldEnv) {
  const cur = worldId(W.proj.run.modelVersion);
  return W.proj.proposals.map((x: any) => ({
    id: x.id, _ref: `proposal:${x.id}`, parent: cur, intention: `${x.kind} ${x.field}`, producer: x.lens, field: x.field, status: x.status,
    delta: short(x.proposal, 140), evidence: short(x.evidence, 100), requires: x.status === "open" ? "router reconciliation" : x.status.startsWith("accepted") ? `settled as ${x.status.slice(9)}` : "rejected", authoritative: false,
  }));
}

export function counterfactual(W: WorldEnv, ref: string, renv: ReachEnv = W.reach ?? hostEnv(process.env, undefined, path.dirname(W.runDir))) {
  const r = parseRef(ref);
  if (!r || r.kind !== "proposal") return { ok: false as const, message: "a candidate is a proposal ref, like proposal:P3" };
  const p = W.proj; const x: any = p.proposals.find((y: any) => y.id === r.id);
  if (!x) return { ok: false as const, message: `${ref} does not exist in this run` };
  const g = graphOf(W);
  const cand = { id: ref, parent: worldId(p.run.modelVersion), intention: `${x.kind} ${x.field}`, producer: x.lens, delta: { field: x.field, kind: x.kind, text: x.proposal }, status: x.status, evidence: x.evidence, settlement: ["router reconciliation: only the router edits the model", "an accepted proposal gets a logged decision and a new model version"], authoritative: false as const };
  const fx: Effect[] = [];
  const add = (e: Effect) => fx.push(e);
  add({ class: "known", subject: ref, effect: `${x.kind === "change" ? "changes" : "adds to"} field ${x.field}: ${short(x.proposal, 160)}`, basis: "declared by the proposal", refs: [`field:${x.field}`] });
  if (x.status !== "open") {
    add({ class: "known", subject: ref, effect: `already settled: ${x.status}${x.reason ? ` (${x.reason})` : ""}. Nothing is pending; use why for the record`, basis: "proposals.md", refs: x.status.startsWith("accepted:") ? [`decision:${x.status.slice(9)}`] : [] });
    return { ok: true as const, candidate: cand, settled: true, effects: fx, counts: count(fx), authority: "possibility" };
  }
  const named = [...new Set(String(x.proposal).match(/\bC\d+\b/g) ?? [])].filter((c) => g.nodes.has(`claim:${c}`));
  const readers = [...new Set([...g.edges.filter((e) => e.from === `field:${x.field}` && e.rel === "read by").map((e) => e.to), ...named.flatMap((c) => g.edges.filter((e) => e.from === `claim:${c}` && /cited/.test(e.rel)).map((e) => e.to))])];
  // A change to what an artifact reads or cites stales it under the process rule, unless the router narrows the decision's `touched`.
  // A discovery only adds, so whether readers go stale depends on what the router says it touched: expected, not derived.
  const rule = x.kind === "change" ? "derived" : "expected";
  for (const a of readers) {
    const art = p.artifacts.find((y) => `artifact:${y.id}` === a);
    add({ class: rule, subject: a, effect: `${x.kind === "change" ? "would become stale" : "may become stale"} if the accepting decision touches ${x.field}${named.length ? ` or ${named.join(", ")}` : ""}${art?.public ? " (public)" : ""}`, basis: x.kind === "change" ? "staleness rule: a decision that touches what an artifact reads or cites makes it stale; the router may narrow `touched`" : "a discovery adds content; whether readers go stale depends on the `touched` the router records", refs: [a] });
  }
  add({ class: "derived", subject: "gate", effect: `accepting any change raises the model version, so the gate built at model@${p.run.modelVersion} would block as gate-stale until release-readiness re-runs`, basis: "computeGate: gate-stale when the gate was built at an older version", refs: ["gate"] });
  const lensesToRerun = [...new Set(readers.map((a) => p.artifacts.find((y) => `artifact:${y.id}` === a)?.lens).filter(Boolean))] as string[];
  for (const l of lensesToRerun) add({ class: "expected", subject: `lens:${l}`, effect: `would need to re-run to rebuild its stale artifact(s)`, basis: "process: stale artifacts are rebuilt by their lens", refs: [`lens:${l}`] });
  // A candidate that names an opportunity is one possible transformation of it. Accepting it does not size, satisfy, or close the opportunity.
  for (const o of p.opportunities ?? []) if (new RegExp(`\\b${o.id}\\b`).test(`${x.proposal} ${x.evidence}`)) {
    add({ class: "known", subject: `opportunity:${o.id}`, effect: `declared as a candidate for ${o.id}: ${short(o.deficiency, 100)}`, basis: "the proposal names it", refs: [`opportunity:${o.id}`] });
    add({ class: "expected", subject: `opportunity:${o.id}`, effect: `would add a field-${x.field} row; whether the shortfall is actually reduced is observed afterwards, not settled by accepting this`, basis: "an accepted candidate is a change to the model, not evidence that the progress improved", refs: [`opportunity:${o.id}`] });
    if (o.evidence !== "measured") add({ class: "observation-required", subject: `opportunity:${o.id}`, effect: `${o.id} is not yet measured (${o.evidence}); any claim that this candidate helps needs the importance and satisfaction measured first`, basis: "Success criteria: UNKNOWN stays UNKNOWN", needs: ["market.interview", "market.survey", "behavior.analytics"], via: ["market.interview", "market.survey", "behavior.analytics"].map((c) => { const rr = reachFor(c as Capability, renv); return `${c}: ${rr.best ?? "no provider"} (${rr.providers.find((q) => q.id === rr.best)?.status ?? "none"})`; }).join("; "), refs: [`opportunity:${o.id}`] });
  }
  const rivals = p.proposals.filter((y: any) => y.id !== r.id && y.status === "open" && y.field === x.field);
  if (rivals.length) add({ class: "derived", subject: ref, effect: `other open candidates touch the same field: ${rivals.map((y: any) => y.id).join(", ")}; the reconciliation must order or reject them`, basis: "proposals.md", refs: rivals.map((y: any) => `proposal:${y.id}`) });
  if (x.kind === "change") for (const c of named) add({ class: "unknown", subject: `claim:${c}`, effect: `the resulting grade and text of ${c} are not declared by the proposal`, basis: "only the reconciliation decides them", refs: [`claim:${c}`] });
  else add({ class: "unknown", subject: ref, effect: "the ids and grades of any content a discovery adds are assigned at reconciliation", basis: "not determined before the router runs" });
  // observations required: what would have to be seen before this could settle
  const need = (text: string) => { const cs = suggestNeeds(text); return cs.length ? cs : undefined; };
  const viaOf = (cs?: Capability[]) => cs?.map((c) => { const rr = reachFor(c, renv); return `${c}: ${rr.best ?? "no provider"} (${rr.providers.find((q) => q.id === rr.best)?.status ?? "none"})`; }).join("; ");
  for (const c of [...new Set(`${x.proposal} ${x.evidence}`.match(/\bC\d+\b/g) ?? [])]) {
    const cl = p.claims.find((y) => y.id === c); if (!cl || ["OBSERVED", "VERIFIED"].includes(cl.grade)) continue;
    const cs = need(cl.source); add({ class: "observation-required", subject: `claim:${c}`, effect: `rests on ${c} at ${cl.grade}; public copy needs OBSERVED or VERIFIED evidence`, basis: "SCHEMA: public-facing artifacts may cite only OBSERVED or VERIFIED claims", needs: cs, via: viaOf(cs), refs: [`claim:${c}`] });
  }
  for (const u of [...new Set(`${x.proposal} ${x.evidence}`.match(/\bU\d+\b/g) ?? [])]) {
    const un = p.unknowns.find((y) => y.id === u); if (!un) continue;
    const cs: Capability[] = /owner|you|human/i.test(un.who) ? ["owner.attest"] : need(`${un.question} ${un.who}`) ?? [];
    add({ class: "observation-required", subject: `unknown:${u}`, effect: `${u} is still open: ${short(un.question, 90)} (who can resolve: ${un.who || "not recorded"})`, basis: "Unknowns table", needs: cs.length ? cs : undefined, via: viaOf(cs), refs: [`unknown:${u}`] });
  }
  for (const e of String(x.evidence).match(/(?:evidence\/)?[\w.-]+\/[\w./@ -]+\.(?:md|csv|txt|json)/g) ?? []) {
    const rel = e.replace(/^evidence\//, ""); if (rel.startsWith("artifacts/") || rel.startsWith("tests/")) continue;
    if (!p.evidence.some((y) => y.id === rel)) add({ class: "observation-required", subject: ref, effect: `cited evidence ${e} does not exist in this run`, basis: "the proposal's evidence column", needs: need(e), via: viaOf(need(e)) });
  }
  return { ok: true as const, candidate: cand, settled: false, effects: fx, counts: count(fx), authority: "possibility" };
}
const count = (fx: Effect[]) => Object.fromEntries(["known", "derived", "expected", "unknown", "observation-required"].map((k) => [k, fx.filter((e) => e.class === k).length]));

// ---- reach (world level): missing evidence -> required observation -> capability -> providers ------------------------
export function worldReach(W: WorldEnv, o: { need?: string; ref?: string }, renv: ReachEnv = W.reach ?? hostEnv(process.env, undefined, path.dirname(W.runDir))) {
  if (o.need) {
    if (!isCapability(o.need)) return { ok: false as const, message: `unknown capability ${o.need}` };
    return { ok: true as const, ...reachFor(o.need, renv), rows: reachFor(o.need, renv).providers };
  }
  const r = o.ref ? parseRef(o.ref) : null;
  if (!r) return { ok: false as const, message: "give need (a capability) or ref (a claim, unknown, or proposal with a missing-evidence gap)" };
  const p = W.proj; let gap = "", text = "", who = "";
  if (r.kind === "claim") { const c = p.claims.find((y) => y.id === r.id); if (!c) return { ok: false as const, message: `${o.ref} does not exist in this run` }; gap = ["OBSERVED", "VERIFIED"].includes(c.grade) ? "" : `graded ${c.grade}; OBSERVED or VERIFIED evidence would raise it`; text = c.source; }
  else if (r.kind === "unknown") { const u = p.unknowns.find((y) => y.id === r.id); if (!u) return { ok: false as const, message: `${o.ref} does not exist in this run` }; gap = `open: ${short(u.question, 100)}`; text = `${u.question} ${u.who}`; who = u.who; }
  else if (r.kind === "criterion" || r.kind === "opportunity") {
    // an unmeasured criterion is a missing observation like any other: the routes that can measure it are capabilities, and who provides them is data
    const c: any = r.kind === "criterion" ? (p.criteria ?? []).find((y: any) => y.id === r.id) : (p.criteria ?? []).find((y: any) => y.id === (p.opportunities ?? []).find((o: any) => o.id === r.id)?.basis);
    if (r.kind === "opportunity" && !(p.opportunities ?? []).some((o: any) => o.id === r.id)) return { ok: false as const, message: `${o.ref} does not exist in this run` };
    if (r.kind === "criterion" && !c) return { ok: false as const, message: `${o.ref} does not exist in this run` };
    gap = !c ? "this opportunity rests on a job, not a success criterion, so there is nothing to measure yet; state how the job is judged first" : c.evidence === "measured" ? "" : `importance ${c.importance} and satisfaction ${c.satisfaction} on ${c.id} (${c.statement}) are not both measured`;
    if (!gap) return { ok: true as const, ref: o.ref, gap: "none: importance and satisfaction are both measured", needs: [], rows: [] as any[] };
    const caps: Capability[] = c ? ["market.interview", "market.survey", "behavior.analytics", "support.history"] : [];
    const needs = caps.map((cap) => ({ capability: cap, basis: "derived: these are the observation routes that can measure an unmeasured importance or satisfaction", ...reachFor(cap, renv) }));
    const rows = needs.flatMap((n) => n.providers.map((q) => ({ capability: n.capability, provider: q.id, tier: q.tier, status: q.status, available: q.state.available, installed: q.state.installed, configured: q.state.configured, probed: q.state.probed, reachable: q.state.reachable, authorized: q.state.authorized, next: q.next, basis: n.basis })));
    return { ok: true as const, ref: o.ref, gap, needs, rows, note: needs.length ? undefined : "state how the job is judged (a success criterion) before asking what could measure it" };
  }
  else return { ok: false as const, message: "reach applies to a claim, an unknown, a success criterion, or an opportunity: those are where evidence is missing" };
  if (!gap) return { ok: true as const, ref: o.ref, gap: "none: already observed or verified", needs: [], rows: [] as any[] };
  const caps: Capability[] = /owner|you|human/i.test(who) ? ["owner.attest"] : suggestNeeds(text);
  const needs = caps.map((c) => ({ capability: c, basis: c === "owner.attest" ? "recorded: the unknown names the owner as who can resolve it" : "heuristic: the recorded source/question mentions this kind of observation", ...reachFor(c, renv) }));
  const rows = needs.flatMap((n) => n.providers.map((q) => ({ capability: n.capability, provider: q.id, tier: q.tier, status: q.status, available: q.state.available, installed: q.state.installed, configured: q.state.configured, probed: q.state.probed, reachable: q.state.reachable, authorized: q.state.authorized, next: q.next, basis: n.basis })));
  return { ok: true as const, ref: o.ref, gap, needs, rows, note: needs.length ? undefined : "nothing in the recorded source says what kind of observation is needed; name it with need" };
}

// ---- replay: an observation criterion, run again over recorded evidence (Tracetest's selector + assertion) ----------
export type Pred = { field: string; op: string; value: any };
export type ObserverDef = { selects: string; where?: Pred[]; expect: Pred[]; discriminates?: string[] };
export const observerId = (d: ObserverDef) => "obs-" + crypto.createHash("sha256").update(JSON.stringify({ s: d.selects, w: d.where ?? [], e: d.expect })).digest("hex").slice(0, 10);
// Predicates travel inside source strings as field~op~value,… so values are escaped: a comma or tilde in a value must not become a second criterion.
const esc = (v: string) => v.replace(/[%,~&#+|]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
const unesc = (v: string) => { try { return decodeURIComponent(v); } catch { return v; } };   // a stray "%" (as in "49 %") is just text
export function parsePreds(s: string | null | undefined): Pred[] {
  return String(s ?? "").split(",").filter(Boolean).map((t) => { const [field, op, ...v] = t.split("~"); return { field, op: op || "eq", value: unesc(v.join("~")) }; });
}
export const fmtPreds = (ps: Pred[] = []) => ps.map((p) => `${p.field}~${p.op}~${Array.isArray(p.value) ? p.value.map((x) => esc(String(x))).join("%7C") : esc(String(p.value))}`).join(",");
export const normPreds = (ps: Pred[]) => ps.map((p) => ({ ...p, value: p.op === "in" && typeof p.value === "string" ? p.value.split("|") : p.value }));
// `rows` and `test` come from the source layer, so a selector can only ever read files the run already exposes.
export function replay(def: ObserverDef, rows: (source: string, where?: Pred[]) => { error?: string; rows?: Row[] }, test: (row: Row, p: Pred) => boolean) {
  const id = observerId(def);
  const sel = rows(def.selects, def.where);
  if (sel.error) return { ok: true as const, observer: id, result: "source-error", message: sel.error, rows: [] as Row[], selected: 0, settles: false as const };
  const picked = sel.rows ?? [];
  if (!picked.length) return { ok: true as const, observer: id, result: "not-selected", message: "the selector matched no rows, so nothing was observed. An empty selection is not a pass.", rows: [] as Row[], selected: 0, settles: false as const };
  const out = picked.map((row, i) => { const bad = def.expect.filter((p) => !test(row, p)); return { row: i + 1, verdict: bad.length ? "fail" : "pass", observed: def.expect.map((p) => `${p.field}=${row[p.field]}`).join(" "), expected: def.expect.map((p) => `${p.field} ${p.op} ${Array.isArray(p.value) ? p.value.join("|") : p.value}`).join(" and "), failed: bad.map((p) => p.field).join(", ") }; });
  const fails = out.filter((r) => r.verdict === "fail").length;
  return { ok: true as const, observer: id, result: fails ? "fail" : "pass", message: `${picked.length} row(s) selected; ${fails} failed the expectation`, rows: out, selected: picked.length, settles: false as const, discriminates: def.discriminates ?? [] };
}
