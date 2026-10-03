// Demand evidence, projected from the Product Model's optional sections: who is making what progress, how they judge it, and where the
// evidence says it is under-served. Pure: a parsed model in, plain rows out. Nothing here is scored or invented.
//   A criterion's importance and satisfaction are either UNKNOWN or a number with its source (the model refuses anything else), so the
//   only thing derived here is *whether the evidence exists*. No opportunity score is ever computed: an ODI-style number would need
//   population-level measurements this run does not have, and a score synthesized from prose would be confidence smoothing.
import { MEASURED } from "../../hooks/src/lib/md.mjs";

export type Measure = { value: number; source: string } | null;
export const measureOf = (cell: string): Measure => { const m = MEASURED.exec(String(cell ?? "").trim()); return m ? { value: Number.parseFloat(cell), source: m[2].trim() } : null; };

export type Evidence = "insufficient" | "partial" | "measured";
export type DemandRows = { actors: any[]; jobs: any[]; criteria: any[]; opportunities: any[] };

export function demandOf(model: any, proposals: any[] = []): DemandRows {
  if (!model) return { actors: [], jobs: [], criteria: [], opportunities: [] };
  const actors = [...model.actors.values()].map((a: any) => ({ id: a.id, actor: a.actor, job: a.job }));
  const jobs = [...model.jobs.values()].map((j: any) => ({
    ...j, criteria: [...model.criteria.values()].filter((c: any) => c.job === j.id).map((c: any) => c.id).join(", "),
    opportunities: [...model.opportunities.values()].filter((o: any) => o.basis === j.id || model.criteria.get(o.basis)?.job === j.id).map((o: any) => o.id).join(", "),
  }));
  const criteria = [...model.criteria.values()].map((c: any) => {
    const imp = measureOf(c.importance), sat = measureOf(c.satisfaction);
    const evidence: Evidence = imp && sat ? "measured" : imp || sat ? "partial" : "insufficient";
    return { ...c, importanceValue: imp?.value ?? null, satisfactionValue: sat?.value ?? null, evidence, score: "UNCOMPUTED" as const,
      statement: `${c.direction} ${c.measure}${c.object ? ` of ${c.object}` : ""}${c.context ? ` (${c.context})` : ""}` };
  });
  const byId = new Map(criteria.map((c) => [c.id, c]));
  const opportunities = [...model.opportunities.values()].map((o: any) => {
    const c = byId.get(o.basis);
    const named = proposals.filter((p: any) => new RegExp(`\\b${o.id}\\b`).test(`${p.proposal} ${p.evidence}`));
    return { ...o, basisKind: c ? "criterion" : "job", job: c ? c.job : o.basis, evidence: c ? c.evidence : ("insufficient" as Evidence), score: "UNCOMPUTED" as const,
      candidates: named.map((p: any) => p.id).join(", "), addressed: named.some((p: any) => /^accepted:/.test(p.status)) };
  });
  return { actors, jobs, criteria, opportunities };
}
