# How to run a governed actualization

## Goal

Drive one product from an ungoverned pile of inputs to a `go` / `no-go` / `defer` / `go-with-exception` verdict
using the process CLI, with every write gated. This page is the sequence and the refusals you will hit. It does
not repeat the command tables — see [`reference/cli.md`](../reference/cli.md) for every flag, default, and exit
code, and [`workflows/a-full-run.md`](../workflows/a-full-run.md) for the narrative of a full run. The values below
come from the Loam replay in `tests/walkthrough/`.

## Prerequisites

- Bun >= 1.4 on `PATH` (`package.json:5-7`). Without it, `actualize` exits 127 for anything but a hook.
- A coding agent that can read files, with `skills/` and `product-model/` reachable (see
  [getting-started.md](../getting-started.md) §1).
- Hooks installed, or you are running the CLI by hand: `bun hooks/install.mjs --scope project --project <dir>`
  ([hooks.md](../hooks.md)).
- Your product's files and a goal with a launch bar. Bars are `demo`, `beta`, `release`; the bar decides how
  strict the gate is.

## Procedure

Replace `hooks/bin/actualize` with `$CLI` below; it is `bun <abs>/hooks/src/cli.mjs` in a source checkout.

1. **Open the run.** `$CLI begin --goal "<one line: what 'launchable' means here>" --bar beta`. Creates
   `actualize/` with `artifacts/`, `evidence/`, `history/`, `.state/`, the `proposals.md` header, and
   `state.json` (`process.mjs:132-144`). A goal under 8 characters or a bar outside the three is refused.
2. **Classify the evidence and log the goal.** List every input by kind, state the bar, and record it as a
   decision in the first reconciliation. Loam: code, image, document, no CAD, no media
   (`TRANSCRIPT.md:12-19`).
3. **List lenses, metadata only.** `$CLI lenses` prints every lens's description, `reads`, `needs`,
   `executes_with`. No bodies are loaded (`cli.mjs:116`).
4. **Record the selection.** `$CLI select --lenses a,b,c --exclude lens="specific reason" …`. `release-readiness`
   must be selected, at least one `recon-*` must run before the model exists, every unselected lens needs an
   exclusion whose reason is 12+ characters and specific, and every `needs` must be selected or declared
   `--satisfied` (`process.mjs:146-167`). The command prints the dependency waves it computed; that ordering is
   the state machine's decision, not yours.
5. **Per wave, per lens: `lens start` → work → `lens done`.** `$CLI lens start <name>` is the *only* way a lens
   body enters context — it prints the whole `SKILL.md` (`cli.mjs:136`); a direct read of the file is denied
   (`engine.mjs:168-172`). It also opens the write scope: only `artifacts/<lens>/`, only `evidence/<lens>/`, and
   appending open rows to `proposals.md` (`engine.mjs:144-147`). Lenses inside one wave have no `needs` between
   them and independent scopes, so they may run in parallel. `$CLI lens done <name>` re-validates the new rows and
   artifacts against the current model and refuses if nothing changed, unless you pass
   `--no-output "<reason>"` (10+ chars) (`process.mjs:206-236`).
6. **After each wave: `reconcile start` → edit → `reconcile done`.** `reconcile start` is the only window in
   which `product-model.md` may be written; it snapshots the base and seeds the model from `TEMPLATE.md` on the
   first pass (`process.mjs:240-273`). Inside the window, accept (decision row + `accepted:D<n>`) or reject
   (status `rejected` plus a specific reason) every open row. `reconcile done` validates against SCHEMA, requires
   `touched` to cover everything that changed, requires `model_version === base + 1` if anything changed, writes
   `history/model-v<N>.md`, and prints the stale artifacts and the lenses to re-run (`process.mjs:275-335`).
7. **Build artifacts after reconciliation, not before, for any lens that defines model fields.** A lens whose
   artifact cites what it proposed (brand, direction, the physical lenses) would otherwise stamp the
   pre-acceptance version and arrive stale. Loam's brand and provenance-licensing lenses proposed, reconciled to
   v2, *then* built `identity.md` and `ledger.md` stamped `model@2` (`TRANSCRIPT.md:108-109`). This is the one
   ordering rule that is not derivable from the CLI's own output.
8. **Rebuild stale work.** For each artifact, compare `built_from`, `reads`, and `cites` against the decision log
   (SCHEMA "Versions and staleness"). Staleness is per field key and per claim id: a decision touching only
   `unknowns` does not stale an artifact that does not read `unknowns` (`md.mjs:213-229`). Re-run only the owning
   lenses that went stale, then rebuild.
9. **Verify last.** `$CLI lens start release-readiness`. It refuses while any other selected lens has not run,
   while anything is unreconciled, while open proposals remain, or while stale artifacts exist
   (`process.mjs:190-198`) — e.g. `rebuild stale artifacts before verifying: marketing`. It writes
   `artifacts/release-readiness/gate.md` with `verdict:` and `owner:`; `verdict: maybe` is refused
   (`md.mjs:205-208`).
10. **Close.** `$CLI gate` returns 0 when ready and 1 when blocked — its exit code is the answer
    (`cli.mjs:180`). `$CLI done` then marks the run finished and prints the verdict
    (`process.mjs:337-348`).

The loop is: reconcile → rebuild → verify → back to reconcile with whatever the gate proposed. Stop when the
gate passes the bar from step 2, or report the blockers and the unknowns that cause them. A no-go or a `defer` is
a real outcome, not a failure to route around.

## Implementation locations

| concern | file |
|---|---|
| Phase names and the six-step order | `skills/actualize-product/SKILL.md:9-14` |
| Model contract every artifact is validated against | `product-model/SCHEMA.md` (staleness at `:66-75`) |
| State machine: `begin`, `select`, `lensStart`, `lensDone`, `reconcileStart`, `reconcileDone`, `computeGate`, `finish` | `hooks/src/process.mjs` |
| Write zones, lens write scope, lens-body read denial, artifact validation | `hooks/src/engine.mjs:133-172` |
| Artifact stamp parsing, public-grade floor, staleness | `hooks/src/lib/md.mjs:166-229` |
| Dependency waves from `needs` | `hooks/src/lib/lenses.mjs:35-47` |
| Command parsing, exit codes, `$CLI` expansion | `hooks/src/cli.mjs` |
| Run discovery (`ACTUALIZE_DIR`, then nearest `actualize/state.json`) | `hooks/src/lib/store.mjs:25-40` |
| Worked values for every step above | `tests/walkthrough/`, `tests/hooks/replay.test.mjs` |

## Validation

Check the run:

```
$CLI status            # phase, model version, unreconciled lenses, next action
$CLI gate --json       # { ready, blockers: [{ code, text, fix }] }; exit 1 when blocked
$CLI validate          # the model against SCHEMA
```

Check this repository's own rules: `python3 tests/check.py` (lens sizes and structure, the fixture model against
the schema, artifact staleness, the no-Node rule) and `bun test` (replays both walkthroughs through the engine).
Two checkers, two jobs; neither reads the substance of lens prose (`docs/architecture.md:17-19`).

## Common failure symptoms

Every message in the first column is the engine's own text, cited to its source line.

| what you see | cause | fix |
|---|---|---|
| `product-model.md is edited only inside a reconciliation (only the orchestrator edits the model). Put the change in proposals.md during a lens run` | a lens or the agent wrote the model directly | `… model restore`, then record it as a proposal row |
| `product-model.md changed outside a reconciliation. Revert it (… model restore)` | a change landed outside the window | `… model restore`; the gate also carries a `model-tampered` blocker until the hash matches |
| `<lens> is not in the selection (<lenses>); change it with select and a logged reason` | starting an unselected lens | re-run `… select` with it added, or record an `--exclude` reason |
| `<lens> cannot start before the model exists; run the recon lenses and reconcile first` | a non-recon lens in wave 1 | run the recon lenses, then `… reconcile start` / `done` |
| `<lens> needs <dep>, which has not run` | a `needs` edge is unmet | run the dependency, or declare it `--satisfied` if the model already answers it |
| `<lens> needs <dep>'s output, which is not in the model yet: … reconcile start` | the dependency ran but was not reconciled | `… reconcile start` |
| `<path>: lens "<lens>" is not running (running: …). A lens writes only its own artifacts/<lens>/ and evidence/<lens>/` | a write outside the owning lens's scope, nested dirs included | start the owning lens, or write only under the lens that is running |
| `built_from model@2 but the model is at version 5` | the artifact was stamped at an older version | re-run the owning lens and restamp at the current version |
| `cites C99, which is not in the claims ledger at model@5` | the claim id does not exist at the current model | correct the id, or add the claim in a reconciliation |
| `public artifact cites C7 graded REPORTED; only OBSERVED or VERIFIED may be public` | a public artifact cites a weak claim | drop the citation, or raise the grade with new evidence |
| `<file> is stale (decision D10 touched what it reads/cites)` | a later decision touched a field it reads or a claim it cites | `… lens start <owner>`, rebuild, `… lens done <owner>` |
| `rebuild stale artifacts before verifying: marketing` | the gate lens was started with stale artifacts | rebuild the named lenses first |
| `release-readiness runs last; still to run: …` | the gate lens started early | finish the named lenses |
| `state-changing hardware action: first record the preflight (…) in evidence/<lens>/actions.md` | a flash/erase command with no preflight record | write the preflight block, then re-run the command |
| `irreversible hardware change (fuses, secure boot, flash encryption, OTP, full-chip erase of a locked part)` | a fuse burn or lock step | `… pause --reason "<the confirmation needed>"`; the owner runs it |
| `flashing or erasing a device … happens inside a physical lens run` | a flash command outside a physical lens | `… lens start embedded-systems` or the right physical lens |
| `lens bodies load only through \`… lens start <lens>\` (progressive disclosure)` | reading a lens body directly | `… lens start <lens>` |
| `Gate was built from model@4; the model is at version 5` | the gate artifact itself is stale | re-run `release-readiness` |
| `<N> owner response(s) not yet handled: …` | the cockpit inbox has unrouted entries | `… inbox`, route each, `… inbox ack <id> --as "…"` |

## Recovery and rollback

- **`… gate --json`** is the first thing to run when anything is blocked. Each blocker is
  `{ code, text, fix }` and `fix` carries the next command with `$CLI` already resolved
  (`process.mjs:54-90`). Exit 1 means blocked; that is a normal state, not an error.
- **`… model restore`** reverts `product-model.md` from `history/model-v<state.modelVersion>.md` and refuses
  while a reconciliation is open, because the right place to make the change is inside the window
  (`process.mjs:350-353`). Use it for tampering, not for "the model is wrong" — a wrong model is fixed by a
  proposal plus a reconciliation, which is recorded rather than erased.
- **`… pause --reason "<the question only the user can answer>"`** lets the next stop through and clears on the
  user's next message (`cli.mjs:189-197`). Use it when the agent is genuinely blocked on a judgement no evidence
  can answer, or when an irreversible hardware action needs the owner's confirmation. It records the question;
  it does not exempt the run from a gate blocker.
- **`… begin --force`** restarts over an existing or finished run (`process.mjs:137-138`). Reach for it only when
  the model rests on a premise that turned out to be wrong and the snapshots are not worth salvaging: it
  discards that directory's state and history.
- **Rebuild rather than start over** in the ordinary case. Staleness is per-claim, not global: Loam's D9 touched
  only `unknowns` and staled nothing (`TRANSCRIPT.md:68-69`), while D10 touched `claims:C4+C14` and staled
  exactly `beta-page.md` (`:88-95`).
- **Inbox entries do not clear themselves.** An owner answer must be routed through proposals and the next
  reconciliation, then `… inbox ack <id> --as "<who>"`; until then the `inbox` blocker persists
  (`process.mjs:77-78`).
- **A blocked agent is not a broken run.** Before any of the above, `… status` prints the next action the state
  machine expects (`process.mjs:92-107`), which is usually the whole answer.

### Source trail

- Router order and enforced rules: `skills/actualize-product/SKILL.md:9-14,17-22`.
- Commands, flags, exit codes: `docs/reference/cli.md:14-55`; implementation `hooks/src/cli.mjs:99-211`.
- `begin`, `select`, `lensStart`, `lensDone`: `hooks/src/process.mjs:132-236`.
- `reconcileStart` / `reconcileDone` / `restoreModel` / `finish` / `nextAction`: `hooks/src/process.mjs:240-369`.
- Gate blocker codes, texts, fixes: `hooks/src/process.mjs:54-90`.
- Write zones and refusals: `hooks/src/engine.mjs:133-172`; lens-body denial `:168-172`; model-tamper feedback `:208-210`.
- Artifact rules: `hooks/src/lib/md.mjs:166-229` (version `:193`, missing cite `:197`, public grade `:198`, inline/cites `:200-203`, gate verdict `:205-208`).
- Waves from `needs`: `hooks/src/lib/lenses.mjs:35-47`.
- Physical denial messages: `hooks/src/engine.mjs:70-108`.
- Loam values: `tests/walkthrough/TRANSCRIPT.md:10-19,31-46,68-69,88-95,99-111`; `tests/hooks/replay.test.mjs:31-56,98-112,128-151,157-189`.
- Narrative version of the same run: `docs/workflows/a-full-run.md:1-120`.
a real outcome, not a failure to route around.
