# Reconstruct a demonstrated experience

Product Actualizer can take a UI walkthrough, video/transcript, screenshot sequence or user notes as **reference experience evidence**, even when there is no donor source code. This is the demonstrated-experience branch of `recon-software`, which otherwise inspects an available source repository.

## Workflow

1. Classify the inputs and their coverage. For an external reference experience, the `actualize-product` router selects and starts `recon-software`, which loads `skills/reconstruct-experience/SKILL.md` **before** inspecting the target architecture or choosing code donors. Ordinary source-only runs skip it.
2. Apply the full owner-supplied v0.2 method in `skills/reconstruct-experience/method-v0.2.md`: evidence timeline, state/affordance graph, causal episodes, narrator guidance, capability invariants, business/economic semantics, target deltas and validation traces.
3. Save source-index, graph, capability contracts, validation traces and handoff under `actualize/evidence/recon-software/reconstruct-experience/`. See `skills/reconstruct-experience/references/model-handoff.md` for the exact source and grade crosswalk.
4. Write proposed changes to `actualize/proposals.md`. The router alone assigns canonical Product Model IDs, reconciles, records decisions and edits `product-model.md`. Both observed reference behavior and proposed target behavior remain independently auditable.
5. `experience` shapes the reconciled target flows; an implementation agent searches open-source donor mechanisms only **after** obligations are explicit. `legacy-modernization` handles edits to an existing target. `fidelity-qa` and `release-readiness` verify actual output against the traces, not against screenshots alone.

## A minimal example

A transcript says “click Run and it remembers your prior step,” and a screenshot shows a Run button. The button's presence is `OBSERVED` if the screenshot was inspected, while persistence is still `REPORTED` unless the action and resumed state are actually demonstrated. The target may require durable resumption as a `PROPOSED` capability, with a validation trace that restarts the app and checks the recovered state. A SQLite event log is a candidate mechanism, not part of the behavioral requirement.

## Guarantees and limitations

No binary decompiler, REA server or Node runtime is required. The reference may be completely closed-source. UI evidence does **not** by itself establish backend semantics, security, concurrency, performance or complete behavioral equivalence. Record the coverage boundary and blocking unknowns instead of asserting unseen behavior.

The reconstruct-experience skill is a `kind: tool` called from the active `recon-software` lens (not another lens): it creates evidence and proposed inputs for the single Product Model. Its full original methodology is retained verbatim, and its use is conditional rather than part of every run.
