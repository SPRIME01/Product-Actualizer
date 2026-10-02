---
product: Loam
model_version: 1
---

## Purpose

Tell people who water houseplants by guessing when the soil is actually dry (tests/fixture/brief.txt:1-2).

## Actors

| id | actor | job |
|---|---|---|
| A1 | Houseplant owner who waters by guessing | Know when a plant needs water without checking by hand |
| A2 | Owner and maintainer | Build, calibrate, and ship beta units; host the readings endpoint |

## Capabilities

| id | capability | claims |
|---|---|---|
| K1 | Convert a probe reading to a 0-100% moisture value | C1, C2 |
| K2 | Upload each reading to a configured HTTP endpoint | C3 |
| K3 | Email an alert when a reading is below the threshold | C4 |

## Constraints

**Technical**

- Needs a Wi-Fi uplink, LOAM_ENDPOINT, and for alerts ALERT_EMAIL and SMTP_HOST (tests/fixture/loam-fw/loam/uplink.py:8; tests/fixture/loam-fw/main.py:13; tests/fixture/loam-fw/loam/alerts.py:18).
- Calibration constants come from one bench unit (tests/fixture/loam-fw/loam/sensor.py:3).
- The hardware ADC module is not in the checkout (tests/fixture/loam-fw/main.py:19).

**Physical**

- None established; see U1, U2.

**Legal**

- No license file in the repository: all rights reserved by default (C12).

## Form and interaction

A slender probe: a capsule head on a stake, teal head. The only source is a concept render (tests/fixture/probe-render.svg, classified render). No dimensions, materials, or real-unit photo exist (U1, U2).

## Voice

Not decided. The owner's brief is casual, plain, and self-deprecating (tests/fixture/brief.txt:1-2); a sample, not a decision.

## Positioning

Not decided (U3).

## Claims ledger

| id | claim | grade | source |
|---|---|---|---|
| C1 | Firmware converts a raw ADC count to a moisture percentage from two calibration endpoints | OBSERVED | tests/fixture/loam-fw/loam/sensor.py:7-9 |
| C2 | The conversion maps the dry endpoint to 0% and the wet endpoint to 100% and clamps outside them | VERIFIED | test:python3 -m unittest discover -s tests -t . (in loam-fw): 2 passed |
| C3 | Each reading is posted as JSON to the URL in LOAM_ENDPOINT | OBSERVED | tests/fixture/loam-fw/loam/uplink.py:7-11; tests/fixture/loam-fw/main.py:12 |
| C4 | A reading below the alert threshold triggers an email to ALERT_EMAIL via SMTP_HOST | OBSERVED | tests/fixture/loam-fw/loam/alerts.py:9-20; tests/fixture/loam-fw/main.py:13-14 |
| C5 | SMS alerts exist | CONTRADICTED | tests/fixture/loam-fw/README.md:8 states it; tests/fixture/loam-fw/loam/alerts.py:23-25 raises NotImplementedError |
| C6 | The probe reads every hour | CONTRADICTED | tests/fixture/loam-fw/README.md:5 states hourly; tests/fixture/loam-fw/main.py:7 sets INTERVAL_S = 900 (15 minutes) |
| C7 | Battery lasts about 6 months | REPORTED | tests/fixture/brief.txt:2; tests/fixture/loam-fw/README.md:6 |
| C8 | The probe is waterproof | REPORTED | tests/fixture/brief.txt:2; tests/fixture/loam-fw/README.md:7 |
| C9 | The probe is a capsule head on a stake, teal head | REPORTED | tests/fixture/probe-render.svg (classified: render) |
| C10 | Price may be $29 | PROPOSED | tests/fixture/brief.txt:5 |
| C11 | Beta target is 50 people in the spring | PROPOSED | tests/fixture/brief.txt:4 |
| C12 | The repository has no license file | OBSERVED | tests/fixture/loam-fw/ listing (no LICENSE*) |
| C13 | The repository contains no app or dashboard code | OBSERVED | tests/fixture/loam-fw/ listing (README.md, main.py, loam/, tests/ only) |

## Unknowns

| id | question | blocks | who can answer |
|---|---|---|---|
| U1 | What are the probe's real dimensions, and what does a real unit look like? | form; any render or visual | owner (photos or CAD) |
| U2 | Waterproof to what rating, and what enclosure exists? | claim C8; any waterproof statement | owner |
| U3 | Who is the product for, and against what alternative? | positioning; all copy | owner (brief.txt:1 suggests the alternative is guessing) |
| U4 | What is the battery draw and the test behind '6 months'? | claim C7 | owner (power measurement) |
| U5 | Who made the render, and may it be published? | any public use of the render | owner (brief.txt:5 says a friend) |
| U6 | Who hosts the LOAM_ENDPOINT collector, and is there an app or dashboard? | any claim about seeing readings | owner |

## Decision log

| n | decision | rationale | touched | version |
|---|---|---|---|---|
| D1 | Model created from recon of loam-fw/, brief.txt, probe-render.svg | Recon output P1-P5; gaps recorded as unknowns | all | 1 |
| D2 | Goal: closed-beta signup page (text) for about 50 people. Bar: no public claim below OBSERVED/VERIFIED, honest about stage | brief.txt:4; owner asked for a launchable result | purpose | 1 |
| D3 | Lenses: recon-software, recon-physical, brand, provenance-licensing, marketing, release-readiness. Excluded: direction, experience, product-visualization, motion-editorial, audio-sound, illustration, fidelity-qa, legacy-modernization, electronics, embedded-systems, robotics | direction: text-only page, no visual artifact; experience: no in-product flows in scope; product-visualization: no geometry, only a render; motion-editorial, audio-sound, illustration: no such deliverable; fidelity-qa: no built visual output; legacy-modernization: code unchanged for a text page; electronics, embedded-systems, robotics: the goal is a text page and no schematic, BOM, or board was supplied (a render and one missing ADC module only), so there is no hardware evidence to judge; revisit if the goal becomes shipping probes | decisions | 1 |
