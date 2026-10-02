// Debugger compositions. Each is a fixed arrangement of the existing blocks bound to `world:` sources, so every figure on screen is
// computed by the kernel at render time and stays true as the run changes. No block here is new, and the agent gets the same ones
// through `show: true` on a world tool: the vocabulary is the interface, not code.
import fs from "node:fs";
import path from "node:path";
import type { Surface } from "../protocol/spec";
import { parseRef } from "../protocol/refs";
import { fmtPreds, type Pred, type WorldEnv } from "./world";
import * as K from "./world";

const slug = (s: string, n = 28) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, n);
const ENTITY = new Set(["claim", "unknown", "proposal", "decision", "artifact", "evidence", "lens", "gate"]);
const table = (id: string, source: string, columns: any[], extra: any = {}) => ({ type: "table", id, source, columns, ...extra });
const q = (o: Record<string, string | number | undefined>) => Object.entries(o).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%3A/gi, ":").replace(/%40/g, "@").replace(/%2F/gi, "/")}`).join("&");

export function whySurface(ref: string): Surface {
  const r = parseRef(ref)!; const hasHistory = ["claim", "unknown", "decision", "field"].includes(r.kind);
  const blocks: any[] = [];
  if (ENTITY.has(r.kind)) blocks.push({ type: "entity", id: "subject", ref });
  blocks.push(table("answers", `world:why?${q({ ref })}`, [{ field: "question" }, { field: "answer" }, { field: "basis", kind: "status" }, { field: "refs" }], { select: false, title: "How it came to be" }));
  blocks.push({ type: "graph", id: "rests-on", title: "What it rests on", source: `graph:why?${q({ focus: ref })}`, focus: ref, direction: "LR" });
  if (hasHistory) blocks.push({ type: "timeline", id: "history", title: "Settled history", source: `world:timeline?${q({ ref })}`, window: 20 });
  return { id: `w-why-${slug(ref, 40)}`.slice(0, 48), title: `Why ${ref}`.slice(0, 60), summary: "Each answer says whether it was recorded, derived, or is not recorded. Nothing here is inferred.", intent: "inspect", layout: "stack", blocks } as Surface;
}

export function impactSurface(ref: string, o: { dir?: string; depth?: number; gate?: boolean; kinds?: string[] } = {}): Surface {
  const p = q({ ref, dir: o.dir && o.dir !== "down" ? o.dir : undefined, depth: o.depth, gate: o.gate ? 1 : undefined, kinds: o.kinds?.join(",") });
  const pf = q({ focus: ref, dir: o.dir && o.dir !== "down" ? o.dir : undefined, depth: o.depth, gate: o.gate ? 1 : undefined, kinds: o.kinds?.join(",") });
  return { id: `w-impact-${slug(ref, 38)}`.slice(0, 48), title: `Impact of ${ref}`.slice(0, 60), summary: `${o.dir === "up" ? "What it depends on" : o.dir === "both" ? "What it depends on and what depends on it" : "What depends on it"}, reduced to the relevant part of the world.`, intent: "inspect", layout: "stack", blocks: [
    { type: "graph", id: "reach", title: "Focused consequence graph", source: `graph:impact?${pf}`, focus: ref, direction: "LR" },
    table("affected", `world:impact?${p}`, [{ field: "ref", kind: "ref" }, { field: "label" }, { field: "status", kind: "status" }, { field: "distance", label: "hops", kind: "number" }, { field: "via", label: "through" }, { field: "gate" }], { select: false, title: "Affected, nearest and gate-relevant first" }),
  ] } as Surface;
}

export function diffSurface(W: WorldEnv, a: number | "current", b: number | "current"): Surface | null {
  const d = K.diff(W, a, b); if (!d.ok) return null;
  const blocks: any[] = [table("changes", `world:diff?${q({ a: String(a), b: String(b) })}`, [{ field: "ref", kind: "ref" }, { field: "change", kind: "status" }, { field: "field" }, { field: "before" }, { field: "after" }, { field: "because" }], { group: "change", select: false, title: `${d.a.id} → ${d.b.id}` })];
  const first = d.rows.find((r) => r.kind === "claim" || r.kind === "decision");
  if (first) blocks.push({ type: "graph", id: "consequence", title: `What ${first.ref} reaches now`, source: `graph:impact?${q({ focus: first.ref })}`, focus: first.ref, direction: "LR" });
  const files = [a, b].map((v) => (v === "current" ? W.proj.run.modelVersion : v));
  if (files.every((v) => fs.existsSync(path.join(W.runDir, "history", `model-v${v}.md`)))) blocks.push({ type: "compare", id: "models", title: "Product Model, text", mode: "diff", items: files.map((v) => ({ label: `model@${v}`, source: `file:history/model-v${v}.md` })) });
  return { id: `w-diff-${slug(`${a}-${b}`, 20)}`, title: `Changes ${d.a.id} → ${d.b.id}`.slice(0, 60), summary: d.same ? "No semantic difference between these worlds." : "A read-only comparison of settled worlds. The current world is unchanged.", intent: "compare", layout: "stack", blocks } as Surface;
}

export function timelineSurface(ref?: string): Surface {
  return { id: ref ? `w-time-${slug(ref, 38)}`.slice(0, 48) : "w-timeline", title: ref ? `History of ${ref}`.slice(0, 60) : "Settled worlds", summary: "Each row is a settlement: a reconciliation that produced a new model version.", intent: "inspect", layout: "stack", blocks: [
    { type: "timeline", id: "time", source: `world:timeline?${q({ ref })}`, window: 40 },
    ...(ref ? [] : [table("worlds", "pa:versions", [{ field: "version", kind: "ref" }, { field: "world" }, { field: "settled" }, { field: "claims", kind: "number" }, { field: "decisions", kind: "number" }, { field: "latest" }, { field: "digest" }], { title: "Worlds the run recorded" })]),
  ] } as Surface;
}

export function counterfactualSurface(ref: string): Surface {
  return { id: `w-cf-${slug(ref, 40)}`.slice(0, 48), title: `If ${ref} settled`.slice(0, 60), summary: "A candidate world: what would follow if the router accepted it. A possibility, never a result.", intent: "verify", layout: "stack", blocks: [
    { type: "entity", id: "candidate", ref },
    table("effects", `world:counterfactual?${q({ ref })}`, [{ field: "class", kind: "status" }, { field: "subject", kind: "ref" }, { field: "effect" }, { field: "basis" }, { field: "via", label: "who could observe" }], { group: "class", select: false, title: "Effects, by how well they are known" }),
    { type: "graph", id: "reach", title: "What it would reach", source: `graph:impact?${q({ focus: ref })}`, focus: ref, direction: "LR" },
  ] } as Surface;
}

export function reachSurface(o: { need?: string; ref?: string }): Surface {
  const cols = ["capability", "provider", "status", "available", "installed", "configured", "probed", "reachable", "authorized", "next"].map((f) => ({ field: f, ...(f === "capability" || f === "provider" || f === "next" ? {} : { kind: "status" }) }));
  return { id: `w-reach-${slug(o.need ?? o.ref ?? "x", 36)}`.slice(0, 48), title: `Reach ${o.need ?? o.ref}`.slice(0, 60), summary: "Who could gather the missing evidence, and how far each provider has climbed. Nothing is run or contacted.", intent: "verify", layout: "stack", blocks: [table("providers", `world:reach?${q({ need: o.need, ref: o.ref })}`, cols, { group: "capability", select: false })] } as Surface;
}

export function replaySurface(def: K.ObserverDef): Surface {
  const source = `world:replay?${q({ selects: def.selects, where: fmtPreds(def.where) || undefined, expect: fmtPreds(def.expect), discriminates: def.discriminates?.join(",") })}`;
  return { id: `w-replay-${K.observerId(def).slice(4)}`, title: "Observation replay", summary: `Observer ${K.observerId(def)}: selects rows, asserts what must hold. Evidence for the router and owner; it settles nothing.`, intent: "verify", layout: "stack", blocks: [
    table("result", source, [{ field: "row", kind: "number" }, { field: "verdict", kind: "status" }, { field: "observed" }, { field: "expected" }, { field: "failed" }], { group: "verdict", select: false }),
    { type: "document", id: "evidence", source: def.selects.replace(/#.*/, ""), title: "The evidence read" },
  ] } as Surface;
}
export type { Pred };
