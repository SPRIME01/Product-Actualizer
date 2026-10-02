# Walkthrough: Mote, a physical-AI desk companion, taken to a no-go gate verdict

Hand-run of `actualize-product` on a fictional but realistic hardware package. Inputs are in `tests/fixture-mote/`: a Python host app
(`host/`), MicroPython neck firmware (`firmware/neck/`), a hardware package (REV C schematic export, rev B BOM and assembly guide, rev C
hardware guide, CAD metadata, seven component documents), captures from the desk unit (`unit/`), the owner's brief, the February product
page, a README, and bench notes. The parts are fictional except the Raspberry Pi Zero 2 W and the RP2040, used only for general facts.
Model snapshots are `model-v1..v6.md`; every one validates against `product-model/SCHEMA.md`, and `python3 tests/check.py` re-runs the
executed evidence below. Commands shown were really run; anything that needs the unit, a person, or a network was not, and is recorded as
an unknown. There is no live unit in this repository, so every unit fact is an owner-supplied capture (`REPORTED`) or an owner confirmation (`VERIFIED`).

Always-loaded context: `actualize-product` (21 lines) + `SCHEMA.md` (88 lines). Nothing else is loaded until a lens runs.

## Step 1: classify evidence

| input | kind |
|---|---|
| host/, firmware/neck/ | code |
| hardware/schematic-revC.txt, bom-revB.csv, cad-neck-revC.json | design source files (physical) |
| hardware/assembly-guide-revB.md, hardware-guide-revC.md, datasheets/ (7) | documents (physical) |
| unit/ (inspection, boot journal, neck console log, owner notes) | owner-supplied captures from the unit |
| brief.txt, README.md, docs/old-product-page.md, docs/notes.md | documents (owner prose) |

No render, no photograph, no transcript, no audio or video. Goal: a closed-beta hardware kit for 10 builders with a public spec sheet. Bar: no
public claim below `OBSERVED`/`VERIFIED`, and any claim that a physical feature works needs an exercised check on the real unit at the shipping
revision. Logged as D2.

## Step 2: build the model (wave 1, parallel: recon-software, recon-physical)

Loaded: both recon lenses and `recon-physical/references/hardware-context.md` (hardware is present). The lens ran the pipeline: identify, resolve, locate
sources, extract, reconcile revisions, reconstruct connections, write evidence, propose. Outputs: `evidence/recon-software/trace.md`, and for
hardware `evidence/recon-physical/inventory.md` plus the package `evidence/recon-physical/hardware/` (`manifest.yaml`, `system-map.md`, `power-tree.md`,
`buses.md`, `wiring.md`, and `components/<name>/{profile.yaml,sources.md}` for nine components). Detail stays there; the model got one-line subsystems and
the consequential facts.

Findings that shaped everything after (15 contradictions, all in the ledger and the manifest):

- Revisions: the assembly guide and BOM are rev B, the schematic, CAD, and hardware guide are REV C, the firmware pin map is labelled REV B, the one console
  log is from a REV B board, and the unit's silkscreen revision letter is hidden under a bracket (U1). The artifacts that do not match the unit are recorded as
  contradictions (C42, C52, C53, C54), not averaged.
- Wrong or stale facts in prose: README gives the VT-53 as bus 0, address 0x52 (the schematic has I2C1; 0x52 is the 8-bit form of 0x29) (C43); "85 mm across" against a
  92.4 mm CAD bounding box, 8.7 % apart, failing the 1 % cross-source test (C44); a 3 W amplifier against 2.5 W maximum (C49); servos "fine at 6 V" against a 5.5 V
  recommendation (C50); the VT-53 module called "5 V safe" while its I2C pull-ups go to VIN and RP2040 pins are not 5 V tolerant (C51).
- Marketing and docs against implementation: "follows you with its head" is a stub that raises `NotImplementedError` (C45); an eight-hour battery that exists
  nowhere (C46); a touch pad that is a do-not-populate footprint (C47); "everything stays on the device" against an audio upload (C48); an IMU read in host code but in no
  schematic or BOM (C55); legacy camera instructions for a libcamera-only module (C56).
- Grading by subject: design files read directly (schematic, BOM, CAD) are `OBSERVED` as those files; prose (datasheets, guides, notes) and the owner's captures
  are `REPORTED`; nothing about the unit is `OBSERVED` or `VERIFIED` yet except the host framing tests (C1, `VERIFIED`).

**Model v1** (`model-v1.md`): 56 claims (1 `VERIFIED`, 20 `OBSERVED`, 18 `REPORTED`, 2 `PROPOSED`, 15 `CONTRADICTED`), 6 unknowns, decisions D1-D3.

## Step 3: select lenses

Read only the frontmatter of all 17 `skills/*/SKILL.md`. The physical lenses chain by `needs`: electronics needs recon-physical, embedded-systems needs electronics,
robotics needs embedded-systems; marketing needs brand, which the model already answers (the owner's brief states name, voice, and positioning direction), so brand is
marked satisfied rather than run.

| wave | lenses | why |
|---|---|---|
| 1 | recon-software, recon-physical (parallel; marketing and release-readiness have no unmet needs but wait for the model) | code and hardware evidence exist |
| 2 | electronics | powered circuitry: rails, a load switch, servos, an amplifier, I2C |
| 3 | embedded-systems | a Pi and an RP2040 run software and firmware |
| 4 | robotics | sensors, a decision loop, and actuators that move a head |
| 5 | marketing (brand satisfied), then release-readiness | public spec sheet; final gate |

Excluded, with reasons logged in D3: direction, illustration, motion-editorial (the deliverables are a kit and a text spec sheet), experience (no software flows in scope),
product-visualization (CAD exists, no renders wanted), audio-sound (sound design is out of scope; audio function is checked by embedded-systems), fidelity-qa (no built visual
output), legacy-modernization (code is not being changed), provenance-licensing (nothing published; license decision deferred, U6). Seven of 17 lens bodies were loaded.
References loaded on demand: `hardware-context` (recon-physical); `power-and-protection`, `signals-and-buses`, `bench-verification` (electronics); `mcu-bringup`, `linux-sbc`,
`device-integration` (embedded-systems); `perception-and-state`, `control-and-safety`, `bring-up-and-testing` (robotics). `robotics/references/ros2.md` was **not** loaded: there is no ROS in the evidence.

## Step 4: wave 2, electronics, reconcile to v2

The lens did not re-derive identity; it judged the electrical implementation of the REV C design as drawn. Executed (`python3 tests/walkthrough-mote/evidence/electronics/budget.py`):

```
| state | load A | supply 2.5 A | margin A | verdict |
| guide as published (servos idle, typical) | 1.22 | 49 % | +1.28 | ok |
| speech + both servos moving, loaded | 2.00 | 80 % | +0.50 | thin (80 % or more) |
| full-output speech + both servos moving, loaded | 2.26 | 90 % | +0.24 | thin (80 % or more) |
| full-output speech + both servos start (20 ms) | 2.76 | 110 % | -0.26 | EXCEEDS supply |
| full-output speech + both servos stalled (typ) | 3.06 | 122 % | -0.56 | EXCEEDS supply |
| full-output speech + both servos stalled (max) | 3.36 | 134 % | -0.86 | EXCEEDS supply |
```

The hardware guide's 1.22 A omits servo motion and was written as "the supply has ample margin" (C31); it is downgraded to `CONTRADICTED` with the script output as the second source (D4, applied
immediately). The budget is `INFERRED` (C57), never `OBSERVED`: it is calculated from datasheet figures. It is consistent with the owner's report of resets when the head moves during
speech (C58, `INFERRED`, "not yet measured"). Also proposed: with VIN on +5V the VT-53 module holds the I2C lines near 5 V on pins limited to 3.8 V (C59); Q1 keeps the servos off at
reset (C60); F1's 2.5 A hold equals the adapter's rating, so overload shows as a collapsing rail rather than a fuse trip (C61); at 400 kHz a single 10 k pull-up meets the 300 ns rise time only below
about 35 pF (C62); the ST20 has an uncompensated warm bias (C63). Unknowns: passives are absent from the schematic export (U7), the adapter's behavior above its rating (U8). No measurement
was taken: `evidence/electronics/measurements.md` is a plan (M1-M6) with predicted values, and `actions.md` records that no state-changing action ran.

**Model v2**: 63 claims, 8 unknowns, D4. The artifact `artifacts/electronics/electrical-review.md` was built after reconciliation, so it records `model@2` (kept as `history/electrical-review@2.md`;
it says plainly that it applies only if the unit is REV C, because U1 is open).

## Step 5: wave 3, embedded-systems, reconcile to v3

A static check compared the firmware pin map with the schematic nets (`python3 tests/walkthrough-mote/evidence/embedded-systems/pincheck.py`, exit 1):

```
PAN_PIN = GP10 (expect PAN_PWM): CONFLICT: schematic net is I2C1_SDA
TILT_PIN = GP11 (expect TILT_PWM): CONFLICT: schematic net is I2C1_SCL
I2C_SDA = GP4 (expect I2C1_SDA): UNCONNECTED in schematic
I2C_SCL = GP5 (expect I2C1_SCL): UNCONNECTED in schematic
UART_TX = GP0 (expect UART_TX): ok
UART_RX = GP1 (expect UART_RX): ok
SERVO_EN (GP14) is never driven by the firmware: the Q1 servo supply stays off
```

Recorded as C64 (`VERIFIED`: a check that could have failed, on two files) and the consequence C65 (`INFERRED`): on a REV C board the current firmware would put PWM on the I2C lines, give the servos no signal and no
supply, and reach no sensor. Other contract findings (`contract.md`): nothing drives the amplifier enable, so `speak()` can return True in silence (C66, C67); the boot service fails because the key lives in the owner's shell and the
unit orders after `network.target` only (C68); the only sensor evidence is ACKs from a REV B board and no identity register was ever read (C69); calibration constants are source literals (C70). The firmware "compiles"
(C14, `OBSERVED`): that is evidence it compiled. Unknowns: no recovery entry or known-good image for the REV C board (U9), restart behavior after fixes (U10). Nothing was flashed or run:
`bringup-log.md` lists the staged plan and what each stage must show.

**Model v3**: 70 claims, 10 unknowns, D5 (also adds the omitted links to `form`). `bringup.md` built at `model@3` (kept as `history/bringup@3.md`).

## Step 6: wave 4, robotics, reconcile to v4

The loop could not be drawn (`evidence/robotics/loop.md`): face tracking is a stub and nothing turns an observation into a neck command (C74). The only actuation is the host's sweep: it starts at app start, persists until a later `SWEEP 0`, and the firmware has no timeout, so a host crash or a lost
link leaves the head sweeping (C72). Host limits of +/-90 degrees exceed the bracket stops (pan +/-70, tilt -25 to +35), so commands stall the servo (C71); there is no position feedback in the BOM or schematic (C73);
the ToF is uncalibrated and its envelope unmeasured (C75). No motion was commanded: `actions.md` holds the proposed first test (head clear, current-limited supply, 5 degrees, bounded to 0.5 s in the actuating firmware, observe with a protractor, restore centre). D6 records the autonomy decision: no unattended motion in the beta, and rewords capability K1.

**Model v4**: 75 claims, 12 unknowns, D6. `artifacts/robotics/behavior-envelope.md` built at `model@4`.

## Step 7: marketing, a rejected proposal, the owner's reply, reconcile to v5

marketing built a draft spec sheet at `model@4` (`history/spec-sheet@4.md`, public, cites C1, C14, C22: `VERIFIED`/`OBSERVED` only). The hook engine refused a variant that cited a `REPORTED` claim.
**Rejected proposal P21** (positioning: "the desk companion that follows you around the room"): it rests on C45, graded `CONTRADICTED`, and the loop does not exist (C74). P22 accepted: no signup channel, price, or ship date, so no call to action (U13, D8).

The orchestrator asked the owner for the two things no evidence could answer: the hidden revision letter and the microphone marking. Reply (2026-10-01): the board is REV C and the marking reads HM1100. recon-physical re-ran, updated
`manifest.yaml` (`unreconciled: false`), and proposed P23: add C76 and C77 (`VERIFIED`, `owner:dana@2026-10-01`); resolve the rev B documents (C42, `VERIFIED`), camera (C53, `INFERRED` from the label and the REV C guide) and microphone (C54, `VERIFIED`); add the new contradiction that the host's capture device and the README describe the PDM part, not the I2S HM1100 (C78). U1 and U2 closed.

**Model v5**: 78 claims (6 `VERIFIED`, 23 `OBSERVED`, 17 `REPORTED`, 16 `INFERRED`, 14 `CONTRADICTED`, 2 `PROPOSED`), 11 unknowns, D7-D8. D7 touched `claims:C42+C53+C54+C76+C77+C78+C57+C59+C60+C65` and `unknowns`.

## Step 8: staleness, rebuild, and the gate

Version comparison after D7:

| artifact | built_from | reads / cites | result |
|---|---|---|---|
| history/electrical-review@2.md | model@2 | claims; cites C57, C59, C60 among 15 | **stale by D7** (their parents changed: C76 added) |
| history/bringup@3.md | model@3 | claims; cites C65 among 11 | **stale by D7** |
| artifacts/robotics/behavior-envelope.md | model@4 | capabilities, constraints, claims; cites none of D7's ids | current |
| history/spec-sheet@4.md | model@4 | claims; cites C1, C14, C22 | current by version (but see the gate) |

electronics and embedded-systems re-ran: `artifacts/electronics/electrical-review.md` and `artifacts/embedded-systems/bringup.md` now say `built_from: model@5`, drop the "if the unit is REV C" caveat, and cite C76 (and C78 for the microphone). The hook engine
refused `release-readiness` until both were rebuilt.

**release-readiness** (wave 5) re-opened sources and ran, in the repository root or `host/`:

```
$ cd tests/fixture-mote/host && python3 -m unittest discover -s tests -t .
Ran 3 tests ... OK                                   (C1 reproduces)
$ python3 tests/walkthrough-mote/evidence/embedded-systems/pincheck.py     -> exit 1, 5 findings   (C64 reproduces)
$ python3 tests/walkthrough-mote/evidence/electronics/budget.py            -> 2.76 A and 3.06 A rows reproduce   (C57)
$ env -u MOTE_STT_KEY python3 -c "from mote import config"                 -> KeyError: 'MOTE_STT_KEY'
```

The last executed check regrades C8 from `OBSERVED` to `VERIFIED` (P24). Cross-artifact extraction: the public spec sheet says 92.4 mm; the brief and the live February page say 85 mm (C44), and that live page also carries four more `CONTRADICTED` claims (follows, battery, touch, privacy).
Placeholder scan: spec sheet clean; the shipped code has `stt.example.com` in `config.py`. **Physical evidence walk** (nine claims, `gate.md` PHY1-PHY9): only PHY7 (starts at boot) was ever exercised on the unit, by the owner's journal, and it failed; the other eight rest on documentation, a build, or a
calculation. A firmware that compiles, host tests that pass, a plausible schematic, and a CAD range are not evidence that a camera captures, a speaker is audible, a servo reaches its range, or the head stops safely.

The spec sheet: its draft said the head "pans +/-70 degrees". C22 (CAD) is `OBSERVED` and allowed by the grade rule, but a servo range is a physical claim that needs command plus observation. The staleness engine cannot see a wording defect; the gate did. The defect list went to marketing (not to the model),
which rebuilt `artifacts/marketing/spec-sheet.md` at `model@6`: "designed to pan ... against bracket stops; travel has not yet been measured on a built unit".

## Gate verdict (D9)

Decision: **no-go** for the beta kit, accountable owner: owner (Dana). Blockers: U14 (no physical claim exercised on a REV C unit), the REV B firmware that cannot drive the REV C servos or sensors, about 5 V on RP2040 pins, the +5V budget, the boot failure, and a live page with
contradicted claims. No waivers. Next, in order: electronics M3 (idle level at GP10/GP11, sensor removed), M5, M1; an embedded-systems REV C build with a restart test; a robotics bounded first motion; then rerun the gate.
Checks run: ledger walk, staleness report (empty after rebuild), placeholder scan, cross-artifact extraction, four executed checks, physical evidence walk. Not run: any test on the unit, link and signup sweep (no call to action exists), clean-image install, human listen.

**Model v6**: 78 claims, 12 unknowns, D9.

## Design changes this walkthrough forced

1. A first draft graded every hardware document `REPORTED`. That erased the difference between a datasheet (prose about a part) and a schematic or CAD file (the design itself, read directly).
   Fix: grade by the claim's subject (`hardware-context.md`, SCHEMA): design files are `OBSERVED` as that file at its revision, the unit's behavior built from them is `INFERRED` and cites the revision claim.
2. The physical lenses' artifacts cite claims the same lenses propose, so they must be built after reconciliation, like brand's. Router step 4 now says so.
3. Revision mismatches needed a mechanical home. `manifest.yaml` lists every artifact with the revision it describes and whether that matches the unit; `check.py` fails a mismatched artifact that is not in a contradiction, an open
   contradiction whose claim is no longer `CONTRADICTED`, and a resolved one that still is.
4. Calculations and static checks became re-runnable evidence (`budget.py`, `pincheck.py`), and `check.py` re-runs them, including a negative control (a correct REV C pin map must pass) so the check is known to be able to pass.
5. Release readiness needed a table it could not fudge: `PHY` rows with evidence kind, exercised-on-the-unit, and result. `check.py` mutates the gate (verdict `go`, documentation accepted as an exercise) and requires the checker to fail.
6. The hook engine gained one rule: flashing and erasing tools need a running physical lens and a recorded preflight, and irreversible steps (fuses, secure boot, OTP) are denied for the owner to run.
