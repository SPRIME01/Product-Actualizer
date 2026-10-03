# Source map

## How to read this map

This maps the concepts, capabilities, workflows, and subsystems of Product Actualizer to the symbols that
establish them. It is not a directory listing: every row points at the code that would have to change if the
concept changed, so when a term is wrong, the file named in that row is the one to edit. Paths are relative to
the repository root; `Symbol` names a function, class, or constant that carries the rule.

## Concepts → implementation

| concept | canonical documentation | implementation | notes |
|---|---|---|---|
| Product Model | `product-model/SCHEMA.md` | `hooks/src/lib/md.mjs:parseModel`, `validateModel`; `hooks/src/lib/store.mjs:makeRun` (`modelPath`) | One file per run, `actualize/product-model.md`. Parsed into `{version, claims, unknowns, decisions, capabilities}`. |
| claim / evidence grade | SCHEMA.md "Evidence grades" | `hooks/src/lib/md.mjs:GRADES`, `PUBLIC_GRADES`; hardware rule at `SCHEMA.md:47` | Seven grades. A design file read directly is `OBSERVED`; prose docs are `REPORTED` even when authoritative. |
| unknown | SCHEMA.md "Unknowns" | `md.mjs:parseModel` (`model.unknowns`); grammar in `cockpit/protocol/refs.ts:ID` | A gap is an `U…` row, never a guessed sentence. Every `UNKNOWN`-grade claim needs a matching row. |
| decision log | SCHEMA.md "Decision log" | `md.mjs:parseModel` (`model.decisions`); `hooks/src/process.mjs:diffModels`, `touchCoverage` | Rows are immutable: `reconcileDone` compares the prefix against `.state/model.base.md`. |
| proposal | SCHEMA.md "`proposals.md`" | `md.mjs:parseProposals`, `validateProposalRows`, `validateResolution`; header in `process.mjs:PROPOSALS_HEADER` | `status` is `open`, `accepted:D<n>`, or `rejected`; the resolution reason is mandatory. |
| model version | SCHEMA.md "Versions and staleness" | `process.mjs:reconcileDone` (one bump), `snapshotPath`, `md.mjs:parseModel` (`version`) | Snapshots land in `actualize/history/model-v<n>.md` — what an older artifact is validated against. |
| staleness | SCHEMA.md "Versions and staleness" | `md.mjs:staleReasons`, `touches`; callers `process.mjs:inspectArtifacts`, `engine.mjs:postTool` | A decision above `built_from` whose `touched` intersects the artifact's `reads`/`cites`. Unstamped is stale. |
| lens | `skills/<name>/SKILL.md` frontmatter | `hooks/src/lib/lenses.mjs:loadLenses`, `lensBody`; `AGENTS.md` | A directory of `SKILL.md` with `reads`/`needs`/`executes_with`. A `kind: tool` skill is skipped by `loadLenses`. |
| router | `skills/actualize-product/SKILL.md` | `lenses.mjs:ROUTER`; enforced in `engine.mjs:preTool` (`case "model"`, `case "proposals"`) | The only role allowed to edit `product-model.md`, and only inside a reconciliation. |
| `needs` | lens frontmatter; SCHEMA.md rules | `lenses.mjs:waves`, `process.mjs:select`, `lensStart`; `readyLenses` (`okNeeds`) | Enforced statically at selection and again dynamically at `lens start`. |
| `executes_with` | lens frontmatter | `lenses.mjs:loadLenses` (`executesWith`); `cockpit/server/project.ts:project` | Declared and surfaced to the cockpit; executed by nothing in this repository. |
| artifact header | SCHEMA.md rule 3 | `md.mjs:parseStamp`, `validateArtifact`, `inlineCites` | `built_from:` / `reads:` / `cites:` (+ `public:`, `verdict:`, `owner:` for the gate) in the first lines. |
| evidence grade floor for public copy | SCHEMA.md "Public-facing copy…" | `md.mjs:validateArtifact` (`PUBLIC_GRADES` check); `tests/check.py:PUBLIC` | `public: true` in the stamp makes the floor enforceable rather than advisory. |
| run state | `actualize/state.json` | `hooks/src/lib/store.mjs:newState`, `saveState`, `zoneOf` | `zoneOf` classifies every path: model, proposals, artifact, evidence, state, history, project, outside. |
| gate verdict | `product-model/TEMPLATE.md` gate header | `process.mjs:finish`, `GATE_LENS`, `md.mjs:VERDICTS` | `go`/`no-go`/`defer`/`go-with-exception`, read from `artifacts/release-readiness/gate.md`. |
| inbox entry | `skills/cockpit/SKILL.md`; `docs/explanation/why-authority-is-never-transferred.md` | `hooks/src/lib/inbox.mjs:appendInbox`, `ackInbox`, `readInbox`, `KINDS` | Append-only `inbox.jsonl`. `ackInbox` requires ≥6 chars saying where the answer went. |
| preflight | `product-model/PHYSICAL-PREFLIGHT.md` | `engine.mjs:hardwareAction`, `FLASH`, `IRREVERSIBLE`, `PHYSICAL_LENSES` | Bash-only gate: requires `target`/`expected result`/`recovery` in `evidence/<lens>/actions.md`. |
| surface | `docs/reference/cockpit-protocol.md` | `cockpit/protocol/spec.ts:SurfaceSchema`, `normalizeSurfaceDoc` | `{id, title, intent, layout, blocks[1..12]}`, `.strict()` throughout. |
| block vocabulary | `cockpit/protocol/catalog.ts` | `spec.ts:BLOCK_TYPES` (15), `catalog.ts:CATALOG`, `cockpit/web/Surface.tsx:REGISTRY` | Three lists that must agree: schema, catalog examples (parsed in tests), renderer registry. |
## Capabilities → implementation

| capability | entry point | principal implementation | verified by |
|---|---|---|---|
| run a governed process | `actualize begin` | `process.mjs:begin` → `select` → `lensStart`/`lensDone` → `reconcileStart`/`reconcileDone` | `tests/hooks/replay.test.mjs`, `tests/hooks/physical.test.mjs` |
| install hooks for a client | `bun hooks/install.mjs` | `hooks/install.mjs:run`, `resolveAdapters`; `hooks/adapters/*.mjs` `apply`/`status`/`remove` | `tests/cockpit/hooks-bun.test.ts` |
| enforce a write rule | a client `PreToolUse` event | `engine.mjs:preTool` + `store.mjs:zoneOf` | `replay.test.mjs` ("product files, the model, and lens bodies are gated before a lens runs") |
| stop the agent from finishing | client `Stop` | `engine.mjs:stopGate`, `MAX_STOP_BLOCKS`, `process.mjs:computeGate` | `replay.test.mjs` stop tests; "stop gate loop guard and pause escape" |
| validate a model | `actualize validate` | `md.mjs:validateModel` via `hooks/src/cli.mjs` | `tests/check.py:validate_model` (independent re-implementation) |
| detect staleness | `actualize status`, every gate | `md.mjs:staleReasons`; `process.mjs:inspectArtifacts` | `replay.test.mjs` "staleness narrows"; `tests/check.py:EXPECT_STALE` |
| compose a cockpit surface | `actualize ui put` / `show_surface` | `protocol/actions.ts:Put` → `server/core.ts` tools → `workspace.ts:applyAgent` | `tests/cockpit/grammar.test.ts` + `tests/cockpit/compositions/*.yaml` |
| ask the owner a question | `actualize ui ask` / `ask_human` | `protocol/spec.ts:AskBase`, `actions.ts:AskWithdraw`; `workspace.ts` `AskState` | `tests/cockpit/authority.test.ts`; `ui.e2e.test.ts` |
| record an owner's ruling | `human.rule` over the WebSocket | `workspace.ts:applyHuman` → `server/core.ts` → `hooks/src/lib/inbox.mjs:appendInbox` | `authority.test.ts`; `live.test.ts` (responses survive deleting the database) |
| project the run for a browser | `actualize cockpit up` | `cockpit/server/main.ts:runDaemon`, `serve.ts:serveCockpit`, `sync.ts:Syncer.refresh` | `tests/cockpit/live.test.ts`, `ui.e2e.test.ts` |
| rebuild / reset the projection | `actualize cockpit rebuild` / `reset` | `sync.ts:Syncer.rebuild`, `core.ts:Cockpit.rebuild`, `cockpit/cli.ts:69` | `live.test.ts` ("deleting the SQLite file loses only preferences") |
| build a single-file executable | `bun run build` (`just build`) | `cockpit/build.ts` — `bun build --compile` over `hooks/src/cli.mjs` | `tests/cockpit/cli.test.ts` (runs the same commands through `dist/bin/actualize`) |
| verify the repository's own structure | `python3 tests/check.py` | `tests/check.py:check_system`, `check_physical_chain`, `check_walkthrough`, `check_hardware`, `negative_controls` | itself; `just test` runs it after `bun test` |
| replay a walkthrough | `bun test` | `tests/hooks/helpers.mjs:sandbox`, `walkthrough`, driving `engine.handle` + `process.*` | `tests/hooks/replay.test.mjs`, `tests/hooks/physical.test.mjs` |

## Workflows → implementation

| workflow | trigger | implementation | verification |
|---|---|---|---|
| a full run | user asks to finish or launch a product | `engine.mjs:intentHint` → `process.mjs:begin`; then the router skill | `tests/walkthrough/TRANSCRIPT.md` replayed step by step in `replay.test.mjs` |
| a write being denied | agent calls a write/edit/bash tool while a run is active | `engine.mjs:preTool` (`hardwareAction`, then the per-zone `switch`) → `normalize.mjs:formatOutput` (`permissionDecision: "deny"`) | `replay.test.mjs` gate tests; `hooks-bun.test.ts` per-client output shape |
## Subsystems → implementation

| subsystem | entry | core files | docs page |
|---|---|---|---|
| skill / lens layer | `skills/actualize-product/SKILL.md` | `product-model/{SCHEMA,TEMPLATE,PHYSICAL-PREFLIGHT}.md`, `skills/*/SKILL.md` | `docs/subsystems/skills.md`, `docs/reference/lenses.md` |
| hook engine | `hooks/bin/actualize` | `hooks/src/engine.mjs`, `hooks/src/normalize.mjs`, `hooks/src/lib/{store,md}.mjs` | `docs/subsystems/hooks.md`, `docs/workflows/hook-enforcement.md` |
| process CLI | `hooks/src/cli.mjs` | `hooks/src/process.mjs`, `hooks/src/lib/lenses.mjs`, `inbox.mjs` | `docs/reference/cli.md`, `docs/how-to/run-a-governed-run.md` |
| client adapters | `hooks/install.mjs` | `hooks/adapters/{common,claude-code,codex,cline,opencode,prime}.mjs`, `hooks/clients/{opencode,prime}/*` | `docs/hooks.md` |
| cockpit protocol | `cockpit/protocol/spec.ts` | `spec.ts`, `actions.ts`, `refs.ts`, `catalog.ts`, `tools.ts` | `docs/reference/cockpit-protocol.md` |
| cockpit server | `cockpit/cli.ts` → `cockpit/server/main.ts` | `server/{core,workspace,project,sync,db,sources,serve,templates}.ts` | `docs/subsystems/cockpit.md`, `docs/workflows/cockpit-session.md` |
| cockpit UI | `cockpit/web/index.html` | `web/{App,Workspace,Surface,store,ui,layoutMap,graphLayout,webmcp}`, `web/blocks/*.tsx`, `web/styles.css` | `docs/cockpit.md` |
| verification | `just test` / `bun run test` | `tests/check.py`, `tests/hooks/*.test.mjs`, `tests/cockpit/*.test.ts`, `tsconfig.json` | `docs/reference.md` |

## Tests and fixtures

| what | path | what it establishes |
|---|---|---|
| Loam replay (software + sensor) | `tests/walkthrough/TRANSCRIPT.md`, `tests/hooks/replay.test.mjs` | A complete run: selection, waves, three reconciliations, selective staleness, a passing stop. |
| Mote replay (hardware + physical AI) | `tests/walkthrough-mote/TRANSCRIPT.md`, `tests/hooks/physical.test.mjs` | The physical lens chain, nested hardware evidence, revision-driven staleness, a `no-go` gate. |
| Mote evidence package | `tests/walkthrough-mote/evidence/recon-physical/hardware/` | The shape `recon-physical` must produce: `manifest.yaml`, per-component `profile.yaml` + `sources.md`. |
| Model-version snapshots | `tests/walkthrough{,-mote}/model-v*.md` | `history/model-v<n>.md` is real product state, and older artifacts validate against it. |
| Sandbox + replay driver | `tests/hooks/helpers.mjs` | How a walkthrough is replayed: temp run dir, `engine.handle` on normalized events. |
| Fixture run builder | `tests/cockpit/helpers.ts` | A cockpit test gets real model/proposal/artifact files; only `state.json` and the log are synthesized. |
| Vocabulary grammar | `tests/cockpit/grammar.test.ts`, `tests/cockpit/compositions/*.yaml` | Every catalog example and YAML composition parses, resolves its refs and sources in that run, and places. |
| Authority boundaries | `tests/cockpit/authority.test.ts` | The agent cannot touch the rail, forge process state, write the inbox, or answer for the owner. |
| Live projection | `tests/cockpit/live.test.ts` | Events flow from the real engine; a closed cockpit does not stall the run; the projection is disposable. |
| Storage classes, migrations, rebuild keeps `control_*` | `tests/cockpit/workbench.test.ts` | v1 files migrate keeping layout; a failed migration rolls back; rebuild regenerates the projection and keeps control rows; hooks never read them. |
| Browser behaviour | `tests/cockpit/ui.e2e.test.ts` | Rail, spatial workspace, every human gesture, reconnection, WebMCP — in system Chrome. |
| Layout round trip | `tests/cockpit/layoutMap.test.ts` | `toDockview`/`fromDockview` is lossless for every tree shape. |
| End-to-end hooks per client | `tests/cockpit/hooks-bun.test.ts` | installer → client config → generated command → `bin/actualize` → engine → that client's native output. |
| Fixture donor material | `tests/fixture/`, `tests/fixture-mote/` | The untouched input both walkthroughs were actualized from: firmware, host Python, CAD, BOM, datasheets, and one deliberately wrong pin map. |
| Executed evidence | `tests/walkthrough-mote/evidence/electronics/budget.py`, `…/embedded-systems/pincheck.py`, `tests/fixture-mote/host/tests` | `check_executed_evidence` re-runs them: the numbers in the claims must come from the scripts, the REV B pin map must fail, and a corrected REV C one must pass. |
| Repository rules | `tests/check.py` | Size limits, lens references, physical chain closure, walkthrough validity, `EXPECT_STALE`, negative controls, and `check_cleanup` (no `.tmp/ref` left behind). |

## Deliberately not mapped

- **No code executes a lens body.** Lenses are prose an agent reads; `hooks/src/lib/lenses.mjs:lensBody` only returns the
  text, and `engine.mjs:preTool` denies reading it outside `lens start`. Nothing interprets `SKILL.md` prose.
- **There is no Node implementation.** `package.json` declares `"bun": ">=1.4.0"`; `hooks/bin/actualize` exits 127 without
  Bun for every command except `hook`, which fails open on purpose so a client is never bricked.
- **`NO_RESPONDER` is declared but unreachable.** It appears once, in the `ERROR_CODES` list at
  `cockpit/protocol/actions.ts:77`; nothing emits it, because the only answer source is a live owner.
- **SQLite is not authority.** `cockpit/server/db.ts` (module comment) and `cockpit/server/sync.ts:Syncer.rebuild`
  delete and regenerate it; the run directory, `inbox.jsonl`, and `.log.jsonl` stay authoritative.
- **`layout: "columns"` is advertised but renders as an auto-fit grid.** The schema documents "two equal columns,
  blocks alternate" (`cockpit/protocol/spec.ts:182`); the renderer emits one class (`cockpit/web/Surface.tsx:36`) and
  the stylesheet uses `repeat(auto-fit, minmax(300px, 1fr))` (`cockpit/web/styles.css:74`).
- **No code applies an owner's answer to the model.** The inbox appends and acks (`hooks/src/lib/inbox.mjs`); turning an
  answer into a proposal, decision, or unknown is the router's prose work — which is why `ackInbox` demands a stated
  destination.
| the stop gate | client `Stop` while blockers exist | `engine.mjs:stopGate` → `block:` → `formatOutput` exit code 2 | `replay.test.mjs` stop tests; `physical.test.mjs` `no-go` run |
| model-tamper detection | `post_tool` or the gate sees `modelHash(run) !== state.modelHash` | `engine.mjs:postTool` note; `process.mjs:computeGate` code `model-tampered`; `restoreModel` | `replay.test.mjs` "tampering with the model outside a reconciliation is denied and detected" |
| a cockpit session start | `actualize cockpit up` | `cockpit/cli.ts:28` spawns `cockpit serve`; `serve.ts` issues `humanToken`/`agentToken`; `store.ts:connect` | `cli.test.ts`, `ui.e2e.test.ts` |
| an owner gesture lands in the inbox and is acked | `human.answer`/`human.rule`/`human.confirm`/`human.annotate` on `/ws` | `workspace.ts:applyHuman` returns `inbox: Inbound[]` → `core.ts` `appendInbox` → `actualize inbox` → `ackInbox` | `authority.test.ts`; `live.test.ts`; `physical.test.mjs` "owner reply: recon-physical re-runs…" |
| a stale rebuild | a decision touches what an artifact reads or cites | `process.mjs:reconcileDone` returns `stale[]` → `readyLenses` puts the owner back at `lens start` | `physical.test.mjs` "stale rebuild: … record model@5 and the confirmed revision" |
| the release gate | `lens start release-readiness` | `process.mjs:readyLenses` (gate lens runs last), the extra checks in `lensStart`, then `finish` | `tests/walkthrough-mote/artifacts/release-readiness/gate.md`; `tests/check.py:check_gate`, `gate_errors` |
| ref / entity | `docs/reference/cockpit-protocol.md` | `refs.ts:parseRef`, `expandRef`, `REF_TOKEN`; resolution `cockpit/server/sources.ts:detail` | `claim:C1`, `unknown:U1`, `proposal:P1`, `decision:D1`, `artifact:`, `evidence:`, `lens:`, `field:`, `version:n`, `gate`. |
| source binding | `docs/reference/cockpit-protocol.md` | `spec.ts:SourceSchema` (`pa:`/`graph:`/`case:`/`work:`/`world:`/`file:`), `sources.ts:resolve`, `safeRunFile` | `file:` is restricted to `artifacts\|evidence\|history` and rejects `..`. |
| authority tier | `docs/explanation/why-authority-is-never-transferred.md` | `cockpit/server/workspace.ts:applyAgent`/`applyHuman`, `cockpit/protocol/actions.ts:AUTHORITY_OPS`, `cockpit/server/serve.ts:roleOf` | system (rail, absent from workspace state) / agent / human. Two random tokens per start; loopback + Origin guard. |
| projection | `docs/subsystems/cockpit.md` | `cockpit/server/project.ts:project`, `railOf`; `sync.ts:Syncer`; `db.ts:openDb` | Pure function of the run directory; `project.ts` calls `process.mjs:computeGate`, so the rail cannot disagree with the gate. |

### Source trail

The entries above are the trail; these are the files that define the relationships themselves.

- `skills/actualize-product/SKILL.md` — the router, and the only editor of the model
- `product-model/SCHEMA.md` — the field keys, grades, source format, and staleness rule
- `hooks/src/process.mjs` — the run state machine, `computeGate`, `nextAction`, `readyLenses`
- `hooks/src/engine.mjs` — the pure decision engine: context, deny, block, feedback
- `hooks/src/lib/md.mjs` — model and artifact validation, `touches`, `staleReasons`, `validTouched`
- `hooks/src/lib/lenses.mjs` — `ROUTER`, `loadLenses`, `lensBody`, `waves`
- `hooks/src/lib/inbox.mjs` — `readInbox`, `ackInbox`, `unhandled`
- `cockpit/protocol/spec.ts`, `actions.ts`, `tools.ts`, `world.ts` — the closed vocabulary, the tools (14 base, 7 world, plus work_update while a request is pending), and the world vocabulary shared with the page
- `cockpit/server/world.ts`, `reach.ts`, `reach.providers.json`, `worldSurfaces.ts` — the world debugger kernel, the reach ladder, and its standard compositions
- `cockpit/server/{project,sync,workspace,serve,db}.ts` — projection, event derivation, authority, transport
- `cockpit/cli.ts`, `cockpit/build.ts` — the cockpit verbs and the compiled executable
- `tests/check.py` — structural verification; `tests/hooks/*.test.mjs` and `tests/cockpit/*.test.ts` — behavioural
- `package.json`, `justfile` — the runtime pin and the recipe surface

## Outcome-directed navigation

- Optional model sections, validation: `hooks/src/lib/md.mjs` (`OPTIONAL_SECTIONS`, `validateDemand`); `tests/check.py` (`validate_demand`)
- Demand rows: `cockpit/server/demand.ts`; projected in `project.ts`, synced in `sync.ts`
- The Case, deviations, the affordance field, settlement: `cockpit/server/case.ts`
- Decision states, experiments, patterns, prior knowledge: `cockpit/server/learn.ts`
- Read-only local git: `cockpit/server/git.ts`; `gh` prober and market capabilities: `cockpit/server/reach.ts`, `reach.providers.json`
- Views: `cockpit/server/caseSurfaces.ts`; sources `case:*`, `graph:case`, `pa:jobs|criteria|opportunities|decision-states|experiments|patterns` in `sources.ts`; the `case_get` tool in `protocol/tools.ts`; `actualize case` in `cockpit/cli.ts`
- Tests: `tests/cockpit/case.test.ts`, `case.transport.test.ts`, `case.e2e.test.ts`
- Specification and plan: `.agents/specs/outcome-navigation.md`; residuals: `.agents/DEBT.md`

## The Workbench and the Work Terminal

- Migrations and the two storage classes: `cockpit/server/db.ts` (`migrate`, `MIGRATIONS`)
- Control repository (requests, bindings, contracts, reviews, executors): `cockpit/server/control.ts`; lifecycle table, control operations, screen modes: `cockpit/protocol/work.ts`
- Workflow, graph, task contract: `cockpit/server/workflows.ts`; capability catalogue, availability, conflicts: `cockpit/server/capabilities.ts`
- `work:*` rows and the evidence ledger: `cockpit/server/workSources.ts`; source resolution in `sources.ts` (`workSource`); schema in `protocol/spec.ts` (`WORK_SOURCES`)
- Mode rule and compositions: `cockpit/server/screens.ts`; templates in `templates.ts`; the Workbench follow, control operations, terminal, tools, and context in `cockpit/server/core.ts`
- Terminal interpreter: `cockpit/server/terminal.ts`; UI: `cockpit/web/WorkTerminal.tsx`; tools `work_get`, `work_update` in `protocol/tools.ts`; `actualize work` in `cockpit/cli.ts`; the router's hook line in `hooks/src/engine.mjs` (`workLine`)
- Tests: `tests/cockpit/workbench.test.ts`, `workbench.transport.test.ts`, `workbench.e2e.test.ts`
- Specification and plan: `.agents/specs/workbench.md`
