---
name: reconstruct-experience
description: Reverse-engineer a demonstrated application's UX, workflow, business semantics, and operating economics from video evidence, transcripts, screenshots, and user notes; recover states, affordances, transitions, invariants, rationale, settings, pitfalls, costs, and target capabilities before implementation.
---

# Reconstruct Experience

## Purpose

Reconstruct how an application **behaves for a user**, what business/domain logic gives that behavior meaning, and what operating/economic constraints shape the workflow.

Then convert that reconstruction into an implementation-independent target experience that can be engineered directly or handed to a system such as Cognate.

This is not a screenshot-cloning skill.

Treat the demonstrated product as **evidence about a solved experience**, not as the architecture or implementation that must be copied.

The governing transformation is:

**evidence → observed experience → interaction model → capabilities/invariants → business model & economics → recommendations + user deltas → target experience → validation traces**

The skill succeeds when another engineer or agent can reproduce the intended experience without needing to re-watch the source material and without silently inventing missing product behavior.

---

# Use This Skill When

Use this skill when the user provides some combination of:

- a YouTube or other video link showing an application in use;
- a transcript or timestamped notes;
- screenshots or frames from the demonstration;
- notes about features, UI elements, behaviors, settings, or workflows that matter;
- presenter recommendations, complaints, workarounds, or warnings;
- user instructions about what should be retained, changed, removed, or improved;
- business rules, domain rules, KPIs, pricing, quotas, billing, cost, or other economic details;
- optionally, a target repository or implementation environment to actualize the reconstructed experience.

The source may be a tutorial, walkthrough, review, comparison, demo, troubleshooting session, product tour, or workflow demonstration.

Do not require every input type. Work with the evidence available and explicitly mark what is unknown.

If a video URL is provided but the environment cannot directly watch or inspect the video, do **not** imply that the video was viewed. Treat the URL as provenance and reason from the transcript, screenshots, timestamps, and other accessible evidence.

---

# Core Doctrine

## 1. Reconstruct behavior before designing implementation

Do not jump from screenshot to component or from narration to code.

First recover:

**state → available affordance → user action → system response → resulting state → user purpose**

Implementation decisions come afterward.

A screenshot is not merely a picture. It is evidence of a **user-operable state**.

A transcript is not merely narration. It can contain semantics unavailable from pixels: purpose, causality, recommendations, configuration guidance, warnings, limitations, business rules, cost mechanics, and mental models.

---

## 2. Keep facts, testimony, inference, and target decisions separate

Every material claim must belong to one of these epistemic classes:

- **OBSERVED** — directly visible in a screenshot, frame, or accessible video evidence.
- **NARRATED** — explicitly stated by the presenter.
- **USER-SPECIFIED** — explicitly required, preferred, rejected, or corrected by the user.
- **INFERRED** — the most plausible explanation connecting evidence, but not directly proven.
- **UNKNOWN** — evidence is insufficient or contradictory.
- **TARGET** — a deliberate decision about what the reconstructed implementation should do.

Never convert an inference into an observation.

Never rewrite the observed product to match a recommendation.

Never describe a user-requested target behavior as though it existed in the donor.

If evidence conflicts, preserve the conflict and identify it.

---

## 3. The donor is not the specification

Distinguish **capability** from **implementation choice**.

For every consequential mechanism ask:

1. What outcome does this give the user?
2. What behavior must remain true for that outcome to exist?
3. Which visible implementation choices are merely one way of achieving it?
4. What constraints appear to have shaped the donor?
5. Do those constraints exist in the target?
6. Would we rebuild this mechanism the same way if starting fresh?
7. Has the presenter or user identified a better form?

Example:

Observed implementation:
`execution details → modal`

Recovered invariant:
`user can inspect execution details without losing editing context`

Possible target:
`persistent side inspector`

Preserve the invariant unless the user specifically requires visual or structural fidelity.

---

## 4. Reconstruct the whole local world, not only the narrated control

When analyzing a screenshot or frame, inspect all meaningful visible UI, including elements the presenter does not mention.

Look for:

- navigation and hierarchy;
- tabs and selected state;
- buttons and icon controls;
- menus and dropdowns;
- inputs and search;
- toggles and settings;
- toolbars;
- sidebars and inspectors;
- status indicators;
- badges;
- breadcrumbs;
- data views;
- contextual actions;
- disabled controls;
- empty states;
- notifications;
- keyboard hints;
- overlays;
- split panes;
- resize affordances;
- drag/drop regions;
- progress and loading state;
- error/warning state;
- visible relationships between controls and content.

For each element, distinguish:

- what is visibly present;
- what appears actionable;
- what action is actually demonstrated;
- what action is merely inferred.

Do not assume an element is clickable simply because it visually resembles a button.

---

## 5. Reconstruct temporal causality

Screenshots become useful when connected across time.

Prefer bounded **interaction episodes**:

**BEFORE → ACTION → RESPONSE → AFTER**

An interaction episode should capture:

- starting state;
- trigger/action;
- target control;
- prerequisites if known;
- immediate visual/system response;
- resulting state;
- visible delta;
- user goal;
- downstream affordances unlocked or removed;
- failure/alternative paths if demonstrated;
- evidence references.

When the transcript says "click X" and the next screenshot shows Y, this supports a causal hypothesis. Record it as NARRATED + OBSERVED and mark the transition INFERRED unless the action itself is directly visible or otherwise explicit.

---

## 6. Treat narration as semantic evidence

Classify relevant presenter statements into one or more categories:

- **BEHAVIOR** — what the system does.
- **PURPOSE** — why the user performs an action or why a feature exists.
- **CONFIGURATION** — settings, values, modes, prerequisites, defaults.
- **DEPENDENCY** — what must exist or be connected first.
- **RECOMMENDATION** — what the presenter advises doing.
- **PITFALL** — what causes problems or should be avoided.
- **WORKAROUND** — how the presenter compensates for a limitation.
- **LIMITATION** — what the product cannot do or does poorly.
- **MISSING_CAPABILITY** — functionality the presenter wishes existed.
- **MENTAL_MODEL** — how the presenter conceptualizes the feature or workflow.
- **RATIONALE** — why a configuration or interaction choice matters.
- **PREFERENCE** — presenter habit that may not be objectively required.
- **BUSINESS_RULE** — domain rule that determines what a correct outcome means.
- **VALUE_RULE** — what constitutes useful or valuable output.
- **ECONOMIC_RULE** — pricing, quota, billing, cost, utilization, or resource constraints.

Do not treat preference as requirement unless the user adopts it.

---

## 7. Recover negative space

Look for behavior implied by what **does not** visibly break or reset.

Examples:

- tab changes preserve work → state persistence may be expected;
- closing an inspector returns to the prior context → inspector is probably contextual rather than navigational;
- a control disappears during execution → affordance availability is state-dependent;
- selection survives navigation → selection may belong to broader session state;
- the presenter avoids a control and explains why → the available path may be technically valid but operationally undesirable.

Label these as INFERRED unless directly confirmed.

Negative-space inference is useful, but confidence must remain proportional to evidence.

---

# Evidence Identity

Assign stable IDs so conclusions remain traceable.

Recommended prefixes:

- `E-###` — evidence item
- `S-###` — UI/application state
- `I-###` — interaction episode
- `A-###` — affordance
- `C-###` — capability/invariant
- `B-###` — business/domain invariant
- `X-###` — economic/product invariant
- `R-###` — presenter recommendation or warning
- `D-###` — target delta
- `T-###` — target requirement
- `V-###` — validation trace
- `U-###` — unresolved unknown

Evidence IDs should identify the actual source when possible:

`E-014 — screenshot_07.png`
`E-015 — transcript 12:41–13:03`
`E-016 — video 08:42–08:46`
`E-017 — user note: persistent search desired`

When timestamps are available, preserve them.

---

# Procedure

## Phase 0 — Fingerprint the evidence

Before detailed analysis, identify what is actually available.

Record:

- source video/link;
- transcript availability and whether timestamps exist;
- screenshot count and rough coverage;
- user annotations;
- whether screenshots correspond to known timestamps;
- whether the live product or target repository is available;
- whether the task is reconstruction only or reconstruction + target redesign + implementation handoff.

Also characterize the demonstration:

- end-to-end workflow vs isolated feature;
- mostly static vs interaction-heavy;
- tutorial vs review vs troubleshooting;
- single happy path vs multiple branches;
- presenter mostly descriptive vs strongly opinionated;
- whether business rules or economic constraints materially shape the demonstrated workflow.

Do not stall because an input is missing. State the limitation and continue with available evidence.

---

## Phase 1 — Build an evidence timeline

Align transcript segments, screenshots, and user notes chronologically when possible.

Identify **high-salience windows** where one or more of these occurs:

- significant visual change;
- click or navigation;
- menu, modal, inspector, or panel appearing;
- state change;
- workflow branch;
- configuration;
- error or warning;
- presenter says "important," "don't," "always," "never," "because," "recommend," "problem," "wish," "configure," "instead," or equivalent language;
- presenter explains why a feature exists;
- presenter demonstrates a workaround;
- presenter states a business rule, KPI, calculation rule, decision criterion, pricing rule, quota, cost, or billing distinction.

Use the timeline to determine which evidence belongs to the same interaction episode.

---

## Phase 2 — Inventory observed states

For each materially distinct UI state:

1. assign a state ID;
2. state the user's apparent context and goal;
3. enumerate meaningful visible UI;
4. identify current selections, statuses, and modes;
5. list demonstrated affordances;
6. list plausible but unverified affordances separately;
7. record entry conditions if known;
8. record exit actions/transitions if known;
9. attach evidence IDs.

Two screenshots should be separate states when the difference changes what the user can know or do, not merely because pixels differ.

---

## Phase 3 — Reconstruct interaction episodes

Connect states using BEFORE → ACTION → RESPONSE → AFTER.

Use this structure:

**Interaction I-### — [short name]**

- Before: `S-###`
- User goal:
- Trigger/action:
- Control/target:
- Preconditions:
- Immediate response:
- Visible delta:
- After: `S-###`
- New affordances:
- Removed/disabled affordances:
- Presenter rationale:
- Business rule involved:
- Economic/resource effect:
- Pitfalls/configuration:
- Evidence:
- Confidence:
- Unknowns:

Do not invent transitions merely to make the graph complete.

---

## Phase 4 — Extract presenter intelligence

Create a separate record of everything the presenter contributes beyond raw UI observation.

For each consequential statement capture:

- category;
- paraphrased statement;
- timestamp/source;
- feature/workflow affected;
- whether it describes current behavior or desired behavior;
- operational reason;
- consequence if ignored;
- confidence/context.

Particularly preserve:

- recommended settings and exact values;
- why those settings matter;
- prerequisites;
- failure modes;
- known bugs;
- workflow shortcuts;
- anti-patterns;
- "I wish..." statements;
- workarounds indicating missing product capabilities;
- business rules defining correct output;
- KPIs or metrics the workflow is intended to preserve or improve;
- pricing, billing, quota, token, compute, time, or resource implications.

---

## Phase 5 — Build the Experience Graph

Model the demonstrated experience as a graph:

- nodes = meaningful states;
- edges = user/system transitions;
- edge labels = actions/events;
- state annotations = available affordances;
- transition annotations = prerequisites, responses, effects, business rules, and failure cases.

A useful state exposes a **small local world** rather than the entire product action space.

Example:

`project.list`
→ create project
→ search projects
→ open project

`project.open`
→ open document
→ configure project
→ run workflow

`document.editing`
→ edit
→ save
→ run
→ inspect

The graph should make it possible to answer:

**"From this state, what can the user intentionally do next, and what happens?"**

---

## Phase 6 — Extract capabilities and invariants

Now perform the Jennings pass.

For each important donor behavior, derive the implementation-independent capability.

Use:

**Capability C-### — [name]**

- User outcome:
- Observed donor mechanism:
- Behavioral invariant:
- Why it matters:
- Constraints/prerequisites:
- Presenter guidance:
- Donor-specific implementation choices:
- Could those choices be different?:
- Target implication:
- Evidence:
- Confidence:

Prefer requirements such as:

`User can inspect execution details without losing editing context.`

over:

`Use a modal inspector.`

Prefer:

`User can discover all runnable actions available in the current state.`

over:

`Use a toolbar with four buttons.`

Visual form becomes a requirement only when the visual form itself materially contributes to the desired experience or the user explicitly requires fidelity.

---

# Phase 7 — Business Model & Economics Pass

This phase is mandatory whenever the source contains business rules, domain semantics, KPIs, monetization, pricing, billing, quotas, compute/resource constraints, operational costs, or value judgments.

Treat this as two separate analyses.

---

## 7A — Domain / Business Semantics

Recover what makes an output **correct, meaningful, or valuable in the user's domain**.

Ask:

1. What business/domain rules determine whether the workflow output is correct?
2. Which metrics or entities have formal meanings that must not change?
3. What distinctions must remain visible to avoid misleading the user?
4. Which source artifacts or rules are authoritative?
5. What inputs/tests/evidence must be preserved?
6. What business outcome is the workflow actually trying to produce?
7. Which UI choices are downstream representations of that business truth?
8. What would constitute a technically working but semantically wrong result?
9. Are there scope distinctions such as local vs global, gross vs net, projected vs actual, draft vs approved, scheduled vs completed?
10. Do recommendations or workarounds reveal hidden business constraints?

Create explicit records:

**Business Invariant B-### — [name]**

- Business/domain rule:
- Why it exists:
- Source of truth:
- Representations depending on it:
- Failure if violated:
- User-visible consequence:
- Can implementation change while preserving it?:
- Target enforcement opportunity:
- Evidence:
- Confidence:

Examples:

`Cancelled orders contribute zero revenue.`

`A selected-product metric must not be presented as a whole-company metric.`

`A delivery receipt does not mean the business outcome completed.`

The key transformation is:

> **business/domain model → computation/decision → evidence → representation**

not:

> **UI → plausible output → assume correctness**

---

## 7B — Product / Operating Economics

Recover what makes the workflow **costly, scarce, billable, bounded, or economically meaningful**.

Ask:

1. What is actually being consumed?
   - model tokens;
   - API calls;
   - compute;
   - storage;
   - human attention;
   - execution time;
   - licenses;
   - seats;
   - credits;
   - tool invocations;
   - external services.

2. What is the economically meaningful unit?
   - prompt;
   - run;
   - session;
   - task;
   - workflow;
   - user;
   - seat;
   - document;
   - request;
   - outcome.

3. Who pays?
   - application vendor;
   - API account;
   - signed-in subscription;
   - customer;
   - enterprise;
   - local compute.

4. What causes cost or resource usage to increase?
   - deeper reasoning;
   - retries;
   - delegation;
   - tool calls;
   - background jobs;
   - large context;
   - screenshots;
   - browser automation;
   - persistent workers.

5. What usage is visible to the user and what is hidden?
6. What quotas, limits, or rate distinctions exist?
7. What settings materially change cost, latency, or resource use?
8. What does the product imply about locality vs remote execution?
9. What does "free/open source/local" actually mean economically?
10. What should the user be able to inspect before, during, and after a run?

Create:

**Economic Invariant X-### — [name]**

- Scarce/billable resource:
- Economic unit:
- Cost driver(s):
- Payer/funding route:
- User-visible control:
- User-visible telemetry:
- Failure/misunderstanding risk:
- Target implication:
- Evidence:
- Confidence:

Example:

`One prompt may fan out into multiple model calls and tool executions; therefore run-level usage is more meaningful than prompt count.`

---

## 7C — Business/Economic Coupling

Look for places where business value and execution cost interact.

Ask:

- Is higher-cost reasoning justified only for certain tasks?
- Are some verification steps expensive but necessary?
- Does automation reduce repeated human effort while increasing compute?
- Is there a point where the cost of supervision exceeds the value of autonomy?
- Does the workflow expose enough information for the user to judge value-per-run?
- Does the product's pricing or quota model influence recommended workflow design?
- Are there failure modes where the system optimizes for low cost but damages business correctness, or vice versa?

Where useful, derive:

> **Value produced / resources consumed**

Do not invent ROI calculations unless the evidence supports them.

---

## Phase 8 — Apply recommendations and user deltas

Maintain three separate models:

### OBSERVED
What the demonstrated product actually appears to do.

### PROPOSED
Changes, recommendations, complaints, workarounds, or missing capabilities stated by the presenter.

### TARGET
What the user wants the implementation to do after considering observed behavior and proposed improvements.

User requirements control TARGET, but they do not overwrite OBSERVED history.

For every meaningful difference create a delta:

**Delta D-###**

- Observed:
- Presenter recommendation:
- User requirement:
- Target decision:
- Why:
- Capability preserved/improved:
- Business invariant preserved:
- Economic implication:
- Acceptance implication:

If the user has not made a target decision, preserve options rather than silently choosing.

---

## Phase 9 — Reconstruct settings, dependencies, and pitfalls

Produce a coherent operational configuration model.

For every setting mentioned:

- location/context where configured;
- available value(s) if evidenced;
- demonstrated/recommended value;
- default if known;
- prerequisites;
- why the presenter recommends it;
- consequences of incorrect configuration;
- interactions with other settings;
- cost/latency/resource implications if relevant;
- whether the target should preserve the setting or make the correct behavior automatic.

For every pitfall:

- triggering condition;
- symptom;
- user consequence;
- business consequence;
- economic/resource consequence;
- workaround;
- target mitigation opportunity.

A workaround is evidence that the donor's implementation may contain an accidental constraint. Consider removing the need for the workaround in TARGET.

---

## Phase 10 — Identify unknowns and contradictions

Never hide gaps.

For each unknown record:

- what is unknown;
- why the current evidence cannot resolve it;
- which behavior depends on the answer;
- which business/economic conclusion depends on the answer;
- how important it is;
- the cheapest additional evidence that would resolve it.

Prioritize unknowns:

- **BLOCKING** — implementation would be unsafe or materially ambiguous.
- **IMPORTANT** — implementation can proceed, but fidelity may suffer.
- **NON-BLOCKING** — can be decided during implementation.

Do not ask the user for more information merely to increase completeness. Ask only when a BLOCKING unknown prevents a reliable target decision. Otherwise continue and expose the uncertainty.

---

## Phase 11 — Generate validation traces

Turn important demonstrated workflows into implementation-independent acceptance traces.

Use:

**Validation V-### — [workflow]**

**Given**
- starting conditions
- business/domain invariants
- budget/authority constraints if relevant

**When**
- user action(s)

**Then**
- required system response
- required visible state
- required business-semantic outcome
- required persistence/side effects
- required evidence
- prohibited failure behavior
- expected economic/resource visibility if relevant

Whenever useful, continue the trace through multiple actions.

Example:

**Given**
- project is open
- runnable document is selected
- protected tests exist

**When**
- user activates Run

**Then**
- execution begins
- execution status becomes visible
- run action becomes unavailable or transforms appropriately
- execution details become inspectable
- protected evidence is not mutated without approval
- usage/cost remains observable

**When**
- user inspects a completed step

**Then**
- step details appear
- editing context remains intact

These traces are the primary bridge to implementation and E2E validation.

---

# Output Contract

Unless the user requests a different format, return a reconstruction with these sections:

## 1. Experience Thesis
A compact explanation of what the workflow is fundamentally helping the user accomplish and the governing UX model.

## 2. Evidence Coverage
What evidence was actually available, what could be directly inspected, and important limitations.

## 3. Workflow Reconstruction
The demonstrated workflow in chronological/causal order.

## 4. State & Affordance Model
Meaningful application states and what the user can do from each.

## 5. Interaction Episodes
The important BEFORE → ACTION → RESPONSE → AFTER transitions.

## 6. UI Inventory
Visible controls, surfaces, status elements, navigation, contextual tools, and state-dependent availability.

## 7. Presenter Intelligence
Recommendations, rationale, settings, pitfalls, limitations, workarounds, and desired changes.

## 8. Capability / Invariant Model
What must remain true regardless of implementation.

## 9. Business Model & Economics
Separate:
- domain/business semantics;
- product/operating economics;
- important coupling between value and resource use.

## 10. Target Deltas & Recommendations
Observed vs proposed vs user-requested vs target behavior.

## 11. Settings & Operational Rules
Configuration, prerequisites, dependencies, defaults if known, and consequences.

## 12. Unknowns & Confidence
Unresolved questions, contradictions, and confidence levels.

## 13. Validation Traces
Behavioral acceptance scenarios suitable for implementation verification.

## 14. Engineering Handoff
Only when implementation is requested: the minimum target-experience specification needed by Cognate or another engineering agent.

Do not bury source status. Evidence and inference labels should remain visible wherever the distinction affects correctness.

---

# Engineering Handoff Rules

If the user asks to implement the reconstructed experience, or to prepare it for Cognate:

1. Finish the reconstruction before inspecting or reasoning deeply about target implementation.
2. Do not allow the existing codebase to reinterpret what the evidence showed.
3. Hand off **target behaviors and invariants**, not screenshot-cloning instructions.
4. Include business/domain invariants as first-class constraints.
5. Include product/economic invariants where they affect model choice, budget, latency, authority, or workflow topology.
6. Include validation traces as acceptance criteria.
7. Preserve user-specified technology and architecture constraints.
8. Prefer native mechanisms already present in the target system when they satisfy the recovered invariant.
9. Introduce new dependencies only when they unlock a capability that the target cannot reasonably provide otherwise.
10. Do not port donor architecture merely because it is visible or familiar.
11. If code donors are used later, treat them as mechanism references, not architecture authorities.
12. Record deliberate departures from the demonstrated implementation.
13. Where possible, enforce business invariants structurally rather than relying on prompt obedience.
14. Where possible, expose cost/usage at the same level the user reasons about the work.

A Cognate-ready handoff should answer:

- What user outcomes must exist?
- What states matter?
- What affordances are available in each state?
- What transitions must occur?
- What information must remain visible or persistent?
- What settings and constraints govern behavior?
- What domain/business rules define correctness?
- What evidence must remain protected?
- What donor limitations should not be reproduced?
- What presenter recommendations have been adopted?
- What user deltas control the target?
- What resource/cost model shapes execution?
- What should the user be able to inspect about usage?
- What validation traces prove completion?

---

# Confidence Rules

Use qualitative confidence deliberately:

**HIGH**
Direct visual evidence and/or explicit narration agree.

**MEDIUM**
Strong temporal/contextual inference supported by multiple clues.

**LOW**
Plausible interpretation based on limited evidence.

Do not use confidence to disguise unsupported claims.

When two explanations fit equally well, preserve both or mark UNKNOWN.

---

# Anti-Patterns

Never:

- clone screenshots without reconstructing behavior;
- focus only on UI elements explicitly mentioned by the presenter;
- infer hidden system architecture from visual appearance without evidence;
- treat presenter opinion as observed product behavior;
- treat user target requirements as donor facts;
- collapse current behavior and recommended behavior together;
- invent missing transitions to make the workflow look complete;
- assume all visible controls are active or clickable;
- assume a modal, sidebar, tab, page, menu, or routing structure is an invariant;
- let implementation convenience redefine the recovered UX;
- optimize the target before understanding the donor's actual behavior;
- over-document insignificant pixels while missing causal workflow;
- treat business rules as incidental prompt text;
- infer ROI, pricing, or cost not supported by evidence;
- confuse a local UI with local inference/compute;
- treat a prompt as the economic unit when the workflow fans out into multiple operations;
- confuse dispatch/delivery with business completion;
- hide unknowns;
- claim to have watched inaccessible video.

---

# Completion Test

The reconstruction is complete enough to hand off when all important demonstrated workflows satisfy these conditions:

1. The starting state is known.
2. The user's goal is known or reasonably identified.
3. Material visible affordances are inventoried.
4. Demonstrated actions are connected to resulting states.
5. Presenter recommendations, settings, pitfalls, and rationale are captured.
6. Observed behavior is separated from inference and target decisions.
7. Major behaviors have been reduced to implementation-independent capabilities/invariants.
8. Business/domain rules that define correctness are explicit.
9. Product/economic constraints that materially shape execution are explicit.
10. User-requested differences are represented as explicit target deltas.
11. Blocking unknowns are surfaced.
12. Acceptance traces can verify the target without needing to re-watch the source.
13. Another agent could tell whether an output is not just technically working, but semantically correct.
14. Another agent could tell what a run costs or consumes when that is material to the experience.

The final test is:

> **Could an implementation agent build the intended experience, and could a second agent verify its behavior, business correctness, and material operating constraints using this reconstruction without silently inventing product behavior?**

If yes, the reconstruction is ready.

---

# Invocation Behavior

When this skill is invoked with evidence:

- begin reconstructing immediately;
- do not spend the response explaining the methodology unless the user asks;
- use the source material as evidence, not inspiration;
- be exhaustive about meaningful controls and behavior, but concise about decorative detail;
- connect UI elements to user actions and outcomes;
- preserve provenance;
- surface contradictions and uncertainty;
- prefer causal workflow over screen-by-screen description;
- extract business/domain semantics even when they are mentioned casually;
- extract product/economic mechanics when they materially shape the workflow;
- distinguish technical completion from business completion;
- distinguish interface locality from execution locality;
- end with the target experience or next engineering handoff appropriate to the user's request.

If the user asks only for reconstruction, stop after the reconstruction.

If the user asks for recommendations, perform the Jennings pass and Business Model & Economics Pass, then propose a target while preserving the observed model.

If the user asks to build or hand off to Cognate, produce the engineering handoff and validation traces only after the reconstruction is sufficiently grounded.