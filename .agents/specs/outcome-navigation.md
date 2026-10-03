# Outcome-directed navigation: specification and plan

Status: implemented (commit follows this file in history). Decisions made while building: a contradiction interrupts only when an artifact cites it; reachable settlement is the engine's, and the destination is a separate fact; a view carries a table only if it has something to say; the rail is unchanged (it already carries the goal, bar, deviation chips, and the next step, and the Case is the first offer on an empty workspace). Scope: add semantics, not machinery. No subsystem for JTBD, ODI, mindstates, or case management.

## The question this answers

The owner should be able to see, from the cockpit alone: what progress is being sought, what is actually true, what
prevents it, what move is now affordable, what it costs and who can authorize it, how we will know, what becomes
reachable next, and whether settlement is already reachable. An agent gets the same answers from typed tools without
a global dump.

## Distinctions added (and where each one lives)

| distinction | representation | authority |
|---|---|---|
| Job: the stable progress an actor seeks (not a feature, workflow, or solution) | Product Model section `Jobs`, field `jobs`, ids `J<n>` | router only, via proposals |
| JobSuccessCriterion: how that progress is judged (an expectation, never a settlement Outcome) | section `Success criteria`, field `criteria`, ids `S<n>`; `importance` / `satisfaction` are `UNKNOWN` or `<number> (<source>)` | router only |
| Opportunity: evidenced progress that is insufficiently satisfied (never a feature request, solution, or candidate) | section `Opportunities`, field `opportunities`, ids `OP<n>`; must name the criterion or job it recovers (`basis`) and carry a source | router only |
| Case: the bounded present purpose around a ref | **derived, never stored** (`case:<anchor>`: `run`, an opportunity, an unknown, a claim, a proposal, an experiment) | none: a projection |
| Affordance: a move that is visible, reachable, payable, governable, recoverable, settleable | **derived** from the engine's own state, the reach ladder, and the graph | none |
| settlementReachable vs shouldSettleNow | derived pair (plus `destinationAttained`, the gate verdict being `go` with nothing relied-on contradicted); the second is a representation for the owner's judgment, never an action | owner decides |
| DecisionState: temporary, case-bound situational salience | rows of a stamped **artifact** table (header `case, actor, job, trigger, push, pull, anxiety, habit, grade, evidence`); never in the model; never on an actor | agent-produced candidate; derived view |
| Experiment: a hypothesis with a frozen observation criterion | an evidence file (`experiment:` head + result table); observer id frozen; git order checked when available | evidence, not settlement |
| Durable pattern: learning that survived more than one episode | a **claim** whose source cites experiment files with `(supports)` / `(contradicts)`; status derived by an evidence contract | the router grades the claim |

Why Case is not stored: every fact a Case shows already has an authoritative home (goal and bar in `state.json`,
claims and opportunities in the model, proposals, evidence, blockers, the inbox). A stored Case could only drift from
them. The one thing a Case needs that is not elsewhere is a *purpose*; that is the run's goal and bar for the run Case,
and the criterion's direction for an opportunity Case. Anything the owner wants to pursue becomes a model row through
the existing inbox, proposal, and reconciliation path.

## Donor distinctions retained (details in PROVENANCE.md)

- savvides/jtbd: direct vs inferred demand evidence with provenance; minimum-data gates; "emerging" before "supported".
- growthbook/skills: falsifiable hypothesis, primary observable, guardrails; one result is not a durable learning; a learning cites supporting **and** contradicting experiments; search prior knowledge before paying again, and an empty corpus is not an empty record.
- flowable-engine: a move's availability is a function of current conditions (entry/exit dependencies in both directions); legal transitions are a table over the current state; `isCompletable` is not `shouldBeCompleted`.
- phuryn/pm-skills: an opportunity is not a solution; solutions are candidates that address it.

## Kernel plan

1. `hooks/src/lib/md.mjs`: three optional trailing sections, their field keys, validation (ids, references, measured values need a source), staleness for free (`reads`/`touched`).
2. `cockpit/protocol`: ref kinds `job`, `criterion`, `opportunity`, `actor`, `case`; sources `pa:jobs|criteria|opportunities|decision-states|experiments|patterns`, `case:state|affordances|settlement|opportunity|decision|prior`, `graph:case`; tool `case_get`; template `case`.
3. `cockpit/server/demand.ts` (jobs, criteria, opportunities from a model), `learn.ts` (decision states, experiments, patterns, prior knowledge), `case.ts` (case, deviation, affordance field, settlement), `git.ts` (read-only local timeline), `caseSurfaces.ts` (compositions).
4. The world debugger gains the new nodes and edges (`why`, `impact`, `diff`, `timeline`, `counterfactual`, `reach` work on them with no new engine). `reach` gains market-evidence capabilities; providers stay data.
5. Git as a timeline (default on, read-only: `rev-parse`, `log`, `show`; absent git degrades to "unavailable"): a version's settlement time when the log lacks it, the commits that recorded an artifact or evidence file, `world timeline --git`, and the freeze-before-result order of an experiment. `gh` only as an opt-in prober for the reach ladder (`ACTUALIZE_GH=1`, default off, cached a minute).
6. Cockpit: Case, Opportunity, and Decision views from the existing fifteen blocks; table group lanes carry "next move / alternatives / blocked"; hint offers the Case first.

## Invariants (all tested)

Criterion != Outcome. Opportunity != candidate. Unknown stays unknown, no score is ever computed from prose. DecisionState is case-bound and
never lands on an actor. Affordance availability follows prerequisite evidence. A blocked move names its blocker and, where it can, what would reach it.
At most one primary move per Case view and it is never blocked. A contradiction cannot be omitted from the Case view. A historical viewport never replaces
the current Case. One experiment is not a durable pattern; contradicting evidence survives. Deleting the cockpit loses no Case knowledge. The agent cannot use
any of this to speak as the owner; WebMCP stays read-or-compose only.

## Verification plan

Baseline (before this change): typecheck clean, 168 tests pass, `check.py` OK. After: same four commands, plus browser scenarios A to H, an owner journey,
an agent journey, a CLI-closed journey, a rebuild journey.

## Result

Baseline 168 tests; after, 243 (52 kernel, 13 transport, 10 browser for the Case, plus changes to existing suites). Typecheck, `tests/check.py`, `bun run build`, and 30 browser tests in system Chrome (none skipped) pass. No dependency added or removed. Donors are recorded in PROVENANCE.md and the clones are deleted.
