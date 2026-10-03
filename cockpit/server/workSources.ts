// The rows behind the `work:` sources: the workflow, capabilities and their three layers, the task contract, work requests, the evidence ledger, and
// what is waiting for the owner. Every row is a function of the run projection plus the control tables, so a block bound to one stays true as the
// run changes. Nothing here executes work or decides anything; a request row says what the owner asked and who, if anyone, has picked it up.
import type { Database } from "bun:sqlite";
import type { Proj } from "./project";
import { Control, type RequestRow } from "./control";
import { catalogue, hostAvail, type AvailEnv, type Capability_ } from "./capabilities";
import { workflowOf, contractOf, type Workflow } from "./workflows";
import { parseRef } from "../protocol/refs";
import type { ReachEnv } from "./reach";

export type Col = { field: string; label?: string; kind?: string };
export type WorkEnv = {
  db: Database; proj: Proj; runDir: string; reach?: ReachEnv; avail?: AvailEnv; agentSeen?: string | null; now?: () => string;
  asks?: () => { id: string; prompt: string; surface: string }[];
  primary?: () => { label: string; authority: string } | null;
};
export type WorkRows = { cols: Col[]; rows: any[] } | { error: string };

export const WORK_NAMES = ["workflow", "capabilities", "layers", "contract", "requests", "ledger", "waiting"] as const;
const refRow = (r: any, ref?: string | null) => ({ ...r, _ref: ref && parseRef(ref) ? ref : undefined });
export const ago = (ts: string | null | undefined, now = Date.now()) => { if (!ts) return ""; const s = Math.max(0, Math.round((now - Date.parse(ts)) / 1000)); return s < 90 ? `${s}s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`; };

export const capsOf = (e: WorkEnv): Capability_[] => { const c = new Control(e.db); return catalogue(e.proj, c.bindings(), c.executors(), e.avail ?? hostAvail(e.runDir.replace(/[\\/][^\\/]*$/, "")), e.reach); };
export const flow = (e: WorkEnv): Workflow => workflowOf(e.proj);
const title = (caps: Capability_[], id: string) => caps.find((c) => c.id === id)?.title ?? id;

// What the next person to look at a request is told. It never says "running" unless an executor said so.
export function requestNext(r: RequestRow, seen: string | null | undefined, now = Date.now()): string {
  switch (r.status) {
    case "queued": return seen ? `queued: an agent last called the cockpit ${ago(seen, now)}; none has acknowledged this yet` : "queued: no agent is connected; it will see this at its next interaction";
    case "acknowledged": return "an executor acknowledged it and has not started";
    case "running": return "an executor reports it is running";
    case "produced": return "an executor produced something and has not yet marked it ready";
    case "ready_for_review": return `waiting for you: type "accept ${r.id}" or "reject ${r.id} because ..."`;
    case "accepted": return "accepted by the owner";
    case "blocked": return r.note ? `blocked: ${r.note}` : "blocked";
    case "cancelled": return "cancelled by the owner";
    case "failed": return r.note ? `failed: ${r.note}` : "failed";
  }
}

// ---- the evidence ledger: what the run records, what it does not, and what only the owner can add ----------------------------------------------
export type LedgerRow = { section: string; check: string; result: "pass" | "pending" | "fail" | "unknown"; evidence: string; ref?: string };
export function ledgerOf(e: WorkEnv, control = new Control(e.db)): LedgerRow[] {
  const p = e.proj, codes = new Set(p.blockers.map((b) => b.code)), out: LedgerRow[] = [];
  const add = (section: string, check: string, result: LedgerRow["result"], evidence: string, ref?: string) => out.push({ section, check, result, evidence, ref });
  const M = "Product / model";
  const bad = ["model-missing", "model-invalid", "model-tampered"].find((c) => codes.has(c));
  add(M, "The Product Model is built and valid", bad ? "fail" : p.run.modelVersion > 0 ? "pass" : "pending", bad ? p.blockers.find((b) => b.code === bad)!.text : p.run.modelVersion > 0 ? `model@${p.run.modelVersion}` : "no model yet", "field:purpose");
  const open = p.proposals.filter((x: any) => x.status === "open");
  add(M, "Every proposal is ruled on", open.length ? "pending" : p.run.modelVersion > 0 ? "pass" : "pending", open.length ? `${open.length} open: ${open.slice(0, 4).map((x: any) => x.id).join(", ")}` : "none open", open[0] ? `proposal:${open[0].id}` : undefined);
  const contra = p.claims.filter((c) => c.grade === "CONTRADICTED");
  add(M, "No claim is contradicted", contra.length ? "fail" : "pass", contra.length ? `${contra.length}: ${contra.slice(0, 4).map((c) => c.id).join(", ")}` : "none", contra[0] ? `claim:${contra[0].id}` : undefined);
  add(M, "Unknowns are answered or accepted", p.unknowns.length ? "pending" : "pass", p.unknowns.length ? `${p.unknowns.length} open` : "none open", p.unknowns[0] ? `unknown:${p.unknowns[0].id}` : undefined);

  const I = "Implementation";
  const arts = p.artifacts.filter((a) => !a.isGate);
  for (const a of arts.slice(0, 8)) add(I, `Artifact ${a.id}`, a.status === "current" ? "pass" : a.status === "stale" ? "fail" : "fail", a.status === "current" ? `built from model@${a.built}` : a.status === "stale" ? `stale: decision ${a.stale.join(", ")} touched what it reads` : `invalid: ${a.errors[0]}`, `artifact:${a.id}`);
  if (arts.length > 8) add(I, `${arts.length - 8} more artifacts`, arts.slice(8).every((a) => a.status === "current") ? "pass" : "fail", arts.slice(8).filter((a) => a.status !== "current").length ? `${arts.slice(8).filter((a) => a.status !== "current").length} not current` : "all current");
  const notRun = (p.selection?.lenses ?? []).filter((n) => n !== "release-readiness" && !p.lenses.find((l) => l.name === n)?.runs);
  if (notRun.length) add(I, "Every selected lens ran", "pending", `not yet: ${notRun.join(", ")}`, `lens:${notRun[0]}`);
  else if (p.selection) add(I, "Every selected lens ran", "pass", `${p.selection.lenses.length} selected`);

  const V = "Verification";
  const gate = p.artifacts.find((a) => a.isGate);
  add(V, "The release gate is built from the current model", gate && !codes.has("gate-stale") ? "pass" : codes.has("gate-stale") ? "fail" : "pending", gate ? (codes.has("gate-stale") ? p.blockers.find((b) => b.code === "gate-stale")!.text : `gate built from model@${gate.built}`) : "no gate yet", gate ? `artifact:${gate.id}` : "gate");
  add(V, "The process accepts the run", p.run.ready ? "pass" : "fail", p.run.ready ? "no blockers" : `${p.blockers.length} blocker(s): ${p.blockers.slice(0, 2).map((b) => b.code).join(", ")}`, "gate");
  for (const lens of ["fidelity-qa", "release-readiness"]) {
    if (!p.selection?.lenses.includes(lens)) continue;
    const files = p.evidence.filter((x) => x.lens === lens);
    add(V, `${lens} left evidence`, files.length ? "pass" : "pending", files.length ? `${files.length} file(s)` : "none recorded yet", files[0] ? `evidence:${files[0].id}` : undefined);
  }
  add(V, "Test and browser-journey results", "unknown", "this run does not record them; attach them as evidence under evidence/<lens>/ and cite them");
  for (const r of control.requests({ run: p.run.startedAt, status: ["produced", "ready_for_review", "accepted", "failed"] }).reverse().slice(0, 6)) {
    add(V, `Work ${r.id}: ${r.text.slice(0, 50)}`, r.status === "accepted" ? "pass" : r.status === "failed" ? "fail" : "pending", r.status === "accepted" ? "accepted by the owner" : r.status === "failed" ? (r.note || "failed") : "waiting for your review", r.refs.find((x) => parseRef(x)));
  }

  const Q = "Quality";
  const waiting = p.responses.filter((r: any) => r.status === "waiting").length;
  add(Q, "Your responses are routed", waiting ? "pending" : "pass", waiting ? `${waiting} not yet routed by the router` : "all routed");
  for (const a of arts.slice(0, 6)) {
    const rv = control.latestReview("artifact", a.id);
    add(Q, `Your review of ${a.id}`, rv ? (rv.status === "accepted" ? "pass" : "fail") : "pending", rv ? `${rv.status} by ${rv.reviewer}${rv.note ? `: ${rv.note}` : ""} (a note in the cockpit; it does not change the gate)` : "not reviewed yet: type \"accept " + a.id + "\"", `artifact:${a.id}`);
  }
  return out;
}

const MARK = { pass: "✓", pending: "○", fail: "✗", unknown: "?" } as const;

// ---- one dispatcher -------------------------------------------------------------------------------------------------------------------------------
export function workRows(e: WorkEnv, name: string, q: Record<string, string>): WorkRows {
  const p = e.proj; const control = new Control(e.db);
  switch (name) {
    case "workflow": {
      const w = flow(e);
      return { cols: [{ field: "n", label: "#", kind: "number" }, { field: "stage" }, { field: "status", kind: "status" }, { field: "actor", label: "who acts" }, { field: "why", label: "now" }, { field: "accepts", label: "accepted when" }],
        rows: w.stages.map((s) => ({ n: s.n, id: s.id, stage: `${s.id === w.current ? "▶ " : ""}${s.title}`, status: s.status, actor: s.actor, why: s.why, accepts: s.accepts })) };
    }
    case "capabilities": {
      const caps = capsOf(e); const sel = new Set([...(p.selection?.lenses ?? []), ...(p.selection?.satisfied ?? [])]);
      const list = q.scope === "all" || !p.selection ? caps : caps.filter((c) => sel.has(c.id));
      return { cols: [{ field: "capability", kind: "ref" }, { field: "category" }, { field: "status", kind: "status" }, { field: "needs" }, { field: "implementation" }, { field: "alternatives" }, { field: "executor" }, { field: "found", kind: "status" }, { field: "warning" }],
        rows: list.map((c) => refRow({
          id: c.id, capability: c.title, category: c.category, status: c.status, needs: c.needs.map((n) => title(caps, n)).join(", "),
          implementation: c.binding.implementation ?? "the lens procedure itself", alternatives: c.implementations.filter((i) => i.name !== c.binding.implementation).map((i) => i.name).join(", "),
          executor: c.binding.executorLabel, found: c.binding.implementation ? c.implementations.find((i) => i.name === c.binding.implementation)?.found ?? "unknown" : "n/a", warning: c.warnings.join("; "),
        }, `lens:${c.id}`)) };
    }
    case "layers": {
      const caps = capsOf(e);
      const sel = p.selection?.lenses ?? [];
      const id = q.capability || q.ref?.replace(/^lens:/, "") || sel.find((n) => p.lenses.find((l) => l.name === n)?.status === "ready") || sel[0] || caps[0]?.id;
      const c = caps.find((x) => x.id === id); if (!c) return { error: `no capability ${id}; capabilities are the lenses: ${caps.map((x) => x.id).join(", ")}` };
      const rows: any[] = [
        { layer: "Capability", name: c.title, detail: c.purpose, state: c.status, basis: `lens ${c.id}; reads ${c.reads.join(", ") || "nothing"}; needs ${c.needs.map((n) => title(caps, n)).join(", ") || "nothing first"}` },
        { layer: "Implementation", name: c.binding.implementation ?? "the lens procedure itself", detail: c.binding.implementation ? (c.implementations.find((i) => i.name === c.binding.implementation)?.where ?? "") : "the lens has no executes_with; the agent follows the lens procedure", state: c.binding.implementation ? c.implementations.find((i) => i.name === c.binding.implementation)?.found ?? "unknown" : "n/a", basis: c.binding.basis },
        ...c.implementations.filter((i) => i.name !== c.binding.implementation).map((i) => ({ layer: "Alternative", name: i.name, detail: i.where, state: i.found, basis: "a candidate from the lens's executes_with" })),
        { layer: "Executor", name: c.binding.executorLabel, detail: e.agentSeen ? `an agent last called the cockpit ${ago(e.agentSeen)}` : "no agent has called the cockpit this session", state: "unknown", basis: c.binding.executorBasis },
        ...c.observes.map((o) => ({ layer: "Observation (Reach)", name: o.capability, detail: o.best ? `best provider: ${o.best}` : "no provider is configured", state: o.status, basis: "how outside evidence is gathered; a separate idea from the implementation" })),
        ...c.warnings.map((w) => ({ layer: "Conflict", name: "overlapping authority", detail: w, state: "unproven", basis: "declared authority domains" })),
      ];
      return { cols: [{ field: "layer" }, { field: "name" }, { field: "detail" }, { field: "state", kind: "status" }, { field: "basis" }], rows: rows.map((r) => refRow(r, r.layer === "Capability" ? `lens:${c.id}` : undefined)) };
    }
    case "contract": {
      const w = flow(e); const id = !q.stage || q.stage === "current" ? w.current : q.stage;
      const stage = w.stages.find((s) => s.id === id); if (!stage) return { error: `no stage ${id}; stages: ${w.stages.map((s) => s.id).join(", ")}` };
      const caps = capsOf(e);
      const lensesFor = stage.id === "waves" ? [...p.run.activeLenses, ...p.lenses.filter((l) => l.status === "ready").map((l) => l.name)]
        : stage.id === "readiness" ? ["release-readiness"] : stage.id === "rebuild" ? [...new Set(p.artifacts.filter((a) => a.status === "stale").map((a) => a.lens))] : [];
      const uniq = [...new Set(lensesFor)];
      const dec = control.contract(stage.id);
      const ex = [...new Set([...(dec?.executor ? [control.executors().find((x) => x.id === dec.executor)?.label ?? dec.executor] : []), ...uniq.map((l) => caps.find((c) => c.id === l)?.binding.executorLabel ?? "")].filter(Boolean))];
      const rows = contractOf({ stage, proj: p, skills: uniq.map((l) => title(caps, l)), executors: ex, primary: e.primary?.() ?? null, declared: dec ? { budget: dec.budget, invariants: dec.invariants } : null, agentSeen: e.agentSeen ? ago(e.agentSeen) : null });
      return { cols: [{ field: "field", label: stage.title }, { field: "value" }, { field: "basis", kind: "status" }], rows };
    }
    case "requests": {
      const all = control.requests({ run: p.run.startedAt });
      const status = q.status ? q.status.split(",") : null;
      const list = all.filter((r) => (q.active === "1" ? !["accepted", "cancelled", "failed"].includes(r.status) : true) && (q.review === "1" ? ["produced", "ready_for_review"].includes(r.status) : true) && (!status || status.includes(r.status)));
      return { cols: [{ field: "id", label: "request" }, { field: "text" }, { field: "status", kind: "status" }, { field: "capability" }, { field: "refs" }, { field: "next" }],
        rows: (() => { const caps = list.some((r) => r.capability) ? capsOf(e) : []; return list.map((r) => ({ id: r.id, text: r.text, status: r.status, capability: r.capability ? title(caps, r.capability) : r.kind, refs: r.refs.join(", "), next: requestNext(r, e.agentSeen) })); })() };
    }
    case "ledger": {
      const rows = ledgerOf(e, control).map((r) => refRow({ section: r.section, check: r.check, result: r.result, mark: MARK[r.result], evidence: r.evidence }, r.ref));
      return { cols: [{ field: "mark", label: "·" }, { field: "check" }, { field: "result", kind: "status" }, { field: "evidence" }], rows };
    }
    case "waiting": {
      const rows: any[] = [];
      if (p.run.paused) rows.push({ kind: "pause", what: p.run.paused, how: "the process paused for you; answer where it asked, or tell the router" });
      for (const a of e.asks?.() ?? []) rows.push({ kind: "question", what: a.prompt, how: `answer it in the surface "${a.surface}"` });
      for (const x of p.proposals.filter((y: any) => y.status === "open")) rows.push(refRow({ kind: "proposal", what: `${x.id} ${x.lens}/${x.field}: ${x.proposal}`, how: "rule on it (accept, reject, question); the router reconciles" }, `proposal:${x.id}`));
      for (const r of control.requests({ run: p.run.startedAt, status: ["blocked"] })) rows.push({ kind: "request", what: `${r.id} ${r.text}${r.note ? `: ${r.note}` : ""}`, how: "an executor could not continue; cancel it, or answer what it needs" });
      return { cols: [{ field: "kind" }, { field: "what" }, { field: "how", label: "how to answer" }], rows };
    }
  }
  return { error: `unknown work source ${name}` };
}
