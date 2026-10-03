# Debt

Real residuals that are not affordable or in scope to settle now. Each one names what was seen, the evidence, what it costs to leave, why it is not being settled now, and what would make it reachable. This file is not a to-do list.

## D1: a cold full `bun test` run failed once and was not reproduced

- **Observed:** the first full `bun test` after `bun run typecheck`, at the start of the outcome-navigation work, printed `165 pass / 3 fail / 1 error` on a tree with no changes since a run that passed 168/168. The names of the failing tests were not captured. The next four full runs, and every run since, passed.
- **Evidence:** the baseline run on 2026-10-02 (commit `b1b7c95`), then four clean runs of the same tree; an earlier single transient timeout in an e2e test was also seen once on `b1b7c95` and not reproduced in fourteen runs.
- **Consequence:** a browser or server start-up race may exist (a cold Chrome and a cold bundle in the same second). It would show as a spurious red build.
- **Why not now:** it cannot be reproduced on demand, and guessing a fix would hide it. The e2e suites now run with a 30 s default timeout where they open several servers, which narrows the one known cause (a cold first bundle), but does not prove it.
- **Reachable when:** it recurs with the failing test names. Run `bun test 2>&1 | tee` on cold starts to capture them.

## D2: an owner cannot pin a Case purpose that has no model row

- **Observed:** a Case's destination is the run's goal and bar, or a criterion, job, or unknown the Product Model already holds. An owner who wants to steer toward something with no row yet ("be demo-ready by Friday") has no authoritative place to say it except the inbox, which the router must turn into a decision or a proposal.
- **Evidence:** `cockpit/server/case.ts` `purposeOf`; `docs/case-navigation.md` "Why a Case is not stored".
- **Consequence:** a purpose that is real but has not been routed shows nowhere in the Case. This is deliberate for now (a stored Case could drift from the files) but it is friction.
- **Why not now:** the right home is a router-owned record with provenance, and it needs the router's reconciliation path to carry it. That is a process change, not a cockpit one.
- **Reachable when:** owners routinely ask for a Case they cannot express as a goal, a criterion, or an unknown.

## D3: payment is measured only for lens runs

- **Observed:** a move's cost is the median of earlier runs of the same lens, taken from the run log. Owner attention, an external lookup, a survey, and a physical action have no measured cost, so they say `unknown`.
- **Evidence:** `typicalMinutes` in `cockpit/server/case.ts`; every non-lens move reports `cost unknown`.
- **Consequence:** the owner cannot compare "run the observer" against "ask a customer" on cost.
- **Why not now:** inventing numbers would be worse than saying unknown, and nothing in the run records those durations.
- **Reachable when:** the log records start and end of owner asks and external observations (the inbox has a request time and a response time already; pairing them is the first step).

## D4: the pattern evidence contract is a default, not a calibrated rule

- **Observed:** a pattern is `supported` when at least two experiments with a frozen criterion pass in at least two distinct settings and none contradicts. These numbers are this repository's default.
- **Evidence:** `PATTERN_CONTRACT` in `cockpit/server/learn.ts`.
- **Consequence:** for a high-stakes or noisy domain two settings may be too few; for a cheap, reversible one it may be too many. Cross-case transfer (does a pattern learned in one Case hold in another) has no evidence in the run to test it.
- **Why not now:** calibration needs real runs that reuse patterns, and none exist yet. The contract is one constant and the status names (`single-result`, `emerging`, `supported`, `contested`) do not depend on its values.
- **Reachable when:** patterns have been reused across several Cases and their outcomes are on record.

## D5: only the `gh` provider can climb past `configured`

- **Observed:** `ACTUALIZE_GH=1` runs `gh auth status` and fills the probed, reachable, and authorized rungs for `gh`. Every other provider stays `unknown` at those rungs, so almost every move that routes to an outside capability reads `unproven`.
- **Evidence:** `probesFor` in `cockpit/server/reach.ts`; the reach tables in `docs/world-debugger.md`.
- **Consequence:** `available` for a move means "nothing known to stop it", not "known to work".
- **Why not now:** each prober contacts something outside the machine, and each needs the owner's opt-in.
- **Reachable when:** a second provider is used often enough that its `unproven` state costs a wasted attempt.
