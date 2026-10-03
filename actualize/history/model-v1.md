---
product: Product Actualizer Architect
model_version: 1
---

## Purpose

Move an incomplete real product toward a coherent launch through one shared Product Model, so that every public statement about it is graded OBSERVED or VERIFIED and traceable to a source anyone can re-open (PRODUCT.md "Product Purpose"; README.md "The idea").

## Actors

| id | actor | job |
|---|---|---|
| A1 | Product owner | Decide what is true about the product, accept or refuse work, and own the launch bar |
| A2 | Executor (a coding agent or tool) | Do bounded lens work and report it without being able to accept its own work |
| A3 | Downstream reader (buyer, user, or handoff receiver) | Rely on what the product says about itself and re-open the evidence behind it |

## Capabilities

| id | capability | claims |
|---|---|---|
| K1 | Run a governed process: begin, select lenses, run lenses, reconcile, gate, done | C5, C6, C8 |
| K2 | Keep one Product Model with ten sections and seven evidence grades | C2 |
| K3 | Refuse a public artifact that cites a claim below OBSERVED | C3 |
| K4 | Detect stale artifacts from model versions and touched fields | C4 |
| K5 | Order selected lenses into dependency waves from their `needs` | C5, C1 |
| K6 | Refuse to end a run while work is outstanding | C6 |
| K7 | Allow the Product Model to change only inside a reconciliation | C7 |
| K8 | Install enforcement hooks for several agent clients | C23 |
| K9 | Ship as one self-contained executable | C8, C21 |
| K10 | Show the run in an optional cockpit built from typed surfaces | C9, C10 |
| K11 | Answer known questions in the Work Terminal with local rules | C11, C14 |
| K12 | Record typed work requests that only the owner can accept | C12, C13 |
| K13 | Report which implementations of a capability are found or unknown | C20, C25 |
| K14 | Derive the Case and answer world-debugger questions from the run files | C24 |
| K15 | Replay two worked examples, software and hardware, as tests | C15, C16 |

## Constraints

**Technical**

- Hooks and cockpit need Bun 1.4 or later; browser tests need system Chrome; `tests/check.py` needs Python 3 (package.json:5-7; evidence/recon-software/clean-checkout.txt).
- The compiled executable has been built and exercised on Linux x86_64 only (evidence/recon-software/executed-checks-binary.txt).
- The enforcement hooks were not run on any client in this session; only the process engine, the CLI, and the cockpit were exercised (evidence/recon-software/capability-trace.md K8).

**Physical**

- None. This product is software.

**Legal**

- The repository is public and has no LICENSE file, so no one has been granted rights to reuse the code (C17).
- Ideas from donor repositories are restated, not copied; their licenses are recorded in PROVENANCE.md.
- Public copy may use only OBSERVED or VERIFIED claims, cited by id (product-model/SCHEMA.md).

## Form and interaction

Operated through a CLI named `actualize`, enforcement hooks that run inside agent clients, and an optional cockpit: a web page with an owner-only Work Terminal, an agent-facing MCP and WebMCP tool surface, and a SQLite file that holds a rebuildable projection and, separately, the cockpit's own durable control state. Skills are plain Markdown files; the process engine and cockpit are Bun programs (hooks/src/cli.mjs USAGE; cockpit/server/; skills/).

## Voice

Quiet, dense, legible. An instrument, not a dashboard. Confidence comes from provenance, not polish. It refuses encouragement, celebration, confetti, glowing AI furniture, and any wording that smooths a mixed picture into a clean one. A no-go reads as a no-go (PRODUCT.md "Brand Personality", "Anti-references").

## Positioning

Not yet established. The brand lens proposes category, alternative, the one difference, and who the product is not for (U3).

## Claims ledger

| id | claim | grade | source |
|---|---|---|---|
| C1 | The repository ships 17 lens skills plus a router skill and a cockpit tool skill, and `actualize lenses` lists the 17 lenses | OBSERVED | skills/*/SKILL.md (19 directories); evidence/recon-software/executed-checks-binary.txt |
| C2 | The model defines seven evidence grades and limits public copy to OBSERVED and VERIFIED | OBSERVED | product-model/SCHEMA.md "Evidence grades"; hooks/src/lib/md.mjs:18-19 |
| C3 | The validator rejects a public artifact that cites a claim graded REPORTED and accepts the same artifact when the claim is OBSERVED | VERIFIED | evidence/recon-software/executed-checks-validator.txt checks 1 and 2 |
| C4 | An artifact built from an earlier model version is flagged stale when a later decision touched a claim it cites | VERIFIED | evidence/recon-software/executed-checks-validator.txt checks 3 and 4; test:python3 tests/check.py |
| C5 | Selecting lenses orders them into dependency waves; this run's selection of 11 lenses produced four waves | VERIFIED | evidence/recon-software/select-waves.json |
| C6 | The gate blocks the end of a run while a lens is running, a reconciliation is open, proposals are open, artifacts are stale or invalid, or no current release gate exists | VERIFIED | hooks/src/process.mjs:54-90; test:bun test tests/hooks/replay.test.mjs (evidence/recon-software/full-suite-after-fix.log) |
| C7 | A change to product-model.md outside a reconciliation is flagged as a `model-tampered` blocker | VERIFIED | tests/hooks/replay.test.mjs:103; evidence/recon-software/full-suite-after-fix.log |
| C8 | The compiled 85 MB executable ran `lenses`, `begin`, and `status` on Linux x86_64 with no Bun on PATH | VERIFIED | evidence/recon-software/executed-checks-binary.txt |
| C9 | The cockpit's surface vocabulary has 15 block types | OBSERVED | cockpit/protocol/spec.ts:175 |
| C10 | Resetting the cockpit deletes its own state and leaves every file in the run directory unchanged | VERIFIED | test:bun test tests/cockpit/workbench.transport.test.ts (evidence/recon-software/full-suite-after-fix.log) |
| C11 | Neither hooks/ nor cockpit/ contains a reference to an LLM provider endpoint, and the Work Terminal answered "show the workflow" from local rules | VERIFIED | evidence/recon-software/executed-checks-no-llm.txt; cockpit/server/terminal.ts:1-4; evidence/dogfood/01-show-the-workflow.png |
| C12 | When an agent tries to accept a work request, the cockpit returns AUTHORITY_HUMAN | VERIFIED | cockpit/server/control.ts:93; tests/cockpit/workbench.transport.test.ts:55 (evidence/recon-software/full-suite-after-fix.log) |
| C13 | A typed work request stays queued until an executor acknowledges it; R1 was queued, then acknowledged, in this run | OBSERVED | cockpit/protocol/work.ts:7-21; actualize work requests, 2026-10-03 |
| C14 | The Work Terminal did not understand "research and establish the market position for Product Actualizer Architect" and queued nothing; the `request:` prefix queued it as R1 | OBSERVED | evidence/dogfood/02-request-queued.png |
| C15 | Both worked examples, Loam (software and a sensor) and Mote (hardware), replay through tests/check.py without error | VERIFIED | test:python3 tests/check.py |
| C16 | The hardware checks are tested against mutated copies of the Mote walkthrough and must fail each mutation | VERIFIED | tests/check.py:585; test:python3 tests/check.py |
| C17 | The repository is public and has no LICENSE file | OBSERVED | gh repo view SPRIME01/Product-Actualizer (licenseInfo null), 2026-10-03; no LICENSE* in the tree |
| C18 | No release or package has been published, and package.json is marked private | OBSERVED | package.json:3; gh release list SPRIME01/Product-Actualizer (empty), 2026-10-03 |
| C19 | The first clean-clone run of bun test had 3 failures from a race in tests/cockpit/workbench.e2e.test.ts; after the fix, 315 tests passed with 0 failures | OBSERVED | evidence/recon-software/clean-checkout.txt; evidence/recon-software/full-suite-after-fix.log |
| C20 | The capability catalogue lists ffmpeg as found and hyperframes, bang-motion, and anidoodle as unknown on this machine, and says unknown is not usable | OBSERVED | evidence/dogfood/capabilities-before.json |
| C21 | Only a Linux x86_64 binary has been built and exercised | OBSERVED | evidence/recon-software/executed-checks-binary.txt |
| C22 | Skills are plain Markdown files with name, description, reads, needs, and executes_with front matter | OBSERVED | skills/*/SKILL.md |
| C23 | The hooks installer has adapters for Claude Code, Codex, Cline, OpenCode, and Prime (also addressed as pi) | OBSERVED | hooks/install.mjs:3,13 (read, not run) |
| C24 | The Case is derived from the run and never stored, and the world debugger only reads the run files | OBSERVED | cockpit/server/case.ts:1; cockpit/server/world.ts:1-6 |
| C25 | The Workbench's workflow, task contract, and capability views are computed from the run when rendered and store no workflow state | VERIFIED | cockpit/server/workflows.ts; test:bun test tests/cockpit/workbench.test.ts (evidence/recon-software/full-suite-after-fix.log) |

## Unknowns

| id | question | blocks | who can answer |
|---|---|---|---|
| U1 | Which license, if any, does the owner grant for the code? | any public invitation to use or copy the code; the gate | product owner |
| U2 | Does the process measurably change launch quality or time? No outcome data exists | any outcome or speed claim | a measured trial with real users |
| U3 | What category, ICP, name, and message fit the market? | brand, marketing, experience, motion-editorial | brand lens, from market research |
| U4 | Do the enforcement hooks behave as installed on Codex, Cline, OpenCode, and Prime? | any claim about those clients beyond the installer's targets | a run on each client |
| U5 | Does the executable run on macOS, Windows, or arm64? | any cross-platform claim | a build and run on each platform |
| U6 | Is the chosen public name clear of trademark and domain conflicts? | public naming | trademark search and registrar check |
| U7 | Where will the website be hosted and under what domain? | deploy instructions as shipped | product owner |

## Decision log

| n | decision | rationale | touched | version |
|---|---|---|---|---|
| D1 | Model created from initial evidence | Classified inputs: the repository at 79484ce (code, docs, tests, skills), the running cockpit, and the owner's validation brief. Goal: Product Actualizer Architect is understood, trusted, and adoptable by its first buyers, with a grounded category and name, brand, public website with a live mechanism demo, JavaScript-rendered voiced explainer, and a GTM kit, every public claim OBSERVED or VERIFIED. Launch bar: release | all | 1 |
| D2 | Lens selection: run recon-software, brand, direction, experience, marketing, illustration, motion-editorial, audio-sound, fidelity-qa, provenance-licensing, release-readiness; exclude recon-physical, electronics, embedded-systems, robotics, product-visualization, legacy-modernization | Selected lenses cover the market-facing outputs (positioning, brand, site, film, voice, launch kit) and their verification. Excluded: recon-physical (no hardware, CAD, or media in the product; external web research is cited as REPORTED), electronics (software-only product), embedded-systems (no firmware target), robotics (no embodied loop), product-visualization (no physical or 3D form), legacy-modernization (the code is not being changed to launch) | decisions | 1 |
