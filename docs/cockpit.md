# The cockpit

An interactive workbench the owner and the agent share while a run is going. It is optional: the process, the hooks, and every artifact work without it, and closing it never pauses a run.

```
just cockpit-up                     # from the project, or PROJECT=<dir>; opens your browser
actualize cockpit up|down|open|status|rebuild|reset
actualize ui context                # what the agent sees of it
actualize inbox                     # what the owner has answered
```

The complete verb set is `up`, `serve` (internal, spawned by `up`), `open`, `down`, `status`, `rebuild`, `reset`;
see [the CLI reference](reference/cli.md) for flags. For the subsystem as a component see
[the cockpit subsystem guide](subsystems/cockpit.md); for the exact vocabulary — all 15 blocks, the source grammar,
the error codes, the tools — see [the cockpit protocol reference](reference/cockpit-protocol.md). For asking the product world
*why*, *what changed*, *what depends on this*, and *what would follow*, see [the world debugger](world-debugger.md). For where the work is trying to go and the one move that answers the deviation, see [case navigation](case-navigation.md).

## The picture

```
 Product Model, proposals, artifacts, evidence, .log.jsonl, inbox.jsonl      authoritative, on disk
        │ read (fs.watch, no polling)                       ▲ append only, through the owner's gestures
        ▼                                                   │
 projection ──► SQLite (bun:sqlite)          ┌──────────────┴───────────┐
   claims, unknowns, proposals, artifacts,   │ inbox.jsonl: answers,    │
   events, FTS search, workspace, layouts    │ rulings, confirmations,  │
        │                                    │ annotations              │
        ▼                                    └──────────────────────────┘
 Bun.serve ── WebSocket ──► browser: rail (process) + Dockview workspace (surfaces)
        ▲                          ▲
 agent: CLI / loopback MCP / WebMCP: typed actions only
```

- **The rail** is a projection of process state: product, model version, phase, active lenses, wave, open proposals, unknowns, contradictions, stale artifacts, blockers, gate verdict, whether the owner is needed, and the next action. It is not part of the workspace state, so no action can remove, cover, or edit it.
- **Surfaces** are what the agent shows: a title, an intent (`inspect`, `compare`, `decide`, `verify`, `monitor`), and one to twelve blocks. The agent writes data against a closed vocabulary; the server validates it with Zod and the browser renders it with a fixed registry. Nothing generates HTML, CSS, JavaScript, or React.
- **The workspace** is a Dockview layout (tabs, splits, resize, drag, minimize, maximize, pin). The server holds the arrangement as a small tree; the agent changes it with typed actions, the owner by dragging. The owner's placement wins (below).
- **Owner input** is never applied. An answer, a ruling on a proposal, a confirmation of a physical action, or an annotation is appended to `actualize/inbox.jsonl` with the owner's provenance. The gate stays blocked until the router routes each entry (to a proposal, a decision at the next reconciliation, an unknown opened or closed, or "no action: why") and runs `actualize inbox ack <id> --as "..."`.

## Vocabulary

Fifteen blocks, each with a distinct meaning for the owner (`actualize ui catalog` prints them with examples; `cockpit/protocol/spec.ts` is the source):

| group | blocks |
|---|---|
| read | `metric` · `callout` · `table` (grouped lanes) · `tree` (trace, files) · `timeline` · `graph` · `chart` (bar, line, dot, with a threshold) · `compare` (diff, side, overlay, matrix) · `media` (pins) · `document` · `entity` · `progress` |
| act | `preflight` (a state-changing physical action) |
| ask | `ask` (confirm, select, multiselect, text, multiline, search, path) · `form` (grouped asks) |

Every ask can be deferred (it stays an open question) or skipped (recorded). Data is bound by **source**, not typed in: `pa:claims`, `pa:proposals?status=open`, `pa:artifacts?stale=1`, `pa:trace`, `graph:staleness`, `graph:claims?focus=claim:C9`, `file:evidence/electronics/power-budget.md#table1`. Inline data is shown to the owner as "agent-supplied". Entities are named by refs (`claim:C42`, `proposal:P17`, `artifact:marketing/spec-sheet.md`, `gate`), and `[[C42]]` in text becomes a chip that shows the claim's grade and opens it beside the current view.

Operations (`surface.put`, `surface.patch`, `surface.remove`, `view.focus`, `view.place`, `view.size`, `layout.save|restore|reset`, `note.add`, `ask.withdraw`) are validated, authority-checked, and deterministic. A rejected action returns `{ok:false, code, issues:[{path,message,expected}]}` the agent can correct from. Successful puts may return lint warnings (one callout per surface, no decision surface without a decision, and so on).

## Authority

| tier | owner of it | examples | agent can |
|---|---|---|---|
| system | the process | the rail, gate state, model, grades | read only. There is no action that addresses them. |
| agent | the agent | surface content, annotations, questions, requests to focus or place | compose, patch, remove (unless pinned) |
| owner | the owner | layout, pins, minimized, their filters and sorts, answers, rulings, confirmations, annotations | request, never perform |

Precedence: a surface the owner moved keeps its position, and the agent may update its content; a pinned surface cannot be removed or moved; there are at most eight surfaces (the least recent unpinned one without an open question is closed to make room); `layout.reset` and any eviction can be undone with `layout.restore previous`. New surfaces open beside the focused one without moving it.

Roles are enforced by transport. The owner's WebSocket carries a token that only the browser link holds; `human.*` operations are accepted nowhere else. The agent token (in `.cockpit/agent.token`) reaches tools and typed agent actions, and a `human.*` operation sent that way returns `AUTHORITY_HUMAN`. Requests must come from a loopback host. This separates UI paths (a WebMCP caller on the page, a tool-calling model, injected content) from the owner. It does not sandbox a hostile local shell, which can read the token like any file; the hooks still deny the agent direct writes to the inbox and to `.cockpit/`.

## Agent-visible context

`actualize ui context` (and one status line the hooks add to each prompt while a browser is connected) reports only what the owner currently has: visible surfaces and their block types, focus, their selection, open questions, a one-line layout, minimized surfaces, their last annotations and interactions. It does not include the workspace history or any evidence.

## WebMCP and MCP

The page registers semantic tools on `document.modelContext` (the current WebMCP API: `registerTool(tool, { signal })`, withdrawn by aborting the signal) when the browser provides it, and the same definitions are served as loopback MCP at `/mcp` and as `actualize ui` and `actualize world` commands. Twelve are always offered: `get_status`, `get_workspace`, `get_vocabulary`, `list_items`, `get_entity`, `show_surface`, `show_ref`, `compare_refs`, `ask_human`, `arrange`, `annotate`, `read_responses`. Seven read-only `world_*` tools (`world_why`, `world_impact`, `world_diff`, `world_timeline`, `world_counterfactual`, `world_reach`, `world_replay`) are offered by context: only when the owner is looking at history, a candidate, an unknown, or a subject that makes them useful (see [the world debugger](world-debugger.md)). Offering is discovery, not authorization. There is no tool that answers, rules, confirms, approves, edits the model, or touches the rail, and no raw DOM tool.

## SQLite

`actualize/.cockpit/cockpit.db` holds an indexed projection (claims, unknowns, decisions, proposals, artifacts, versions, lenses, waves, blockers, responses, evidence, full-text search), the process event stream, the workspace and saved layouts, and the owner's recent interactions. It stores references, not artifact bodies. Delete it freely: `actualize cockpit rebuild` (or the next start) regenerates the projection and replays the engine's log; the owner's responses are in `inbox.jsonl`, not in the database. Only the owner's layout, pins, and the surfaces on screen are lost.

## Events

`run.started` · `lenses.selected` · `wave.started` · `lens.started` · `lens.finished` · `reconcile.started` · `model.updated` · `reconcile.finished` · `proposal.added` · `proposal.resolved` · `claim.regraded` · `contradiction.found` · `unknown.opened` · `unknown.closed` · `artifact.created` · `artifact.stale` · `artifact.rebuilt` · `preflight.required` · `human.requested` · `human.responded` · `human.handled` · `gate.updated` · `run.finished`.

The cockpit's own channel adds `surface.put`, `surface.patch`, `surface.removed`, `view.focused`, `view.moved`,
`view.sized`, `layout.saved`, `layout.restored`, `layout.reset`, `note.added`, `ask.withdrawn`, `action.rejected`,
`human.answered`, `human.ruled`, `human.annotated`, and `preflight.answered`. Of these, `action.rejected` is the
only record that a mutation was refused. They come from the engine's append-only log and from diffs between
projections; they are a view, never a source of truth. The full list is in
[the cockpit protocol reference](reference/cockpit-protocol.md).

## Distribution and development

```
bun install
bun test               # protocol, reducer, server, hooks under Bun, compiled executable, browser end-to-end
bun run dev            # cockpit with hot reload against PROJECT
bun run build          # dist/bin/actualize (single executable) + dist/skills + dist/product-model
```

The compiled executable carries the Bun runtime, the process CLI, the hook entry point, the cockpit server, and the bundled UI. Hooks installed from it point at the binary. It reads `skills/` and `product-model/` next to it (override with `ACTUALIZE_HOME`).

Dependencies, and why: `zod` (the validation boundary for every spec and action), `react` and `react-dom` (the renderer), `dockview-react` (docking, splitting, dragging, serialization: a hard interaction problem), `@xyflow/react` (pan, zoom, and selection for graphs), `@tanstack/charts` (declarative charts), `playwright-core` (dev only, drives the system Chrome in tests). Server, WebSocket, pub/sub, static bundling, SQLite, YAML, subprocesses, the test runner, and compilation are Bun's own.
