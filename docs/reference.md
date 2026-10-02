# Reference

## Commands (`hooks/bin/actualize`)

| command | purpose |
|---|---|
| `begin --goal "<text>" --bar demo\|beta\|release [--dir actualize] [--lenient] [--force]` | start a run |
| `lenses` | list every lens with description, reads, needs |
| `select --lenses a,b [--satisfied x,y] --exclude lens="reason"` | record the lens selection and exclusions |
| `lens start <name>` / `lens done <name> [--no-output "<reason>"]` | open and close a lens run |
| `reconcile start` / `reconcile done` | window for editing `product-model.md` |
| `status [--json]` / `gate [--json]` | position, next step, stop blockers |
| `done` | close the run (needs a passing gate) |
| `pause --reason "<question>"` | allow stopping to ask the user |
| `model restore` | revert the model to the last reconciled version |
| `validate [file]` | check a model against `SCHEMA.md` |
| `hook <client> <event>` | native hook entry point; clients call this, you do not |

## Environment variables

| variable | effect |
|---|---|
| `ACTUALIZE_DIR` | use this run directory instead of searching for `actualize/` upward from the cwd |
| `ACTUALIZE_SKILLS_DIR` | lens location (default: this repo's `skills/`) |
| `ACTUALIZE_MODEL_DIR` | schema location (default: this repo's `product-model/`) |
| `ACTUALIZE_BACKUP_DIR` | where the installer stores backups |
| `ACTUALIZE_STDIN_IDLE_MS` | hook stdin idle timeout (default 1500) |
| `ACTUALIZE_DEBUG` | print hook errors to stderr |

## Files in a product's `actualize/` folder

| path | owner | notes |
|---|---|---|
| `product-model.md` | router | edited only during reconciliation |
| `proposals.md` | lenses append, router resolves | status: open, `accepted:D<n>`, or `rejected` with reason |
| `artifacts/<lens>/` | that lens | first lines: `built_from`, `reads`, `cites`, `public` |
| `evidence/<lens>/` | that lens | observations and command results; nested folders allowed (for example `recon-physical/hardware/`) |
| `state.json`, history | CLI | do not edit |

## Artifact header

```
built_from: model@4
reads: [purpose, claims]
cites: [C1, C2]
public: true
```

`reads` must be within the lens's own `reads`. `public: true` artifacts may cite only `OBSERVED` or `VERIFIED` claims.

## Lenses

| lens | owns |
|---|---|
| `recon-software` | what a codebase actually does versus what its docs say |
| `recon-physical` | what objects, hardware (exact boards, parts, revisions, schematics, BOMs, datasheets), CAD, images, documents, transcripts, and media show and measure |
| `electronics` | the electrical implementation: domains, power paths and budgets, protection, buses, sensing, bench verification |
| `embedded-systems` | the hardware/software boundary on MCU and Linux SBC targets: identity, boot, flash, recovery, pins, drivers, services, updates |
| `robotics` | embodied closed-loop behavior: sensors to state to decisions to control to actuators, timing, safe states, physical testing |
| `direction` | project-wide aesthetic system and its per-deliverable interpretation |
| `brand` | positioning, name, identity, voice |
| `experience` | users, flows, states, interaction behavior |
| `product-visualization` | faithful renders from real geometry and materials |
| `marketing` | acquisition, launch, pages, measurement |
| `motion-editorial` | structure, pacing, cuts, motion |
| `audio-sound` | dialogue, music, product sound, mix, loudness |
| `illustration` | diagrams, icons, charts, non-literal visuals |
| `fidelity-qa` | built output compared to its source of truth, by measurement |
| `provenance-licensing` | where each asset and dependency came from and what may be done with it |
| `legacy-modernization` | changing an existing system safely so it can launch |
| `release-readiness` | final gate: true, current, coherent, launchable, verified by running |

Each lens file has the sections Reads from the model, Distinctions, Failure modes, Check, and Writes to proposals. Detail lives in its `references/`.

## Repository checks

`python3 tests/check.py` enforces: router at most 40 lines, schema at most 120, lenses 60 to 100, references linked from their lens and at most 150 lines, required sections, the physical lens chain and
routing scenarios (digital-only and passive products load no physical lens), both walkthroughs' models against the schema, artifact staleness (with expected results), grade discipline, the hardware evidence
package (manifest, revision contradictions, component profiles and sources), re-execution of the executed evidence (power budget, pin check, host tests, with a negative control), and the release gate's physical evidence walk
(with mutations that must fail). `node --test tests/hooks/` replays both walkthroughs through the hook engine.
