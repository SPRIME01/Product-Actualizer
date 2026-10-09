# Reconstruct experience → Product Model handoff

Use this contract **after** the complete `method-v0.2.md` reconstruction and **before** the router's initial reconciliation. The experience dossier is evidence, not a second model, and is never silently promoted to product truth.

## Dossier (in the target product's run)

Write these under the active `recon-software` lens's `actualize/evidence/recon-software/reconstruct-experience/` directory:

- `source-index.md`: evidence ID, input filename/URL and accessible span, type, timestamps, coverage and limitations. Never claim an inaccessible video was watched or echo secrets from a capture.
- `experience-graph.md`: `S-###` states, `A-###` affordances, `I-###` episodes, trigger, guard/precondition, response, next state, and unknown transitions.
- `capability-contracts.md`: `C-###` outcome/invariant, `B-###` business invariant and `X-###` economic invariant where present; donor-specific choices explicitly excluded from target requirements unless chosen.
- `validation-traces.md`: `V-###` Given/When/Then including failure states and observable outcomes; label each trace **unexecuted** until tested against the target.
- `handoff.md`: evidence coverage, `D-###` observed→target deltas, blocking unknowns, model-proposal crosswalk, mechanism-neutral obligations, and which acceptance traces apply.

Always cite source IDs and locator/timestamp; one combined document is acceptable only when the five named sections remain directly re-openable. Do not overwrite original screenshots or transcripts when producing summaries.

## Provenance and grade crosswalk

| Method label | Product Model disposition | Boundary |
|---|---|---|
| `OBSERVED` | `OBSERVED` claim of what was directly inspected | A visible control establishes presence, **not** underlying execution. Only a witnessed interaction supports the behavior actually seen. |
| `NARRATED` | `REPORTED` | Cite transcript/source span. Presenter testimony does not become direct observation. |
| `USER-SPECIFIED` | `PROPOSED` target decision, or an attributed owner requirement | Do not claim the donor already does it; do not attribute owner requirements to a presenter. |
| `INFERRED` | `INFERRED` (cite existing Product Model parent claim IDs), or `UNKNOWN` if no adequate grounding | Must not exceed the weakest parent or invent parent claim IDs before reconciliation. |
| `UNKNOWN` | `unknowns` row, or `UNKNOWN` claim with matching unknown row | Record cheapest discriminating evidence; do not fill holes to complete a graph. |
| `TARGET` | `PROPOSED` requirement/decision | Desired behavior only; never cite as verified existing capability. |
| conflicting sources | `CONTRADICTED` claim with both source locations, plus blocker if material | Keep disagreement visible until resolved by new evidence. |

`VERIFIED` is **not** an input grade from this method: promote an accepted claim only when an independent check capable of failing actually ran, or other Product Model verification conditions hold.

## Identity and routing

The method's `C-###`, `D-###`, `U-###` are local dossier IDs and may collide with Product Model `C1`, `D1`, `U1`. Keep them source-scoped; assign canonical IDs only during router reconciliation. A proposal should cite `evidence/recon-software/reconstruct-experience/<file>#<section>` and local source IDs, then record the resulting canonical ID in `handoff.md` after reconciliation.

- Demonstrated donor capability → `capabilities` proposal **only scoped to the donor**; when targeting a new product, propose its desired capability separately as `PROPOSED` until built.
- Observable control/transition → `form`, `claims`, `unknowns` proposals with appropriate evidence grades.
- Actual user objective → `actors`, `jobs`, `criteria`, or `purpose`, with attribution and no invented measurements.
- Business invariants/cost constraints → `constraints`, `claims`, `criteria` as warranted; reported rules remain reported until checked.
- Target deltas and selected behavioral obligations → `decisions` or `capabilities` as proposals, never direct edits.
- Acceptance traces stay in evidence and are consumed by `experience` / `fidelity-qa` / `release-readiness`; their **existence never equals passing**.

## Acceptance

Before reconciliation, check that every material proposal cites re-openable evidence, that external behavior and desired behavior remain separate, and that no unobserved transition became `OBSERVED` or `VERIFIED`. After reconciliation, each accepted requirement must be traceable back to its dossier ID and forward to at least one `V-###` acceptance trace where behavior is relevant.

If the reference is inaccessible, record the incomplete coverage; request additional evidence only for blocking unknowns. Source-only runs do **not** require or invoke this skill.
