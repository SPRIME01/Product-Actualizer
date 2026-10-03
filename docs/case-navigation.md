# Outcome-directed navigation: the Case

The world debugger makes the product world **interrogable**. The Case makes it **navigable**: it answers, from the run's own files, where the work is trying to go, what stands between here and there, what can be done now, what it costs and who may do it, how we will know it worked, and whether settling is already reachable.

It adds no store, no workflow engine, no block, and no authority. A Case is a pure function of the run directory. Delete the cockpit and the same Case comes back.

```
ACTOR ─ pursues ─► JOB ─ judged by ─► SUCCESS CRITERION ─ exposes ─► OPPORTUNITY ─ addressed by ─► CANDIDATE
                                              │                                                        │
                                       evidence (graded)                                    observation (frozen first)
                                                                                                       │
CASE (derived) ─► destination · deviation · AFFORDANCE FIELD ─► one move ─► consequence ─► EVIDENCE ─► settlement ─► a new settled world
```

Execution has no epistemic authority: an agent produces candidates, an observer produces evidence, and only the router's reconciliation, which the owner's rulings feed, settles. Nothing here crosses that line.

## What was added, and what was not

| distinction | where it lives | why it earns a place |
|---|---|---|
| Job, success criterion, opportunity | three optional Product Model sections (`jobs`, `criteria`, `opportunities`), graded and sourced like claims | the model could say who the actor is and what job they hire the product for, but not how they judge the progress, nor where it is under-served. These are versioned, so a reader of them goes stale correctly |
| Case | **derived**, anchored on a ref the run already has | "what presently matters" needs an object. Every fact it shows already has an authoritative home |
| Affordance field | **derived** from the engine's blockers, the lens statuses, the reach ladder, and the graph | a list of tasks drifts; a field computed from present state cannot |
| `settlementReachable` vs `shouldSettleNow` | a derived pair | "nothing mandatory remains" is not "stop thinking" |
| Decision state | a table in a stamped artifact, bound to a Case | situational salience is real and must not become a label on a person |
| Experiment | an evidence file with a frozen criterion | a hypothesis whose observation was fixed before the result |
| Durable pattern | a claim whose source cites experiments | one result is an outcome; a pattern survived more than one episode and keeps its contradictions |

Not added: a JTBD, ODI, or mindstate subsystem, a Job Story syntax, 1 to 10 scores, an opportunity score, a case database, a workflow or state-machine engine, a stage ontology, a new block, a new dependency. The vocabulary of every donor framework stays research material.

## The demand sections

Defined in [reference/product-model-schema.md](reference/product-model-schema.md); the semantics are:

- **Job** (`J1`): the progress an actor seeks. Not a feature, a workflow, or what today's product makes them do.
- **Success criterion** (`S1`): how the actor judges that progress was made well, as `direction measure object context`. It is an *expectation*. A settlement **outcome** is a consequence that actually occurred and lives in the decision log. The two never share a word, a table, or a ref kind.
- **Importance and satisfaction** are `UNKNOWN` or `<number> (<source>)`. The model refuses anything else, and no opportunity score is ever computed, even when both are measured: a number derived from prose, or from one respondent, would be confidence smoothing.
- **Opportunity** (`OP1`): evidenced progress that is insufficiently satisfied. It must name the criterion or job it recovers (`basis`), so "customers asked for X" cannot be recorded as an opportunity without first recovering the progress X assumes. A **candidate** is a proposal that names it: one possible transformation, several of which should compete.

Donor job maps (Define, Locate, Prepare, Confirm, Execute, Monitor, Modify, Conclude) are a reconnaissance question, "did we miss part of the actor's progress?". They are not model structure.

## The Case

`actualize case [ref]`, the `case_get` tool, and the sources `case:state`, `case:affordances`, `case:settlement`, `case:prior`, `graph:case`.

A Case is anchored on a ref that already has an authoritative home. The anchor decides the purpose:

| anchor | purpose is | declared by |
|---|---|---|
| `run` (default) | the run's goal and bar | the owner, when the run began |
| `OP1`, `S1`, `J1` | the criterion's statement, or the job | the Product Model (settled by the router) |
| `C4` | know whether it is true | derived: public copy can cite only OBSERVED or VERIFIED |
| `U2`, `P7` | answer the question; decide the candidate | the Unknowns table; proposals.md |
| `evidence/<lens>/<file>` | learn whether the hypothesis holds | the experiment's head |

**Why a Case is not stored.** A stored Case could only drift from the files that hold its facts. The one thing it would add is a purpose, and the run's goal and bar, or a model row, already carry one. A purpose with no row has no home yet: that is recorded in `.agents/DEBT.md` (D2), not papered over.

### The material deviation: evidence wins salience

Deviations are ordered `interrupt`, `salient`, `quiet`, and within a class the engine's own order survives. A `CONTRADICTED` claim that an artifact cites interrupts; one nothing cites is still shown but does not outrank what is being built on top of it. The engine's integrity blockers (a tampered or invalid model, an invalid artifact) interrupt. An open unknown that blocks something, an unmeasured criterion, and a run paused for the owner are salient. Nothing is ever removed to keep the view small: all contradictions stay deviations, and only the first three get moves.

### The affordance field

A move is an **affordance** only if it is visible, reachable, payable, governable, recoverable, and settleable. The field is derived each time:

```
the engine's blockers, the lens statuses, the reach ladder, the graph
   ─► prerequisites met?   (a lens needs its needs completed)
   ─► capability available? (the reach ladder; owner is a provider like any other)
   ─► payment known?        (median of earlier lens runs from the log, else "unknown")
   ─► authority?            (agent, router, or owner)
   ─► recoverable?          (what undoes it, or "none")
   ─► settlement access?
   = AVAILABLE or BLOCKED, with the reason
```

Each move carries what it is, why now, what it advances, what it requires, why it is reachable or blocked, expected payment, the authority, the recovery path, the evidence expected, and what becomes reachable next. A field the run cannot know says `unknown`; it is never invented.

**A blocked move is information.** It lists what blocks it and, where a provider or prerequisite exists, what would make it reachable ("posthog: set POSTHOG_API_KEY"; "lens brand has not completed").

**At most one primary move**, and only when something stands between here and the destination (settlement is out of reach, or evidence interrupts). The primary move is the first available one that answers the material deviation. It is never blocked and never the settling move. It is guidance, not authority: nothing runs because it is marked, alternatives are never hidden, and a reachable Case with only optional work left has **no** primary, because then the owner is choosing.

**Successors** (`then reachable`) show only what the move opens one step ahead (from the graph and lens `needs`), never a workflow map.

### `settlementReachable` is not `shouldSettleNow`

Flowable distinguishes a case that *is completable* (no active or required work remains) from one that *should be completed* (a mode decides, because optional work may remain). The same distinction is made here:

| | meaning | who decides |
|---|---|---|
| `settlementReachable` | every required condition holds: the engine would let the run end with a verdict | derived |
| `destinationAttained` | the gate's verdict is `go` and no relied-on evidence is contradicted | derived; `null` before a gate exists |
| `shouldSettleNow` | `{ call: "owner", lean: "not-yet" \| "weigh" \| "nothing-to-weigh", why }` | **the owner**; the lean is a representation for judgment, never an instruction and never "yes" |

A reachable Case with a `defer` verdict says so: "Reachable. It would record defer; the destination is not attained; 6 optional move(s) remain that settling forgoes. Whether to settle now is your judgment." Nothing auto-closes.

## Decision states

Same person, same Job, different situation, different decision. A decision state records what was salient (push, pull, anxiety, habit) and the trigger, for **one Case**. It is a table in a stamped artifact (so it is graded, cites its evidence, and goes stale with the model), with the columns `case | actor | job | trigger | push | pull | anxiety | habit | grade | evidence`.

- It belongs to the situation. The same actor and job in another Case has a different row; the Product Model records neither.
- A table with a `persona`, `type`, `segment`, or `mindstate` column is not read at all.
- A row is `direct` when its grade is OBSERVED, VERIFIED, or REPORTED (a source states it) and `inferred` otherwise; a row with no trigger, no evidence, a bad Case, or a job that belongs to another actor is `invalid`.
- A marketing message is a hypothesis about a decision state. It stays `INFERRED` until behavior is observed, and an inference never becomes `OBSERVED` by being repeated.

## Experiments and durable patterns

An **experiment** is an evidence file whose head carries `experiment`, `hypothesis` (if / then / because), `primary`, `guardrail`, `scope`, `limitations`, and the observation criterion: `selects`, `where`, `expect`, and `frozen: <observer id>`. The observer id is a digest of the criterion, so editing the criterion after freezing it is detected (`changed`). When the run is in a git repository the commit that first froze the criterion is compared with the commit that first held result rows: criterion first is `frozen-first`, results first is an interrupting deviation, no repository is `unavailable`.

A **pattern** is a claim whose source cites experiment files. The side an experiment is on is decided by its own replayed result, not by its label; a label that disagrees is overridden and noted. A pattern is:

| status | meaning |
|---|---|
| `single-result` | one passing experiment: an outcome, not a durable learning |
| `emerging` | two or more, but in one setting |
| `supported` | at least two with a frozen criterion, in at least two settings, none contradicting |
| `contested` | at least one contradicts. Both sides stay listed; nothing is averaged |

The thresholds are this repository's default evidence contract (`PATTERN_CONTRACT`), not a statistical convention (`.agents/DEBT.md`, D4). An experiment whose criterion was not frozen before its result cannot count as support. **Before paying to observe something again**, `actualize case prior --q "<words>"` finds the patterns and experiments that already bear on it, and an empty answer says "nothing is recorded here", never "nothing is known".

## How the owner sees it

The destination, the deviation, the one move, its cost and authority, how we will know, what opens, and the settlement state are read top to bottom in one table; the moves sit below, grouped by lane. The ordering principle is the commercial flight deck's, not its look: stable positions, the destination always known (the rail already carries the goal and bar), deviation salient, health quiet, one next maneuver, the authority boundary explicit, recovery knowable. The arrangement uses the existing blocks only.

| lane | meaning | styling |
|---|---|---|
| next move | the one primary move | the group header is the only one set in capitals with an accent rule |
| choose | settlement is reachable and nothing is marked | plain |
| alternatives | also available | muted |
| blocked | cannot be made now, with why | danger text, and the reason is in the row |

Rules the surface keeps, tested in a real browser: no percentage-complete anywhere; no optimistic language; a contradiction cannot be omitted; blocked moves never sit among available ones; opening a Case writes nothing to the run or the inbox; a historical viewport in another surface never replaces the Case; and a view carries a table only if it has something to say. It is quiet when the run is healthy: a `quiet` deviation, no primary, and a `choose` lane.

## Git and gh

Local git is a **read-only timeline** (`cockpit/server/git.ts`; only `rev-parse`, `log`, `show` run). It supplies a model version's settlement time when the log lacks one, the commits that recorded an artifact or evidence file (`world why`), the commit timeline (`world timeline --git`), and the freeze-before-result order of an experiment. With no repository every question answers "not recorded" and nothing is guessed. Nothing is ever fetched, pulled, committed, or written.

`gh` is an **opt-in prober** for the reach ladder. With `ACTUALIZE_GH=1` (default off) and `gh` on the PATH, `gh auth status` fills the probed, reachable, and authorized rungs of the `gh` provider, so a GitHub-backed evidence route (issues and discussions are support history) can be `usable` instead of `unproven`. That call contacts GitHub, which is why it is off by default; it is cached for a minute.

## What it does not do

- It does not store a Case, a purpose, a score, or a decision state, and it does not pick for the owner.
- It does not run a move. Even the primary move is a description.
- It does not size an opportunity or compute a priority.
- A purpose with no model row has no home yet (`.agents/DEBT.md`, D2); payment is measured only for lens runs (D3); only `gh` can climb past `configured` (D5).

### Source trail

- `hooks/src/lib/md.mjs`: the optional sections, their validation, staleness for free
- `cockpit/server/demand.ts`: jobs, criteria, opportunities as rows; measured vs unknown
- `cockpit/server/case.ts`: the Case, deviations, the affordance field, settlement, `caseWhy`, the row and graph projections
- `cockpit/server/learn.ts`: decision states, experiments, patterns, prior knowledge
- `cockpit/server/git.ts`: the read-only local timeline
- `cockpit/server/caseSurfaces.ts`: the Case, Opportunity, and Decision views
- `cockpit/server/reach.ts`, `reach.providers.json`: market capabilities and the `gh` prober
- `tests/cockpit/case.test.ts`, `case.transport.test.ts`, `case.e2e.test.ts`
