// The Workbench: one stable surface whose contents change deterministically as the work changes. ORIENT -> EXECUTE -> DECIDE -> VERIFY -> COMPLETE.
//
// `screenOf` is a pure function: the same run, the same control state, and the same Case yield the same mode and the same blocks. It composes
// only the fifteen existing blocks over `case:`, `pa:`, `graph:`, and `work:` sources, so every figure is computed at render time and stays true.
// It never moves anything. The Workbench is an ordinary surface (id `workbench`); when it already exists its content is replaced in place, so
// the owner's placement, pins, and tabs are untouched. If the owner closed it, it stays closed until they ask for it again.
import type { Proj } from "./project";
import type { RequestRow } from "./control";
import type { Surface } from "../protocol/spec";
import { SCREEN_MODES, type ScreenMode } from "../protocol/work";

export const WORKBENCH_ID = "workbench";
export type ScreenIn = {
  proj: Proj;
  requests: RequestRow[];                    // this run's work requests
  asksOpen: number;                          // questions the cockpit has open for the owner
  settlementReachable: boolean;              // the Case's engine-derived fact; not "should settle"
  primary: { label: string; authority: string } | null;
};
export type Screen = { mode: ScreenMode; why: string; surface: Surface };

export function modeOf(i: ScreenIn): { mode: ScreenMode; why: string } {
  const p = i.proj, rq = i.requests;
  if (!p.run.goal) return { mode: "orient", why: "no run has begun" };
  if (!p.selection) return { mode: "orient", why: "no lens selection yet: classify the evidence, then select" };
  if (p.run.paused) return { mode: "decide", why: `the process is paused for you: ${p.run.paused}`.slice(0, 160) };
  if (i.asksOpen) return { mode: "decide", why: `${i.asksOpen} question${i.asksOpen > 1 ? "s" : ""} wait${i.asksOpen > 1 ? "" : "s"} for your answer` };
  const blockedReq = rq.find((r) => r.status === "blocked");
  if (blockedReq) return { mode: "decide", why: `${blockedReq.id} is blocked and needs a decision${blockedReq.note ? `: ${blockedReq.note}` : ""}`.slice(0, 160) };
  const liveReq = rq.find((r) => r.status === "acknowledged" || r.status === "running");
  if (p.run.activeLenses.length || p.run.phase === "reconcile" || liveReq)
    return { mode: "execute", why: p.run.activeLenses.length ? `running: ${p.run.activeLenses.join(", ")}` : p.run.phase === "reconcile" ? "a reconciliation is open" : `${liveReq!.id} is running` };
  const open = p.proposals.filter((x: any) => x.status === "open").length;
  if (open) return { mode: "decide", why: `${open} open proposal${open > 1 ? "s wait" : " waits"} for a ruling` };
  if (p.run.verdict) return { mode: "complete", why: `the run is settled: ${p.run.verdict}` };
  if (p.run.ready && i.settlementReachable) return { mode: "complete", why: "settlement is reachable; whether to settle is yours to weigh" };
  const review = rq.find((r) => r.status === "ready_for_review");
  if (review) return { mode: "verify", why: `${review.id} is ready for your review` };
  if (p.artifacts.length || p.blockers.length) return { mode: "verify", why: p.blockers.length ? `${p.blockers.length} blocker${p.blockers.length > 1 ? "s" : ""} stand${p.blockers.length > 1 ? "" : "s"} between here and the gate` : "artifacts exist; check what they rest on" };
  return { mode: "orient", why: "nothing is running; here is the destination and the next move" };
}

const table = (id: string, source: string, columns: any[], extra: any = {}) => ({ type: "table", id, source, columns, ...extra });
const SV = [{ field: "mark", label: "·" }, { field: "check" }, { field: "result", kind: "status" }, { field: "evidence" }];
const contract = () => table("contract", "work:contract?stage=current", [{ field: "field", label: "Task contract" }, { field: "value" }, { field: "basis", kind: "status" }], { select: false, title: "Task contract" });
const moves = (title = "What can be done now") => table("moves", "case:affordances", [{ field: "label", label: "move" }, { field: "why" }, { field: "needs", label: "requires" }, { field: "cost" }, { field: "authority" }, { field: "evidence", label: "how we will know" }], { group: "lane", title });
const caps = (title = "Capabilities in play: capability, implementation, executor") => table("caps", "work:capabilities", [{ field: "capability", kind: "ref" }, { field: "status", kind: "status" }, { field: "implementation" }, { field: "executor" }, { field: "found", kind: "status" }, { field: "warning" }], { title });
const stagesT = () => table("stages", "work:workflow", [{ field: "stage" }, { field: "status", kind: "status" }, { field: "why", label: "now" }], { select: false, title: "Workflow" });
const requestsT = (q: string, title: string) => table("requests", `work:requests?${q}`, [{ field: "id", label: "request" }, { field: "text" }, { field: "status", kind: "status" }, { field: "next" }], { select: false, title });

export function screenOf(i: ScreenIn): Screen {
  const { mode, why } = modeOf(i); const p = i.proj; const has = (s: RequestRow["status"][]) => i.requests.some((r) => s.includes(r.status));
  const blocks: any[] = [];
  switch (mode) {
    case "orient":
      blocks.push(table("state", "case:state", [{ field: "part", label: "question" }, { field: "answer" }, { field: "signal", kind: "status" }], { select: false, title: "Where we are trying to go" }), contract(), { type: "graph", id: "flow", title: "The workflow", source: "graph:workflow", direction: "LR" }, caps(), moves());
      break;
    case "execute":
      blocks.push({ type: "progress", id: "run", label: "Run", source: "run" }, stagesT(), contract());
      if (has(["queued", "acknowledged", "running", "produced"])) blocks.push(requestsT("active=1", "Work requests in flight"));
      blocks.push(moves("The next reachable move"));
      break;
    case "decide": {
      blocks.push({ type: "callout", id: "decision", tone: "warning", title: "Needs you", text: `${why}. One thing at a time: answer it, or say what to do instead in the Work Terminal.` });
      blocks.push(table("waiting", "work:waiting", [{ field: "kind" }, { field: "what" }, { field: "how", label: "how to answer" }], { title: "What is waiting for you" }));
      if (p.proposals.some((x: any) => x.status === "open")) blocks.push({ type: "entity", id: "detail", follow: "waiting", show: ["consequence", "sources", "actions"] });
      blocks.push(contract(), moves("Alternatives and their cost"));
      break;
    }
    case "verify":
      blocks.push(table("ledger", "work:ledger", SV, { group: "section", select: true, title: "Evidence ledger. Unknown stays unknown" }));
      if (p.blockers.length) blocks.push(table("blockers", "pa:blockers", [{ field: "code" }, { field: "text" }, { field: "fix" }], { select: false, title: "What blocks acceptance" }));
      blocks.push(table("arts", "pa:artifacts", [{ field: "id", label: "artifact", kind: "ref" }, { field: "lens" }, { field: "built", label: "built@", kind: "number" }, { field: "status", kind: "status" }], { title: "Artifacts" }));
      if (has(["produced", "ready_for_review"])) blocks.push(requestsT("review=1", "Work waiting for your review"));
      if (p.artifacts.some((a) => a.status === "stale")) blocks.push({ type: "graph", id: "why", title: "Why stale", source: "graph:staleness", direction: "LR" });
      blocks.push(contract());
      break;
    case "complete":
      blocks.push({ type: "callout", id: "verdict", tone: p.run.verdict === "go" ? "ok" : p.run.verdict ? "warning" : "note", title: p.run.verdict ? `Settled: ${p.run.verdict}` : "Settlement is reachable", text: p.run.verdict ? "The process recorded this verdict. What follows is what it rested on and what can be reused." : "The engine's conditions hold. That is not advice to stop: whether to settle now is your judgement, and optional work below may still be worth doing." });
      blocks.push(table("ledger", "work:ledger", SV, { group: "section", select: true, title: "Evidence closure" }), table("arts", "pa:artifacts", [{ field: "id", label: "artifact", kind: "ref" }, { field: "lens" }, { field: "built", label: "built@", kind: "number" }, { field: "status", kind: "status" }], { title: "Artifacts" }), moves("Optional remaining moves"), stagesT(), caps("Reusable: the capabilities, implementations, and executors this run used"));
      break;
  }
  const label = { orient: "ORIENT", execute: "EXECUTE", decide: "DECIDE", verify: "VERIFY", complete: "COMPLETE" }[mode];
  const intent = ({ orient: "inspect", execute: "monitor", decide: "decide", verify: "verify", complete: "inspect" } as const)[mode];
  return { mode, why, surface: { id: WORKBENCH_ID, title: "Workbench", summary: `${label}: ${why}`.slice(0, 240), intent, layout: "stack", blocks } as Surface };
}
export { SCREEN_MODES };

// ---- the other work views: a handful of fixed compositions, opened by the terminal or the palette ------------------------------------------------
export function workflowSurface(): Surface {
  return { id: "workflow", title: "Workflow", summary: "The real stages and the lens dependency waves, read from the run. It runs nothing.", intent: "monitor", layout: "stack", blocks: [
    { type: "graph", id: "flow", source: "graph:workflow", direction: "LR" }, stagesT() ] } as Surface;
}
export function capabilitiesSurface(capability?: string): Surface {
  const blocks: any[] = [table("caps", "work:capabilities?scope=all", [{ field: "capability", kind: "ref" }, { field: "category" }, { field: "status", kind: "status" }, { field: "needs" }, { field: "implementation" }, { field: "alternatives" }, { field: "executor" }, { field: "found", kind: "status" }, { field: "warning" }], { title: "Capabilities (lenses). Package names are implementations, not the capability" })];
  blocks.push(table("layers", `work:layers${capability ? `?capability=${capability}` : ""}`, [{ field: "layer" }, { field: "name" }, { field: "detail" }, { field: "state", kind: "status" }, { field: "basis" }], { select: false, title: "Capability, implementation, executor" }));
  return { id: "capabilities", title: "Capabilities", summary: "What kind of work, what realises it, and who runs it. unknown is not usable.", intent: "inspect", layout: "stack", blocks } as Surface;
}
export function contractSurface(stage = "current"): Surface {
  return { id: "contract", title: "Task contract", summary: "Context, goal, skills, authority, executors, budget, invariants, and acceptance for a stage. Unknown is valid.", intent: "inspect", layout: "stack", blocks: [
    table("contract", `work:contract?stage=${stage}`, [{ field: "field", label: "field" }, { field: "value" }, { field: "basis", kind: "status" }], { select: false }), stagesT() ] } as Surface;
}
export function requestsSurface(): Surface {
  return { id: "requests", title: "Work requests", summary: "What you asked for. A request is queued until an executor acknowledges it; typing does not run anything.", intent: "monitor", layout: "stack", blocks: [
    table("requests", "work:requests", [{ field: "id", label: "request" }, { field: "text" }, { field: "status", kind: "status" }, { field: "capability" }, { field: "refs" }, { field: "next" }], { select: false, title: "Work requests" }) ] } as Surface;
}
export function reviewSurface(): Surface {
  return { id: "review", title: "Review", summary: "What the run records as evidence, what it does not, and what is waiting for you to accept.", intent: "verify", layout: "stack", blocks: [
    table("ledger", "work:ledger", SV, { group: "section", title: "Evidence ledger. Unknown stays unknown" }), requestsT("review=1", "Work waiting for your review"), table("arts", "pa:artifacts", [{ field: "id", label: "artifact", kind: "ref" }, { field: "lens" }, { field: "built", label: "built@", kind: "number" }, { field: "status", kind: "status" }], { title: "Artifacts" }) ] } as Surface;
}
