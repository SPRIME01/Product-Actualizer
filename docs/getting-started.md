# Getting started

## What you need

- A coding agent that can read files and follow instructions.
- Your product's files (a repo, CAD or 3D assets, images, documents, transcripts, media, or any mix) and a goal.
- Optional: Node 20+ to enforce the process with hooks, and Python 3 to run `tests/check.py`. The skills themselves are plain Markdown.

## 1. Make the skills available

The skills are the `skills/` folder plus `product-model/SCHEMA.md` and `product-model/TEMPLATE.md`. Either:

- open your agent inside this repository, or
- copy or symlink `skills/` and `product-model/` into your agent's skill location (the router expects `product-model/` beside it).

Only the router (`skills/actualize-product/SKILL.md`) and the schema are always loaded. A lens is read only when it runs.

## 2. Ask for an outcome

Point the agent at the router and give it the product's location and a goal with a launch bar:

> Use `actualize-product` on `~/projects/loam`. Goal: a closed-beta signup page. Bar: beta.

Bars are `demo`, `beta`, or `release`. They decide how strict the final gate is.

## 3. What happens

1. **Classify evidence.** Every input is listed by kind; the goal and bar are logged as a decision.
2. **Build the model.** The recon lenses read what exists and propose facts. Gaps become `unknowns`, never guesses.
3. **Select lenses.** Only lenses the evidence and goal need run, ordered by dependency. Exclusions are logged with a reason.
4. **Reconcile.** The router accepts or rejects every row in `proposals.md` with a logged reason, then bumps the model version.
5. **Rebuild stale work.** Artifacts built from an older model, or that cite a changed claim, are re-run.
6. **Verify.** `release-readiness` runs the product's claims and flows and returns a verdict: go, no-go, defer, or go-with-exception, with named blockers.

For a product with hardware, see [Products with hardware](physical-products.md): the hardware lenses load only on evidence of powered circuitry and add a revision-first evidence package.

The agent asks you something only when no evidence can answer it; otherwise it records an assumption as `PROPOSED` and continues.

## 4. Where the work lands

An `actualize/` folder is created beside the product:

```
actualize/
  product-model.md        the single source of truth (only the router edits it)
  proposals.md            what lenses want changed, and how each was resolved
  artifacts/<lens>/       what each lens produced, stamped built_from: model@N
  evidence/<lens>/        what each lens observed and ran
```

Read `product-model.md` first: it shows what the system believes, what it can prove, and what it does not know.

## 5. Turn on enforcement (recommended)

Instructions alone can be skipped. Hooks make the process mandatory. See [Hooks](hooks.md):

```
bun hooks/install.mjs --scope project --project ~/projects/loam
hooks/bin/actualize begin --goal "closed-beta signup page" --bar beta
```

## 6. Open the cockpit (optional)

```
just cockpit-up          # or: actualize cockpit up
```

A fixed rail shows where the run is; the agent shows you evidence, comparisons, and questions as surfaces beside it. What you answer is recorded for the router (`actualize inbox`), never applied directly. See [Cockpit](cockpit.md).

## Check the system itself

```
python3 tests/check.py          # sizes, lens structure, fixture model vs schema, staleness
bun test        # replays the walkthrough through the hook engine
```
