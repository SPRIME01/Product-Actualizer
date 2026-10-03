# Capability trace: Product Actualizer at 79484ce (tree clean apart from this run's `actualize/` and the e2e test fix)

Coverage: read the router, process engine (`hooks/src/process.mjs`, `lib/md.mjs`, `lib/lenses.mjs`), the cockpit control plane and terminal, `PRODUCT.md`, `README.md`, `AGENTS.md`, `DEBT.md`, `PROVENANCE.md`, `skills/*/SKILL.md` frontmatter, the build script, and tests by name. Not read: `cockpit/web/` rendering code (exercised only through tests and the live page), `references/` under each lens, the adapters for non-Claude clients.
Executed this session: clean clone, `bun install --frozen-lockfile`, `bun run typecheck`, `python3 tests/check.py`, `bun test` (315), `bun run build`, the compiled binary without Bun on PATH, the validator with a negative control, a grep for LLM clients, the live cockpit through a real browser page.

| id | capability | declared | implemented | reachable | executed |
|---|---|---|---|---|---|
| K1 | Run a governed process (begin, select, lens, reconcile, gate, done) | README.md "How a run works" | hooks/src/process.mjs:132-348 | hooks/src/cli.mjs USAGE | this run; binary smoke test (executed-checks-binary.txt) |
| K2 | One Product Model, ten sections, seven evidence grades | product-model/SCHEMA.md | hooks/src/lib/md.mjs:18, :65 | `actualize validate` | tests/check.py (OK) |
| K3 | Reject a public artifact that cites a claim below OBSERVED | SCHEMA.md "Public-facing copy" | hooks/src/lib/md.mjs:243 | `lens done` validates artifacts (process.mjs:220-225) | executed-checks-validator.txt, check 2 (negative control) |
| K4 | Detect stale artifacts from versions and touched fields | SCHEMA.md "Versions and staleness" | hooks/src/lib/md.mjs:258-271 | gate blocker `stale` (process.mjs:82) | executed-checks-validator.txt, check 4; tests/check.py |
| K5 | Order lenses into dependency waves from `needs` | router SKILL.md step 3 | hooks/src/lib/lenses.mjs:35 | `actualize select` | this run: 4 waves (select-waves.json) |
| K6 | Refuse to end a run with work outstanding | README "Enforcement hooks" | process.mjs:54-90; engine.mjs:255 | stop hook; `actualize gate` | tests/hooks/replay.test.mjs (bun test: pass) |
| K7 | Model edited only inside a reconciliation | SCHEMA.md rule 1 | process.mjs:68 (`model-tampered`) | `reconcile start/done` | tests/hooks/replay.test.mjs:103 |
| K8 | Install enforcement for several agent clients | README | hooks/install.mjs:13 (five adapters) | `bun hooks/install.mjs` | not run for any client in this session (read, not run) |
| K9 | One self-contained executable | README, docs | cockpit/build.ts | `bun run build` | executed-checks-binary.txt (Linux x86_64, no Bun on PATH) |
| K10 | Cockpit: typed surfaces over 15 block types, React/Dockview | docs/cockpit.md | cockpit/protocol/spec.ts:175 | `actualize cockpit up` | bun test browser tests in Chrome; live page screenshots (evidence/dogfood) |
| K11 | Work Terminal answers known questions locally | docs/workbench.md | cockpit/server/terminal.ts:1-4 | page footer input | evidence/dogfood/01-show-the-workflow.png |
| K12 | Typed work requests; only the owner accepts | docs/workbench.md | cockpit/server/control.ts:93; protocol/work.ts:7-21 | `human.terminal`, `actualize work` | tests/cockpit/workbench.transport.test.ts; R1 queued then acknowledged in this run |
| K13 | Capability catalogue: found vs unknown, never "usable" | docs/workbench.md | cockpit/server/capabilities.ts | `actualize work capabilities` | this run: ffmpeg found; hyperframes, bang-motion, anidoodle unknown |
| K14 | Case and world debugger: derived, read-only | docs/case-navigation.md, world-debugger.md | cockpit/server/case.ts, world.ts | `actualize world ...` | tests/cockpit/world.test.ts, case.test.ts (pass) |
| K15 | Two replayable walkthroughs, software and hardware | README | tests/walkthrough*, tests/check.py:530 | `python3 tests/check.py` | check.py OK, including mutation tests that must fail (check.py:585) |

Deficiencies found while tracing:
- Work Terminal grammar: "research and establish the market position for ..." is not understood and queues nothing; `request:` queues it (evidence/dogfood/02-request-queued.png).
- Workflow graph in ORIENT mode renders unreadably small at default zoom (evidence/dogfood/01-show-the-workflow.png).
- `bun test` flaked on a test race in workbench.e2e.test.ts (clean-checkout.txt); fixed.
- The repository is public and has no LICENSE file; `package.json` is `private: true`; no release exists.
- Only a Linux x86_64 binary was built and exercised.
