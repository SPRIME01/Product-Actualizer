---
name: legacy-modernization
description: Change an existing, incomplete, or aging system so it can launch without breaking what already works. Use when recon shows code that must be finished, upgraded, or repaired rather than rewritten.
reads: [capabilities, constraints, claims, actors, form, unknowns, decisions]
needs: [recon-software]
executes_with: []
---
# Legacy modernization

## Reads from the model
`capabilities` and `claims` (what must keep working, with the evidence), `constraints` (technical: runtime and services), `actors` (who depends on current behavior), `form` (public interfaces), `unknowns`, `decisions` (scope limits).

## Distinctions
- **Ownership.** Owns how to change the system safely. Recon-software owns what is there; experience owns what it should do; release-readiness owns the launch gate.
- **Legacy means untested.** Age and ugliness are irrelevant; without tests no one knows whether a change preserved behavior. The sequence is fixed: identify the change points, find the test points (often where effects surface, not where the edit happens), break only the dependencies needed to get under test, write tests, then change.
- **Seams are where behavior can be substituted without editing there:** an injected constructor argument, an import or link swap, a clock provider. Constructors that do real work, globals, statics, hard-wired I/O, and direct clock reads are where seams are missing. A seam with no reachable enabling point is useless to a test.
- **Dependency-breaking edits made before tests exist keep signatures exactly** and lean on the compiler or type checker to find every affected site.
- **Characterization recipe:** the tests record what the system does now, accidents included, and each accident is later classified (bug to fix, behavior someone relies on, irrelevant). Call the code in a harness, assert something absurd, read the failure, pin the observed value; for large outputs (reports, generated files, JSON) capture a golden master and diff against it. Tests written after the change that assert whatever the new code does pin nothing.
- **New code beside old code (sprouting)** is allowed when the old path cannot yet be covered, with a recorded plan to pay the old path down.
- **Behavior-preserving change vs. intended change** are different commits with different evidence. A diff in output is either explained by a decision id or it is a regression.
- **Finish, replace, or leave** is decided per component by what blocks launch, not taste. A framework swap with no actor-visible reason is a cost with no benefit.
- **Dependency upgrades are ordered:** runtime, then framework, then libraries, one step at a time on a pinned lockfile, tests green between steps so failures bisect.
- **"Dead" is a hypothesis.** Reflection, dynamic dispatch, scheduled jobs, config-driven loading, and external callers keep code alive without static references.
- **Expand, migrate, contract.** Change interfaces and schemas by first adding the new form beside the old (readers and writers tolerate both), then moving traffic and data, and removing the old form only after a compatibility window with verified zero use. Steps that cannot be undone are named and accepted explicitly; rollback is never assumed.
- **Flags and kill switches** put new paths behind a switch that can be turned off without a deploy, with the default and the removal date recorded.
- **Data outlives code.** Migrations are reversible or dual-written, and validated by counts and checksums, with a restore path rehearsed.
- **Secrets in history** stay compromised after deletion; the remedy is rotation, then optional history rewrite with the operator's consent.
- **Debt triage by goal:** only debt on the path to the launch goal is paid; the rest is recorded with its cost, not silently left.
- **Boundary contracts are written down while pinning behavior:** units, ranges, null and error conventions at every module edge. Unfinished code most often fails silently where two modules disagree (fraction vs. percent, seconds vs. milliseconds, zero-based vs. one-based).

## Failure modes
- **Big-bang rewrite** — rebuild replaces fixing, the product stalls. *Recognize:* old and new paths both incomplete with no cutover plan.
- **Tests written after the fact** — assertions copy what the changed code now returns. *Recognize:* test commits are later than the change they cover and no test failed against the old code.
- **Untested refactor** — structure changed with no pinned behavior. *Recognize:* commits touch logic without characterization or tests.
- **Everything-at-once upgrade** — many majors in one change. *Recognize:* one commit changes runtime, framework, and libraries.
- **Deleted but used** — "unused" code called dynamically. *Recognize:* removal commit without a trace of runtime or log evidence.
- **Taste modernization** — rewrite to a preferred stack. *Recognize:* no capability or constraint cites the change.
- **Migration without a way back** — one-way schema or data change. *Recognize:* no down path or backup rehearsal.
- **Cleaned history, same key** — secret removed from the tree, not rotated. *Recognize:* credential unchanged after exposure.
- **Red tests as noise** — failures normalized or skipped. *Recognize:* skip lists growing, flaky tests never triaged.
- **Silent contract mismatch** — two modules agree on types but not on units or ranges. *Recognize:* a threshold or constant compared across a module edge with no recorded unit; the path never triggers.
- **Unreproducible build** — works only with local state. *Recognize:* clean-clone build differs from the documented one.

## Check
1. Characterization diff: a recorded set of representative inputs (including edge and error cases) produces identical outputs before and after each behavior-preserving change; every difference is mapped to a decision id or reverted.
2. Boundary table: every module edge on a changed path lists units, range, and error convention for each value crossing it; a probe at each end of the range exercises both sides.
3. Clean-clone build and test with pinned dependencies exit 0, using only the written instructions, with the output recorded.
4. Dependency audit: known-vulnerable direct and transitive dependencies with available fixes number zero, or each is waived with a decision id.
5. Bisectability: each step is a separate change that builds and passes tests on its own; a deliberate-break exercise isolates to one step.
6. Compatibility window: the old form is removed only after logs or traffic show zero use for the agreed window; the evidence is attached.
7. Flag inventory: every flag has an owner, default, and removal date; stale flags are listed.
8. Migration verification: before/after row counts and checksums match; the rollback has been run on a copy.
9. Removal evidence: every deletion of "dead" code cites static absence and runtime absence (logs, coverage, or traffic).

## Writes to proposals
- `constraints` (technical): required upgrades, end-of-life runtimes, services that must be replaced.
- `capabilities`: items blocked, unblocked, or removed by the work, with the evidence.
- `claims`: verified behaviors from the characterization suite and clean-build runs (source = `test:<command>`).
- `unknowns`: reliance by external callers, undocumented jobs, data volumes.
- `decisions`: finish/replace/leave per component, the cutover plan, the debt not paid.
