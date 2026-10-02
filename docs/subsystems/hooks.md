# Hooks (subsystem guide)

Layer 3. For the operator's view of the same subsystem see [../hooks.md](../hooks.md); this page is how the code is actually built.

## Purpose

Make the product-actualization process mandatory rather than advisory. Hooks read a run's on-disk state, inject status into the agent's context, deny writes that skip a step, and refuse to let the agent stop with the process unfinished. In a project with no `actualize/state.json` at or above the working directory the engine returns `null` for everything and stays silent (`engine.mjs:17-18`).

## Responsibilities

- One pure decision function over (normalized event, files on disk), with no client-specific code (`engine.mjs handle`, `engine.mjs:1-2`).
- Classify every attempted path into a protected zone and refuse writes outside the current permission (`store.mjs zoneOf`, `engine.mjs:108-176`).
- Validate artifact stamps against the model version they claim to be built from, at write time and again at `lens done` (`engine.mjs:157-167`, `process.mjs:219-225`).
- Classify shell commands that change hardware state and require a recorded preflight, or refuse them outright (`engine.mjs:72-106`).
- Own the run state machine: phases, lens ordering, selection closure, reconciliation windows, and the stop gate (`process.mjs`).
- Reconcile hook entries into five client configuration formats, idempotently and without touching unmanaged entries (`hooks/install.mjs`, `hooks/adapters/*.mjs`).

## Non-responsibilities

- Being client-aware. No adapter name appears in `engine.mjs`; per-client knowledge lives in `normalize.mjs` and `hooks/adapters/`.
- Writing the Product Model. The engine only permits or refuses the write; only the router's reconciliation window may perform it.
- Running the cockpit. `handle` reads `.cockpit/context.json` for one status line and `process.kill(c.pid, 0)` to avoid reporting a dead server (`engine.mjs:60-68`).
- Owning state.json semantics for the cockpit or skills. `state.json`, `.state/`, `.log.jsonl`, `inbox.jsonl`, and `history/` are CLI-managed and denied to the agent as writes (`engine.mjs:137`, `store.mjs:126-127`).
- Blocking task completion on clients that cannot. Cline, OpenCode, and Pi/Prime have no veto; there the stop gate reports and relies on the model to continue.

## Position in the system

The hooks are the enforcement edge between an agent client and a run directory. The skills (`skills/*/SKILL.md`) describe the process; the engine enforces it; the CLI is the only writer of run state the agent is expected to invoke.

```
client (Claude Code / Codex / Cline / OpenCode / Pi-Prime)
   │  native payload on stdin
   ▼
hooks/bin/actualize  (POSIX sh: resolve symlink, exec bun)
   ▼
hooks/src/cli.mjs  hookMain → normalizeEvent → handle → formatOutput → exit code
                          │                │            │
              hooks/src/normalize.mjs  engine.mjs   native JSON / exit 2
                                   │  │
                    lib/store.mjs ───┴─ lib/md.mjs, lib/lenses.mjs, lib/inbox.mjs
                                   │
                             process.mjs (state machine + computeGate)
                                   │
                          actualize/ (state.json, product-model.md, proposals.md,
                                     artifacts/, evidence/, history/, .state/,
                                     .log.jsonl, inbox.jsonl, .cockpit/)
```

In-process hosts skip the process boundary entirely: `hooks/clients/opencode/actualize.js` and `hooks/clients/prime/actualize.ts` import `engine.mjs` directly.

## Core abstractions

**`handle(ev, env)` → `{ context?, deny?, block?, feedback?, notice? }`** (`engine.mjs:16-33`). Five decision channels, all strings. `handle` finds the run, loads state, returns `null` when there is none or it is inactive, and dispatches `session_start`/`compact` → context, `prompt` → context (and clears a pause), `pre_tool` → deny, `post_tool` → feedback, `stop` → block or notice.

**Normalized event** `{ client, event, cwd, prompt?, tool?, raw }` with `tool.kind` ∈ `bash|read|write|edit|patch|other`, paths resolved from nine different key names across clients, and patch headers (`*** Add File:`, `+++ b/`) parsed for paths (`normalize.mjs:2,10-12,25-31,33-54`).

**Zones** returned by `zoneOf` (`store.mjs:116-131`): `model`, `proposals`, `state`, `history`, `artifact`, `evidence`, `run-other`, `project`, `outside`. Every deny rule is a `switch` on this value.

**Native output.** `formatOutput` returns `{ stdout, stderr, code }` (`normalize.mjs:84-108`): Claude Code and Codex get `hookSpecificOutput.permissionDecision: "deny"` on `pre_tool` and exit 2 on `stop`/`post_tool`; Cline gets `{cancel:true, errorMessage}` and exactly `{}` when there is nothing to say.

## Internal operation

### Runtime

`package.json:5-9` pins `engines.bun >= 1.4.0` and exposes `bin.actualize → hooks/bin/actualize`. The shim resolves symlinks, then `exec bun hooks/src/cli.mjs "$@"` (`hooks/bin/actualize:14`). There is no Node implementation. When `bun` is absent the shim prints one stderr line and exits `0` for `hook` (fail open, so a missing runtime never bricks a client) and `127` for everything else (`hooks/bin/actualize:8-13`, asserted at `tests/cockpit/hooks-bun.test.ts:109-118`).

The engine and everything under `hooks/src/lib/` import only `node:` modules, because OpenCode and Pi/Prime run the engine in-process inside their own runtimes. Bun-specific code is confined to the CLI (`Bun.stdin.text()`, `Bun.sleep`, `process.exit`, `cli.mjs:46-50,210-213`) and the cockpit; the one other Bun reference is a guarded feature check, `IS_COMPILED` (`store.mjs:9`). `hooks/src`, `hooks/adapters`, `hooks/install.mjs`, and `hooks/clients` carry no third-party import at all.

> `docs/hooks.md:72` ("there is no Node implementation") is correct. `docs/hooks.md:4` ("no dependencies beyond Node") is not: the import graph supports "no third-party dependencies" but not "Node", the runtime is Bun, and `package.json:18-26` carries dependencies for the cockpit and web UI.

### The run state machine

Phases run `idle → select → lens runs → reconcile → gate → done`. Only lenses in `state.selection` may start; a lens whose `needs` are neither completed nor declared `--satisfied` refuses to start; an excluded lens cannot run at all (`process.mjs:177-189`; `tests/hooks/replay.test.mjs:53-57`). `select` records `--lenses`, `--satisfied`, and repeatable `--exclude lens="reason"` (reasons must be 12+ characters), computes dependency waves, and requires `release-readiness` plus at least one `recon-*` lens (`process.mjs:146-167`).

`begin` takes `--goal` (minimum 8 characters), `--bar demo|beta|release`, `--dir`, `--lenient` (sets `strict:false`), and `--force` (`process.mjs:132-144`). `lens start` **prints the full `SKILL.md` body**; that print is the progressive-disclosure mechanism, and the hook blocks any other way of loading it (`process.mjs:203`, `cli.mjs:136`, `engine.mjs:168-172`).

CLI exit codes: `ProcessError` → 1, unknown command → 2, any other throw → 70 (`cli.mjs:210-213`).

### The deny rules

Each is trigger → required condition → refusal.

| Trigger | Allowed only when | Refusal |
|---|---|---|
| write to `product-model.md` | `state.phase === "reconcile"` | "edited only inside a reconciliation" (`engine.mjs:138-140`); out-of-band tampering is also *detected* by `postTool` and raises the `model-tampered` gate blocker (`engine.mjs:208-210`, `process.mjs:68`, `replay.test.mjs:98-106`) |
| write to `proposals.md` | a lens is running, or a reconciliation is open | "changes only during a lens run … or a reconciliation" (`engine.mjs:141-143`) |
| write under `artifacts/` or `evidence/` | that lens is in `state.activeLenses`, and no reconciliation is open | `lens "<name>" is not running` (`engine.mjs:144-147`). Nesting is free: `evidence/recon-physical/hardware/components/tof/profile.yaml` passes (`physical.test.mjs:72`) |
| artifact content | valid `built_from`, `reads`, `cites`; cited claims exist; version current | a nonexistent claim (`C99`) is refused ("not in the claims ledger"); a stale `built_from` names the actual version — `built_from model@2 but the model is at version 5` (`md.mjs:193-197`, `physical.test.mjs:98-99`) |
| `public: true` artifact | every cited claim is OBSERVED or VERIFIED | "public artifact cites C23 graded REPORTED" (`md.mjs:9,198`, `physical.test.mjs:139-143`) |
| write to a product file (strict mode) | a lens run is active, or the first path segment is dot-prefixed | "product files change only inside a lens run" (`engine.mjs:149-153`) |
| read of `skills/<lens>/SKILL.md` or `references/` | the lens is running | "lens bodies load only through `actualize lens start <name>`" (`engine.mjs:168-172`) |
| write to `state.json`, `.state/`, `.log.jsonl`, `inbox.jsonl`, `.cockpit/`, `history/` | never (CLI-managed) | "managed by the process CLI" (`engine.mjs:137`, `store.mjs:126-127`); `hooks-bun.test.ts:100-107` asserts denial of `inbox.jsonl`, `.cockpit/cockpit.db`, `.cockpit/agent.token`, `.cockpit/context.json` |
| anything else under `actualize/` | never | `run-other`: "only product-model.md, proposals.md, artifacts/<lens>/, and evidence/<lens>/ exist under actualize/" (`engine.mjs:148`) |
| flashing/erasing shell command | a physical lens (`electronics`, `embedded-systems`, `robotics`) is running **and** `evidence/<lens>/actions.md` records `target`, `expected result`, and `recovery` | otherwise "first record the preflight" (`engine.mjs:95-106`, `physical.test.mjs:114-120`) |
| irreversible hardware command | never by the agent | denied even with a preflight recorded; the message tells the agent to `pause --reason` and have the owner run it (`engine.mjs:96`, `physical.test.mjs:121`) |
| read-only hardware command | always | never blocked — `picotool info -a` returns `null` (`physical.test.mjs:66`) |

The preflight regexes cover `esptool`/`espefuse`, `idf.py`, `picotool`, `dfu-util`, `avrdude`, `west flash`, `nrfjprog`, `STM32_Programmer_CLI`, `openocd`, `pio`/`platformio` upload targets, `arduino-cli upload`, and `mpremote cp`; the irreversible set covers fuse burn, secure boot, flash encryption, OTP, and full-chip erase of a locked part (`engine.mjs:73-93`).

A rejection with a lazy reason ("not needed") is refused at `reconcile done`: `WEAK_REASONS` plus a 20-character floor (`md.mjs:135,146`, `replay.test.mjs:153-162`).

### Stop gate

`computeGate` returns `{ blockers, ready }`, each blocker carrying a `fix` string with a `$CLI` placeholder (`process.mjs:54-90`). `stopGate` exits 2 with up to eight blockers and a `pause` hint; after `MAX_STOP_BLOCKS = 4` consecutive identical blocker signatures it stops blocking and escalates once (`engine.mjs:10,242-261`). `lens start`, `lens done`, `reconcile start`, and `reconcile done` reset `stopBlocks` (`process.mjs:200,232,269,330`). When the gate passes, `finish` closes the run and returns the verdict and owner (`process.mjs:337-348`).

`pause --reason "<q>"` writes `state.paused`; the next `prompt` event deletes it (`cli.mjs:189-197`, `engine.mjs:26`). `gate [--json]` inspects an end state and exits 0 or 1 (`cli.mjs:176-181`).

### Adapters

| client | mechanism | project scope | user scope | hard block? |
|---|---|---|---|---|
| Claude Code | `settings.json` hooks | `.claude/settings.json` | `~/.claude/settings.json` | yes — `permissionDecision:"deny"`, Stop exits 2 |
| Codex | `hooks.json` | `.codex/hooks.json` | `~/.codex/hooks.json` | yes — same payload shape and output |
| Cline | executable hook scripts | `.clinerules/hooks/` | `~/.cline/hooks/` | no task veto; `PreToolUse` returns `{cancel:true}`, `{}` when quiet |
| OpenCode | plugin | `.opencode/plugins/actualize.js` | `~/.config/opencode/plugins/` | no; sends blockers back as a follow-up prompt on `session.idle` |
| Pi / Prime Agent | extension | `.prime/agent/extensions/actualize.ts` | `~/.prime/agent/extensions/` | no; `pi.sendUserMessage(..., {deliverAs:"followUp"})` |

`pi`, `prime`, and `prime-agent` are aliases of one adapter (`prime.mjs:9`). Pre-tool deny rules and context injection apply in all five; only blocking strength differs. Codex asks you to trust new hooks on first use: run `codex`, then `/hooks` (`codex.mjs:17`). OpenCode and Prime install a thin wrapper that re-exports the in-repo file by absolute path, so repo edits apply immediately (`opencode.mjs:13`, `prime.mjs:12`).

### Installer

`bun hooks/install.mjs [--scope project|user] [--project <dir>] [--client claude|codex|cline|opencode|pi|prime|all] [--dry-run|--status|--uninstall|--force]`. `runtimeProblem()` refuses to install when Bun is missing, too old, or absent from PATH, so a client-launched hook can actually start (`install.mjs:26-34,55-57`). Merging is idempotent, backs up any file it writes, strips only commands matching `OWNED_CMD`, and leaves an unmanaged file at a target path alone unless `--force` (`common.mjs:11,52-82`; `cline.mjs:37`). `--status` exits 1 on drift (`install.mjs:67`).

`--scope user` is safe globally because with no run directory at or above cwd the engine returns `null` for every event (`engine.mjs:17-18`); the one exception is the intent hint, which fires only on a prompt matching `INTENT` and only suggests `begin` (`engine.mjs:35-38`).

## State

Everything lives under `actualize/` (`store.mjs:42-57`): `state.json`, `product-model.md`, `proposals.md`, `artifacts/`, `evidence/`, `history/`, hidden `.state/`, `.log.jsonl` (append-only JSONL event log, swallowed on failure so logging can never break a hook, `store.mjs:92-96`), `inbox.jsonl`, `.cockpit/`.

`state.json` is created by `newState` (`store.mjs:82-90`) with keys `version`, `active`, `goal`, `bar`, `strict`, `phase`, `selection`, `selectionLogged`, `activeLenses`, `completed`, `unreconciled`, `reconcile`, `modelVersion`, `modelHash`, `stopBlocks`, `lastBlockSig`, `startedAt`; `pause` adds `paused`, and `finish` adds `finishedAt`/`verdict`/`owner`. Never hand-edit it.

- `reconcile start` snapshots the model and proposals to `.state/model.base.md` and `.state/proposals.base.md`, and seeds `history/model-v<N>.md` if absent (`process.mjs:240-273`).
- `reconcile done` validates, enforces exactly one version bump with `touched` coverage, writes `history/model-v<N>.md`, updates `modelVersion`/`modelHash`, clears `unreconciled` and `stopBlocks`, and returns the newly stale artifacts (`process.mjs:275-335`).
- `lens done` increments `completed[name]` and appends the lens to `unreconciled` only if it added proposals (`process.mjs:229-235`).
- `model restore` reverts `product-model.md` from `history/model-v<modelVersion>.md` and refuses during a reconciliation (`process.mjs:350-358`).

## Lifecycle

1. `begin` creates the directory tree and `state.json` (`phase: "idle"`, `modelVersion: 0`).
2. Session start and every prompt inject a status block: run header, `Next:`, open blockers, unhandled inbox entries, and the cockpit line when connected (`engine.mjs:40-57`).
3. `select` closes the lens set with reasons and waves.
4. Each `lens start` opens the write scope for that lens and prints its body; `lens done` diffs its output against the pre-run hashes and refuses a no-op without `--no-output "<reason>"` (10+ characters) (`process.mjs:216-228`).
5. `reconcile start` / `done` is the only window for the model.
6. `release-readiness` runs last, requires every other selected lens completed, no unreconciled output, no stale artifacts, and no open proposals, and its `gate.md` must be built from the current model version (`process.mjs:190-198`).
7. Stop passes → `finish` sets `active: false` and the verdict; the engine then returns `null` for everything, including prompts (`engine.mjs:20`, `process.mjs:337-348`).

## Failure modes

**Runtime.** Missing Bun: the hook silently does nothing (one stderr line, exit 0), and non-hook commands exit 127 (`hooks/bin/actualize:8-13`). A hook that throws fails open and returns 0, printing the stack only under `ACTUALIZE_DEBUG` (`cli.mjs:64-67`). Unreadable `state.json` returns `null` from `loadState`, which makes hooks go silent rather than deny (`store.mjs:72-76`).

**Silent no-op.** No `actualize/state.json` at or above cwd, or `ACTUALIZE_DIR` pointing elsewhere. A finished run also goes silent by design (`engine.mjs:20`).

**Malformed content is refused, not fixed.** Artifact, proposal, and model validation errors surface as denials at write time and as feedback after; nothing is auto-corrected.

**Stdin that never closes.** Some clients leave stdin open, so `readStdin` races `Bun.stdin.text()` against a 1500 ms idle timer (`ACTUALIZE_STDIN_IDLE_MS`, `cli.mjs:46-50`).

**Loop escalation.** An agent that retries the same blocked stop gets four blocks, then one escalation notice and an allowed stop (`engine.mjs:252-257`).

**A physical refusal that cannot be satisfied.** An irreversible command is denied unconditionally; the only path is `pause` and owner execution.

**Not test-covered — do not over-trust these paths.** The suite is `tests/hooks/replay.test.mjs` (Loam), `tests/hooks/physical.test.mjs` (Mote), and `tests/cockpit/hooks-bun.test.ts`. Untested or only indirectly exercised: every `--lenient` relaxation (`strict:false` gates product-file writes, lens-body reads, and hardware commands; no test sets it); the CLI `model restore` path (the replay test calls `P.restoreModel` directly, `replay.test.mjs:104`); CLI `pause` (the test writes `state.paused` straight to disk, `replay.test.mjs:206`); the `inbox` gate blocker (`process.mjs:78`); write denial for `.log.jsonl` and `.state/` specifically, and the append-only `history/` rule beyond the `rm -rf actualize/history` case (`replay.test.mjs:36`); `actualize done` through `finish()` (the replays reach completion via `stop`); installer `--uninstall`, `--dry-run`, and `--force`; and the `run-other` denial.

## Extension points

- **A client adapter.** Add `hooks/adapters/<name>.mjs` exporting `id`, `aliases`, and `status`/`apply`/`remove` (the JSON pair reuses `common.mjs` `mergeJsonHooks`/`jsonHooksStatus`/`removeJsonHooks`), then add it to `ADAPTERS` in `hooks/install.mjs:13`. If the host runs the engine in-process, add `hooks/clients/<name>/` and re-export it from a wrapper; `resolveAdapters` (`install.mjs:18-23`) and `--client all` pick it up automatically.
- **A deny rule.** Add a `case` to the zone switch in `engine.mjs preTool`, or a new regex beside `FLASH`/`IRREVERSIBLE` (`engine.mjs:73-93`) for command-level classification. Rules are pure functions of paths, so they are testable through `tests/hooks/helpers.mjs` without a client.
- **A gate blocker.** Add an `add(code, text, fix)` call in `computeGate` (`process.mjs:54-90`); it automatically reaches the status block, the stop gate, `gate --json`, and `nextAction`.
- **A cockpit command.** `cli.mjs:92-97` delegates `cockpit`, `ui`, and `inbox` to `cockpit/cli.ts` by dynamic import; the hook subsystem has no other coupling to the cockpit.

Tests that must pass: `tests/hooks/replay.test.mjs`, `tests/hooks/physical.test.mjs`, `tests/cockpit/hooks-bun.test.ts`, plus `python3 tests/check.py`.

### Source trail

- Engine: `hooks/src/engine.mjs:1-2,10-12,16-33,35-38,40-57,60-68,72-106,108-176,183-203,206-239,242-262`.
- Normalization: `hooks/src/normalize.mjs:1-12,25-31,33-54,58-81,84-108`.
- State machine and gate: `hooks/src/process.mjs:13-19,54-90,92-107,109-129,132-167,169-175,177-204,206-236,240-273,275-335,337-348,350-358,360-369`.
- Store: `hooks/src/lib/store.mjs:9-20,25-57,59-70,72-96,103-131`.
- Markdown rules: `hooks/src/lib/md.mjs:5-10,51-72,81-96,99-114,121-155,158-175,178-210,213-229`.
- Lenses and inbox: `hooks/src/lib/lenses.mjs:9-28,30-32,35-47,50-57`; `hooks/src/lib/inbox.mjs:8-27,29-44,46-50`.
- CLI: `hooks/src/cli.mjs:13-29,46-68,83-112,113-145,146-161,162-207,210-213`.
- Runtime and installer: `hooks/bin/actualize:1-14`; `hooks/install.mjs:13-34,36-68`; `hooks/adapters/common.mjs:8-11,15-28,38-45,52-106`; `claude-code.mjs:7-14`; `codex.mjs:8-17`; `cline.mjs:10-12,29-53`; `opencode.mjs:11-34`; `prime.mjs:9-33`.
- In-process clients: `hooks/clients/opencode/actualize.js:6-39`; `hooks/clients/prime/actualize.ts:8-42`.
- Evidence: `tests/hooks/replay.test.mjs:16-41,43-57,98-106,128-141,143-162,199-211`; `tests/hooks/physical.test.mjs:50-67,69-102,104-137,139-147,149-164,200-210`; `tests/hooks/helpers.mjs:16-51`; `tests/cockpit/hooks-bun.test.ts:26-50,52-98,100-107,109-118`.
- Prose: `docs/hooks.md:1-16,47-72,74-87`; `package.json:5-9`.
