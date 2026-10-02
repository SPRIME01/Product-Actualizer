# Concepts

## One model, many lenses

Every artifact (UI, brand, renders, site, film, copy) is derived from one **Product Model**, `actualize/product-model.md`.
A **lens** is a skill that represents the problem the way a professional in one field does: the distinctions they make,
the failure modes they know, and the checks they run. Lenses are not tool wrappers; a lens's `executes_with` names existing
skills (hallmark, impeccable, ffmpeg, and others) that do the execution when installed.

## The model's fields

purpose · actors and their jobs · capabilities · constraints (technical, physical, legal) · form and interaction ·
voice · positioning · **claims ledger** · **unknowns** · **decision log**. The full definition is `product-model/SCHEMA.md`.

## Claims and evidence grades

Every statement the product may make is a row in the claims ledger with a grade and a source you can re-open.

| grade | meaning |
|---|---|
| `OBSERVED` | seen directly in the artifact or source |
| `VERIFIED` | tested by running or measuring it |
| `REPORTED` | stated by someone, not checked |
| `INFERRED` | concluded from other evidence |
| `PROPOSED` | a decision or assumption, not a fact |
| `UNKNOWN` | no evidence |
| `CONTRADICTED` | evidence says the opposite |

Public-facing copy may cite only `OBSERVED` or `VERIFIED` claims. A README that says "SMS alerts" while the code raises
`NotImplementedError` becomes a `CONTRADICTED` claim, and no page may promise it.

## Roles and ownership

- **Only the router edits the model.** Lenses write discoveries and change requests to `proposals.md`.
- **Proposals are resolved explicitly.** Each is accepted (applied, with a decision row) or rejected (with a specific reason).
- **Lenses own distinct territory.** For example, brand owns who the product is; marketing owns how attention is acquired.

## Versions and staleness

The model has a version. Each accepted change is a numbered decision that creates a new version. Every artifact records
`built_from: model@N`, the fields it `reads`, and the claim ids it `cites`. An artifact is **stale** when a later decision
touched a field it reads or a claim it cites; a decision touching only unrelated fields does not stale it. Stale artifacts are
re-run by their lens. Artifacts without a stamp count as stale.

## Dependencies and parallelism

A lens's `needs` lists lenses whose output must exist first. The router orders lenses by `needs`, runs independent ones in
parallel, and never builds a downstream artifact before its inputs exist.

## Verification by execution

`release-readiness` does not review; it runs the install, the flow, the link, the alert path, and records the result against
the claim. A claim that fails when run is downgraded immediately and the artifacts citing it become stale.
