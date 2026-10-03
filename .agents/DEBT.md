# Debt

Real residuals that are not affordable or in scope to settle now. Each one names what was seen, the evidence, what it costs to leave, why it is not being settled now, and what would make it reachable. This file is not a to-do list.

Closed in the change after `a837ffd`: an owner's direction with no model row (now shown from the existing annotation, unrouted until the router routes it), payment beyond lens runs (reconciliation spans and owner waits, from the log), and probers other than `gh` (`ACTUALIZE_PROBE`).

Between `fd2cd84` and the Workbench: D1 was corrected (its first mitigation never applied), and D5 and D6 were added.

## D1: a cold full `bun test` run failed once; the first mitigation did nothing, the second is in place

- **Observed:** the first full `bun test` at the start of the outcome-navigation work printed `165 pass / 3 fail / 1 error` on a tree that had passed 168/168. The failing test names were not captured. Every run since has passed.
- **Evidence:** the baseline run on 2026-10-02 at `b1b7c95`, then more than ten clean full runs. While building the Workbench, a test that ran longer than 5 s still failed with `this test timed out after 5000ms` although `bunfig.toml` set `timeout = 30000`: Bun 1.4 ignores that key (a 6 s test failed with the file, and passed with `setDefaultTimeout(30000)` in a preload). So the earlier mitigation never applied.
- **Consequence:** a spurious red build on a cold start if the cause is something other than a timeout.
- **Why not now:** the cause is still unconfirmed. `tests/setup.ts` now raises the default to 30 s through a preload, which is the likeliest casualty (a cold Chrome plus a cold page bundle), but no failure with captured names has been matched to it.
- **Reachable when:** it recurs with the failing test names in the output; then the cause is findable.

## D4: the pattern evidence contract has no outcome data behind it

- **Observed:** a pattern is `supported` at two frozen-criterion experiments in two settings with none contradicting. A claim can demand more (`[contract supporting=3 scopes=2]`) but never less, and each pattern now lists where it was reused (`reusedBy`).
- **Evidence:** `PATTERN_CONTRACT` and `patterns()` in `cockpit/server/learn.ts`.
- **Consequence:** the default may be too weak for a high-stakes domain or too strict for a cheap one; whether a pattern held when reused is recorded but not yet judged.
- **Why not now:** calibration needs patterns that were reused and then confirmed or contradicted. No run has any yet, and a number chosen without them would be a guess presented as a rule.
- **Reachable when:** several patterns have `reusedBy` entries and later evidence for or against them.

## D5: capability presentation is a code table, not lens metadata

- **Observed:** a capability's owner-facing title and category, the observation capabilities a lens leans on, and which implementations claim the same authority live in three small tables in `cockpit/server/capabilities.ts` (`TITLES`, `OBSERVES`, `AUTHORITY`), keyed by lens and implementation name. Everything else about a capability comes from the lens's own frontmatter.
- **Evidence:** a test fails if any shipped lens is uncategorized, so a new lens is caught; `OBSERVES` and `AUTHORITY` are not, and an unlisted lens simply shows no observation hint and no conflict.
- **Consequence:** a lens added or renamed without touching this file shows under its own name as `uncategorized`, and a new overlapping implementation is not warned about. Nothing is shown that is false.
- **Why not now:** the right home is optional `title`, `category`, and `observes` keys in `SKILL.md` frontmatter, which `hooks/src/lib/lenses.mjs` and `tests/check.py` both read. Changing that schema is a change to the process layer, which this work was told not to touch.
- **Reachable when:** the lens frontmatter schema next changes for another reason; then the tables move into it and `check.py` validates them.

## D6: executor profiles and implementation choice have no form in the page

- **Observed:** the owner can bind an implementation (`use agent-browser for fidelity-qa`), declare a budget (`budget waves 45 minutes`), and add an invariant (`invariant waves: ...`) by typing in the Work Terminal. Adding an executor profile (`human.executor`) is a control operation with no terminal phrase or form.
- **Evidence:** `controlOp` in `cockpit/server/core.ts`; `terminal.ts` has phrases for bind, budget, and invariant only.
- **Consequence:** an owner who wants a named executor (a specific model or tool) beyond `current-agent` and `owner` has to send the operation over the socket.
- **Why not now:** the existing `form` block submits through the inbox, which is process authority, and a profile is not that; a terminal grammar for free-form profile fields would be the fragile NLP the design avoids. Nothing in the lifecycle needs a profile yet: a binding that names none uses `current-agent`.
- **Reachable when:** an executor needs more than a name, for instance when the cockpit can learn which agent is connected, or when a cockpit-owned form (not an inbox ask) exists.
