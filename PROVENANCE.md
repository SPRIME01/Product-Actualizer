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
| recon-physical | Seeed-Studio/ai-skills (ee-datasheet-master) | every number from the document or "not specified" plus how to obtain it; derivations show inputs; why a parameter is missing (wrong document, condition mismatch, application-dependent, manufacturer-controlled) | MIT |
| recon-physical, electronics | Seeed-Studio/ai-skills (schematic-analyzer) | evidence of the claim's own type (power domain from the supply pin's net, interface mode from every line, bus participant from signal pins); DNP vs no-connect vs relay NC vs a net named NC; unknown over a confident guess; structure first, datasheet second | MIT |
| recon-physical, embedded-systems | Seeed-Studio/xiao-assistant | pin data checked field by field against the vendor source; board numbers differ from SoC numbers (sleep current with camera and microphone rails); software naming hardware the board lacks; accessory-shared pins; USB re-enumeration after upload; compile before handing code over; heat or short means stop powering, not self-fix | MIT |
| recon-physical, embedded-systems | therebelrobot/microcontroller-base | a project declares each board instance with role, protocol, and address; per-board pin configuration; wiring and BOM as documented artifacts; exact device facts are acquired from sources, not carried as per-board skills (the per-board skills were not kept) | Unlicense (public domain) |
| recon-physical, electronics | fl4p/kicad-design | an empty 2xx response is a failed fetch; a clean ERC or netlist does not verify symbol semantics; invalid states excluded in hardware, firmware not the sole interlock; timing ledgers carry unknowns as qualification gates; lifecycle as an eligibility gate; source authority before editing | no license file; ideas only |
| electronics | magnus919/agent-skills (electronics) | the five evidence bases, stage gates, hypothesis-led fault isolation, bus budget arithmetic, protection-by-waveform table, measurement plan fields, first-power gate, acceptance dispositions, three-pass escalation | MIT |
| embedded-systems | magnus919/agent-skills (esp32-development) | layered target identity, no-reset monitoring, least-destructive recovery ladder, pin gate, smallest-framework rule, irreversible security lifecycle, OTA as a system, staged bring-up, bounded escalation, claim ledger before advising | MIT |
| embedded-systems, release-readiness | lhbsaa/embedded-dev-skill | a build is not a run (build, flash, monitor, test as separate evidence); initialization values and delays cite the device document; two-stage review (hardware specification before code quality) as the contract table; a photograph of the real screen as display evidence; transfer-size and memory-placement limits as an example of placement constraints | MIT |
| robotics | arpitg1304/robotics-agent-skills | layered stack with no direct application-to-hardware commands; simulation as a gap to list; state machine versus behavior tree by need; control above planning above perception with bounded handoff; timestamp at capture; calibration quality and recalibration triggers; depth validity, sensor warm-up; safety hierarchy and fail-safe defaults; graceful degradation; ordered startup, stable device names, restart limits, shutdown handlers; test levels and what each supports | Apache-2.0 |
| robotics | adityakamath/ros2-skill | profile first, live preflight, exact interface, bounded action, observe, verify; runtime state does not persist; an inactive lifecycle node drops messages silently; verify the effect, not the exit code; read pose only when stationary; after a timeout read the pose before re-issuing; stop first when a new command arrives; reject absurd magnitudes. Its command catalog is not reproduced: it is the execution layer (`executes_with`) | Apache-2.0 |
| robotics, embedded-systems, release-readiness | talsraviv/bubbles-the-ai-robot | locally bounded actuation; observe, small action, observe; commanded versus actual measured; sensor operating envelopes recorded when found; restore a known state; exit 0 can be silence (amplifier gate, audio route), a human confirms audibility; device ownership and stale holders; termination skips cleanup; transcripts are not gospel. Persona, conversation, and robot-specific behavior dropped | MIT |

## Cockpit donors

Read as architecture and interaction research, then deleted; nothing is copied. Only the packages named under "Dependencies" are installed.

| area | donor | what was kept | license |
|---|---|---|---|
| interaction grammar | bombshell-dev/clack | a very small set of prompt primitives (text, multiline, confirm, select, multiselect, autocomplete, path, group, spinner/progress, note, intro, cancel) composes into every workflow; cancel is a first-class outcome, not an exception. Became the `ask`/`form`/`progress`/`callout` blocks, with defer and skip on every ask | MIT |
| composition | vercel-labs/json-render | typed component catalog + declarative spec + validated rendering + actions; the catalog is the guardrail; structural spec validation with machine-readable issue codes (missing child, orphan, props that belong elsewhere). Built as a smaller equivalent (`protocol/spec.ts`, Zod, closed registry in `web/Surface.tsx`); the package was not adopted because its catalog, state store, and shadcn components are generic where this vocabulary must carry process meaning | Apache-2.0 |
| agent-visible UI state and typed actions | tldraw/tldraw (agent template) | prompt "parts" for what the user sees (selected shapes, viewport, user action history, peripheral content summarized not enumerated) became the compact `get_workspace` context; one schema per action validated before the transition; "canvas lints" became advisory composition lints. tldraw's own license is not permissive for production use, so only these ideas were taken | tldraw license (ideas only) |
| shared state and interrupts | ag-ui-protocol/ag-ui | lifecycle event naming (RUN_STARTED, STEP_*, STATE_SNAPSHOT/DELTA, ACTIVITY_*, CUSTOM); an interrupt ends a run with a structured outcome and resumes with one response per interrupt id and a status. Became the noun.verb event taxonomy, snapshot-then-delta on connect, and answers keyed by ask id with `answered`/`deferred`/`cancelled` | MIT |
| frontend actions, human in the loop | CopilotKit/CopilotKit, assistant-ui/assistant-ui, ag-ui-protocol/open-ag-ui-canvas | the agent renders a request and waits on a human response that comes back as structured data; the tool result is a UI; shared canvas state both sides read. Kept the first two; rejected the chat-thread machinery, runtimes, and cloud services | MIT |
| spatial workspace | dockview/dockview | tabs, nested splits, drag, resize, maximize, JSON serialization of the whole layout; a layout is separable from panel content. Used as a dependency (`dockview-react`); the server keeps its own small topology tree so agent placement is testable without a browser | MIT |
| graph | xyflow/xyflow | nodes, edges, pan, zoom, selection as a reusable view; layout is not included, so a layered DAG layout is ours. Used as a dependency (`@xyflow/react`), loaded only when a graph is drawn | MIT |
| trace presentation | langfuse/langfuse | nested observations as a tree with per-node duration bars relative to siblings, status marks, expand/collapse, and subtree wall-clock rather than the parent's own span. Mapped to the run trace (run, wave, lens, reconciliation, preflight stops). No part of its observability architecture | MIT (outside `ee/`) |

Dependencies: `zod`, `react`, `react-dom`, `dockview-react`, `@xyflow/react`, `@tanstack/charts` (MIT); `playwright-core` (Apache-2.0, dev only). TanStack Table was evaluated and not installed: tables here are a few dozen rows of known columns with grouping, selection, and sorting, which is less code than the dependency. Rejected from the donors: framework backends, agent runtimes, auth and SaaS pieces, generative HTML/JS, chat message machinery, cloud sync.

## Read, nothing kept

- `vivar/Hermes-Suno-Music-Agent` (CC BY-NC-SA 4.0): non-commercial and share-alike terms are incompatible with free reuse here; its mixing and
  mastering content was generic and added nothing beyond what the audio lens already states. Nothing used.
- `CloudAI-X/threejs-skills` (no license file): API reference only; nothing used.
- Rampstack, magnus919, and wondelai contain many unrelated skills; only the named ones were read.
- Hardware donors: Seeed ai-skills' `cv181x-media` and `onnx-to-cvimodel` (vendor toolchain tasks), the PDF and CLI scripts of `ee-datasheet-master` and `schematic-analyzer`, xiao-assistant's search, MCP, and wiki-crawl machinery, microcontroller-base's TinyGo/Arduino scaffolding and per-board skills, kicad-design's KiCad routing, placement, power-loop, and generator doctrine (a KiCad manual; the lens routes to it as `executes_with`), lhbsaa's skill chain, extensions, and dual-platform adapters, arpitg1304's ROS 1, web-integration, Docker, and security skills, Bubbles' persona, conversation, memory, and room-mapping material. Read, not used.

## Notices

Copyright lines of donors whose ideas were used (cockpit donors: Bombshell contributors, mathuo (dockview), webkid GmbH (xyflow), Atai Barkai (CopilotKit), AgentbaseAI Inc. (assistant-ui), ClickHouse Inc. (langfuse), the AG-UI authors, all MIT; Vercel Labs json-render, Apache-2.0), preserved here as courtesy and in case any phrasing resembles theirs:
DiUS; Meng To; Bang Tutorial; Siqi Chen (2025); Cofoundy SAC; Corey Haines (2025); Phillip Tularak; dlazy;
blender-industrial-kit contributors; kajisho5; Magnus Hedemark; RampStack Co.; Wondel.ai sp. z o.o. (2025); Seeed Studio (2026); lhbsaa (2026); Tal Raviv (2026) — all MIT.
Alex Greenshpun (anidoodle), img2threejs authors, karekin/video-shotcraft authors, HeyGen (hyperframes), robotics-agent-skills contributors (2026), adityakamath (ros2-skill) — Apache-2.0
(no NOTICE text applies to restated ideas; full texts are in the donors' repositories). therebelrobot/microcontroller-base is dedicated to the public domain (Unlicense). fl4p/kicad-design has no license file, so its ideas are recorded as read and restated in this project's words with no text taken.
