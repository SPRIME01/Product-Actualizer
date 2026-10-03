// Typed cockpit actions. Every change to what the cockpit shows is one of these, validated, authority-checked, then applied.
//   agent intent -> action -> schema -> authority/invariants -> state transition -> render      (never: agent -> DOM)
import { z } from "zod";
import { SurfaceSchema, PlacementSchema, SourceSchema } from "./spec";
import { RefSchema } from "./refs";
import { CONTROL_OPS } from "./work";

const sid = z.string().min(1).max(48);

// ---- agent actions (content, layout requests, annotations) ----------------------------------------------------
const Put = z.object({ op: z.literal("surface.put"), surface: SurfaceSchema, place: PlacementSchema.optional() }).strict();
const Patch = z.object({
  op: z.literal("surface.patch"), id: sid, block: sid.optional(),
  set: z.object({
    source: SourceSchema.optional(),
    filter: z.array(z.object({ field: z.string().max(40), op: z.enum(["eq", "ne", "contains", "gt", "lt", "in"]).default("eq"), value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]) }).strict()).max(6).optional(),
    sort: z.object({ field: z.string().max(40), dir: z.enum(["asc", "desc"]).default("asc") }).strict().optional(),
    highlight: z.array(z.string().max(60)).max(20).optional(),
    select: RefSchema.nullable().optional(),
    title: z.string().min(1).max(60).optional(), summary: z.string().max(240).optional(),
  }).strict().refine((v) => Object.keys(v).length > 0, { message: "set is empty" }),
}).strict();
const Remove = z.object({ op: z.literal("surface.remove"), id: sid }).strict();
const Focus = z.object({ op: z.literal("view.focus"), id: sid, ref: RefSchema.optional() }).strict();
const Place = z.object({ op: z.literal("view.place"), id: sid, place: PlacementSchema }).strict();
const Size = z.object({ op: z.literal("view.size"), id: sid, state: z.enum(["normal", "minimized", "maximized"]) }).strict();
const Save = z.object({ op: z.literal("layout.save"), name: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/) }).strict();
const Restore = z.object({ op: z.literal("layout.restore"), name: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/).default("previous") }).strict();
const Reset = z.object({ op: z.literal("layout.reset"), keep: z.array(sid).max(8).optional() }).strict();
const Note = z.object({ op: z.literal("note.add"), target: z.union([RefSchema, z.string().regex(/^surface:[\w.-]+(#[\w.-]+)?$/)]), text: z.string().min(1).max(400), tone: z.enum(["note", "warning", "danger", "ok"]).default("note") }).strict();
const Withdraw = z.object({ op: z.literal("ask.withdraw"), id: sid, reason: z.string().min(4).max(160) }).strict();

export const AgentActionSchema = z.discriminatedUnion("op", [Put, Patch, Remove, Focus, Place, Size, Save, Restore, Reset, Note, Withdraw]);
export type AgentAction = z.infer<typeof AgentActionSchema>;
export const AGENT_OPS = ["surface.put", "surface.patch", "surface.remove", "view.focus", "view.place", "view.size", "layout.save", "layout.restore", "layout.reset", "note.add", "ask.withdraw"] as const;

// ---- human operations (arrive only over the authenticated human channel) -----------------------------------------
const AnswerValue = z.union([z.string().max(2000), z.array(z.string().max(200)).max(12), z.boolean()]);
const HAnswer = z.object({
  op: z.literal("human.answer"), surface: sid, ask: sid, outcome: z.enum(["answered", "deferred", "cancelled"]),
  value: AnswerValue.optional(), note: z.string().max(600).optional(),
}).strict();
const HRule = z.object({ op: z.literal("human.rule"), ref: RefSchema, ruling: z.enum(["accept", "reject", "question", "answer"]), reason: z.string().max(600).optional() }).strict();
const HConfirm = z.object({ op: z.literal("human.confirm"), surface: sid, block: sid, outcome: z.enum(["confirmed", "declined"]), note: z.string().max(400).optional() }).strict();
const HAnnotate = z.object({
  op: z.literal("human.annotate"), target: z.union([RefSchema, z.string().regex(/^surface:[\w.-]+(#[\w.-]+)?$/)]),
  text: z.string().min(1).max(1000), kind: z.enum(["comment", "issue", "approval"]).default("comment"),
  at: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), item: z.string().max(60).optional() }).strict().optional(),
}).strict();
const HSelect = z.object({ op: z.literal("human.select"), surface: sid, block: sid, ref: RefSchema.nullable() }).strict();
const HControl = z.object({ op: z.literal("human.control"), surface: sid, block: sid, set: z.object({ filter: z.array(z.any()).max(6).optional(), sort: z.any().optional() }).strict() }).strict();
const HLayout = z.object({ op: z.literal("human.layout"), tree: z.any(), moved: z.array(sid).max(24).optional(), minimized: z.array(sid).max(24).optional(), maximized: sid.nullable().optional(), focus: sid.nullable().optional() }).strict();
const HPin = z.object({ op: z.literal("human.pin"), id: sid, pinned: z.boolean() }).strict();
const HClose = z.object({ op: z.literal("human.close"), id: sid }).strict();
export const TEMPLATE_IDS = ["workbench", "workflow", "capabilities", "contract", "requests", "review", "case", "trace", "proposals", "claims", "contradictions", "unknowns", "staleness", "lenses", "gate", "inbox", "events", "ref"] as const;
const HOpen = z.object({ op: z.literal("human.open"), template: z.enum(TEMPLATE_IDS), ref: RefSchema.optional(), as: z.enum(["detail", "document", "lineage", "why", "impact", "diff", "case", "decision"]).optional() }).strict();
const HSize = z.object({ op: z.literal("human.size"), id: sid, state: z.enum(["normal", "minimized", "maximized"]) }).strict();
const HLayoutOps = z.object({ op: z.literal("human.layout-restore"), name: z.string().max(32).default("previous") }).strict();

export const HumanOpSchema = z.discriminatedUnion("op", [HAnswer, HRule, HConfirm, HAnnotate, HSelect, HControl, HLayout, HPin, HClose, HLayoutOps, HOpen, HSize]);
export type HumanOp = z.infer<typeof HumanOpSchema>;
export const HUMAN_OPS = [...CONTROL_OPS, "human.answer", "human.rule", "human.confirm", "human.annotate", "human.select", "human.control", "human.layout", "human.pin", "human.close", "human.layout-restore", "human.open", "human.size"] as const;
// Of these, the ones that carry the owner's authority over the process. They become inbox records and are never accepted from an agent role.
export const AUTHORITY_OPS = new Set(["human.answer", "human.rule", "human.confirm", "human.annotate"]);

// ---- results ---------------------------------------------------------------------------------------------------
export const ERROR_CODES = [
  "SCHEMA",               // the action or surface does not match the vocabulary; `issues` says where
  "UNKNOWN_OP",
  "AUTHORITY_SYSTEM",     // the process rail and process state are not composable
  "AUTHORITY_HUMAN",      // human-only operation attempted by an agent role
  "AUTHORITY_PINNED",     // the human pinned this surface
  "AUTHORITY_LAYOUT",     // the human placed this surface; the agent may change its content, not its position
  "NOT_FOUND",
  "BAD_SOURCE",           // source does not resolve to anything
  "BAD_REF",              // a ref names an entity that does not exist in this run
  "CLUTTER_CAP",
  "NO_RESPONDER",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export type Issue = { path: string; message: string; expected?: string };
export type ActionError = { ok: false; code: ErrorCode; message: string; issues?: Issue[] };
export type ActionOk = { ok: true; rev: number; effects: string[]; warnings?: string[] };
export type ActionResult = ActionOk | ActionError;

// Compact, machine-readable zod errors: where, what, and (for unions) what was expected.
export function issuesOf(e: z.ZodError): Issue[] {
  return e.issues.slice(0, 8).map((i) => {
    const expected = (i as any).options ? (i as any).options.join("|") : (i as any).values ? (i as any).values.join("|") : undefined;
    return { path: i.path.join("."), message: i.message, ...(expected ? { expected } : {}) };
  });
}
export const fail = (code: ErrorCode, message: string, issues?: Issue[]): ActionError => ({ ok: false, code, message, ...(issues ? { issues } : {}) });
