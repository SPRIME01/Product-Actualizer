---
product: Product Actualizer Architect
model_version: 3
---

## Purpose

Move an incomplete real product toward a coherent launch through one shared Product Model, so that every public statement about it is graded OBSERVED or VERIFIED and traceable to a source anyone can re-open (PRODUCT.md "Product Purpose"; README.md "The idea").

## Actors

| id | actor | job |
|---|---|---|
| A1 | Product owner | Decide what is true about the product, accept or refuse work, and own the launch bar |
| A2 | Executor (a coding agent or tool) | Do bounded lens work and report it without being able to accept its own work |
| A3 | Downstream reader (buyer, user, or handoff receiver) | Rely on what the product says about itself and re-open the evidence behind it |
| A4 | Technical founder or small team shipping with coding agents (first buyer) | Get a built-but-unlaunched product to a launch they can stand behind, without the launch material overclaiming |
| A5 | Studio or consultant inheriting an agent-built product | Hand over what is true and what is not, and keep it current |

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
- Avoid the names Warrant and Plumbline: live AI-agent evidence and verification offerings hold them (C34). Name screening is not legal clearance (U6).
- Third-party findings appear only as attributed statements of what the source says (D5).

## Form and interaction

Operated through a CLI named `actualize`, enforcement hooks that run inside agent clients, and an optional cockpit: a web page with an owner-only Work Terminal, an agent-facing MCP and WebMCP tool surface, and a SQLite file that holds a rebuildable projection and, separately, the cockpit's own durable control state. Skills are plain Markdown files; the process engine and cockpit are Bun programs (hooks/src/cli.mjs USAGE; cockpit/server/; skills/).

## Voice

Quiet, dense, legible. An instrument, not a dashboard. Confidence comes from provenance, not polish. It refuses encouragement, celebration, confetti, glowing AI furniture, and any wording that smooths a mixed picture into a clean one. A no-go reads as a no-go (PRODUCT.md "Brand Personality", "Anti-references").

Traits with limits: direct, not curt; exact, not pedantic; dry, never jokey. Uses: evidence, claim, grade, source, ledger, model, stale, gate, verdict, owner, executor, lens, re-open. Refuses: AI-powered, seamless, effortless, revolutionary, supercharge, 10x, magic, "trusted by", "just works", and the words prove, guarantee, or autonomous about anything the product does not do. Samples (not product claims): success "Gate passed at model@7. Verdict: go. Two unknowns remain, neither blocking." Error "Cannot finish brand: an artifact cites C12, which is graded REPORTED." Apology "That check was wrong. C9 is now CONTRADICTED and four artifacts are stale." Legal copy drops the dryness and states the fact first.

## Positioning

**Category:** evidence-gated product completion (anchor: agent skills and spec-driven development; it rejects the assumption that the spec, the plan, or the agent's own report is the source of truth). **For:** technical founders and small teams who build with coding agents and now have to launch (A4). **Alternative they use today:** agent chat plus CLAUDE.md or AGENTS.md notes, a spec toolkit for the code, separate tools for brand, site and film, and a final human read (C28, C30, C33). **The one difference:** every artifact cites graded claims from one model, goes stale when they change, and a gate can refuse the launch [C2][C3][C4][C6]. **Not for:** buyers who want an agent to ship without an owner reading the verdict, buyers who need a hosted service, or buyers who need guarantees about code correctness. Tagline: "Finish the product. Show the evidence." The comparative claim that no other tool does this is PROPOSED (C36) and is never stated publicly. Public name: Product Actualizer; internal and category descriptor: Product Actualizer Architect (D3).

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
| C26 | The Stack Overflow 2025 Developer Survey press release states that 84% of respondents use or plan to use AI tools and 46% do not trust the accuracy of their output, up from 31% the year before | OBSERVED | https://stackoverflow.co/company/press/archive/stack-overflow-2025-developer-survey/@2026-10-03 (evidence/brand/market-research.md S3) |
| C27 | arXiv 2609.20812 states that in its OverclaimBench runs agents left at least one required file unread in 67.9% of runs, and 80.4% of those incomplete runs were misleading | OBSERVED | https://arxiv.org/abs/2609.20812@2026-10-03 (S4) |
| C28 | Martin Fowler's site (Böckeler, 2025-10-15) distinguishes spec-first, spec-anchored, and spec-as-source development and reports that spec-kit produced many repetitive Markdown files to review | OBSERVED | https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html@2026-10-03 (S1) |
| C29 | On 2026-10-03 the GitHub repositories github/spec-kit, Fission-AI/OpenSpec, and bmad-code-org/BMAD-METHOD had 139,998, 70,977, and 53,753 stars | OBSERVED | `gh api` on each repository, 2026-10-03 (S14) |
| C30 | A comparison of Lovable, Bolt, v0, and Replit Agent published 2026-06-04 says none of them owns the whole lifecycle and that v0's finished look makes users think the app is further along than it is | OBSERVED | https://appelixir.com/articles/ai-app-builder-comparison-lovable-bolt-v0-replit/@2026-10-03 (S5) |
| C31 | A DEV Community post of 2026-09-27 states that agents made the first 80% of building fast and that the bottleneck is now completing | OBSERVED | https://dev.to/kentkandiforge/the-last-mile-problem-in-agentic-development-5768@2026-10-03 (S2) |
| C32 | The Codex and Cursor documentation both describe skills as a directory with a SKILL.md file under an open agent skills standard | OBSERVED | https://developers.openai.com/codex/skills@2026-10-03; https://cursor.com/docs/skills@2026-10-03 (S13) |
| C33 | Studios advertise takeover of AI-built apps, naming chat-as-source-of-truth and handoff gaps | OBSERVED | https://hunchbite.com/hire-developer-ai-app@2026-10-03; https://kitrum.com/services/ai-code-handoff-services/@2026-10-03 (S12) |
| C34 | The names Warrant (warrant.build, warrantai.dev) and Plumbline (plumblinehq.ai) are in use by live AI-agent evidence and verification offerings | OBSERVED | evidence/brand/name-clearance.md; URLs@2026-10-03 |
| C35 | No product named Product Actualizer was found in web search, GitHub, or npm, and productactualizer.com, productactualizer.dev, productactualizer.ai, and actualizer.dev had no DNS record | OBSERVED | evidence/brand/name-clearance.md, 2026-10-03 |
| C36 | No tool found in this research extends a graded claims ledger, staleness, and a refusing gate to non-code launch artifacts | PROPOSED | evidence/brand/market-research.md "What the research does and does not support"; absence in one search is not proof |
| C37 | Technical founders and small teams who build with coding agents and lack a launch process are the first buyers | PROPOSED | evidence/brand/market-research.md (S2, S3, S5); no buyer has been asked (U10) |
| C38 | Loam and Mote are fictional products used as test fixtures and worked examples, not customers | OBSERVED | README.md:30-31; tests/walkthrough-mote/TRANSCRIPT.md:3 |
| C39 | The governed run for this validation, with its model, proposals, history, and evidence, is stored in the repository's actualize/ directory | OBSERVED | actualize/ (product-model.md, proposals.md, history/, evidence/), 2026-10-03 |
| C40 | The cockpit screenshots in actualize/evidence/dogfood/ were captured from the cockpit running against this run | OBSERVED | actualize/evidence/dogfood/01-show-the-workflow.png; 02-request-queued.png; 03-ready-for-review.png; 04-accepted.png |
| C41 | Work request R1 moved queued, acknowledged, running, produced, ready_for_review, accepted in this run, and its history records who moved it each time | OBSERVED | actualize/evidence/dogfood/R1-history.json |
| C42 | The cockpit's design system assigns one hue to each of the seven evidence grades and reserves colour for process meaning | OBSERVED | DESIGN.md front matter and "Colors" |

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
| U8 | Do three people who have not seen the name written spell it correctly, and are the handles free? | public naming | the owner, with three testers |
| U9 | Will the first buyers pay, and how large is the market? | pricing and any market-size claim | customer discovery |
| U10 | Do technical founders recognise the problem as the positioning states it? No one has been asked | headline and ICP | customer interviews |
| U11 | Is the funnel from landing to running a walkthrough measurable? No analytics are installed by decision | any conversion claim | the owner, through GitHub traffic and replies |
| U12 | What are the current platform specs for social images and the rules of each community channel? | launch assets as final | a check against each destination's published rules |

## Decision log

| n | decision | rationale | touched | version |
|---|---|---|---|---|
| D1 | Model created from initial evidence | Classified inputs: the repository at 79484ce (code, docs, tests, skills), the running cockpit, and the owner's validation brief. Goal: Product Actualizer Architect is understood, trusted, and adoptable by its first buyers, with a grounded category and name, brand, public website with a live mechanism demo, JavaScript-rendered voiced explainer, and a GTM kit, every public claim OBSERVED or VERIFIED. Launch bar: release | all | 1 |
| D2 | Lens selection: run recon-software, brand, direction, experience, marketing, illustration, motion-editorial, audio-sound, fidelity-qa, provenance-licensing, release-readiness; exclude recon-physical, electronics, embedded-systems, robotics, product-visualization, legacy-modernization | Selected lenses cover the market-facing outputs (positioning, brand, site, film, voice, launch kit) and their verification. Excluded: recon-physical (no hardware, CAD, or media in the product; external web research is cited as REPORTED), electronics (software-only product), embedded-systems (no firmware target), robotics (no embodied loop), product-visualization (no physical or 3D form), legacy-modernization (the code is not being changed to launch) | decisions | 1 |
| D3 | Public brand is Product Actualizer; Product Actualizer Architect stays the internal and category descriptor; Warrant and Plumbline are rejected | The exact phrase is unclaimed (C35), the CLI verb and repository equity are kept, and the two stronger metaphors are held by live evidence and verification products (C34). "Architect" implies a design-time role the product does not play and makes the name too long to say | positioning, constraints, decisions | 2 |
| D4 | Category is evidence-gated product completion; first buyer is the technical founder or small team shipping with coding agents (A4), with studios (A5) second; tagline is "Finish the product. Show the evidence." | The pain is stated as completion and verification, not generation (C27, C31, C26); spec toolkits own the code-first framing (C28, C29) and none found extends a ledger to launch material (C36, PROPOSED); the tagline passes the "says who" test through C2, C3, C6 and does not say prove | positioning, actors, voice | 2 |
| D5 | Third-party findings appear only as attributed statements of what the source says; the findings themselves stay REPORTED and are never stated as the product's fact | Schema grades prose documents REPORTED; the claims C26-C35 record the source's words, which this run read | claims, constraints | 2 |
| D6 | No public invitation to use or copy the code until the owner declares a license; the site and launch kit carry one switch for it | C17: public repository, no LICENSE file; same rule the Loam walkthrough applies (tests/walkthrough D7) | constraints, unknowns, decisions | 2 |
| D7 | Channel bet: Show HN, r/ClaudeCode and a DEV Community article for A4; LinkedIn for A5; no analytics; continue and stop thresholds fixed before launch | The places A4 reads are evidenced (evidence/marketing/channel-plan.md); skills directories wait on a license (U1) | decisions | 3 |
| D8 | CTA architecture: primary "Read the run", secondary "Replay a worked example", tertiary "Source on GitHub"; "Run it on your product" withheld until U1. Site step budget: the first claim checked in at most 2 interactions and 10 seconds | Follows D6 and the experience flows (artifacts/experience/site-flows.md) | decisions | 3 |
| D9 | Record the fixture, run, screenshot, R1 and design-system facts as claims C38-C42 and the funnel and channel-rule unknowns U11 and U12 | Public copy needs each as a re-openable source, and the funnel cannot be measured | claims, unknowns | 3 |
