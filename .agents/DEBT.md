# Debt

Real residuals that are not affordable or in scope to settle now. Each one names what was seen, the evidence, what it costs to leave, why it is not being settled now, and what would make it reachable. This file is not a to-do list.

Closed in the change after `a837ffd`: an owner's direction with no model row (now shown from the existing annotation, unrouted until the router routes it), payment beyond lens runs (reconciliation spans and owner waits, from the log), and probers other than `gh` (`ACTUALIZE_PROBE`).

## D1: a cold full `bun test` run failed once; mitigated, not confirmed

- **Observed:** the first full `bun test` at the start of the outcome-navigation work printed `165 pass / 3 fail / 1 error` on a tree that had passed 168/168. The failing test names were not captured. Every run since has passed.
- **Evidence:** the baseline run on 2026-10-02 at `b1b7c95`, then more than ten clean full runs; one earlier transient e2e timeout on `b1b7c95`, not reproduced in fourteen runs.
- **Consequence:** a spurious red build on a cold start if the cause is something other than the one mitigated.
- **Why not now:** the cause cannot be reproduced. `bunfig.toml` now sets a 30 s per-test timeout (bun's 5 s default is the likeliest casualty of a cold Chrome plus a cold page bundle), which is a mitigation, not a proof.
- **Reachable when:** it recurs with the failing test names in the output; then the cause is findable.

## D4: the pattern evidence contract has no outcome data behind it

- **Observed:** a pattern is `supported` at two frozen-criterion experiments in two settings with none contradicting. A claim can demand more (`[contract supporting=3 scopes=2]`) but never less, and each pattern now lists where it was reused (`reusedBy`).
- **Evidence:** `PATTERN_CONTRACT` and `patterns()` in `cockpit/server/learn.ts`.
- **Consequence:** the default may be too weak for a high-stakes domain or too strict for a cheap one; whether a pattern held when reused is recorded but not yet judged.
- **Why not now:** calibration needs patterns that were reused and then confirmed or contradicted. No run has any yet, and a number chosen without them would be a guess presented as a rule.
- **Reachable when:** several patterns have `reusedBy` entries and later evidence for or against them.
