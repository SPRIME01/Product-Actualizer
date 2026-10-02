// Cockpit core: the run directory, the SQLite projection, the workspace reducer, the inbox. No HTTP here, so every rule is testable headless.
import fs from "node:fs";
import path from "node:path";
import { openDb, getUi, setUi, pushEvent, entities, entity } from "./db";
import { Syncer } from "./sync";
import { railOf } from "./project";
import { resolve, detail, search, safeRunFile, observe, observerOf, type Env } from "./sources";
import * as K from "./world";
import * as WS_ from "./worldSurfaces";
import { emptyWS, applyAgent, applyHuman, contextOf, viewingOf, isAuthorityOp, panelsIn, type WS, type Ctx, type Panel } from "./workspace";
import { parseRef } from "../protocol/refs";
import { TEMPLATES, hints } from "./templates";
import { fail, issuesOf, type ActionResult } from "../protocol/actions";
import { TOOLS, activeTools } from "../protocol/tools";
import { parseWorldId } from "../protocol/world";
import { vocabulary } from "../protocol/catalog";
import { SurfaceSchema } from "../protocol/spec";
import { appendInbox, readInbox, ackInbox } from "../../hooks/src/lib/inbox.mjs";
import { findRun, makeRun, DIR_NAME } from "../../hooks/src/lib/store.mjs";

export type Role = "agent" | "human";
export type Listener = (msg: any) => void;

export class Cockpit {
  db; syncer; run: any; ws: WS; env: Env; listeners = new Set<Listener>(); clients = 0; last: ReturnType<Syncer["refresh"]>;
  private persisted = new Map<string, string>();
  constructor(public cwd: string, opts: { dbFile?: string } = {}) {
    this.run = findRun(cwd) ?? makeRun(path.join(cwd, DIR_NAME));
    const dir = path.join(this.run.dir, ".cockpit");
    this.db = openDb(opts.dbFile ?? path.join(dir, "cockpit.db"));
    this.syncer = new Syncer(this.db, cwd);
    this.ws = getUi<WS>(this.db, "ws") ?? emptyWS();
    this.env = { db: this.db, runDir: this.run.dir };
    this.last = this.syncer.refresh();
    this.run = this.last.run ?? this.run;
    this.env.runDir = this.run.dir; this.env.proj = this.last.proj;
    this.reconcileWs();
    this.writeContext();
  }

  on(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }
  emit(msg: any) { for (const l of this.listeners) l(msg); }

  ctx(): Ctx {
    return {
      now: () => new Date().toISOString(),
      refExists: (ref) => this.refExists(ref),
      sourceError: (source, type) => {
        const r = resolve(this.env, source, { limit: 1, as: type === "tree" ? "tree" : type === "media" ? "doc" : type === "document" ? "doc" : type === "table" || type === "chart" || type === "timeline" ? "rows" : undefined });
        return r.kind === "error" ? r.message : null;
      },
    };
  }

  refExists(ref: string): boolean {
    const r = parseRef(ref); if (!r) return false;
    switch (r.kind) {
      case "gate": return true;
      case "field": return true;
      case "artifact": return !!entity(this.db, "artifact", r.id);
      case "evidence": return !!entity(this.db, "evidence", r.id);
      case "lens": return !!entity(this.db, "lens", r.id);
      case "version": return !!entity(this.db, "version", r.id);
      default: return !!entity(this.db, r.kind, r.id);
    }
  }

  // After a restart or a different run, drop surfaces whose asks/refs no longer make sense is NOT done: surfaces are preferences. Only re-sync ask state.
  private reconcileWs() { for (const p of Object.values(this.ws.panels)) if (!p.spec) delete this.ws.panels[p.id]; }

  // ---- projection ------------------------------------------------------------------------------------------------
  refresh() {
    const before = this.last.proj;
    this.last = this.syncer.refresh();
    this.run = this.last.run ?? this.run;
    this.env.runDir = this.run.dir; this.env.proj = this.last.proj;
    const rail = this.rail();
    const kinds = new Set<string>();
    for (const e of this.last.events) kinds.add(e.type.split(".")[0]);
    if (JSON.stringify(before.run) !== JSON.stringify(this.last.proj.run) || this.last.events.length) {
      this.emit({ t: "rail", rail }); this.emit({ t: "hints", hints: hints(this.last.proj) });
      if (this.last.events.length) this.emit({ t: "events", events: this.last.events });
      this.emit({ t: "invalidate", kinds: [...kinds] });
    }
    this.writeContext();
    return this.last;
  }

  // The rail is the process projection plus the count of questions the cockpit itself has open. The agent cannot edit either part.
  rail() {
    const base = railOf(this.last.proj);
    const asking = Object.values(this.ws.asks).filter((a) => a.state === "open");
    return { ...base, asking: asking.length, humanInput: base.humanInput ?? (asking.length ? `${asking.length} question(s) waiting for you` : null), hasRun: !!this.last.proj.run.goal };
  }

  rebuild() { const r = this.syncer.rebuild(); this.last = r; this.env.proj = r.proj; this.writeContext(); this.emit({ t: "rail", rail: this.rail() }); this.emit({ t: "invalidate", kinds: ["all"] }); return r; }

  // ---- workspace ---------------------------------------------------------------------------------------------------
  private commit(next: WS, events: { type: string; subject?: string; data?: any }[], prev: WS) {
    this.ws = next;
    setUi(this.db, "ws", next);
    for (const e of events) pushEvent(this.db, { channel: "cockpit", type: e.type, subject: e.subject, data: e.data });
    this.emit({ t: "ws", ...this.wsDelta(prev, next) });
    this.emit({ t: "rail", rail: this.rail() });
    this.emitTools();
    this.writeContext();
  }

  // Which tools are worth offering right now (WebMCP re-registers on this; MCP clients see it on the next tools/list).
  private toolsKey = "";
  tools(): string[] { const v = viewingOf(this.ws); return activeTools({ mode: v.mode, subjects: v.subjects.map((x) => x.split(":")[0]) }); }
  private emitTools() { const t = this.tools(); const k = t.join(","); if (k !== this.toolsKey) { this.toolsKey = k; this.emit({ t: "tools", tools: t }); } }

  // Send only what changed: topology and small maps whole, panels by revision.
  wsDelta(prev: WS | null, next: WS) {
    const panels: Record<string, Panel> = {}; const removed: string[] = [];
    for (const [id, p] of Object.entries(next.panels)) { const key = JSON.stringify([p.rev, p.selection, p.controls, p.pinned, p.placedBy, p.minimized]); if (!prev || this.persisted.get(id) !== key || !prev.panels[id]) { panels[id] = p; this.persisted.set(id, key); } }
    for (const id of Object.keys(prev?.panels ?? {})) if (!next.panels[id]) { removed.push(id); this.persisted.delete(id); }
    return { rev: next.rev, tree: next.tree, focus: next.focus, maximized: next.maximized, asks: next.asks, notes: next.notes.slice(-30), panels, removed };
  }
  fullWs() { this.persisted.clear(); return this.wsDelta(null, this.ws); }

  // A table that feeds an entity view opens on its first row, so the surface shows the next thing to look at without a click.
  private preselect(ws: WS, id: string) {
    const p = ws.panels[id]; if (!p) return;
    for (const b of p.spec.blocks as any[]) {
      if (b.type !== "entity" || !b.follow || p.selection[b.follow]) continue;
      const t: any = p.spec.blocks.find((x) => x.id === b.follow); if (!t?.source) continue;
      const r: any = resolve(this.env, t.source, { limit: 1, as: "rows", filter: p.controls[t.id]?.filter ?? t.filter, sort: p.controls[t.id]?.sort ?? t.sort });
      const ref = r.kind === "rows" ? r.rows[0]?._ref : null;
      if (ref) p.selection[b.follow] = ref;
    }
  }

  agent(raw: unknown): ActionResult {
    const prev = this.ws;
    const o = applyAgent(prev, raw, this.ctx());
    if (o.result.ok && (raw as any)?.op === "surface.put") this.preselect(o.ws, (raw as any).surface.id);
    if (o.result.ok) this.commit(o.ws, o.events, prev);
    else pushEvent(this.db, { channel: "cockpit", type: "action.rejected", data: { code: (o.result as any).code, op: (raw as any)?.op } });
    return o.result;
  }

  // Human operations arrive only through the authenticated human channel (see serve.ts); this is the single entry for them.
  human(raw: unknown): ActionResult {
    if ((raw as any)?.op === "human.open") {
      const t = (raw as any).template as keyof typeof TEMPLATES | "ref";
      if (t === "ref") {
        const ref = (raw as any).ref as string | undefined;
        if (!ref || !this.refExists(ref)) return fail("BAD_REF", `${ref ?? "(no ref)"} does not exist in this run`);
        const act: any = templateShow({ ref, as: (raw as any).as ?? "detail" }, this); act.place = this.ws.tree ? { rel: "right", to: "active", size: 0.42, focus: true } : undefined;
        const existing = this.ws.panels[act.surface.id];
        return this.agent(existing ? { op: "view.focus", id: act.surface.id } : act);
      }
      if (!TEMPLATES[t]) return fail("SCHEMA", `no template ${t}`);
      const r = this.agent({ op: "surface.put", surface: TEMPLATES[t](this.last.proj, this.run.dir), place: { rel: "within", to: "active", focus: true } });
      if (r.ok && (raw as any).ref) this.agent({ op: "view.focus", id: TEMPLATES[t](this.last.proj, this.run.dir).id, ref: (raw as any).ref });
      return r;
    }
    const prev = this.ws;
    const o = applyHuman(prev, raw, this.ctx());
    if (!o.result.ok) return o.result;
    const op = (raw as any).op as string;
    for (const entry of o.inbox) appendInbox(this.run, { ...entry, via: "cockpit", actor: "owner" });
    this.db.query("INSERT INTO interactions (ts, actor, op, data) VALUES (?, 'human', ?, ?)").run(new Date().toISOString(), op, JSON.stringify(summarize(raw)));
    this.commit(o.ws, o.events, prev);
    if (isAuthorityOp(op)) this.refresh();   // the inbox changed: the rail and the gate see it now
    return o.result;
  }

  recent() {
    return (this.db.query("SELECT ts, op, data FROM interactions WHERE op NOT IN ('human.layout','human.select','human.control') ORDER BY seq DESC LIMIT 5").all() as any[]).reverse().map((r) => ({ ts: r.ts, op: r.op, summary: JSON.parse(r.data).summary }));
  }
  context() { return { ...contextOf(this.ws, this.recent()), tools: this.tools() }; }

  // A compact file for the hook engine: one status line per prompt, so the router knows what the owner is looking at.
  writeContext() {
    try {
      const c = this.context(); const dir = path.join(this.run.dir, ".cockpit");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "context.json"), JSON.stringify({ connected: this.clients > 0, pid: process.pid, ts: new Date().toISOString(), focus: c.focus, visible: c.visible.map((v) => v.id), asking: c.asking, layout: c.layout, world: c.world }));
    } catch { /* the context file is advisory */ }
  }

  // ---- reads ------------------------------------------------------------------------------------------------------
  data(source: string | undefined, o: any = {}) { return resolve(this.env, source, o); }
  detail(ref: string) { return detail(this.env, ref); }
  search(q: string) { return search(this.env, q); }
  file(rel: string) { const abs = safeRunFile(this.run.dir, rel); return abs && fs.statSync(abs).isFile() ? abs : null; }
  snapshot() { return { ws: this.fullWs(), tools: this.tools(), rail: this.rail(), hints: hints(this.last.proj), context: this.context(), events: (this.db.query("SELECT seq, ts, channel, type, subject, data FROM events ORDER BY seq DESC LIMIT 60").all() as any[]).reverse().map((e) => ({ ...e, data: JSON.parse(e.data) })) }; }

  // ---- tools: the same implementation behind CLI, loopback MCP, and WebMCP ------------------------------------------
  tool(name: string, input: unknown): { ok: true; result: any } | ActionResult {
    const def = TOOLS.find((t) => t.name === name);
    if (!def) return fail("UNKNOWN_OP", `no tool ${name}`, [{ path: "name", message: `tools: ${TOOLS.map((t) => t.name).join(", ")}` }]);
    const p = def.input.safeParse(input ?? {});
    if (!p.success) return fail("SCHEMA", `${name}: input does not match`, issuesOf(p.error));
    const a: any = p.data;
    const apply = (action: unknown) => this.agent(action);
    switch (name) {
      case "get_status": return { ok: true, result: this.rail() };
      case "get_workspace": return { ok: true, result: this.context() };
      case "get_vocabulary": return { ok: true, result: vocabulary(a.block) };
      case "list_items": {
        const f = a.filter ? "?" + a.filter : "";
        const r = resolve(this.env, `pa:${a.what}${f}`, { limit: a.limit });
        if (r.kind !== "rows") return fail("BAD_SOURCE", "cannot list that");
        return { ok: true, result: { total: r.total, items: r.rows.map((x) => compactRow(a.what, x)) } };
      }
      case "get_entity": { const d = this.detail(a.ref); return d.exists ? { ok: true, result: d } : fail("BAD_REF", `${a.ref} does not exist in this run`); }
      case "show_surface": return apply({ op: "surface.put", surface: a.surface, place: a.place });
      case "show_ref": return apply(templateShow(a, this));
      case "compare_refs": return apply(templateCompare(a, this));
      case "ask_human": { const { place, ...ask } = a; return apply({ op: "surface.put", surface: { id: `ask-${slug(ask.id)}`, title: "Needs your input", summary: ask.why ?? "The agent asked for a judgement it cannot make.", intent: "decide", layout: "stack", blocks: [{ type: "ask", ...ask }] }, place }); }
      case "arrange": return apply(a.action);
      case "annotate": return apply({ op: "note.add", target: a.target, text: a.text, tone: a.tone });
      case "world_why": case "world_impact": case "world_diff": case "world_timeline": case "world_counterfactual": case "world_reach": case "world_replay":
        return this.worldTool(name, a);
      case "read_responses": {
        const rows = readInbox(this.run).filter((r: any) => !a.unhandled || !r.handled);
        return { ok: true, result: { count: rows.length, responses: rows.map((r: any) => ({ id: r.id, kind: r.kind, outcome: r.outcome, ref: r.ref ?? r.target ?? r.ask, value: r.value, note: r.note, via: r.via, handled: r.handled?.as ?? null })) } };
      }
    }
    return fail("UNKNOWN_OP", name);
  }

  // ---- the world debugger: reads over the run files; `show` composes the answer as a surface through the ordinary agent path -------------
  worldEnv(): K.WorldEnv { return { proj: this.last.proj, runDir: this.run.dir, reach: this.reachEnv }; }
  reachEnv: import("./reach").ReachEnv | undefined;
  private worldTool(name: string, a: any): { ok: true; result: any } | ActionResult {
    const W = this.worldEnv(); const BAD = (m: string) => fail(/does not exist|not a ref|candidate is a proposal|give need/.test(m) ? "BAD_REF" : "BAD_SOURCE", m);
    const showIt = (s: any) => (a.show && s ? this.agent({ op: "surface.put", surface: s }) : null);
    const out = (result: any, surface?: any) => { const shown = showIt(surface); return { ok: true as const, result: { ...result, ...(shown ? { shown: shown.ok ? surface.id : { refused: (shown as any).code } } : {}) } }; };
    switch (name) {
      case "world_why": { const r = K.why(W, a.ref); if (!r.ok) return BAD(r.message); return out({ ref: r.ref, kind: r.kind, title: r.title, state: r.state, answers: r.answers, unavailable: r.unavailable, note: "basis: recorded = written in the run; derived = computed from what is written; unavailable = not recorded" }, WS_.whySurface(a.ref)); }
      case "world_impact": { const r = K.impact(W, a.ref, { dir: a.dir, depth: a.depth, kinds: a.kinds, gate: a.gate }); if (!r.ok) return BAD(r.message); return out({ subject: r.subject, direction: r.direction, depth: r.depth, affected: r.affected, direct: r.direct, stale: r.stale, gateRelevant: r.gateRelevant, gatePath: r.gatePath, truncated: r.truncated, nodes: r.rows.map((x) => `${x.ref} [${x.status || x.kind}] ${x.distance} hop(s) via ${x.via}${x.gate ? " (gate)" : ""}`), basis: r.basis }, WS_.impactSurface(a.ref, a)); }
      case "world_diff": {
        const A = parseWorldId(a.a), B = parseWorldId(a.b); if (A === null || B === null) return BAD("a and b must be worlds");
        const d = K.diff(W, A, B); if (!d.ok) return BAD(d.message);
        return out({ a: d.a.id, b: d.b.id, same: d.same, digests: [d.a.digest.value.slice(0, 12), d.b.digest.value.slice(0, 12)], changes: d.rows.slice(0, 40).map((r) => `${r.change} ${r.ref}${r.field ? "." + r.field : ""}${r.before ? `: ${r.before} → ` : ": "}${r.after}${r.because ? `  (${r.because})` : ""}`), total: d.rows.length, coverage: d.coverage, note: d.note }, WS_.diffSurface(W, A, B));
      }
      case "world_timeline": { const t = K.timeline(W, a.ref); return out({ ref: a.ref ?? null, events: t.slice(-40).map((e) => `model@${e.version} ${e.ts || "(time not recorded)"} ${e.type} ${e.detail}`), total: t.length }, WS_.timelineSurface(a.ref)); }
      case "world_counterfactual": { const r = K.counterfactual(W, a.candidate); if (!r.ok) return BAD(r.message); return out({ candidate: r.candidate, settled: r.settled, counts: r.counts, effects: r.effects.map((e) => `[${e.class}] ${e.subject}: ${e.effect}${e.via ? `  reach: ${e.via}` : ""}`), authority: r.authority, note: "possibility only: the router decides at reconciliation" }, WS_.counterfactualSurface(a.candidate)); }
      case "world_reach": { const r: any = K.worldReach(W, { need: a.need, ref: a.ref }, this.reachEnv); if (!r.ok) return BAD(r.message); return out({ ref: r.ref, gap: r.gap, capability: r.capability, best: r.best, needs: r.needs?.map((n: any) => ({ capability: n.capability, basis: n.basis, best: n.best, providers: n.providers.map((p: any) => `${p.id} ${p.status}${p.blockedAt ? ` at ${p.blockedAt}` : ""}: ${p.next}`) })), providers: r.providers?.map((p: any) => `${p.id} ${p.status}${p.blockedAt ? ` at ${p.blockedAt}` : ""}: ${p.next}`), note: r.note ?? "nothing was run or contacted; probed, reachable and authorized stay unknown until a prober supplies them" }, WS_.reachSurface({ need: a.need, ref: a.ref })); }
      case "world_replay": {
        const def = observerOf({ selects: a.selects, where: K.fmtPreds(a.where), expect: K.fmtPreds(a.expect), discriminates: (a.discriminates ?? []).join(",") }); if (typeof def === "string") return BAD(def);
        const r = observe(this.env, def);
        return out({ observer: r.observer, result: r.result, message: r.message, selected: r.selected, failures: r.rows.filter((x: any) => x.verdict === "fail").slice(0, 10), settles: false, discriminates: def.discriminates, note: "evidence for the router and the owner; no grade, claim, or gate changed" }, WS_.replaySurface(def));
      }
    }
    return fail("UNKNOWN_OP", name);
  }

  close() { this.db.close(); }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "q";
const summarize = (raw: any) => ({ summary: ({ "human.answer": `answered ${raw.ask} (${raw.outcome})`, "human.rule": `${raw.ruling} ${raw.ref}`, "human.confirm": `${raw.outcome} preflight ${raw.surface}/${raw.block}`, "human.annotate": `annotated ${raw.target}`, "human.close": `closed ${raw.id}`, "human.pin": `${raw.pinned ? "pinned" : "unpinned"} ${raw.id}` } as any)[raw.op] ?? raw.op });

function compactRow(what: string, r: any) {
  switch (what) {
    case "claims": return `${r.id} [${r.grade}] ${r.text}`.slice(0, 140);
    case "unknowns": return `${r.id} ${r.question} (blocks: ${r.blocks})`.slice(0, 140);
    case "decisions": return `${r.id} v${r.version} ${r.decision}`.slice(0, 140);
    case "proposals": return `${r.id} [${r.status}] ${r.lens}/${r.field}: ${r.proposal}`.slice(0, 140);
    case "artifacts": return `${r.id} [${r.status}] built@${r.built}`;
    case "blockers": return `${r.code}: ${r.text}`.slice(0, 140);
    case "responses": return `${r.id} ${r.kind}/${r.outcome ?? ""} ${r.ref ?? r.target ?? r.ask ?? ""} [${r.status}]`;
    case "lenses": return `${r.name} [${r.status}]`;
  }
  return JSON.stringify(r).slice(0, 140);
}

function templateShow(a: any, c: Cockpit) {
  const r = parseRef(a.ref)!;
  // debugger views are compositions of the same blocks; they carry the same placement rules as any other surface
  const place = a.beside ? { rel: "right", to: a.beside, size: 0.5, focus: true } : undefined;
  if (a.as === "why") return { op: "surface.put", surface: WS_.whySurface(a.ref), place };
  if (a.as === "impact") return { op: "surface.put", surface: WS_.impactSurface(a.ref), place };
  if (a.as === "diff" && r.kind === "version") { const s = WS_.diffSurface(c.worldEnv(), Number(r.id), "current"); if (s) return { op: "surface.put", surface: s, place }; }
  const d = c.detail(a.ref);
  const id = `ref-${r.kind}-${r.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`.slice(0, 40) + (a.as && a.as !== "detail" ? `-${a.as.slice(0, 3)}` : "");
  const blocks: any[] = [];
  if (a.as === "document" && (r.kind === "artifact" || r.kind === "evidence")) blocks.push({ type: "document", id: "doc", source: `file:${r.kind === "artifact" ? "artifacts" : "evidence"}/${r.id}` });
  else if (a.as === "lineage" && r.kind === "claim") { blocks.push({ type: "entity", id: "e", ref: a.ref, show: ["grade", "sources", "consequence"] }); blocks.push({ type: "graph", id: "g", source: `graph:claims?focus=${a.ref}`, focus: a.ref }); }
  else blocks.push({ type: "entity", id: "e", ref: a.ref });
  return { op: "surface.put", surface: { id, title: `${r.kind} ${r.id}`.slice(0, 60), intent: "inspect", layout: "stack", blocks }, place: a.beside ? { rel: "right", to: a.beside, size: 0.5, focus: true } : undefined };
}
function templateCompare(a: any, c: Cockpit) {
  const A = parseRef(a.a)!, B = parseRef(a.b)!;
  const file = (r: any) => (r.kind === "artifact" ? `file:artifacts/${r.id}` : r.kind === "evidence" ? `file:evidence/${r.id}` : null);
  const fa = file(A), fb = file(B);
  const id = `cmp-${(A.id + "-" + B.id).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`.slice(0, 48);
  const items = [{ label: a.a, ref: a.a, ...(fa ? { source: fa } : {}) }, { label: a.b, ref: a.b, ...(fb ? { source: fb } : {}) }];
  const block = fa && fb ? { type: "compare", id: "c", mode: "diff", items } : { type: "compare", id: "c", mode: "matrix", items: items.map((i) => ({ label: i.label, ref: i.ref })), criteria: [{ name: "Summary", cells: [{ text: c.detail(a.a).title.slice(0, 150) }, { text: c.detail(a.b).title.slice(0, 150) }] }] };
  return { op: "surface.put", surface: { id, title: "Compare", intent: "compare", layout: "stack", blocks: [block] }, place: a.beside ? { rel: "right", to: a.beside, size: 0.5, focus: true } : undefined };
}
export { SurfaceSchema, panelsIn, ackInbox, entities };
