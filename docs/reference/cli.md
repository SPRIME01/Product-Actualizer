# CLI and environment reference

Layer 8. Tables of exact flags, defaults, exit codes, and files. Narrative lives in [../hooks.md](../hooks.md) and [../cockpit.md](../cockpit.md).

Two entry points, one implementation:

| entry | what it is |
|---|---|
| `hooks/bin/actualize` | shell shim; resolves symlinks, `exec bun hooks/src/cli.mjs` (`hooks/bin/actualize:17`) |
| `bun run build` → `dist/bin/actualize` | `bun build --compile` of the same `cli.mjs` (`cockpit/build.ts`) |

`cli.mjs` is a Bun entry point. `P.cliCmd()` returns `bun <abs path to cli.mjs>` in a source checkout and `"<execPath>"` when compiled (`hooks/src/process.mjs:16`); that string is what every `$CLI` hint in CLI output expands to.

## Exit codes

| code | when | source |
|---|---|---|
| 0 | success; also every `hook` call, including internal errors (hooks fail open) | `hooks/src/cli.mjs:63,66` |
| 1 | `ProcessError` (any process rule refused the command); `validate` found errors; `gate` not ready; `done` with a failing gate; `ui` tool returned `ok: false`; `inbox` error | `cli.mjs:109,180,185`; `cockpit/cli.ts:80,116,134` |
| 2 | unknown command / unknown `cockpit` verb / unknown `ui` or `inbox` subcommand / unknown install option / bad `--scope` | `cli.mjs:206`; `cockpit/cli.ts:70,110,135`; `hooks/install.mjs:52,54` |
| 70 | any other uncaught throw (stack printed to stderr) | `cli.mjs:210-213` |
| 127 | `hooks/bin/actualize` invoked without `bun` on PATH, for a non-`hook` command | `hooks/bin/actualize:16` |

`gate` returns 0 when ready and 1 when blocked — it is the one command whose exit code is the answer (`cli.mjs:180`). `done` prints the gate and returns 1 when `finish()` reports `ok: false` (`cli.mjs:185`).

## Process commands (`hooks/src/cli.mjs`)

Argument parsing is hand-rolled (`cli.mjs:31-43`): `--k v` sets `opt[k]=v` and pushes `v` onto `multi[k]`; `--k` followed by nothing or another `--` sets `opt[k]=true`. Positional args land in `pos`.

| command | flags | effect |
|---|---|---|
| `begin --goal "<text>" --bar demo\|beta\|release` | `--dir <path>` (default `actualize`, `store.mjs:13`), `--lenient` → `strict: false`, `--force` restart over an existing or finished run | creates `actualize/`, `artifacts/`, `evidence/`, `history/`, `.state/`, writes the `proposals.md` header and `state.json`, logs `begin`. `--goal` min 8 chars; `--bar` must be one of the three (`process.mjs:132-144`) |
| `lenses` | — | prints every lens: name, description, `reads`, `needs`, `executes_with`. No bodies loaded (`cli.mjs:116`) |
| `select --lenses a,b` | `--satisfied x,y`, `--exclude lens="reason"` (repeatable; reason trimmed at first `=`) | records the selection, computes waves, prints them numbered. Rules: `release-readiness` must be selected; at least one `recon-*` before the model exists; every unselected lens needs an exclusion; exclusion reasons 12+ chars; every `needs` must be selected or `--satisfied`; only between lens runs (`process.mjs:146-167`) |
| `lens start <name>` | — | opens the lens write scope, records base proposals/files, and **prints the entire `SKILL.md` body to stdout** (`cli.mjs:136`). That print is the progressive-disclosure mechanism: a lens body is never in context until this command emits it |
| `lens done <name>` | `--no-output "<reason>"` (min 10 chars) | validates new proposal rows, new artifacts against the current model, and that something changed; prints counts and the next action (`process.mjs:206-236`) |
| `reconcile start` | — | the only window in which `product-model.md` may be edited. Snapshots the base model to `.state/model.base.md` and `.state/proposals.base.md`; if no model exists, copies `product-model/TEMPLATE.md` into place (`process.mjs:240-273`) |
| `reconcile done` | — | re-validates the model against SCHEMA, requires `touched` to cover everything that changed, requires every proposal resolved with a non-lazy reason, requires an `accepted:D<n>` to point at a decision created in this reconciliation, requires the selection to be logged as a decision naming every selected and excluded lens. One version bump for the whole reconciliation; prints stale artifacts and the lenses to re-run (`process.mjs:275-335`) |
| `status [--json]` | `--json` | run summary: active/phase/model version/active lenses/completed/unreconciled/selection/blockers/next/verdict (`process.mjs:360-369`) |
| `gate [--json]` | `--json` | `computeGate` output. Blockers carry `{code, text, fix}`; `$CLI` in `fix` expands (`process.mjs:54-90`) |
| `done` | — | requires a passing gate; reads `verdict:` and `owner:` from `artifacts/release-readiness/gate.md`, marks the run finished (`process.mjs:337-348`) |
| `pause --reason "<question>"` | `--reason` required | records `state.paused` and logs `pause`. Lets the next stop through; clears on the user's next message (`cli.mjs:189-197`) |
| `model restore` | subcommand must be `restore` | reverts `product-model.md` from `history/model-v<state.modelVersion>.md`; refuses while a reconciliation is open (`process.mjs:350-358`) |
| `validate [file]` | positional file, else the discovered run's `product-model.md` | prints `valid` or `INVALID` + the error list from `validateModel` (`cli.mjs:104-112`) |
| `hook <client> <event>` | — | the native hook entry. Reads the client's JSON payload on stdin, normalizes it, runs the engine, writes the client's native output. **Clients call this; you do not** (`cli.mjs:52-67`) |
| `install ...` | see below | delegates to `hooks/install.mjs` |
| `help`, `--help`, no args | — | usage text, exit 0 |

`cockpit`, `ui`, `inbox`, and `world` are dispatched to `cockpit/cli.ts` (lazily imported, `cli.mjs:92-97`).

## Gate blocker codes

`computeGate` emits these in order (`process.mjs:57-88`):

`select` · `reconcile-open` · `lens-open` · `unreconciled` · `model-missing` · `model-tampered` · `model-invalid` · `proposals-open` · `lens-not-run` · `inbox` · `artifact-invalid` · `stale` · `no-gate` · `gate-stale`.

## Cockpit commands (`cockpit/cli.ts`)

Complete set — **seven** verbs. `docs/cockpit.md:7` lists only four (`up|down|open|status`) and omits `rebuild`, `reset`, `serve`.

| verb | flags | effect |
|---|---|---|
| `up` | `--port <n>`, `--no-open`, `--print-url` | If already running, opens the existing page and returns. Otherwise spawns a detached `cockpit serve --cwd <cwd>` child, waits up to 8 s for a `URL …` line on stdout, then prints the URL. Prints the owner's tokenised link only when stdout is a TTY or `--print-url`; when piped it prints a notice instead, so a bearer token never reaches an agent reader (`cli.ts:28-47`) |
| `serve` | `--cwd`, `--port`, `--no-open` | the internal entry point `up` spawns. Runs the daemon in the foreground, writes `URL <humanUrl>` to stdout, never returns (`cli.ts:48`, `server/main.ts:6-14`) |
| `open` | — | re-opens the page through `POST /api/open` on the running server; no restart (`cli.ts:49-50`) |
| `status` | — | `cockpit up: <url> (pid <n>)` or `cockpit is down` |
| `down` | — | SIGTERM, waits up to 3 s, then SIGKILL; removes `server.json`. Run, model, and inbox untouched; workspace kept (`cli.ts:53-60`) |
| `rebuild` | — | delete-and-regenerate the SQLite projection from the run directory and replay the engine log; prints the event count (`cli.ts:65-68`) |
| `reset` | — | unlinks `cockpit.db`, `cockpit.db-wal`, `cockpit.db-shm` entirely. The next start rebuilds from the run (`cli.ts:69`) |

Server state lives in `actualize/.cockpit/`: `cockpit.db` (a disposable projection plus the cockpit's durable control tables), `server.json` (`{port,pid,url,startedAt}`), `agent.token`, `context.json`, `server.log`.

## `actualize ui` (`cockpit/cli.ts:82-112`)

Every subcommand goes over HTTP to `/api/agent/tool` when a server is up, or applies the same typed action to the same SQLite file when it is not (`cli.ts:74-79`).

| subcommand | args / flags | tool called |
|---|---|---|
| `status` | — | `get_status` |
| `context` | — | `get_workspace` |
| `catalog [block]` | optional block type; with it, the entry gains a parsed `example` | `get_vocabulary` |
| `list <what>` | `--filter k=v`; `what` ∈ claims, unknowns, decisions, proposals, artifacts, blockers, responses, lenses | `list_items` |
| `entity <ref>` | — | `get_entity` |
| `put <file.yaml>` | `--right-of id`, `--left-of id`, `--below id`, `--above id`, `--tab-of id` (first match wins, in that order) | `show_surface`. The file is parsed as YAML or JSON and normalised (`parseSurfaceText`); a schema failure prints `{ok:false, code:"SCHEMA", issues}` and exits 1 without sending it |
| `show <ref>` | `--as document\|lineage`, `--beside id` | `show_ref` (default `as: "detail"`) |
| `compare <a> <b>` | `--beside id` | `compare_refs` |
| `ask '<json>'` | JSON `AskBase` + optional `place` | `ask_human` |
| `arrange '<json>'` | one `AgentAction` | `arrange` |
| `annotate <target> <text>` | — | `annotate` |
| `responses` | `--all` → `{unhandled:false}` | `read_responses` (default `{unhandled:true}`) |
| `tool <name> '<json>'` | any tool; `{}` when the JSON arg is omitted | that tool |
| `tools [--all]` | the tools currently offered for what the owner is looking at, or every definition | one name per line |
| `world …` | see below | |

### `actualize world` (`cockpit/cli.ts`, also reachable as `actualize ui world …`)

Read-only questions about the product world, answered from the run's files, so they work with the cockpit closed (and over HTTP when it is up, with identical output). `--show` also composes the answer as a surface for the owner. Exit 1 with `{ ok: false, code, message }` for a bad ref (`BAD_REF`), missing history (`BAD_SOURCE`), or a malformed request (`SCHEMA`); nothing changes in any case.

| command | answers |
|---|---|
| `world why <ref>` | how the ref came to be; each answer `recorded`, `derived`, or `unavailable` |
| `world impact <ref> [--dir up\|down\|both] [--depth n] [--kinds a,b] [--gate]` | what depends on it, a focused graph |
| `world diff <a> [b]` | what changed in the Product Model between two settled worlds (`3`, `model@3`, `current`) |
| `world timeline [ref]` | settled transitions |
| `world counterfactual <proposal-ref>` | the preview of an open proposal; applies nothing |
| `world reach <ref>` or `world reach --need <capability>` | providers for the evidence a gap needs, with the six-rung ladder |
| `world replay --selects file:evidence/<lens>/<file>#tableN --expect field~op~value[,…] [--where …]` | an observation criterion over recorded evidence |

See [the world debugger](../world-debugger.md). `world timeline [ref] --git` adds the local commits that touched the run (read-only).

## `actualize case`

| command | answers |
|---|---|
| `case [ref] [--show]` | the Case: destination, what is true now, the material deviation, the one primary move with cost, authority, recovery and expected evidence, blocked moves, whether settlement is reachable. `ref` defaults to `run`; also `OP1`, `S1`, `J1`, `C4`, `U2`, `P7`, `evidence/<lens>/<file>` |
| `case moves [ref]` | the whole affordance field |
| `case settlement [ref]` | required and optional conditions, and `shouldSettleNow` (always the owner's call) |
| `case prior --q "<words>"` | settled patterns and experiments that already bear on this, before you pay to observe it again |
| `case <ref> --decision --show` | the decision-state view for that Case |

It works with the cockpit closed (a function of the run files). See [case navigation](../case-navigation.md).

## `actualize work`

The owner's work requests and the agent's side of their lifecycle. Reads are free; the only write is moving a request the agent holds. It works with the cockpit closed, against the same SQLite file.

| command | does |
|---|---|
| `work` (or `work summary`) | the Workbench mode and why, the current workflow stage, and the pending requests |
| `work requests [R3]` | every request, or one, with where it stands and who has seen it |
| `work workflow` / `work capabilities [lens]` / `work contract [stage]` / `work ledger` / `work screen` | the workflow stages, capability / implementation / executor, the task contract, the evidence ledger, the composed screen. `--show` also opens it for the owner |
| `work ack\|run\|produce\|review\|block\|fail R3 [--note ...] [--refs ref,ref]` | moves a request. `review` means ready for the owner's review and needs refs or a note |

There is no `accept`: the owner accepts, rejects, or cancels, and the cockpit refuses the agent's attempt with `AUTHORITY_HUMAN`. See [the Workbench](../workbench.md).

## `actualize inbox` (`cockpit/cli.ts:115-136`)

| subcommand | flags | effect |
|---|---|---|
| *(none)* / `list` | `--all` (include handled), `--json` | lists entries awaiting the router, or all; prints the routing instruction |
| `ack <id>` | `--as "<where it went>"` | marks the entry handled. `--as` with no value is stored as the empty string |
| `add <kind>` | `--ref`, `--note`, `--outcome`, `--value`; `kind` ∈ `answer`, `ruling`, `confirmation`, `annotation` | records something the owner said in chat, as `via: "relay"`, `actor: "agent-relayed"`. It carries REPORTED weight, never the owner's own VERIFIED (`cli.ts:128-133`, `hooks/src/lib/inbox.mjs:9`) |

The inbox is `actualize/inbox.jsonl`: append-only, authoritative, written only by the cockpit or `inbox add`, acknowledged only by the router. Unhandled entries are a `gate` blocker (`process.mjs:77-78`).

## `install` (`hooks/install.mjs`)

| flag | values | effect |
|---|---|---|
| `--client` | `claude`, `codex`, `cline`, `opencode`, `pi`, `prime`, `all` | default `all`; `pi`/`prime`/`prime-agent` are one adapter |
| `--scope` | `user` (default) \| `project` | which location the hook files are written to |
| `--project` | directory | root the `project` scope resolves against; default cwd |
| `--dry-run` | *(no value)* | print actions without writing |
| `--status` | *(no value)* | report; **exits 1 if anything drifted** |
| `--uninstall` | *(no value)* | remove only managed entries |
| `--force` | *(no value)* | overwrite an unmanaged file at the target path |

Idempotent; backs up any file it changes into `backupDir()` (`ACTUALIZE_BACKUP_DIR`, else `~/.agents/state/actualize-backups` or `~/.local/state/actualize/backups`, `hooks/adapters/common.mjs:15-20`). `runtimeProblem()` requires Bun >= 1.4.0 and `bun` on PATH unless running compiled; `--status`, `--dry-run`, and `--uninstall` warn instead of failing.

## Environment variables

| variable | read at | effect |
|---|---|---|
| `ACTUALIZE_DIR` | `store.mjs:27` | use this run directory instead of searching for `actualize/` (with `state.json`) upward from cwd |
| `ACTUALIZE_PROBE` | `reach.ts` | comma list: `local` runs the declared probe of providers that stay on the machine; a provider id (`gh`) also probes a networked one. Cached a minute. Default off: nothing is run or contacted without it. `ACTUALIZE_GH=1` is an alias for `gh` |
| `ACTUALIZE_SKILLS_DIR` | `store.mjs:16` | lens root; default `<repo>/skills` |
| `ACTUALIZE_MODEL_DIR` | `store.mjs:19` | schema root; default `<repo>/product-model`. `reconcile start` reads `TEMPLATE.md` from here |
| `ACTUALIZE_BACKUP_DIR` | `adapters/common.mjs:16` | where the installer stores backups |
| `ACTUALIZE_HOME` | `store.mjs:11` | **compiled executable only**: parent of `bin/actualize`, holding `skills/` and `product-model/` |
| `ACTUALIZE_STDIN_IDLE_MS` | `cli.mjs:47` | hook stdin idle bound; **default 1500**. Some clients never close stdin, so the read races this timer |
| `ACTUALIZE_DEBUG` | `cli.mjs:65` | print hook stack traces to stderr |
| `COCKPIT_CWD` | `cockpit/server/dev.ts:5` | project the dev server points at; default cwd |
| `COCKPIT_PORT` | `cockpit/server/dev.ts:5` | dev server port; default 0 (ephemeral) |
| `PROJECT` | `justfile:10` | `just` variable: which project the cockpit recipes act on; default the invocation directory |

## `just` recipes (`justfile`)

`root` = the justfile's directory. `project` = `PROJECT` or the invocation directory. `cli` = `ACTUALIZE_BIN` or `bun <root>/hooks/src/cli.mjs`.

| recipe | line | does |
|---|---|---|
| *(private) default* | 14 | `--list --unsorted` |
| `cockpit-up *flags` | 20 | `cockpit up {{flags}}` in `project` |
| `cockpit-down` | 24 | `cockpit down` |
| `cockpit-status` | 28 | `cockpit status` |
| `cockpit-open` | 32 | `cockpit open` |
| `cockpit-restart *flags` | 36 | `cockpit-down` then `cockpit up {{flags}}` — picks up code changes |
| `cockpit-reset` | 40 | `cockpit-down` then `cockpit reset` |
| `cockpit-context` | 44 | `ui context` |
| `inbox` | 48 | `inbox` |
| `install` | 54 | `bun install` in `root` |
| `dev` | 58 | `COCKPIT_CWD={{project}} bun --hot cockpit/server/dev.ts` |
| `test` | 62 | `bun run typecheck && bun test && python3 tests/check.py` |
| `build` | 66 | `bun run cockpit/build.ts` → `dist/` |

## npm scripts (`package.json`)

`test` = `bun run typecheck && bun test && python3 tests/check.py` · `dev` = `bun --hot cockpit/server/dev.ts` · `build` = `bun run cockpit/build.ts` · `cockpit` = `bun hooks/src/cli.mjs cockpit` · `typecheck` = `tsc -p tsconfig.json`. `bin.actualize` = `hooks/bin/actualize`; `engines.bun` = `>=1.4.0`.

## Files in a product's `actualize/` folder

| path | owner | notes |
|---|---|---|
| `product-model.md` | router | editable only during `reconcile`; hash-compared to `state.modelHash` (`model-tampered` blocker) |
| `proposals.md` | lenses append, router resolves | header written by `begin`; rows immutable once resolved; deletions are errors |
| `artifacts/<lens>/*.md` | that lens | first lines carry the stamp; the lens may write only here and in `evidence/<lens>/` |
| `evidence/<lens>/…` | that lens | observations and command results; nesting allowed (`recon-physical/hardware/`, `components/<part>/`) |
| `history/model-v<N>.md` | CLI | one snapshot per reconciled version; `model restore` reads it |
| `state.json` | CLI | do not edit; `zoneOf` classifies it as `state` and the hook denies writes |
| `.state/` | CLI | `model.base.md`, `proposals.base.md` for the open reconciliation; protected |
| `.log.jsonl` | CLI/engine | append-only event log, replayed by the cockpit |
| `inbox.jsonl` | owner's gestures; router acks | append-only, authoritative |
| `.cockpit/` | cockpit | SQLite (projection rows rebuildable from the run; `control_*` rows durable cockpit state), `server.json`, `agent.token`, `context.json`, `server.log`. Git-ignored |

Zone classification is `zoneOf()` (`store.mjs:116-131`): `model`, `proposals`, `state`, `history`, `artifact`, `evidence`, `run-other`, `project`, `outside`.

## Artifact header block

```
built_from: model@4
reads: [purpose, claims]
cites: [C1, C2]
public: true
```

Rules, enforced by `validateArtifact` (`md.mjs:184-210`) and mirrored in `tests/check.py:176-186,520-539`:

- The stamp is the leading run of `key: value` lines; parsing stops at the first blank or non-matching line (`parseStamp`, `md.mjs:158-176`).
- `built_from: model@N` is required. Missing → `missing stamp`.
- `reads:` and `cites:` keys must be present, though both may be `[]`.
- Every `reads` entry must be a model field key or the literal `all` (only valid on the release gate).
- `reads` must be a subset of the lens's own frontmatter `reads`.
- Every id in `cites` must exist in the claims ledger **at `model@N`** — validated against the snapshot, not the current model (`process.mjs:44-46`).
- Inline `[Cn]` citations in the body after the first blank line must equal `cites` exactly, in both directions.
- `public: true` artifacts may cite only `OBSERVED` or `VERIFIED`.
- The gate additionally requires `verdict:` ∈ `go`, `no-go`, `defer`, `go-with-exception`, and `owner:`. On the gate, inline citations must be a **subset** of `cites`, not equal (`md.mjs:200`).

## Repository checks — `python3 tests/check.py`

Stdlib only, 661 lines. It currently prints `lenses: 17`, validates both walkthroughs, and exits 0.

**What it enforces**

| area | detail |
|---|---|
| size limits | `SCHEMA.md` ≤ 120 lines; router `skills/actualize-product/SKILL.md` ≤ 40; lenses 60–100; `kind: tool` skills ≤ 60; `references/*.md` ≤ 150 |
| lens structure | frontmatter has `name`, `description`, `reads`, `needs`, `executes_with`; `name` matches the directory; sections `## Reads from the model`, `## Distinctions`, `## Failure modes`, `## Check`, `## Writes to proposals`; `reads` entries are model field keys; `## Check` has numbered items; `needs` names a real lens; the `needs` graph is acyclic (`check.py:46-99`) |
| progressive disclosure | every `references/*.md` on disk is linked from the lens body, and every linked file exists (`check_references`, `check.py:200-215`) |
| physical chain | `electronics` needs `recon-physical`, `embedded-systems` needs `electronics`, `robotics` needs `embedded-systems`; all three name `PHYSICAL-PREFLIGHT.md`; `robotics` marks ROS as loaded only when ROS is present and has `references/ros2.md`; the router enforces the preflight; six routing scenarios must close under `needs` — digital-only and passive-physical products select no `electronics`/`embedded-systems`/`robotics`, an ESP32 sensor omits `robotics`, a Pi voice device satisfies `electronics`, a robot and a ROS2 robot select `robotics` (`check_physical_chain`, `check.py:218-244`) |
| models | every `model-v<N>.md` **and** `product-model.md` of both walkthroughs against the schema; `product-model.md` must equal the highest snapshot (`validate_model`, `check_walkthrough`, `check.py:119-157,500-511`) |
| decision coverage | the `Lenses:` decision must mention every lens (`decision_lens_coverage`, `check.py:489-497`) |
| artifact staleness | every `artifacts/*/*.md` and `history/*.md` is stamped, `built_from` has a snapshot, `reads` are within the lens, inline citations equal `cites`, cites exist and respect `public`; **and the exact staleness result is compared to `EXPECT_STALE`** (`check.py:514-539,546-551,649-653`) |
| grade discipline | `VERIFIED` needs a `test:` or `owner:` source; an `OBSERVED`/`VERIFIED` claim may not rest on `evidence/electronics/` (a calculation); `VERIFIED` from `datasheet` or `.md:<line>` alone is refused (`check_grades`, `check.py:432-440`) |

| hardware evidence package | `evidence/recon-physical/hardware/` must hold `manifest.yaml`, `system-map.md`, `power-tree.md`, `buses.md`, `wiring.md`; every contradiction's claims exist and its `state` agrees with the grade; every `CONTRADICTED` claim sourced to `hardware/` or `unit/` is in the manifest; revision entries need `kind`, `file`, `revision`, `matches_unit` (yes/no/unknown), the file must exist, a revision equal to the unit's may not be marked `no`, and a `no` must be part of a recorded contradiction; every component has `profile.yaml` + `sources.md`, the exact `sources.md` header, `authority` 1–10, nine `profile` keys, five `identity` keys, `limits[].class` ∈ {recommended, absolute_max, typical, guaranteed, measured}, and every `src`/`S<n>` resolving (`check_hardware`, `check.py:303-388`) |
| re-executed evidence | runs `evidence/electronics/budget.py` and requires `2.76`, `3.06`, `3.36`, `2.00` in its output and in the power-budget claim, plus `EXCEEDS`; runs `evidence/embedded-systems/pincheck.py` on the REV B map and requires **exit 1 and exactly 5 findings**; then a **negative control** with a REV C map and corrected firmware that must exit 0; then the host unittest suite, `Ran 3 tests` (`check_executed_evidence`, `check.py:395-429`) |
| release gate | valid verdict; `PHY<n>` rows well-formed; `exercised` ∈ yes/no, `result` ∈ pass/fail/none; `exercised: yes` with an evidence kind of build/simulation/schematic/render/documentation/mock/calculation is refused; a `go` verdict requires every physical row exercised and passed. Two **negative controls** mutate a copy of the gate and require each mutation to be caught (`gate_errors`, `check_gate`, `check.py:446-486`) |
| negative controls on the hardware package | six mutations of a copy of `walkthrough-mote`, each required to be caught by `check_hardware`: a revision artifact dropped from every contradiction, a contradiction marked resolved while its claim is still `CONTRADICTED`, a limit with no class, a limit citing a source not in `sources.md`, an unknown identity with no `unknowns` entry, a unit-revision artifact marked as not matching (`negative_controls`, `check.py:554-594`) |
| cockpit and runtime | `skills/cockpit/SKILL.md` declares `kind: tool` and mentions "never write UI code", "inbox", "actualize ui"; six named files exist; `package.json` requires `bun >=1.4.0`; **no file anywhere invokes Node** (skips `tests/walkthrough`, `tests/fixture`, `PROVENANCE.md`, `node_modules`, `.tmp`, `.git/`, `bun.lock`, `__pycache__`, and `tests/check.py` itself) (`check_cockpit_and_runtime`, `check.py:597-630`) |
| cleanup | `.tmp/ref` must not exist (`check.py:633-635`) |

**What it does NOT check**

- It never opens `actualize/proposals.md`. No proposal row, status, or reason is validated here — `validateProposalRows` and `validateResolution` live in `md.mjs` and are used by the CLI.
- It does not validate lens prose. It checks presence and length of sections, frontmatter keys, `reads`, and numbered `Check` items — nothing about what the lens says.
- It does not validate `product-model/TEMPLATE.md`'s shape. Only that the file exists (`check.py:51-52`).
- It does not validate `PHYSICAL-PREFLIGHT.md`'s nine record fields. The file is only checked for existence. The preflight fields that *are* validated come from the cockpit's `preflight` block Zod shape, not from that document.
- It does not run `bun test`, `tsc`, or the browser suite.

## `bun test` — the test files

| file | asserts, at a high level |
|---|---|
| `tests/hooks/replay.test.mjs` | the Loam walkthrough replayed through the engine: silent with no run, `begin` opens it, gates on model/product files/lens bodies before a lens runs, selection closure and reasons, ordering, parallel wave 1, blocked stop until reconciled, model created/validated/snapshotted, tamper detection, each reconciliation, public-grade enforcement, lazy rejection refused, release-readiness last, stale rebuild then the gate, plus the stop-gate loop guard and the pause escape |
| `tests/hooks/physical.test.mjs` | the Mote walkthrough: the physical chain closes under `needs`, lens ordering, wave 1 writing the nested hardware package inside its own scope, electronics stamped after reconciliation, embedded-systems then robotics at their own versions, public-copy grade enforcement, an owner reply that stales exactly the artifacts whose cited claims changed, stale rebuild, the release evidence walk; and that a digital-only goal selects no physical lens |
| `tests/cockpit/grammar.test.ts` | every YAML in `compositions/` parses against `SurfaceSchema`, every ref and source resolves in that fixture, and the reducer places it; the catalog's examples are exercised too |
| `tests/cockpit/authority.test.ts` | the rail cannot be removed, covered, or forged; the model/proposals/state/log cannot be changed from the cockpit; agent-supplied data is marked; human answers land in the inbox with the owner's provenance; unhandled responses block the gate; rejections need a logged reason; an agent cannot answer, rule, confirm, or annotate over any transport; the agent token cannot open the human WebSocket; protected zones now include the cockpit's files |
| `tests/cockpit/cli.test.ts` | the cockpit lifecycle in **both** distributions (Bun script and compiled executable): `up`/`status`/`down`, the bearer link suppressed in a pipe, `ui` and `inbox` output |
| `tests/cockpit/live.test.ts` | a real run: the rail with no run, events and rail updates without polling, the nested trace tree, the cockpit not halting the run, reconnect restoring the workspace exactly, deleting SQLite losing only preferences, owner responses surviving, pinned surfaces surviving eviction, the ninth-surface eviction rule, layout save/restore, minimize/maximize, and the compactness of `ui context` |
| `tests/cockpit/hooks-bun.test.ts` | the installed entry points as subprocesses: installer → each client's native config → the generated command → `bin/actualize` → Bun → engine → the client's native output; idempotence, fail-open on missing Bun, 127 otherwise |
| `tests/cockpit/ui.e2e.test.ts` | system Chrome via `playwright-core`: rail sizing and live updates, fixed-component rendering, drag/pin/minimize/restore/close, the empty-workspace affordances and keyboard palette, answering and ruling in the UI, the preflight confirm path, ref chips opening beside, offline/reconnect, WebMCP on `document.modelContext` (registration, abort-based withdrawal as the context changes, refusals, the deprecated alias, and its absence), the world debugger's banners and entity actions, and the software-only run |
| `tests/cockpit/world.test.ts` | the world kernel against both walkthroughs: no operation changes a run file; diff against an independent reading of the model files; identity and digest convergence; `why` bases and gaps for every entity class; impact reduction; candidates and counterfactual classes; replay; the reach ladder; dynamic tool context; debugger surfaces validate against the fixed schema; malformed requests |
| `tests/cockpit/world.transport.test.ts` | one question, the same answer from the cockpit, HTTP, MCP and the CLI; the catalogues are the same definitions; the agent token cannot forge or carry an owner operation; opening a view writes no inbox entry; the hook line reports history and candidate views; answers with the cockpit closed and after deleting SQLite |
| `tests/cockpit/workbench.test.ts` | the two storage classes and migrations (v1 keeps layout, failure rolls back, rebuild keeps `control_*`); the workflow and its `needs` graph; the capability catalogue (lens metadata, `executes_with` as candidates, unknown is not usable, conflicts); the five Workbench modes and that layout is never moved; the terminal's rule table; the request lifecycle and that the agent cannot accept |
| `tests/cockpit/workbench.transport.test.ts` | HTTP, MCP, WebSocket, CLI and the hook line agree; the agent role holds no owner operation on any channel; the control plane works with the cockpit closed; `rebuild` keeps and `reset` deletes cockpit state |
| `tests/cockpit/workbench.e2e.test.ts` | system Chrome: the Workbench, the Work Terminal, the workflow, capability and contract views, a request moving through its lifecycle with an agent on the wire, the evidence ledger, a pinned tab left in place, a dropped connection |
| `tests/cockpit/layoutMap.test.ts` | server tree → dockview → server tree is lossless for each shape |

`tests/cockpit/helpers.ts` and `tests/hooks/helpers.mjs` are shared harnesses, not test files. `bun test` exercises the engine and the cockpit directly, not a live client session. `just test` / `bun run test` adds `tsc` and `tests/check.py`.

### Source trail

- `hooks/src/cli.mjs` — usage text, `parseArgs`, `readStdin`, `hookMain`, every command branch, exit codes
- `hooks/src/process.mjs` — `begin`, `select`, `lensStart`/`lensDone`, `reconcileStart`/`reconcileDone`, `computeGate`, `nextAction`, `finish`, `restoreModel`, `summary`, `cliCmd`
- `hooks/src/lib/store.mjs` — `DIR_NAME`, `findRun`, `makeRun` (every run path), `newState`, `writeAtomic`, `sha`, `log`, `zoneOf`, `skillsDir`, `schemaDir`, `IS_COMPILED`, `REPO_ROOT`
- `hooks/src/lib/md.mjs` — `validateModel`, `parseStamp`, `inlineCites`, `validateArtifact`
- `hooks/src/lib/inbox.mjs:9` — inbox `KINDS`
- `cockpit/cli.ts` — `cockpitMain` (all seven verbs; the usage string at `cli.ts:70` names them), `uiMain`, `inboxMain`, `call`/`out`
- `cockpit/protocol/tools.ts` — the tool definitions (fourteen base, seven world, and `work_update` while a request is pending), their defaults, annotations, and `activeTools`
- `cockpit/server/main.ts:6-14`, `cockpit/server/serve.ts:119` — `runDaemon`, `server.json`
- `hooks/install.mjs` — flags, `resolveAdapters`, `runtimeProblem`, `MIN_BUN`, exit codes
- `hooks/adapters/common.mjs:15-20` — `backupDir`, `ACTUALIZE_BACKUP_DIR`
- `hooks/bin/actualize` — the shim and its 127 path
- `justfile`, `package.json` — recipes, variables, scripts
- `docs/reference.md:6-18` — the repository-checks summary this page expands
- `docs/hooks.md` — client table, install forms, hook behaviour, escape hatches, runtime
- `tests/check.py` — every rule above, with line numbers