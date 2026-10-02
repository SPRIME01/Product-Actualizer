---
name: recon-physical
description: Establish what physical objects, hardware and electronics (exact boards, parts, revisions, schematics, BOMs, datasheets), CAD/3D assets, images, screenshots, documents, transcripts, audio and video actually show and measure. Use when any evidence is a non-code artifact or the product contains hardware.
reads: [purpose, actors, constraints, form, claims, unknowns]
needs: []
executes_with: [ee-datasheet-master, schematic-analyzer, xiao-assistant]
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
- **Revision.** Hardware photos, schematics, BOMs, assembly guides, datasheets, CAD, and firmware each belong to a revision. Part numbers, silkscreen, and file dates are how revisions are matched. Mismatched revisions are a contradiction, not noise; the unit decides, and if its revision is unread the contradiction stays open.
- **Hardware is present: load `references/hardware-context.md`.** It identifies the exact device, ranks and acquires sources, reconciles revisions, reconstructs connections, and writes a re-openable package under `evidence/recon-physical/hardware/`. This lens establishes what the evidence says exists; `electronics` judges the circuit, `embedded-systems` the firmware boundary, `robotics` the closed loop. Detail stays in evidence; only product-level consequences become proposals.
- **The exact unit, not a similar module.** Identity is manufacturer, model, revision, and package read from the unit or a matching-revision artifact. A lookalike, a family pin table, or "boards like this" is no evidence; generic knowledge never replaces an authoritative source that exists, and a missing one is an unknown.
- **Documents describe designs.** A fact read from a datasheet, manual, guide, or wiki is `REPORTED` even when authoritative; a schematic, BOM, or CAD file read directly is `OBSERVED` as that file at its revision, and reaches the unit only as `INFERRED` (it needs the unit's revision as a parent). Markings, enumerations, and traced connections on the unit are `OBSERVED`; a check that could have failed, run on the unit, is `VERIFIED`. A bus ACK shows that something answered.
- **Represented, implemented, documented.** Hardware named in firmware but absent from BOM and schematic, hardware in the manual that no artifact contains, and fitted parts no document mentions are each a finding. DNP, unconnected, and strapped pins are evidence of the operating mode.
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
- **Sibling-board substitution** — another revision's or variant's pin map, address, or rail applied to this unit. *Recognize:* the source's revision, SKU, or package is not the unit's.
- **Revision blend** — facts merged from artifacts of different revisions into one description. *Recognize:* a single table row citing two documents with different revision stamps.
- **Module read as chip** — a breakout's pulls, regulator, or level shifter missing from the chip datasheet reading. *Recognize:* a limit or address taken from the chip document for a part that sits on a module with its own schematic.
- **Phantom hardware** — a component asserted from code, README, or marketing with no BOM line, schematic symbol, or marking. *Recognize:* the only source for the part is software or prose.
- **Orphan reference** — a doc says "see attached drawing" and none was found. *Recognize:* references list with no matching file.

## Check
1. Inventory table, one row per file, with values extracted by tool rather than read by eye: for geometry, units, up-axis, bounding box in the stated unit, part count; for images, pixel dimensions and classification from the list above; for A/V, the probed duration, fps, resolution, sample rate, channels.
2. Cross-source dimension test: wherever two sources give the same dimension (CAD box vs. spec sheet vs. photo with reference), they agree within 1% for CAD/spec and 5% for photo-derived, otherwise both are written as a `CONTRADICTED` claim naming both sources.
3. Re-open test: every transcript-derived claim has file, timecode, and speaker; a reader opening that timecode hears or reads the stated fact.
4. Configuration record: for every CAD or assembly file, the configuration, revision, and visibility state read are recorded beside each dimension taken from it.
5. Conditions: every performance number is stored with load, temperature, firmware, and method, or it is marked as conditionless and kept out of comparisons.
6. Every image used as evidence for `form` carries a classification; any `render` or `mockup` classified image contributes no `OBSERVED` claim.
7. Hardware identity: each component has manufacturer, model, revision, package, and how each was obtained; an identity resolved only from a marketing name or lookalike is listed as unresolved.
8. Revision table: every schematic, layout, BOM, assembly guide, manual, firmware, and datasheet is placed against the unit's revision; every mismatch appears in `manifest.yaml` as a contradiction naming both artifacts.
9. Cross-artifact pass: firmware pin and address constants against schematic nets, BOM against schematic references, code and docs against fitted hardware, and every "see schematic/datasheet/appendix" reference against a supplied file; each miss is a finding or an unknown.
10. Each connection claim (power domain, bus participant, interface mode, address, fitted state) cites evidence of its own type from the table in the reference, and each value in a profile carries class, conditions, and a resolvable source.

## Writes to proposals
- `form` and `constraints` (physical): dimensions, materials, finishes, ports, interfaces, weight, environment, with grade and measured-or-stated basis.
- `claims` from documents and transcripts, graded `REPORTED` unless re-checked, with timecode and speaker.
- `actors`: people named in transcripts and documents with their stated jobs, stakes, and authority to decide.
- `unknowns`: missing files, unmeasured dimensions, unknown revisions, hidden sides of the object.
- Contradictions between sources, as `change` proposals.
- Hardware: the evidence package, then proposals for `form` (subsystems, sensors, actuators, ports, links), `constraints` (rails, limits, envelope, required revisions), hardware `claims` graded per the reference, and `unknowns` (unread revision, absent document, unspecified parameter).
- Handoff notes: geometry readiness and defects (to product-visualization), electrical suspicions and open contradictions (to electronics), pin, boot, and firmware-contract findings (to embedded-systems), sensor/actuator inventory (to robotics), origin and rights questions per file (to provenance-licensing), usable footage and audio segments (to motion-editorial, audio-sound).
