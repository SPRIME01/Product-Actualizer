// The control-plane vocabulary: work requests and their lifecycle, and the owner's control operations. Pure data and schemas, shared by the
// server, the tools, and the page. Nothing here executes work: a request is a typed record that says what the owner asked for, and only an
// executor that acknowledges it can move it. The agent can report progress; it can never accept its own work.
import { z } from "zod";
import { RefSchema } from "./refs";

export const REQUEST_STATUSES = ["queued", "acknowledged", "running", "produced", "ready_for_review", "accepted", "blocked", "cancelled", "failed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const TERMINAL: readonly RequestStatus[] = ["accepted", "cancelled", "failed"];
export type Role = "agent" | "human";

// from -> to -> who may move it. The table is the lifecycle; anything not in it is refused with the legal next states.
export const TRANSITIONS: Record<RequestStatus, Partial<Record<RequestStatus, Role[]>>> = {
  queued: { acknowledged: ["agent"], blocked: ["agent"], failed: ["agent"], cancelled: ["human"] },
  acknowledged: { running: ["agent"], blocked: ["agent"], failed: ["agent"], cancelled: ["human"] },
  running: { produced: ["agent"], ready_for_review: ["agent"], blocked: ["agent"], failed: ["agent"], cancelled: ["human"] },
  produced: { ready_for_review: ["agent"], running: ["agent"], failed: ["agent"], cancelled: ["human"] },
  ready_for_review: { accepted: ["human"], blocked: ["human"], running: ["agent"], cancelled: ["human"] },
  blocked: { acknowledged: ["agent"], running: ["agent"], failed: ["agent"], cancelled: ["human"] },
  accepted: {}, cancelled: {}, failed: {},
};
export const legalNext = (from: RequestStatus, by: Role): RequestStatus[] => (Object.entries(TRANSITIONS[from]) as [RequestStatus, Role[]][]).filter(([, w]) => w.includes(by)).map(([s]) => s);

// What the terminal could tell about a request. `unclassified` is a valid answer: the words did not name a capability.
export const REQUEST_KINDS = ["capability", "steer", "split", "rebuild", "unclassified"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

// ---- the owner's control operations (arrive only over the authenticated human channel) -------------------------------------
const sid = z.string().min(1).max(48);
const reqId = z.string().regex(/^R\d+$/, "a request id like R3");
const HTerminal = z.object({ op: z.literal("human.terminal"), text: z.string().min(1).max(500) }).strict();
const HReview = z.object({ op: z.literal("human.review"), subject: z.union([reqId, RefSchema]), outcome: z.enum(["accepted", "rejected"]), note: z.string().max(400).optional() }).strict();
const HCancel = z.object({ op: z.literal("human.cancel"), request: reqId }).strict();
const HBind = z.object({ op: z.literal("human.bind"), capability: z.string().regex(/^[a-z][a-z0-9-]*$/), implementation: z.string().max(60).nullable().optional(), executor: sid.nullable().optional() }).strict();
const Budget = z.object({ minutes: z.number().int().min(1).max(10_000).optional(), lensRuns: z.number().int().min(1).max(200).optional(), note: z.string().max(200).optional() }).strict();
const HContract = z.object({ op: z.literal("human.contract"), stage: z.string().regex(/^[a-z][a-z-]*$/), budget: Budget.optional(), invariants: z.array(z.string().min(1).max(200)).max(8).optional(), addInvariant: z.string().min(1).max(200).optional(), executor: sid.nullable().optional() }).strict();
const HExecutor = z.object({ op: z.literal("human.executor"), id: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/), label: z.string().min(1).max(60), kind: z.enum(["agent", "tool", "human"]), provider: z.string().max(60).optional(), model: z.string().max(60).optional(), role: z.string().max(60).optional() }).strict();
export const ControlOpSchema = z.discriminatedUnion("op", [HTerminal, HReview, HCancel, HBind, HContract, HExecutor]);
export type ControlOp = z.infer<typeof ControlOpSchema>;
export const CONTROL_OPS = ["human.terminal", "human.review", "human.cancel", "human.bind", "human.contract", "human.executor"] as const;
export const isControlOp = (op: unknown): op is (typeof CONTROL_OPS)[number] => typeof op === "string" && (CONTROL_OPS as readonly string[]).includes(op);

// ---- screens -----------------------------------------------------------------------------------------------------------
export const SCREEN_MODES = ["orient", "execute", "decide", "verify", "complete"] as const;
export type ScreenMode = (typeof SCREEN_MODES)[number];
