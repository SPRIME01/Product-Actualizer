# Cockpit (subsystem guide)

Layer 3. For the operator's view of the same subsystem see [../cockpit.md](../cockpit.md); this page is how the code is actually built.

## Purpose

One interactive surface the owner and the agent share while a run is going. The agent composes views of process state; the owner answers, rules, confirms, and lays out; neither becomes a second source of truth. The run directory stays authoritative. The SQLite file holds two classes: a disposable projection of the run, and durable cockpit-owned state (layout, work requests, bindings, declared budgets, reviews) that never settles Product Model truth ([../workbench.md](../workbench.md)). Every owner gesture that bears on the process becomes an inbox entry the router still has to route.

## Responsibilities

- Project the run directory into a queryable form (`cockpit/server/project.ts` → `sync.ts` → `db.ts`) and keep it current from filesystem change, not from a poll.
- Publish the rail: product, model version, phase, active lenses, wave, counts, gate verdict, whether the owner is needed, next action (`project.ts` `railOf`).
- Validate agent compositions against a closed vocabulary (`protocol/spec.ts`, `protocol/actions.ts`) and apply them through one pure reducer (`server/workspace.ts`).
- Enforce three authority tiers by code, not by convention, and by transport role.
- Record every owner gesture as an authoritative inbox row; apply none of them itself.
- Serve one local HTTP + WebSocket process and render it with a fixed block registry.

## Non-responsibilities

- Owning run state. `actualize cockpit status` returning `down` changes nothing; `cockpit down` says "the run, the model, and the inbox are untouched" (`cli.ts:59`). A closed cockpit never pauses a run (`live.test.ts:54-66`).
- Editing `product-model.md`, `proposals.md`, `state.json`, or `.log.jsonl`. Verified by hashing every run file before and after tools plus human gestures: only `inbox.jsonl` changes (`authority.test.ts:54-69`).
- Answering, ruling, confirming, or approving. Those exist only as `human.*` operations and only on the owner's socket.
- Being an approval channel. A confirmed preflight is a recorded confirmation; the hook still denies the actual flash command (`authority.test.ts:136-147`).
- Rendering agent-authored code. There is no HTML, CSS, JS, or DOM property in the vocabulary (`grammar.test.ts:60-67`).

## Position in the system

The cockpit is a consumer of the process, not a component of it. The hooks (`../hooks.md`) own enforcement and never call it; they only read `.cockpit/context.json` for one status line, and only while `connected` is true (`authority.test.ts:168-178`). `skills/cockpit/` teaches the agent the tool surface. `bun run build` compiles one binary carrying the process CLI, hooks, cockpit server, and bundled SPA (`build.ts`).

```
run dir (product-model.md, proposals.md, artifacts, evidence, .log.jsonl, inbox.jsonl)
   │ fs.watch, 60 ms debounce, no polling          │ append-only
   ▼                                               │
Syncer → project() → Proj ──► SQLite (entities, fts, events, ui_state, interactions)
   │                                                │
   ▼                                                │
core.ts: rail, reducer, tools, inbox ── Bun.serve ── WS ──► browser: rail + Dockview
   ▲                      ▲                          ▲
agent role (agent.token)   human role (#t=… link)   WebMCP (document.modelContext)
```

**Transport is the role boundary.** Two random tokens are minted per start: the human token lives only in the `#t=` fragment of the browser link, the agent token is written to `.cockpit/agent.token`. Only a human token may open `/ws` (`serve.ts:54-56`), and the socket handler accepts only ops in `HUMAN_OPS`. An agent token reaches `/api/agent/action` and `/api/agent/tool`, and a `human.*` op sent that way is refused by the reducer with `AUTHORITY_HUMAN` (`workspace.ts:180`). `/api/boot` hands the agent token to the human-role page so WebMCP calls through the same path. Every request must carry a loopback `Host` and, when a browser sends one, a loopback `Origin` (`serve.ts:34-41`).

This separates UI paths — a WebMCP caller in the page, a tool-calling model, injected content — from the owner. It does **not** sandbox a hostile local shell, which can read the token like any other file. The hooks are the second layer: they deny the agent direct writes to `inbox.jsonl` and to `.cockpit/` (`hooks-bun.test.ts:100-107`).

## Core abstractions

**Block types.** Exactly fifteen, `BLOCK_TYPES` at `spec.ts:165`: `metric`, `callout`, `table`, `tree`, `timeline`, `graph`, `chart`, `compare`, `media`, `document`, `entity`, `preflight`, `progress`, `ask`, `form`. Each is a `.strict()` Zod object, so an unknown property is a `SCHEMA` error with a path, not a silent no-op.

**Surface.** `{id, title, summary?, intent: inspect|compare|decide|verify|monitor, layout: stack|columns, blocks: [1..12]}` (`spec.ts:168-183`). Ids starting with `system` are reserved for the rail. Block ids must be unique; a `form`'s ask ids share that namespace.

**Sources.** Data is bound by source, not typed in: `pa:<kind>` over 13 kinds (`PA_SOURCES`, `spec.ts:16`), `graph:<kind>` over four (`GRAPH_SOURCES`, `spec.ts:17`), and `file:<artifacts|evidence|history>/<path>[#anchor]`. `SourceSchema` rejects `..`, absolute paths, and anything outside those three directories. Inline `data` is legal but is marked "agent-supplied" in the renderer and reported as `provenance: "agent"` (`ui.tsx:70`, `authority.test.ts:46-50`).

**Refs.** Ten kinds (`refs.ts:6`) resolved by `parseRef`; `[[C42]]` in any text becomes a chip (`expandRef`, `REF_TOKEN`) coloured by the claim's current grade and opening the entity beside the current view (`ui.tsx:18-33`). Refs in a surface are existence-checked against the run before the surface is accepted.

**Actions.** Eleven agent ops (`AGENT_OPS`, `actions.ts:34`) and twelve human ops (`HUMAN_OPS`, `actions.ts:61`), both Zod discriminated unions, both reduced by `applyAgent` / `applyHuman`. Every failure is `{ok:false, code, message, issues[{path,message,expected}]}` from a closed `ERROR_CODES` set (`actions.ts:66-78`).

**Tools.** Thirteen base semantic tools (`BASE_TOOLS` in `tools.ts`) are always offered: `get_status`, `get_workspace`, `get_vocabulary`, `list_items`, `get_entity`, `show_surface`, `show_ref`, `compare_refs`, `ask_human`, `arrange`, `annotate`, `read_responses`, and `case_get` (the derived [Case](../case-navigation.md); read-only). Seven read-only `world_*` tools (the [world debugger](../world-debugger.md)) are offered by context: `activeTools` follows what the focused surface looks at, and the server pushes the active set so the page registers and aborts them. One definition, three transports: WebMCP registration in the page on `document.modelContext` (`webmcp.ts`), loopback MCP JSON-RPC at `/mcp` (`serve.ts`, `mcp()`), and `actualize ui <name>` / `actualize world <op>` (`cli.ts`), which goes over HTTP when a server is up and applies the same typed actions to the same file when it is not. No tool answers, rules, confirms, approves, edits the model, touches the rail, or operates the DOM (`authority.test.ts:116-119`).

**Templates.** Twelve fixed surfaces the owner can open without an agent — `case`, `trace`, `proposals`, `claims`, `contradictions`, `unknowns`, `staleness`, `lenses`, `gate`, `inbox`, `events`, `ref` (`TEMPLATE_IDS`, `actions.ts:54`). They are deterministic functions of the projection built from the same blocks the agent uses (`templates.ts:13-32`); `human.open` is routed through `surface.put`, so a template is not a privileged path.

## Internal operation

1. **Sync.** `fs.watch` on the run directory (recursive), ignoring `.cockpit/`, scheduled through a single 60 ms debounce timer, re-arming the watcher if the run directory appears (`serve.ts:109-117`). No interval anywhere. `Syncer.refresh()` re-projects, replays `.log.jsonl` past `log_offset`, diffs against the previous projection, and writes rows in one transaction.
2. **Events are derived, never authored.** `fromLog` maps engine log entries to `noun.verb` names; `diffEvents` compares consecutive projections to emit `proposal.added`, `artifact.stale`, `claim.regraded`, `gate.updated`, `human.responded` and so on (`sync.ts:47-94`). Log-sourced events replay after a restart; diff-sourced ones exist only from the moment they were observed.
3. **Compose.** Agent intent becomes an action, is schema-checked, ref- and source-checked (`checkSurface`), authority-checked, then reduced. The reducer is pure: `(state, action, actor, ctx) -> (state', result, inbox, events)`, no I/O, no DOM, clock only from `ctx.now` (`workspace.ts:1`).
4. **Lint.** `lintSurface` returns advisory warnings on the successful result: more than one callout, more than six blocks, several asks outside a form, `decide` intent with nothing decidable, an ask on a non-`decide` surface, a missing summary, more than 30 agent rows, a chart of fewer than 3 points.
5. **Publish.** `commit` writes `ui_state.ws`, pushes a cockpit event, and emits a delta: topology whole, panels by revision (`core.ts:96-111`). `preselect` opens a following `entity` block on its table's first row so the surface arrives already showing the next thing to look at.
6. **Render.** The browser receives a delta, and `Workspace.tsx` applies the server tree to Dockview (the server tree is authoritative; Dockview is the editor). `Surface.tsx` maps each block type through `REGISTRY`; a type not in the registry renders an inline "unknown block type" callout, and a throwing block is caught by an error boundary (`Surface.tsx:15-19`). The rail is outside `ws` entirely, so no surface can cover it (`App.tsx:24-46`).

## State

Two stores, with different standing.

- **Authoritative on disk:** `product-model.md`, `proposals.md`, `state.json`, `.log.jsonl`, and `inbox.jsonl`. Append-only for the inbox. Every owner gesture lands there with `via: "cockpit", actor: "owner"` (`core.ts:155`).
- **Authoritative for UI state:** `ui_state.ws` — panels with `spec`, `placedBy`, `pinned`, `minimized`, `controls`, `selection`, `rev`; the layout `tree`; `focus`; `maximized`; `mru`; `asks`; `notes`; `saved` snapshots; and a 10-entry `history` (`workspace.ts:24-28`).
- **Disposable:** `actualize/.cockpit/cockpit.db`. Delete it and the projection, FTS index, rail, events, and search all return; the owner's layout, pins, and open surfaces are lost. `actualize cockpit rebuild` regenerates it without a restart (`live.test.ts:89-104`).
- **Advisory:** `.cockpit/context.json` (one status line for the hooks, plus the owner's pending work requests), `.cockpit/server.json`, `.cockpit/agent.token`. All inside the hooks' protected zone — the agent is denied direct writes to `inbox.jsonl`, `cockpit.db`, `agent.token`, and `context.json` (`hooks-bun.test.ts:100-107`).

**Authority tiers.** System owns the rail, gate state, the model, and grades: read only, and no action addresses them (`workspace.ts:3-7`). Agent owns surface content, annotations, questions, focus/place requests. Owner owns layout, pins, minimized, filters and sorts, answers, rulings, confirmations. Precedence: a surface the owner moved keeps its position while the agent may still replace its content; a pinned surface cannot be removed or moved; at most eight panels are open. `MAX_AGENT_SURFACES` (`workspace.ts:12`) is named imprecisely — the count is `Object.values(ws.panels).length`, every panel including owner-placed ones.

## Lifecycle

`actualize cockpit up` spawns a detached `cockpit serve` and parses one `URL <human link>` line from its stdout; the link is printed only to a TTY, never into a pipe (`cli.ts:28-47`). The daemon mints a random human token and a random agent token per start, writes the agent token to `.cockpit/agent.token` mode 0600, and writes `server.json` (`serve.ts:22-28,119`). It is a single `Bun.serve` with routes, static SPA via HTML import, and per-socket pub/sub. `stop()` closes watchers, stops the server, unlinks `server.json`, and closes the database; a graceful restart closes browser sockets with code 1012 while leaving run and workspace untouched (`serve.ts:120-122`). `down` escalates SIGTERM to SIGKILL after three seconds.
```

## Failure modes

- **Nothing to show, or the wrong thing.** An empty workspace offers the one to four hints that matter now, computed from the projection (`templates.ts:34-49`) — never a menu. A surface whose table feeds an entity opens on the first row.
- **`CLUTTER_CAP` at eight panels** when every open one is pinned or has an open ask: the reducer evicts the least-recent unpinned one with no open question, and otherwise returns `CLUTTER_CAP` with instructions (`workspace.ts:205-213`, `live.test.ts:142-150`). Eviction is undone with `layout.restore previous`; snapshots keep 10 entries.
- **Authority refusals.** `AUTHORITY_SYSTEM` for any op naming rail/system/process/model/gate and for ids starting with `system`; `AUTHORITY_HUMAN` for a `human.*` op sent by an agent role; `AUTHORITY_PINNED` for removing or minimizing a pinned surface; `AUTHORITY_LAYOUT` for moving one the owner placed (content is still replaceable, with a `PLACEMENT_IGNORED` warning).
- **Malformed input fails safely.** Garbage actions, tools, and ops return a structured error and leave the workspace untouched: the revision advances only for the one well-formed layout op, and no panel id can contain `..` (`authority.test.ts:182-192`). Bad refs and bad sources name the failing path, e.g. `blocks.0(e)` (`authority.test.ts:193-199`).
- **Source escapes refused.** `file:../../etc/passwd`, `file:state.json`, `file:inbox.jsonl`, `file:.cockpit/agent.token` all fail schema validation; `safeRunFile` re-checks prefix and realpath (`sources.ts:78-83`).
- **Served content is inert.** Only png/jpg/jpeg/gif/webp/svg get their own content type; everything else is `text/plain` with `nosniff` and a `sandbox; default-src 'none'` CSP. Cross-origin requests are refused with 403 (`serve.ts:34-41,70-75`, `authority.test.ts:150-167`).
- **Server gone.** The hook's `[cockpit]` line disappears with the process that wrote it, checked by pid (`authority.test.ts:168-178`). The browser shows an offline bar and reconnects with exponential backoff; the run never depended on it (`ui.e2e.test.ts:193`).
- **Owner input is inert to the model.** No cockpit gesture edits the model or proposals; rulings are bounded to what each entity can be ruled, and a rejection needs a 12+ character reason the router can log (`workspace.ts:357-358`). Unhandled inbox entries produce an `inbox` gate blocker that clears only when the router acks each one (`authority.test.ts:75-85`).

## Extension points

- **A block type:** add the name to `BLOCK_TYPES` and its `.strict()` Zod object plus discriminator branch in `spec.ts`, a `CATALOG` entry with a valid example in `catalog.ts`, and a renderer case in `REGISTRY` (`Surface.tsx:10-13`, implementations in `cockpit/web/blocks/{ask,chart-impl,data,graph-impl,read,viz}.tsx`). `grammar.test.ts` parses every catalog example and requires the scenarios in `tests/cockpit/compositions/*.yaml` to cover the block type.
- **An action:** add the op to `actions.ts` (`AGENT_OPS` or `HUMAN_OPS`, plus the schema) and a `case` in `applyAgent`/`applyHuman` in `workspace.ts`. Human ops that carry owner authority must also be in `AUTHORITY_OPS` (`actions.ts:63`) so the run refreshes when the inbox changes.
- **A tool:** add the `ToolDef` in `tools.ts` and a `case` in `Cockpit.tool` (`core.ts`; world tools go through `worldTool`). `authority.test.ts` asserts the always-offered tools number at most twelve, that no name matches `/approve|reject|resolve|answer|confirm|submit|accept|edit|write|set_model|reconcile/`, and that `/mcp` lists exactly the active tools; `world.transport.test.ts` asserts the page's catalogue, the MCP list, and the CLI list are the same definitions and that one question gets the same answer from every transport.
- **A transport:** it must reuse `core.agent` / `core.human`. AGENTS.md:13 — "Do not add UI code paths the agent could reach other than the typed vocabulary."
- Tests that must pass: `tests/cockpit/{grammar,authority,live,cli,layoutMap,ui.e2e}.test.ts` plus `hooks-bun.test.ts`; `bun test` also replays both walkthroughs.

## Known discrepancy

`layout: "columns"` is documented as a fixed two-column alternation and is not implemented as one.

- `spec.ts:172` comments `columns: two equal columns, blocks alternate`, and `catalog.ts:46` advertises `layout: stack|columns` to the agent.
- `Surface.tsx:31` only appends the class string `columns` to the blocks container.
- `styles.css:74` is `.blocks.columns { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); align-items: start; }`.

The real behaviour is a fluid auto-fit grid: the column count follows the panel's pixel width, not the block count or order, and blocks are not alternated between two equal columns. Nothing in `tests/cockpit/` asserts the documented behaviour, which is why it drifted. An agent reading the schema comment will compose a surface expecting alternation and get a different number of columns depending on how wide the owner made the panel.

### Source trail

- Vocabulary: `cockpit/protocol/spec.ts:16,17,18-22,165,168-183`; `actions.ts:32-34,59-63,66-78`; `refs.ts:6,15,25,30,35`; `tools.ts:12-41`; `catalog.ts:7-53`.
- Reducer and authority: `cockpit/server/workspace.ts:1-13,24-28,116-139,175-187,205-213,249-292,357-372,432-446`.
- Projection and stores: `cockpit/server/project.ts:26-92`; `sync.ts:25-42,47-94,96-127`; `db.ts:1-33`; `sources.ts:78-83`.
- Core and transport: `cockpit/server/core.ts:22-50,93-181,183-212`; `serve.ts:22-41,58-122,132-146`; `main.ts:6-14`; `dev.ts:5-7`; `cli.ts:25-71,74-111,115-136`; `build.ts:14-19`.
- Web: `cockpit/web/App.tsx:13-46,121-138`; `Surface.tsx:10-39`; `Workspace.tsx:27-85`; `store.ts:22-100`; `webmcp.ts:7-24`; `ui.tsx:18-33,70-72`; `layoutMap.ts:6-36`; `graphLayout.ts:2-24`; `styles.css:73-76`.
- Templates: `cockpit/server/templates.ts:13-49`.
- Evidence: `tests/cockpit/authority.test.ts:30-50,54-69,75-85,116-147,150-199`; `live.test.ts:23-66,70-112,118-174`; `grammar.test.ts:47-72`; `cli.test.ts:26-67`; `hooks-bun.test.ts:100-107`; `ui.e2e.test.ts:38-52,149-227`; `layoutMap.test.ts:16-24`.
- Prose: `AGENTS.md:13`; `docs/cockpit.md`.
