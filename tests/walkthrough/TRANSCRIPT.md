# Walkthrough: Loam, an incomplete product, taken to a gate verdict

Hand-run of `actualize-product`. Inputs are in `tests/fixture/`: a tiny firmware repo (`loam-fw/`), one image
(`probe-render.svg`), and a rough description (`brief.txt`). Model snapshots are `model-v1..v4.md`; every one
validates against `product-model/SCHEMA.md` (`python3 tests/check.py`). Commands below were really run;
actions that need a network or a person (name screening, listening, signup) were not, and are recorded as unknowns.

Always-loaded context: `actualize-product` (22 lines) + `SCHEMA.md` (88 lines). Nothing else is loaded until a lens runs.

## Step 1: classify evidence

| input | kind |
|---|---|
| tests/fixture/loam-fw/ | code |
| tests/fixture/probe-render.svg | image |
| tests/fixture/brief.txt | document (owner description) |

No CAD, transcript, audio, or video. Goal (from "launchable"): a closed-beta signup page, text only, for about 50 people.
Bar: no public claim below `OBSERVED`/`VERIFIED`; honest about stage. Logged as D2.

## Step 2: build the model (wave 1, parallel: recon-software, recon-physical)

Loaded: both recon lenses. Outputs: `evidence/recon-software/trace.md`, `evidence/recon-physical/inventory.md`, proposals P1-P5.
Findings that shaped everything after: README says "reads every hour" but `main.py:7` sets 900 s (C6 contradicted);
README says SMS alerts but `alerts.py:23-25` raises `NotImplementedError` (C5 contradicted); the image is a render, so it
yields no `OBSERVED` claim; no license file (C12); the clean-checkout test command passed, 2 tests (C2 `VERIFIED`).

**Model v1** (`model-v1.md`): 13 claims (5 `OBSERVED`, 1 `VERIFIED`, 3 `REPORTED`, 2 `PROPOSED`, 2 `CONTRADICTED`),
6 unknowns, decisions D1-D3. Positioning: "Not decided (U3)". Voice: "Not decided".

## Step 3: select lenses

Read only the frontmatter of all 17 `skills/*/SKILL.md`. Selected, in order by `needs`:

| wave | lenses | why |
|---|---|---|
| 1 | recon-software, recon-physical (parallel) | code and non-code evidence exist |
| 2 | brand, provenance-licensing (parallel; no `needs` between them) | positioning, voice, name are empty (U3); repo and image have unknown rights |
| 3 | marketing (`needs: [brand]`, satisfied after wave 2) | the goal is a signup page |
| 4 | release-readiness | final gate |

Excluded, with the reason logged in D3: **direction** (text-only page, no visual artifact; render excluded by D8),
**experience** (no flows in scope), **product-visualization** (no geometry; only a render), **motion-editorial**,
**audio-sound**, **illustration** (no such deliverable), **fidelity-qa** (no built visual output), **legacy-modernization**
(page does not require changing the code; revisited at D10), and the three physical lenses **electronics**, **embedded-systems**, **robotics** (the goal is a text page and
no schematic, BOM, or board was supplied, so there is no hardware evidence to judge). Six of 17 lens bodies were loaded; none of the physical ones.

## Wave 2, then reconciliation to v2

brand proposed P6 positioning, P7 voice, P8 name. It could not screen the names (no search step in this pass), so the
name is "Loam (working name)" and U7 stays open rather than a clearance claim being invented. provenance-licensing proposed
P9 (repo unlicensed, owner chooses; U8) and P10 (exclude the render until authorship is confirmed; U5).
All five accepted (D4-D8). **Model v2**: positioning, voice, constraints (legal) filled; U7, U8 added; D4-D8 at version 2.
Both lenses then built artifacts after reconciliation so they record `model@2`: `artifacts/brand/identity.md` (reads
purpose, actors, positioning, voice, claims; cites C1, C2, C13) and `artifacts/provenance-licensing/ledger.md` (reads constraints, form; cites none).

## Wave 3: marketing, one rejected proposal, reconciliation to v3

Built `history/beta-page@2.md` (`built_from: model@2`, cites C1, C2, C3, C4, C13; all `OBSERVED`/`VERIFIED`). It omits battery,
waterproof, SMS, price, "spring" and "50 people": C7/C8 are `REPORTED`, C5 `CONTRADICTED`, C10/C11 `PROPOSED`.

**Rejected proposal P11** (marketing, `positioning`, change): reposition as "the only soil sensor with email and SMS alerts".
Reason logged: it rests on C5, graded `CONTRADICTED` (README claims SMS, `alerts.py:23-25` raises `NotImplementedError`); "only" is a
comparative with no ledger claim about any competitor. Revisit only with shipped SMS and a competitor comparison.

Accepted P12: U9 (signup channel, price, ship date unknown, so the page has no call to action). **Model v3**, D9 touches `unknowns`.

Staleness check after v3: D9 touched only `unknowns`. `identity.md`, `beta-page@2`, and `ledger.md` read no `unknowns`, so
**none is stale**. No rebuild was triggered.

## Step 6: release-readiness (wave 4) finds a real defect

Ledger walk re-opened each cited source. C4 was graded `OBSERVED` by reading `alerts.py` and `main.py:13-14`. The gate's action
test executed it (in `loam-fw/`):

```
$ python3 -c "from loam import alerts; print(alerts.should_alert(10.0), alerts.should_alert(80.0))"
False False
```

`THRESHOLD = 0.25` (`alerts.py:6`) is compared with a percent that runs 0-100 (`sensor.py:9`), so the alert never fires. The page
sentence "it can email you when a reading is below an alert level [C4]" was true of the code's structure and false of its behavior.
Proposals P13 (C4 to `CONTRADICTED`, add C14 `VERIFIED`, reword K3) and P14 (verdict). Accepted: D10, D11. **Model v4**.
D10 deferred the fix: repairing alerts is not needed for a text page; if the goal becomes working alerts, select legacy-modernization.

## Step 5: stale artifact detected and rebuilt

D10 touched `claims:C4+C14` and `capabilities`. Version comparison against each artifact's stamp:

| artifact | built_from | reads / cites | result |
|---|---|---|---|
| artifacts/marketing/beta-page (v2 copy: `history/beta-page@2.md`) | model@2 | reads capabilities, claims; cites C4 | **stale by D10** |
| artifacts/brand/identity.md | model@2 | cites C1, C2, C13 only | current (C4 not cited) |
| artifacts/provenance-licensing/ledger.md | model@2 | reads constraints, form | current |

marketing re-ran: the email-alert sentence was removed, a status sentence citing C14 (`VERIFIED`) was added, and `artifacts/marketing/beta-page.md`
now says `built_from: model@4`, cites C1, C2, C3, C13, C14. `python3 tests/check.py` shows it current and the v2 copy stale.

## Gate verdict (D11)

Decision: **defer**, accountable owner: product owner. Blocker: U9 (no signup channel, so no call to action). Non-blockers, handled by decision:
U5 (page ships without the render), U7 (working-name label), U8 (no code claims). Checks run: ledger walk (cited claims all `OBSERVED`/`VERIFIED`),
staleness report (empty after rebuild), placeholder scan (no lorem, TODO, TBD, example.com), cross-artifact name check ("Loam (working name)" everywhere),
executed alert check. Not run: link/CTA sweep (no CTA exists), clean-room install (hardware module absent), name screening, human listen (no audio).

## Design changes this walkthrough forced

1. Artifacts built in the same wave as their own proposals recorded the pre-acceptance version and would have been stale on arrival.
   Fix: a lens that defines model fields builds its artifact after reconciliation (router step 4).
2. Field-level staleness alone staled every artifact on any claim change. Fix: artifacts record `cites:`, decisions name claim ids
   (`claims:C4`), and only artifacts citing them go stale (SCHEMA "Versions and staleness").
