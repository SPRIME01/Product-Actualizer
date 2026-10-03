// The semantic tool surface. One definition feeds three transports: the local CLI (`actualize ui ...`), the loopback MCP endpoint,
// and WebMCP in the page. Every tool is either a read, or composes the cockpit through the same typed actions an agent sends directly.
// None of them can answer for the owner, edit the Product Model, or touch the rail: those capabilities do not exist here.
import { z } from "zod";
import { AgentActionSchema } from "./actions";
import { SurfaceSchema, PlacementSchema, AskBase } from "./spec";
import { RefSchema } from "./refs";
import { CAPABILITIES, type WorldMode } from "./world";
import { caseAnchor } from "./refs";
import { REQUEST_STATUSES } from "./work";

const idStr = z.string().min(1).max(48);
const show = z.boolean().default(false).describe("also open the answer as a surface for the owner");
export type ToolDef = { name: string; description: string; input: z.ZodType; effect: "read" | "compose"; untrusted?: boolean };

export const TOOLS: ToolDef[] = [
  { name: "get_status", effect: "read", input: z.object({}).strict(),
    description: "Where the actualization is: phase, model version, active lenses, wave, counts (open proposals, unknowns, contradictions, stale, blockers), gate, next action, whether the owner is needed. Read from the process; the cockpit cannot change it." },
  { name: "get_workspace", effect: "read", input: z.object({}).strict(),
    description: "What the owner currently sees: visible surfaces, focus, their selection, open questions, layout summary, recent interactions. Compact on purpose." },
  { name: "get_vocabulary", effect: "read", input: z.object({ block: z.string().max(20).optional() }).strict(),
    description: "The fixed composition vocabulary: blocks (when to use each), sources, refs, placement, operations. Pass block for one block's example." },
  { name: "list_items", effect: "read", untrusted: true, input: z.object({ what: z.enum(["claims", "unknowns", "decisions", "proposals", "artifacts", "blockers", "responses", "lenses"]), filter: z.string().max(100).optional(), limit: z.number().int().min(1).max(50).default(20) }).strict(),
    description: "Compact id + one-line rows of process entities (filter like status=open, grade=CONTRADICTED, status=stale)." },
  { name: "get_entity", effect: "read", untrusted: true, input: z.object({ ref: RefSchema }).strict(),
    description: "One entity in full: fields, related entities, consequence, next affordances." },
  { name: "show_surface", effect: "compose", input: z.object({ surface: SurfaceSchema, place: PlacementSchema.optional() }).strict(),
    description: "Show or replace a surface composed from the fixed blocks. Existing surfaces keep the owner's position." },
  { name: "show_ref", effect: "compose", input: z.object({ ref: RefSchema, beside: idStr.optional(), as: z.enum(["detail", "document", "lineage", "why", "impact", "diff", "case", "decision"]).default("detail") }).strict(),
    description: "Show a claim, unknown, proposal, decision, artifact, evidence file, lens, or the gate using a standard template; as=document opens the file, as=lineage the claim graph, as=why the provenance debugger, as=impact the consequence graph, as=diff (on a version) what changed since it, as=case the Case anchored on it, as=decision the situational DecisionState view." },
  { name: "compare_refs", effect: "compose", input: z.object({ a: RefSchema, b: RefSchema, beside: idStr.optional() }).strict(),
    description: "Compare two artifacts or evidence files (text diff) or two entities side by side." },
  { name: "ask_human", effect: "compose", input: AskBase.extend({ place: PlacementSchema.optional() }).strict(),
    description: "Ask the owner one question as an ask block (confirm|select|multiselect|text|multiline|search|path). Use resolves to name the unknown/proposal/decision it bears on. You cannot answer it: read the answer with read_responses." },
  { name: "arrange", effect: "compose", input: z.object({ action: AgentActionSchema }).strict(),
    description: "Any typed workspace action: surface.patch (bind, filter, sort, highlight, select), surface.remove, view.focus, view.place, view.size, layout.save|restore|reset, note.add, ask.withdraw." },
  { name: "annotate", effect: "compose", input: z.object({ target: z.string().max(80), text: z.string().min(1).max(400), tone: z.enum(["note", "warning", "danger", "ok"]).default("note") }).strict(),
    description: "Pin an agent note to a ref or surface (visibly marked as the agent's)." },
  { name: "read_responses", effect: "read", untrusted: true, input: z.object({ unhandled: z.boolean().default(true) }).strict(),
    description: "What the owner answered, ruled, confirmed, or annotated. Routing them (proposals, decisions) is the router's job through the process CLI; this tool only reads." },
];

// ---- the Case: where we are trying to go, what stands between, and what can be done now. Derived on every read; nothing is stored. ----
const caseRef = z.string().max(120).refine((s) => !!caseAnchor(s.replace(/^case:/, "")), { message: "a Case anchor: run, OP<n>, S<n>, J<n>, C<n>, U<n>, P<n>, or evidence/<lens>/<file>" });
export const CASE_TOOLS: ToolDef[] = [
  { name: "case_get", effect: "read", untrusted: true, input: z.object({ ref: caseRef.default("run"), part: z.enum(["summary", "moves", "settlement", "prior"]).default("summary"), q: z.string().max(200).optional(), view: z.enum(["case", "decision"]).default("case"), show }).strict(),
    description: "The Case around a purpose (default: this run). summary: the destination, what is true now, the one material deviation, the one primary move with its cost, authority, recovery, and expected evidence, the blocked moves with what would reach them, and whether settlement is reachable and whether to settle now (always the owner's call). moves: the whole affordance field. settlement: required and optional conditions. prior: settled patterns and experiments that already bear on q. Never a dump: it is built to be read in one glance. Reading it runs nothing and settles nothing." },
];
TOOLS.push(...CASE_TOOLS);

// ---- the world debugger: questions about the product world. All read-only; `show` also puts the answer in front of the owner. ----
const Pred = z.object({ field: z.string().max(40), op: z.enum(["eq", "ne", "contains", "gt", "lt", "in"]).default("eq"), value: z.union([z.string().max(80), z.number(), z.array(z.string().max(40)).max(8)]) }).strict();
const worldRef = z.string().regex(/^(model@)?\d+$|^current$/, "a world is a model version (3 or model@3) or current");
export const WORLD_TOOLS: ToolDef[] = [
  { name: "world_why", effect: "read", untrusted: true, input: z.object({ ref: RefSchema, show }).strict(),
    description: "Why is this ref what it is? State, when it began, the transition and decision that changed it, who proposed or observed it, evidence for and against, what it depends on and what depends on it. Each answer says whether it was recorded, derived, or is not recorded." },
  { name: "world_impact", effect: "read", untrusted: true, input: z.object({ ref: RefSchema, dir: z.enum(["down", "up", "both"]).default("down"), depth: z.number().int().min(1).max(4).default(2), kinds: z.array(z.enum(["claim", "unknown", "decision", "proposal", "artifact", "evidence", "lens", "field", "gate"])).max(6).optional(), gate: z.boolean().default(false).describe("only what lies on a path to the release gate"), show }).strict(),
    description: "What depends on this (down), what it depends on (up), or both, as a small focused graph: direct dependents, transitive count, stale consequences, and the shortest path to the gate." },
  { name: "world_diff", effect: "read", untrusted: true, input: z.object({ a: worldRef, b: worldRef.default("current"), show }).strict(),
    description: "What changed in the Product Model between two settled worlds: added, changed, removed entities with prior values and the decisions that explain them. Read-only; the current world is untouched." },
  { name: "world_timeline", effect: "read", untrusted: true, input: z.object({ ref: RefSchema.optional(), git: z.boolean().default(false).describe("also list local git commits that touched the run directory (read-only)"), show }).strict(),
    description: "The settled transitions of the Product Model, or of one ref: when each version settled, what it added or changed, and its decisions." },
  { name: "world_counterfactual", effect: "read", untrusted: true, input: z.object({ candidate: RefSchema, show }).strict(),
    description: "Preview an open proposal without applying it: known, derived, expected and unknown effects, the observations required before it could settle, and who could gather them. A possibility, never a result." },
  { name: "world_reach", effect: "read", input: z.object({ need: z.enum(CAPABILITIES).optional(), ref: RefSchema.optional(), show }).strict().refine((v) => !!v.need !== !!v.ref, { message: "give exactly one of need or ref" }),
    description: "Which outside capability could gather missing evidence, and how far each provider has climbed: available, installed, configured, probed, reachable, authorized. Nothing is run or contacted." },
  { name: "world_replay", effect: "read", untrusted: true, input: z.object({ selects: z.string().regex(/^file:evidence\/[^?]+#table\d+$/, "file:evidence/<lens>/<file>#tableN"), where: z.array(Pred).max(4).optional(), expect: z.array(Pred).min(1).max(4), discriminates: z.array(RefSchema).max(6).optional(), show }).strict(),
    description: "Run an observation criterion again over recorded evidence: select rows of an evidence table, assert what must hold. The result is evidence for the router and owner; it settles nothing." },
];
TOOLS.push(...WORLD_TOOLS);

// ---- the Workbench: the workflow, capabilities, the task contract, and the owner's work requests. work_update only moves a request the agent holds. ----
// It can acknowledge, report progress, attach refs, and mark ready_for_review. It cannot accept, reject, or cancel: those are the owner's, and the
// reducer refuses them with AUTHORITY_HUMAN. It is offered only while a request is pending, so the always-visible catalogue stays small.
export const WORK_TOOLS: ToolDef[] = [
  { name: "work_get", effect: "read", untrusted: true, input: z.object({ part: z.enum(["summary", "requests", "workflow", "capabilities", "contract", "ledger", "screen"]).default("summary"), id: z.string().regex(/^R\d+$/).optional(), stage: z.string().regex(/^[a-z][a-z-]*$/).optional(), capability: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(), show }).strict(),
    description: "The Workbench in one call. summary: the screen mode and why, the current workflow stage, and the owner's pending work requests (typed, durable, what they asked; a request is queued until you acknowledge it). requests: all of them, or one by id. workflow: the real stages and their status. capabilities: each lens as capability, implementation candidates and the binding, executor, and availability (unknown is not usable). contract: the task contract of a stage. ledger: the evidence ledger (pass, pending, fail, unknown). screen: the composed Workbench. Reads only; nothing here runs work." },
  { name: "work_update", effect: "compose", input: z.object({ id: z.string().regex(/^R\d+$/), status: z.enum(REQUEST_STATUSES), note: z.string().max(400).optional(), refs: z.array(RefSchema).max(8).optional() }).strict(),
    description: "Move a work request you hold: acknowledged (you picked it up), running, produced, ready_for_review (needs refs to what you produced, or a note), blocked, failed. Attach refs to artifacts or evidence you produced. You cannot accept your own work: accepted, cancelled, and the owner's review belong to the owner and are refused." },
];
TOOLS.push(...WORK_TOOLS);
export const BASE_TOOLS = TOOLS.filter((t) => !t.name.startsWith("world_") && t.name !== "work_update").map((t) => t.name);

// Which tools are worth showing the agent right now. This is discovery, not authorization: every tool stays callable from the CLI,
// and none of them can do more than read the run or compose the cockpit as the agent role.
export type ToolContext = { mode: WorldMode; subjects: string[]; pendingWork?: boolean };
export function activeTools(c: ToolContext): string[] {
  const has = (...k: string[]) => c.subjects.some((s) => k.includes(s));
  const on = new Set<string>(BASE_TOOLS);
  if (c.subjects.length || c.mode !== "current") { on.add("world_why"); on.add("world_impact"); }
  if (c.mode === "historical" || has("version")) { on.add("world_diff"); on.add("world_timeline"); }
  if (c.mode === "candidate" || has("proposal")) { on.add("world_counterfactual"); on.add("world_replay"); on.add("world_reach"); }
  if (has("unknown", "claim")) on.add("world_reach");
  if (has("evidence")) on.add("world_replay");
  if (c.pendingWork) on.add("work_update");
  return TOOLS.filter((t) => on.has(t.name)).map((t) => t.name);
}
export const TOOL_NAMES = TOOLS.map((t) => t.name);
// `annotations` follow WebMCP's ToolAnnotations: readOnlyHint, and untrustedContentHint for tools whose output carries text the run's files supplied.
export function toolSchemas(only?: string[]) {
  return TOOLS.filter((t) => !only || only.includes(t.name)).map((t) => ({ name: t.name, description: t.description, inputSchema: z.toJSONSchema(t.input, { unrepresentable: "any", io: "input" }), annotations: { readOnlyHint: t.effect === "read", untrustedContentHint: !!t.untrusted } }));
}
