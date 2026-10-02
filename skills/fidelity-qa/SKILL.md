---
name: fidelity-qa
description: Check built visual output against its source of truth (design tokens, product facts, CAD, spec) with measurements rather than impressions. Use after any visual artifact is produced and before release.
reads: [form, constraints, claims, decisions]
needs: []
executes_with: [playwright-cli, agent-browser]
---
# Visual fidelity QA

## Reads from the model
`form` and `constraints` (physical truths a visual must respect), `claims` (statements visible in output), `decisions` (direction rules, tokens, breakpoints, supported targets, waivers).

## Distinctions
- **Ownership.** Owns comparing what was built to what it should match, by measurement. Producing lenses fix defects they own. Release-readiness owns the gate and cross-artifact coherence; provenance-licensing owns rights.
- **Fidelity to what?** To the tokens and rules (design), to the product (form facts), to the spec (dimensions, colors), or to itself across targets (browsers, devices, themes). A check names its oracle (a baseline image in a controlled state, a token set, a measured dimension, a reference photo); "looks right" and "looks impressive" have none.
- **The producer must not verify itself.** A build step that checks its own output re-applies its own misunderstanding. Checks run as separate steps that open the delivered artifact fresh and compare content (pixel dimensions, bound image hash, glyphs rendered), not existence ("file is present", "texture bound").
- **Expected values come from the requirement source.** Drawings, supplied references, and the requester's verbatim words are the ground truth for what is wanted; measurements are the ground truth for what is. Expectations transcribed from the builder's own reading certify only self-consistency, so each criterion cites its source.
- **Numeric and visual checks catch disjoint defects.** Assertions can all pass on a broken render (parts floating clear of each other overlap nowhere); an image review can miss a 2% dimension error. Both run; neither substitutes for the other.
- **Objective pixel checks and subjective realism checks are different gates.** Background value, subject fill, resolution, aspect, and size are measured and reproducible; whether an image looks like the real product is a judgment against a reference. An asset needs both.
- **Controlled capture:** fixed viewport and device pixel ratio, fonts loaded, animations and transitions off, clock and data fixed, dynamic regions masked. An uncontrolled capture produces noise or false passes.
- **Computed over authored.** Audit what the browser computes (color, font family and size, spacing, radius, line height), not what the stylesheet says.
- **Targets matrix:** widths (320, 375, 768, 1024, 1440), light and dark themes, 200% zoom and text-only resize, DPR 1 and 2, supported browsers, reduced motion.
- **Glyph coverage is checked per script.** Missing glyphs draw empty boxes while the renderer reports success; sample text in every script and emoji the product ships and confirm coverage with the font that will actually load.
- **Color comparison needs matched spaces.** Differences (ΔE) are meaningful only after both images are converted to the same profile from their embedded tags; untagged files are noted as untagged, and the browser or player's color handling is part of what is being tested.
- **Contrast over time is measured on rendered pixels.** For video and animated UI, seek to several timestamps and sample the actual background behind each text element; token-pair ratios do not cover gradients, images, or moving layers.
- **Resolution claims name their meaning.** "2x" is fixed, auto-capped, or relative to native; output buffers for the renderer and every post-process pass are checked separately (a stretched low-resolution intermediate looks soft at high ratio), and a higher ratio never fixes a coarse source texture, mesh, or shadow map.
- **Scale-dependent bugs hide at 1x.** A layer drawn through the wrong transform looks right at device pixel ratio 1 and breaks at 2; stills are rendered at 2x before they are trusted.
- **Media fidelity:** encode shifts (color range, banding, blocking, resampling) are separate from design fidelity and checked on the delivered file, not the source.
- **State coverage:** a fidelity pass over the default state alone is not coverage; empty, error, long-content, and hover/focus states are in scope where they exist.
- **A technique is not a defect in isolation.** A gradient, serif, dark theme, or card can be intentional. A finding cites a location, component, or line of copy, names its class (quality defect: usability, accessibility, responsive, runtime; or default pattern with no role: stacked decoration doing the same job, repeated interchangeable tiles, motion that delays or repeats mechanically, invented proof), and does not guess whether a tool or person made it. Anything outside the inspected evidence is unknown.
- **Defects return to their owner lens; model-level changes go to proposals.**

## Failure modes
- **Wrong-size eyeballing** — approval from a downscaled screenshot. *Recognize:* review image smaller than the real viewport.
- **Blank baseline** — diff passes because both images are loading screens or empty. *Recognize:* near-uniform pixel histogram or zero rendered text.
- **Silent font fallback** — fallback face substituted. *Recognize:* the font loading check fails or glyph metrics differ from the specified face.
- **Token drift** — near-miss hex, 15px where scale says 16. *Recognize:* off-token computed value.
- **Unrun states** — only default state verified. *Recognize:* state coverage list has gaps.
- **Blurry at density** — raster below rendered size times DPR. *Recognize:* natural width < displayed width × DPR.
- **Overflow clipped** — content cut at narrow widths. *Recognize:* scroll width exceeds client width, or text truncated without access.
- **One-theme verification** — dark theme untested. *Recognize:* captures exist for one theme only.
- **False pass by existence** — checks confirm presence, not content. *Recognize:* assertions of the form "has texture", "file exists", exit code 0.
- **Builder's reading as oracle** — gate values taken from the builder's notes. *Recognize:* a criterion with no external source.
- **Diff threshold inflation** — threshold raised until it passes. *Recognize:* threshold changes without a decision id.

## Check
1. Token audit: gather every computed color, font family, font size, spacing, and radius from the rendered pages in all target states. The set of off-token values is empty or each is waived with a decision id.
2. Baseline diff in controlled capture: difference ≤ the threshold set in the decision log; each baseline is verified non-trivial (rendered text present; pixel histogram not near-uniform).
3. Font check: each specified family reports loaded; none falls back.
4. Layout across the targets matrix: no horizontal overflow at any width; no clipped or overlapping text with long-content fixtures.
5. Image density: every raster satisfies natural width ≥ displayed width × DPR; vector assets render crisp at 200% zoom.
6. Source re-measurement: for renders and product imagery, an independent measurement against CAD or spec within the tolerance stated in the product-visualization lens; mismatches are listed as defects. The oracle's hardware revision (CAD, board photo, spec) is checked against the revision recorded for the shipping unit in the hardware package; a render faithful to another revision passes this check and still depicts the wrong product, so it is reported as an oracle mismatch.
7. Glyphs and contrast: sample text in every shipped script and emoji renders without boxes; for video or animated UI, contrast is sampled on rendered pixels at five or more timestamps.
8. Delivered media: probe the final file; sampled frames compared to source frames for color and detail shift, with a stated tolerance.

## Writes to proposals
- `form` and `constraints`: discrepancies between product facts and how visuals depict them, with measurements.
- `decisions`: direction-token gaps or conflicts that need a rule, and requested waivers.
- `unknowns`: supported target list gaps (which browsers, devices, themes), reference material absent.
- `claims`: dimensions or colors confirmed by independent measurement, graded `VERIFIED`.
