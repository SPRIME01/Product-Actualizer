# The world debugger

The cockpit makes the product world thinkable: the rail, the surfaces, the inbox. The world debugger makes it **interrogable**: a handful of read-only operations that answer, from the run's own files, *why* something is true, *what changed*, *what depends on it*, *what would follow if a candidate settled*, *whether a measurement still holds*, and *who could gather the evidence that is missing*.

It adds no store, no daemon, no block, and no authority. Every answer is a function of the run directory, so it is identical with the cockpit open, closed, or rebuilt.

```
SETTLED WORLD ──unresolved delta──► CANDIDATE (an open proposal) ──observation──► EVIDENCE ──reconciliation──► NEW SETTLED WORLD
     ▲                                  │ world counterfactual: preview, never apply          │ world replay: evidence, never settlement
     └──────── world why / diff / timeline / impact: read the settled past and present ───────┘            only the router settles
```

Execution has no epistemic authority. Agents produce candidates, observers produce evidence, and settlement (the router's reconciliation) decides what becomes inherited truth. Nothing here crosses that line.

## Questions and the operations that answer them

| question | operation | source behind it |
|---|---|---|
| Where am I? | the rail; `get_workspace` (`world.mode`, `worlds`, `subject`, `looking`) | `railOf`, `viewingOf` |
| What changed? | `world diff <a> [b]` | `world:diff?a=&b=` |
| How did we get here? | `world timeline [ref]` | `world:timeline`, `pa:versions` (each row is a settled world with its digest) |
| Why is this true? | `world why <ref>` | `world:why?ref=`, `graph:why?focus=` |
| What depends on this? | `world impact <ref> [--dir] [--depth] [--kinds] [--gate]` | `world:impact`, `graph:impact` |
| What if this changed? | `world counterfactual <proposal>` | `world:counterfactual?ref=` |
| What alternative worlds exist? | candidates are open proposals | `pa:candidates` |
| Can this be reproduced? | `world replay --selects … --expect …` | `world:replay?selects=&expect=` |
| What would discriminate? | the `observation-required` rows of a counterfactual | same |
| What outside capability can reach it? | `world reach <ref>` or `--need <capability>` | `world:reach` |

`world.watch` is not a primitive: it is `pa:events?subject=<ref>` plus the `get_workspace` context, which already stream. `world.branch` is not storage: a candidate is an open proposal with an explicit parent. `world.at` is not an operation: it is the `at=` parameter on `pa:claims|unknowns|decisions`.

All of them are `actualize world …` on the CLI (they work with the cockpit closed), tools over MCP and WebMCP, and sources a surface can bind. Add `--show` (or `show: true`) to put the answer in front of the owner as a surface. The debugger surfaces are compositions of the existing fifteen blocks; none is new.

## What "a world" is today

A **settled world** is the Product Model at version N: `history/model-vN.md`, with the current version in `product-model.md`. Its identity is an interface that a content-addressed root can later replace:

```
{ id: "model@3", scheme: "model-version", version: 3, current: false, settledAt: <ts from the log, or null>,
  digest: { scope: "product-model", algo: "sha256", value, covers: [...], omits: ["front matter","artifacts","evidence","proposals"], complete: false } }
```

The digest is over intrinsic content only: claims, unknowns, decisions without their version column, capabilities, and narrative sections, whitespace-normalised. Version numbers, timestamps, and formatting are excluded, so independent runs that settle the same content have the same digest. It is `complete: false` and is never called a world root, because artifacts, evidence, and proposals are not in it and the run does not version them. Where a question needs history the run does not keep (proposal timestamps are only in the log; evidence has none; earlier artifact builds are only sometimes in `history/`), the answer says so and does not guess.

## `why`

For a ref it answers, as far as the record supports: what it is, its state, when it reached that state, which transition and decision changed it, who proposed or observed it, what supports and what contradicts it, what it depends on, what depends on it, the consequence, and whether the owner has weighed in. Every answer carries a **basis**:

- `recorded`: written in the run (a model row, a proposal, a log entry, a stamp);
- `derived`: computed from what is written (the staleness rule, a grade comparison);
- `unavailable`: not recorded. The answer says what is missing; nothing is inferred to fill it.

A claim's grade history comes from walking the settled snapshots, attributed to the decisions at that version that name the claim (`id`) or the whole field (`field`, labelled as such).

## `impact`

A dependency graph is built from relationships the run records: evidence for claim, claim inferred from claim, claim cited by artifact, field read by artifact, decision touched claim or field, decision made artifact stale, proposal accepted as decision, lens built artifact, lens needed by lens, and each engine blocker connected to the gate. Nothing is inferred. From a ref it follows `down`, `up`, or `both`, to a bounded `depth` (default 2, at most 4), optionally restricted by kind or to what lies on a path to the gate, nearest and gate-relevant first, capped at 30 nodes. It reports the transitive affected count, how many are stale, how many are gate-relevant, and the shortest path to the gate. It describes the current world only.

## `counterfactual`

A candidate is an open proposal. The result is a preview, never a prediction presented as truth:

| class | meaning |
|---|---|
| `known` | declared by the proposal itself |
| `derived` | follows from a process rule applied to known facts (a change to what an artifact reads or cites stales it; accepting any change raises the model version, so the gate built earlier blocks as `gate-stale`) |
| `expected` | likely, not determined (a discovery only adds; whether readers go stale depends on the `touched` the router records; lenses that would re-run) |
| `unknown` | cannot be known before the router runs (the grade a changed claim ends at; the ids a discovery is given) |
| `observation-required` | what must be seen before this could settle: evidence below OBSERVED for a claim it rests on, an open unknown it names, a cited file the run does not have, each with the capability that could gather it |

The candidate record names its parent world, producer, intention, delta, status, evidence, and what settles it. It is never authoritative.

## `replay`: an observation criterion over recorded evidence

An observer is `selects` (a table in an evidence file) + optional `where` + `expect` (predicates over the selected rows) + optional `discriminates` (refs). Running it again reads the recorded evidence and reports which rows pass and fail. Its identity is a digest of its definition, so the same criterion has the same id whoever runs it. An empty selection is reported as `not-selected`, not as a pass. Cells with units compare numerically (`+1.28`, `2.76 A`). The result is evidence for the router and owner; it has `settles: false` and changes no grade, claim, or gate.

## `reach`: missing evidence to capability to provider

A gap on a claim (graded below OBSERVED) or an unknown routes to capabilities (`web.search`, `github.search`, `reddit.read`, `youtube.transcript`, `repo.inspect`, `browser.inspect`, `trace.query`, `device.serial`, `hardware.measure`, `cad.inspect`, `owner.attest`) and each to interchangeable providers (`cockpit/server/reach.providers.json`, plain data). An unknown that names the owner as who can resolve it routes to the owner, which is a provider like any other, reached with `ask_human`.

Each provider is placed on a ladder whose rungs never collapse into one boolean:

| rung | what it means | how it is known |
|---|---|---|
| `available` | supported on this platform | the catalog |
| `installed` | a binary is on PATH | `Bun.which` |
| `configured` | a credential or config is present | presence of an env var or file; the value is never read |
| `probed` | a health probe was actually run | a probe record (none exist yet) |
| `reachable` | the probe got an answer | the probe |
| `authorized` | the answer accepted the credential | the probe |

`usable` requires every rung to hold or not apply. `unproven` means nothing failed but a rung is unknown. `blocked` names the first failing rung and the next step. **Nothing is run and nothing is contacted**; `probed`, `reachable`, and `authorized` stay `unknown` until a prober supplies them, which is the boundary a future integration plugs into. Which capability a claim needs is read from its recorded source or an unknown's `who`; when it is guessed from the source's wording the result is labelled `heuristic`.

## Navigation never mutates

A surface looks at history or a candidate only through its own sources (`pa:claims?at=2`, `world:diff?a=2&b=current`, `world:counterfactual?ref=…`). The page derives a banner from those sources with shared code, so a surface cannot present history or a candidate as the current world and the agent has no field to hide it. The rail keeps showing the settled model. Opening a view is layout, not authority: it writes nothing to `inbox.jsonl`.

`get_workspace` gains a compact `world` object (`mode`, `worlds`, `subject`, `looking`) derived from the focused surface, and the hook line tells the router when the owner is viewing history or a candidate.

## Tools by context

The tool definitions are one list (`cockpit/protocol/tools.ts`) feeding the CLI, the loopback MCP endpoint, and WebMCP. What is *offered* follows what the owner is looking at (`activeTools`), to keep the catalogue small. This is discovery, not authorization: every tool stays callable, and none can do more than read the run or compose the cockpit as the agent role.

| context | offered besides the thirteen base tools |
|---|---|
| normal | nothing |
| a subject is open or selected, or a non-current world | `world_why`, `world_impact` |
| a historical world, or a version | `world_diff`, `world_timeline` |
| a candidate or a proposal | `world_counterfactual`, `world_replay`, `world_reach` |
| an unknown or a claim | `world_reach` |
| an evidence file | `world_replay` |

**WebMCP** follows the current specification: tools are registered on `document.modelContext` with `registerTool(tool, { signal })` and withdrawn by aborting that signal when the context changes; names use only letters, digits, `_`, `-`, `.`; `readOnlyHint` and `untrustedContentHint` are set from the tool definitions; a refusal is thrown as an error carrying `{ ok: false, code, message, issues }`. The earlier `navigator.modelContext.provideContext` is gone from the spec and from this code; `navigator.modelContext` is used only as the deprecated alias when the document has none. MCP clients see the active set on each `tools/list`. The loopback endpoint has no push channel, so it does not announce changes.

## Authority

| invariant | where it is enforced and tested |
|---|---|
| the cockpit is not the source of truth; SQLite is disposable | the same answers after deleting the database and rebuilding (`world.transport.test.ts`) |
| a historical viewport is not the current world | the banner is derived from sources; the rail and gate are unchanged while viewing history (`world.test.ts`, `ui.e2e.test.ts`) |
| a candidate is not truth; a counterfactual is not execution | every world operation leaves every run file byte-identical; `authority: "possibility"`; `authoritative: false` |
| observer evidence does not settle | `settles: false`; no grade, claim, gate, or inbox change |
| a human click is not a model edit; the agent cannot forge `human.*` | `AUTHORITY_HUMAN` over `/api/agent/action` and through `arrange`; no world tool accepts a ruling shape |
| WebMCP is not an owner channel | WebMCP runs under the agent token; no tool answers, rules, confirms, or edits the model |
| no source escapes the run | the tool schema, `..` checks, and `safeRunFile` including symlinks |
| malformed requests return structured errors and change nothing | `SCHEMA`, `BAD_REF`, `BAD_SOURCE` with the workspace revision and files unchanged |

## The Case builds on this

Jobs, success criteria, opportunities, and Cases are ordinary refs: `why`, `impact`, `diff`, `timeline`, `counterfactual`, and `reach` answer for them from the same files with no new engine, and say `unavailable` where the run records nothing (an opportunity whose source names no evidence file has no "supports" edge). A candidate that names an opportunity is previewed as one possible transformation, never as evidence the shortfall shrank. `reach` on an unmeasured criterion routes to the measurement capabilities (`market.interview`, `market.survey`, `behavior.analytics`, `support.history`), whose providers are data in `reach.providers.json`. Local git adds commit provenance to `why` (artifacts, evidence, a version's settlement time when the log lacks it) and to `timeline --git`. See [case navigation](case-navigation.md).

## What it does not do

- It does not make worlds content-addressed. The digest covers the Product Model only and says so.
- It cannot answer history for proposals, evidence, or earlier artifact builds the run does not keep.
- `impact` and `reach` describe the current world; only claims, unknowns, and decisions can be read `at=` a past version.
- `reach` does not probe. Everything beyond `installed` and `configured` is `unknown`.
- WebMCP was exercised in a real Chrome against a stand-in for the browser's API (the page's behaviour, not the browser's); the specification is implemented in Chrome 149 and Edge 150 origin trials, which this environment did not run.

### Source trail

- `cockpit/server/world.ts`: identity, diff, timeline, graph, impact, why, counterfactual, reach, replay
- `cockpit/server/reach.ts`, `reach.providers.json`: the ladder and the provider catalogue
- `cockpit/server/sources.ts`: the `world:` family, `graph:why|impact`, `at=`, `pa:candidates`
- `cockpit/server/worldSurfaces.ts`: the standard debugger compositions
- `cockpit/protocol/world.ts`: shared vocabulary, `worldOfSource`, `bannerOf`
- `cockpit/protocol/tools.ts`: `WORLD_TOOLS`, `activeTools`, annotations
- `cockpit/web/webmcp.ts`: registration on `document.modelContext`
- `tests/cockpit/world.test.ts`, `world.transport.test.ts`, `ui.e2e.test.ts` (the debugger and WebMCP groups)
