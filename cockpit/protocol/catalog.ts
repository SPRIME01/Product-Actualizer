// The vocabulary, in the shape an agent needs it: when to reach for each block, the smallest valid example, and what the human can do with it.
// Every example is parsed against the schema in tests, so this file cannot drift from the code that renders.
import type { BlockType } from "./spec";

export type CatalogEntry = { type: BlockType; use: string; avoid: string; affords: string; example: Record<string, unknown> };

export const CATALOG: CatalogEntry[] = [
  { type: "metric", use: "one number judged against a limit: current vs budget, count vs target", avoid: "lists of numbers (use table or chart)", affords: "click through to the refs behind the number",
    example: { type: "metric", id: "peak", label: "Peak load", value: 3.06, unit: "A", of: "2.5 A supply", tone: "danger", refs: ["claim:C57"] } },
  { type: "callout", use: "the one sentence the human must not miss: a warning, a contradiction, a caveat, an unknown that blocks", avoid: "decoration; more than one per surface", affords: "refs open beside; [[C42]] in text becomes a grade-coloured chip",
    example: { type: "callout", id: "why", tone: "warning", text: "The servo rail exceeds the supply budget at start-up [[C57]]." } },
  { type: "table", use: "many comparable rows: claims, proposals, measurements, gate rows (use `group` for lanes)", avoid: "fewer than 3 rows (use entity), or time order (use timeline)", affords: "sort, filter, select a row (feeds a following entity block), open the row's ref",
    example: { type: "table", id: "open", source: "pa:proposals?status=open", columns: [{ field: "id", kind: "ref" }, { field: "proposal" }, { field: "lens" }] } },
  { type: "tree", use: "nesting: the run trace (pa:trace), artifacts or evidence by folder", avoid: "flat lists; dependencies (use graph)", affords: "expand, select a node, jump to its ref",
    example: { type: "tree", id: "trace", source: "pa:trace", expand: 2, show: ["status", "duration"] } },
  { type: "timeline", use: "what happened in order: events, model versions", avoid: "state that is not about time", affords: "filter by type, jump to the subject",
    example: { type: "timeline", id: "recent", source: "pa:events", window: 30 } },
  { type: "graph", use: "dependency or causality: lens order, why artifacts are stale, a claim's lineage, a physical system", avoid: "anything a table says as well; over 40 nodes", affords: "pan/zoom, select a node, open its ref",
    example: { type: "graph", id: "stale", source: "graph:staleness" } },
  { type: "chart", use: "magnitudes against a threshold: power by state, margin by rail, counts by lens", avoid: "two or three values (use metric); decoration", affords: "hover values, select a mark's row",
    example: { type: "chart", id: "load", kind: "bar", data: [{ state: "idle", amps: 1.22 }, { state: "stall", amps: 3.06 }], x: "state", series: [{ y: "amps", label: "load" }], threshold: { value: 2.5, label: "supply", tone: "danger" }, unit: "A" } },
  { type: "compare", use: "two to four things judged against each other: diff (text), side (views), overlay (reference vs output image), matrix (options x criteria for a decision)", avoid: "one thing", affords: "swap sides, step through differences, pick an option (with a decision block)",
    example: { type: "compare", id: "options", mode: "matrix", items: [{ label: "Larger supply" }, { label: "Separate servo rail" }], criteria: [{ name: "Cost", cells: [{ text: "low" }, { text: "medium, new regulator", tone: "warning" }] }] } },
  { type: "media", use: "images from the run: references, captures, screenshots, with pins for the human to mark defects", avoid: "text documents", affords: "drop an annotation pin (recorded in the inbox)",
    example: { type: "media", id: "shots", items: [{ label: "reference", src: "file:evidence/recon-software/ref.png" }] } },
  { type: "document", use: "read a run file in place: an artifact, an evidence log, a datasheet excerpt; scroll to a line or a claim", avoid: "summaries you can write as a callout", affords: "select text to annotate; [[refs]] become chips",
    example: { type: "document", id: "doc", source: "file:artifacts/electronics/electrical-review.md", anchor: "claim:C57" } },
  { type: "entity", use: "one claim, unknown, proposal, decision, artifact, evidence file, lens, or the gate in full: grade, sources, what it touches, consequence, next actions", avoid: "many rows (use table)", affords: "accept/reject/question a proposal, answer an unknown, challenge a claim, comment on an artifact (all recorded, none applied)",
    example: { type: "entity", id: "p", ref: "proposal:P17", show: ["consequence", "actions"] } },
  { type: "preflight", use: "a state-changing physical action the owner must see and confirm before the agent performs it", avoid: "read-only discovery", affords: "confirm or decline (recorded as a confirmation; the agent still acts through the normal path)",
    example: { type: "preflight", id: "flash", action: { class: "state-changing", target: "neck RP2040 on /dev/ttyACM0", currentState: "runs v0.3, rails 5.0 V/3.3 V", expected: "boot log shows v0.4", stopIf: "no enumeration after 10 s", bounds: "UF2 only, no erase", action: "copy neck-v0.4.uf2", boundedBy: "single file copy", observation: "serial boot log, owner watches the servo", recovery: "hold BOOTSEL, reflash v0.3" } } },
  { type: "progress", use: "live activity: the run, a wave, one lens, the gate", avoid: "anything the agent would have to set by hand (it cannot)", affords: "none; it is bound to the event stream",
    example: { type: "progress", id: "wave", label: "Wave progress", source: "wave" } },
  { type: "ask", use: "one question only the owner can answer: confirm, select, multiselect, text, multiline, search (claims/unknowns), path (an artifact or evidence file)", avoid: "questions the evidence answers; more than one open at a time unless grouped in a form", affords: "answer, defer (becomes an open unknown), or cancel (recorded)",
    example: { type: "ask", id: "dir", prompt: "Which direction should the servo supply take?", input: "select", options: [{ value: "rail", label: "Independent rail", consequence: "adds a regulator; D7 touches constraints" }, { value: "bigger", label: "Larger supply" }], resolves: "unknown:U8" } },
  { type: "form", use: "several related decisions submitted together", avoid: "one question (use ask)", affords: "answer each; submit once",
    example: { type: "form", id: "go", title: "Beta decisions", asks: [{ id: "a1", prompt: "Ship without the camera?", input: "confirm" }, { id: "a2", prompt: "Why?", input: "text" }] } },
];

export const INTENTS = { inspect: "understand something", compare: "weigh alternatives", decide: "needs an answer", verify: "check a claim against evidence", monitor: "watch live work" } as const;

export function vocabulary(only?: string) {
  const list = only ? CATALOG.filter((c) => c.type === only) : CATALOG;
  return {
    blocks: list.map((c) => ({ type: c.type, use: c.use, avoid: c.avoid, affords: c.affords, ...(only ? { example: c.example } : {}) })),
    surface: "{ id, title, summary?, intent: inspect|compare|decide|verify|monitor, layout: stack|columns, blocks: [..1-12 blocks..] }",
    sources: "pa:<claims|unknowns|decisions|proposals|artifacts|evidence|lenses|waves|events|blockers|versions|responses|trace>[?k=v] | graph:<lenses|staleness|claims?focus=claim:C1|model> | file:<artifacts|evidence|history>/<path>[#tableN|#<ref>] | inline data (marked agent-supplied)",
    refs: "claim:C1 unknown:U1 proposal:P1 decision:D1 artifact:<lens>/<file> evidence:<lens>/<path> lens:<name> field:<key> version:<n> gate; write [[C1]] in text for a chip",
    placement: "{ rel: within|left|right|above|below, to: <surface id>|active, size?: 0.15-0.85, focus?: bool }",
    ops: ["surface.put", "surface.patch", "surface.remove", "view.focus", "view.place", "view.size", "layout.save", "layout.restore", "layout.reset", "note.add", "ask.withdraw"],
    rules: ["you cannot edit or hide the process rail", "you cannot answer: ask, then read_responses", "a surface the owner placed keeps its position", "pinned surfaces cannot be removed", "at most 8 surfaces; the least recent unpinned one is closed to make room"],
  };
}
