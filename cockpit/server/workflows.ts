// The actualization workflow, projected. This is not a workflow engine: `hooks/src/process.mjs` runs the process, and every status below is a
// pure function of the run projection (Proj). The same run always yields the same stages, and a stage never records that it happened.
// Identity lives in the dependency and acceptance structure (the stages, the lens `needs` graph, the gate), not in any model or package.
import type { Proj } from "./project";

export const WORKFLOW_ID = "actualize-product";
export const WORKFLOW_VERSION = 1;
export type StageStatus = "done" | "current" | "attention" | "ready" | "pending";
export type Stage = { id: string; n: number; title: string; purpose: string; actor: "agent" | "router" | "owner"; accepts: string; status: StageStatus; why: string };

// The stage definitions follow the process in AGENTS.md: classify, build the model, select lenses, run dependency waves, reconcile (again as
// needed), rebuild what went stale, check readiness, review the gate, then the owner accepts, defers, or rules no-go.
const DEF: { id: string; title: string; purpose: string; actor: Stage["actor"]; accepts: string }[] = [
  { id: "classify", title: "Classify Evidence", purpose: "Sort what exists (repo, hardware, media, docs) so the right lenses can be chosen.", actor: "agent", accepts: "Every kind of evidence present is named; nothing is assumed." },
  { id: "model", title: "Build / Update Product Model", purpose: "Reconcile findings into the one shared Product Model.", actor: "router", accepts: "A valid model exists and changes only in a reconciliation." },
  { id: "select", title: "Select Capabilities / Lenses", purpose: "Choose which lenses this goal and evidence need, with a reason for each exclusion.", actor: "agent", accepts: "A selection is recorded with reasons for what was left out." },
  { id: "waves", title: "Execute Dependency Waves", purpose: "Run the selected lenses in the order their `needs` allow.", actor: "agent", accepts: "Every selected lens has run and its output is reconciled." },
  { id: "reconcile", title: "Reconcile", purpose: "Rule on every proposal and write the result into the model, with a reason.", actor: "router", accepts: "No open proposals, no unreconciled lens output, no unrouted owner response." },
  { id: "rebuild", title: "Rebuild Stale Work", purpose: "Re-run the owning lens for any artifact a decision made stale.", actor: "agent", accepts: "No artifact is stale or invalid." },
  { id: "readiness", title: "Release Readiness", purpose: "Run the whole to verify it is true, current, coherent, and launchable.", actor: "agent", accepts: "The release gate is built from the current model version." },
  { id: "review", title: "Review / Gate", purpose: "The owner looks at what blocks stopping and what the verdict rests on.", actor: "owner", accepts: "No blockers remain and no owner input is outstanding." },
  { id: "settle", title: "Accept / Defer / No-Go", purpose: "The owner settles the run. Reachable is not the same as ready to settle.", actor: "owner", accepts: "A verdict is recorded by the process." },
];

export function workflowOf(p: Proj) {
  const codes = new Set(p.blockers.map((b) => b.code));
  const sel = p.selection, hasRun = !!p.run.goal;
  const blockerText = (...c: string[]) => p.blockers.find((b) => c.includes(b.code))?.text ?? "";
  const lens = (n: string) => p.lenses.find((l) => l.name === n);
  const ready = p.lenses.filter((l) => l.status === "ready").map((l) => l.name);
  const gateArt = p.artifacts.find((a) => a.isGate);
  const waves = p.waves, active = p.run.activeLenses;
  const S: Record<string, [StageStatus, string]> = {};
  S.classify = !hasRun ? ["pending", "no run has begun"] : sel ? ["done", "evidence classified; lenses selected"] : ["current", "classify the evidence, then select lenses"];
  S.model = p.run.modelVersion > 0 ? ["done", `model@${p.run.modelVersion}`] : sel ? ["current", "the model is built by the first reconciliation"] : ["pending", "waits for a lens selection"];
  S.select = sel ? ["done", `${sel.lenses.length} selected, ${Object.keys(sel.excluded).length} excluded with reasons`] : ["pending", hasRun ? "waits for classification" : "no run has begun"];
  S.waves = !sel ? ["pending", "waits for a lens selection"]
    : active.length || waves.some((w) => w.status === "running") ? ["current", active.length ? `running: ${active.join(", ")}` : "a wave is in progress"]
    : waves.length && waves.every((w) => w.status === "done") && !ready.length ? ["done", `${waves.length} wave(s) complete`]
    : ready.length ? ["ready", `can start: ${ready.join(", ")}`] : ["pending", "waiting on lenses the waves depend on"];
  S.reconcile = p.run.phase === "reconcile" ? ["current", "a reconciliation is open"]
    : codes.has("unreconciled") || codes.has("proposals-open") || codes.has("reconcile-open") || codes.has("inbox") ? ["attention", blockerText("unreconciled", "proposals-open", "reconcile-open", "inbox")]
    : p.run.modelVersion > 0 ? ["done", "nothing waits to be reconciled"] : ["pending", "no lens output yet"];
  S.rebuild = codes.has("stale") || codes.has("artifact-invalid") ? ["attention", blockerText("stale", "artifact-invalid")]
    : p.artifacts.length ? ["done", "no artifact is stale"] : ["pending", "no artifact yet"];
  const rr = lens("release-readiness");
  S.readiness = gateArt && !codes.has("gate-stale") && !codes.has("no-gate") ? ["done", `gate built from model@${gateArt.built}`]
    : rr?.status === "running" ? ["current", "release-readiness is running"]
    : sel && rr && rr.status === "ready" ? ["ready", "release-readiness can run"] : ["pending", codes.has("gate-stale") ? blockerText("gate-stale") : "the gate is built last"];
  const working = active.length > 0 || p.run.phase === "reconcile";
  S.review = p.run.paused ? ["attention", `paused for you: ${p.run.paused}`]
    : p.run.ready ? ["done", "no blockers"]
    : working || !sel ? ["pending", "waits for the running work"]
    : S.readiness[0] === "done" && p.blockers.length ? ["attention", `${p.blockers.length} blocker(s): ${p.blockers[0].text}`.slice(0, 160)] : ["pending", "waits for the gate"];
  S.settle = p.run.verdict ? ["done", `verdict: ${p.run.verdict}`] : p.run.ready ? ["ready", "settlement is reachable; whether to settle is yours to weigh"] : ["pending", "not reachable yet"];

  const stages: Stage[] = DEF.map((d, i) => ({ ...d, n: i + 1, status: S[d.id][0], why: S[d.id][1] }));
  const current = (stages.find((s) => s.status === "current") ?? stages.find((s) => s.status === "attention") ?? stages.find((s) => s.status === "ready") ?? stages.find((s) => s.status === "pending") ?? stages[stages.length - 1]).id;
  return { id: WORKFLOW_ID, name: "Actualize a product", version: WORKFLOW_VERSION, stages, current, hasRun };
}
export type Workflow = ReturnType<typeof workflowOf>;

const TONE: Record<string, string> = { done: "ok", current: "warning", attention: "danger", ready: "neutral", pending: "unknown" };
const LENS_TONE: Record<string, string> = { done: "ok", satisfied: "ok", running: "warning", ready: "neutral", waiting: "unknown", stale: "danger" };

// Stages in a chain, with the real lens `needs` graph inside "Execute Dependency Waves", and reconcile feeding back into it.
export function workflowGraph(p: Proj) {
  const w = workflowOf(p);
  const nodes: any[] = w.stages.map((s) => ({ id: `s:${s.id}`, label: `${s.n}. ${s.title}`.slice(0, 60), kind: "stage", tone: TONE[s.status] }));
  const edges: any[] = w.stages.slice(1).map((s, i) => ({ from: `s:${w.stages[i].id}`, to: `s:${s.id}` }));
  edges.push({ from: "s:reconcile", to: "s:waves", label: "again, as needed" });
  const sel = p.selection;
  if (sel) {
    const inGraph = new Set([...sel.lenses, ...sel.satisfied]);
    const picked = p.lenses.filter((l) => inGraph.has(l.name));
    for (const l of picked) nodes.push({ id: `l:${l.name}`, label: l.name, kind: "lens", tone: LENS_TONE[l.status] ?? "neutral", ref: `lens:${l.name}` });
    for (const l of picked) {
      const needs = (l.needs as string[]).filter((d) => inGraph.has(d));
      for (const d of needs) edges.push({ from: `l:${d}`, to: `l:${l.name}`, label: "needs" });
      if (!needs.length && sel.lenses.includes(l.name)) edges.push({ from: "s:waves", to: `l:${l.name}` });
    }
  }
  return { nodes, edges };
}

// ---- the task contract: Context | Goal | Skills | Authority | Executors | Budget | Invariants | Acceptance -----------------------------------
// Derived from the run, with the owner's declared budget and invariants layered on. An unknown field says unknown; nothing is invented.
export type ContractField = { field: string; value: string; basis: "derived" | "declared" | "unknown" };
export type ContractIn = { stage: Workflow["stages"][number]; proj: Proj; skills: string[]; executors: string[]; primary?: { label: string; authority: string } | null; declared?: { budget: { minutes?: number; lensRuns?: number; note?: string }; invariants: string[] } | null; agentSeen?: string | null };

export function observedBudget(p: Proj) {
  const starts = new Map<string, number>(); let ms = 0, runs = 0;
  for (const e of p.log) {
    if (e.type === "lens_start") starts.set(e.lens, Date.parse(e.ts));
    if (e.type === "lens_done" && starts.has(e.lens)) { runs++; const d = Date.parse(e.ts) - starts.get(e.lens)!; if (Number.isFinite(d) && d > 0) ms += d; starts.delete(e.lens); }
  }
  return { lensRuns: runs, minutes: Math.round(ms / 60000) };
}

export function contractOf(i: ContractIn): ContractField[] {
  const { stage, proj: p } = i; const out: ContractField[] = [];
  const f = (field: string, value: string, basis: ContractField["basis"] = "derived") => out.push({ field, value: value || "unknown", basis: value ? basis : "unknown" });
  f("Context", p.run.goal ? `${p.run.goal} (bar: ${p.run.bar}; model@${p.run.modelVersion}; ${stage.title})` : "no run has begun");
  f("Goal", `${stage.purpose}${stage.status === "current" || stage.status === "attention" || stage.status === "ready" ? ` Now: ${stage.why.replace(/\.$/, "")}.` : ""}`);
  f("Skills", i.skills.length ? i.skills.join(", ") : stage.actor === "owner" ? "none: this stage is the owner's judgment" : "none named for this stage");
  f("Authority", `${stage.actor === "agent" ? "the agent works inside the process" : stage.actor === "router" ? "the router settles the model; the agent proposes" : "the owner decides"}${i.primary ? `; next move: ${i.primary.label} (${i.primary.authority})` : ""}`);
  f("Executors", `${i.executors.join(", ") || "current agent or tool"}${i.agentSeen ? ` (an agent last called the cockpit ${i.agentSeen})` : " (no agent has called the cockpit this session)"}`);
  const ob = observedBudget(p); const d = i.declared?.budget ?? {};
  const decl = [d.minutes ? `${d.minutes} min` : "", d.lensRuns ? `${d.lensRuns} lens runs` : "", d.note ?? ""].filter(Boolean).join(", ");
  f("Budget", `${decl ? `declared: ${decl}` : "declared: none"}; observed: ${ob.lensRuns} lens run(s), ${ob.minutes} min in the log. Model cost is not recorded.`, decl ? "declared" : "derived");
  const inv = ["The Product Model changes only in a reconciliation", "Public copy may cite only OBSERVED or VERIFIED claims", "Only the owner rules, answers, and settles", ...(i.declared?.invariants ?? [])];
  f("Invariants", inv.join("; "), i.declared?.invariants?.length ? "declared" : "derived");
  f("Acceptance", stage.accepts);
  return out;
}
