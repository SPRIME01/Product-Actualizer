// The cockpit's fixed vocabulary. Code owns this file; the agent composes it as data and never writes UI code.
// 15 blocks, each with a distinct interaction or distinction a human relies on. `.strict()` everywhere: an unknown
// property is an error, not a silent no-op, so the agent gets machine-readable feedback instead of a broken view.
import { z } from "zod";
import { RefSchema } from "./refs";

const id = z.string().regex(/^[a-z][a-z0-9._-]{0,47}$/, "ids are lowercase letters, digits, . _ -, starting with a letter, 48 chars max");
const text = (n = 600) => z.string().min(1).max(n);
export const Tone = z.enum(["neutral", "ok", "warning", "danger", "unknown"]);

// ---- data binding ---------------------------------------------------------------------------------------------
// Sources are named read-only projections of process state, a run file, or a small agent-supplied dataset.
//   pa:claims?grade=CONTRADICTED   pa:proposals?status=open   pa:artifacts?stale=1   pa:events?type=lens.finished
//   file:evidence/electronics/power-budget.md#table2   file:artifacts/marketing/spec-sheet.md   graph:lenses
// Agent-supplied `data` is always rendered with an "agent-supplied" mark: a surface cannot pass its own numbers off as process state.
export const PA_SOURCES = ["claims", "unknowns", "decisions", "proposals", "artifacts", "evidence", "lenses", "waves", "events", "blockers", "versions", "responses", "trace"] as const;
export const GRAPH_SOURCES = ["lenses", "staleness", "claims", "model"] as const;
export const SourceSchema = z.string().max(300).refine((s) => {
  const m = /^(pa|graph):([a-z-]+)(\?.*)?$/.exec(s);
  if (m) return (m[1] === "pa" ? (PA_SOURCES as readonly string[]) : (GRAPH_SOURCES as readonly string[])).includes(m[2]);
  return /^file:(artifacts|evidence|history)\/[^#?]+(#[\w.:-]+)?$/.test(s) && !s.includes("..");
}, { message: "source must be pa:<claims|unknowns|decisions|proposals|artifacts|evidence|lenses|waves|events|blockers|versions|responses|trace>[?k=v], graph:<lenses|staleness|claims|model>[?focus=ref], or file:<artifacts|evidence|history>/<path>[#table|#tableN|#<ref>]" });
export type Source = z.infer<typeof SourceSchema>;

const Row = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));
const Data = z.array(Row).max(500);
const Filter = z.object({ field: z.string().max(40), op: z.enum(["eq", "ne", "contains", "gt", "lt", "in"]).default("eq"), value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]) }).strict();
const Sort = z.object({ field: z.string().max(40), dir: z.enum(["asc", "desc"]).default("asc") }).strict();
const bound = { source: SourceSchema.optional(), data: Data.optional(), filter: z.array(Filter).max(6).optional(), sort: Sort.optional() };
const label = text(80).optional();
const cite = z.array(RefSchema).max(12).optional();

// ---- blocks: read ---------------------------------------------------------------------------------------------
const Metric = z.object({
  type: z.literal("metric"), id, label: text(60),
  value: z.union([z.string(), z.number()]), unit: z.string().max(12).optional(),
  of: z.union([z.string(), z.number()]).optional(),          // "2.76 A of 2.5 A": the budget the value is judged against
  tone: Tone.optional(), delta: z.string().max(30).optional(), refs: cite,
}).strict();

const Callout = z.object({
  type: z.literal("callout"), id, tone: z.enum(["note", "ok", "warning", "danger", "unknown"]),
  text: text(900), title: label, refs: cite,   // claim ids in `refs` are shown with their current grade
}).strict();

const Column = z.object({ field: z.string().max(40), label, kind: z.enum(["text", "number", "grade", "ref", "status", "duration"]).default("text"), unit: z.string().max(10).optional() }).strict();
const Table = z.object({
  type: z.literal("table"), id, ...bound, columns: z.array(Column).max(10).optional(),
  group: z.string().max(40).optional(),                    // grouped rows with tone-coded headers: gate lanes, waves
  select: z.boolean().default(true),                       // row selection publishes the row's ref to followers
  highlight: z.array(z.string().max(60)).max(20).optional(), limit: z.number().int().min(1).max(200).optional(), title: label,
}).strict();

const Tree = z.object({
  type: z.literal("tree"), id, ...bound, title: label,
  expand: z.number().int().min(0).max(6).default(1),       // levels open by default; deeper levels are one click away
  show: z.array(z.enum(["status", "duration", "ref"])).max(3).optional(),
}).strict();

const Timeline = z.object({
  type: z.literal("timeline"), id, ...bound, title: label,
  lane: z.string().max(40).optional(),                     // field that splits events into lanes (lens, field)
  window: z.number().int().min(5).max(200).default(40),
}).strict();

const GraphNode = z.object({ id: z.string().max(60), label: z.string().max(60).optional(), kind: z.string().max(24).optional(), tone: Tone.optional(), ref: RefSchema.optional() }).strict();
const GraphEdge = z.object({ from: z.string().max(60), to: z.string().max(60), label: z.string().max(40).optional(), tone: Tone.optional() }).strict();
const Graph = z.object({
  type: z.literal("graph"), id, source: SourceSchema.optional(), title: label,
  nodes: z.array(GraphNode).max(120).optional(), edges: z.array(GraphEdge).max(300).optional(),
  direction: z.enum(["LR", "TB"]).default("LR"), focus: RefSchema.optional(),
}).strict();

const Series = z.object({ y: z.string().max(40), label, tone: Tone.optional() }).strict();
const Chart = z.object({
  type: z.literal("chart"), id, ...bound, title: label,
  kind: z.enum(["bar", "line", "dot"]), x: z.string().max(40), series: z.array(Series).min(1).max(4),
  threshold: z.object({ value: z.number(), label, tone: Tone.optional() }).strict().optional(),   // a budget, a limit, a supply rating
  unit: z.string().max(12).optional(), highlight: z.array(z.string().max(60)).max(10).optional(),
}).strict();

const Item = z.object({ label: text(60), ref: RefSchema.optional(), source: SourceSchema.optional(), data: z.string().max(4000).optional(), image: z.string().max(300).optional() }).strict();
const Compare = z.object({
  type: z.literal("compare"), id, title: label,
  mode: z.enum(["diff", "side", "overlay", "matrix"]),     // diff: text of two things; side: two or more views; overlay: reference vs output image; matrix: options x criteria
  items: z.array(Item).min(2).max(4),
  criteria: z.array(z.object({ name: text(60), cells: z.array(z.object({ text: text(160), tone: Tone.optional(), refs: cite }).strict()).min(2).max(4) }).strict()).max(12).optional(),
}).strict();

const Pin = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0).max(1).optional(), h: z.number().min(0).max(1).optional(), text: text(200), tone: Tone.optional() }).strict();
const Media = z.object({
  type: z.literal("media"), id, title: label,
  items: z.array(z.object({ label: text(60), src: z.string().max(300), alt: z.string().max(200).optional(), pins: z.array(Pin).max(20).optional() }).strict()).min(1).max(12),
  fit: z.enum(["contain", "grid"]).default("contain"),
}).strict();   // `src` is file:evidence/... or file:artifacts/...; humans can drop annotation pins on an item

const Document = z.object({
  type: z.literal("document"), id, source: SourceSchema, title: label,
  lines: z.array(z.number().int().min(1)).max(2).optional(),  // [from] or [from, to] to highlight and scroll to
  anchor: z.string().max(60).optional(),                      // scroll to a ref or heading
  mark: z.array(RefSchema).max(12).optional(),                // [[C42]]-style cites in the text become chips; these are emphasised
}).strict();

const ENTITY_KINDS = ["claim", "unknown", "proposal", "decision", "artifact", "evidence", "lens", "gate"] as const;
const Entity = z.object({
  type: z.literal("entity"), id,
  ref: RefSchema.optional(), follow: id.optional(),          // `follow` shows whatever row the named block has selected
  show: z.array(z.enum(["sources", "grade", "touches", "consequence", "actions"])).max(5).optional(),
}).strict().refine((e) => !!e.ref !== !!e.follow, { message: "give exactly one of ref or follow" });

const Preflight = z.object({
  type: z.literal("preflight"), id,
  action: z.object({
    class: z.enum(["reversible", "state-changing", "irreversible"]),
    target: text(160), currentState: text(240), expected: text(240), stopIf: text(240),
    bounds: text(240), action: text(300), boundedBy: text(200), observation: text(240), recovery: text(240),
  }).strict(),
  evidence: cite,
}).strict();   // the human confirms or declines; the confirmation is recorded, the agent still performs the action through the normal path

const Progress = z.object({
  type: z.literal("progress"), id, label: text(80),
  source: z.enum(["run", "wave", "lens", "gate"]).default("run"), lens: id.optional(),
}).strict();   // bound to the live event stream; the agent cannot set the percentage

// ---- blocks: ask ----------------------------------------------------------------------------------------------
const Option = z.object({ value: text(60), label: text(100), hint: z.string().max(200).optional(), consequence: z.string().max(240).optional(), refs: cite }).strict();
export const AskBase = z.object({
  id, prompt: text(300), why: z.string().max(300).optional(), refs: cite,
  input: z.enum(["confirm", "select", "multiselect", "text", "multiline", "search", "path"]),
  options: z.array(Option).max(12).optional(),             // select, multiselect, search
  placeholder: z.string().max(100).optional(), required: z.boolean().default(true),
  resolves: RefSchema.optional(),                          // the unknown/proposal/decision this answer bears on
  default: z.string().max(200).optional(),
}).strict();
const askRules = (a: z.infer<typeof AskBase>, ctx: z.RefinementCtx) => {
  const needs = ["select", "multiselect", "search"].includes(a.input);
  if (needs && !(a.options && a.options.length >= 2)) ctx.addIssue({ code: "custom", message: `${a.input} needs at least 2 options` });
  if (!needs && a.options) ctx.addIssue({ code: "custom", message: `${a.input} takes no options` });
  if (a.resolves && !/^(unknown|proposal|decision):/.test(a.resolves)) ctx.addIssue({ code: "custom", message: "resolves must be an unknown, proposal, or decision ref" });
};
const Ask = AskBase.extend({ type: z.literal("ask") }).strict().superRefine(askRules);   // always answerable with defer or cancel
const Form = z.object({
  type: z.literal("form"), id, title: label, asks: z.array(AskBase.superRefine(askRules)).min(2).max(8),
}).strict();   // grouped decisions, submitted together

export const BlockSchema = z.discriminatedUnion("type", [Metric, Callout, Table, Tree, Timeline, Graph, Chart, Compare, Media, Document, Entity, Preflight, Progress, Ask, Form]).superRefine((b, ctx) => {
  const sourced = ["table", "tree", "timeline", "chart"].includes(b.type);
  if (sourced) {
    const x = b as { source?: string; data?: unknown[] };
    if (!x.source && !x.data) ctx.addIssue({ code: "custom", message: `${b.type} needs source or data` });
    if (x.source && x.data) ctx.addIssue({ code: "custom", message: `${b.type}: give source or data, not both` });
  }
  if (b.type === "graph" && !b.source && !(b.nodes?.length)) ctx.addIssue({ code: "custom", message: "graph needs source or nodes" });
  if (b.type === "graph" && b.edges) {
    const ids = new Set((b.nodes ?? []).map((n) => n.id));
    for (const e of b.edges) if (!ids.has(e.from) || !ids.has(e.to)) ctx.addIssue({ code: "custom", message: `edge ${e.from}->${e.to} names a node that does not exist` });
  }
  if (b.type === "compare" && b.mode === "matrix" && !b.criteria) ctx.addIssue({ code: "custom", message: "matrix compare needs criteria" });
  if (b.type === "compare" && b.mode === "matrix" && b.criteria) for (const c of b.criteria) if (c.cells.length !== b.items.length) ctx.addIssue({ code: "custom", message: `criterion "${c.name}" needs ${b.items.length} cells` });
  if (b.type === "compare" && b.mode !== "matrix" && !b.items.every((i) => i.source || i.data || i.image)) ctx.addIssue({ code: "custom", message: `${b.mode} compare items need source, data, or image` });
});
export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block["type"];
export const BLOCK_TYPES = ["metric", "callout", "table", "tree", "timeline", "graph", "chart", "compare", "media", "document", "entity", "preflight", "progress", "ask", "form"] as const;

// ---- surface --------------------------------------------------------------------------------------------------
export const SurfaceSchema = z.object({
  id, title: text(60),
  summary: z.string().max(240).optional(),                  // the one line that says why this is on screen (Clack's intro)
  intent: z.enum(["inspect", "compare", "decide", "verify", "monitor"]).default("inspect"),
  layout: z.enum(["stack", "columns"]).default("stack"),    // columns: two equal columns, blocks alternate
  blocks: z.array(BlockSchema).min(1).max(12),
}).strict().superRefine((s, ctx) => {
  const seen = new Set<string>();
  for (const b of s.blocks) {
    if (seen.has(b.id)) ctx.addIssue({ code: "custom", message: `duplicate block id ${b.id}` });
    seen.add(b.id);
    if (b.type === "form") for (const a of b.asks) { if (seen.has(a.id)) ctx.addIssue({ code: "custom", message: `duplicate ask id ${a.id}` }); seen.add(a.id); }
  }
  for (const b of s.blocks) if (b.type === "entity" && b.follow && !s.blocks.some((x) => x.id === b.follow)) ctx.addIssue({ code: "custom", message: `entity ${b.id} follows ${b.follow}, which is not in this surface` });
  if (s.id.startsWith("system")) ctx.addIssue({ code: "custom", message: "surface ids starting with 'system' are reserved for the process rail" });
});
export type Surface = z.infer<typeof SurfaceSchema>;
export const ENTITY_KIND_LIST = ENTITY_KINDS;

// ---- placement ------------------------------------------------------------------------------------------------
// Where a surface appears. Relative, never pixel geometry: `within` makes a tab, the others split the target.
export const PlacementSchema = z.object({
  rel: z.enum(["within", "left", "right", "above", "below"]).default("within"),
  to: z.string().max(48).default("active"),                 // a surface id, or "active" (the focused one)
  size: z.number().min(0.15).max(0.85).optional(),          // share of the target when splitting
  focus: z.boolean().default(true),
}).strict();
export type Placement = z.infer<typeof PlacementSchema>;

// Accept the `surface:` wrapper with a sibling `layout:` list (or `blocks:`), whether the document is parsed YAML or JSON.
export function normalizeSurfaceDoc(raw: any): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const s = raw.surface ?? raw;
  const blocks = s.blocks ?? (Array.isArray(raw.layout) ? raw.layout : Array.isArray(s.layout) ? s.layout : undefined);
  const { layout, ...rest } = s;
  return { ...rest, ...(typeof layout === "string" ? { layout } : {}), blocks };
}
export const parseSurfaceText = (src: string): unknown => normalizeSurfaceDoc((Bun as any).YAML.parse(src));
