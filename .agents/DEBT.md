# Debt

Real residuals that are not affordable or in scope to settle now. Each one names what was seen, the evidence, what it costs to leave, why it is not being settled now, and what would make it reachable. This file is not a to-do list.

Closed in the change after `a837ffd`: an owner's direction with no model row (now shown from the existing annotation, unrouted until the router routes it), payment beyond lens runs (reconciliation spans and owner waits, from the log), and probers other than `gh` (`ACTUALIZE_PROBE`).

Between `fd2cd84` and the Workbench: D1 was corrected (its first mitigation never applied), and D5 and D6 were added.

## D1: a cold full `bun test` run failed intermittently; cause found in one file and fixed, the original failure is still unmatched

- **Observed:** the first full `bun test` of the outcome-navigation work printed `165 pass / 3 fail / 1 error` on a tree that had passed 168/168; names were not captured. On 2026-10-03, a clean clone at `79484ce` failed 3, then 2, then 0 tests on consecutive full runs.
- **Evidence:** `tests/cockpit/workbench.e2e.test.ts` failed in 2 of 6 isolated runs, a different test each time. The test read a surface's text while its blocks still said `loading…`. An `opened()` helper now waits for the load; the file then passed 8 of 8 runs. Record: `actualize/evidence/recon-software/clean-checkout.txt`.
- **Consequence:** the Workbench e2e file no longer flakes. The earlier unnamed failure may have been the same race or another.
- **Why not now:** no failure with captured names from the earlier run can be matched to this cause.
- **Reachable when:** a full run fails again with names in the output.

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

Added by the self-actualization run (2026-10-03, `docs/validation/self-actualization.md`): D7 to D13. Each is a deficiency the run exposed and did not fix, because none blocks the result.

## D7: the Work Terminal's request grammar is narrow

- **Observed:** `research and establish the market position for ...` was "not understood" and queued nothing (`request:` worked). `verify the public website` queued but named no capability, while `verify the current frontend` classified to fidelity-qa.
- **Evidence:** `actualize/evidence/dogfood/02-request-queued.png`, `08-r2-queued.png`; the ordered rules and keyword hints in `cockpit/server/terminal.ts`.
- **Consequence:** a natural imperative the owner types is refused or left unclassified, so the owner learns the grammar instead of the grammar learning the owner.
- **Why not now:** widening the verb and noun lists is easy, but each addition is a guess presented as a rule unless it is checked against real phrasings, and the design deliberately keeps this rule set small and deterministic.
- **Reachable when:** a sample of real owner phrasings exists (from `interactions`) to choose the words from.

## D8: the Workbench's first view is hard to read, and old surfaces persist

- **Observed:** in ORIENT mode the workflow graph renders as a one-line strip at default zoom. Surfaces opened in an earlier session (`lens audio-sound`, `Open proposals`) were still open in a new run.
- **Evidence:** `actualize/evidence/dogfood/01-show-the-workflow.png`.
- **Consequence:** the first screen of a run is noisy and the key graph is unreadable until zoomed.
- **Why not now:** layout is the owner's by design (the Workbench never moves or closes what the owner placed), so clearing leftovers is a policy decision, and the graph needs a fit-to-content rule.
- **Reachable when:** the next change to workspace persistence decides whether a new run starts clean.

## D9: wave lists put the gate in wave 1

- **Observed:** `actualize select` printed `release-readiness` in wave 1 because it has no `needs`, although `lens start` forces it last.
- **Evidence:** `actualize/evidence/recon-software/select-waves.json`; `hooks/src/lib/lenses.mjs:35`, `hooks/src/process.mjs:190`.
- **Consequence:** the printed waves and the enforced order disagree; the site's waves demo has to explain it.
- **Why not now:** it changes the process layer's output that tests and tools read.
- **Reachable when:** `select` output is next revised.

## D10: the Product Model has no grade for attributed third-party statements

- **Observed:** public copy may cite only OBSERVED or VERIFIED, and prose sources are REPORTED. Quoting a published sentence ("Instructions are not guarantees") needed a workaround (decision D5): grade what the source says as OBSERVED and never state the finding as the product's fact. Reddit pages that refuse automated access can only be REPORTED, so they cannot be quoted at all until someone re-opens them (U13), and no cockpit gesture records that someone did.
- **Evidence:** model decisions D5 and D10, claims C26 to C55.
- **Consequence:** every team that wants a quotation on a public page rediscovers the workaround, and the written confirmation that upgrades a claim to VERIFIED has no home.
- **Why not now:** a new grade or source kind changes the schema, which `check.py`, the hooks and the cockpit all read.
- **Reachable when:** the schema next changes for another reason.

## D11: staleness is coarse for fields every lens reads

- **Observed:** each reconciliation that adds a decision row made every artifact whose lens reads `decisions` stale, though the decision changed nothing it says; rebuilding was a lens start, a stamp bump, and a lens done. This happened after nearly every reconciliation in this run.
- **Evidence:** `actualize/evidence/dogfood/findings.md` F5, F11; staleness rule in `product-model/SCHEMA.md`.
- **Consequence:** rebuild churn grows with run length and trains people to bump stamps without re-reading.
- **Why not now:** the rule is the product's central mechanism and a finer one (ids in `decisions`, as `claims` already has) is a schema change.
- **Reachable when:** the schema next changes; then `touched` could name decision ids a lens cites.

## D12: without the hooks installed, the write-scope rules are not enforced

- **Observed:** the run used the CLI only; editing four artifacts before `lens start` was not stopped, and `lens done` then saw no output.
- **Evidence:** `actualize/evidence/dogfood/findings.md` F12.
- **Consequence:** the process is as strong as the hooks around it; a CLI-only session relies on the agent's discipline.
- **Why not now:** installing hooks into the owner's agent settings is the owner's decision, and this run did not touch them.
- **Reachable when:** the owner installs the hooks (`bun hooks/install.mjs`) and a run is repeated under them.

## D13: the owner boundary is a channel, not a person

- **Observed:** request R1 was accepted through the owner's page by a delegated cofounder agent under the brief's explicit authorization. The cockpit cannot tell a delegate from the owner; it knows only which socket sent the operation.
- **Evidence:** `actualize/evidence/dogfood/04-accepted.png`, `R1-history.json`.
- **Consequence:** whoever holds the owner page can accept; "the agent cannot accept its own work" holds only while the agent has no route to that page.
- **Why not now:** identity beyond a local token is out of scope for a local tool.
- **Reachable when:** the cockpit is shared between people, or a delegated acceptance needs to be recorded as such.

## D14: three films copy the same tools

- **Observed:** `media/explainer/`, `media/explainer-2/` and `media/explainer-3/` each carry their own copy of `tts.mjs`, `tts-lines.mjs`, `timeline.mjs`, `finish.mjs` and `render.mjs`, edited by `sed` for paths. A fix to one (for example, the duplicate-pause guard added in film 3's cue timing) does not reach the others.
- **Evidence:** `diff media/explainer-2/tools/timeline.mjs media/explainer-3/tools/timeline.mjs`.
- **Consequence:** three places to fix the same defect; film 1 and film 2 are superseded, so the drift costs little today.
- **Why not now:** the films are validation artifacts of one run, and extracting a shared film toolkit is a product decision (is this part of the product or a fixture?).
- **Reachable when:** a fourth film or a second product needs the tools.

## D15: the site's motion and the film's timing have no visual regression test

- **Observed:** `website/qa.mjs` checks overflow, contrast, focus, reduced motion and the demos, and waits for the scroll animations to settle before measuring; nothing records what a reveal, the board or the closing mark look like at a given moment. The film's check is a layout overlap scan at three points per scene plus hashed frames.
- **Evidence:** `website/qa.mjs` (`settle` step in `open`); `media/explainer-3/render.mjs --layout`.
- **Consequence:** a timing regression in the board or the film would pass every automated check; only a person watching would notice.
- **Why not now:** frame-by-frame golden images would need a tolerance policy for fonts and anti-aliasing, and the run has no human reviewer to bless goldens (U15).
- **Reachable when:** someone reviews the film and the site once and the result is kept as goldens.

## D16: public comparison rests on an editorial column

- **Observed:** the site and film 3 play four questions with "the usual answer" as a joke. That column is editorial, not a claim, and the page says so in a note; but the validator cannot tell a joke from a statement, so nothing prevents a later edit from turning it into an unsupported claim about a product.
- **Evidence:** `actualize/artifacts/marketing/website-copy.md` keys `gap.usual.*`, `gap.note`.
- **Consequence:** the copy rule (cite only OBSERVED or VERIFIED claims) has a hole exactly where the voice is most tempting.
- **Why not now:** a "premise" marker in the copy format is a schema change and a decision about what the validator is for.
- **Reachable when:** the copy format next changes; strings marked as premise could be exempt from citing but barred from naming a product.
