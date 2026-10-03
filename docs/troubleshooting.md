# Troubleshooting

Symptoms grouped by the thing that is failing. Every quoted message is the tool's own text, cited to its source.
Command tables live in [`reference/cli.md`](reference/cli.md); the cockpit error codes are listed in
[`reference/cockpit-protocol.md`](reference/cockpit-protocol.md).

## Hooks

| symptom | likely cause | what to check | fix |
|---|---|---|---|
| Hook silently does nothing, and the client injects no actualize context | there is no run: `findRun` returns `null` when `ACTUALIZE_DIR` is unset and no `actualize/state.json` exists at or above the working directory (`store.mjs:25-40`), and `handle` then returns `null` for every event | `ls actualize/state.json` from the working directory, then upward | `actualize begin --goal "…" --bar beta`, or point the client at the run with `ACTUALIZE_DIR` |
| Hooks installed but nothing happens, and stderr says `actualize: Bun >= 1.4 is required and was not found on PATH (https://bun.sh). Hooks are inactive until it is installed.` | the client was launched with a PATH that has no `bun` | `command -v bun`; `bun hooks/install.mjs --status` prints "bun is not on PATH, so client-launched hooks cannot start it" (`install.mjs:32`) | install Bun, or use the compiled executable (`bun run build` → install from `dist/bin/actualize`, which needs no Bun on the target). Deliberate fail-open (`bin/actualize:9`): exit 0, one stderr line, so a missing runtime never bricks the client. Exit 127 on `status` is the same condition for a non-hook command (`bin/actualize:11-12`; `tests/cockpit/hooks-bun.test.ts`) |
| `bun hooks/install.mjs` exits 2 with `install: Product Actualizer runs on Bun >= 1.4` | the installer was run under Node, or under a Bun older than 1.4 | `bun --version` | run it as `bun hooks/install.mjs …` |
| A write is denied: `<path> is managed by the process CLI and cannot be edited directly.` | the agent edited `state.json` or something in `history/` | `engine.mjs:137` | use the CLI; those files are not hand-editable |
| `<path>: product files change only inside a lens run …` | a product file changed between lenses or during a reconciliation with no lens running | `engine.mjs:151`; strict mode is the default, `--lenient` relaxes it (`cli.mjs:100`) | start the lens that owns the work |
| `<lens> is not in the selection (…)` | starting an unselected lens | `process.mjs:181` | re-run `select` with it added, or record an `--exclude <lens>="reason"` |
| `<lens> needs <dep>, which has not run` | a `needs` edge is unmet | `process.mjs:187` | run the dependency, or `--satisfied <dep>` if the model already answers it |
## The cockpit

The cockpit is optional; nothing below is a reason to change how you run the product (`AGENTS.md:13`).

| symptom | likely cause | what to check | fix |
|---|---|---|---|
| `actualize cockpit status` prints `cockpit is down` | no server, or a `server.json` whose pid is gone (`cockpit/cli.ts:16-22`) | `actualize cockpit status`; `.cockpit/server.log` if `up` failed | nothing is lost. `cockpit up` when you want it; `cockpit down` leaves the run, model, and inbox untouched and keeps the workspace |
| An action returns `AUTHORITY_HUMAN` | the agent token attempted one of the four `AUTHORITY_OPS` — `human.answer`, `human.rule`, `human.confirm`, `human.annotate` (`protocol/actions.ts:63`) | `authority.test.ts`: "an agent cannot answer, rule, confirm, or annotate as the owner, over any transport" | ask the owner; the agent raises it with `actualize ui ask` and reads the answer from `actualize ui responses` |
| `AUTHORITY_SYSTEM` | the agent tried to remove, hide, or overwrite the process rail or `system.*` state | `authority.test.ts`: "the agent cannot remove, cover, or address the process rail" | put the content in a surface; the rail is not composable |
| `AUTHORITY_LAYOUT` — "the owner placed X; the agent may change its content, not its position" | the owner moved that surface | `workspace.ts:273` | open a new surface beside it |
| `AUTHORITY_PINNED` | the owner pinned that surface | `workspace.ts:252,274,285` | leave it, or ask them to unpin it |
| `CLUTTER_CAP` — "8 surfaces are open and every one is pinned or waiting on an answer" | the surface cap, and no unpinned idle surface could be closed | `workspace.ts:208` | close or withdraw one, or withdraw your own open `ask` |
| `BAD_REF` | a `ref` names an entity not in this run (e.g. `claim:C9999`) | `issues[].path` names the block and id (`authority.test.ts`: "bad refs and bad sources name the failing path") | fix the ref; `actualize ui list claims` shows the ids that exist |
| `BAD_SOURCE` | the source resolves to nothing (`file:evidence/nope.md#table1`) or is outside the grammar | same test; grammar at `protocol/spec.ts:16-22` | point at a real file under `artifacts/`, `evidence/`, or `history/` |
| `SCHEMA` with `issues` | the surface does not match the vocabulary; `.strict()` makes an unknown key an error | `issues[].path`; `actualize ui catalog [block]` lists every block with a valid example | fix the named path against `protocol/catalog.ts` |
| The cockpit shows stale or missing content | the projection rows are disposable and not the truth (`cockpit/server/db.ts`) | compare with `actualize/product-model.md` | `actualize cockpit rebuild` replays the run directory; `cockpit reset` deletes the DB, including your work requests, bindings, and reviews, and the next start rebuilds the projection |
| The cockpit served a run file as active content | should be impossible: run files are served `text/plain` or a known image type with `nosniff` and a sandboxing CSP, and non-loopback `Host` is 403 | `authority.test.ts`: "run files are served as text or known images, never as active content" | report as a defect against `serve.ts:74`; `/api/file` 404s `state.json`, `inbox.jsonl`, any `..` path, and `.cockpit/agent.token` |
| The gate is blocked although the owner answered | inbox entries must be routed by the router before they stop blocking | `actualize inbox` lists what is waiting and prints the routing instruction | route each entry, then `actualize inbox ack <id> --as "<where it went>"`; an `--as` too thin to be a destination is refused |

## The Product Model

| symptom | likely cause | what to check | fix |
|---|---|---|---|
| `product-model.md changed outside a reconciliation`, or a `model-tampered` blocker | the file was edited between lenses; the hash no longer matches `state.modelHash` (`engine.mjs:208-210`, `process.mjs:68`) | `$CLI status`; the blocker's `fix` line | `actualize model restore` (refuses while a reconciliation is open, `process.mjs:351`), then record the change as a proposal row |
| `Model fails SCHEMA checks: …` | the model does not validate: section order, duplicate or unsourced claim, an `INFERRED` with a missing parent, non-consecutive decisions, a version above `model_version` | `$CLI validate`; checklist at `SCHEMA.md:77-88` | fix it inside `reconcile start` / `reconcile done` — the only window |
| `built_from model@2 but the model is at version 5` | the artifact was stamped before the last reconciliation | `md.mjs:193` | `actualize lens start <owner>`, rebuild, `lens done` |
| `cites C99, which is not in the claims ledger at model@5` | the claim id does not exist at the version the artifact names | `md.mjs:197`; `actualize ui list claims` | correct the id, or add the claim in a reconciliation |
| `public artifact cites C7 graded REPORTED; only OBSERVED or VERIFIED may be public` | the public-citation floor (`SCHEMA.md:49`) | `md.mjs:198` | drop the claim, raise it with new evidence, or make the artifact internal |
| `reads: "x" is outside this lens's declared reads` | it used a model field its lens frontmatter does not list | `md.mjs:192`; `AGENTS.md:9` | narrow the artifact's `reads`, or extend the lens frontmatter deliberately |
| `inline [C4] is not listed in cites` / `cites lists C4 but the text never cites [C4] inline` | the two lists must agree | `md.mjs:200-203` | make the stamp and the inline citations identical |
| `gate needs \`verdict:\` one of go, no-go, defer, go-with-exception`, or missing `owner:` | the gate artifact's front matter | `md.mjs:205-208`; `tests/hooks/replay.test.mjs:187` | set both. `verdict: maybe` is not a verdict |
## The repository checks

`python3 tests/check.py` validates the shape of this repository, not the substance of any lens. It prints one
error per line; report the exact line.

| symptom | likely cause | what to check | fix |
|---|---|---|---|
| `<lens>: N lines, need 60-100` | the lens body is outside its size band | `check.py:63` | move detail into `references/`, linked from the body |
| `<lens>: missing section <name>` | one of the five required sections is absent or renamed | `check.py:72` | restore it under that exact heading |
| `<lens>: frontmatter missing <k>` / `frontmatter name mismatch` | a missing key, or `name` not matching the directory | `check.py:67,69` | fix the front matter |
| `<lens>: unknown reads fields [...]` | a `reads` entry that is not a model field key | `check.py:75`; keys at `SCHEMA.md:22-33` | use the schema's field keys |
| `<lens>: Check has no numbered items` | the Check section is prose, not a numbered list | `check.py:79` | number the checks |
| `references/<x>.md is not linked from SKILL.md` / `SKILL.md links missing references/<x>.md` | a reference file is unlinked, or a link has no file | `check.py:210,215` | link it from the body, or delete the file |
| `references/<x>.md has N lines, max 150` | a reference grew past its bound | `check.py:212` | split it across references |
| `needs cycle at <lens>` | the `needs` graph has a loop | `check.py:88` | break the cycle |
| `electronics must need recon-physical` (or the other two chain edges) | the physical chain is not linear | `check.py:218-224` | restore the edge |
| `robotics: ROS knowledge must be marked as loaded only when ROS is present` | the body stopped qualifying ROS as conditional | `check.py:231` | restore the condition |
| `SCHEMA.md exceeds 120 lines` / `router exceeds 40 lines` / `tool skill is N lines, keep it under 60` | a size limit | `check.py:45,50,60` | cut — these are always-loaded context |
| `<walkthrough>: product-model.md != model-v<N>.md` | the walkthrough's final model was hand-edited | `check.py:510-511` | restore it to the highest snapshot |
| `<artifact>: unstamped` / `inline citations [...] != cites [...]` / `public artifact cites C… graded …` | the fixture drifted from the artifact rules | `check.py:513-535` | restore the stamp, the cites, or the grade |
| `<artifact>: reads [...] beyond what the <lens> lens may read` | the artifact used a field outside the lens's `reads` | `check.py:526-529` | narrow the artifact or widen the lens |
| `negative control '…' was not caught by check_hardware` | a hardware check that can no longer fail | `check.py:554-594` | fix the check, not the fixture |
| `<file>: still invokes Node (…); the runtime is Bun` | a Node invocation survived the migration | `check.py:616-631` | use `bun` |
| `<id> is VERIFIED without a test or owner source` | a grade was raised with nothing that could have failed | `check.py:432-440` | lower the grade, or produce the check |
## Lens selection

| symptom | likely cause | what to check | fix |
|---|---|---|---|
| `actualize lenses` prints nothing | `skillsDir()` resolved to a directory with no lenses — `ACTUALIZE_SKILLS_DIR` is wrong, or the skills are not beside the agent (`lenses.mjs:10,15-17`) | `ls "$ACTUALIZE_SKILLS_DIR"` or `ls skills/` | point it at the skills directory, or open the agent inside this repository (`getting-started.md:11-14`) |
| `release-readiness must always be selected` | the gate lens is not in the list | `process.mjs:151` | add it |
| `select at least one recon-* lens; the model is built from recon output` | no recon lens in the selection | `process.mjs:152` | add the recon lens the evidence calls for |
| `<lens> needs <dep>: select it, or pass --satisfied <dep>` | a `needs` edge is neither selected nor declared satisfied | `process.mjs:160` | select it, or `--satisfied <dep>` with a logged reason |
| `give an exclusion reason for each unselected lens`, or `exclusion reasons must be specific (12+ chars)` | an unselected lens has no `--exclude`, or a reason is under 12 characters or lazy ("no", "not needed") | `process.mjs:156-158` | give every unselected lens a specific reason |
| `select only between lens runs` | a lens is running, or a reconciliation is open | `process.mjs:147` | `lens done`, or `reconcile done`, first |
| `the first reconciliation builds the model from recon output; still to run: …` | a recon lens has not finished | `process.mjs:251` | finish the named recon lenses |
| `P11: rejection needs a specific reason` | a rejection reason of "not needed" | `process.mjs:275-335`; `tests/hooks/replay.test.mjs:157` | write a reason naming what the evidence shows |
| The printed waves do not match the order you wanted | waves are computed from `needs`, not chosen (`lenses.mjs:35-47`) | `$CLI status`, which prints the recorded waves | change `needs` or use `--satisfied`; there is no manual ordering |
| The agent cannot finish and the stop gate blocks | the run is genuinely incomplete | `actualize gate --json`; each blocker is `{ code, text, fix }` with the next command in `fix` (`process.mjs:54-90`) | work the `fix` lines. If it is blocked on a question only you can answer: `actualize pause --reason "<the question>"`, which clears on your next message (`cli.mjs:189-197`) |
| A flash or erase is denied: `state-changing hardware action: first record the preflight (…) in evidence/<lens>/actions.md` | no preflight record | `engine.mjs:99-105`; `tests/hooks/physical.test.mjs:114-121` | write the preflight block, then re-run |
| A flash is denied with `happens inside a physical lens run` | no physical lens is running | `engine.mjs:97` | `actualize lens start embedded-systems` or the right physical lens |
| An irreversible command is denied even with a preflight: `irreversible hardware change (fuses, secure boot, flash encryption, OTP, full-chip erase of a locked part)` | that class always requires the owner's own execution, per action | `engine.mjs:95`; `tests/hooks/physical.test.mjs:121` | `actualize pause --reason "<the confirmation needed>"`; the owner runs it |

### Source trail

- Run discovery and fail-open: `hooks/src/lib/store.mjs:25-40`; `hooks/bin/actualize:8-14`; `hooks/install.mjs:27-34,55-57`; `tests/cockpit/hooks-bun.test.ts`.
- Hook write denials: `hooks/src/engine.mjs:133-172`; model-tamper feedback `:208-210`; cockpit liveness `:60-67`.
- Lens start and selection refusals: `hooks/src/process.mjs:146-167,177-198`; reconciliation `:240-273`; gate blockers `:54-90`.
- Artifact rules: `hooks/src/lib/md.mjs:166-229`; gate verdict `md.mjs:205-208`, `tests/hooks/replay.test.mjs:187`.
- Physical classification: `hooks/src/engine.mjs:70-108`; `product-model/PHYSICAL-PREFLIGHT.md:9-17`; `tests/hooks/physical.test.mjs:65-66,114-122`.
- Cockpit authority and error codes: `cockpit/protocol/actions.ts:62-79`; enforcement `cockpit/server/workspace.ts:208,252,273-285`; tests `tests/cockpit/authority.test.ts:29-49,68-93,95-141,143-200`.
- Cockpit CLI and projection: `cockpit/cli.ts:16-71,86-118`; `cockpit/server/db.ts:1-4`; serving `cockpit/server/serve.ts:45,74`.
- Repository checks: `tests/check.py:43-99,200-244,303-390,432-440,500-535,563-631`.
- Existing troubleshooting text: `docs/hooks.md:82-88`.