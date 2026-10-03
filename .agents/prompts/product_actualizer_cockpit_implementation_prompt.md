# Sonnet 5.5 Implementation Prompt — Product Actualizer Cockpit as a Capability-Native Workbench

You are implementing directly in `SPRIME01/Product-Actualizer`.

Start by inspecting the current repository and its tests. Do not redesign from assumptions. Preserve the repo's existing authority model and existing visual language.

## Objective

Evolve the existing cockpit into a **capability-native workbench** that projects the Product Actualizer run plus a small durable cockpit control plane.

The cockpit should let the owner reason about work at three levels:

1. **Conversation / Work Terminal** — natural-language commands and instructions about the work.
2. **Task / Stage** — the bounded piece executing now.
3. **Workflow** — the dependency and acceptance structure that gives stages meaning.

The central interaction metaphor is **not chat**. It is a **natural-language terminal for purposeful work**.

The user should be able to type things such as:

- `show me what blocks acceptance`
- `what should happen next?`
- `why is this artifact stale?`
- `show the workflow`
- `show the capabilities for this stage`
- `verify the current frontend`
- `split the next work across independent workers`
- `steer away from browser screenshot work`
- `review what changed before I accept it`

The system should either:
- resolve the request deterministically to an existing cockpit view/tool/action when it can; or
- persist it as a typed work request for the agent/router to handle.

Do **not** add an invisible LLM service to the cockpit just to interpret the terminal.

---

# First: Preserve the Existing Architecture

The following are hard constraints.

## Product/process authority remains unchanged

The authoritative product/process state remains the existing run directory:

- `product-model.md`
- `proposals.md`
- artifacts
- evidence
- history
- run state
- process log
- inbox
- release gate

Only the existing router/reconciliation path settles Product Model truth.

The cockpit must **not** become a second Product Model, settlement engine, or release gate.

The hooks/process engine must remain able to run with the cockpit closed.

## SQLite boundary changes, but only for cockpit-owned state

The current `bun:sqlite` database is described as disposable. Change that model carefully:

### Rebuildable projection data remains rebuildable
Examples:
- projected entities
- FTS search projection
- process-derived event projection
- run-derived indexes

These must still be reproducible from the run directory.

### Cockpit-owned control-plane data may now be durable in SQLite
Examples:
- workflow definitions/instances owned by the cockpit
- task contracts
- capability bindings
- executor profiles
- declared budgets
- work-terminal requests
- saved workbench preferences
- review state that is explicitly cockpit-owned
- UI layout/preferences

Deleting `cockpit.db` may now lose those cockpit-owned objects. That is acceptable.

However, deleting the DB must still **never lose Product Model/process truth**.

Update documentation and tests to make this two-class storage model explicit.

## The UI remains a projection

The browser does not own state.

The browser sends typed requests.
The server validates them.
SQLite/run state owns the relevant state.
The UI projects it.

Preserve the existing reducer/server authority pattern.

---

# Existing Mechanisms to Exploit, Not Replace

The current repo already contains most of the semantic substrate.

## Lenses are already close to capability contracts

`skills/<lens>/SKILL.md` frontmatter already provides:

- `description`
- `reads`
- `needs`
- `executes_with`

Use this.

Interpret:

- the lens itself as the **judgment/domain capability**
- `needs` as the capability dependency graph
- `executes_with` as candidate **implementation bindings**

Do not invent a duplicate capability ontology for concepts the current lenses already represent.

## Reach already models capability → provider binding

The world debugger already has observation capabilities and `reach.providers.json`.

Preserve the distinction:

- lens/domain capability = judgment/work capability
- `executes_with` = execution-skill implementation
- Reach capability/provider = external observation mechanism

Do not collapse them into one ambiguous "plugin" concept.

## Case already provides outcome-directed navigation

The Case already derives:

- destination
- deviation
- affordance field
- primary move
- blockers
- expected payment
- authority
- recovery
- expected evidence
- settlement reachability

Exploit this heavily.

Do not build a second "what next?" engine.

The Workbench should project Case information wherever appropriate.

## The 15-block cockpit grammar is already the UI grammar

Keep the existing closed block vocabulary.

Prefer compositions of:

- metric
- callout
- table
- tree
- timeline
- graph
- chart
- compare
- media
- document
- entity
- preflight
- progress
- ask
- form

Do not add new block types unless a required interaction truly cannot be expressed with the existing grammar.

## Keep Dockview

Do not replace Dockview or convert this into a generic dashboard framework.

Human placement, pinning, minimization, split layout, and ownership rules must remain intact.

---

# The New Conceptual Hierarchy

Implement the cockpit around this hierarchy:

```text
WORKSPACE / RUN
    ↓
WORKFLOW
    ↓
TASK / STAGE
    ↓
CAPABILITY
    ↓
IMPLEMENTATION BINDING
    ↓
EXECUTOR BINDING
    ↓
REPRESENTATIONS
    ↓
ARTIFACTS + EVIDENCE
    ↓
ACCEPTANCE
```

Definitions:

- **Workflow** — durable dependency + acceptance structure of purposeful work.
- **Task/Stage** — one bounded execution inside a workflow.
- **Capability** — categorical kind of work required.
- **Implementation binding** — mechanism/skill/package that realizes a capability.
- **Executor binding** — model/tool/agent that runs that implementation.
- **Representation** — structured state being transformed.
- **Artifact** — durable output.
- **Evidence** — why the output should be trusted.
- **Acceptance** — whether progression is allowed.

Workflow identity must live in its dependency and acceptance structure, not in a particular model or package.

---

# SQLite Control Plane

Upgrade `cockpit/server/db.ts` from a drop-and-rebuild schema strategy to migrations.

Use `bun:sqlite` directly. Do not add an ORM.

Keep WAL, prepared statements, transactions, and strict mode.

Create a clear naming boundary for durable cockpit-owned tables, preferably `control_*`.

A reasonable minimal schema is:

## `control_workflows`
- id
- name
- description
- version
- definition JSON
- source (`builtin`, `user`)
- created_at
- updated_at

## `control_workflow_instances`
- id
- workflow_id
- run identity/path
- status
- current_stage
- state JSON
- created_at
- updated_at

## `control_task_contracts`
- id
- workflow_instance_id
- stage_id
- goal
- context JSON
- capability_ids JSON
- authority JSON
- executor JSON
- budget JSON
- invariants JSON
- acceptance JSON
- status
- created_at
- updated_at

## `control_capabilities`
- id
- category
- purpose
- contract JSON
- source
- updated_at

## `control_bindings`
- id
- workflow_instance_id or nullable default scope
- capability_id
- implementation
- executor_profile_id nullable
- config JSON
- status
- updated_at

## `control_executor_profiles`
- id
- label
- provider
- model
- role
- config JSON
- economics JSON
- updated_at

## `control_work_requests`
- id
- workflow_instance_id
- task_contract_id nullable
- text
- classification
- capability_id nullable
- status
- actor
- refs JSON
- created_at
- updated_at

## `control_reviews`
- id
- subject_type
- subject_id
- status
- evidence_refs JSON
- reviewer
- note
- created_at
- updated_at

Keep the schema smaller if some of these can be represented cleanly together. Do not create tables merely because they are listed here.

### Migration rule

A schema version change must no longer drop durable control tables.

Implement ordered migrations inside a transaction.

`rebuild()` must rebuild projection data while preserving `control_*` and durable UI state.

Add a test proving this.

---

# Default Workflow Projection

Do not replace `process.mjs`.

Create a built-in workflow definition for the existing `actualize-product` process.

Derive it from the existing process/router semantics:

```text
Classify Evidence
    ↓
Build / Update Product Model
    ↓
Select Capabilities / Lenses
    ↓
Execute Dependency Waves
    ↓
Reconcile
    ↺ as needed
    ↓
Rebuild Stale Work
    ↓
Release Readiness
    ↓
Review / Gate
    ↓
Accept / Defer / No-Go
```

Within `Execute Dependency Waves`, project the real lens `needs` graph and wave state from the existing run.

The workflow layer is initially a **control/projection layer**, not a replacement workflow engine.

Do not make hooks or `process.mjs` depend on SQLite.

---

# Skill / Capability OS

Create a capability catalog that is derived as much as possible from existing metadata.

For each lens show:

- capability name
- category
- description/purpose
- model fields read
- prerequisite capabilities (`needs`)
- status
- candidate implementation bindings (`executes_with`)
- artifacts produced if known
- current reach/provider requirements when relevant

Examples:

```text
Experience Design
Capability: experience
Needs: brand
Executes with:
- impeccable
- hallmark
```

```text
Visual Fidelity QA
Capability: fidelity-qa
Executes with:
- playwright-cli
- agent-browser
```

The UX should make the distinction clear:

```text
Capability: Browser / Visual Verification
Implementation: playwright-cli
Executor: current agent / tool
```

Do not make the package name the user's primary ontology.

### Capability composition

Represent at least:

- prerequisites
- implementation candidates
- current binding
- availability/reach where known

If two implementations or capabilities would claim overlapping primary authority, the model should be able to expose that as a conflict/warning.

Do not invent conflict rules for every lens. Start with explicit or obvious configurable metadata and keep unknowns honest.

---

# Deterministic Workbench Screens — the 20% UI

Do not build dozens of bespoke pages.

Implement a small deterministic **screen grammar** using existing blocks.

Create a pure server-side function such as:

`screenOf(runProjection, controlState, caseState)`

The exact name is flexible.

It should select one of a handful of useful workbench modes based on meaningful state.

Recommended modes:

## 1. ORIENT

Use when:
- no active lens/work;
- selection/model setup is incomplete;
- user needs destination and next move.

Project:
- Case destination/deviation
- task contract summary
- workflow graph
- selected/available capabilities
- important unknowns
- next available move

## 2. EXECUTE

Use when:
- lenses/stages are active;
- delegated work is active;
- work requests are running.

Project:
- current workflow stage
- progress
- active lens/capability
- trace
- current task contract
- active work requests
- next reachable stage

## 3. DECIDE / STEER

Use when:
- owner input is required;
- proposals are open;
- a work request needs clarification;
- active work is being redirected.

Project:
- one material question/decision
- relevant evidence
- consequences
- alternatives
- current task/workflow context

## 4. VERIFY / REVIEW

Use when:
- artifacts exist;
- work is stale;
- blockers exist;
- release-readiness is active;
- a task says ready for review.

Project:
- evidence ledger
- staleness
- blockers
- artifacts
- relevant diff/history/trace
- acceptance state
- review actions

## 5. COMPLETE / REUSE

Use when:
- settlement is reachable or run is finished.

Project:
- verdict
- accepted artifacts
- evidence closure
- optional remaining moves
- reusable capability/workflow information

Do not implement a scheduler in this pass.

A later automation system may operationalize workflows.

### Screen transition behavior

The screen should update when meaningful state changes.

It must not aggressively rearrange the user's workspace.

Human layout wins.

Pinned/human-placed panels stay where they are.

Prefer a stable Workbench surface whose contents change deterministically, plus user-opened supporting surfaces beside it.

If the current architecture makes another implementation cleaner, preserve the same invariant:
**deterministic work view changes; human layout is not stolen.**

---

# Work Terminal — Natural Language Terminal for the Work

Add a persistent natural-language input surface to the cockpit.

It should feel like a terminal/command line for work, not a chat application.

Avoid assistant/user speech bubbles.

A compact chronological command/result log is fine.

## Two execution classes

### Class A — deterministic cockpit commands

Resolve locally without an LLM where possible.

Examples:

- `show workflow`
- `show blockers`
- `what next`
- `show proposals`
- `show unknowns`
- `why is artifact X stale`
- `open claim C4`
- `show the gate`
- `show capabilities`
- `show evidence`
- `show run trace`

Map these to existing:
- templates
- refs
- world debugger operations
- Case
- search
- focus/place actions

Use a small explicit parser/rule set. Do not build a fragile NLP framework.

### Class B — work requests

Examples:

- `verify the current frontend`
- `audit accessibility`
- `split the next work across independent workers`
- `rebuild this artifact`
- `steer the current work away from screenshots`
- `polish this without changing the design direction`

Persist these as `control_work_requests`.

Classify only as far as evidence allows:
- requested capability if obvious;
- target refs if explicit;
- otherwise unknown/unclassified.

Do not fabricate a plan.

Emit a cockpit event such as `work.requested`.

Expose pending requests through:
- cockpit snapshot/API;
- MCP/WebMCP read tool;
- compact `.cockpit/context.json` status so the router/agent sees pending work at its next interaction.

Do **not** claim that typing into the Work Terminal wakes an external agent unless the repo actually has a reliable integration capable of doing that.

If no executor is actively connected, show something like:

`queued — the agent will see this at the next interaction`

rather than pretending it is executing.

## Work-request lifecycle

Use a bounded lifecycle such as:

```text
queued
→ acknowledged
→ running
→ produced
→ ready_for_review
→ accepted
```

with:
- blocked
- cancelled
- failed

where needed.

Agent-side typed tools/actions may move work through execution states.

The agent may not mark its own work `accepted`.

Acceptance requires:
- the existing process/gate when mapped to process completion; or
- a human review/confirmation for cockpit-owned work.

---

# Task Contract

Create a compact task/stage contract that the UI can project.

Conceptually:

```text
Context | Goal | Skills | Authority | Executors | Budget | Invariants | Acceptance
```

Do not force every field to be known.

Unknown is valid.

Examples of invariants:
- protected source/tests cannot change;
- public artifact may cite only OBSERVED/VERIFIED;
- approved design direction must remain;
- local vs global metric scope must stay explicit.

Budget should represent declared limits and observed resource facts only.

Do not invent model cost.

---

# Evidence Ledger

Create a deterministic review projection from existing evidence/process state plus cockpit review state.

Example:

```text
Evidence

Product/model
✓ relevant rules settled

Implementation
✓ expected artifacts produced
✓ protected evidence unchanged

Verification
✓ tests passed
✓ independent verification passed
○ browser journey pending

Quality
✓ accessibility audit
○ human review pending
```

Use real refs.

If the run does not record a check, show it as unknown/pending, not passed.

Artifacts should link to the evidence used to accept them.

---

# Authority Rules

Preserve the current separation.

## Agent may
- compose/read cockpit surfaces
- read workflow/capability/task/work-request state
- acknowledge/claim a queued work request
- report execution progress
- attach refs/evidence
- mark work `ready_for_review`

## Agent may not
- forge owner input
- directly settle Product Model truth
- silently alter human-selected bindings/budgets
- accept its own work
- modify protected cockpit files directly outside typed APIs

## Human may
- submit/cancel work requests
- choose capability implementation binding
- choose executor preference
- set budgets
- review/accept cockpit-owned work
- continue to rule/answer/confirm through existing authority channels

Typed reducer/server boundaries must enforce this.

---

# Bun 1.4 — Exploit What Is Already There

Use Bun aggressively where it removes dependencies, not for novelty.

The repo already correctly uses:
- `bun:sqlite`
- `Bun.serve`
- WebSockets
- Bun build/compile
- Bun spawn/which
- a single compiled executable

Keep that direction.

Specifically:

## SQLite
Use native:
- prepared statements
- transactions
- WAL
- FTS
- strict mode

No ORM.

## Server
Keep `Bun.serve`.

Do not add Express/Fastify.

## Frontend/build
Keep the existing HTML-import/Bun bundling path.

Preserve single-binary output.

Any new static seed definitions should be code/JSON that bundles cleanly.

## Process execution
Use `Bun.spawn`/`Bun.spawnSync` where process execution is genuinely required.

Do not introduce Node-only wrappers.

## Files
Use `Bun.file`/existing fs code pragmatically; do not rewrite stable fs code merely to use a Bun API.

The goal is fewer layers, not performative Bun usage.

---

# Likely Touchpoints

Inspect first, but expect work around:

- `cockpit/server/db.ts`
- `cockpit/server/core.ts`
- `cockpit/server/project.ts`
- `cockpit/server/templates.ts`
- `cockpit/server/sources.ts`
- `cockpit/server/case*.ts`
- `cockpit/server/reach.ts`
- `cockpit/protocol/spec.ts`
- `cockpit/protocol/actions.ts`
- `cockpit/protocol/tools.ts`
- `cockpit/protocol/refs.ts`
- `cockpit/web/App.tsx`
- `cockpit/web/Workspace.tsx`
- `cockpit/web/store.ts`
- `cockpit/web/Surface.tsx`
- cockpit styles
- `skills/cockpit/SKILL.md`
- cockpit tests
- docs/source-map and subsystem/workflow docs

Prefer adding small focused modules such as:

- `cockpit/server/control.ts`
- `cockpit/server/workflows.ts`
- `cockpit/server/capabilities.ts`
- `cockpit/server/screens.ts`
- `cockpit/server/workRequests.ts`
- `cockpit/web/WorkTerminal.tsx`

Names may differ if the repo suggests a better fit.

---

# Do Not Do These

Do not:

- replace `process.mjs`;
- make the hooks depend on the cockpit;
- move Product Model truth into SQLite;
- create a second settlement engine;
- replace the Case's affordance reasoning;
- replace the world debugger;
- replace Dockview;
- add a generic dashboard design;
- add a chat UI;
- add an ORM;
- add another HTTP server framework;
- add a hidden LLM call for command interpretation;
- make package names the primary Skill OS ontology;
- pretend a queued terminal request has executed;
- auto-accept agent work;
- add a large new dependency unless unavoidable;
- change `.sea` or anything outside this repo;
- turn this into a Cognate implementation; this is the Product Actualizer cockpit.

---

# Tests Required

Add/extend tests for at least:

## Database
- v1 → new schema migration preserves existing UI state.
- durable `control_*` rows survive `cockpit rebuild`.
- projection entities/search still rebuild from run files.
- no Product Model/process truth is stored only in control tables.

## Workflow
- default workflow projects current run correctly.
- lens `needs` edges appear correctly.
- current stage/status changes deterministically from run state.

## Capability catalog
- lens metadata becomes capability records correctly.
- `executes_with` remains implementation candidates.
- Reach/provider capability remains distinct.
- unknown implementation availability is not reported as usable.

## Screens
Fixture states deterministically select:
- orient
- execute
- decide/steer
- verify/review
- complete/reuse

Human-pinned/placed surfaces are not moved by screen transitions.

## Work Terminal
- known local commands map to deterministic actions.
- work requests persist.
- pending work appears in context/API.
- unknown phrasing is not hallucinated into a false capability.
- terminal input does not bypass authority.

## Authority
- agent cannot send human-only operations.
- agent cannot accept its own work.
- human can accept cockpit-owned review state.
- Product Model still changes only through the existing router/reconciliation path.

## UI E2E
Exercise:
- Workbench projection
- Work Terminal
- workflow view
- capability view
- task contract
- work request lifecycle
- review/evidence view
- reconnect behavior

## Build
- `bun run test`
- `bun run build`
- compiled `dist/bin/actualize` still works without Node/Bun installed on target as intended by the existing build design.

---

# Documentation Required

Update docs so they tell the truth about the new boundary.

Especially:

- SQLite is no longer globally disposable.
- **Projection tables are disposable.**
- **Cockpit control-plane tables are durable cockpit state.**
- Product/process truth remains in the run directory.
- Workflow/control state cannot settle Product Model truth.
- Work Terminal requests are not automatically execution unless an executor has actually acknowledged them.
- Capability ≠ implementation ≠ executor.

Update the source map.

---

# Implementation Strategy

Work in this order:

1. Read the relevant architecture, cockpit, Case, world-debugger, skills, and tests.
2. Design the SQLite migration and control-plane types.
3. Implement control-plane repository APIs and tests headlessly.
4. Derive the built-in actualization workflow from existing process/lens state.
5. Build the capability catalog from current lens metadata + bindings.
6. Implement deterministic screen selection/composition using existing block grammar.
7. Add typed protocol/actions/tools for control-plane reads/writes.
8. Implement Work Terminal with deterministic local command routing and queued work requests.
9. Project it into the React/Dockview cockpit without breaking human layout ownership.
10. Add WebMCP/MCP exposure where useful.
11. Update context projection for pending work, remaining compact and advisory.
12. Run all tests.
13. Run the compiled build.
14. Update docs/source map.

Do not stop at types or mocks. Exercise the result.

---

# Completion Criteria

This implementation is complete when the following user journey works:

1. Start a normal Product Actualizer run.
2. Open the cockpit.
3. The cockpit projects a deterministic Workbench appropriate to the current run state.
4. The owner can open the workflow and see the real process/lens dependency structure.
5. The owner can inspect a capability and distinguish:
   - categorical capability;
   - implementation candidates/binding;
   - executor/provider availability where known.
6. The owner can type `show me what blocks acceptance` in the Work Terminal and get the appropriate deterministic view without an LLM call.
7. The owner can type a genuine work request such as `verify the current frontend`; it is stored as a typed pending work request rather than fabricated as completed.
8. The agent can read/acknowledge that request through a typed cockpit tool and progress it to `ready_for_review`.
9. The agent cannot accept it for the owner.
10. The Review/Verify Workbench shows real evidence, blockers, artifacts, and acceptance state.
11. `cockpit rebuild` preserves durable control-plane objects while rebuilding process projections.
12. The Product Model and run remain authoritative exactly as before.
13. The entire application still builds through Bun into the existing single executable.
14. Existing tests pass and the new tests prove the new authority/storage boundaries.

The quality test is:

> The cockpit should feel like an instrument panel and a natural-language terminal for purposeful work, where the screen changes deterministically as the work changes — not like a dashboard and not like a chat app.

When finished:
- run the complete test suite;
- build the executable;
- inspect the diff for unnecessary dependencies or duplicated abstractions;
- update documentation;
- commit the implementation with a concise message.
