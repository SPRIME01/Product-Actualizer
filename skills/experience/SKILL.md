---
name: experience
description: Design how actors accomplish their jobs: flows, states, information hierarchy, and interaction behavior, for software and physical interfaces. Use when a product has surfaces to design, repair, or complete.
reads: [actors, capabilities, constraints, form, voice, claims, unknowns, jobs, criteria]
needs: [brand]
executes_with: [impeccable, hallmark]
---
# Experience design

## Reads from the model
`actors` and their jobs, `capabilities` (what can actually be offered), `constraints` (technical latency, hardware inputs, platform), `form`, `voice` for copy, `claims` for factual text, `unknowns` that change flows.

## Distinctions
- **Ownership.** Owns jobs-to-outcomes, flows, state coverage, information hierarchy, and interaction behavior. Direction owns look and feel; brand owns voice; marketing owns acquisition pages' conversion structure; verification owns whether it works.
- **Flow vs. screens.** A flow is trigger, steps, outcome, and what the actor knows at each step. Screens are derived. Time to first value, counted in steps and decisions, is the first number to set.
- **A flow map is inventoried before it is judged.** Number every step and decision with an owner. Each step has one owner, one exit, and one failure path; each decision's branches are labeled and exhaustive and phrased as answerable questions; each handoff between actors is an explicit edge naming what is handed over. Steps are verb-noun, and one term names one concept.
- **An internally consistent map is not a true one.** Whether the flow matches reality is confirmed by someone who runs it; until then the map is `PROPOSED`.
- **State inventory is the design:** empty, first use, loading, partial, success, error (with recovery), offline, denied, destructive-confirm, and extremes (0, 1, many, huge, very long strings). A screen drawn only for typical data is incomplete.
- **Capability-surface correspondence runs both ways.** A surface with no backing capability is a lie; a capability with no surface is invisible. Each is a finding.
- **Recoverability vs. prevention:** undo is cheaper than confirmation dialogs for reversible actions; confirmation is reserved for irreversible ones.
- **Physical interaction model:** inputs (buttons, dials, touch), feedback channels (light, sound, haptic, display), latency from action to feedback, one-handed or gloved use, noise and glare, and what happens at power loss.
- **Accessibility is behavior, not paint:** keyboard path and focus order, accessible names, target size (WCAG 2.2: ≥ 24×24 CSS px minimum; 44 px is the comfortable target), motion preferences, and contrast.
- **Cognitive load has three kinds.** Intrinsic (the task) is structured with steps, defaults, and progressive disclosure; extraneous (confusing navigation, inconsistent patterns, unnecessary steps) is removed; germane (learning) is supported with consistent patterns and feedback. Working memory is a budget: needing something from the previous screen to act on this one is a defect, and roughly four options or items per group is a practical ceiling.
- **Interaction timing details that differ from defaults:** focus indicators appear instantly (no fade); tooltips delay on hover (about 0.8-1 s) but not on focus; auto-rotating content pauses on hover and focus; only transform and opacity are animated, never layout properties; overshoot easing is for physical-feeling interactions only; success toasts are for failures and invisible effects, not for results already visible.
- **A modal is the last resort,** after inline and progressive alternatives. Fake browser, phone, or IDE chrome drawn around a product image is fabricated context; use a real capture.
- **Errors say what happened, why if known, and what to do next,** in the actor's words; empty states are onboarding moments with one clear action; permissions are requested at the moment of need, with the reason stated first.
- **Localization is an interaction concern:** translated strings run materially longer than English (allow roughly 30-40%), right-to-left changes layout and icon direction, and dates, numbers, units, and names have local forms. A layout built for one string length fails on another.
- **Content design:** which words an actor needs at a decision point is experience's call; the register is brand's.
- **Data on screen carries its age.** A reading, balance, or status that never says how old it is lies by omission; staleness, offline, and last-sync are states with their own copy and appearance.

## Failure modes
- **Happy-path-only design** — states missing. *Recognize:* blank cells in the state matrix.
- **Promise screens** — UI for capabilities that do not exist. *Recognize:* a surface with no `OBSERVED` capability behind it.
- **Builder's model** — labels from the codebase or internal jargon. *Recognize:* a UI term absent from actor evidence.
- **Silent degradation** — connection, power, or sync loss leaves the actor trusting stale data. *Recognize:* no state exists for "last update is old" or "device offline".
- **Dead-end error** — message names the failure, not the next step. *Recognize:* an error state with no action.
- **Interaction without feedback** — physical or async actions with no acknowledgement within ~100 ms or no progress for long ones.
- **Consent by trick** — pre-checked boxes, hidden decline, forced account. *Recognize:* the decline path takes more steps than accept.
- **String-length breakage** — layout fits English only. *Recognize:* truncation, overlap, or wrapped buttons under 40% longer text.
- **Unreachable by keyboard** or unlabeled controls. *Recognize:* tab order skips or traps; controls announced as "button" with no name.
- **Overload** — everything visible, no primary action, every metric equal, more than four competing choices. *Recognize:* the single-focus test (name the one action the screen exists for) fails.
- **Unvalidated copy claims** — UI text asserts behavior ("secure", "instant", "synced"). *Recognize:* factual UI string with no ledger id.

## Check
1. State matrix: rows are screens or steps, columns the state list above. No empty cell; "n/a" requires a one-line reason.
2. Flow graph integrity: from the numbered inventory, no orphan or dead-end node, no unlabeled branch, every loop has an exit, every step has an owner, every handoff names its artifact. Each flow is marked confirmed (by whom) or `PROPOSED`.
3. Capability↔surface table: every capability has at least one surface or is marked hidden with a reason; every surface cites a capability id. Unmatched rows fail.
4. Task walk: for each actor job, count steps and decisions from entry to outcome on the built or prototyped flow, compared to the budget in the decision log (set it first). Record actual vs. budget.
5. Automated accessibility pass on each built surface: contrast, accessible names, tab order, target size; failures listed by element.
6. Copy trace: every UI string stating a fact cites a claim id at `OBSERVED`/`VERIFIED`, or is rewritten as non-factual.
7. Localization pass: every surface rendered with strings lengthened by 40%, a right-to-left locale, and a non-English date, number, and name format; no clipped text, no mirrored-wrongly icons.
8. Realistic-data pass: each list/table/title surface was rendered with 0, 1, a maximum-length value, and a large count, and screenshots recorded.

## Writes to proposals
- `capabilities`: surfaces lacking a capability (to build or cut), and capabilities nobody can reach.
- `actors`: jobs, triggers, and constraints found when walking flows (assistive tech, shared devices).
- `constraints` (technical): latency, input, and platform limits found while prototyping.
- `claims`: behaviors confirmed by running the flow, with the run as source.
- `unknowns`: failure behavior nobody has specified, data limits, permissions.
- `decisions`: step budgets and the cut-or-build call for each unmatched surface or capability.
