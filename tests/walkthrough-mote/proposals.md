# proposals.md

| id | lens | field | kind | proposal | evidence | status | reason |
|---|---|---|---|---|---|---|---|
| P1 | recon-software | capabilities | discovery | K1-K6 with four-state traces (declared, implemented, reachable, executed) | evidence/recon-software/trace.md | accepted:D1 |  |
| P2 | recon-software | claims | discovery | Code claims: framing test, clamps, unbounded sweep, cloud STT, stubs, boot failure causes, firmware pin map, no watchdog, compile-only, ToF offset | evidence/recon-software/trace.md | accepted:D1 |  |
| P3 | recon-software | constraints | discovery | Technical constraints: UART link, network and key for STT, 3.3 V pins; no license file | evidence/recon-software/trace.md | accepted:D1 |  |
| P4 | recon-physical | form | discovery | Subsystem and link table for the REV C unit with the evidence package as source | evidence/recon-physical/hardware/system-map.md | accepted:D1 |  |
| P5 | recon-physical | claims | discovery | Hardware claims graded by subject (design files OBSERVED, prose REPORTED, owner captures REPORTED); 15 contradictions across revisions, docs, code, and marketing | evidence/recon-physical/hardware/manifest.yaml; evidence/recon-physical/inventory.md | accepted:D1 |  |
| P6 | recon-physical | constraints | discovery | Physical and electrical constraints from CAD and the schematic: 92.4 mm head, bracket stops, 5 V 2.5 A adapter | evidence/recon-physical/hardware/power-tree.md | accepted:D1 |  |
| P7 | recon-physical | unknowns | discovery | U1-U6: revision letter, microphone part, firmware state on REV C, pickup range, privacy intent, licensing | evidence/recon-physical/inventory.md | accepted:D1 |  |
| P8 | electronics | constraints | discovery | Supply must cover the stall corner (3.4 A) or servo current must be limited; servos at 5 V; no more than 3.3 V on RP2040 pins | evidence/electronics/power-budget.md; evidence/electronics/bus-budget.md | accepted:D4 |  |
| P9 | electronics | claims | change | Add the calculated budget, brownout, over-voltage, reset-state, fuse, rise-time, and sensor-bias claims; guide budget claim to CONTRADICTED | evidence/electronics/budget.py | accepted:D4 |  |
| P10 | electronics | unknowns | discovery | U7 passives not in the export; U8 adapter behavior above rating | evidence/electronics/measurements.md | accepted:D4 |  |
| P11 | electronics | decisions | discovery | Electrical acceptance bar: +5V stays above 4.5 V at the worst servo-and-speech event on the shipping adapter; no pin above its limit; measured, not calculated | evidence/electronics/measurements.md M1-M3 | accepted:D4 |  |
| P12 | embedded-systems | claims | discovery | Pin check, REV C consequence, unused amplifier enable, silent playback, boot explanation, ACK-only sensors, no persistence | evidence/embedded-systems/contract.md | accepted:D5 |  |
| P13 | embedded-systems | constraints | discovery | Boot service environment and ordering; amplifier enable; SERVO_EN and REV C pin map; per-unit persisted calibration; recovery before any flash | evidence/embedded-systems/contract.md | accepted:D5 |  |
| P14 | embedded-systems | unknowns | discovery | U9 recovery entry and known-good image; U10 restart behavior after fixes | evidence/embedded-systems/bringup-log.md | accepted:D5 |  |
| P15 | embedded-systems | form | change | Add links the schematic export omits: Pi I2S shared by microphone and amplifier, GPIO17 to the amplifier shutdown pin, SERVO_EN to Q1 | evidence/embedded-systems/contract.md; evidence/recon-physical/hardware/buses.md | accepted:D5 |  |
| P16 | robotics | claims | discovery | Stops overrun by host limits, unbounded sweep without a local bound, no position feedback, no follow loop, uncalibrated ToF | evidence/robotics/loop.md; evidence/robotics/envelopes.md | accepted:D6 |  |
| P17 | robotics | constraints | discovery | Local bound on every actuation (proposed 500 ms, owner to confirm); joint limits at the bracket stops; no unattended motion | evidence/robotics/loop.md | accepted:D6 |  |
| P18 | robotics | capabilities | change | K1 reworded: head command path tested in software only; unbounded sweep; not run on REV C; follow not implemented | evidence/robotics/loop.md | accepted:D6 |  |
| P19 | robotics | decisions | discovery | Autonomy level for the beta: no unattended motion; supervised use only | evidence/robotics/actions.md | accepted:D6 |  |
| P20 | robotics | unknowns | discovery | U11 commanded-versus-actual motion; U12 ToF envelope and offset | evidence/robotics/envelopes.md | accepted:D6 |  |
| P21 | marketing | positioning | change | Reposition as 'the desk companion that follows you around the room' | tests/fixture-mote/docs/old-product-page.md:3 | rejected | Rests on C45, graded CONTRADICTED: the old page and README state it, host/mote/track.py:4-6 raises NotImplementedError, and the loop does not exist (C74). Revisit only with a working, measured tracking loop on a REV C unit. |
| P22 | marketing | unknowns | discovery | U13: signup channel, price, and ship date are unknown, so the spec sheet has no call to action | artifacts/marketing/spec-sheet.md | accepted:D8 |  |
| P23 | recon-physical | claims | change | Owner confirmation: add C76 and C77; resolve C42, C53, C54; add C78; close U1 and U2 | owner:dana@2026-10-01; evidence/recon-physical/hardware/manifest.yaml | accepted:D7 |  |
| P24 | release-readiness | claims | change | C8 regraded to VERIFIED by executing the import without the key | executed check: python3 -c 'from mote import config' printed KeyError: MOTE_STT_KEY | accepted:D9 |  |
| P25 | release-readiness | decisions | discovery | Gate verdict no-go for the beta kit; blockers and the spec-sheet wording defect | TRANSCRIPT.md step 8 | accepted:D9 |  |
| P26 | release-readiness | unknowns | discovery | U14: no physical claim has been exercised on a REV C unit | artifacts/release-readiness/gate.md | accepted:D9 |  |
