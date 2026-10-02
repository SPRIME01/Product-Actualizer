# Files and layout

Layer 8. Two trees: the run directory a product owns, and this repository.

## The run directory: `<project>/actualize/`

Located by `findRun` (`hooks/src/lib/store.mjs:25-40`): `ACTUALIZE_DIR` if set, else the nearest ancestor directory containing `actualize/state.json`. Every path below comes from `makeRun` (`store.mjs:42-57`).

| path | owner | authoritative? | notes |
|---|---|---|---|
| `state.json` | CLI | **yes** | phase, selection, active lenses, completed counts, `modelVersion`, `modelHash`, `stopBlocks`, `paused`. Do not edit by hand; `zoneOf` calls it `state` and the pre-tool hook denies writes |
| `product-model.md` | router | **yes** | one Product Model. Writable only during `reconcile`; hash-compared against `state.modelHash` every gate check, so an out-of-band edit is detected as `model-tampered` |
| `proposals.md` | lenses append; router resolves | **yes** | the table defined in [product-model-schema.md](product-model-schema.md). Resolved rows are immutable; deletions are errors |
| `artifacts/<lens>/*.md` | that lens | **yes** | derived outputs. Each carries the stamp (`built_from`, `reads`, `cites`, `public`) |
| `evidence/<lens>/**` | that lens | **yes** | observations, command results, and nested packages. `evidence/recon-physical/hardware/` holds `manifest.yaml`, the four topology documents, and `components/<part>/{profile.yaml,sources.md}` |
| `history/model-v<N>.md` | CLI | **yes** | one snapshot per reconciled version. `model restore` reads the snapshot for `state.modelVersion` |
| `.state/model.base.md` | CLI | scratch | the model as it was when `reconcile start` opened. Deleted when the model was created from `TEMPLATE.md` |
| `.state/proposals.base.md` | CLI | scratch | the proposals rows at `reconcile start`. The base for immutability and deletion checks |
| `.log.jsonl` | engine / CLI | **yes** (append-only) | every process event, `{ts, type, …}`. The cockpit replays it; nothing rewrites it |
| `inbox.jsonl` | owner's gestures; router acks | **yes** (append-only) | `answer`, `ruling`, `confirmation`, `annotation`. Unhandled entries block the gate |
| `.cockpit/` | cockpit | **disposable** | `cockpit.db` (+ `-wal`, `-shm`), `server.json`, `agent.token`, `context.json`, `server.log`. Git-ignored. `cockpit rebuild` regenerates the projection from the run; `cockpit reset` deletes the files outright. Deleting it loses only the owner's layout, pins, and the surfaces on screen |

**Zone classification** (`zoneOf`, `store.mjs:116-131`) is what the pre-tool hook enforces:

| zone | paths | hook rule |
|---|---|---|
| `model` | `product-model.md` | writable only while `state.phase === "reconcile"` |
| `proposals` | `proposals.md` | writable only during a lens run or a reconciliation |
| `state` | `state.json`, `.state/`, `.cockpit/`, `.log.jsonl`, `inbox.jsonl` | CLI-managed; the agent cannot write it |
| `history` | `history/**` | CLI-managed |
| `artifact` | `artifacts/<lens>/…` | a lens writes only its own `artifacts/<lens>/` and `evidence/<lens>/` |
| `evidence` | `evidence/<lens>/…` | same rule |
| `run-other` | anything else inside `actualize/` | — |
| `project` / `outside` | outside `actualize/` but inside the project / outside it | strict mode: product files change only inside a lens run |

## This repository

| path | what it is | who reads it |
|---|---|---|
| `skills/actualize-product/SKILL.md` | the **router**, always loaded, ≤ 40 lines: classify evidence, build the model, pick lenses, reconcile, rebuild stale work, verify | the agent, every run |
| `skills/<lens>/SKILL.md` | 17 lenses, 60–100 lines each: frontmatter (`name`, `description`, `reads`, `needs`, `executes_with`) and the five required sections | the agent, one at a time, via `actualize lens start` |
| `skills/<lens>/references/*.md` | detail loaded only when the lens body says so; ≤ 150 lines, must be linked from the lens | the agent, on demand |
| `skills/cockpit/SKILL.md` | a `kind: tool` skill — the agent's guide to composing the cockpit. Never selectable as a lens | the agent, when the cockpit is in use |
| `product-model/SCHEMA.md` | the model's contract: fields, seven grades, rules, versioning, staleness, the eight-item checklist. Always loaded with the router; ≤ 120 lines | the agent; also parsed by `tests/check.py` |
| `product-model/TEMPLATE.md` | a blank model instance, copied in by the first `reconcile start` | the router, once per run |
| `product-model/PHYSICAL-PREFLIGHT.md` | four action classes and the nine-field preflight record. Read by every lens that touches a real unit | the five physical lenses |
| `hooks/bin/actualize` | the three-line shell shim: resolve symlinks, `exec bun hooks/src/cli.mjs` | clients invoke it |
| `hooks/src/cli.mjs` | the process CLI and hook entry point | clients, the operator |
| `hooks/src/engine.mjs` | the rules the hooks enforce: deny before a tool call, feedback after, block at stop | invoked by every hook |
| `hooks/src/process.mjs` | the process as a state machine, plus `computeGate` | `cli.mjs` and `engine.mjs` |
| `hooks/src/normalize.mjs` | client event names → one internal event shape; native output formatting | `cli.mjs` |
| `hooks/src/lib/{store,md,lenses,inbox}.mjs` | run location and state, model/artifact parsing and validation, lens loading and waves, the inbox | everything under `hooks/` |
| `hooks/adapters/*.mjs` | one per client (`claude-code`, `codex`, `cline`, `opencode`, `prime`) + shared plumbing | `hooks/install.mjs` |
| `hooks/clients/{opencode/actualize.js,prime/actualize.ts}` | in-process clients that run the engine inside the host runtime | those two hosts |
| `hooks/install.mjs` | reconciles hook entries into each client's native config; idempotent | the operator, once |
| `cockpit/protocol/*.ts` | the closed vocabulary: `spec` (15 blocks, surface, placement), `actions` (23 ops, error codes), `refs`, `catalog`, `tools` | the agent, the server, the renderer |
| `cockpit/server/*.ts` | `workspace.ts` the pure reducer; `sources.ts` the source resolver; `project.ts` the projection; `sync.ts` run → SQLite; `db.ts` the schema; `core.ts` the facade; `serve.ts` HTTP + WebSocket; `main.ts` the daemon; `dev.ts` hot reload; `templates.ts` the standard views | the cockpit server |
| `cockpit/web/*` | React SPA: `Surface.tsx` the block registry, `Workspace.tsx` the dockview layout, `blocks/*` the 15 components, `store.ts`, `webmcp.ts`, `layoutMap.ts`, `graphLayout.ts` | the browser |
| `cockpit/cli.ts` | `actualize cockpit`, `actualize ui`, `actualize inbox` | the agent and the operator |
| `cockpit/build.ts` | compiles `cli.mjs` to a single executable with `skills/` and `product-model/` beside it | `bun run build` |
| `cockpit/design/{DESIGN,PRODUCT}.md` | the cockpit's own design and product notes | maintainers |
| `tests/check.py` | the repository's own rule checker, stdlib only | `just test` |
| `tests/fixture/`, `tests/fixture-mote/` | two fake incomplete products | the tests |
| `tests/walkthrough/`, `tests/walkthrough-mote/` | two hand-run transcripts with their resulting run state | the tests, and a reader |
| `tests/hooks/`, `tests/cockpit/` | `bun test` suites | `bun test` |
| `docs/` | this documentation set | readers |
| `justfile`, `package.json`, `tsconfig.json` | recipes, scripts and deps, TypeScript config | the operator and `bun` |
| `README.md`, `AGENTS.md` | what it is, how to use it; the agent-facing rules for working in this repo | readers, coding agents |
| `DESIGN.md` | the visual system: colour, typography, spacing tokens. Machine-read frontmatter | the renderer and maintainers |
| `PRODUCT.md` | what this repository itself is and who it serves | readers |
| `PROVENANCE.md` | which donor repositories informed which lens, and under what license | maintainers, `check.py` (excluded from the Node scan) |
| `.gitignore` | notably `actualize/.cockpit/`, `**/.cockpit/`, `*.db`, `.tmp/`, `.serena/` | git |

`.tmp/ref/` holds reference clones during donor work and is deleted after use; `check.py` fails if it still exists.

## Test fixtures and walkthroughs

Two fictional products, each with an input tree and a walkthrough that is a real run's output.

### `tests/fixture/` — Loam

| entry | what it is |
|---|---|
| `brief.txt` | the owner's rough description: a Wi-Fi soil-moisture probe, 50 beta people in the spring |
| `loam-fw/` | a tiny Python firmware repo: `main.py`, `loam/{sensor,alerts,uplink}.py`, `tests/test_sensor.py`, and a README that overstates what the code does |
| `probe-render.svg` | one image — a product render |

Demonstrates: software and a sensor, no hardware build. `recon-software` finds the code disagreeing with the README; `recon-physical` covers the render. Ends at a **`defer`** gate — not a clean `go`, because the name is unverified (U7 stays open rather than a clearance claim being invented). `model_version: 4`, a public beta page citing only `OBSERVED`/`VERIFIED`, and one stale history snapshot (`history/beta-page@2.md`, by `D10`).

### `tests/fixture-mote/` — the Mote

| entry | what it is |
|---|---|
| `brief.txt`, `README.md`, `docs/{notes,old-product-page}.md` | owner prose: the goal, the setup, notes, and a stale product page |
| `host/` | a Python host app on a Raspberry Pi Zero 2 W: `mote/` package, `systemd/` unit, `tests/` — **3 passing unittests**, run by `check.py` |
| `firmware/neck/` | MicroPython neck firmware: `config.py` (a **REV B** pin map), `main.py`, `servo.py`, `thp.py`, `tof.py`, `build/` |
| `hardware/` | a deliberately inconsistent package: REV C schematic export, **rev B** BOM and assembly guide, REV C hardware guide, CAD metadata, `datasheets/` (7 component documents) |
| `unit/` | captures from the desk unit: `inspection.txt` with the silkscreen partly hidden, `boot-journal.txt`, `neck-boot.log` |

Demonstrates the whole physical chain and every reason it exists: revision contradictions (REV B documents against a REV C unit), a power budget that exceeds its supply, firmware pin conflicts, and a design that was never exercised on the unit. The hardware evidence package is kept under `evidence/recon-physical/hardware/`. Ends at a **`no-go` gate**: `model_version: 6`, `PHY1` unexercised on a REV C unit, and a public spec sheet whose wording defect is returned to `marketing`.

The parts are fictional except the Raspberry Pi Zero 2 W and the RP2040, used only for general facts.

### The two walkthroughs

Each is a complete run directory without `state.json`, plus a `TRANSCRIPT.md` narrating the hand-run:

```
tests/walkthrough/          tests/walkthrough-mote/
├── TRANSCRIPT.md           ├── TRANSCRIPT.md
├── product-model.md        ├── product-model.md        == model-v4.md   == model-v6.md
├── proposals.md            ├── proposals.md
├── model-v1..v4.md         ├── model-v1..v6.md
├── artifacts/<lens>/*.md   ├── artifacts/<lens>/*.md
├── evidence/<lens>/…       ├── evidence/<lens>/…  (incl. recon-physical/hardware/)
└── history/*.md            └── history/*.md
```

`tests/walkthrough/` artifacts: `brand/identity.md`, `marketing/beta-page.md`, `provenance-licensing/ledger.md`, `release-readiness/gate.md`; one stale history file.

`tests/walkthrough-mote/` artifacts: `electronics/electrical-review.md`, `embedded-systems/bringup.md`, `robotics/behavior-envelope.md`, `marketing/spec-sheet.md`, `release-readiness/gate.md`; three history files, two of them stale by `D7`. Its `evidence/` also holds the two **executable** scripts `electronics/budget.py` and `embedded-systems/pincheck.py`, plus `actions.md` preflight records for each physical lens that acted.

### Who uses what

| consumer | reads |
|---|---|
| `python3 tests/check.py` | both walkthroughs' models, snapshots, artifacts, evidence, and the hardware package; **re-executes** `budget.py`, `pincheck.py`, and the host unittest suite, with negative controls |
| `tests/hooks/replay.test.mjs` | `tests/walkthrough/` — replayed step by step through the engine, building state as it goes |
| `tests/hooks/physical.test.mjs` | `tests/fixture-mote/` inputs and `tests/walkthrough-mote/` outcomes |
| `tests/cockpit/helpers.ts` | copies a walkthrough's final state into a temp project, synthesising only `state.json` and the event log, so the cockpit can be exercised against both fixtures |
| `tests/cockpit/compositions/*.yaml` | ten real surfaces, each naming its `fixture` and its `scenario`, checked against the schema, refs, sources, and the reducer |
| a reader | `TRANSCRIPT.md` — what actually happened, and why each claim has the grade it has |

### Source trail

- `hooks/src/lib/store.mjs` — `makeRun:42` (every run path), `findRun:25`, `zoneOf:116`, `newState:82`, `log:92`, `skillsDir:15`, `schemaDir:18`, `IS_COMPILED:9`
- `hooks/src/process.mjs` — `snapshotPath:26`, `artifactFiles:32`, `inspectArtifacts:37`, `begin:132` (which directories it creates), `reconcileStart:253-266` (the two `.state/` scratch files), `reconcileDone:323`
- `hooks/src/lib/inbox.mjs:1-9` — `inbox.jsonl`, its four kinds
- `cockpit/cli.ts:14` — `dirOf`, the `.cockpit` directory location
- `cockpit/server/core.ts:172` — `context.json`; `cockpit/server/serve.ts:27,119` — `agent.token`, `server.json`
- `hooks/src/cli.mjs:136` — the stamp template printed by `lens start`
- `tests/check.py` — `SCENARIOS:190`, `PHYSICAL:189`, `IDENT:295`, `CLASSES:294`, `EXPECT_STALE:546`, `check_hardware:303`, `check_executed_evidence:395`
- `tests/cockpit/helpers.ts` — `FIXTURES`, `fixtureRun`
- `tests/cockpit/compositions/` — the ten scenario files
- `tests/fixture/`, `tests/fixture-mote/` — the two input trees; `tests/walkthrough/TRANSCRIPT.md`, `tests/walkthrough-mote/TRANSCRIPT.md` — what each run does
- `README.md:20-30`, `.gitignore`, `package.json`, `justfile` — the top-level layout as the repository states it