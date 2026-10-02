# Provenance

Donor repositories were cloned to `.tmp/ref/` for reading only (since deleted). Nothing was copied verbatim: each entry
below is an idea, failure mode, or check restated in this project's own words and folded into the named lens. No donor is a
dependency. Licenses were read from each donor's own license file (or manifest, for installed copies).

| lens | donor | what was kept | license |
|---|---|---|---|
| recon-software | DiUS/agent-toolkit | commit-pinned evidence and drift by changed paths, never timestamps; "not read" stays on the map; rationale is unknown, not inferred; reference vs. use | MIT |
| recon-software | datapanda/product-discovery-skills | data provenance questions: authority vs copy, freshness, identifier crossing, unknown source stays unknown | MIT |
| recon-physical | magnus919/agent-skills (electronics) | datasheet value classes, prediction vs report vs observation, read-only hardware recon | MIT |
| brand | cofoundy/brand-skills | availability by product type, ecosystem trademark limits, compound/specificity test, self-contradicting meanings, "domain was free" red flag | MIT |
| brand | rampstackco/claude-skills (logo-design) | mark architecture set, application-context test (3+ failures = not primary) | MIT |
| direction | rampstackco/claude-skills (creative-direction, art-direction) | four axes chosen by exclusion, five-part brief, planned variants and crops, rights before production, staged reviews | MIT |
| direction | hallmark, impeccable (installed copies) | register, color commitment levels, scene-sentence theme choice, category-reflex test at two orders, default-stack fingerprints | no license file in installed copies; ideas only |
| direction | MengTo/Skills (ui) | finding discipline: technique is not a defect, cite evidence | MIT |
| experience | impeccable, hallmark | cognitive-load kinds, interaction timing details, modal as last resort, fake chrome | as above |
| experience | datapanda/product-discovery-skills | flow-map inventory, one owner/one exit/one failure per step, internal consistency is not truth | MIT |
| product-visualization | kai-chop/blender-industrial-kit | burr/z-fight census, process-implied appearance, view set (3 orthographic + joint close-ups + scale shot), missing-part audit | MIT |
| product-visualization | img2threejs/img2threejs | reference admission, de-light before reuse, detail inventory, gates that name what they did not look at | Apache-2.0 |
| product-visualization | MengTo/Skills (3d) | conductor F0 and finish values (`references/material-constants.md`), environment-lit metal, detail-vs-pixel aliasing, resolution semantics | MIT |
| product-visualization, fidelity-qa | magnus919/agent-skills (color-management) | gamut clipping, matched working spaces for ΔE, wrong-space correction | MIT |
| fidelity-qa | kai-chop/blender-industrial-kit | producer must not verify itself; expected values from the requirement source; numeric and visual layers catch disjoint defects | MIT |
| fidelity-qa | dlazy-ai/ecommerce-skills | pixel-spec checks vs. realism checks are different gates | MIT |
| fidelity-qa | hyperframes (installed plugin), kajisho5/ffmpeg-skill, alexgreensh/anidoodle | contrast on rendered pixels over time; glyph coverage per script; scale bugs hidden at 1x | Apache-2.0, MIT, Apache-2.0 |
| marketing | coreyhaines31/marketingskills | owned/rented/borrowed channels, staged launch, experiment hygiene (pre-set sample size, whole weeks, no peeking) | MIT |
| marketing | blader/humanizer | rewrites must not add or drop facts; borrowed authority; structural cadence tells | MIT |
| marketing | dlazy-ai/ecommerce-skills | marketplace asset specs measured on pixels; synthetic presenters vs. fabricated testimonials | MIT |
| motion-editorial | karekin/video-shotcraft | hold-for-information, acceleration over constant speed, one subject opening, shot must add information, feature-to-shot map, 2-4x capture for 3D UI, no handheld on UI films | Apache-2.0 |
| motion-editorial | bangtutorial/bang-motion | mechanical slide-deck test, text tiers, template skeletons, deterministic render | MIT |
| motion-editorial | hyperframes (installed plugin) | hero-frame layout first, transition is the exit, banding, rendered-video type floors | Apache-2.0 (plugin manifest) |
| motion-editorial, audio-sound | kajisho5/ffmpeg-skill | HDR/log/BT.2020 handling, frame-order of operations, keyframe cuts, VFR, sync confidence, track dropping, normalized-can-clip | MIT |
| audio-sound | karekin/video-shotcraft | declarative cue sheet, re-pin after timeline change, foley over decoration, repeat-effect handling | Apache-2.0 |
| audio-sound | alexgreensh/anidoodle | music brief as a plan; agent cannot hear, so human listen recorded | Apache-2.0 |
| illustration | alexgreensh/anidoodle | style = mark-making, stated realism, prove on one still, character drift, no dead air | Apache-2.0 |
| illustration | datapanda/product-discovery-skills | one altitude per diagram, numbered boxes | MIT |
| provenance-licensing | rampstackco/claude-skills (media-asset-management) | masters apart from deliverables, rights metadata travels | MIT |
| legacy-modernization | wondelai/skills (working-with-legacy-code) | change algorithm, seams, characterization recipe, structure-only vs behavior-only | MIT |
| legacy-modernization | magnus919/agent-skills (migration-engineering) | expand/migrate/contract, irreversible steps named | MIT |
| release-readiness | magnus919/agent-skills (verification-methodology, production-readiness) | four-valued verdicts, superseded passes, lanes do not average, four decisions with owner, risk-scaled evidence | MIT |
| release-readiness | rampstackco/claude-skills (launch-runbook) | rollback criteria and lead-time items before cutover | MIT |
| release-readiness | kai-chop/blender-industrial-kit, alexgreensh/anidoodle | exit 0 proves the tool ran; some qualities need a named human | MIT, Apache-2.0 |

## Read, nothing kept

- `vivar/Hermes-Suno-Music-Agent` (CC BY-NC-SA 4.0): non-commercial and share-alike terms are incompatible with free reuse here; its mixing and
  mastering content was generic and added nothing beyond what the audio lens already states. Nothing used.
- `CloudAI-X/threejs-skills` (no license file): API reference only; nothing used.
- Rampstack, magnus919, and wondelai contain many unrelated skills; only the named ones were read.

## Notices

Copyright lines of donors whose ideas were used, preserved here as courtesy and in case any phrasing resembles theirs:
DiUS; Meng To; Bang Tutorial; Siqi Chen (2025); Cofoundy SAC; Corey Haines (2025); Phillip Tularak; dlazy;
blender-industrial-kit contributors; kajisho5; Magnus Hedemark; RampStack Co.; Wondel.ai sp. z o.o. (2025) — all MIT.
Alex Greenshpun (anidoodle), img2threejs authors, karekin/video-shotcraft authors, HeyGen (hyperframes) — Apache-2.0
(no NOTICE text applies to restated ideas; full texts are in the donors' repositories).
