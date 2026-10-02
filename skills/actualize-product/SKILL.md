---
name: actualize-product
description: Take an incomplete real product (repo, hardware, CAD, images, docs, media, transcripts, any mix) and move it toward a coherent, launchable whole through one shared Product Model. Use when asked to finish, launch, package, or present a product.
---
# Actualize product

You are the orchestrator, the only editor of the model. Load `product-model/SCHEMA.md` first. All work lives in `actualize/` beside the product: `product-model.md`, `proposals.md`, `artifacts/<lens>/`. Every artifact opens with `built_from: model@N`, `reads:` the fields it used (within its lens's `reads`), `cites:` the claim ids it states.

1. **Classify evidence.** List every input with its kind (code, physical/CAD, image, document, transcript, media, none). State the goal and its launch bar (demo, beta, release) in one line; log it as a decision.
2. **Build or update the model.** Run `recon-software` and/or `recon-physical` on what exists; they only propose. Create `product-model.md` from `TEMPLATE.md` (version 1) from their output. Gaps become `unknowns`, never guesses.
3. **Select lenses.** Read only the frontmatter (`description`, `reads`, `needs`) of `skills/*/SKILL.md`. Include a lens only if the evidence and the goal require its output. Add each selected lens's `needs` only when the model lacks that information. Order by `needs`; run lenses with no mutual dependency in parallel; never start a lens before its needs are satisfied. Load a lens body only when you run it. Record the selection and the reason for each exclusion in the decision log. Physical lenses form a chain that loads only on evidence: none for digital-only or passive-object products (a plain `recon-physical` pass suffices for the latter); `electronics` when the product has powered circuitry; `embedded-systems` when it runs firmware or an embedded OS; `robotics` when it senses and acts in a closed loop with software in it. Hardware identity always comes from `recon-physical` first; a lens whose needs the model already answers is marked satisfied, not run.
4. **Reconcile.** After each wave, resolve every open row in `proposals.md`: accept (apply to the model, add a decision row, set status `accepted:D<n>`) or reject (status `rejected` plus a specific reason). Bump `model_version` once per reconciliation that changed anything. Any claim downgrade is applied immediately. A lens whose artifact cites what it proposed (brand, direction, the physical lenses) builds that artifact after its proposals are reconciled, so the artifact records the new version.
5. **Rebuild stale work.** For each artifact, compare `built_from`, `reads`, and `cites` to the decision log per SCHEMA "Versions and staleness". Re-run the owning lens on stale ones, then rebuild only what changed. Unstamped artifacts are stale.
6. **Verify.** Run `release-readiness`, then loop back to step 4 with what it proposes. Stop when the gate passes the bar from step 1, or report the blockers and the unknowns that cause them.

Rules you enforce:
- No public-facing artifact may cite a claim below `OBSERVED`/`VERIFIED`.
- A lens never edits `product-model.md`; produce a defect list for the producing lens or a proposal for the model.
- Existing capabilities named in a lens's `executes_with` are its execution layer when installed; use them, don't reimplement them.
- A state-changing physical action (power, rewiring, flashing, any actuator or motion, destructive configuration) follows `product-model/PHYSICAL-PREFLIGHT.md`; read-only discovery stays separate and is never blocked by it.
- When the cockpit is up (`actualize cockpit status`), prefer it over prose for evidence, comparisons, contradictions, staleness, physical preflights, and judgements only the owner can make: use the `cockpit` skill. Its answers arrive in `actualize inbox`; route each one through proposals and the next reconciliation, then `inbox ack`. The cockpit is optional and never a second decision system.
- Ask the user only when blocked on something no evidence can answer; otherwise log the assumption as `PROPOSED` and continue.
