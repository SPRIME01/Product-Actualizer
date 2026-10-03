// The Case: a bounded, derived view of the world around one present purpose, and the field of moves that can be made in it.
//
//   destination -> where we are -> the material deviation -> what can actually be done now -> what it costs and requires -> what will show it worked
//
// Nothing here is stored and nothing here acts. A Case is a pure function of the run files: the goal and bar in the run state, the Product Model,
// proposals, evidence, the engine's own blockers, the inbox, the log. Delete the cockpit and the same Case comes back, because the cockpit never
// held it. An affordance is a move that is visible, reachable, payable, governable, recoverable, and settleable; a move that fails any of those is
// listed as blocked with the condition that blocks it, never offered as available. Evidence wins salience: a contradiction outranks the owner's
// wish, and the one move marked primary is only ever a move that can be made now. It is guidance. It decides nothing and runs nothing.
import { caseAnchor, caseId, parseRef } from "../protocol/refs";
import { worldId } from "../protocol/world";
import { graphOf, worldReach, why as whyRef, counterfactual, type WorldEnv } from "./world";
import { decisionStates, experiments, patterns, prior, type Experiment } from "./learn";

const short = (s: string, n = 110) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const PUBLIC = new Set(["OBSERVED", "VERIFIED"]);

export type Severity = "interrupt" | "salient" | "quiet";
export type Deviation = { key: string; kind: "contradiction" | "integrity" | "blocker" | "authority" | "unknown" | "unmeasured" | "unfrozen" | "candidate"; severity: Severity; text: string; ref?: string };
export type Cond = { kind: "engine" | "evidence" | "measurement" | "owner" | "optional"; text: string; ref?: string };
export type Lane = "next move" | "choose" | "alternatives" | "blocked";
export type Affordance = {
  id: string; op: string; label: string; ref?: string; resolves?: string;
  status: "available" | "blocked"; lane: Lane; primary: boolean;
  why: string; advances: string;
  requires: { what: string; met: boolean; ref?: string }[]; blockedBy: { text: string; ref?: string }[];
  reach: { capability: string; provider: string; status: string; next: string } | null;
  payment: { kind: string; estimate: string; basis: "derived" | "unknown" };
  authority: "agent" | "owner" | "router";
  recovery: string; evidence: string; enables: string[]; prior: string[]; command?: string; mutates: boolean;
};

// ---- payment: what a move has cost before, from the log, or "unknown" -------------------------------------------------------------
function typicalMinutes(log: any[], lens: string): string | null {
  const starts = new Map<string, number>(); const spans: number[] = [];
  for (const e of log) {
    if (e.lens !== lens) continue;
    if (e.type === "lens_start") starts.set(lens, Date.parse(e.ts));
    if (e.type === "lens_done" && starts.has(lens)) { spans.push(Date.parse(e.ts) - starts.get(lens)!); starts.delete(lens); }
  }
  const ok = spans.filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b);
  if (!ok.length) return null;
  const med = ok[Math.floor(ok.length / 2)] / 60000;
  return `${med < 1 ? "under a minute" : `~${Math.round(med)} min`} (median of ${ok.length} earlier run${ok.length > 1 ? "s" : ""})`;
}
const PAY_UNKNOWN = (kind: string) => ({ kind, estimate: "unknown", basis: "unknown" as const });

// ---- what a Case is anchored on, and what it is for ------------------------------------------------------------------------------
type Anchor = { kind: string; ref: string | null; label: string };

function purposeOf(W: WorldEnv, a: Anchor): { text: string; bar?: string; declaredBy: string; basis: "recorded" | "derived" | "unavailable" } {
  const p = W.proj;
  switch (a.kind) {
    case "run": case "gate": return { text: p.run.goal || "(no goal recorded for this run)", bar: p.run.bar || undefined, declaredBy: p.run.goal ? "the owner, when the run began" : "nobody: the run has no recorded goal", basis: p.run.goal ? "recorded" : "unavailable" };
    case "opportunity": { const o = p.opportunities.find((x: any) => x.id === a.ref!.split(":")[1]); const c = p.criteria.find((x: any) => x.id === o?.basis); return { text: c ? `${c.statement}` : o ? `make better progress on ${o.basis}: ${o.deficiency}` : a.label, declaredBy: "the Product Model (settled by the router)", basis: "recorded" }; }
    case "criterion": { const c = p.criteria.find((x: any) => x.id === a.ref!.split(":")[1]); return { text: c?.statement ?? a.label, declaredBy: "the Product Model (settled by the router)", basis: "recorded" }; }
    case "job": { const j = p.jobs.find((x: any) => x.id === a.ref!.split(":")[1]); return { text: j?.job ?? a.label, declaredBy: "the Product Model (settled by the router)", basis: "recorded" }; }
    case "claim": return { text: `know whether this is true: ${a.label}`, declaredBy: "derived: a claim is useful when public copy can cite it", basis: "derived" };
    case "unknown": return { text: `answer: ${a.label}`, declaredBy: "the Unknowns table", basis: "recorded" };
    case "proposal": return { text: `decide this candidate: ${a.label}`, declaredBy: "proposals.md", basis: "recorded" };
    case "evidence": return { text: `learn whether: ${a.label}`, declaredBy: "the experiment's hypothesis", basis: "recorded" };
    default: return { text: a.label, declaredBy: "derived", basis: "derived" };
  }
}

function anchorOf(W: WorldEnv, id: string): Anchor | string {
  const a = caseAnchor(id);
  if (!a) return `case:${id} is not a Case anchor. Use run, OP<n>, S<n>, J<n>, C<n>, U<n>, P<n>, or evidence/<lens>/<file>`;
  const p = W.proj;
  if (a.kind === "run" || a.kind === "gate") return { kind: "run", ref: null, label: p.run.goal || p.run.product };
  const r = parseRef(a.ref!)!;
  const found = (xs: any[], key = "id") => xs.find((x) => x[key] === r.id);
  switch (r.kind) {
    case "opportunity": { const o = found(p.opportunities); return o ? { kind: "opportunity", ref: a.ref, label: o.deficiency } : `${a.ref} does not exist in this run`; }
    case "criterion": { const c = found(p.criteria); return c ? { kind: "criterion", ref: a.ref, label: c.statement } : `${a.ref} does not exist in this run`; }
    case "job": { const j = found(p.jobs); return j ? { kind: "job", ref: a.ref, label: j.job } : `${a.ref} does not exist in this run`; }
    case "claim": { const c = found(p.claims); return c ? { kind: "claim", ref: a.ref, label: c.text } : `${a.ref} does not exist in this run`; }
    case "unknown": { const u = found(p.unknowns); return u ? { kind: "unknown", ref: a.ref, label: u.question } : `${a.ref} does not exist in this run`; }
    case "proposal": { const x = found(p.proposals); return x ? { kind: "proposal", ref: a.ref, label: x.proposal } : `${a.ref} does not exist in this run`; }
    case "evidence": { const e = experiments(W).find((x) => x.id === r.id); return e ? { kind: "evidence", ref: a.ref, label: e.hypothesis || e.name } : `${a.ref} is not an experiment (no \`experiment:\` head in the file), so it has no Case`; }
    default: return `no Case is anchored on a ${r.kind}`;
  }
}

// ---- the run's own Case ---------------------------------------------------------------------------------------------------------------
const INTEGRITY = new Set(["model-tampered", "model-invalid", "model-missing", "artifact-invalid"]);
const OWNER_BLOCKS = new Set(["inbox", "proposals-open"]);

function reachMove(W: WorldEnv, ref: string, label: string, why: string, advances: string, resolves?: string, evidence = "an observation that grades the claim, or answers the unknown", enables: string[] = []): Affordance[] {
  const r: any = worldReach(W, { ref });
  if (!r.ok || !r.rows?.length) return [];
  const best = new Map<string, any>();
  for (const row of r.rows) { const cur = best.get(row.capability); const rank = { usable: 0, unproven: 1, blocked: 2 } as any; if (!cur || rank[row.status] < rank[cur.status] || (rank[row.status] === rank[cur.status] && row.tier < cur.tier)) best.set(row.capability, row); }
  const out: Affordance[] = [];
  for (const [cap, row] of best) {
    const blocked = row.status === "blocked"; const owner = row.provider === "owner" || row.capability === "owner.attest";
    out.push({
      id: `reach:${cap}:${ref}`, op: `observe.${cap}`, label: `${label} (${cap}${owner ? ", ask the owner" : ""})`, ref, resolves,
      status: blocked ? "blocked" : "available", lane: "alternatives", primary: false, why, advances,
      requires: [{ what: `provider ${row.provider} is ${row.status}`, met: !blocked, ref: undefined }], blockedBy: blocked ? [{ text: `${row.provider}: ${row.next}` }] : [],
      reach: { capability: cap, provider: row.provider, status: row.status, next: row.next },
      payment: owner ? { kind: "owner attention", estimate: "unknown", basis: "unknown" } : PAY_UNKNOWN("external lookup"),
      authority: owner ? "owner" : "agent", recovery: "reversible: an observation adds evidence and changes no model", evidence, enables, prior: [], mutates: false,
    });
  }
  return out;
}

function successorsOf(W: WorldEnv, ref: string | null): string[] {
  if (!ref) return [];
  const g = graphOf(W); const out: string[] = [];
  for (const e of g.edges) if (e.from === ref && /^(artifact|claim|opportunity|proposal|job|criterion):/.test(e.to) && !/made stale|touched/.test(e.rel)) {
    const n = g.nodes.get(e.to); if (n) out.push(`${e.to} (${e.rel})`);
  }
  return out.slice(0, 4);
}

function runCase(W: WorldEnv) {
  const p = W.proj; const devs: Deviation[] = []; const moves: Affordance[] = []; const required: Cond[] = []; const optional: Cond[] = [];
  const lensOf = (n: string) => p.lenses.find((l: any) => l.name === n);
  // A lens may be (re)started when its needs have all completed and it is ready, stale, or done and pointed at by a stale or invalid artifact.
  // The engine decides the same thing in readyLenses; this restates it with the reason a move is blocked.
  const lensMove = (lens: string, why: string, resolves: string, id = `lens.start:${lens}`): Affordance => {
    const l = lensOf(lens); const needMet = (d: string) => ["done", "stale", "satisfied"].includes(lensOf(d)?.status);
    const unmet = (l?.needs ?? []).filter((d: string) => !needMet(d));
    const running = l?.status === "running"; const startable = ["ready", "stale", "done"].includes(l?.status ?? "");
    const blocked = !running && (!startable || unmet.length > 0);
    const successors = p.lenses.filter((x: any) => (x.needs ?? []).includes(lens) && x.status !== "excluded" && x.status !== "unselected").map((x: any) => `lens:${x.name} becomes reachable`);
    return {
      id, op: "lens.start", label: running ? `Finish lens ${lens}` : `Run lens ${lens}`, ref: `lens:${lens}`, resolves, status: blocked ? "blocked" : "available", lane: "alternatives", primary: false, why, advances: "the gate's evidence",
      requires: (l?.needs ?? []).map((d: string) => ({ what: `lens ${d} has completed`, met: needMet(d), ref: `lens:${d}` })),
      blockedBy: blocked ? (unmet.length ? unmet.map((d: string) => ({ text: `lens ${d} has not completed (${lensOf(d)?.status ?? "unknown"})`, ref: `lens:${d}` })) : [{ text: `lens ${lens} is ${l?.status ?? "unknown"}, so it cannot start` }]) : [],
      reach: null, payment: (() => { const t = typicalMinutes(p.log, lens); return t ? { kind: "lens run", estimate: t, basis: "derived" as const } : PAY_UNKNOWN("lens run"); })(), authority: "agent",
      recovery: "reversible: writes proposals and artifacts, never the model", evidence: `lens ${lens} output as proposals and stamped artifacts`, enables: successors, prior: [], command: `actualize lens start ${lens}`, mutates: true,
    };
  };
  const runningLens = p.run.activeLenses.length > 0;

  // 1. contradictions: evidence the owner may not want, which therefore leads. One that an artifact cites is relied on, so it interrupts;
  //    one nothing cites is still recorded reality, so it stays visible, but it does not outrank what is being built on top of it.
  // Every contradiction stays a deviation; only the three that matter most get moves, so the field stays a small world.
  const contradicted = p.claims.filter((x: any) => x.grade === "CONTRADICTED").map((c: any) => ({ c, reliedOn: p.artifacts.filter((a: any) => (a.cites ?? []).includes(c.id)).map((a: any) => a.id) })).sort((x: any, y: any) => y.reliedOn.length - x.reliedOn.length);
  for (const [i, { c, reliedOn }] of contradicted.entries()) {
    if (i === 3) devs.push({ key: "contradictions:more", kind: "contradiction", severity: "quiet", text: `${contradicted.length - 3} more contradicted claim(s) are listed under claims; moves are offered for the first three` });
    const reliedOnUnused = reliedOn; p.artifacts.filter((a: any) => (a.cites ?? []).includes(c.id)).map((a: any) => a.id);
    devs.push({ key: `claim:${c.id}`, kind: "contradiction", severity: reliedOn.length ? "interrupt" : "salient", text: `${c.id} is CONTRADICTED${reliedOn.length ? ` and cited by ${reliedOn.slice(0, 2).join(", ")}` : ", and nothing cites it"}: ${short(c.text, 90)} (${short(c.source, 80)})`, ref: `claim:${c.id}` });
    if (i >= 3) continue;
    moves.push({ id: `inspect:${c.id}`, op: "inspect", label: `Inspect the contradiction in ${c.id}`, ref: `claim:${c.id}`, resolves: `claim:${c.id}`, status: "available", lane: "alternatives", primary: false,
      why: "the sources disagree; no decision downstream is sound until you see how", advances: `${c.id}`, requires: [], blockedBy: [], reach: null, payment: { kind: "reading", estimate: "unknown", basis: "unknown" }, authority: "agent",
      recovery: "none needed: reading changes nothing", evidence: "which source is right, or which observation would decide", enables: [`${c.id} can be re-graded by new evidence`], prior: [], command: `actualize world why claim:${c.id}`, mutates: false });
    moves.push(...reachMove(W, `claim:${c.id}`, `Gather evidence that decides ${c.id}`, "a contradiction is resolved only by new evidence", c.id, `claim:${c.id}`, "an observation that grades one side", successorsOf(W, `claim:${c.id}`)));
  }
  // 2. the engine's own blockers, in the engine's own order
  const seenStale = new Set<string>();
  for (const b of p.blockers) {
    const sev: Severity = INTEGRITY.has(b.code) ? "interrupt" : "salient";
    devs.push({ key: `blocker:${b.code}`, kind: INTEGRITY.has(b.code) ? "integrity" : OWNER_BLOCKS.has(b.code) ? "authority" : "blocker", severity: sev, text: b.text });
    required.push({ kind: "engine", text: b.text });
    const key = `blocker:${b.code}`;
    switch (b.code) {
      case "select": moves.push(base("select", "Select the lenses for this run", "no lens can start before a selection is recorded", key, b.fix, "agent", "reversible: a selection can be changed", "a recorded selection", ["lenses can start"])); break;
      case "lens-open": for (const n of p.run.activeLenses) moves.push({ ...lensMove(n, "a lens is running; the model cannot move until it ends", key, `lens.done:${n}`), label: `Finish lens ${n}`, command: `actualize lens done ${n}` }); break;
      case "reconcile-open": moves.push(base("reconcile.done", "Finish the open reconciliation", "the router must resolve every proposal and the model before anything else moves", key, b.fix, "router", "reversible: history/ keeps the prior model", "model version rises with logged decisions", ["stale artifacts can be rebuilt", "the gate can be rebuilt"])); break;
      case "unreconciled": case "proposals-open": {
        const n = p.proposals.filter((x: any) => x.status === "open").length;
        moves.push({ ...base("reconcile.start", b.code === "proposals-open" ? `Rule on ${n} open proposal${n > 1 ? "s" : ""}` : "Reconcile lens output into the model", b.code === "proposals-open" ? "open proposals block the gate until each is accepted or rejected with a reason" : "lens output is not yet in the model", key, b.fix, b.code === "proposals-open" ? "owner" : "router", "reversible: history/ keeps the prior model; each ruling is logged", "settled decisions and a new model version", ["stale artifacts become visible", "the gate can be rebuilt"]), status: runningLens ? "blocked" : "available", blockedBy: runningLens ? [{ text: `lens ${p.run.activeLenses.join(", ")} is still running`, ref: `lens:${p.run.activeLenses[0]}` }] : [] });
        break;
      }
      case "inbox": moves.push(base("inbox.route", "Route the owner's responses", "the owner has spoken; the router owes each response a routing", key, b.fix, "router", "reversible: routing creates proposals, not model edits", "each response acknowledged with what it became", ["the owner's decision reaches the model"])); break;
      case "lens-not-run": { const n = /lens never ran: ([\w-]+)/.exec(b.text)?.[1]; if (n) moves.push(lensMove(n, "a selected lens has not run", key)); break; }
      case "stale": case "artifact-invalid": { const a = p.artifacts.find((x: any) => b.text.includes(`artifacts/${x.id}`)); if (a && !seenStale.has(a.lens)) { seenStale.add(a.lens); moves.push(lensMove(a.lens, b.code === "stale" ? `${a.id} is stale: a decision touched what it reads` : `${a.id} fails its checks`, key, `lens.start:${a.lens}`)); } break; }
      case "no-gate": case "gate-stale": moves.push(lensMove("release-readiness", b.code === "no-gate" ? "no release gate exists" : "the gate was built from an older model", key)); break;
      case "model-tampered": moves.push(base("model.restore", "Restore the model to its last settled version", "product-model.md changed outside a reconciliation", key, b.fix, "agent", "reversible: restores history/", "the model hash matches the settled version again", [])); break;
      default: moves.push(base(`fix:${b.code}`, short(b.fix, 60), b.text, key, b.fix, "agent", "reversible", "the blocker clears", []));
    }
  }
  function base(op: string, label: string, why: string, resolves: string, command: string, authority: Affordance["authority"], recovery: string, evidence: string, enables: string[]): Affordance {
    return { id: op, op, label, resolves, status: "available", lane: "alternatives", primary: false, why, advances: "the gate", requires: [], blockedBy: [], reach: null, payment: PAY_UNKNOWN(authority === "owner" ? "owner attention" : "process step"), authority, recovery, evidence, enables, prior: [], command, mutates: true };
  }
  // the owner is needed: a response the router has not routed, or a pause
  if (p.run.paused) {
    devs.push({ key: "paused", kind: "authority", severity: "salient", text: `the run is paused for the owner: ${p.run.paused}` });
    required.push({ kind: "owner", text: `authority unavailable: the run is paused for the owner (${p.run.paused})` });
    moves.push({ id: "owner.respond", op: "owner.respond", label: "Give the run what it is waiting on", resolves: "paused", status: "available", lane: "alternatives", primary: false, why: `the run stopped to wait for the owner: ${p.run.paused}`, advances: "the declared destination", requires: [], blockedBy: [], reach: null, payment: PAY_UNKNOWN("owner attention"), authority: "owner", recovery: "none needed: answering changes nothing until the router routes it", evidence: "the owner's next message, which clears the pause", enables: ["the run can continue"], prior: [], mutates: false });
  }
  // 3. unknowns and unmeasured demand: valuable, not required by the engine
  for (const u of p.unknowns.slice(0, 6)) {
    optional.push({ kind: "optional", text: `${u.id} is open: ${short(u.question, 80)} (blocks: ${u.blocks || "nothing named"})`, ref: `unknown:${u.id}` });
    if (u.blocks) devs.push({ key: `unknown:${u.id}`, kind: "unknown", severity: "salient", text: `${u.id} is open and blocks ${u.blocks}: ${short(u.question, 80)}`, ref: `unknown:${u.id}` });
    const pr = prior(W, u.question).hits.filter((h) => h.kind === "pattern" && h.status === "supported");
    const ms = reachMove(W, `unknown:${u.id}`, `Resolve ${u.id}`, `${u.id} is open and ${u.blocks ? `blocks ${u.blocks}` : "unresolved"}`, u.id, `unknown:${u.id}`, "an observation that answers the question", successorsOf(W, `unknown:${u.id}`));
    for (const m of ms) m.prior = pr.map((h) => h.ref);
    moves.push(...ms);
  }
  for (const c of p.criteria.filter((x: any) => x.evidence !== "measured").slice(0, 4)) {
    optional.push({ kind: "optional", text: `${c.id} is not fully measured: importance ${c.importance}, satisfaction ${c.satisfaction}`, ref: `criterion:${c.id}` });
    devs.push({ key: `criterion:${c.id}`, kind: "unmeasured", severity: "salient", text: `${c.id} (${short(c.statement, 70)}) is unmeasured, so the shortfall it names has no size`, ref: `criterion:${c.id}` });
    moves.push(...reachMove(W, `criterion:${c.id}`, `Measure ${c.id}`, "importance and satisfaction are UNKNOWN: no opportunity can be sized", c.id, `criterion:${c.id}`, "a measured importance and satisfaction, each with its source", successorsOf(W, `criterion:${c.id}`)));
  }
  for (const x of experiments(W)) if (x.frozen !== "frozen" && x.state === "designed") devs.push({ key: x.ref, kind: "unfrozen", severity: "salient", text: `experiment ${x.name}: the criterion is ${x.frozen === "no-criterion" ? "missing" : "not frozen"}, so a result could not count against the hypothesis`, ref: x.ref });

  // 4. settlement. Reachable means the engine will let the run end with a verdict. It does not mean the destination was reached: a gate that
  //    says defer or no-go is a real, settleable outcome, and the destination (a go that rests on evidence) is a separate fact.
  const gateArt = p.artifacts.find((a: any) => a.isGate);
  const verdict: string | null = p.run.verdict ?? gateArt?.verdict ?? null;
  const reliedContradictions = devs.filter((d) => d.kind === "contradiction" && d.severity === "interrupt").length;
  const attained = !gateArt ? null : (verdict === "go" || verdict === "go-with-exception") && reliedContradictions === 0;
  const reachable = required.length === 0;
  const waiting = p.responses.filter((r: any) => r.status === "waiting").length;
  const settle: Affordance = {
    id: "settle", op: "settle", label: reachable ? `Settle: record the verdict${verdict ? ` (${verdict})` : ""}` : "Settle: finish the run with a verdict", resolves: "settle", status: reachable ? "available" : "blocked", lane: reachable ? "choose" : "blocked", primary: false,
    why: reachable ? (attained === false ? `every required condition holds, and the verdict is ${verdict ?? "not go"}: the run can end, but the destination is not attained` : "every required condition holds") : "required conditions remain", advances: "the declared destination",
    requires: [{ what: "no engine blocker", met: p.blockers.length === 0 }, { what: "the owner is available to accept the verdict", met: !p.run.paused && waiting === 0 }],
    blockedBy: reachable ? [] : required.slice(0, 4).map((c) => ({ text: c.text, ref: c.ref })),
    reach: null, payment: PAY_UNKNOWN("owner attention"), authority: "owner", recovery: "none: the verdict is recorded; a later run can supersede it", evidence: "a recorded verdict with the evidence walk that supports it", enables: ["a new Case can form from what remains optional"], prior: [], command: "actualize done", mutates: true,
  };
  moves.push(settle);
  return { devs, moves, required, optional, destination: { attained, verdict } };
}

// ---- opportunity / criterion / job -------------------------------------------------------------------------------------------------
function demandCase(W: WorldEnv, a: Anchor) {
  const p = W.proj; const r = parseRef(a.ref!)!; const devs: Deviation[] = []; const moves: Affordance[] = []; const required: Cond[] = []; const optional: Cond[] = [];
  const opp = r.kind === "opportunity" ? p.opportunities.find((x: any) => x.id === r.id) : null;
  const crit = r.kind === "criterion" ? p.criteria.find((x: any) => x.id === r.id) : opp ? p.criteria.find((x: any) => x.id === opp.basis) : null;
  const job = r.kind === "job" ? p.jobs.find((x: any) => x.id === r.id) : crit ? p.jobs.find((x: any) => x.id === crit.job) : opp ? p.jobs.find((x: any) => x.id === opp.basis) : null;
  if (!crit && job) {
    const has = p.criteria.some((c: any) => c.job === job.id);
    if (!has) { devs.push({ key: `job:${job.id}`, kind: "unmeasured", severity: "salient", text: `${job.id} states progress sought but no success criterion says how it is judged`, ref: `job:${job.id}` }); required.push({ kind: "measurement", text: "no success criterion states how this progress is judged", ref: `job:${job.id}` }); }
  }
  if (crit && crit.evidence !== "measured") {
    devs.push({ key: `criterion:${crit.id}`, kind: "unmeasured", severity: "salient", text: `evidence insufficient: importance ${crit.importance} and satisfaction ${crit.satisfaction} on ${crit.id}; no size, no score (UNCOMPUTED)`, ref: `criterion:${crit.id}` });
    required.push({ kind: "measurement", text: `${crit.id} needs importance and satisfaction measured, each with a source`, ref: `criterion:${crit.id}` });
    moves.push(...reachMove(W, `criterion:${crit.id}`, `Measure ${crit.id}`, "the shortfall cannot be sized until both sides are measured", opp?.id ?? crit.id, `criterion:${crit.id}`, "a measured importance and satisfaction, each with its source", opp ? [`${opp.id} can be sized`, "candidates can be compared on a measured shortfall"] : []));
  }
  if (opp) {
    if (!opp.candidates) {
      optional.push({ kind: "optional", text: `no candidate transformation names ${opp.id} yet`, ref: `opportunity:${opp.id}` });
      moves.push({ id: `candidate:${opp.id}`, op: "propose", label: `Draft a candidate that addresses ${opp.id}`, ref: `opportunity:${opp.id}`, status: "available", lane: "alternatives", primary: false, why: "an opportunity is not a solution; a candidate is one possible transformation, and several should compete", advances: opp.id, requires: [], blockedBy: [], reach: null, payment: PAY_UNKNOWN("lens run"), authority: "agent", recovery: "reversible: a proposal changes nothing until the router accepts it", evidence: "a proposal that names the opportunity and the observation that would discriminate it", enables: ["a cheap discriminating observation can be designed"], prior: [], mutates: true });
    } else {
      for (const id of String(opp.candidates).split(", ").filter(Boolean)) optional.push({ kind: "optional", text: `candidate ${id} has no frozen observation criterion yet`, ref: `proposal:${id}` });
    }
    const pr = prior(W, `${opp.deficiency} ${crit?.statement ?? ""}`).hits;
    if (pr.length) for (const m of moves) m.prior = pr.map((h) => h.ref);
  }
  const reachable = required.length === 0;
  moves.push({ id: "accept", op: "settle", label: opp ? `Take ${opp.id} as product direction` : "Settle", resolves: "settle", status: reachable ? "available" : "blocked", lane: reachable ? "choose" : "blocked", primary: false, why: reachable ? "the shortfall is measured and evidenced" : "the shortfall is not yet evidenced enough to base a direction on", advances: "product direction",
    requires: [{ what: "importance and satisfaction measured with sources", met: reachable }], blockedBy: reachable ? [] : required.map((c) => ({ text: c.text, ref: c.ref })), reach: null, payment: PAY_UNKNOWN("owner attention"), authority: "owner", recovery: "reversible: a later decision can supersede it", evidence: "a decision-log row with the evidence available at the time", enables: ["candidates can be built and observed against a measured shortfall"], prior: [], mutates: true });
  return { devs, moves, required, optional };
}

// ---- claim, unknown, proposal, experiment ---------------------------------------------------------------------------------------------
function singleCase(W: WorldEnv, a: Anchor) {
  const p = W.proj; const r = parseRef(a.ref!)!; const devs: Deviation[] = []; const moves: Affordance[] = []; const required: Cond[] = []; const optional: Cond[] = [];
  if (r.kind === "claim") {
    const c = p.claims.find((x: any) => x.id === r.id)!;
    if (c.grade === "CONTRADICTED") { devs.push({ key: a.ref!, kind: "contradiction", severity: "interrupt", text: `${c.id} is CONTRADICTED: ${short(c.source, 100)}`, ref: a.ref! }); required.push({ kind: "evidence", text: "only new evidence resolves a contradiction", ref: a.ref! }); }
    else if (!PUBLIC.has(c.grade)) { devs.push({ key: a.ref!, kind: "unknown", severity: "salient", text: `${c.id} is ${c.grade}; public copy may cite only OBSERVED or VERIFIED`, ref: a.ref! }); required.push({ kind: "evidence", text: `${c.id} needs an OBSERVED or VERIFIED source`, ref: a.ref! }); }
    moves.push(...reachMove(W, a.ref!, `Gather evidence for ${c.id}`, `it stands at ${c.grade}`, c.id, a.ref!, "an observation that grades the claim", successorsOf(W, a.ref!)));
    const pr = prior(W, c.text).hits; for (const m of moves) m.prior = pr.map((h) => h.ref);
  } else if (r.kind === "unknown") {
    const u = p.unknowns.find((x: any) => x.id === r.id)!;
    devs.push({ key: a.ref!, kind: "unknown", severity: "salient", text: `open: ${short(u.question, 100)}${u.blocks ? ` (blocks ${u.blocks})` : ""}`, ref: a.ref! }); required.push({ kind: "evidence", text: "an observation that answers it", ref: a.ref! });
    moves.push(...reachMove(W, a.ref!, `Resolve ${u.id}`, "the question is open", u.id, a.ref!, "an observation that answers the question", successorsOf(W, a.ref!)));
    const pr = prior(W, u.question).hits; for (const m of moves) m.prior = pr.map((h) => h.ref);
  } else if (r.kind === "proposal") {
    const x = p.proposals.find((y: any) => y.id === r.id)!;
    const cf: any = counterfactual(W, a.ref!);
    const obs = cf.ok ? cf.effects.filter((e: any) => e.class === "observation-required") : [];
    if (x.status === "open") devs.push({ key: a.ref!, kind: "candidate", severity: "salient", text: `${x.id} is a candidate, not truth: it waits for a reconciliation`, ref: a.ref! });
    for (const e of obs) optional.push({ kind: "optional", text: short(e.effect, 120), ref: e.subject });
    moves.push({ id: `preview:${x.id}`, op: "world.counterfactual", label: `Preview ${x.id} without applying it`, ref: a.ref!, resolves: a.ref!, status: "available", lane: "alternatives", primary: false, why: "see what accepting it would change, derived or merely expected", advances: x.id, requires: [], blockedBy: [], reach: null, payment: { kind: "reading", estimate: "unknown", basis: "unknown" }, authority: "agent", recovery: "none needed: a preview applies nothing", evidence: "known, derived, expected, unknown, and observation-required effects", enables: ["a ruling made with the consequences in view"], prior: [], command: `actualize world counterfactual ${a.ref}`, mutates: false });
    moves.push({ id: `rule:${x.id}`, op: "rule", label: `Rule on ${x.id}`, ref: a.ref!, resolves: "settle", status: x.status === "open" ? "available" : "blocked", lane: x.status === "open" ? "choose" : "blocked", primary: false, why: "only the owner's ruling, routed by the router, settles a candidate", advances: x.id, requires: [{ what: "the proposal is open", met: x.status === "open" }], blockedBy: x.status === "open" ? [] : [{ text: `already ${x.status}` }], reach: null, payment: PAY_UNKNOWN("owner attention"), authority: "owner", recovery: "reversible: history/ keeps the prior model", evidence: "a decision-log row or a reasoned rejection", enables: ["the model version rises and dependants are re-evaluated"], prior: [], mutates: true });
  }
  const reachable = required.length === 0;
  return { devs, moves, required, optional, reachable };
}

function experimentCase(W: WorldEnv, a: Anchor) {
  const e = experiments(W).find((x) => `evidence:${x.id}` === a.ref)!; const devs: Deviation[] = []; const moves: Affordance[] = []; const required: Cond[] = []; const optional: Cond[] = [];
  if (e.frozen !== "frozen") { devs.push({ key: e.ref, kind: "unfrozen", severity: "salient", text: `the criterion is ${e.frozen}: write \`frozen: ${e.observer ?? "<observer id>"}\` before the intervention`, ref: e.ref }); required.push({ kind: "evidence", text: "the observation criterion must be frozen before the result", ref: e.ref }); }
  if (e.ordering === "results-first") { devs.push({ key: `${e.ref}#order`, kind: "unfrozen", severity: "interrupt", text: "git shows result rows were committed before the criterion was frozen", ref: e.ref }); required.push({ kind: "evidence", text: "results were written before the criterion was frozen", ref: e.ref }); }
  if (e.state === "designed") required.push({ kind: "evidence", text: "no result rows have been observed yet", ref: e.ref });
  if (e.direction === "contradicts") devs.push({ key: `${e.ref}#result`, kind: "contradiction", severity: "interrupt", text: `the frozen criterion failed: the hypothesis is contradicted here (${e.selected} row(s))`, ref: e.ref });
  if (e.state === "observed") optional.push({ kind: "optional", text: `replicate in another setting: one result is an outcome, not a durable learning (settings so far: ${e.scope || "unrecorded"})`, ref: e.ref });
  moves.push({ id: `replay:${e.id}`, op: "world.replay", label: "Run the frozen criterion over the recorded result", ref: e.ref, resolves: e.ref, status: e.observer ? "available" : "blocked", lane: "alternatives", primary: false, why: "see whether the recorded rows satisfy what was predicted", advances: e.name, requires: [{ what: "an observation criterion exists", met: !!e.observer }], blockedBy: e.observer ? [] : [{ text: "no `expect:` in the experiment head" }], reach: null, payment: { kind: "local read", estimate: "instant", basis: "derived" }, authority: "agent", recovery: "none needed: replay is a read", evidence: "which rows pass and which fail; it settles nothing", enables: ["the result can be cited by a pattern claim"], prior: [], command: `actualize world replay --selects file:evidence/${e.id}#table1`, mutates: false });
  const pr = prior(W, e.hypothesis).hits.filter((h) => h.ref !== e.ref); if (pr.length) for (const m of moves) m.prior = pr.map((h) => h.ref);
  return { devs, moves, required, optional };
}

// ---- the Case ------------------------------------------------------------------------------------------------------------------------
const SEV = { interrupt: 0, salient: 1, quiet: 2 } as const;
export function caseOf(W: WorldEnv, id = "run") {
  const a = anchorOf(W, id); if (typeof a === "string") return { ok: false as const, message: a };
  const p = W.proj;
  let part: { devs: Deviation[]; moves: Affordance[]; required: Cond[]; optional: Cond[]; reachable?: boolean; destination?: { attained: boolean | null; verdict: string | null } };
  if (a.kind === "run") part = runCase(W);
  else if (["opportunity", "criterion", "job"].includes(a.kind)) part = demandCase(W, a);
  else if (a.kind === "evidence") part = experimentCase(W, a);
  else part = singleCase(W, a);
  const devs = [...part.devs].sort((x, y) => SEV[x.severity] - SEV[y.severity]);   // stable: the engine's own order survives within a class
  const material = devs[0] ?? null;
  const reachable = part.reachable ?? part.required.length === 0;

  // the one primary move: the first available one that answers the material deviation, else the first available that is not the settling move;
  // a Case with nothing required has no primary at all, because then the owner is choosing between settling and exercising optional work
  const avail = part.moves.filter((m) => m.status === "available");
  const nonSettle = avail.filter((m) => m.op !== "settle" && m.op !== "rule");
  // A primary exists when something stands between now and the destination: settlement is out of reach, or evidence (a contradiction a
  // build rests on) interrupts. A reachable Case with only optional work left has none, and says so, because that is the owner's choice.
  const needsPrimary = !reachable || material?.severity === "interrupt";
  let primary: Affordance | null = null;
  if (needsPrimary) primary = (material && nonSettle.find((m) => m.resolves === material.key)) || nonSettle.find((m) => m.mutates || m.op.startsWith("observe") || m.op === "inspect") || nonSettle[0] || null;
  for (const m of part.moves) { m.primary = m === primary; m.lane = m.status === "blocked" ? "blocked" : m === primary ? "next move" : !primary && reachable ? "choose" : "alternatives"; }
  // order the field: primary, then the rest of what is available, then what is blocked
  const rank = (m: Affordance) => (m.primary ? 0 : m.status === "available" ? (m.lane === "choose" && (m.op === "settle" || m.op === "rule") ? 1 : 2) : 3);
  const field = [...part.moves].map((m, i) => ({ m, i })).sort((x, y) => rank(x.m) - rank(y.m) || x.i - y.i).map((x) => x.m);
  // successors of the primary: the small world around the move, not a workflow map
  const settlement = {
    reachable,   // settlementReachable: every required condition holds, so the run may end with a verdict
    destinationAttained: part.destination?.attained ?? null, verdict: part.destination?.verdict ?? null,
    required: part.required, optional: part.optional.slice(0, 5), optionalCount: part.optional.length,
    // shouldSettleNow: a representation for the owner's judgment. It is never an action and never "yes".
    shouldSettleNow: { call: "owner" as const, lean: !reachable ? ("not-yet" as const) : part.optional.length || part.destination?.attained === false || material?.severity === "interrupt" ? ("weigh" as const) : ("nothing-to-weigh" as const),
      why: !reachable ? "Settling is not reachable yet, so there is nothing to weigh"
        : [part.destination?.verdict ? `It would record ${part.destination.verdict}` : "", part.destination?.attained === false ? "the destination is not attained" : "", material?.severity === "interrupt" ? "evidence the build rests on is contradicted" : "", part.optional.length ? `${part.optional.length} optional move(s) remain that settling forgoes` : ""].filter(Boolean).join("; ").replace(/^./, (c) => c.toUpperCase()) + ". Whether to settle now is your judgment" },
  };
  const ds = decisionStates(W).forCase(caseId(a.ref));
  return {
    ok: true as const, ref: `case:${caseId(a.ref)}`, id: caseId(a.ref), authoritative: false as const, derivedFrom: ["state.json (goal, bar)", "product-model.md", "proposals.md", "evidence/", "artifacts/", "inbox.jsonl", "run log"], world: worldId(p.run.modelVersion),
    anchor: a, purpose: purposeOf(W, a),
    now: nowOf(W, a),
    deviations: devs, material, field, primary: primary?.id ?? null, settlement,
    decisionStates: ds, counts: { available: field.filter((m) => m.status === "available").length, blocked: field.filter((m) => m.status === "blocked").length },
  };
}

function nowOf(W: WorldEnv, a: Anchor) {
  const p = W.proj;
  if (a.kind === "run") {
    const hi = p.claims.filter((c: any) => PUBLIC.has(c.grade)).length, lo = p.claims.length - hi;
    const stale = p.artifacts.filter((x: any) => x.status === "stale").length, open = p.proposals.filter((x: any) => x.status === "open").length;
    return { text: `model@${p.run.modelVersion}: ${p.claims.length} claims (${hi} OBSERVED or VERIFIED, ${lo} below), ${p.unknowns.length} open unknowns, ${open} open proposals, ${stale} stale artifacts; gate ${p.run.verdict ?? (p.run.ready ? "ready" : p.blockers.length ? `blocked by ${p.blockers.length}` : "open")}`, basis: "derived" as const };
  }
  if (a.kind === "opportunity") { const o = p.opportunities.find((x: any) => x.id === a.ref!.split(":")[1]); return { text: `${o.deficiency}. Evidence: ${o.evidence} (${o.grade}). Today the actor uses: ${o.alternatives || "not recorded"}. Candidates: ${o.candidates || "none"}`, basis: "recorded" as const }; }
  if (a.kind === "evidence") { const e = experiments(W).find((x) => `evidence:${x.id}` === a.ref)!; return { text: `${e.state}; criterion ${e.frozen}; result ${e.result}${e.scope ? `; setting ${e.scope}` : ""}`, basis: "derived" as const }; }
  if (a.kind === "claim") { const c = p.claims.find((x: any) => x.id === a.ref!.split(":")[1]); return { text: `${c.grade}: ${c.text}`, basis: "recorded" as const }; }
  return { text: a.label, basis: "recorded" as const };
}

// ---- why a Case is what it is -----------------------------------------------------------------------------------------------------------------
export function caseWhy(W: WorldEnv, ref: string): ReturnType<typeof whyRef> {
  const r = parseRef(ref); if (!r || r.kind !== "case") return whyRef(W, ref);
  const c = caseOf(W, r.id); if (!c.ok) return { ok: false as const, message: c.message };
  const A = (q: string, a: string, basis: "recorded" | "derived" | "unavailable", refs?: string[]) => ({ q, a, basis, ...(refs?.length ? { refs } : {}) });
  const ans = [
    A("What is it for?", c.purpose.text, c.purpose.basis, c.anchor.ref ? [c.anchor.ref] : undefined),
    A("Who declared the destination?", c.purpose.declaredBy, c.purpose.basis),
    A("What is true now?", c.now.text, c.now.basis),
    A("What is the material deviation?", c.material ? `${c.material.severity}: ${c.material.text}` : "none: nothing material separates now from the destination", "derived", c.material?.ref ? [c.material.ref] : undefined),
    A("What prevents settlement?", c.settlement.reachable ? "nothing required" : c.settlement.required.slice(0, 4).map((x) => x.text).join(" | "), "derived"),
    A("What is the next reachable move?", c.primary ? `${c.field.find((m) => m.id === c.primary)!.label}: ${c.field.find((m) => m.id === c.primary)!.why}` : c.settlement.reachable ? "none is primary: settling is reachable, and you are choosing between settling and optional work" : "no available move answers the deviation (see the blocked moves for what would make one reachable)", "derived"),
    A("Is settlement reachable, and should it happen now?", `reachable: ${c.settlement.reachable}. ${c.settlement.shouldSettleNow.why}. The call is yours`, "derived"),
    A("Where is it stored?", "nowhere. A Case is derived from the run files on every read; deleting the cockpit loses nothing", "derived"),
  ];
  return { ok: true as const, ref, kind: "case", title: short(c.purpose.text, 110), state: c.settlement.reachable ? "settlement reachable" : "settlement not reachable", answers: ans, downstream: c.field.length, unavailable: ans.filter((x) => x.basis === "unavailable").length } as ReturnType<typeof whyRef>;
}

export { patterns, experiments, prior, decisionStates };
export type { Experiment };

// ---- projections: the Case as rows and as a small graph, for the existing table and graph blocks -----------------------------------------
type CaseOk = Extract<ReturnType<typeof caseOf>, { ok: true }>;
const requiresText = (m: Affordance) => (m.status === "blocked"
  ? `because: ${m.blockedBy.map((b) => b.text).join("; ") || "a prerequisite is unmet"}${m.reach ? `. Reach: ${m.reach.provider} (${m.reach.status}): ${m.reach.next}` : ""}`
  : m.requires.length ? m.requires.map((r) => `${r.met ? "✓" : "×"} ${r.what}`).join("; ") : "nothing else");

// The seven questions in the order a decision needs them. Read top to bottom: nothing below depends on opening anything else.
export function caseStateRows(c: CaseOk) {
  const prim = c.field.find((m) => m.primary);
  const rows: { id: string; part: string; answer: string; signal: string; _ref?: string }[] = [];
  rows.push({ id: "destination", part: "Destination", answer: `${c.purpose.text}${c.purpose.bar ? `. Bar: ${c.purpose.bar}` : ""}`, signal: c.purpose.basis, _ref: c.anchor.ref ?? undefined });
  rows.push({ id: "now", part: "Now", answer: c.now.text, signal: c.now.basis });
  rows.push({ id: "deviation", part: "Deviation", answer: c.material ? c.material.text : "none: nothing material separates now from the destination", signal: c.material?.severity ?? "quiet", _ref: c.material?.ref });
  if (prim) {
    rows.push({ id: "next", part: "Next move", answer: `${prim.label}. ${prim.why.replace(/^./, (ch) => ch.toUpperCase())}`, signal: "available", _ref: prim.ref });
    rows.push({ id: "cost", part: "Cost and authority", answer: `${prim.payment.estimate === "unknown" ? `${prim.payment.kind}, cost unknown` : prim.payment.estimate}; ${prim.authority} authority; ${prim.recovery}`, signal: prim.authority });
    rows.push({ id: "evidence", part: "How we will know", answer: prim.evidence, signal: "expected" });
    if (prim.enables.length) rows.push({ id: "then", part: "Then reachable", answer: prim.enables.slice(0, 3).join("; "), signal: "derived" });
  } else {
    rows.push({ id: "next", part: "Next move", answer: c.settlement.reachable ? "None is marked: settling is reachable and optional work remains, so this is your choice" : "No available move answers the deviation. The blocked moves say what would make one reachable", signal: c.settlement.reachable ? "choose" : "blocked" });
  }
  rows.push({ id: "settlement", part: "Settlement", answer: `${c.settlement.reachable ? "Reachable" : `Not reachable: ${c.settlement.required.length} required condition(s) remain`}. ${c.settlement.shouldSettleNow.why}`, signal: c.settlement.shouldSettleNow.lean });
  return rows;
}
const SHOW = { choose: 4, alternatives: 3, blocked: 3 };   // a small world: the next move, a few others, and what is blocked; the rest is counted, not listed
export function caseMoveRows(c: CaseOk) {
  const seen: Record<string, number> = {}; const hidden: Record<string, Affordance[]> = {};
  const shown = c.field.filter((m) => { const cap = (SHOW as any)[m.lane]; if (cap === undefined) return true; seen[m.lane] = (seen[m.lane] ?? 0) + 1; if (seen[m.lane] <= cap) return true; (hidden[m.lane] ??= []).push(m); return false; });
  const refUsed = new Set<string>();   // rows that share a ref would select together; only the first carries it
  const once = (ref?: string) => { if (!ref || refUsed.has(ref)) return undefined; refUsed.add(ref); return ref; };
  const rows = shown.map((m) => ({
    id: m.id, lane: m.lane, label: m.label, why: m.why, needs: requiresText(m), cost: m.payment.estimate === "unknown" ? `${m.payment.kind}; cost unknown` : `${m.payment.kind}: ${m.payment.estimate}`,
    authority: m.authority, recovery: m.recovery, evidence: m.evidence, then: m.enables.slice(0, 2).join("; "), prior: m.prior.map((p) => `[[${p}]]`).join(" "), status: m.status, primary: m.primary ? "primary" : "", _ref: once(m.ref),
  }));
  const more = (lane: Lane) => (hidden[lane]?.length ? [{ id: `more:${lane}`, lane, label: `${hidden[lane].length} more`, why: `${hidden[lane].slice(0, 2).map((m) => short(m.label.replace(/ \(.*$/, ""), 28)).join(", ")}, and others (case_get moves lists them)`, needs: "", cost: "", authority: "", recovery: "", evidence: "", then: "", prior: "", status: lane === "blocked" ? "blocked" : "available", primary: "", _ref: undefined as string | undefined }] : []);
  const out: any[] = []; for (const lane of ["next move", "choose", "alternatives", "blocked"] as Lane[]) { out.push(...rows.filter((r) => r.lane === lane), ...more(lane)); }
  return out;
}
export function caseSettlementRows(c: CaseOk) {
  return [
    ...c.settlement.required.map((x, i) => ({ id: `req${i}`, kind: "required", condition: x.text, type: x.kind, status: "blocked", _ref: x.ref })),
    ...c.settlement.optional.map((x, i) => ({ id: `opt${i}`, kind: "optional", condition: x.text, type: x.kind, status: "available", _ref: x.ref })),
  ];
}
// Small world: the destination, the deviation, the one move, what else can be done, what is blocked, what the move would open. Never the whole workflow.
export function caseGraph(c: CaseOk) {
  const nodes: any[] = [], edges: any[] = [];
  nodes.push({ id: "dest", label: "destination", kind: "case", tone: "neutral", ref: c.anchor.ref ?? undefined, detail: c.purpose.text });
  if (c.material) { nodes.push({ id: "dev", label: "deviation", kind: "deviation", tone: c.material.severity === "interrupt" ? "danger" : "warning", ref: c.material.ref, detail: c.material.text }); edges.push({ from: "dev", to: "dest", label: "stands between" }); }
  const prim = c.field.find((m) => m.primary);
  const put = (m: Affordance, tone: string) => { const id = `m:${m.id}`.slice(0, 58); if (!nodes.some((n) => n.id === id)) nodes.push({ id, label: short(m.label, 52), kind: "move", tone, ref: m.ref && parseRef(m.ref) ? m.ref : undefined, detail: m.why }); return id; };
  if (prim) { const id = put(prim, "ok"); edges.push({ from: id, to: c.material ? "dev" : "dest", label: "resolves" });
    prim.enables.slice(0, 3).forEach((e, i) => { const nid = `s${i}`; nodes.push({ id: nid, label: short(e, 52), kind: "successor", tone: "neutral" }); edges.push({ from: id, to: nid, label: "then reachable" }); }); }
  for (const m of c.field.filter((x) => !x.primary && x.status === "available").slice(0, 3)) edges.push({ from: put(m, "neutral"), to: "dest", label: "also advances" });
  for (const m of c.field.filter((x) => x.status === "blocked").slice(0, 3)) { const id = put(m, "danger"); edges.push({ from: id, to: "dest", label: "blocked" }); const b = m.blockedBy[0]; if (b) { const bid = `b:${m.id}`.slice(0, 58); nodes.push({ id: bid, label: short(b.text, 52), kind: "blocker", tone: "danger", ref: b.ref && parseRef(b.ref) ? b.ref : undefined }); edges.push({ from: bid, to: id, label: "blocks" }); } }
  return { nodes, edges };
}
