# Product Model — schema

One file per product, `product-model.md`, built from `TEMPLATE.md`. Every artifact (UI, brand,
renders, site, film, copy) derives from it. If something is not in the model, it is not known.

## Rules

1. **Only the orchestrator edits the model** (the `actualize-product` router). Lenses never do.
2. **Lenses write to `proposals.md`**: discoveries and change requests. The orchestrator accepts
   or rejects each with a logged reason. Acceptance creates a decision-log row.
3. **Every derived artifact records the model version it was built from** in its first lines:
   `built_from: model@N`, `reads: <field keys it used>`, `cites: <claim ids it states>`.
   Staleness is a version comparison (see below).
4. Nothing is filled by guessing. A gap is an `unknowns` row, not a plausible sentence.

## File shape

Front matter: `product:` (name), `model_version:` (integer, starts at 1).
Then these H2 sections, in this order, with exactly these titles. Field keys (used by `reads`
and `touched`) are in backticks.

| Section | Key | Content |
|---|---|---|
| Purpose | `purpose` | Why the product exists, one to three sentences. What changes for whom. |
| Actors | `actors` | Table: id (A1…), actor, job they are hiring the product to do. Include non-users: buyer, installer, regulator, maintainer. |
| Capabilities | `capabilities` | Table: id (K1…), what the product does, claim ids that support it. |
| Constraints | `constraints` | Three labeled lists: Technical, Physical, Legal. Each item cites a source. |
| Form and interaction | `form` | What it is and how it is operated: dimensions, materials, surfaces, flows, states, inputs. |
| Voice | `voice` | How it speaks: register, vocabulary it uses and refuses, with examples that are not product claims. |
| Positioning | `positioning` | Category, alternative the actor would otherwise use, the one difference, who it is not for. |
| Claims ledger | `claims` | Table: id (C1…), claim, grade, source. Every claim any artifact may make. |
| Unknowns | `unknowns` | Table: id (U1…), question, what it blocks (artifact or lens), who can answer. |
| Decision log | `decisions` | Table: n (D1…), decision, rationale, touched (field keys), model version created. |

## Evidence grades

| Grade | Meaning |
|---|---|
| `OBSERVED` | The agent inspected the thing itself this project: read the code path, opened the file, measured the part, viewed the image. A description of the thing is not the thing. |
| `VERIFIED` | A check that could have failed was run (test, measurement, render-vs-CAD comparison, license text read), or a named owner confirmed in writing; the source says who/when. |
| `REPORTED` | A source states it (README, chat, transcript, spec sheet) and nobody checked. |
| `INFERRED` | Derived from other claims; the source column lists their ids. Grade is no higher than the weakest parent. |
| `PROPOSED` | A decision or aspiration, not yet true. |
| `UNKNOWN` | No evidence. Lives in Unknowns; appears in the ledger only to record that someone wants to claim it. |
| `CONTRADICTED` | Two sources disagree. The source column names both. Resolved only by new evidence. |

**Public-facing copy may use only `OBSERVED` or `VERIFIED` claims**, cited by id (`[C4]`).
Everything else is internal. "Public-facing" includes the site, store listing, packaging, README
intro, captions, voiceover, alt text, and sales conversation scripts. Grades move up only with a
new source and down on any contradiction; a downgrade makes every artifact citing the claim stale.

## Source format

`path:line`, `path` + region, `url@date`, `file#timecode`, `owner:<name>@<date>`, or `test:<command>`.
A source that cannot be re-opened by someone else is not a source.

## `proposals.md`

Table: `id | lens | field | kind | proposal | evidence | status | reason`.
`kind` is `discovery` (new fact) or `change` (edit to an existing row). `status` is `open`,
`accepted:D<n>`, or `rejected`; the reason is required on resolution and never "not needed".
Proposals must name the field they would change and include evidence in the Source format.

## Versions and staleness

- `model_version` increments by one per reconciliation that changed anything, never per row.
- Each decision-log row records `touched` field keys and the version it created. When it touches
  claims it names the ids (`claims:C4` or `claims:C4+C14`); a bare `claims` means all.
- An artifact is **stale** if some decision with a version greater than its `built_from` touched a
  field key in its `reads`. For `claims` only the ids in its `cites` count. A decision touching only
  `unknowns` does not stale an artifact that does not read `unknowns`. A lens's `reads` is the
  most an artifact may list.
- Unstamped artifacts are treated as stale.

## Validity checklist (the fixture must pass all)

1. Front matter has `product` and integer `model_version` ≥ 1.
2. All ten sections exist, in order, titled as above.
3. Every claim id is unique, has a grade from the list, and a source (except `UNKNOWN`).
4. Every `INFERRED` source cites existing claim ids; every `CONTRADICTED` cites two sources.
5. Every capability cites existing claim ids.
6. Decision numbers are consecutive; each cites a version ≤ `model_version`; max version in the
   log equals `model_version`.
7. Every `UNKNOWN`-grade claim has a matching Unknowns row.
8. Every id in an artifact's `cites` and inline `[C…]` citations exists, the two lists agree, and
   the grade is `OBSERVED` or `VERIFIED` if the artifact is public-facing.
