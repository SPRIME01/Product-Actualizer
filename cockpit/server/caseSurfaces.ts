// The Case, Opportunity, and Decision views. Fixed arrangements of the existing fifteen blocks bound to `case:` and `pa:` sources, so every
// figure is computed by the kernel at render time and stays true as the run changes. No block is new; the arrangement is the design.
//
// Reading order is the order a decision needs: where we are trying to go, where we are, what stands between, the one move, what it costs and
// who may take it, how we will know, what becomes reachable. Quiet when healthy: a block exists only if it has something to say, and the
// rows that matter most sort first. Group lanes carry the weight (next move, choose, alternatives, blocked) instead of colour or size.
import type { Surface } from "../protocol/spec";
import { caseAnchor, parseRef } from "../protocol/refs";

const table = (id: string, source: string, columns: any[], extra: any = {}) => ({ type: "table", id, source, columns, ...extra });
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "run";
const qs = (id: string) => (id === "run" ? "" : `?ref=${id}`);

export function caseSurface(id: string): Surface {
  const a = caseAnchor(id); const q = qs(id);
  const run = !a || a.kind === "run" || a.kind === "gate";
  const blocks: any[] = [
    table("state", `case:state${q}`, [{ field: "part", label: "question" }, { field: "answer" }, { field: "signal", kind: "status" }], { select: false, title: run ? "Where we are trying to go" : `Case ${id}` }),
    table("moves", `case:affordances${q}`, [{ field: "label", label: "move" }, { field: "why" }, { field: "needs", label: "requires" }, { field: "cost" }, { field: "authority" }, { field: "evidence", label: "how we will know" }, { field: "then", label: "then reachable" }], { group: "lane", title: "What can be done now" }),
    { type: "entity", id: "detail", follow: "moves", show: ["consequence", "actions"] },
    table("settle", `case:settlement${q}`, [{ field: "condition" }, { field: "type" }, { field: "status", kind: "status" }], { group: "kind", select: false, title: "Settlement conditions" }),
    { type: "graph", id: "small", title: "The move and what it opens", source: `graph:case${q}`, direction: "LR" },
  ];
  return { id: `case-${slug(id)}`.slice(0, 48), title: run ? "Case: this run" : `Case ${id}`.slice(0, 60), summary: "A derived view of where we are trying to go and what can be done now. It stores nothing and decides nothing; settling is yours.", intent: "decide", layout: "stack", blocks } as Surface;
}

export function opportunitySurface(id: string): Surface {
  const a = caseAnchor(id); const r = a?.ref ? parseRef(a.ref) : null;
  const q = qs(id);
  const blocks: any[] = [
    table("state", `case:state${q}`, [{ field: "part", label: "question" }, { field: "answer" }, { field: "signal", kind: "status" }], { select: false, title: "Progress sought and the shortfall" }),
    table("criteria", "pa:criteria", [{ field: "id", kind: "ref" }, { field: "statement", label: "success criterion" }, { field: "importance" }, { field: "satisfaction" }, { field: "evidence", kind: "status", label: "measured" }, { field: "score", kind: "status", label: "score" }], { title: "How the progress is judged. UNKNOWN stays UNKNOWN", select: true }),
  ];
  if (r?.kind === "opportunity" || r?.kind === "criterion") blocks.push(table("route", `world:reach?ref=${r.kind}:${r.id}`, [{ field: "capability" }, { field: "provider" }, { field: "status", kind: "status" }, { field: "configured", kind: "status" }, { field: "probed", kind: "status" }, { field: "next" }], { select: false, title: "What could measure it" }));
  blocks.push(table("moves", `case:affordances${q}`, [{ field: "label", label: "move" }, { field: "why" }, { field: "needs", label: "requires" }, { field: "cost" }, { field: "authority" }, { field: "evidence", label: "how we will know" }], { group: "lane", title: "What can be done now" }));
  blocks.push(table("opps", "pa:opportunities", [{ field: "id", kind: "ref" }, { field: "deficiency" }, { field: "evidence", kind: "status", label: "measured" }, { field: "alternatives", label: "actor uses today" }, { field: "candidates" }], { title: "Opportunities. A candidate is not an opportunity" }));
  return { id: `opp-${slug(id)}`.slice(0, 48), title: `Opportunity ${id}`.slice(0, 60), summary: "Demand evidence, with what is measured and what is not. No score is computed from prose.", intent: "inspect", layout: "stack", blocks } as Surface;
}

// `have` says which of the other tables have anything to show: a view only carries a block that has something to say.
export type Have = { experiments: number; patterns: number };
export function decisionSurface(id: string, have: Have = { experiments: 1, patterns: 1 }): Surface {
  const q = id === "run" ? "" : `?case=${id}`;
  const blocks: any[] = [
    table("states", `pa:decision-states${q}`, [{ field: "case" }, { field: "actor", kind: "ref" }, { field: "job", kind: "ref" }, { field: "trigger" }, { field: "push" }, { field: "pull" }, { field: "anxiety" }, { field: "habit" }, { field: "kind", kind: "status", label: "marked" }, { field: "evidence" }], { title: "Salience in this situation. Inferred where marked; not the actor's" }),
  ];
  if (have.experiments) blocks.push(table("tests", "pa:experiments", [{ field: "id", kind: "ref" }, { field: "hypothesis" }, { field: "frozen", kind: "status" }, { field: "result", kind: "status" }, { field: "ordering", kind: "status", label: "git order" }, { field: "scope" }], { title: "What would tell us" }));
  if (have.patterns) blocks.push(table("patterns", "pa:patterns", [{ field: "id", kind: "ref", label: "claim" }, { field: "claim" }, { field: "status", kind: "status" }, { field: "supports", kind: "number" }, { field: "contradicts", kind: "number" }, { field: "settings" }, { field: "summary" }], { title: "What survived. Contradicting evidence stays" }));
  return { id: `decision-${slug(id)}`.slice(0, 48), title: `Decision state: ${id}`.slice(0, 60), summary: "A decision state belongs to the situation. The same person in another Case has a different one.", intent: "inspect", layout: "stack", blocks } as Surface;
}

export const surfaceFor = (id: string, view: "case" | "decision" = "case", have?: Have): Surface => {
  if (view === "decision") return decisionSurface(id, have);
  const a = caseAnchor(id);
  return a && ["opportunity", "criterion", "job"].includes(a.kind) ? opportunitySurface(id) : caseSurface(id);
};
