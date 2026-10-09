# Skills and lenses (subsystem guide)

Layer 3. For the operator's view of the same process see [../concepts.md](../concepts.md); this page is how the skill layer is actually built.

## Purpose

The normative core of the product. Everything else in the repo is machinery that serves these Markdown files. The router (`skills/actualize-product/SKILL.md`, 22 lines) fixes the order of work; the lenses (`skills/<name>/SKILL.md`) supply the judgment applied to one domain. The rules they state — who edits the model, what may be cited publicly, when a preflight is required — are the rules; code enforces only what can be checked mechanically.

## Responsibilities

- One shared Product Model as the only source of truth (`product-model/SCHEMA.md:1-4`).
- Exactly one writer of `product-model.md`: the router. Lenses never edit it (`SCHEMA.md:8`, `actualize-product/SKILL.md:18`).
- Field-level authority: each lens reads only its frontmatter `reads` list, which is also the ceiling on what its artifacts may stamp (`SCHEMA.md:73-74`).
- Ordering: `needs` is a dependency edge; the router orders by it and never starts a lens before its needs are satisfied (`SKILL.md:11`).
- Evidence grading and the public-citation floor (`SCHEMA.md:35-52`).
- Physical-action discipline for the lenses that touch a unit (`product-model/PHYSICAL-PREFLIGHT.md:1-5`).
- Progressive disclosure: detail lives in a lens's `references/`, loaded only when the lens body says to load it (`AGENTS.md:7-8`).

## Non-responsibilities

- Writing code, running tools, or rendering. A lens names what executes; `executes_with` is the execution layer *when installed on the agent host* (`SKILL.md:19`). An empty `executes_with` means the lens does its work directly.
- Owning state. Nothing under `skills/` holds runtime state; the run directory `actualize/` is authoritative (`AGENTS.md:13`).
- Being a UI. `skills/cockpit/` is `kind: tool`, so `check.py` skips the lens rules for it and applies only the tool-skill line budget. `skills/reconstruct-experience/` is also `kind: tool`: its original v0.2 method is invoked from an active `recon-software` lens when demonstration evidence exists, not selected as a separate lens.
- Depending on the third-party skills it names. `ffmpeg`, `hallmark`, `impeccable`, `blender`, `threejs-skills`, `kicad-design`, `ros2-skill`, `marketingskills`, `humanizer`, `hyperframes`, `bang-motion`, `img2three`, `anidoodle`, `playwright-cli`, `agent-browser`, `ee-datasheet-master`, `schematic-analyzer`, `xiao-assistant`, `esp32-development` are not in this repo. Donor material is restated in this project's own words and no donor is a dependency (`PROVENANCE.md:1-5`).

## Position in the system

```
agent host loads skills/actualize-product/SKILL.md + product-model/SCHEMA.md
        │
        ├─ step 3 reads ONLY frontmatter of skills/*/SKILL.md  (selection)
        │
        ▼  loads the body only when it runs the lens
skills/<lens>/SKILL.md ──► references/*.md (on demand, ≤150 lines)
        │  reads model fields, applies executes_with skills if present
        ▼
actualize/proposals.md     actualize/artifacts/<lens>/     actualize/evidence/<lens>/
        │                          │                              │
        └─ router reconciles ─► actualize/product-model.md  (+ model_version bump)
                                    │
              hooks/src/engine.mjs denies writes that skip this (runtime enforcement)
```

Prose in `skills/` is the contract. `tests/check.py` checks the *shape* of that contract; `hooks/` checks *behaviour* at runtime. Neither substitutes for the other.

## Core abstractions

**The router.** Six numbered steps (`SKILL.md:9-14`): classify evidence by kind and state goal plus launch bar (demo|beta|release) as a decision; build/update the model from `recon-*` output at version 1, gaps as `unknowns`; select lenses; reconcile every open proposal row; rebuild stale artifacts; run `release-readiness` and loop back until the gate passes the bar or blockers are reported. Then seven enforced rules (`SKILL.md:16-22`): no public artifact cites a claim below `OBSERVED`/`VERIFIED`; a lens never edits the model; installed `executes_with` capabilities are the execution layer, don't reimplement them; a state-changing physical action follows `PHYSICAL-PREFLIGHT.md` while read-only discovery is never blocked by it; when the cockpit is up prefer it over prose for evidence, comparisons, contradictions, staleness, preflights and owner-only judgements, routing each answer through proposals and the next reconciliation before `inbox ack`; and ask the user only when blocked on something no evidence can answer — otherwise log a `PROPOSED` assumption and continue.

**A lens.** A 60–100 line `SKILL.md` with five required H2 sections: `## Reads from the model`, `## Distinctions`, `## Failure modes`, `## Check`, `## Writes to proposals` (`check.py:62-72`). Frontmatter is exactly `name`, `description`, `reads`, `needs`, `executes_with` (`check.py:65-67`); `name` must equal the directory name, every `reads` entry must be one of the ten schema field keys (`check.py:6`, `check.py:68-75`), and `## Check` needs at least one numbered item (`check.py:77-79`).

**`needs`.** An acyclic edge, checked by a DFS cycle pass over all lenses (`check.py:80-92`); each named dependency must itself be a lens in this repo (`check.py:81-83`).

**`executes_with`.** Free-form and unvalidated. It names capabilities the agent is expected to already have on the host.

**`references/`.** Every `*.md` in a lens's `references/` must be linked by exact filename from the lens body, every link must resolve, and each file is capped at 150 lines (`check.py:200-215`). Six lenses ship one: `audio-sound`, `electronics`, `embedded-systems`, `product-visualization`, `recon-physical`, `robotics` (plus `cockpit`, a tool skill).

## Internal operation

Selection is evidence-driven, not catalogue-driven. `recon-software`, `recon-physical`, `brand`, `fidelity-qa`, `provenance-licensing` have `needs: []` and can run in wave 1. The physical chain is strictly linear and asserted by `check.py:218-231`: `recon-physical → electronics → embedded-systems → robotics`; each physical lens body must name `PHYSICAL-PREFLIGHT.md`, and `robotics` must gate `references/ros2.md` behind "only when ROS is present".

The chain loads only on evidence (`SKILL.md:11`): none of it for a digital-only or passive-object product (a plain `recon-physical` pass suffices for the latter); `electronics` on powered circuitry; `embedded-systems` on firmware or an embedded OS; `robotics` on closed-loop sensing and acting with software in the loop. Hardware identity always comes from `recon-physical` first. A lens whose `needs` the model already answers is marked SATISFIED, not run. `brand` gates the creative branch — `direction`, `experience`, `marketing`, `illustration`, and `motion-editorial` all need it; `audio-sound` uniquely needs `motion-editorial`; `legacy-modernization` needs `recon-software`; `product-visualization` needs both `recon-physical` and `direction`.

`check.py:186-196` encodes six routing scenarios and fails if a chosen lens's need is neither chosen nor satisfied, or if a lens the scenario excludes is chosen. The chain is a checked property, not only prose.

Order inside a wave: evidence and proposals, then reconciliation, then artifacts. A lens whose artifact cites what it proposed (`brand`, `direction`, the three physical lenses) builds *after* reconciliation so `built_from` records the new `model_version` (`SKILL.md:12`).

## State

None. The skill layer is read-only text. A lens's only persistent effect is rows in `proposals.md` plus its own `artifacts/<lens>/` and `evidence/<lens>/` — e.g. `skills/electronics/SKILL.md:62` names `electrical-review.md` and `evidence/electronics/{power-budget,bus-budget,measurements,actions}.md`. Phase, selection, and reconciliation windows are owned by `hooks/src/process.mjs`; the cockpit's SQLite holds a disposable projection and the cockpit's own durable state, never process truth (`AGENTS.md:13`, `docs/workbench.md`).

## Lifecycle

Select (frontmatter only) → load the body → write evidence → write proposals → the router reconciles and bumps `model_version` once per reconciliation that changed anything → build the stamped artifact → verify. Staleness is a version comparison against the decision log: an artifact is stale when a decision newer than its `built_from` touched a key in its `reads`, or — for `claims` — an id in its `cites`; unstamped artifacts are stale (`SCHEMA.md:66-75`, `check.py:157-175`). A downgrade makes every artifact citing that claim stale immediately (`SCHEMA.md:52`).


## Failure modes

- **Structure faults, caught by `python3 tests/check.py`:** a lens outside 60–100 lines; a tool skill over 60; a missing frontmatter key; `name` differing from the directory; a missing or misnamed section; a `reads` field outside the schema; an unnumbered `## Check`; a `needs` naming an unknown lens; a `needs` cycle; an unlinked or missing `references/` file; a reference over 150 lines; a broken physical chain; a router that drops the preflight requirement (`check.py:43-241`).
- **Behavioural faults, caught at runtime by `hooks/`:** a lens editing `product-model.md`; an artifact citing a claim that does not exist, or citing below the public floor; a stamp whose `built_from` has no snapshot; a state-changing hardware command without a recorded preflight (`docs/subsystems/hooks.md:13-14`).
- **Selector faults, caught while walking the walkthroughs** (`check.py:500-545`): an artifact whose `reads` is wider than its lens's own `reads` (`check.py:536-538`); inline `[C…]` citations that disagree with the stamped `cites` list; a selection decision that does not mention every lens in the repo (`check.py:485-497`).
- **Not checked anywhere:** the substance of lens prose. `check.py` never opens `proposals.md` — the only occurrence of that string in the file is the required section heading at `check.py:70`. Rejection reasons (the schema forbids "not needed", `SCHEMA.md:63`), whether a lens was the right choice, whether a distinction is true — enforced only by the router at runtime, or not at all.
- **Selection errors no checker sees:** a lens run before its `needs`; the physical chain loaded for a digital-only product; a lens chosen that the evidence does not support; a hypothesis recorded as a claim instead of an unknown.

## Extension points

- **A new lens.** Create `skills/<name>/SKILL.md` with frontmatter `name` (== directory), `description`, `reads`, `needs`, `executes_with` and the five sections, 60–100 lines, `## Check` numbered. `reads` must use the ten schema field keys; `needs` must name existing lenses and stay acyclic. Then run `python3 tests/check.py`: it prints the lens count and validates both walkthroughs, including that every lens appears in each walkthrough's selection decision (`check.py:485-497`). A public-facing artifact stamps `public: true`.
- **Split a lens.** Move detail into `skills/<name>/references/<file>.md`, link it by exact filename from the lens body, keep it under 150 lines (`check.py:200-215`). `robotics/references/ros2.md` is the worked example of a conditional reference.
- **A new evidence kind.** Update the router's step-1 kind list (`SKILL.md:9`) and any lens that claims it; the physical branch additionally gates on evidence through `SCENARIOS` (`check.py:186-196`).
- **A new tool skill.** Add `kind: tool` frontmatter so it stays out of the lens set (`check.py:57-61`). A lens with `executes_with` calls such a tool in its authorized write scope; e.g. `recon-software` conditionally calls `reconstruct-experience` and stores its dossier under `evidence/recon-software/reconstruct-experience/`. Tool skills have no model-write authority.
### Source trail

- Router: `skills/actualize-product/SKILL.md:1-22` (steps `9-14`, rules `16-22`).
- Tool skill: `skills/cockpit/SKILL.md:1-8,11,17,24-30`; `kind: tool` at `skills/cockpit/SKILL.md:3`.
- Schema: `product-model/SCHEMA.md:1-4,8-14,18-33,35-52,59-64,66-75,77-88`; template `product-model/TEMPLATE.md:1-4`.
- Physical discipline: `product-model/PHYSICAL-PREFLIGHT.md:1-5,11-17,21-32,35-49`.
- Lenses: frontmatter of all `skills/*/SKILL.md`; the five `needs: []` lenses are `recon-software`, `recon-physical`, `brand`, `fidelity-qa`, `provenance-licensing`. `executes_with` inventories at `skills/{audio-sound,direction,electronics,embedded-systems,experience,fidelity-qa,illustration,marketing,motion-editorial,product-visualization,recon-physical,release-readiness,robotics}/SKILL.md:1-9`.
- References convention: `skills/recon-physical/SKILL.md:23`, `skills/electronics/SKILL.md:11`, `skills/robotics/SKILL.md:11,32`, `skills/product-visualization/SKILL.md:21`, `skills/audio-sound/SKILL.md:25`; contents of `skills/recon-physical/references/hardware-context.md:1-6,20-32` and `skills/product-visualization/references/material-constants.md:1-6,10-14`.
- Enforcement boundaries: `tests/check.py:43-99` (structure, refs, chain), `186-196` (routing scenarios), `200-215` (references), `218-241` (physical chain and scenarios), `485-497` (selection decision coverage), `500-545` (walkthroughs, stamps, reads ceiling), `597-608` (cockpit is a tool skill); `proposals.md` is never opened by any of it.
- Runtime enforcement: `docs/subsystems/hooks.md:9-16,26-49`; `docs/hooks.md`.
- Provenance: `PROVENANCE.md:1-5,7-29,72-78`; repo conventions `AGENTS.md:6-14`.
- Operator view: `docs/concepts.md:1-8,32-53`.
