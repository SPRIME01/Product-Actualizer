---
name: recon-physical
description: Establish what physical objects, CAD/3D assets, images, screenshots, documents, transcripts, audio and video actually show and measure. Use when any evidence is a non-code artifact.
reads: [purpose, actors, constraints, form, claims, unknowns]
needs: []
executes_with: []
---
# Recon: physical, media, and documents

## Reads from the model
`form` and `constraints` (physical) to extend, `claims` to confirm or contradict, `unknowns` to close. On a first pass the model is empty and this lens supplies its first rows.

## Distinctions
- **Ownership.** Owns what the non-code evidence contains and its measurable properties. Does not judge whether it is good looking (direction) or render it (product-visualization).
- **Depiction vs. object.** A render, mockup, Figma export, stock photo, or competitor photo depicts a product; only a photo of the real unit, a measurement, or CAD with a known release is evidence about it. Classify each image: `real-unit | prototype | render | mockup | screenshot-real | screenshot-design | other-product`.
- **Stated, visible, measured.** A spec sheet says a dimension (`REPORTED`), a photo implies one (`INFERRED`, needs a scale reference in the same plane), a measurement or CAD bounding box states it (`OBSERVED`).
- **Geometry formats carry different promises:** STEP/IGES are exact B-rep with units; STL is unitless triangles; OBJ has no units or materials guarantees; glTF/GLB is meters, +Y up, PBR; FBX/USD carry scene scale conventions. Read units, up-axis, origin, parts, and watertightness before any dimension is trusted.
- **Design intent vs. manufacturing output:** a tessellated STL for printing has already lost fillets and tolerances. A scan mesh is as-built, noisy, and one unit's deviation.
- **Datasheet numbers come in classes:** recommended operating, absolute maximum, typical, and guaranteed. Only guaranteed and recommended values bound a claim; typical is not a limit, and absolute maximum is not an operating point. Record the exact part, package, and datasheet revision.
- **Prediction, report, observation.** A calculated or simulated value is a prediction, a reading someone supplied is `REPORTED` (with their instrument and setup if given), and only a measurement this project performed is `OBSERVED`. A plausible schematic is not a verified circuit; a bus ACK is not a device identity.
- **Evidence gathering on live hardware is read-only** unless the owner confirms the target, scope, and rollback path; powering, probing, or driving a unit is an action, not recon.
- **Revision.** Hardware photos, BOMs, datasheets, and CAD each belong to a revision. Part numbers, silkscreen, and file dates are how revisions are matched. Mismatched revisions are a contradiction, not noise.
- **Transcripts:** speaker attribution decides authority (owner vs. bystander). Separate decisions ("we are doing X") from intentions ("we should") and speculation. ASR garbles proper nouns, model numbers, and figures; those are re-confirmed against audio at the timecode.
- **Media technicals:** duration, frame rate and whether it is variable, resolution, color tags, audio rate/channels/loudness, and what is audible (voice, music, product sound) because each has rights and use implications.
- **Screenshots are cross-referenced with the code.** A UI element in a screenshot that the code recon cannot find means another version, a mockup, or a design file. Pixel dimensions double at 2x device ratio; window chrome and seeded demo data are noted.
- **Marks on a label are not certification.** A visible regulatory or safety mark proves a printed mark, not a certificate; the claim stays `REPORTED` until the certificate or test report is found and matched to the model and revision.
- **Performance claims carry conditions.** Battery life, range, speed, and accuracy numbers are meaningful only with load, temperature, firmware, and test method; a number without them is `REPORTED` and not comparable.
- **CAD files hide state:** configurations and variants, suppressed or hidden bodies, assemblies vs. parts, mirrored instances with negative scale, and vertex color vs. textured appearance. Record which configuration was read.
- **Office documents carry history:** tracked changes, comments, hidden sheets, speaker notes, and stale formulas often hold the superseded decisions and the real assumptions.
- **Slide decks and pitch material state intent.** Numbers in them are unsourced until traced to data; treat dated roadmap slides as `PROPOSED`, not as capabilities.
- **Missing, not assumed:** files referenced by documents but not supplied, thumbnails or proxies standing in for originals, and cropped screenshots are recorded as unknowns.

## Failure modes
- **Render as reality** — a concept render recorded as the product's look. *Recognize:* no lens artifacts, impossible reflections, no wear or seams; metadata from a render tool; file named "final_v3".
- **Unit slip** — STL assumed meters, drawing read in inches, CAD in mm imported at 1000x. *Recognize:* bounding box implies a product the size of a car or a grain of sand.
- **Photo measurement without a reference** — dimension read from a perspective photo. *Recognize:* a number with no reference object in the same plane.
- **Wishful transcript** — a hope graded as a decision. *Recognize:* claim sourced to a line with "should", "would be nice", "maybe", or a speaker who doesn't own the decision.
- **Superseded spec** — an old datasheet outranking the unit in hand. *Recognize:* spec date earlier than the hardware revision marking.
- **Leading-question answer** — interview statement shaped by how it was asked, or by the speaker's stake. *Recognize:* the claim appears only after a suggestion in the question; two sessions disagree.
- **Garbled number** — ASR figure used unchecked. *Recognize:* a number in a claim whose only source is auto-generated text.
- **Proxy for original** — judging quality or resolution from a compressed copy. *Recognize:* pixel dimensions far below what the stated device would produce.
- **Prediction promoted to measurement** — a computed or quoted value recorded as observed. *Recognize:* an `OBSERVED` row with no instrument, setup, or test point.
- **Wrong configuration** — dimensions read from a variant or suppressed state that isn't the shipping one. *Recognize:* the configuration name or revision isn't recorded.
- **Orphan reference** — a doc says "see attached drawing" and none was found. *Recognize:* references list with no matching file.

## Check
1. Inventory table, one row per file, with values extracted by tool rather than read by eye: for geometry, units, up-axis, bounding box in the stated unit, part count; for images, pixel dimensions and classification from the list above; for A/V, the probed duration, fps, resolution, sample rate, channels.
2. Cross-source dimension test: wherever two sources give the same dimension (CAD box vs. spec sheet vs. photo with reference), they agree within 1% for CAD/spec and 5% for photo-derived, otherwise both are written as a `CONTRADICTED` claim naming both sources.
3. Re-open test: every transcript-derived claim has file, timecode, and speaker; a reader opening that timecode hears or reads the stated fact.
4. Configuration record: for every CAD or assembly file, the configuration, revision, and visibility state read are recorded beside each dimension taken from it.
5. Conditions: every performance number is stored with load, temperature, firmware, and method, or it is marked as conditionless and kept out of comparisons.
6. Every image used as evidence for `form` carries a classification; any `render` or `mockup` classified image contributes no `OBSERVED` claim.

## Writes to proposals
- `form` and `constraints` (physical): dimensions, materials, finishes, ports, interfaces, weight, environment, with grade and measured-or-stated basis.
- `claims` from documents and transcripts, graded `REPORTED` unless re-checked, with timecode and speaker.
- `actors`: people named in transcripts and documents with their stated jobs, stakes, and authority to decide.
- `unknowns`: missing files, unmeasured dimensions, unknown revisions, hidden sides of the object.
- Contradictions between sources, as `change` proposals.
- Handoff notes: geometry readiness and defects (to product-visualization), origin and rights questions per file (to provenance-licensing), usable footage and audio segments (to motion-editorial, audio-sound).
