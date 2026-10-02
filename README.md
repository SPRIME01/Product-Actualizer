# Product Actualizer

Agent skills that take an incomplete real product (a repo, hardware, CAD or 3D assets, screenshots, documents,
media, transcripts, or any mix) and move it toward a coherent, launchable whole.

The skills are plain Markdown, YAML front matter, and JSON, with no framework assumptions: any coding agent that can read files and follow
instructions can use them. The optional enforcement hooks and the interactive cockpit run on [Bun](https://bun.sh) 1.4 or later (one runtime, no Node);
the hook engine itself has no dependencies.

## The idea

Every artifact (UI, brand, renders, site, film, copy) is derived from one shared **Product Model**. Skills are not an
org chart of tools. Each one is a **lens**: how a professional in that field represents the problem, expressed as the
distinctions they make, the failure modes they know, and the checks they run.

The model's most important rule: every claim a product may make sits in a **claims ledger** with an evidence grade
(`OBSERVED`, `VERIFIED`, `REPORTED`, `INFERRED`, `PROPOSED`, `UNKNOWN`, `CONTRADICTED`) and a re-openable source.
Public-facing copy may only use `OBSERVED` or `VERIFIED` claims. Gaps are written as **unknowns**, never filled by guessing.

## Layout

| path | what it is |
|---|---|
| `product-model/SCHEMA.md` | the model's fields, evidence grades, rules, versioning and staleness (always loaded) |
| `product-model/TEMPLATE.md` | a blank model instance |
| `skills/actualize-product/` | the router (always loaded): classifies evidence, builds the model, picks lenses, reconciles, rebuilds stale work, verifies |
| `skills/<lens>/SKILL.md` | one lens each, 60-100 lines, with `references/` for detail loaded only on demand |
| `PROVENANCE.md` | which donor repositories informed which lens, and under what license |
| `tests/check.py` | checks size limits, lens structure, the fixture model against the schema, and artifact staleness |
| `tests/fixture/`, `tests/walkthrough/` | a fake incomplete software-and-sensor product and a hand-run transcript through the whole system |
| `tests/fixture-mote/`, `tests/walkthrough-mote/` | a fictional desk robot (schematics, BOM, datasheets, firmware, host app, unit captures) and its walkthrough to a no-go gate |
| `product-model/PHYSICAL-PREFLIGHT.md` | the discipline for state-changing actions on a real unit |
| `hooks/` | process engine, hook entry point, and installers for six agent clients (Bun) |
| `cockpit/` | the interactive cockpit: typed surface vocabulary, workspace reducer, SQLite projection, Bun server, React UI, WebMCP |
| `skills/cockpit/` | the small skill that teaches an agent to drive the cockpit (a tool skill, not a lens) |
| `justfile` | `just cockpit-up`, `cockpit-down`, `test`, `build`, `dev` |
| `AGENTS.md` | conventions for working in this repository |

## The lenses

| lens | owns |
|---|---|
| `recon-software` | what a codebase actually does, as opposed to what its docs say |
| `recon-physical` | what physical objects, hardware (exact boards, revisions, schematics, BOMs, datasheets), CAD, images, documents, transcripts, and media show and measure |
| `electronics` | the electrical implementation: domains, power, protection, buses, sensing, bench verification |
| `embedded-systems` | the hardware/software boundary on MCU and Linux SBC targets: identity, boot, flash, recovery, drivers, services, updates |
| `robotics` | embodied closed-loop behavior and physical AI: sensing to control to actuation, timing, safe states, physical testing |
| `direction` | the project-wide aesthetic system (creative direction) and its per-deliverable interpretation (art direction) |
| `brand` | who the product is: positioning, name, identity, voice |
| `experience` | how actors accomplish their jobs: flows, states, interaction behavior |
| `product-visualization` | faithful renders from real geometry and materials |
| `marketing` | how attention is acquired and converted: channels, launch, pages, measurement |
| `motion-editorial` | time: structure, pacing, cuts, motion |
| `audio-sound` | everything audible: dialogue, music, product sound, mix, loudness |
| `illustration` | non-literal visuals: diagrams, icons, charts, illustration |
| `fidelity-qa` | built output compared to its source of truth, by measurement |
| `provenance-licensing` | where every asset and dependency came from and what may be done with it |
| `legacy-modernization` | changing an existing system safely so it can launch |
| `release-readiness` | the final gate: true, current, coherent, launchable, verified by running |

Where lenses overlap, each file states ownership explicitly (for example, brand owns who the product is, marketing owns
how attention is acquired). A lens's `executes_with` front matter names existing skills (hallmark, impeccable,
img2three, threejs-skills, marketingskills, humanizer, hyperframes, bang-motion, anidoodle, ffmpeg, and others) that
serve as its execution layer when installed; the lens supplies the judgment, not the tool syntax.

## How a run works

1. Classify the evidence and state the goal and its launch bar.
2. Build the model from the recon lenses' proposals; gaps become unknowns.
3. Select only the lenses the evidence and goal require, ordered by their `needs`; run independent ones in parallel.
4. Reconcile `proposals.md`: the router, the only editor of the model, accepts or rejects each proposal with a logged reason.
5. Every artifact records `built_from: model@N`, the fields it `reads`, and the claim ids it `cites`; when a later decision
   touches any of those, the artifact is stale and its lens re-runs.
6. Run `release-readiness`; stop at a verdict (go, no-go, defer, go-with-exception) with named blockers.

Only the router and the schema are always loaded. A lens body is read only when that lens runs.

## Using it

Full guides are in [`docs/`](docs/README.md): getting started, concepts, hooks, and reference.

Point your agent at `skills/actualize-product/SKILL.md` and `product-model/SCHEMA.md` with the product's files and a goal
("a closed-beta page", "a launch film", "a store listing"). Work products land in an `actualize/` folder beside the
product: `product-model.md`, `proposals.md`, and `artifacts/<lens>/`.

Check the system itself:

```
python3 tests/check.py
```

`tests/walkthrough/TRANSCRIPT.md` shows one full pass on a small fixture: which lenses loaded and which were excluded, the
model at each version, a rejected proposal, a defect found only by executing a claim, and a stale artifact detected and rebuilt.
`tests/walkthrough-mote/TRANSCRIPT.md` does the same for a hardware and physical-AI product: revision contradictions, a calculated power budget, a static pin check, an unbounded actuator, and a gate that refuses unexercised physical claims. See `docs/physical-products.md`.

## Enforcement hooks

The process is enforced, not just described. `hooks/` holds a small Bun engine (no dependencies) that tracks a run
(`begin`, `select`, `lens start/done`, `reconcile start/done`, `done`) and gates the agent: it injects status at session
start and on each prompt, blocks writes that break the rules (for example lenses editing `product-model.md`), and refuses to
let the agent stop while lenses, reconciliation, stale artifacts, or the release gate are outstanding.

```
bun hooks/install.mjs --scope project --project <dir>   # Claude Code, Codex, Cline, OpenCode, Pi / Prime Agent
bun hooks/install.mjs --status | --dry-run | --uninstall
hooks/bin/actualize status                                # current run, next step, stop gate
bun test                                                  # hook engine, cockpit protocol, server, and browser tests
```

Bun is required (`curl -fsSL https://bun.sh/install | bash`). If it is missing, hooks stay silent and print one line to stderr; every other command fails with a clear message. `just build` produces a single executable that needs no Bun on the target.

Installs are idempotent and touch only entries marked as managed. `--scope user` is safe globally: hooks stay silent unless
the working project has an actualize run.

## The cockpit

An optional interactive workbench over a run, for the owner. A fixed rail shows where the process is (never more than a fifth of the screen);
the rest is a Dockview workspace of **surfaces** the agent composes from fifteen typed blocks (tables, charts, graphs, comparisons, documents,
entities, preflights, questions) as data, never as code. Everything the owner clicks becomes recorded input (`actualize inbox`) that the router
routes through proposals and reconciliation; the cockpit cannot edit the model, a grade, or a gate. The process works with it closed.

```
just cockpit-up        # or: actualize cockpit up      (opens your browser; PROJECT=<dir> or run from the project)
just cockpit-down
```

See `docs/cockpit.md`.

## Provenance

Donor repositories informed the lenses as reading material only; nothing is copied verbatim and none is a dependency.
See `PROVENANCE.md` for what came from where and each donor's license.
