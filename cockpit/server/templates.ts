// Standard surfaces the owner can open without an agent, and the hints that offer them. Fixed, tested compositions of the same blocks
// the agent uses; deterministic functions of the projection. The empty workspace shows the one to four that matter now, never a menu.
import type { Proj } from "./project";
import type { Surface } from "../protocol/spec";
import { TEMPLATE_IDS } from "../protocol/actions";
import { caseSurface } from "./caseSurfaces";
import fs from "node:fs";
import path from "node:path";

type T = (p: Proj, runDir: string) => Surface;
const table = (id: string, source: string, columns: any[], extra: any = {}) => ({ type: "table", id, source, columns, ...extra });
const follow = (of: string, show: string[]) => ({ type: "entity", id: "detail", follow: of, show });

export const TEMPLATES: Record<Exclude<(typeof TEMPLATE_IDS)[number], "ref">, T> = {
  case: () => caseSurface("run"),
  trace: () => ({ id: "trace", title: "Run trace", summary: "Nested activity of this run: waves, lenses, reconciliations, with durations.", intent: "monitor", layout: "stack", blocks: [{ type: "progress", id: "run", label: "Run", source: "run" }, { type: "tree", id: "tree", source: "pa:trace", expand: 3, show: ["status", "duration"] }] }),
  proposals: () => ({ id: "proposals", title: "Open proposals", summary: "Lens findings waiting for a reconciliation. Your ruling is recorded for the router; it does not edit the model.", intent: "decide", layout: "stack", blocks: [table("list", "pa:proposals?status=open", [{ field: "id", kind: "ref" }, { field: "lens" }, { field: "field" }, { field: "kind" }, { field: "proposal", kind: "text" }]), follow("list", ["consequence", "actions", "sources"])] as any }),
  claims: () => ({ id: "claims", title: "Claims ledger", summary: "Every claim with its grade. Public copy may cite only OBSERVED or VERIFIED.", intent: "inspect", layout: "stack", blocks: [table("list", "pa:claims", [{ field: "id", kind: "ref" }, { field: "grade", kind: "grade" }, { field: "text" }, { field: "source" }]), follow("list", ["sources", "touches", "consequence", "actions"])] as any }),
  contradictions: () => ({ id: "contradictions", title: "Contradictions", summary: "Claims the evidence disagrees about.", intent: "verify", layout: "stack", blocks: [table("list", "pa:claims?grade=CONTRADICTED", [{ field: "id", kind: "ref" }, { field: "text" }, { field: "source" }]), follow("list", ["sources", "touches", "consequence", "actions"])] as any }),
  unknowns: () => ({ id: "unknowns", title: "Unknowns", summary: "What the evidence does not say, and what each one blocks.", intent: "decide", layout: "stack", blocks: [table("list", "pa:unknowns", [{ field: "id", kind: "ref" }, { field: "question" }, { field: "blocks" }, { field: "who" }]), follow("list", ["actions"])] as any }),
  staleness: () => ({ id: "staleness", title: "Why stale", summary: "A decision touched what an artifact reads or cites; re-run the owning lens to rebuild it.", intent: "verify", layout: "stack", blocks: [{ type: "graph", id: "g", source: "graph:staleness", direction: "LR" }, table("arts", "pa:artifacts?stale=1", [{ field: "id", kind: "ref" }, { field: "lens" }, { field: "built", kind: "number" }, { field: "status", kind: "status" }])] as any }),
  lenses: () => ({ id: "lenses", title: "Lenses", summary: "Which lenses are selected, running, waiting, done, or stale, and what each needs.", intent: "monitor", layout: "stack", blocks: [{ type: "graph", id: "g", source: "graph:lenses" }, table("list", "pa:lenses", [{ field: "name", kind: "ref" }, { field: "status", kind: "status" }, { field: "needs" }, { field: "runs", kind: "number" }], { group: "status" })] as any }),
  gate: (p, runDir) => {
    const gate = p.artifacts.find((a) => a.isGate);
    const blocks: any[] = [{ type: "entity", id: "gate", ref: "gate" }, table("blockers", "pa:blockers", [{ field: "code" }, { field: "text" }, { field: "fix" }])];
    if (gate) {
      try { if (/^\s*\|/m.test(fs.readFileSync(path.join(runDir, "artifacts", gate.id), "utf8"))) blocks.push(table("walk", `file:artifacts/${gate.id}#table1`, undefined as any, { group: "result", title: "Evidence walk" })); } catch { /* unreadable gate is shown by the entity */ }
      blocks.push({ type: "document", id: "doc", source: `file:artifacts/${gate.id}` });
    }
    return { id: "gate", title: "Release gate", summary: "What blocks stopping, and what the verdict rests on.", intent: "verify", layout: "stack", blocks } as any;
  },
  inbox: () => ({ id: "inbox", title: "Your responses", summary: "What you told the process, and whether the router has handled it.", intent: "inspect", layout: "stack", blocks: [table("list", "pa:responses", [{ field: "id" }, { field: "kind" }, { field: "outcome" }, { field: "ref" }, { field: "value" }, { field: "status", kind: "status" }])] as any }),
  events: () => ({ id: "events", title: "Events", summary: "The process event stream, newest first.", intent: "monitor", layout: "stack", blocks: [{ type: "timeline", id: "tl", source: "pa:events", window: 60 }] }),
};

export function hints(p: Proj): { label: string; why: string; template: (typeof TEMPLATE_IDS)[number] }[] {
  const out: { label: string; why: string; template: (typeof TEMPLATE_IDS)[number] }[] = [];
  const open = p.proposals.filter((x: any) => x.status === "open").length;
  const contra = p.claims.filter((c) => c.grade === "CONTRADICTED").length;
  const stale = p.artifacts.filter((a) => a.status === "stale").length;
  const waiting = p.responses.filter((r: any) => r.status === "waiting").length;
  if (!p.run.goal) return [];
  if (open) out.push({ label: `Review ${open} open proposal${open > 1 ? "s" : ""}`, why: "findings waiting to be reconciled", template: "proposals" });
  if (p.blockers.length) out.push({ label: `See what blocks the gate (${p.blockers.length})`, why: p.blockers[0].text.slice(0, 90), template: "gate" });
  if (stale) out.push({ label: `Why ${stale} artifact${stale > 1 ? "s are" : " is"} stale`, why: "a decision touched what they read", template: "staleness" });
  if (contra) out.push({ label: `${contra} contradicted claim${contra > 1 ? "s" : ""}`, why: "evidence disagrees", template: "contradictions" });
  if (waiting) out.push({ label: `${waiting} of your response${waiting > 1 ? "s" : ""} not yet routed`, why: "the router has not acknowledged them", template: "inbox" });
  if (p.run.activeLenses.length || p.run.phase !== "idle") out.push({ label: "Follow the run", why: p.run.activeLenses.length ? `running: ${p.run.activeLenses.join(", ")}` : p.run.phase, template: "trace" });
  if (!out.length) out.push({ label: "Lens map", why: "which lenses ran and what is next", template: "lenses" });
  out.unshift({ label: "Where we are trying to go", why: "the destination, the deviation, and the one move that answers it", template: "case" });
  return out.slice(0, 4);
}
