// What the run has learned, and how much of it survived: decision states, experiments, and durable patterns.
//
//   one experiment result  !=  durable learning        a pattern keeps its contradicting evidence        a DecisionState belongs to a Case, not to a person
//
// Nothing here is stored. A DecisionState is a row in a stamped artifact (so it is graded, cited, and goes stale with the model). An experiment
// is an evidence file with a frozen observation criterion. A pattern is an ordinary claim whose source cites experiment files. This module only
// reads them back and says what they do and do not establish.
import path from "node:path";
import { GRADES } from "../../hooks/src/lib/md.mjs";
import { readText } from "../../hooks/src/lib/store.mjs";
import { markdownTables, slug } from "./tables";
import { caseAnchor } from "../protocol/refs";
import { parsePreds, normPreds, observerId, type WorldEnv, type ObserverDef } from "./world";
import { revisions, inRepo } from "./git";

// ---- DecisionState: temporary, case-bound, graded, falsifiable ---------------------------------------------------------
// The columns a DecisionState may have. The absence of a persona, type, or segment column is the point: salience belongs to the situation.
const DS_REQUIRED = ["case", "actor", "job", "trigger", "grade", "evidence"];
const DS_ALLOWED = new Set([...DS_REQUIRED, "goal", "push", "pull", "anxiety", "habit", "falsified_by"]);
const LABELS = /^(persona|mindstate|mindset|archetype|type|segment|personality|profile|trait|cluster)$/;
export type DecisionState = {
  id: string; case: string; actor: string; job: string; goal: string; trigger: string; push: string; pull: string; anxiety: string; habit: string;
  grade: string; evidence: string; falsifiedBy: string; inferred: boolean; artifact: string; stale: boolean; issues: string[];
};

export function decisionStates(W: WorldEnv) {
  const rows: DecisionState[] = []; const issues: { artifact: string; message: string }[] = [];
  const actors = new Set((W.proj.actors ?? []).map((a: any) => a.id)), jobs = new Map((W.proj.jobs ?? []).map((j: any) => [j.id, j]));
  for (const a of W.proj.artifacts) {
    const text = readText(path.join(W.runDir, "artifacts", a.id), null); if (text == null) continue;
    for (const t of markdownTables(text)) {
      const cols = t.head.map(slug);
      if (!DS_REQUIRED.every((c) => cols.includes(c))) continue;
      const forbidden = cols.filter((c) => LABELS.test(c));
      if (forbidden.length) { issues.push({ artifact: a.id, message: `a decision-state table has a ${forbidden.join(", ")} column; it describes a situation, so it cannot label a person. Its rows are not read` }); continue; }
      const unknownCols = cols.filter((c) => !DS_ALLOWED.has(c)); if (unknownCols.length) issues.push({ artifact: a.id, message: `unrecognised column(s) ${unknownCols.join(", ")} ignored` });
      t.rows.forEach((r, i) => {
        const g = (k: string) => r[cols.indexOf(k)] ?? "";
        const row: DecisionState = { id: `${a.id}#${i + 1}`, case: g("case"), actor: g("actor"), job: g("job"), goal: g("goal"), trigger: g("trigger"), push: g("push"), pull: g("pull"), anxiety: g("anxiety"), habit: g("habit"), grade: g("grade"), evidence: g("evidence"), falsifiedBy: g("falsified_by"), inferred: !["OBSERVED", "VERIFIED", "REPORTED"].includes(g("grade")), artifact: `artifact:${a.id}`, stale: a.status === "stale", issues: [] };
        if (!caseAnchor(row.case)) row.issues.push(`case "${row.case}" is not a Case anchor (run, OP1, U3, evidence/<lens>/<file>)`);
        if (actors.size && !actors.has(row.actor)) row.issues.push(`actor ${row.actor} is not in the Actors table`);
        if (jobs.size && !jobs.has(row.job)) row.issues.push(`job ${row.job} is not a Job row`);
        else if (jobs.size && (jobs.get(row.job) as any).actor !== row.actor) row.issues.push(`job ${row.job} belongs to ${(jobs.get(row.job) as any).actor}, not ${row.actor}`);
        if (!GRADES.has(row.grade)) row.issues.push(`grade "${row.grade}" is not an evidence grade`);
        if (!row.evidence) row.issues.push("no evidence: a salience with no source is a guess about a person");
        if (!row.trigger) row.issues.push("no trigger: without what started this decision there is no situation");
        rows.push(row);
      });
    }
  }
  return { rows, issues, forCase: (id: string) => rows.filter((r) => r.case === id) };
}

// ---- Experiments: a hypothesis whose observation criterion was frozen before the result -------------------------------
export type Experiment = {
  id: string; ref: string; name: string; hypothesis: string; case: string; intervention: string; primary: string; guardrails: string[]; scope: string; cost: string; limitations: string;
  observer: string | null; frozen: "frozen" | "unfrozen" | "changed" | "no-criterion"; ordering: "frozen-first" | "same-commit" | "results-first" | "unavailable";
  state: "designed" | "observed"; result: string; selected: number; direction: "supports" | "contradicts" | "none"; issues: string[];
};
const headOf = (text: string): Record<string, string> => {
  const h: Record<string, string> = {};
  for (const ln of text.split("\n")) { if (!ln.trim()) break; const m = /^([a-z_]+):\s*(.*)$/.exec(ln); if (!m) break; h[m[1]] = m[2].trim(); }
  return h;
};
const hasResultRows = (text: string) => markdownTables(text.replace(/^(?:[a-z_]+:.*\n)+\n/, "")).some((t) => t.rows.length > 0);

export function experiments(W: WorldEnv): Experiment[] {
  const out: Experiment[] = [];
  for (const e of W.proj.evidence) {
    if (!/\.md$/.test(e.id)) continue;
    const text = readText(path.join(W.runDir, "evidence", e.id), null); if (text == null) continue;
    const h = headOf(text); if (!h.experiment) continue;
    const issues: string[] = [];
    const def: ObserverDef | null = h.expect ? { selects: h.selects || `file:evidence/${e.id}#table1`, where: normPreds(parsePreds(h.where)), expect: normPreds(parsePreds(h.expect)), discriminates: [] } : null;
    const id = def ? observerId(def) : null;
    if (!def) issues.push("no `expect:` so there is no observation criterion to freeze");
    if (!/\bif\b[\s\S]+\bthen\b/i.test(h.hypothesis ?? "")) issues.push("the hypothesis is not in if/then form, so it does not say what would count against it");
    if (!h.guardrail) issues.push("no guardrail names what must not get worse");
    if (!h.primary) issues.push("no primary observable");
    const frozen: Experiment["frozen"] = !def ? "no-criterion" : !h.frozen ? "unfrozen" : h.frozen === id ? "frozen" : "changed";
    if (frozen === "changed") issues.push(`the criterion now hashes to ${id}, not the ${h.frozen} that was frozen: it was edited after the freeze`);
    if (frozen === "unfrozen") issues.push("the criterion is not frozen: write `frozen: <observer id>` before the intervention");
    // result: the frozen criterion, run over the rows the file holds
    let state: Experiment["state"] = "designed", result = "not-run", selected = 0, direction: Experiment["direction"] = "none";
    if (def && W.observe) {
      const r = W.observe(def); result = r.result; selected = r.selected;
      if (r.result === "pass" || r.result === "fail") { state = "observed"; direction = r.result === "pass" ? "supports" : "contradicts"; }
    }
    // order of writing, from local git when the run is in a repository: was the criterion committed before the first result rows?
    let ordering: Experiment["ordering"] = "unavailable";
    if (id && inRepo(W.runDir)) {
      const revs = revisions(W.runDir, path.join("evidence", e.id)) ?? [];
      const iFrozen = revs.findIndex((x) => headOf(x.text).frozen === id), iRows = revs.findIndex((x) => hasResultRows(x.text));
      if (iFrozen >= 0 && iRows >= 0) ordering = iFrozen < iRows ? "frozen-first" : iFrozen === iRows ? "same-commit" : "results-first";
      else if (iFrozen >= 0 && iRows < 0) ordering = "frozen-first";
    }
    if (ordering === "results-first") issues.push("git shows result rows were committed before the criterion was frozen");
    out.push({ id: e.id, ref: `evidence:${e.id}`, name: h.experiment, hypothesis: h.hypothesis ?? "", case: h.case ?? "run", intervention: h.intervention ?? "", primary: h.primary ?? "", guardrails: (h.guardrail ?? "").split(/[;,]/).map((x) => x.trim()).filter(Boolean), scope: h.scope ?? "", cost: h.cost ?? "", limitations: h.limitations ?? "", observer: id, frozen, ordering, state, result, selected, direction, issues });
  }
  return out;
}

// ---- Patterns: a claim that cites several episodes, with the contradicting ones kept --------------------------------
// The default evidence contract for calling a pattern supported. It is a rule of this repository, not a statistical convention:
// a result that held once, in one setting, is an outcome; a result that held in more than one setting, and has not failed, may be a pattern.
export const PATTERN_CONTRACT = { supporting: 2, scopes: 2, needsFrozenCriterion: true } as const;
export type PatternStatus = "single-result" | "emerging" | "supported" | "contested";
export type Pattern = {
  id: string; ref: string; claim: string; grade: string; status: PatternStatus; supporting: string[]; contradicting: string[]; cited: string[];
  variationCovered: string[]; limitations: string[]; summary: string; issues: string[];
};
export function patterns(W: WorldEnv, exps: Experiment[] = experiments(W)): Pattern[] {
  const out: Pattern[] = [];
  for (const c of W.proj.claims) {
    const sup: Experiment[] = [], con: Experiment[] = [], cited: Experiment[] = []; const issues: string[] = [];
    for (const part of String(c.source).split(/;\s*/)) {
      const e = exps.find((x) => part.includes(x.id)); if (!e) continue;
      const mark = /\((supports|contradicts)\)/i.exec(part)?.[1]?.toLowerCase() as "supports" | "contradicts" | undefined;
      // the experiment's own result decides the side; a label may not hide a failed observer or claim a pass that did not happen
      if (mark && e.direction !== "none" && mark !== e.direction) issues.push(`${e.id} is marked (${mark}) but its frozen criterion ${e.direction === "supports" ? "passed" : "failed"}; its result is used`);
      const side = e.direction === "none" ? (mark === "contradicts" ? "contradicts" : "none") : e.direction;
      if (side === "contradicts") con.push(e);
      else if (side === "supports" && (e.frozen === "frozen" || !PATTERN_CONTRACT.needsFrozenCriterion)) sup.push(e);
      else cited.push(e);
    }
    if (!sup.length && !con.length && !cited.length) continue;
    const scopes = [...new Set(sup.map((e) => e.scope).filter(Boolean))];
    const status: PatternStatus = con.length ? "contested" : sup.length >= PATTERN_CONTRACT.supporting && scopes.length >= PATTERN_CONTRACT.scopes ? "supported" : sup.length >= PATTERN_CONTRACT.supporting ? "emerging" : "single-result";
    const summary = status === "contested" ? `${sup.length} supporting and ${con.length} contradicting experiment(s): kept side by side, not averaged`
      : status === "supported" ? `${sup.length} experiments over ${scopes.length} settings, none contradicting`
      : status === "emerging" ? `${sup.length} experiments but ${scopes.length} setting(s): it has not yet been seen to hold elsewhere`
      : sup.length === 1 ? "one experiment result: an outcome, not a durable learning" : `${cited.length} cited experiment(s) with no passing frozen criterion`;
    for (const e of cited) if (e.frozen !== "frozen" && e.direction === "supports") issues.push(`${e.id} passed but its criterion was not frozen before the result, so it does not count as support`);
    out.push({ id: c.id, ref: `claim:${c.id}`, claim: c.text, grade: c.grade, status, supporting: sup.map((e) => e.ref), contradicting: con.map((e) => e.ref), cited: cited.map((e) => e.ref), variationCovered: scopes, limitations: [...new Set([...sup, ...con].map((e) => e.limitations).filter(Boolean))], summary, issues });
  }
  return out;
}

// ---- prior knowledge: look before paying again --------------------------------------------------------------------------
const STOP = new Set(["the", "and", "for", "that", "with", "this", "from", "have", "are", "was", "not", "can", "will", "how", "what", "does", "its", "into", "than", "then", "when", "which"]);
const words = (s: string) => [...new Set((s.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []).filter((w) => !STOP.has(w)))];
export function prior(W: WorldEnv, query: string, exps: Experiment[] = experiments(W), pats: Pattern[] = patterns(W, exps)) {
  const q = words(query); const hits: { ref: string; kind: string; status: string; text: string; score: number; summary: string }[] = [];
  const score = (text: string) => { const t = new Set(words(text)); return q.filter((w) => t.has(w)).length; };
  for (const p of pats) { const s = score(p.claim); if (s) hits.push({ ref: p.ref, kind: "pattern", status: p.status, text: p.claim, score: s + (p.status === "supported" ? 2 : p.status === "contested" ? 1 : 0), summary: p.summary }); }
  for (const e of exps) { const s = score(`${e.hypothesis} ${e.name}`); if (s) hits.push({ ref: e.ref, kind: "experiment", status: `${e.state}${e.direction !== "none" ? `:${e.direction}` : ""}`, text: e.hypothesis, score: s, summary: `${e.frozen} criterion; ${e.result}` }); }
  hits.sort((a, b) => b.score - a.score || a.ref.localeCompare(b.ref));
  return { query, hits: hits.slice(0, 6), covered: { claims: W.proj.claims.length, experiments: exps.length, patterns: pats.length }, note: hits.length ? "settled evidence exists for part of this; read it before paying to observe it again" : "nothing in this run's claims or experiments matches. That means nothing is recorded here, not that nothing is known" };
}
