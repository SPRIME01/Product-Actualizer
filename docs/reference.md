# Reference (index)

The exact tables live in the [Layer 8 reference](#layer-8-reference) below. This page keeps the two
cross-cutting summaries that do not belong to a single subsystem.

## Repository checks

`python3 tests/check.py` enforces: router at most 40 lines, schema at most 120, lenses 60 to 100, references linked from their lens and at most 150 lines, required sections, the physical lens chain and
routing scenarios (digital-only and passive products load no physical lens), both walkthroughs' models against the schema, artifact staleness (with expected results), grade discipline, the hardware evidence
package (manifest, revision contradictions, component profiles and sources), re-execution of the executed evidence (power budget, pin check, host tests, with a negative control), and the release gate's physical evidence walk
(with mutations that must fail). `bun test` replays both walkthroughs through the hook engine.

`check.py` deliberately does **not** check four things, so do not assume they are enforced:
`proposals.md` (it never opens the file — the status vocabulary and the "reason is required, never 'not needed'"
rule are enforced at runtime by the engine, see [CLI reference](reference/cli.md)), the prose content of lens
bodies, the shape of `product-model/TEMPLATE.md` against the schema, and the nine preflight fields in
`product-model/PHYSICAL-PREFLIGHT.md`.

## Lenses

The canonical lens table — each lens's exact `reads`, `needs`, and `executes_with` — is in
[reference/lenses.md](reference/lenses.md), with the dependency graph and what each lens owns. `actualize lenses`
prints the same metadata from the frontmatter without loading any lens body.
