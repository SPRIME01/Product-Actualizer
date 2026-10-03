# Cockpit protocol: the typed surface vocabulary

Layer 8. The complete, closed vocabulary the agent composes against. Code owns it in `cockpit/protocol/`; the agent composes it as data and never writes UI code.

Pipeline, once: `agent intent → action → Zod schema → authority/invariants → state transition → render`. Never `agent → DOM` (`actions.ts:1-2`).

## Shared primitives

| primitive | definition | source |
|---|---|---|
| `id` | `^[a-z][a-z0-9._-]{0,47}$` — lowercase letters, digits, `.`, `_`, `-`, starting with a letter, 48 chars max | `spec.ts:7` |
| `text(n = 600)` | `z.string().min(1).max(n)` | `spec.ts:8` |
| `Tone` | `neutral` \| `ok` \| `warning` \| `danger` \| `unknown` | `spec.ts:9` |
| `Row` | `record(string, string \| number \| boolean \| null)` | `spec.ts:25` |
| `Data` | `Row[]`, **max 500** | `spec.ts:26` |
| `Filter` | `{ field: string ≤40, op: "eq"\|"ne"\|"contains"\|"gt"\|"lt"\|"in" (default "eq"), value: string \| number \| boolean \| string[] }`, `.strict()` | `spec.ts:27` |
| `Sort` | `{ field: string ≤40, dir: "asc"\|"desc" (default "asc") }`, `.strict()` | `spec.ts:28` |
| `bound` | `{ source?, data?, filter?: Filter[] max 6, sort? }` | `spec.ts:29` |
| `label` | `text(80).optional()` | `spec.ts:30` |
| `cite` | `RefSchema[]`, **max 12**, optional | `spec.ts:31` |
| `sid` | `z.string().min(1).max(48)` (surface/block ids in actions) | `actions.ts:7` |

Every block object is `.strict()`: an unknown property is a schema error, not a silent no-op (`spec.ts:2-3`). `BoundFilter`/`BoundFilter` ops in `surface.patch` mirror the `Filter` shape exactly (`actions.ts:15-16`).

## Surface envelope

`SurfaceSchema` (`spec.ts:178-193`):

| field | type | default / bound |
|---|---|---|
| `id` | `id` | required; **must not start with `system`** — reserved for the process rail |
| `title` | `text(60)` | required |
| `summary` | `string ≤240` | optional |
| `intent` | `inspect` \| `compare` \| `decide` \| `verify` \| `monitor` | default `inspect` |
| `layout` | `stack` \| `columns` | default `stack` |
| `blocks` | `BlockSchema[]` | **1 to 12** |

`superRefine` adds: duplicate block ids are errors; a `form`'s ask ids share the same namespace and must be unique too; an `entity` block's `follow` must name a block present in the same surface.

`PlacementSchema` (`spec.ts:199-204`), used by `show_surface` and `view.place`:

| field | type | default / bound |
|---|---|---|
| `rel` | `within` \| `left` \| `right` \| `above` \| `below` | default `within` — `within` makes a tab, the others split the target |
| `to` | `string ≤48` | default `"active"` — a surface id, or `active` (the focused one) |
| `size` | `number` | optional, **0.15–0.85** — share of the target when splitting |
| `focus` | `boolean` | default `true` |

`parseSurfaceText` accepts the `surface:` wrapper with a sibling `layout:` list (or `blocks:`), whether the document is YAML or JSON (`spec.ts:197-205`).

## The 15 blocks

`BLOCK_TYPES` (`spec.ts:175`), matching `REGISTRY` in the renderer one-for-one (`Surface.tsx:11-14`). A type not in the registry cannot be drawn; the server's schema never lets one through.

### Read blocks

**`metric`** (`spec.ts:34-39`) — required `type`, `id`, `label` (`text(60)`), `value` (`string \| number`). Optional: `unit` (≤12), `of` (`string \| number`, "the budget the value is judged against"), `tone`, `delta` (≤30), `refs`.

**`callout`** (`spec.ts:41-44`) — required `type`, `id`, `tone` (`note` \| `ok` \| `warning` \| `danger` \| `unknown` — a **different** enum from `Tone`, which has `neutral`), `text` (`text(900)`). Optional: `title`, `refs`. Claim ids in `refs` are shown with their current grade.

**`table`** (`spec.ts:47-52`) — required `type`, `id`. `...bound`, `columns` (`Column[]`, max 10), `group` (≤40 — grouped rows with tone-coded headers), `select` (**default `true`**; row selection publishes the row's ref to followers), `highlight` (`string[]` max 20, each ≤60), `limit` (int 1–200), `title`. `Column` = `{ field ≤40, label?, kind: text|number|grade|ref|status|duration (default "text"), unit? (≤10) }`, `.strict()`.

**`tree`** (`spec.ts:54-58`) — required `type`, `id`. `...bound`, `title`, `expand` (int **0–6, default 1** — levels open by default; deeper levels one click away), `show` (`status|duration|ref`, max 3).

**`timeline`** (`spec.ts:60-64`) — required `type`, `id`. `...bound`, `title`, `lane` (≤40 — the field that splits events into lanes), `window` (int **5–200, default 40**).

**`graph`** (`spec.ts:68-72`) — required `type`, `id`. Optional `source`, `title`, `nodes` (`GraphNode[]`, **max 120**), `edges` (`GraphEdge[]`, **max 300**), `direction` (`LR` \| `TB`, **default `LR`**), `focus` (`RefSchema`). `GraphNode` = `{ id ≤60, label? ≤60, kind? ≤24, tone?, ref? }`; `GraphEdge` = `{ from ≤60, to ≤60, label? ≤40, tone? }`, both `.strict()`.

**`chart`** (`spec.ts:74-80`) — required `type`, `id`, `kind` (`bar` \| `line` \| `dot`), `x` (≤40), `series` (`Series[]`, **1–4**). `...bound`, `title`, `threshold` (`{ value: number, label?, tone? }` — a budget, a limit, a supply rating), `unit` (≤12), `highlight` (max 10). `Series` = `{ y ≤40, label?, tone? }`.

**`compare`** (`spec.ts:82-88`) — required `type`, `id`, `mode` (`diff` \| `side` \| `overlay` \| `matrix`), `items` (`Item[]`, **2–4**). Optional `title`, `criteria` (max 12). `Item` = `{ label `text(60)`, ref?, source?, data? (≤4000), image? (≤300) }`, `.strict()`. Modes: `diff` text of two things, `side` two or more views, `overlay` reference vs output image, `matrix` options × criteria. `criteria[]` = `{ name `text(60)`, cells: { text `text(160)`, tone?, refs? }[] (**2–4**) }`.

**`media`** (`spec.ts:90-95`) — required `type`, `id`, `items` (**1–12** of `{ label `text(60)`, src ≤300, alt? ≤200, pins? (`Pin[]` max 20) }`). Optional `title`, `fit` (`contain` \| `grid`, **default `contain`**). `Pin` = `{ x: 0–1, y: 0–1, w?: 0–1, h?: 0–1, text `text(200)`, tone? }`. `src` is `file:evidence/…` or `file:artifacts/…`; humans can drop annotation pins on an item.

**`document`** (`spec.ts:97-102`) — required `type`, `id`, `source`. Optional `title`, `lines` (`number[]`, **max 2**, each int ≥1 — `[from]` or `[from, to]` to highlight and scroll to), `anchor` (≤60 — scroll to a ref or heading), `mark` (`RefSchema[]` max 12 — the `[[C42]]`-style cites in the text become chips; these are emphasised).

**`entity`** (`spec.ts:104-109`) — required `type`, `id`, and **exactly one** of `ref` or `follow` (`.refine`). `follow` shows whatever row the named block has selected. Optional `show`: `sources` \| `grade` \| `touches` \| `consequence` \| `actions`, max 5. Entity kinds: `claim`, `unknown`, `proposal`, `decision`, `artifact`, `evidence`, `lens`, `gate` (`ENTITY_KINDS`, `spec.ts:104`).

**`preflight`** (`spec.ts:111-119`) — required `type`, `id`, `action`. Optional `title`, `evidence` (`cite`). `action` is `.strict()` with **ten** fields, all required: `class` (`reversible` \| `state-changing` \| `irreversible`), `target` (`text(160)`), `currentState` (`text(240)`), `expected` (`text(240)`), `stopIf` (`text(240)`), `bounds` (`text(240)`), `action` (`text(300)`), `boundedBy` (`text(200)`), `observation` (`text(240)`), `recovery` (`text(240)`). The human confirms or declines; the confirmation is recorded and **the agent still performs the action through the normal path**.

**`progress`** (`spec.ts:121-124`) — required `type`, `id`, `label` (`text(80)`). Optional `lens`. `source` is `run` \| `wave` \| `lens` \| `gate`, **default `run`**. Bound to the live event stream; the agent cannot set the percentage.

### Ask blocks

**`ask`** = `AskBase.extend({ type: literal("ask") }).strict().superRefine(askRules)` (`spec.ts:142`). `AskBase` (`spec.ts:128-135`):

| field | type | default / bound |
|---|---|---|
| `id` | `id` | required |
| `prompt` | `text(300)` | required |
| `input` | `confirm` \| `select` \| `multiselect` \| `text` \| `multiline` \| `search` \| `path` | required |
| `why` | `string ≤300` | optional |
| `refs` | `cite` (max 12) | optional |
| `options` | `Option[]` | max 12; **required with ≥2 entries for `select`/`multiselect`/`search`, forbidden otherwise** |
| `placeholder` | `string ≤100` | optional |
| `required` | `boolean` | **default `true`** |
| `resolves` | `RefSchema` | optional; must be an `unknown:`, `proposal:`, or `decision:` ref |
| `default` | `string ≤200` | optional |

`Option` = `{ value `text(60)`, label `text(100)`, hint? ≤200, consequence? ≤240, refs? }`, `.strict()`. Every ask is answerable with **defer** or **cancel**.

**`form`** (`spec.ts:143-145`) — required `type`, `id`, `asks` (`AskBase` with the same rules, **2–8**, submitted together). Optional `title`.

### Block and cross-block `superRefine` rules (`spec.ts:157-172`)

| condition | requirement |
|---|---|
| `table`, `tree`, `timeline`, `chart` | must have `source` **or** `data`, never both |
| `graph` | must have `source` or at least one node |
| `graph` with `edges` | every edge's `from` and `to` must name an existing node |
| `compare` with `mode: "matrix"` | `criteria` required; each criterion's `cells.length` must equal `items.length` |
| `compare` with any other mode | every item needs `source`, `data`, or `image` |

## The `layout: "columns"` discrepancy

**The schema and the renderer disagree.** This is a real, documented drift, not an ambiguity.

| layer | what it says |
|---|---|
| `spec.ts:182` | the inline comment reads `// columns: two equal columns, blocks alternate` |
| `catalog.ts:46` | the vocabulary string advertises `layout: stack\|columns` with that same intent |
| `Surface.tsx:36` | the only thing the renderer does is append the class string `columns` to the blocks container: `` className={`blocks ${spec.layout === "columns" ? "columns" : ""}`} `` |
| `styles.css:74` | `.blocks.columns { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); align-items: start; }` |

So the real behaviour is a **fluid auto-fit grid**: the column count follows the panel's pixel width, not the block count or block order, and blocks are **not** alternated between two equal columns. An agent composing for alternation gets a different number of columns depending on how wide the owner made the panel. Nothing in `tests/cockpit/` asserts the documented behaviour, which is why it persisted. `docs/subsystems/cockpit.md:110-114` records the same finding.

`layout: "stack"` is unambiguous: `.blocks { display: grid; gap: 10px; … }` with no `grid-template-columns`, i.e. one column.

## Source-binding grammar

A block's data is bound by **source**, not typed in. Agent-supplied `data` is always rendered with an "agent-supplied" mark, because a surface cannot pass its own numbers off as process state (`spec.ts:15`, `sources.ts:1-3`).

`SourceSchema` = `z.string().max(300)` refined (`spec.ts:28-32`). One of **six** forms: `pa:`, `graph:`, `case:`, `work:`, `world:`, `file:`. The refinement dispatches on the prefix and checks the name against that family's constant, so a valid prefix with an unknown name fails (`spec.ts:29`); `file:` is matched separately and `..` is refused.

### `pa:` — 20 read-only projections of process state

| source | resolves to | `sources.ts` columns |
|---|---|---|
| `pa:claims` | the claims ledger | `id`(ref), `text`, `grade`(grade), `source` |
| `pa:unknowns` | unknowns | `id`(ref), `question`, `blocks`, `who` |
| `pa:decisions` | the decision log | `id`(ref), `decision`, `rationale`, `touched`, `version`(number) |
| `pa:proposals` | proposals | `id`(ref), `lens`, `field`, `kind`, `proposal`, `status`(status) |
| `pa:artifacts` | artifacts | `id`(ref, labelled "artifact"), `lens`, `built`(number, labelled "built@"), `status`(status), `public` |
| `pa:evidence` | evidence files | `id`(ref, labelled "file"), `lens`, `bytes`(number) |
| `pa:lenses` | lenses and their run counts | `name`(ref), `status`(status), `needs`, `runs`(number) |
| `pa:waves` | waves | `wave`(number), `lenses`, `status`(status), `done`(number), `total`(number) |
| `pa:events` | the event stream, newest first | `seq`(number), `ts`, `type`, `subject`(ref), `detail` |
| `pa:blockers` | current gate blockers | `id`, `text`, `fix` |
| `pa:versions` | settled worlds: per-version counts and identity | `version`(ref), `world` (`model@N`), `settled` (log time, or empty), `claims`(number), `unknowns`(number), `decisions`(number), `latest`, `digest` (12 hex of the model digest) |
| `pa:responses` | the inbox | `id`, `kind`, `outcome`, `ref`, `value`, `status`(status) |
| `pa:candidates` | open and settled proposals as candidates | `id`(ref), `parent` (world), `intention`, `producer`, `delta`, `status`(status), `requires` (what settles it) |
| `pa:trace` | the run as nested activity, built from the event log (`sources.ts:170-192`) | tree, not rows |
| `pa:jobs` | the Jobs table, with what judges each job and what it could recover | `id`(ref), `actor`, `job`, `grade`(grade), `criteria` ("judged by"), `opportunities` (`sources.ts:42`) |
| `pa:criteria` | the Success criteria table, with measurement and evidence | `id`(ref), `job`, `statement`, `importance`, `satisfaction`, `evidence`(status), `grade`(grade), `score`(status) (`sources.ts:43`) |
| `pa:opportunities` | the Opportunities table and the candidates addressing each | `id`(ref), `deficiency`, `basis` ("recovers"), `evidence`(status), `alternatives` ("actor uses today"), `candidates`, `grade`(grade) (`sources.ts:44`) |
| `pa:decision-states` | decision states, one per Case, with what made each row `direct`, `inferred`, or `invalid` | `case`, `actor`(ref), `job`(ref), `trigger`, `push`, `pull`, `anxiety`, `habit`, `grade`(grade), `kind` ("marked", status), `evidence` (`sources.ts:536`) |
| `pa:experiments` | experiments with their freeze state and git ordering | `id`("experiment", ref), `hypothesis`, `state`(status), `frozen`(status), `result`(status), `ordering`("git order", status), `scope`, `issues` (`sources.ts:539`) |
| `pa:patterns` | pattern claims with support, contradiction, and the contract they must meet | `id`("claim", ref), `claim`, `status`(status), `supports`(number), `contradicts`(number), `settings`, `needs`("contract"), `reuse`("reused by", number), `summary` (`sources.ts:542`) |

The last six arrived with the [Case](../case-navigation.md): the demand tables are model rows, and the last three are read from stamped evidence artifacts, so all six grade and go stale like any other projection. They are dispatched before the general `PA` table because the learning three need the evidence world, not the entity projection (`sources.ts:245-252`).

`PA_SOURCES` is the constant at `spec.ts:16`; the projection table is `PA` at `sources.ts:30-46`.

**Query params.** Any `pa:<name>?k=v` pair becomes an `eq` filter on field `k` (`sources.ts:242`), with these special cases:

| param | effect | source |
|---|---|---|
| `stale=1` | appends `status = stale` to the filters — hence `pa:artifacts?stale=1` | `sources.ts:243` |
| `focus=<ref>` | stripped from the filters; consumed by the graph resolver | `sources.ts:242` |
| `all=1` | `graph:lenses?all=1` includes `unselected` and `excluded` lenses | `sources.ts:132` |
| `type=<prefix>` | `pa:events?type=lens.finished` — SQL `LIKE '<prefix>%'` | `sources.ts:233` |
| `subject=<ref>` | `pa:events?subject=surface:x` — exact match | `sources.ts:234` |

### `graph:` — 8 computed graphs

| source | nodes and edges | source |
|---|---|---|
| `graph:lenses` | one node per lens (toned by status), edges from each `needs` dependency | `sources.ts:131-133` |
| `graph:staleness` | stale artifacts → the decisions that staled them → the fields those decisions touched | `sources.ts:134-146` |
| `graph:claims` | claims (toned by grade) → their sources, citing artifacts, touching decisions | `sources.ts:147-160` |
| `graph:model` | every artifact → the fields it reads | `sources.ts:161-163` |
| `graph:workflow` | the process as its nine stages, with the current one marked | `sources.ts:236` (`workflowGraph`) |
| `graph:case` | the Case's one primary move, what it opens, and the blocked moves with what blocks them | `sources.ts:237` (`caseGraph`) |
| `graph:impact?focus=<ref>&dir=&depth=&kinds=&gate=1` | the focused consequence graph of a ref over recorded relationships (see [the world debugger](../world-debugger.md)) | `sources.ts` (`worldGraph`) |
| `graph:why?focus=<ref>` | what the ref rests on: its upstream, three hops by default | `sources.ts` (`worldGraph`) |

`GRAPH_SOURCES` is at `spec.ts:17`. All return `provenance: "process"`. `case` and `workflow` are dispatched ahead of the six lens/artifact graphs because they are derived from the Case and the run rather than from recorded relationships (`sources.ts:236-239`).

### `world:` — the debugger's questions, and `at=`

Read-only, computed from the run's files by `cockpit/server/world.ts`; `WORLD_SOURCES` is `why`, `impact`, `diff`, `timeline`, `counterfactual`, `reach`, `replay`. Each returns `rows` and names the world it looked at (`world: { mode, worlds, subject, op }`) whenever that is not the current one.

| source | rows |
|---|---|
| `world:why?ref=` | question, answer, basis (`recorded` / `derived` / `unavailable`), refs |
| `world:diff?a=&b=` | ref, change (added / changed / removed), field, before, after, because (the decisions that explain it). `a`, `b`: a model version or `current` |
| `world:timeline[?ref=]` | settled transitions as events: seq, ts, type, subject, detail |
| `world:impact?ref=&dir=&depth=&kinds=&status=&gate=1&limit=` | ref, label, status, hops, through, gate-relevance |
| `world:counterfactual?ref=proposal:P<n>` | class (`known`, `derived`, `expected`, `unknown`, `observation-required`), subject, effect, basis, reach |
| `world:reach?need=<capability>` or `?ref=` | capability, provider, status, the six rungs, next step |
| `world:replay?selects=file:evidence/…#tableN&expect=f~op~v[,…][&where=…]` | row, verdict, observed, expected, failed (or the single `not-selected` / `source-error` result) |

`at=<model version>` on `pa:claims`, `pa:unknowns`, `pa:decisions` reads the settled model as it was; other `pa:` sources have no recorded history and answer with an error rather than an invention. `pa:candidates` lists open proposals as candidates with parent world, producer, intention, delta, and what settles them. `pa:versions` rows carry `world`, `settled`, and `digest`.

### `file:` — a run file

Grammar (`spec.ts:21`): `^file:(artifacts|evidence|history)/[^#?]+(#[\w.:-]+)?$`, and **`..` is refused**.

| fragment | meaning | resolved by |
|---|---|---|
| `#table` / `#tableN` | the first / Nth markdown table as rows (1-based) | `fileRows`, `sources.ts:113-120` |
| `#<ref>` e.g. `#claim:C57` | scroll to the first line containing that ref | `readFile`, `sources.ts:95-99` |
| none, `.md`/`.csv` | the whole file as a document | `readFile` |
| none, another extension | the file as a document | `sources.ts:217` |

Root is restricted to `artifacts/`, `evidence/`, `history/`. Files are read from the run directory only, with `MAX_FILE = 240_000` bytes (`sources.ts:28`).

Invalid source → `{ kind: "error", code: "BAD_SOURCE" }`. Unknown `pa:` projection → `BAD_SOURCE` (`sources.ts:256`); unparseable → `BAD_SOURCE` (`sources.ts:231`); a `#tableN` that does not exist → `BAD_SOURCE` naming the table count (`sources.ts:116`).

### `case:` — the derived Case's four projections

A Case is derived on every read; nothing is stored. All four are read-only (`CASE_SOURCES`, `spec.ts:24`). Meaning, semantics, and what the Case refuses to do: [case-navigation.md](../case-navigation.md).

| source | rows |
|---|---|
| `case:state?ref=` | the state in decision order: destination, any owner's note, now, deviation, next move, cost and authority, how we will know, then reachable (when the move opens something), settlement (`case.ts:397-414`) |
| `case:affordances?ref=` | the eight declared columns — move, why, requires, cost, authority, recovery, how we will know, then reachable (`sources.ts:530`). Each row also carries its `lane`, `status`, and `prior` refs: `caseMoveRows` groups them **next move → choose → alternatives → blocked** and caps each lane with an `N more` row (`case.ts:415-428`) |
| `case:settlement?ref=` | condition, type, status (`sources.ts:531`; rows built at `case.ts:429-434`) |
| `case:prior?q=` | settled patterns and experiments that already bear on `q` |

`ref` accepts `run` (default), a demand ref (`OP1`/`S1`/`J1`), `C4`, `U<n>`, `P<n>`, or `evidence/<lens>/<file>`; the anchor decides the Case's purpose.

### `work:` — the Workbench's seven row sources

`WORK_SOURCES` (`spec.ts:27`), resolved by `workRows` in `cockpit/server/workSources.ts:92`. All read; the rows come from the run projection and the cockpit's own control state.

| source | rows | columns |
|---|---|---|
| `work:workflow` | the nine stages, current one prefixed `▶` | `n`("#"), `stage`, `status`, `actor` ("who acts"), `why` ("now"), `accepts` ("accepted when") |
| `work:capabilities[?scope=all]` | one row per capability; without `scope=all`, only those selected or satisfied | `capability`(ref), `category`, `status`, `needs`, `implementation`, `alternatives`, `executor`, `found`, `warning` |
| `work:layers?capability=<lens>` | one capability's layers: Capability, Implementation, each Alternative, Executor, Observation (Reach), and any Conflict | `layer`, `name`, `detail`, `state`, `basis` |
| `work:contract?stage=<id\|current>` | the task contract for one stage | `field`(labelled with the stage title), `value`, `basis` |
| `work:requests[?active=1\|review=1\|status=…]` | work requests, with what the next actor must do | `id`("request"), `text`, `status`, `capability`, `refs`, `next` |
| `work:ledger` | the evidence ledger | `mark`("·"), `check`, `result`, `evidence` |
| `work:waiting` | everything waiting on the owner: a pause, open asks, open proposals, blocked requests | `kind`, `what`, `how`("how to answer") |

An unknown `work:` name, or a `stage`/`capability` that does not exist, returns an error naming the valid values (`workSources.ts:114,127,157`) — not an empty table.

## Refs

`REF_KINDS` — fifteen kinds (`refs.ts:8`). A ref is the only way a surface points at process state.

| kind | id pattern | example |
|---|---|---|
| `claim` | `^C\d+$` | `claim:C42` |
| `unknown` | `^U\d+$` | `unknown:U8` |
| `proposal` | `^P\d+$` | `proposal:P17` |
| `decision` | `^D\d+$` | `decision:D7` |
| `artifact` | `^[\w.-]+(\/[\w.@-]+)+$` | `artifact:marketing/spec-sheet.md` |
| `evidence` | `^[\w.-]+(\/[\w.@ -]+)+$` | `evidence:electronics/power-budget.md` |
| `lens` | `^[a-z][a-z0-9-]*$` | `lens:release-readiness` |
| `field` | one of the ten model field keys | `field:constraints` |
| `version` | `^\d+$` | `version:4` |
| `gate` | the bare literal `gate`, no colon | `gate` |

`parseRef` returns `{kind, id}` or `null`; `..` is refused in any id (`refs.ts:15-22`). `fmtRef(kind, id)` renders the canonical form, with `gate` special-cased (`refs.ts:23`). `RefSchema` is a `z.string().refine` — the error message enumerates all ten forms (`refs.ts:25`).

**Chips.** `REF_TOKEN = /\[\[([^\]\n]{1,120})\]\]/g` matches `[[C42]]` or `[[claim:C42]]` inside text (`refs.ts:35`). `expandRef` expands a bare id by its prefix letter: `C→claim`, `U→unknown`, `P→proposal`, `D→decision` (`refs.ts:29-34`). A resolved token renders as a chip showing the claim's current grade; clicking it opens the entity beside the current view. The `document` block's `mark` list emphasises particular chips.

## Actions and authority

Three tiers, enforced in the reducer, not by UI convention (`workspace.ts:3-7`):

| tier | what it owns | can it be forged from the cockpit? |
|---|---|---|
| **system** | the process rail and process state | no — it is not in the workspace state at all, so there is nothing for an action to remove or edit |
| **agent** | surfaces: content, placement requests, annotations, questions | yes, through the eleven `AGENT_OPS` |
| **human** | layout preference (topology, sizes, pins, minimized), controls, answers | no — never accepted from an agent role |

### Agent operations — eleven (`AGENT_OPS`, `actions.ts:35`)

| op | fields | refusals it can hit |
|---|---|---|
| `surface.put` | `{ surface: SurfaceSchema, place?: Placement }` | `AUTHORITY_SYSTEM` (id starts `system`), `CLUTTER_CAP` at 8 surfaces, `NOT_FOUND` on a bad placement target, `BAD_REF`/`BAD_SOURCE` from `checkSurface` |
| `surface.patch` | `{ id, block?, set }` — `set` keys: `source`, `filter`, `sort`, `highlight`, `select` (nullable), `title`, `summary`; must be non-empty | `NOT_FOUND` (no surface or no such block), `SCHEMA` (block-scoped keys without `block`, or a source on a block that binds none), `BAD_SOURCE`, `BAD_REF` |
| `surface.remove` | `{ id }` | `AUTHORITY_SYSTEM`, `NOT_FOUND`, `AUTHORITY_PINNED` |
| `view.focus` | `{ id, ref? }` | `NOT_FOUND`, `BAD_REF` |
| `view.place` | `{ id, place }` | `NOT_FOUND`, **`AUTHORITY_LAYOUT`** (owner placed it), `AUTHORITY_PINNED` |
| `view.size` | `{ id, state: normal\|minimized\|maximized }` | `NOT_FOUND`, `AUTHORITY_PINNED` (minimize only) |
| `layout.save` | `{ name: ^[a-z][a-z0-9-]{0,31}$ }` | — |
| `layout.restore` | `{ name }`, **default `"previous"`** | `NOT_FOUND` |
| `layout.reset` | `{ keep?: sid[] (max 8) }` — pinned surfaces are always kept | — |
| `note.add` | `{ target: RefSchema \| /^surface:[\w.-]+(#[\w.-]+)?$/, text: 1–400, tone: note\|warning\|danger\|ok (default "note") }` | `NOT_FOUND`, `BAD_REF` |
| `ask.withdraw` | `{ id, reason: 4–160 }` | `NOT_FOUND` (no open ask) |

Two guard rails apply to every agent op before the schema switch: an op starting with `human.` → `AUTHORITY_HUMAN`; an op matching `/rail|system|process|model|gate/` → `AUTHORITY_SYSTEM` (`workspace.ts:180-181`).

Non-fatal warnings, not refusals: `PLACEMENT_IGNORED` when replacing a surface the owner placed, or when `place` is given for an existing surface (`workspace.ts:201`); `CONTROLS_HUMAN` when the owner set a filter/sort on a block the agent is patching (`workspace.ts:240`).

`MAX_AGENT_SURFACES = 8`, `MAX_HISTORY = 10` (`workspace.ts:12-13`). At the cap, the least-recent unpinned surface with no open ask is evicted; if every one is pinned or waiting, the action is refused with `CLUTTER_CAP` (`workspace.ts:206-213`).

### What the Case and the Workbench added to this vocabulary

The [Case](../case-navigation.md) and the [Workbench](../workbench.md) each added to the closed vocabulary rather than beside it:

- `pa:` gained `jobs`, `criteria`, `opportunities` (model rows) and `decision-states`, `experiments`, `patterns` (rows read from stamped artifacts) — see the `pa:` table above.
- `graph:` gained `case` and `workflow`.
- Two new families: `case:` (four projections) and `work:` (seven row sources) — see the grammar chapter above.
- Ref kinds gained `job`, `criterion`, `opportunity`, `actor`, and `case` (`refs.ts:8`); a case ref is `case:run`, `case:OP1`, `case:evidence/<lens>/<file>`, and so on. `REF_KINDS` is **15** in total.
- The `human.open` template list gained `case` (`TEMPLATE_IDS`).
- Tools gained `case_get`, `work_get`, and `work_update` — see the tools chapter.

Everything else stayed closed: no new block type, no new dependency, and nothing that can settle.

### Human operations — eighteen (`HUMAN_OPS`, `actions.ts`): twelve for the workspace and the process, six for the control plane

Arrive only over the authenticated human channel; `applyHuman` is the single entry (`workspace.ts:136`, `serve.ts:5`).

`human.answer` · `human.rule` · `human.confirm` · `human.annotate` · `human.select` · `human.control` · `human.layout` · `human.pin` · `human.close` · `human.layout-restore` · `human.open` · `human.size`; and, from `protocol/work.ts`, the six control operations `human.terminal` · `human.review` · `human.cancel` · `human.bind` · `human.contract` · `human.executor`. The control operations write cockpit state only (never the inbox, the model, or the gate) and an agent that sends one gets `AUTHORITY_HUMAN`; see [the Workbench](../workbench.md).

Four of them are **authority-bearing over the process**: `AUTHORITY_OPS = {human.answer, human.rule, human.confirm, human.annotate}` (`actions.ts:63`). They become inbox records and are never accepted from an agent role.

| op | key fields |
|---|---|
| `human.answer` | `surface`, `ask`, `outcome: answered\|deferred\|cancelled`, `value?: string ≤2000 \| string[] (≤12, each ≤200) \| boolean`, `note? ≤600` |
| `human.rule` | `ref`, `ruling: accept\|reject\|question\|answer`, `reason? ≤600` |
| `human.confirm` | `surface`, `block`, `outcome: confirmed\|declined`, `note?` (≤400) |
| `human.annotate` | `target` (ref or `surface:<id>[#<block>]`), `text` (1–1000), `kind: comment\|issue\|approval` (default `comment`), `at?: { x: 0–1, y: 0–1, item? ≤60 }` — the optional position on a media item |
| `human.select` | `surface`, `block`, `ref` (nullable — clearing a selection) |
| `human.control` | `surface`, `block`, `set: { filter? (≤6), sort? }` |
| `human.layout` | `tree`, `moved? (≤24)`, `minimized? (≤24)`, `maximized?` (nullable), `focus?` (nullable) |
| `human.pin` | `id`, `pinned: boolean` — pinning also sets `placedBy: "human"` (`workspace.ts:416`) |
| `human.close` | `id` |
| `human.layout-restore` | `name`, default `"previous"` |
| `human.open` | `template` ∈ `TEMPLATE_IDS` = workbench, workflow, capabilities, contract, requests, review, case, trace, proposals, claims, contradictions, unknowns, staleness, lenses, gate, inbox, events, ref; `ref?`; `as?: detail\|document\|lineage\|why\|impact\|diff` (a view; opening one writes nothing to the inbox) |
| `human.size` | `id`, `state: normal\|minimized\|maximized` |

## Error codes — the ten reachable ones

`ERROR_CODES` (`actions.ts:67-79`) declares eleven strings. **Ten are reachable**; the eleventh is not. A refusal is `{ ok: false, code, message, issues? }` where `issues` is at most 8 compact Zod issues, each `{ path, message, expected? }` (`issuesOf`, `actions.ts:87-92`).

| code | meaning | likely cause | raised at |
|---|---|---|---|
| `SCHEMA` | the action or surface does not match the vocabulary; `issues` says where | a field name is wrong, a bound is exceeded, `.strict()` caught an unknown property, a cross-block rule failed, or a `human.*` op sent to `applyHuman` failed `HumanOpSchema` | `workspace.ts:182,232,236,335` |
| `UNKNOWN_OP` | the payload had no `op` string at all, so no union member could match | `{}` or a non-object sent as an action | `workspace.ts:182` (`op ? "SCHEMA" : "UNKNOWN_OP"`) |
| `AUTHORITY_SYSTEM` | the process rail and process state are not composable | an id starting `system`, or an op naming `rail`/`system`/`process`/`model`/`gate` | `workspace.ts:181,250` |
| `AUTHORITY_HUMAN` | a human-only operation was attempted by an agent role | sending `human.answer` (etc.) through `cockpit.agent()` or the agent token | `workspace.ts:180` |
| `AUTHORITY_PINNED` | the human pinned this surface | removing or minimizing a pinned surface, or moving one | `workspace.ts:252,274,285` |
| `AUTHORITY_LAYOUT` | the human placed this surface; the agent may change its content, not its position | `view.place` on a surface with `placedBy: "human"` | `workspace.ts:273` |
| `NOT_FOUND` | the named surface, block, ask, layout, ask-id, or placement target does not exist | a stale id from a previous session, or `to: "active"` when nothing is focused | `workspace.ts:216,228,235,251,261,272,275,297,315,323,411,418,423` |
| `BAD_SOURCE` | the source does not resolve to anything | a typo in the `pa:` projection, a `file:` path outside `artifacts`/`evidence`/`history`, a `..`, a `#tableN` past the end, or a patched source on a block that binds none | `sources.ts:114,222,229`; `workspace.ts:236` |
| `BAD_REF` | a ref names an entity that does not exist in this run | a claim removed by a later reconciliation, or a ref for the wrong run | `workspace.ts:237,262,316`; `core.ts:141,201` |
| `CLUTTER_CAP` | 8 surfaces are open and every one is pinned or waiting on an answer | close or withdraw one first | `workspace.ts:208` |

### Declared but unreachable: `NO_RESPONDER`

`"NO_RESPONDER"` is listed at `actions.ts:77` but has **zero uses anywhere in `cockpit/server/`** — a repository-wide search for the string returns that one declaration and nothing else. No code path returns it, so no client can receive it. It is reserved, not live. Do not treat it as part of the protocol's observable surface.

## The tools: fourteen always, seven by context, and work_update while a request is pending

One definition, three transports: the local CLI (`actualize ui …`), the loopback MCP endpoint at `/mcp`, and WebMCP in the page (`tools.ts:1-3`; `webmcp.ts`; `serve.ts:83`). Every tool is either a read, or composes the cockpit through the same typed actions an agent sends directly. None of them can answer for the owner, edit the Product Model, or touch the rail — those capabilities do not exist here (`tools.ts:3`).

| tool | effect | input |
|---|---|---|
| `get_status` | read | `{}` — phase, model version, active lenses, wave, counts (open proposals, unknowns, contradictions, stale, blockers), gate, next action, whether the owner is needed |
| `get_workspace` | read | `{}` — visible surfaces, focus, selection, open questions, layout summary, recent interactions. Compact on purpose |
| `get_vocabulary` | read | `{ block?: string ≤20 }` — the fixed vocabulary: blocks (when to use each), sources, refs, placement, operations. Pass `block` for one block's example |
| `list_items` | read | `{ what: claims\|unknowns\|decisions\|proposals\|artifacts\|blockers\|responses\|lenses, filter?: string ≤100, limit?: int 1–50 default 20 }` — compact id + one-line rows; filter like `status=open`, `grade=CONTRADICTED`, `status=stale` |
| `get_entity` | read | `{ ref: RefSchema }` — one entity in full: fields, related entities, consequence, next affordances |
| `show_surface` | compose | `{ surface: SurfaceSchema, place?: Placement }` — show or replace; existing surfaces keep the owner's position |
| `show_ref` | compose | `{ ref, beside?: id 1–48, as?: detail\|document\|lineage\|why\|impact\|diff\|case\|decision default "detail" }` (`diff` applies to a `version:` ref) |
| `compare_refs` | compose | `{ a: RefSchema, b: RefSchema, beside?: id }` — text diff for two artifacts/evidence files, side-by-side for two entities |
| `ask_human` | compose | `AskBase` + `place?` — `input`: confirm, select, multiselect, text, multiline, search, path. `resolves` names the unknown/proposal/decision it bears on. **You cannot answer it**; read the answer with `read_responses` |
| `arrange` | compose | `{ action: AgentActionSchema }` — any of the eleven agent ops |
| `annotate` | compose | `{ target: string ≤80, text: 1–400, tone?: note\|warning\|danger\|ok default "note" }` — pins an agent note, visibly marked as the agent's |
| `case_get` | read | `{ ref?: "run"\|OP1\|S1\|J1\|C4\|U2\|P7\|evidence/…, part?: summary\|moves\|settlement\|prior, q?, view?: case\|decision, show? }` — the derived [Case](../case-navigation.md): destination, deviation, the one primary move with cost/authority/recovery/evidence, blocked moves with what would reach them, whether settlement is reachable. Never a dump; runs and settles nothing |
| `work_get` | read | `{ part?: summary\|requests\|workflow\|capabilities\|contract\|ledger\|screen, id?: R3, stage?, capability?, show? }` — the [Workbench](../workbench.md): screen mode, workflow stage, pending work requests, capability / implementation / executor, the task contract, the evidence ledger |
| `work_update` | compose | `{ id: R3, status: acknowledged\|running\|produced\|ready_for_review\|blocked\|failed, note?, refs? }` — moves a request the agent holds. `accepted` and `cancelled` are refused with `AUTHORITY_HUMAN`. Offered only while a request is pending |
| `read_responses` | read | `{ unhandled?: boolean default true }` — what the owner answered, ruled, confirmed, or annotated. Routing them is the router's job through the process CLI; this tool only reads |

The seven world tools (`WORLD_TOOLS`) are all reads; `show: true` additionally composes the answer through `surface.put`.

| tool | input |
|---|---|
| `world_why` | `{ ref, show? }`: how the ref came to be, each answer with its basis |
| `world_impact` | `{ ref, dir?: down\|up\|both, depth?: 1–4 default 2, kinds?, gate?, show? }` |
| `world_diff` | `{ a, b?: default "current", show? }`: worlds are `3`, `model@3`, or `current` |
| `world_timeline` | `{ ref?, git?, show? }`: `git` adds local commits that touched the run (read-only) |
| `world_counterfactual` | `{ candidate: proposal ref, show? }` |
| `world_reach` | `{ need?: capability, ref?, show? }`: exactly one of `need`, `ref` |
| `world_replay` | `{ selects: file:evidence/…#tableN, where?, expect, discriminates?, show? }` |

All inputs are `.strict()`. `toolSchemas()` renders them as JSON Schema (`unrepresentable: "any"`, `io: "input"`) with WebMCP `annotations`: `readOnlyHint` for reads, `untrustedContentHint` for tools whose output carries text the run's files supplied. `activeTools(context)` selects which are offered: the fourteen base tools always, `work_update` while a work request is pending, and the world tools by what the focused surface is looking at (`world.mode`, the kinds of the refs it shows or has selected). MCP `tools/list` and the page's WebMCP registration follow it; the CLI's `ui tools --all` lists every definition. Every tool stays callable whether or not it is offered.

## Events

Two channels. Both are a **view, never a source of truth** (`sync.ts:1-4`).

### Process channel — 23 event types

From the engine's append-only `.log.jsonl` (`fromLog`, `sync.ts:47-60`) — 10:

`run.started` · `lenses.selected` · `lens.started` · `lens.finished` · `reconcile.started` · `model.updated` · `reconcile.finished` · `human.requested` · `preflight.required` · `run.finished`

From diffs between two consecutive projections (`diffEvents`, `sync.ts:62-94`) — 14 more:

`proposal.added` · `proposal.resolved` · `unknown.opened` · `unknown.closed` · `contradiction.found` · `claim.regraded` · `artifact.created` · `artifact.stale` · `artifact.rebuilt` · `wave.started` · `human.responded` · `human.handled` · `gate.updated` · `human.requested` (the second source)

`human.requested` appears in both producers, so 10 + 14 − 1 = **23 distinct types**. Log-sourced events are replayed from the log on `rebuild()`; diff-sourced events only exist from the moment they were first observed, which is why `rebuild()` deletes and replays them (`sync.ts:121-126`).

`model.updated` and `reconcile.finished` are one decision: a `reconcile_done` log entry becomes `model.updated` if the model changed, `reconcile.finished` if it did not (`sync.ts:54`).

### Cockpit channel — 16 event types

| event | raised by | subject / data |
|---|---|---|
| `surface.put` | `surface.put` | `surface:<id>`, `{blocks: [types]}` |
| `surface.patch` | `surface.patch` | `surface:<id>`, `{block, keys}` |
| `surface.removed` | `surface.remove` | `surface:<id>` |
| `view.focused` | `view.focus` | `surface:<id>`, `{ref}` |
| `view.moved` | `view.place` | `surface:<id>` |
| `view.sized` | `view.size` | `surface:<id>`, `{state}` |
| `layout.saved` | `layout.save` | —, `{name}` |
| `layout.restored` | `layout.restore` | —, `{name}` |
| `layout.reset` | `layout.reset` | — |
| `note.added` | `note.add` | the note's target |
| `ask.withdrawn` | `ask.withdraw` | `ask:<id>`, `{reason}` |
| `human.answered` | `human.answer` | `ask:<id>`, `{outcome}` |
| `human.ruled` | `human.rule` | the ref, `{ruling}` |
| `human.annotated` | `human.annotate` | the target |
| `preflight.answered` | `human.confirm` | the ask key, `{outcome}` |
| `action.rejected` | `Cockpit.agent` on any failure | —, `{code, op}` (`core.ts:131`) |

**Correction to `docs/cockpit.md:73`.** That line lists the 23 process events correctly but then summarises the cockpit channel as "`surface.*`, `view.*`, `layout.*`, `human.*` for the cockpit's own channel". That glob omits four real event types: **`note.added`**, **`ask.withdrawn`**, **`action.rejected`**, and **`preflight.answered`**. The first three have no matching prefix group; the fourth does not match `human.*` because `human.confirm` emits `preflight.answered`, not a `human.`-prefixed name. The list above is complete.

The rejection is the only cockpit-channel event written outside the reducer — `Cockpit.agent` pushes it directly so a failed attempt is still auditable (`core.ts:129-132`).

### The DB and the wire

`db.pushEvent` inserts `(ts, channel, type, subject, data)` and returns the rowid, used as `seq` (`db.ts:41-43`). The browser receives `ws` deltas — topology and small maps whole, panels by revision (`core.ts:106-111`) — and `rail` updates over the WebSocket. Nothing polls.

## Rules the vocabulary states about itself

`vocabulary()` (`catalog.ts:42-52`) returns these five to the agent, and they are the reducer's actual invariants:

1. You cannot edit or hide the process rail.
2. You cannot answer: ask, then read the answers.
3. A surface the owner placed keeps its position.
4. Pinned surfaces cannot be removed.
5. At most 8 surfaces; the least-recent unpinned one is closed to make room.

`CATALOG` holds one entry per block with `use`, `avoid`, `affords`, and a minimal `example`. Every example is parsed against the schema in `tests/cockpit/grammar.test.ts`, so the catalog cannot drift from the code that renders (`catalog.ts:2`).

### Source trail

- `cockpit/protocol/spec.ts` — `id:7`, `text:8`, `Tone:9`, `PA_SOURCES:16`, `GRAPH_SOURCES:17`, `SourceSchema:28-32`, `Row`/`Data:35-36`, `Filter:37`, `Sort:38`, `bound:39`, `label:40`, `cite:41`, the 15 block schemas (`:44-155`), `BlockSchema` + its cross-block `superRefine:157-172`, `BLOCK_TYPES:175`, `SurfaceSchema:178-193`, `PlacementSchema:199-204`, `normalizeSurfaceDoc:208`, `parseSurfaceText:215`
- `cockpit/protocol/actions.ts` — `sid:8`, the 11 agent op schemas (`:11-31`), `AgentActionSchema:33`, `AGENT_OPS:35`, the 12 human op schemas (`:38-59`), `TEMPLATE_IDS:55`, `HumanOpSchema:60`, `HUMAN_OPS:62` (twelve plus the six `CONTROL_OPS` imported from `work.ts`), `AUTHORITY_OPS:64`, `ERROR_CODES:67-79`, `issuesOf:87-92`, `fail:93`
- `cockpit/protocol/refs.ts` — `REF_KINDS:8`, `ID:11-18`, `parseRef:19-26`, `fmtRef:27-28`, `RefSchema:29`, `BARE:33`/`expandRef:34-38`, `REF_TOKEN:39`
- `cockpit/protocol/catalog.ts` — `CATALOG:7-39`, `INTENTS:40-41`, `vocabulary:42-54`
- `cockpit/protocol/tools.ts` — `TOOLS:16-41` (12 always-on), `CASE_TOOLS:45` pushed at `:49`, `WORLD_TOOLS:54` pushed at `:70`, `WORK_TOOLS:75-81`, `BASE_TOOLS:82`, `activeTools:87-97`, `TOOL_NAMES:98`, `toolSchemas:100`
- `cockpit/server/workspace.ts` — `MAX_AGENT_SURFACES:13`/`MAX_HISTORY:14`, the state types (`:17-29`), `Ctx:31-35`, the schema guards (`:180-184`), `applyAgent` — every agent op body (`:177-333`), `applyHuman` — every human op body (`:334-430`), `isAuthorityOp:431`, `contextOf:451`
- `cockpit/server/sources.ts` — `Resolved:25-26`, `MAX_FILE:28`, `PA:30-47`, `applyFilters:54-73`, `parseQuery:74`, `safeRunFile:80-86`, `readFile:87-104`, `fileRows:105-123`, `graph:129-169`, `trace:170-192`, `treeOfPaths:193-207`, `resolve:211`, `detail:379`
- `cockpit/server/sync.ts` — `KINDS:9`, `writeRows:25`, `fromLog:47-60`, `diffEvents:62-94`, `Syncer.refresh:102`, `rebuild:121`
- `cockpit/server/core.ts` — `wsDelta:106`, `preselect:115`, `agent:126-133` (the rejection event at `:131`), `human:136`, the tool dispatch (`:192-208`)
- `cockpit/web/Surface.tsx` — `REGISTRY:10-13`, `Boundary:15-19`, the `columns` class at `:31`
- `cockpit/web/styles.css:73-74` — `.blocks` and `.blocks.columns`
- `cockpit/server/db.ts:41-43` — `pushEvent`
- `cockpit/server/serve.ts:5,58-83` — the human/agent channel split and the HTTP routes
- `docs/cockpit.md:73` and `docs/subsystems/cockpit.md:110-114` — the two documentation defects this page corrects