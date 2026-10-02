// The semantic tool surface. One definition feeds three transports: the local CLI (`actualize ui ...`), the loopback MCP endpoint,
// and WebMCP in the page. Every tool is either a read, or composes the cockpit through the same typed actions an agent sends directly.
// None of them can answer for the owner, edit the Product Model, or touch the rail: those capabilities do not exist here.
import { z } from "zod";
import { AgentActionSchema } from "./actions";
import { SurfaceSchema, PlacementSchema, AskBase } from "./spec";
import { RefSchema } from "./refs";

const idStr = z.string().min(1).max(48);
export type ToolDef = { name: string; description: string; input: z.ZodType; effect: "read" | "compose" };

export const TOOLS: ToolDef[] = [
  { name: "get_status", effect: "read", input: z.object({}).strict(),
    description: "Where the actualization is: phase, model version, active lenses, wave, counts (open proposals, unknowns, contradictions, stale, blockers), gate, next action, whether the owner is needed. Read from the process; the cockpit cannot change it." },
  { name: "get_workspace", effect: "read", input: z.object({}).strict(),
    description: "What the owner currently sees: visible surfaces, focus, their selection, open questions, layout summary, recent interactions. Compact on purpose." },
  { name: "get_vocabulary", effect: "read", input: z.object({ block: z.string().max(20).optional() }).strict(),
    description: "The fixed composition vocabulary: blocks (when to use each), sources, refs, placement, operations. Pass block for one block's example." },
  { name: "list_items", effect: "read", input: z.object({ what: z.enum(["claims", "unknowns", "decisions", "proposals", "artifacts", "blockers", "responses", "lenses"]), filter: z.string().max(100).optional(), limit: z.number().int().min(1).max(50).default(20) }).strict(),
    description: "Compact id + one-line rows of process entities (filter like status=open, grade=CONTRADICTED, status=stale)." },
  { name: "get_entity", effect: "read", input: z.object({ ref: RefSchema }).strict(),
    description: "One entity in full: fields, related entities, consequence, next affordances." },
  { name: "show_surface", effect: "compose", input: z.object({ surface: SurfaceSchema, place: PlacementSchema.optional() }).strict(),
    description: "Show or replace a surface composed from the fixed blocks. Existing surfaces keep the owner's position." },
  { name: "show_ref", effect: "compose", input: z.object({ ref: RefSchema, beside: idStr.optional(), as: z.enum(["detail", "document", "lineage"]).default("detail") }).strict(),
    description: "Show a claim, unknown, proposal, decision, artifact, evidence file, lens, or the gate using a standard template; as=document opens the file, as=lineage the claim graph." },
  { name: "compare_refs", effect: "compose", input: z.object({ a: RefSchema, b: RefSchema, beside: idStr.optional() }).strict(),
    description: "Compare two artifacts or evidence files (text diff) or two entities side by side." },
  { name: "ask_human", effect: "compose", input: AskBase.extend({ place: PlacementSchema.optional() }).strict(),
    description: "Ask the owner one question as an ask block (confirm|select|multiselect|text|multiline|search|path). Use resolves to name the unknown/proposal/decision it bears on. You cannot answer it: read the answer with read_responses." },
  { name: "arrange", effect: "compose", input: z.object({ action: AgentActionSchema }).strict(),
    description: "Any typed workspace action: surface.patch (bind, filter, sort, highlight, select), surface.remove, view.focus, view.place, view.size, layout.save|restore|reset, note.add, ask.withdraw." },
  { name: "annotate", effect: "compose", input: z.object({ target: z.string().max(80), text: z.string().min(1).max(400), tone: z.enum(["note", "warning", "danger", "ok"]).default("note") }).strict(),
    description: "Pin an agent note to a ref or surface (visibly marked as the agent's)." },
  { name: "read_responses", effect: "read", input: z.object({ unhandled: z.boolean().default(true) }).strict(),
    description: "What the owner answered, ruled, confirmed, or annotated. Routing them (proposals, decisions) is the router's job through the process CLI; this tool only reads." },
];
export const TOOL_NAMES = TOOLS.map((t) => t.name);
export function toolSchemas() {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: z.toJSONSchema(t.input, { unrepresentable: "any", io: "input" }) }));
}
