// The control-plane repository: the only code that reads or writes `control_*` tables. Plain prepared statements over bun:sqlite, no ORM.
//
// What lives here is what the owner asked for and chose: work requests, bindings, declared budgets, reviews. It is cockpit state, durable
// across `rebuild()` and lost with the file. None of it is Product Model or process truth, the hooks never read it, and nothing here can
// settle a claim, a proposal, or the gate. Lifecycle rules (who may move a request where) are the table in protocol/work.ts.
import type { Database } from "bun:sqlite";
import { TRANSITIONS, TERMINAL, legalNext, type RequestKind, type RequestStatus, type Role } from "../protocol/work";
import type { ErrorCode } from "../protocol/actions";

export type Step = { ts: string; status: RequestStatus; by: string; note?: string };
export type RequestRow = { id: string; seq: number; run: string; text: string; kind: RequestKind; capability: string | null; status: RequestStatus; actor: string; refs: string[]; facts: Record<string, any>; note: string; history: Step[]; createdAt: string; updatedAt: string };
export type BindingRow = { capability: string; implementation: string | null; executor: string | null; setBy: string; updatedAt: string };
export type ExecutorRow = { id: string; label: string; kind: "agent" | "tool" | "human"; provider: string | null; model: string | null; role: string | null; source: string };
export type ContractRow = { stage: string; budget: { minutes?: number; lensRuns?: number; note?: string }; invariants: string[]; executor: string | null };
export type ReviewRow = { id: number; subjectType: string; subjectId: string; status: "accepted" | "rejected"; evidenceRefs: string[]; reviewer: string; note: string; createdAt: string };
export type Fail = { ok: false; code: ErrorCode; message: string };
export const BUILTIN_EXECUTORS: ExecutorRow[] = [
  { id: "current-agent", label: "Current agent or tool", kind: "agent", provider: null, model: null, role: null, source: "builtin" },
  { id: "owner", label: "The owner", kind: "human", provider: null, model: null, role: null, source: "builtin" },
];
const no = (code: ErrorCode, message: string): Fail => ({ ok: false, code, message });

const json = (s: string, d: any) => { try { return JSON.parse(s); } catch { return d; } };
const toRequest = (r: any): RequestRow => ({ id: `R${r.seq}`, seq: r.seq, run: r.run, text: r.text, kind: r.kind, capability: r.capability, status: r.status, actor: r.actor, refs: json(r.refs, []), facts: json(r.facts, {}), note: r.note, history: json(r.history, []), createdAt: r.created_at, updatedAt: r.updated_at });
export const requestSeq = (id: string) => Number(/^R(\d+)$/.exec(id)?.[1] ?? NaN);

export class Control {
  constructor(public db: Database, public now: () => string = () => new Date().toISOString()) {}

  // ---- executors ------------------------------------------------------------------------------------------------------------
  // Two always exist, in code, so a binding can name something before the owner defines any: the agent in this session, and the owner.
  // The table holds only what the owner added.
  executors(): ExecutorRow[] {
    const user = (this.db.query("SELECT * FROM control_executors ORDER BY id").all() as any[]).map((r): ExecutorRow => ({ id: r.id, label: r.label, kind: r.kind, provider: r.provider, model: r.model, role: r.role, source: r.source }));
    return [...BUILTIN_EXECUTORS, ...user.filter((u) => !BUILTIN_EXECUTORS.some((b) => b.id === u.id))];
  }
  executor(id: string): ExecutorRow | null { return this.executors().find((e) => e.id === id) ?? null; }
  putExecutor(e: { id: string; label: string; kind: ExecutorRow["kind"]; provider?: string; model?: string; role?: string }) {
    this.db.query(`INSERT INTO control_executors (id, label, kind, provider, model, role, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'user', ?)
      ON CONFLICT (id) DO UPDATE SET label = excluded.label, kind = excluded.kind, provider = excluded.provider, model = excluded.model, role = excluded.role, updated_at = excluded.updated_at`)
      .run(e.id, e.label, e.kind, e.provider ?? null, e.model ?? null, e.role ?? null, this.now());
  }

  // ---- bindings: the owner's choice of implementation and executor for a capability ---------------------------------------
  bindings(): Record<string, BindingRow> {
    return Object.fromEntries((this.db.query("SELECT * FROM control_bindings").all() as any[]).map((r) => [r.capability, { capability: r.capability, implementation: r.implementation, executor: r.executor_id, setBy: r.set_by, updatedAt: r.updated_at }]));
  }
  bind(capability: string, b: { implementation?: string | null; executor?: string | null }, by: string) {
    const cur = this.bindings()[capability];
    const impl = b.implementation === undefined ? cur?.implementation ?? null : b.implementation;
    const exec = b.executor === undefined ? cur?.executor ?? null : b.executor;
    if (impl === null && exec === null) { this.db.query("DELETE FROM control_bindings WHERE capability = ?").run(capability); return; }
    this.db.query(`INSERT INTO control_bindings (capability, implementation, executor_id, set_by, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (capability) DO UPDATE SET implementation = excluded.implementation, executor_id = excluded.executor_id, set_by = excluded.set_by, updated_at = excluded.updated_at`).run(capability, impl, exec, by, this.now());
  }

  // ---- declared stage contracts (budget, invariants, executor) ---------------------------------------------------------------
  contract(stage: string): ContractRow | null {
    const r = this.db.query("SELECT * FROM control_contracts WHERE stage = ?").get(stage) as any;
    return r ? { stage, budget: json(r.budget, {}), invariants: json(r.invariants, []), executor: r.executor_id } : null;
  }
  setContract(stage: string, p: { budget?: ContractRow["budget"]; invariants?: string[]; executor?: string | null }) {
    const cur = this.contract(stage);
    const next = { budget: p.budget ?? cur?.budget ?? {}, invariants: p.invariants ?? cur?.invariants ?? [], executor: p.executor === undefined ? cur?.executor ?? null : p.executor };
    this.db.query(`INSERT INTO control_contracts (stage, budget, invariants, executor_id, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (stage) DO UPDATE SET budget = excluded.budget, invariants = excluded.invariants, executor_id = excluded.executor_id, updated_at = excluded.updated_at`)
      .run(stage, JSON.stringify(next.budget), JSON.stringify(next.invariants), next.executor, this.now());
  }

  // ---- work requests ----------------------------------------------------------------------------------------------------------
  submit(r: { run: string; text: string; kind: RequestKind; capability?: string | null; refs?: string[]; facts?: Record<string, any>; actor: string }): RequestRow {
    const ts = this.now();
    const hist: Step[] = [{ ts, status: "queued", by: r.actor }];
    const res = this.db.query("INSERT INTO control_requests (run, text, kind, capability, status, actor, refs, facts, history, created_at, updated_at) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)")
      .run(r.run, r.text, r.kind, r.capability ?? null, r.actor, JSON.stringify(r.refs ?? []), JSON.stringify(r.facts ?? {}), JSON.stringify(hist), ts, ts);
    return this.request(`R${Number(res.lastInsertRowid)}`)!;
  }
  request(id: string): RequestRow | null {
    const seq = requestSeq(id); if (!Number.isFinite(seq)) return null;
    const r = this.db.query("SELECT * FROM control_requests WHERE seq = ?").get(seq); return r ? toRequest(r) : null;
  }
  requests(o: { run?: string; status?: RequestStatus[]; limit?: number } = {}): RequestRow[] {
    const rows = (this.db.query("SELECT * FROM control_requests ORDER BY seq DESC LIMIT ?").all(o.limit ?? 200) as any[]).map(toRequest);
    return rows.filter((r) => (!o.run || r.run === o.run) && (!o.status || o.status.includes(r.status)));
  }
  // Requests that still wait on someone: an executor to pick them up, or the owner to review them. The count the router sees.
  pending(run?: string): RequestRow[] { return this.requests({ run, status: ["queued", "acknowledged", "running", "produced", "ready_for_review", "blocked"] }).reverse(); }

  // The one place a request changes state. `by` is the authority the caller holds, decided by the transport (never by the caller's claim).
  move(id: string, to: RequestStatus, by: Role, o: { note?: string; refs?: string[]; actor?: string } = {}): { ok: true; row: RequestRow } | Fail {
    const r = this.request(id); if (!r) return no("NOT_FOUND", `no work request ${id}`);
    // Whatever state the request is in, accepting or cancelling it is not the executor's to do; say so before saying anything about the lifecycle.
    if (by === "agent" && (to === "accepted" || to === "cancelled")) return no("AUTHORITY_HUMAN", `${to} belongs to the owner: an agent can report progress and mark work ready_for_review, but cannot accept, reject, or cancel it`);
    const who = TRANSITIONS[r.status][to];
    if (!who) return no("SCHEMA", `${id} is ${r.status}; it cannot go to ${to}. ${TERMINAL.includes(r.status) ? "It is finished." : `From here: ${[...new Set([...legalNext(r.status, "agent"), ...legalNext(r.status, "human")])].join(", ")}.`}`);
    if (!who.includes(by)) return no(by === "agent" ? "AUTHORITY_HUMAN" : "SCHEMA", by === "agent" ? `${to} belongs to the owner: an agent can report progress and mark work ready_for_review, but cannot accept, reject, or cancel it` : `${to} is reported by the executor, not by the owner`);
    const refs = [...new Set([...r.refs, ...(o.refs ?? [])])].slice(0, 12);
    if (to === "ready_for_review" && !refs.length && !o.note) return no("SCHEMA", "ready_for_review needs something the owner can review: attach refs to what was produced, or a note saying what was found");
    const ts = this.now();
    const step: Step = { ts, status: to, by: o.actor ?? by, ...(o.note ? { note: o.note.slice(0, 400) } : {}) };
    this.db.query("UPDATE control_requests SET status = ?, refs = ?, note = ?, history = ?, updated_at = ? WHERE seq = ?")
      .run(to, JSON.stringify(refs), o.note ? o.note.slice(0, 400) : r.note, JSON.stringify([...r.history, step].slice(-30)), ts, r.seq);
    return { ok: true, row: this.request(id)! };
  }

  // ---- reviews: the owner's own record that they looked. Cockpit-owned; it never touches the gate. -------------------------------
  review(r: { subjectType: "request" | "artifact"; subjectId: string; status: "accepted" | "rejected"; evidenceRefs?: string[]; reviewer: string; note?: string }): ReviewRow {
    const ts = this.now();
    const res = this.db.query("INSERT INTO control_reviews (subject_type, subject_id, status, evidence_refs, reviewer, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(r.subjectType, r.subjectId, r.status, JSON.stringify(r.evidenceRefs ?? []), r.reviewer, r.note ?? "", ts, ts);
    return this.reviews().find((x) => x.id === Number(res.lastInsertRowid))!;
  }
  reviews(subject?: { type: string; id: string }): ReviewRow[] {
    const rows = this.db.query(`SELECT * FROM control_reviews ${subject ? "WHERE subject_type = ? AND subject_id = ?" : ""} ORDER BY id DESC LIMIT 200`).all(...(subject ? [subject.type, subject.id] : [])) as any[];
    return rows.map((r) => ({ id: r.id, subjectType: r.subject_type, subjectId: r.subject_id, status: r.status, evidenceRefs: json(r.evidence_refs, []), reviewer: r.reviewer, note: r.note, createdAt: r.created_at }));
  }
  latestReview(type: string, id: string): ReviewRow | null { return this.reviews({ type, id })[0] ?? null; }
}
