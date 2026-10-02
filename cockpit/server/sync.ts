// Projection sync: run directory -> SQLite rows, plus the process event stream.
// Events come from two places and are never a source of truth: the engine's own append-only log (lens_start, reconcile_done, ...)
// and diffs between two consecutive projections (a proposal appeared, an artifact went stale). `rebuild()` regenerates the rows;
// log-sourced events are replayed from the log, diff-sourced events only exist from the moment they were observed.
import type { Database } from "bun:sqlite";
import { project, railOf, type Proj } from "./project";
import { getMeta, setMeta, pushEvent } from "./db";

const KINDS = ["claim", "unknown", "decision", "proposal", "artifact", "version", "lens", "wave", "blocker", "response", "evidence"] as const;
const SRC: Record<string, keyof Proj> = { claim: "claims", unknown: "unknowns", decision: "decisions", proposal: "proposals", artifact: "artifacts", version: "versions", lens: "lenses", wave: "waves", blocker: "blockers", response: "responses", evidence: "evidence" };

const textOf = (kind: string, r: any): string => {
  switch (kind) {
    case "claim": return `${r.id} ${r.text} ${r.grade} ${r.source}`;
    case "unknown": return `${r.id} ${r.question} ${r.blocks} ${r.who}`;
    case "decision": return `${r.n} ${r.decision} ${r.rationale} ${r.touched}`;
    case "proposal": return `${r.id} ${r.lens} ${r.field} ${r.proposal} ${r.evidence} ${r.reason}`;
    case "artifact": return `${r.rel} ${r.lens}`;
    case "lens": return `${r.name} ${r.description}`;
    case "evidence": return r.rel;
    default: return "";
  }
};

export function writeRows(db: Database, p: Proj) {
  const tx = db.transaction(() => {
    db.run("DELETE FROM entities"); db.run("DELETE FROM search");
    const ins = db.prepare("INSERT INTO entities (kind, id, ord, data) VALUES (?, ?, ?, ?)");
    const fts = db.prepare("INSERT INTO search (kind, id, text) VALUES (?, ?, ?)");
    for (const k of KINDS) {
      (p[SRC[k]] as any[]).forEach((r, i) => {
        const id = String(r.id ?? r.n);
        ins.run(k, id, i, JSON.stringify(r));
        const t = textOf(k, r);
        if (t) fts.run(k, id, t);
      });
    }
    setMeta(db, "run", JSON.stringify(p.run));
    setMeta(db, "selection", JSON.stringify(p.selection));
  });
  tx();
}

type Ev = { type: string; subject?: string; data?: any; ts?: string };

// log entries -> events (names follow the lifecycle: noun.verb)
function fromLog(e: any): Ev | null {
  switch (e.type) {
    case "begin": return { type: "run.started", data: { goal: e.goal, bar: e.bar }, ts: e.ts };
    case "select": return { type: "lenses.selected", data: { chosen: e.chosen, excluded: e.excluded }, ts: e.ts };
    case "lens_start": return { type: "lens.started", subject: `lens:${e.lens}`, data: { version: e.version }, ts: e.ts };
    case "lens_done": return { type: "lens.finished", subject: `lens:${e.lens}`, data: { proposals: e.proposals, files: e.files }, ts: e.ts };
    case "reconcile_start": return { type: "reconcile.started", data: { base: e.baseVersion }, ts: e.ts };
    case "reconcile_done": return { type: e.changed ? "model.updated" : "reconcile.finished", subject: `version:${e.version}`, data: { version: e.version, changed: e.changed }, ts: e.ts };
    case "pause": return { type: "human.requested", data: { reason: e.reason }, ts: e.ts };
    case "preflight_required": return { type: "preflight.required", data: { command: e.command, reason: e.reason }, ts: e.ts };
    case "done": return { type: "run.finished", data: { verdict: e.verdict }, ts: e.ts };
    default: return null;
  }
}

function diffEvents(a: Proj | null, b: Proj): Ev[] {
  const out: Ev[] = [];
  if (!a) return out;
  const ids = (xs: any[], f = (x: any) => x.id) => new Map(xs.map((x) => [String(f(x)), x]));
  const pa = ids(a.proposals), pb = ids(b.proposals);
  for (const [id, r] of pb) {
    if (!pa.has(id)) out.push({ type: "proposal.added", subject: `proposal:${id}`, data: { lens: r.lens, field: r.field, kind: r.kind } });
    else if (pa.get(id).status === "open" && r.status !== "open") out.push({ type: "proposal.resolved", subject: `proposal:${id}`, data: { status: r.status } });
  }
  const ua = ids(a.unknowns), ub = ids(b.unknowns);
  for (const id of ub.keys()) if (!ua.has(id)) out.push({ type: "unknown.opened", subject: `unknown:${id}` });
  for (const id of ua.keys()) if (!ub.has(id)) out.push({ type: "unknown.closed", subject: `unknown:${id}` });
  const ca = ids(a.claims), cb = ids(b.claims);
  for (const [id, c] of cb) {
    if (c.grade === "CONTRADICTED" && ca.get(id)?.grade !== "CONTRADICTED") out.push({ type: "contradiction.found", subject: `claim:${id}`, data: { text: c.text } });
    else if (ca.has(id) && ca.get(id).grade !== c.grade) out.push({ type: "claim.regraded", subject: `claim:${id}`, data: { from: ca.get(id).grade, to: c.grade } });
  }
  const aa = ids(a.artifacts), ab = ids(b.artifacts);
  for (const [id, r] of ab) {
    const o = aa.get(id);
    if (!o) out.push({ type: "artifact.created", subject: `artifact:${id}`, data: { lens: r.lens, built: r.built } });
    else if (o.status !== "stale" && r.status === "stale") out.push({ type: "artifact.stale", subject: `artifact:${id}`, data: { by: r.stale } });
    else if (o.status === "stale" && r.status !== "stale") out.push({ type: "artifact.rebuilt", subject: `artifact:${id}`, data: { built: r.built } });
  }
  const wa = ids(a.waves), wb = ids(b.waves);
  for (const [id, w] of wb) if (wa.get(id)?.status !== w.status && w.status === "running") out.push({ type: "wave.started", subject: `wave:${id}`, data: { lenses: w.lenses } });
  const ra = ids(a.responses), rb = ids(b.responses);
  for (const [id, r] of rb) { if (!ra.has(id)) out.push({ type: "human.responded", subject: `response:${id}`, data: { kind: r.kind, ref: r.ref } }); else if (!ra.get(id).handled && r.handled) out.push({ type: "human.handled", subject: `response:${id}`, data: r.handled }); }
  if (JSON.stringify(a.blockers.map((x) => x.code + x.text)) !== JSON.stringify(b.blockers.map((x) => x.code + x.text)) || a.run.verdict !== b.run.verdict || a.run.ready !== b.run.ready)
    out.push({ type: "gate.updated", subject: "gate", data: { blockers: b.blockers.length, ready: b.run.ready, verdict: b.run.verdict } });
  if (!a.run.paused && b.run.paused) out.push({ type: "human.requested", data: { reason: b.run.paused } });
  return out;
}

export class Syncer {
  prev: Proj | null = null;
  logOffset = 0;
  constructor(public db: Database, public cwd: string) { this.logOffset = Number(getMeta(db, "log_offset") ?? 0); }

  // Returns the new events (already persisted) so the server can fan them out; and the fresh projection + rail.
  refresh(): { proj: Proj; rail: ReturnType<typeof railOf>; events: { seq: number; ts: string; channel: string; type: string; subject: string | null; data: any }[]; run: any } {
    const { run, proj } = project(this.cwd);
    const evs: Ev[] = [];
    if (proj.log.length < this.logOffset) this.logOffset = 0;                    // a new run replaced the log
    for (const e of proj.log.slice(this.logOffset)) { const ev = fromLog(e); if (ev) evs.push(ev); }
    this.logOffset = proj.log.length;
    setMeta(this.db, "log_offset", String(this.logOffset));
    evs.push(...diffEvents(this.prev, proj));
    writeRows(this.db, proj);
    this.prev = proj;
    const out = evs.map((e) => {
      const ts = e.ts ?? new Date().toISOString();
      const seq = pushEvent(this.db, { channel: "process", type: e.type, subject: e.subject ?? null, data: e.data, ts });
      return { seq, ts, channel: "process", type: e.type, subject: e.subject ?? null, data: e.data ?? {} };
    });
    return { proj, rail: railOf(proj), events: out, run };
  }

  // Delete-and-regenerate: proves the DB holds nothing the run directory cannot recreate.
  rebuild() {
    this.db.run("DELETE FROM events WHERE channel = 'process'");
    this.db.run("DELETE FROM meta WHERE k = 'log_offset'");
    this.logOffset = 0; this.prev = null;
    return this.refresh();
  }
}
