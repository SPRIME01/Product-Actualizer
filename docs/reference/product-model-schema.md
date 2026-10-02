# The Product Model contract

Layer 8. The contract `product-model.md` must satisfy, and the algorithm that decides staleness. One file per product, built from `product-model/TEMPLATE.md`.

Two independent implementations exist and must agree: `hooks/src/lib/md.mjs` (used by the CLI and the engine) and `tests/check.py` (stdlib, used by `python3 tests/check.py`). Where they differ, this page says so.

## Front matter

```
---
product: <name>
model_version: 1
---
```

`product` is required; `model_version` must be an integer ≥ 1 (`md.mjs:53`, `SCHEMA.md:18`). `parseModel` reads only those two keys (`md.mjs:43`).

## The ten sections

Exact titles, exact order. `validateModel` compares the heading array to the constant and returns immediately on mismatch (`md.mjs:54`; `SECTIONS`, `md.mjs:6`).

| # | section title | field key | content | shape |
|---|---|---|---|---|
| 1 | `Purpose` | `purpose` | why the product exists, 1–3 sentences; what changes for whom | prose |
| 2 | `Actors` | `actors` | id (A1…), actor, the job they hire the product for. Include non-users: buyer, installer, regulator, maintainer | table `id \| actor \| job` |
| 3 | `Capabilities` | `capabilities` | id (K1…), what the product does, claim ids supporting it | table `id \| capability \| claims` |
| 4 | `Constraints` | `constraints` | three labelled lists — **Technical**, **Physical**, **Legal** — each item citing a source | prose + subheadings |
| 5 | `Form and interaction` | `form` | what it is and how operated: dimensions, materials, surfaces, flows, states, inputs. For hardware also the major physical and electrical subsystems, sensors, actuators, ports, and the product-relevant connections, one line each citing the evidence package holding the detail | prose |
| 6 | `Voice` | `voice` | register, vocabulary it uses and refuses, with examples that are not product claims | prose |
| 7 | `Positioning` | `positioning` | category, the alternative the actor would otherwise use, the one difference, who it is not for | prose |
| 8 | `Claims ledger` | `claims` | id (C1…), claim, grade, source. Every claim any artifact may make | table `id \| claim \| grade \| source` |
| 9 | `Unknowns` | `unknowns` | id (U1…), question, what it blocks (artifact or lens), who can answer | table `id \| question \| blocks \| who can answer` |
| 10 | `Decision log` | `decisions` | n (D1…), decision, rationale, touched (field keys), model version created | table `n \| decision \| rationale \| touched \| version` |

Field keys are the names used in an artifact's `reads` and a decision's `touched`. The key ↔ section mapping is `SECTION_KEY` (`md.mjs:7`), computed positionally from `SECTIONS` and `FIELDS` (`md.mjs:5`).

`TEMPLATE.md` supplies the exact table headers, an empty Constraints block with the three subheadings, and one seeded row `| D1 | Model created from initial evidence | <what evidence was classified> | all | 1 |`.

## Claims ledger rules

| rule | `md.mjs` | `check.py` |
|---|---|---|
| id matches `^C\d+$` | 56 | — |
| grade ∈ the seven grades | 57 | 134 |
| a source is required unless grade is `UNKNOWN` | 58 | 135 |
| an `INFERRED` source may only name existing claim ids | 59 | 138-139 |
| `CONTRADICTED` needs ≥ 2 sources separated by `;` | 60 | 140-141 |
| every `UNKNOWN`-grade claim has a matching Unknowns row, naming its id in the claim text or source | 61 | 143-145 |
| every capability's claim ids exist | 62 | 146-148 |

## Evidence grades — all seven

Verbatim from `SCHEMA.md:37-45`.

| grade | meaning |
|---|---|
| `OBSERVED` | The agent inspected the thing itself this project: read the code path, opened the file, measured the part, viewed the image. **A description of the thing is not the thing.** |
| `VERIFIED` | A check that could have failed was run (test, measurement, render-vs-CAD comparison, license text read), or a named owner confirmed in writing; the source says who/when. |
| `REPORTED` | A source states it (README, chat, transcript, spec sheet) and nobody checked. |
| `INFERRED` | Derived from other claims; the source column lists their ids. Grade is no higher than the weakest parent. |
| `PROPOSED` | A decision or aspiration, not yet true. |
| `UNKNOWN` | No evidence. Lives in Unknowns; appears in the ledger only to record that someone wants to claim it. |
| `CONTRADICTED` | Two sources disagree. The source column names both. Resolved only by new evidence. |

The set is `GRADES` in `md.mjs:8`; `PUBLIC_GRADES = {OBSERVED, VERIFIED}` (`md.mjs:9`).

### Hardware-specific grade rules (`SCHEMA.md:47`)

Verbatim: *For hardware, prose documents (datasheet, manual, guide, wiki) are `REPORTED` even when authoritative; a design source file (schematic, BOM, CAD) read directly is `OBSERVED` as that file at its revision, and a claim about the unit built from it is `INFERRED` and cites the unit's revision; a calculated or simulated value is `INFERRED`; a marking, enumeration, or capture made on the unit is `OBSERVED`; `VERIFIED` is a check that could have failed, run on the unit against a predicted value.*

| situation | grade |
|---|---|
| a prose document (datasheet, manual, guide, wiki) says it, however authoritative the document | `REPORTED` |
| a design source file (schematic, BOM, CAD) read directly | `OBSERVED` **as that file at its revision** |
| a claim about the unit *built from* that file | `INFERRED`, citing the unit's revision |
| a calculated or simulated value | `INFERRED` |
| a marking, enumeration, or capture made on the unit | `OBSERVED` |
| a check that could have failed, run **on the unit** against a predicted value | `VERIFIED` |

That last rule makes a hardware `VERIFIED` claim a different object from a software one: `check.py:439` refuses `VERIFIED` sourced from `datasheet` or `.md:<line>` without a `test:` or `owner:` prefix, and `check.py:437` refuses an `OBSERVED`/`VERIFIED` claim resting on `evidence/electronics/` (a calculation).

Detailed hardware data — pin maps, limits per part — stays in `evidence/<lens>/` and is cited by path.

### Grade movement and public copy

Public-facing copy may use only `OBSERVED` or `VERIFIED`, cited by id as `[C4]` (`SCHEMA.md:49`). "Public-facing" includes the site, store listing, packaging, README intro, captions, voiceover, alt text, and sales conversation scripts (`SCHEMA.md:50-51`). Grades move **up only with a new source** and **down on any contradiction**; a downgrade makes every artifact citing the claim stale (`SCHEMA.md:51-52`).

## Source format

Six accepted forms (`SCHEMA.md:56`):

| form | example |
|---|---|
| `path:line` | `tests/fixture-mote/firmware/neck/config.py:1-6` |
| `path` + region | `tests/fixture-mote/hardware/schematic-revC.txt:32-33` |
| `url@date` | `https://example.com/spec@2026-03-01` |
| `file#timecode` | `call-2026-02-11.mp4#00:14:22` |
| `owner:<name>@<date>` | `owner:dana@2026-10-01` |
| `test:<command>` | `test:python3 -m unittest discover -s tests -t . (in tests/fixture-mote/host): 3 passed` |

> A source that cannot be re-opened by someone else is not a source. (`SCHEMA.md:57`)

`test:` and `owner:` are the two prefixes `check.py` recognises as verification evidence (`check.py:435,439`). That grade discipline exists **only** in `check.py`; `md.mjs` does not enforce it.

A real multi-source `CONTRADICTED` row from the Mote ledger (`product-model.md:114`) — a prose guide against a calculation, separated by `;`:

```
| C31 | The supply has ample margin: hardware guide rev C budgets 1.22 A typical of 2.5 A, with servos at idle only | CONTRADICTED | tests/fixture-mote/hardware/hardware-guide-revC.md:12-21; tests/walkthrough-mote/evidence/electronics/budget.py output: 2.76 A at start-up, 3.06 A at stall against 2.5 A |
```

## `proposals.md`

Header written by `begin` (`process.mjs:13`, `PROPOSALS_HEADER`):

```
# proposals.md

| id | lens | field | kind | proposal | evidence | status | reason |
|---|---|---|---|---|---|---|---|
```

| column | rule | enforcement |
|---|---|---|
| `id` | `^P\d+$`, unique | `md.mjs:123-125` |
| `lens` | the lens that wrote it | `process.mjs:214` |
| `field` | must be one of the ten field keys | `md.mjs:126` |
| `kind` | `discovery` (new fact) or `change` (edit to an existing row) — no other value | `md.mjs:127`, `SCHEMA.md:62` |
| `proposal` | what would change | — |
| `evidence` | required, in the Source format | `md.mjs:128` |
| `status` | `open`, `accepted:D<n>`, or `rejected` | `md.mjs:129` |
| `reason` | required on resolution | `md.mjs:135-143` |

Resolution rules (`validateResolution`, `md.mjs:132-154`):

- A row already resolved in the base snapshot is **immutable** — any change is an error.
- An `open` row at close time is an error: *"still open; accept or reject it with a reason"*.
- A `rejected` row needs a reason ≥ 20 characters that does **not** match `WEAK_REASONS` = `/^(not needed|n\/a|na|no|none|unneeded|not required|nope|rejected)\.?$/i` (`md.mjs:132`). It must say what is wrong and what evidence would change it.
- An `accepted:D<n>` must point at a decision in the decision log (`md.mjs:139-142`), and `reconcile done` additionally requires that decision to have been **created in this reconciliation** (`process.mjs:310-314`).
- Deleting a row is an error (`md.mjs:153`).
- During a lens run, rows that existed at `lens start` may not change and may not be deleted (`process.mjs:211-213`); a lens's own new rows must be `open` (`process.mjs:215`).

## Versions and staleness — the algorithm

**Rules** (`SCHEMA.md:68-75`):

1. `model_version` increments by one per reconciliation **that changed anything**, never per row.
2. Each decision-log row records `touched` field keys and the version it created. When it touches claims it names the ids: `claims:C4` or `claims:C4+C14`. A bare `claims` means all.
3. An artifact is **stale** if some decision with a version greater than its `built_from` touched a field key in its `reads`. For `claims` only the ids in its `cites` count.
4. A decision touching only `unknowns` does not stale an artifact that does not read `unknowns`.
5. A lens's `reads` is the most an artifact may list.
6. **Unstamped artifacts are treated as stale** (`staleReasons`, `md.mjs:227`).

**The `touched` grammar** (`validTouched`, `md.mjs:78-83`). Comma-separated tokens, at least one; every token must match one of:

| token | meaning |
|---|---|
| `all` | every field, and therefore every artifact |
| any of the ten field keys | `purpose`, `actors`, `capabilities`, `constraints`, `form`, `voice`, `positioning`, `claims`, `unknowns`, `decisions` |
| `claims:C<n>+C<n>…` | specific claims, joined by `+`, each `C` followed by digits |

A bare `claims` is **rejected by `validTouched`** — the schema prose says it means all, but the validator requires the explicit `claims:C4+C14` form. `all` is how a decision covers every claim. `touchCoverage` (`md.mjs:99-114`) is more permissive: it accepts a bare `claims` and treats it as all claims.

**Pseudocode — `touches()` verbatim** (`md.mjs:213-224`):

```js
export function touches(touched, reads, cites) {
  for (const raw of String(touched).split(",")) {
    const t = raw.trim();
    if (t === "all") return true;
    if (t === "claims" || t.startsWith("claims:")) {
      if (!(reads.includes("claims") || reads.includes("all"))) continue;
      const ids = t.match(/C\d+/g) ?? [];
      if (!ids.length || ids.some((i) => cites.includes(i))) return true;
    } else if (reads.includes(t) || reads.includes("all")) return true;
  }
  return false;
}
```

**`staleReasons()` verbatim** (`md.mjs:226-229`):

```js
export function staleReasons(stamp, model) {
  if (stamp.built === null) return ["unstamped"];
  return model.decisions.filter((d) => d.version > stamp.built && touches(d.touched, stamp.reads, stamp.cites)).map((d) => d.n);
}
```

The result is the list of decision numbers that staled the artifact, in decision-log order.

`tests/check.py:161-173` implements the same function with one difference: its `t.startswith("claims")` branch has no `reads.includes("all")` escape. For an artifact whose `reads` is `all` — only the release gate may declare that — `md.mjs` treats a `claims:` token as a match and `check.py` does not. No checked artifact uses `reads: [all]`, so both agree today.

### What counts as a change between versions

`diffModels` (`md.mjs:86-97`) feeds `touchCoverage`, which `reconcile done` uses to demand that the accepted decisions' `touched` lists cover the diff:

- With no base model, every field and every claim counts as changed.
- For each section except `decisions` and `claims`, a whitespace-normalised text comparison decides the field.
- A claim counts as changed if its text, grade, **or** source differs, or if it is absent on either side. Any changed claim also adds `claims` to `changedFields`.
- `touchCoverage(touchedStrings, diff)` returns the list of uncovered changed fields; a decision listing `all` returns `[]`.

## Validity checklist

`SCHEMA.md:77-88` — the eight items the fixture must pass all:

1. Front matter has `product` and integer `model_version` ≥ 1.
2. All ten sections exist, in order, titled as above.
3. Every claim id is unique, has a grade from the list, and a source (except `UNKNOWN`).
4. Every `INFERRED` source cites existing claim ids; every `CONTRADICTED` cites two sources.
5. Every capability cites existing claim ids.
6. Decision numbers are consecutive; each cites a version ≤ `model_version`; max version in the log equals `model_version`.
7. Every `UNKNOWN`-grade claim has a matching Unknowns row.
8. Every id in an artifact's `cites` and inline `[C…]` citations exists, the two lists agree, and the grade is `OBSERVED` or `VERIFIED` if the artifact is public-facing.

Two further checks exist in code but not in the checklist: `md.mjs:71` requires a non-empty decision log, and `md.mjs:67-69` validates each decision's `touched` against `validTouched`. `check.py` also adds `decision_lens_coverage` (`check.py:489-497`): a decision whose text starts `Lenses:` must name every lens.

## Worked examples

| model | what it demonstrates |
|---|---|
| `tests/walkthrough/product-model.md` — Loam, `model_version: 4` | a software-and-sensor product. `D10` stales `history/beta-page@2.md`; the three rebuilt artifacts are current. `EXPECT_STALE` records this exactly (`check.py:547`) |
| `tests/walkthrough-mote/product-model.md` — Mote, `model_version: 6` | hardware and physical AI. `D7` — the owner's written confirmation that the unit is REV C and the microphone is the HM1100 — stales `history/electrical-review@2.md` and `history/bringup@3.md`. `history/spec-sheet@4.md` survives with `reads: [claims]`, `cites: [C1, C14, C22]`, because D7's `touched` names `claims:C42+C53+C54+C76+C77+C78+C57+C59+C60+C65` — no intersection with its cites. The gate verdict is `no-go` (`D9`), with `PHY1` unexercised on the unit |

Both directories hold `model-v1.md … model-vN.md` snapshots, `proposals.md`, `artifacts/<lens>/`, `evidence/<lens>/`, `history/`, and a `TRANSCRIPT.md` narrating the hand-run. `product-model.md` must equal the highest snapshot (`check.py:510-511`).

## What is *not* in the model

Gaps are `unknowns` rows, never a plausible sentence (`SCHEMA.md:14`, rule 4). Only the router edits the model; lenses never do (`SCHEMA.md:8`, rule 1). Lenses write discoveries and change requests to `proposals.md`, and the router accepts or rejects each with a logged reason; acceptance creates a decision-log row (`SCHEMA.md:9-10`, rule 2). If something is not in the model, it is not known (`SCHEMA.md:4`).

### Source trail

- `product-model/SCHEMA.md` — rules 1-4 (`:8-14`), the section table (`:22-33`), the seven grades (`:37-45`), the hardware grade paragraph (`:47`), the public-copy rule (`:49-52`), the source format (`:56-57`), proposals (`:61-64`), versions and staleness (`:68-75`), the eight-item checklist (`:77-88`)
- `product-model/TEMPLATE.md` — the blank instance, table headers, the seeded `D1`
- `hooks/src/lib/md.mjs` — `FIELDS:5`, `SECTIONS:6`, `SECTION_KEY:7`, `GRADES:8`, `PUBLIC_GRADES:9`, `VERDICTS:10`, `frontmatter:12`, `tableRows:26`, `parseModel:38`, `validateModel:51`, `validTouched:78`, `diffModels:86`, `touchCoverage:99`, `parseProposals:116`, `validateProposalRows:121`, `WEAK_REASONS:132`, `validateResolution:133`, `parseStamp:158`, `inlineCites:178`, `validateArtifact:184`, `touches:213`, `staleReasons:226`
- `hooks/src/process.mjs` — `PROPOSALS_HEADER:13`, `reconcileStart:240`, `reconcileDone:275` (diff coverage, resolution, immutability, the single version bump), `lensDone:206` (row immutability during a lens), `inspectArtifacts:37` (validate each artifact against the snapshot it was built from)
- `tests/check.py` — `validate_model:119`, `touches:161`, `artifact_state:176`, `check_walkthrough:500`, `EXPECT_STALE:546`, `check_grades:432`, `decision_lens_coverage:489`
- `tests/walkthrough/`, `tests/walkthrough-mote/` — the two real models, their snapshots, and `TRANSCRIPT.md`