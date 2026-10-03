// Cockpit core: the run directory, the SQLite projection, the workspace reducer, the inbox. No HTTP here, so every rule is testable headless.
import fs from "node:fs";
import path from "node:path";
import { openDb, getUi, setUi, pushEvent, entities, entity } from "./db";
import { Syncer } from "./sync";
import { railOf } from "./project";
import { resolve, detail, search, safeRunFile, observe, observerOf, type Env } from "./sources";
import * as K from "./world";
import * as WS_ from "./worldSurfaces";
import * as CS from "./caseSurfaces";
import * as C from "./case";
import * as L from "./learn";
import { emptyWS, applyAgent, applyHuman, contextOf, viewingOf, isAuthorityOp, panelsIn, type WS, type Ctx, type Panel } from "./workspace";
import { parseRef, caseAnchor } from "../protocol/refs";
import { TEMPLATES, hints } from "./templates";
import { fail, issuesOf, type ActionResult } from "../protocol/actions";
import { TOOLS, activeTools } from "../protocol/tools";
import { parseWorldId } from "../protocol/world";
import { vocabulary } from "../protocol/catalog";
import { SurfaceSchema } from "../protocol/spec";
import { appendInbox, readInbox, ackInbox } from "../../hooks/src/lib/inbox.mjs";
import { Control } from "./control";
import { ControlOpSchema, isControlOp, type RequestStatus } from "../protocol/work";
import { workRows, requestNext, capsOf } from "./workSources";
import { screenOf, workflowSurface, capabilitiesSurface, contractSurface, requestsSurface, reviewSurface, WORKBENCH_ID, type Screen } from "./screens";
import { workflowOf } from "./workflows";
import { interpret, type Plan } from "./terminal";
import { findRun, makeRun, DIR_NAME } from "../../hooks/src/lib/store.mjs";

export type Role = "agent" | "human";
export type Listener = (msg: any) => void;

export class Cockpit {
  db; syncer; run: any; ws: WS; env: Env; control: Control; listeners = new Set<Listener>(); clients = 0; last: ReturnType<Syncer["refresh"]>;
  private persisted = new Map<string, string>();
  private wbDigest = ""; private wbMode = ""; private seenWritten = 0;
  constructor(public cwd: string, opts: { dbFile?: string } = {}) {
    this.run = findRun(cwd) ?? makeRun(path.join(cwd, DIR_NAME));
    const dir = path.join(this.run.dir, ".cockpit");
    this.db = openDb(opts.dbFile ?? path.join(dir, "cockpit.db"));
    this.syncer = new Syncer(this.db, cwd);
    this.ws = getUi<WS>(this.db, "ws") ?? emptyWS();
    this.env = { db: this.db, runDir: this.run.dir, agentSeen: getUi<string>(this.db, "agent.seen"), asks: () => Object.entries(this.ws.asks).filter(([, a]) => a.state === "open").map(([id, a]) => ({ id, prompt: a.prompt, surface: a.surface })) };
    this.control = new Control(this.db);
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
      case "actor": return this.last.proj.actors.some((a: any) => a.id === r.id);
      case "case": return C.caseOf(this.worldEnv(), r.id).ok;
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
    this.syncWorkbench();
    if (this.clients > 0) this.pushWork();
    return this.last;
  }
  // The terminal's mode chip follows the run, not only the owner's own actions. Sent only when something in it changed.
  private workKey = "";
  private pushWork() { const w = this.workState(); const k = JSON.stringify([w.mode, w.why, w.requests, w.agentSeen]); if (k !== this.workKey) { this.workKey = k; this.emit({ t: "work", work: w }); } }

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
  tools(): string[] { const v = viewingOf(this.ws); return activeTools({ mode: v.mode, subjects: v.subjects.map((x) => x.split(":")[0]), pendingWork: this.control.pending(this.runKey()).length > 0 }); }
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
      const surface = this.templateSurface(t);
      const r = this.agent({ op: "surface.put", surface, place: { rel: "within", to: "active", focus: true } });
      if (r.ok && (raw as any).ref) this.agent({ op: "view.focus", id: surface.id, ref: (raw as any).ref });
      if (r.ok && t === "workbench") this.syncWorkbench(true);
      return r;
    }
    if (isControlOp((raw as any)?.op)) return this.controlOp(raw);
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
  private runKey() { return this.last.proj.run.startedAt; }

  // A compact file for the hook engine: one status line per prompt, so the router knows what the owner is looking at.
  writeContext() {
    try {
      const c = this.context(); const dir = path.join(this.run.dir, ".cockpit");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "context.json"), JSON.stringify({ connected: this.clients > 0, pid: process.pid, ts: new Date().toISOString(), focus: c.focus, visible: c.visible.map((v) => v.id), asking: c.asking, layout: c.layout, world: c.world, work: this.workBrief() }));
    } catch { /* the context file is advisory */ }
  }


  // ---- the Workbench: a deterministic projection of the run and the control plane ----------------------------------------------------------------
  // Opening it is the owner's act. Once its surface exists, its content follows the work; its position, tab, and pin are never touched here.
  private templateSurface(t: keyof typeof TEMPLATES) { return t === "workbench" ? this.screen().surface : TEMPLATES[t](this.last.proj, this.run.dir); }
  // The run Case is the costly part of a screen. It is a function of the projection, so it is kept until the next refresh replaces `last`.
  private caseMemo: { last: unknown; c: ReturnType<typeof C.caseOf> } | null = null;
  private runCase() { if (this.caseMemo?.last !== this.last) this.caseMemo = { last: this.last, c: C.caseOf(this.worldEnv(), "run") }; return this.caseMemo.c; }
  screen(): Screen {
    const c = this.runCase(); const prim = c.ok ? c.field.find((m) => m.primary) : null;
    return screenOf({ proj: this.last.proj, requests: this.control.requests({ run: this.runKey() }), asksOpen: Object.values(this.ws.asks).filter((a) => a.state === "open").length, settlementReachable: c.ok ? c.settlement.reachable : false, primary: prim ? { label: prim.label, authority: prim.authority } : null });
  }
  syncWorkbench(force = false) {
    const mode = () => this.screen();
    const have = this.ws.panels[WORKBENCH_ID];
    if (!have && !force) return;
    const sc = mode(); const digest = JSON.stringify(sc.surface);
    if (sc.mode !== this.wbMode) { if (this.wbMode) pushEvent(this.db, { channel: "cockpit", type: "workbench.mode", data: { from: this.wbMode, to: sc.mode, why: sc.why } }); this.wbMode = sc.mode; }
    if (!have || digest !== this.wbDigest || force) {
      const r = this.agent({ op: "surface.put", surface: sc.surface, place: have ? undefined : { rel: "within", to: "active", focus: true } });
      if (r.ok) this.wbDigest = digest; else pushEvent(this.db, { channel: "cockpit", type: "workbench.error", data: { code: (r as any).code, message: (r as any).message, issues: (r as any).issues } });   // never silent: a Workbench that cannot compose says so
    }
  }

  // The compact view of pending work, for the router's status line and for the page's terminal.
  workBrief() {
    const pend = this.control.pending(this.runKey());
    return { pending: pend.length, review: pend.filter((r) => r.status === "ready_for_review").length, items: pend.slice(0, 4).map((r) => ({ id: r.id, status: r.status, text: r.text.slice(0, 70), capability: r.capability })) };
  }
  workState() {
    const sc = this.screen(); const reqs = this.control.requests({ run: this.runKey(), limit: 60 });
    return { mode: sc.mode, why: sc.why, agentSeen: this.env.agentSeen ?? null, pending: this.workBrief().pending, requests: reqs.map((r) => ({ id: r.id, text: r.text, kind: r.kind, capability: r.capability, status: r.status, refs: r.refs, note: r.note, next: requestNext(r, this.env.agentSeen), updatedAt: r.updatedAt })), log: getUi<any[]>(this.db, "terminal") ?? [] };
  }
  noteAgent() {
    const now = Date.now(); this.env.agentSeen = new Date(now).toISOString();
    if (now - this.seenWritten > 5000) { this.seenWritten = now; setUi(this.db, "agent.seen", this.env.agentSeen); }
  }
  // Everything that changes control state ends here: one event, then the page, the tools, the context file, and the Workbench follow.
  private afterControl(events: { type: string; subject?: string; data?: any }[]) {
    for (const e of events) pushEvent(this.db, { channel: "cockpit", type: e.type, subject: e.subject, data: e.data });
    this.emit({ t: "work", work: this.workState() }); this.emit({ t: "invalidate", kinds: ["work"] }); this.emitTools(); this.writeContext(); this.syncWorkbench();
  }
  private logTerminal(e: { text: string; kind: string; say: string; id?: string }) {
    const log = [...(getUi<any[]>(this.db, "terminal") ?? []), { ts: new Date().toISOString(), ...e }].slice(-40); setUi(this.db, "terminal", log);
  }

  // ---- the owner's control operations. Only the human channel reaches this; an agent's copy is refused by the reducer with AUTHORITY_HUMAN. ----
  controlOp(raw: unknown): ActionResult {
    const p = ControlOpSchema.safeParse(raw); if (!p.success) return fail("SCHEMA", "control operation does not match", issuesOf(p.error));
    const a = p.data; const ok = (effects: string[], extra: object = {}) => ({ ok: true as const, rev: this.ws.rev, effects, ...extra });
    this.db.query("INSERT INTO interactions (ts, actor, op, data) VALUES (?, 'human', ?, ?)").run(new Date().toISOString(), a.op, JSON.stringify(summarize(a)));
    switch (a.op) {
      case "human.terminal": return this.terminal(a.text);
      case "human.cancel": {
        const r = this.control.move(a.request, "cancelled", "human"); if (r.ok === false) return fail(r.code, r.message);
        this.afterControl([{ type: "work.cancelled", subject: a.request }]); return ok([`cancelled ${a.request}`]);
      }
      case "human.review": {
        const asReq = /^R\d+$/.test(a.subject);
        if (asReq) {
          const row = this.control.request(a.subject); if (!row) return fail("NOT_FOUND", `no work request ${a.subject}`);
          if (row.status !== "ready_for_review") return fail("SCHEMA", `${a.subject} is ${row.status}; only work marked ready_for_review is reviewed${row.status === "queued" ? " (it has not been picked up)" : ""}`);
          const m = this.control.move(a.subject, a.outcome === "accepted" ? "accepted" : "blocked", "human", { note: a.outcome === "rejected" ? `review rejected${a.note ? `: ${a.note}` : ""}` : a.note });
          if (m.ok === false) return fail(m.code, m.message);
          this.control.review({ subjectType: "request", subjectId: a.subject, status: a.outcome, evidenceRefs: row.refs, reviewer: "owner", note: a.note });
          this.afterControl([{ type: `work.${a.outcome}`, subject: a.subject, data: { note: a.note } }]);
          return ok([`${a.outcome} ${a.subject}`]);
        }
        if (!this.refExists(a.subject) || parseRef(a.subject)?.kind !== "artifact") return fail("BAD_REF", `${a.subject} is not an artifact in this run; review applies to a work request (R3) or an artifact`);
        this.control.review({ subjectType: "artifact", subjectId: parseRef(a.subject)!.id, status: a.outcome, evidenceRefs: [a.subject], reviewer: "owner", note: a.note });
        this.afterControl([{ type: `review.${a.outcome}`, subject: a.subject }]); return ok([`${a.outcome} ${a.subject} (a note in the cockpit; the gate is unchanged)`]);
      }
      case "human.bind": {
        const lens = this.last.proj.lenses.find((l) => l.name === a.capability); if (!lens) return fail("BAD_REF", `no capability ${a.capability}: capabilities are lenses`, [{ path: "capability", message: this.last.proj.lenses.map((l) => l.name).join(", ") }]);
        if (a.implementation && !lens.executesWith.includes(a.implementation)) return fail("SCHEMA", `${a.implementation} is not a candidate for ${lens.name}; its executes_with is ${lens.executesWith.join(", ") || "empty"}`);
        if (a.executor && !this.control.executor(a.executor)) return fail("BAD_REF", `no executor ${a.executor}; known: ${this.control.executors().map((e) => e.id).join(", ")}`);
        this.control.bind(a.capability, { implementation: a.implementation, executor: a.executor }, "owner");
        this.afterControl([{ type: "binding.set", subject: `lens:${a.capability}`, data: { implementation: a.implementation, executor: a.executor } }]); return ok([`bound ${a.capability}`]);
      }
      case "human.contract": {
        if (!workflowOf(this.last.proj).stages.some((x) => x.id === a.stage)) return fail("BAD_REF", `no stage ${a.stage}`);
        if (a.executor && !this.control.executor(a.executor)) return fail("BAD_REF", `no executor ${a.executor}`);
        const cur = this.control.contract(a.stage);
        const invariants = a.addInvariant ? [...(cur?.invariants ?? []), a.addInvariant].slice(0, 8) : a.invariants;
        this.control.setContract(a.stage, { budget: a.budget ? { ...(cur?.budget ?? {}), ...a.budget } : undefined, invariants, executor: a.executor });
        this.afterControl([{ type: "contract.set", subject: `stage:${a.stage}` }]); return ok([`declared the ${a.stage} contract`]);
      }
      case "human.executor": {
        if (["current-agent", "owner"].includes(a.id)) return fail("SCHEMA", `${a.id} is built in`);
        this.control.putExecutor(a); this.afterControl([{ type: "executor.set", subject: a.id }]); return ok([`executor ${a.id} saved`]);
      }
    }
  }

  // Natural language for the work. Known phrases compile to existing views; an imperative becomes a stored request; the rest is refused honestly.
  terminal(text: string): ActionResult {
    const proj = this.last.proj; const c = this.runCase(); const prim = c.ok ? c.field.find((m) => m.primary) : null;
    const plan: Plan = interpret(text, { proj, requests: this.control.requests({ run: this.runKey() }), primary: prim ? { label: prim.label, authority: prim.authority } : null });
    const done = (say: string, extra: Record<string, any> = {}): ActionResult => {
      this.logTerminal({ text, kind: plan.kind, say, ...(extra.id ? { id: extra.id } : {}) }); this.emit({ t: "work", work: this.workState() });
      return { ok: true, rev: this.ws.rev, effects: [say], terminal: { kind: plan.kind, say, ...extra } } as ActionResult;
    };
    const failed = (r: ActionResult) => { const msg = (r as any).message ?? "refused"; this.logTerminal({ text, kind: "refused", say: msg }); this.emit({ t: "work", work: this.workState() }); return r; };
    switch (plan.kind) {
      case "unrecognized": return done(plan.say);
      case "answer": case "view": {
        const o: any = plan.open; let r: ActionResult = { ok: true, rev: this.ws.rev, effects: [] };
        if (o && "surface" in o) {
          const surface = ({ workbench: () => this.screen().surface, workflow: () => workflowSurface(), capabilities: () => capabilitiesSurface(o.capability), contract: () => contractSurface(o.stage), requests: () => requestsSurface(), review: () => reviewSurface() } as const)[o.surface as "workbench"]();
          r = this.agent({ op: "surface.put", surface, place: { rel: "within", to: "active", focus: true } }); if (r.ok && o.surface === "workbench") this.syncWorkbench(true);
        } else if (o) r = this.human({ op: "human.open", template: o.template, ref: o.ref, as: o.as });
        return r.ok ? done(plan.say, { opened: o?.surface ?? o?.template ?? null }) : failed(r);
      }
      case "review": {
        if (!/^R\d+$/.test(plan.subject) && !(parseRef(plan.subject)?.kind === "artifact" && this.refExists(plan.subject))) return failed(fail("BAD_REF", `${plan.subject.replace(/^artifact:/, "")} is not a work request or an artifact of this run; accept and reject apply to a request (accept R3) or an artifact`));
        const r = this.controlOp({ op: "human.review", subject: plan.subject, outcome: plan.outcome, note: plan.note }); return r.ok ? done(plan.say) : failed(r); }
      case "control": { const r = this.controlOp(plan.op as any); return r.ok ? done(plan.say) : failed(r); }
      case "cancel": { const r = this.controlOp({ op: "human.cancel", request: plan.request }); return r.ok ? done(plan.say) : failed(r); }
      case "request": {
        const x = plan.request; const bad = x.refs.filter((r) => !this.refExists(r)); const refs = x.refs.filter((r) => !bad.includes(r));
        const row = this.control.submit({ run: this.runKey(), text: x.text, kind: x.kind, capability: x.capability, refs, facts: { ...x.facts, basis: x.basis }, actor: "owner" });
        this.afterControl([{ type: "work.requested", subject: row.id, data: { kind: row.kind, capability: row.capability, text: row.text.slice(0, 120) } }]);
        return done(`${row.id}: ${plan.say}`, { id: row.id, status: row.status, capability: row.capability, basis: x.basis });
      }
    }
  }

  // ---- reads ------------------------------------------------------------------------------------------------------
  data(source: string | undefined, o: any = {}) { return resolve(this.env, source, o); }
  detail(ref: string) { return detail(this.env, ref); }
  search(q: string) { return search(this.env, q); }
  file(rel: string) { const abs = safeRunFile(this.run.dir, rel); return abs && fs.statSync(abs).isFile() ? abs : null; }
  snapshot() { return { ws: this.fullWs(), work: this.workState(), tools: this.tools(), rail: this.rail(), hints: hints(this.last.proj), context: this.context(), events: (this.db.query("SELECT seq, ts, channel, type, subject, data FROM events ORDER BY seq DESC LIMIT 60").all() as any[]).reverse().map((e) => ({ ...e, data: JSON.parse(e.data) })) }; }

  // ---- tools: the same implementation behind CLI, loopback MCP, and WebMCP ------------------------------------------
  tool(name: string, input: unknown): { ok: true; result: any } | ActionResult {
    const def = TOOLS.find((t) => t.name === name);
    if (!def) return fail("UNKNOWN_OP", `no tool ${name}`, [{ path: "name", message: `tools: ${TOOLS.map((t) => t.name).join(", ")}` }]);
    const p = def.input.safeParse(input ?? {});
    if (!p.success) return fail("SCHEMA", `${name}: input does not match`, issuesOf(p.error));
    const a: any = p.data;
    this.noteAgent();
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
      case "case_get": return this.caseTool(a);
      case "work_get": return this.workTool(a);
      case "work_update": return this.workUpdate(a);
      case "world_why": case "world_impact": case "world_diff": case "world_timeline": case "world_counterfactual": case "world_reach": case "world_replay":
        return this.worldTool(name, a);
      case "read_responses": {
        const rows = readInbox(this.run).filter((r: any) => !a.unhandled || !r.handled);
        return { ok: true, result: { count: rows.length, responses: rows.map((r: any) => ({ id: r.id, kind: r.kind, outcome: r.outcome, ref: r.ref ?? r.target ?? r.ask, value: r.value, note: r.note, via: r.via, handled: r.handled?.as ?? null })) } };
      }
    }
    return fail("UNKNOWN_OP", name);
  }


  // ---- the Workbench for the agent: reads, and the one write it has: moving a request it holds ------------------------------------------------
  private workTool(a: any): { ok: true; result: any } | ActionResult {
    const E = { db: this.db, proj: this.last.proj, runDir: this.run.dir, reach: this.reachEnv, avail: this.env.avail, agentSeen: this.env.agentSeen, asks: this.env.asks };
    const rows = (name: string, q: Record<string, string> = {}) => { const r = workRows(E, name, q); return "error" in r ? null : r.rows.map(({ _ref, ...x }: any) => x); };
    let result: any; let surface: any = null;
    switch (a.part) {
      case "requests": { const one = a.id ? this.control.request(a.id) : null; if (a.id && !one) return fail("NOT_FOUND", `no work request ${a.id}`); result = a.id ? { request: { ...one, next: requestNext(one!, this.env.agentSeen) } } : { requests: this.workState().requests }; break; }
      case "workflow": { const w = workflowOf(this.last.proj); result = { id: w.id, current: w.current, stages: w.stages.map((s) => ({ id: s.id, title: s.title, status: s.status, actor: s.actor, why: s.why })) }; surface = workflowSurface(); break; }
      case "capabilities": { const caps = capsOf(E); result = { note: "capability = the lens; implementation = a candidate from executes_with; executor = who runs it. found means seen here; unknown is not usable.", capabilities: caps.filter((c) => !a.capability || c.id === a.capability).map((c) => ({ id: c.id, title: c.title, category: c.category, status: c.status, needs: c.needs, implementation: c.binding.implementation, basis: c.binding.basis, candidates: c.implementations, executor: c.binding.executor, observes: c.observes, warnings: c.warnings })) }; surface = capabilitiesSurface(a.capability); break; }
      case "contract": { const r = workRows(E, "contract", { stage: a.stage ?? "current" }); if ("error" in r) return fail("BAD_REF", r.error); result = { stage: a.stage ?? "current", contract: r.rows }; surface = contractSurface(a.stage ?? "current"); break; }
      case "ledger": { result = { note: "unknown stays unknown: a check the run does not record is never shown as passed", ledger: rows("ledger") }; surface = reviewSurface(); break; }
      case "screen": { const sc = this.screen(); result = { mode: sc.mode, why: sc.why, blocks: sc.surface.blocks.map((b: any) => `${b.type}:${b.id}${b.source ? ` <- ${b.source}` : ""}`) }; surface = sc.surface; break; }
      default: { const w = workflowOf(this.last.proj); const st = this.workState(); result = { mode: st.mode, why: st.why, stage: w.current, workflow: w.stages.filter((s) => s.status !== "pending").map((s) => `${s.id} ${s.status}: ${s.why}`), pending: this.control.pending(this.runKey()).map((r) => ({ id: r.id, status: r.status, text: r.text, capability: r.capability, refs: r.refs, next: requestNext(r, this.env.agentSeen) })), note: "a request is queued until you acknowledge it with work_update; the owner accepts or rejects finished work" }; }
    }
    const shown = a.show && surface ? this.agent({ op: "surface.put", surface }) : null;
    return { ok: true, result: { ...result, ...(shown ? { shown: shown.ok ? surface.id : { refused: (shown as any).code } } : {}) } };
  }
  private workUpdate(a: { id: string; status: RequestStatus; note?: string; refs?: string[] }): { ok: true; result: any } | ActionResult {
    const bad = (a.refs ?? []).filter((r) => !this.refExists(r)); if (bad.length) return fail("BAD_REF", `${bad.join(", ")} do not exist in this run`);
    const r = this.control.move(a.id, a.status, "agent", { note: a.note, refs: a.refs, actor: "agent" }); if (r.ok === false) return fail(r.code, r.message);
    this.afterControl([{ type: `work.${a.status}`, subject: a.id, data: { note: a.note, refs: a.refs } }]);
    return { ok: true, result: { id: a.id, status: r.row.status, next: requestNext(r.row, this.env.agentSeen), note: r.row.status === "ready_for_review" ? "the owner reviews it; you cannot accept your own work" : undefined } };
  }

  // ---- the Case: a derived view. Reading it runs nothing; `show` composes it as an ordinary surface under the agent role. --------------------------
  haveLearning() { const W = this.worldEnv(); const e = L.experiments(W); return { experiments: e.length, patterns: L.patterns(W, e).length }; }
  private caseTool(a: any): { ok: true; result: any } | ActionResult {
    const W = this.worldEnv(); const id = String(a.ref).replace(/^case:/, "");
    if (a.part === "prior") { if (!a.q) return fail("SCHEMA", "case_get part=prior needs q: words about what you are about to investigate"); return { ok: true, result: L.prior(W, a.q) }; }
    const c = C.caseOf(W, id); if (!c.ok) return fail("BAD_REF", c.message);
    const brief = (m: C.Affordance) => ({ id: m.id, move: m.label, why: m.why, requires: m.status === "blocked" ? undefined : m.requires.map((r) => `${r.met ? "ok" : "unmet"}: ${r.what}`), because: m.status === "blocked" ? m.blockedBy.map((b) => b.text) : undefined, reach: m.reach ? `${m.reach.provider} (${m.reach.status}): ${m.reach.next}` : undefined, cost: `${m.payment.kind}: ${m.payment.estimate}`, authority: m.authority, recovery: m.recovery, evidence: m.evidence, then: m.enables.slice(0, 3), prior: m.prior.length ? m.prior : undefined, command: m.command });
    let result: any;
    if (a.part === "moves") result = { case: c.ref, primary: c.primary, moves: c.field.slice(0, 14).map((m) => ({ lane: m.lane, status: m.status, ...brief(m) })), omitted: Math.max(0, c.field.length - 14) };
    else if (a.part === "settlement") result = { case: c.ref, settlementReachable: c.settlement.reachable, required: c.settlement.required, optional: c.settlement.optional, optionalCount: c.settlement.optionalCount, shouldSettleNow: c.settlement.shouldSettleNow };
    else {
      const prim = c.field.find((m) => m.primary);
      result = {
        case: c.ref, derived: true, authoritative: false, world: c.world,
        destination: { text: c.purpose.text, bar: c.purpose.bar, declaredBy: c.purpose.declaredBy, basis: c.purpose.basis },
        now: c.now.text,
        deviation: c.material ? { severity: c.material.severity, text: c.material.text, ref: c.material.ref } : null, otherDeviations: c.deviations.slice(1, 4).map((d) => `${d.severity}: ${d.text}`),
        primary: prim ? brief(prim) : null,
        alternatives: c.field.filter((m) => m.status === "available" && !m.primary).slice(0, 4).map((m) => ({ id: m.id, move: m.label, authority: m.authority })),
        blocked: c.field.filter((m) => m.status === "blocked").slice(0, 4).map((m) => ({ id: m.id, move: m.label, because: m.blockedBy.map((b) => b.text).slice(0, 3), reach: m.reach ? `${m.reach.provider} (${m.reach.status}): ${m.reach.next}` : undefined })),
        settlement: { settlementReachable: c.settlement.reachable, required: c.settlement.required.length, optional: c.settlement.optionalCount, shouldSettleNow: c.settlement.shouldSettleNow },
        decisionStates: c.decisionStates.length,
        note: "A Case is derived from the run files and stores nothing. The primary move is guidance, not authority: nothing here acts, and settling is the owner's call.",
      };
    }
    const surface = a.show ? CS.surfaceFor(id, a.view, this.haveLearning()) : null;
    const shown = surface ? this.agent({ op: "surface.put", surface }) : null;
    return { ok: true, result: { ...result, ...(shown ? { shown: shown.ok ? surface!.id : { refused: (shown as any).code } } : {}) } };
  }

  // ---- the world debugger: reads over the run files; `show` composes the answer as a surface through the ordinary agent path -------------
  worldEnv(): K.WorldEnv { return { proj: this.last.proj, runDir: this.run.dir, reach: this.reachEnv, observe: (d) => observe(this.env, d) }; }
  get reachEnv() { return this.env.reach; }
  set reachEnv(v: import("./reach").ReachEnv | undefined) { this.env.reach = v; }
  private worldTool(name: string, a: any): { ok: true; result: any } | ActionResult {
    const W = this.worldEnv(); const BAD = (m: string) => fail(/does not exist|not a ref|candidate is a proposal|give need/.test(m) ? "BAD_REF" : "BAD_SOURCE", m);
    const showIt = (s: any) => (a.show && s ? this.agent({ op: "surface.put", surface: s }) : null);
    const out = (result: any, surface?: any) => { const shown = showIt(surface); return { ok: true as const, result: { ...result, ...(shown ? { shown: shown.ok ? surface.id : { refused: (shown as any).code } } : {}) } }; };
    switch (name) {
      case "world_why": { const r = C.caseWhy(W, a.ref); if (!r.ok) return BAD(r.message); return out({ ref: r.ref, kind: r.kind, title: r.title, state: r.state, answers: r.answers, unavailable: r.unavailable, note: "basis: recorded = written in the run; derived = computed from what is written; unavailable = not recorded" }, WS_.whySurface(a.ref)); }
      case "world_impact": { const r = K.impact(W, a.ref, { dir: a.dir, depth: a.depth, kinds: a.kinds, gate: a.gate }); if (!r.ok) return BAD(r.message); return out({ subject: r.subject, direction: r.direction, depth: r.depth, affected: r.affected, direct: r.direct, stale: r.stale, gateRelevant: r.gateRelevant, gatePath: r.gatePath, truncated: r.truncated, nodes: r.rows.map((x) => `${x.ref} [${x.status || x.kind}] ${x.distance} hop(s) via ${x.via}${x.gate ? " (gate)" : ""}`), basis: r.basis }, WS_.impactSurface(a.ref, a)); }
      case "world_diff": {
        const A = parseWorldId(a.a), B = parseWorldId(a.b); if (A === null || B === null) return BAD("a and b must be worlds");
        const d = K.diff(W, A, B); if (!d.ok) return BAD(d.message);
        return out({ a: d.a.id, b: d.b.id, same: d.same, digests: [d.a.digest.value.slice(0, 12), d.b.digest.value.slice(0, 12)], changes: d.rows.slice(0, 40).map((r) => `${r.change} ${r.ref}${r.field ? "." + r.field : ""}${r.before ? `: ${r.before} → ` : ": "}${r.after}${r.because ? `  (${r.because})` : ""}`), total: d.rows.length, coverage: d.coverage, note: d.note }, WS_.diffSurface(W, A, B));
      }
      case "world_timeline": { const t = K.timeline(W, a.ref, { git: a.git }); return out({ ref: a.ref ?? null, events: t.slice(-40).map((e) => `model@${e.version} ${e.ts || "(time not recorded)"} ${e.type} ${e.detail}`), total: t.length }, WS_.timelineSurface(a.ref)); }
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
const summarize = (raw: any) => ({ summary: ({ "human.answer": `answered ${raw.ask} (${raw.outcome})`, "human.rule": `${raw.ruling} ${raw.ref}`, "human.confirm": `${raw.outcome} preflight ${raw.surface}/${raw.block}`, "human.annotate": `annotated ${raw.target}`, "human.close": `closed ${raw.id}`, "human.terminal": `terminal: ${String(raw.text).slice(0, 60)}`, "human.review": `${raw.outcome} ${raw.subject}`, "human.cancel": `cancelled ${raw.request}`, "human.pin": `${raw.pinned ? "pinned" : "unpinned"} ${raw.id}` } as any)[raw.op] ?? raw.op });

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

const caseIdOfRef = (ref: string) => { const r = parseRef(ref); if (!r) return "run"; return r.kind === "case" ? r.id : r.kind === "gate" ? "run" : r.kind === "evidence" || r.kind === "artifact" ? `${r.kind}/${r.id}` : ["opportunity", "criterion", "job", "claim", "unknown", "proposal"].includes(r.kind) ? r.id : "run"; };
function templateShow(a: any, c: Cockpit) {
  const r = parseRef(a.ref)!;
  // debugger views are compositions of the same blocks; they carry the same placement rules as any other surface
  const place = a.beside ? { rel: "right", to: a.beside, size: 0.5, focus: true } : undefined;
  if (a.as === "case" || a.as === "decision") return { op: "surface.put", surface: CS.surfaceFor(caseIdOfRef(a.ref), a.as, c.haveLearning()), place };
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
