# Bench verification, fault isolation, acceptance

Load when planning measurements, bringing up an assembly, diagnosing a fault, or deciding acceptance. State-changing steps follow `product-model/PHYSICAL-PREFLIGHT.md`.

## What each basis can claim

| Basis | Example | May support | May not support | Model grade |
|---|---|---|---|---|
| calculated | divider ratio, budget, rise time from stated C | a prediction and a margin under named assumptions | that the assembly behaves so | `INFERRED` (cites inputs) |
| simulated | SPICE run, thermal model | the model's behavior with its component models | the unit; model quality is itself unverified | `INFERRED` |
| reported | a person's meter reading, a datasheet figure | a lead, a document's statement | anything about this unit unless re-measured | `REPORTED` |
| observed | a marking read, a rail measured once, a captured log | that something was seen on the unit, under stated conditions | repeatability, other conditions, function | `OBSERVED` |
| physically verified | rail within range at the worst actuator event; camera frame captured; reboot test passed | the stated claim for the stated conditions and revision | other revisions or conditions | `VERIFIED` |

A verification needs a predicted value or range written before the run, an instrument configuration, and a result that could have been a failure. A zero exit code, a compile, or a driver returning numbers is none of these.

## Measurement plan row

`quantity / test point | reference node | instrument and configuration | predicted value or range | validity limits | decision it resolves | result | grade`

- DMM: meter mode and the lead jack are checked before connecting, especially in current mode (burden voltage, fuse); the energy source and the instrument's own grounding path are understood.
- Oscilloscope: probe attenuation and compensation, bandwidth against the edge, short ground spring rather than a long lead, trigger on the event (rail droop, reset, bus start), enough record length;
  averaging and persistence hide single-shot spikes. A probe adds capacitance and can change an I2C edge or a high-impedance node.
- Current: a bench supply limit is a protective aid and not a substitute for the budget; sleep and peak currents need different instruments (a shunt with a fast capture for peaks, a low-range meter for sleep); USB power meters sample slowly.
- Thermal: a calibrated probe or camera with known emissivity at equilibrium; touch only as a safety screen.
- Logic analyzer and bus decoder: record sample rate, voltage threshold, and the decoded address notation; keep the raw capture, not just the decode.
- Record firmware, wiring, and instrument revisions with each capture.

## Stage gates

| Gate | Required evidence | Stop condition |
|---|---|---|
| documentation | matching schematic, BOM, board, and component revisions; pins, rails, polarity known | any of those unknown |
| unpowered | orientation, bridges, population against BOM and DNP, connector keying, continuity of intended nets, absence of rail-to-rail and rail-to-signal shorts (capacitors discharged first), meter mode and values recorded | unexpected conductive path |
| first power | current limit set below the point of damage, loads disabled, rails and startup/steady current, reset reason, temperature | rail collapse, excess current, heat |
| signal | idle levels and polarity at test points, bus idle high, clocks present | unexplained level |
| integration | identity or readback from each device, bounded timeouts | scan-only success, hanging driver |
| release | reset, power-cycle, handling and thermal repetition; recovery path exercised | open electrical limit |

Success at one gate is not evidence for the next. "It worked once" is not an acceptance criterion; repeat critical tests after mechanical handling, after a power-cycle, and under the worst power state. Rework repeats the tests the rework could have affected.

## Fault isolation

Name the observation before the test: "read returned zero" is a result, "device absent" is an inference that needs address, power, reset, and scan-method evidence. For each inference list the nearest competing cause and the evidence that separates them.

| Observation | Predict and test first | Decisive evidence |
|---|---|---|
| rail correct at rest, resets under load | supply impedance or transient current | scope the rail during the event; measure source current |
| bus line never rises | short, unpowered device, wrong rail, held line | resistance and power isolation; idle level |
| slow rise, marginal high | too much capacitance, weak or duplicate pulls, probe loading | measured `tr`; effective pull-up; repeat with a low-capacitance probe |
| address ACKs, identity wrong | address notation, wrong device, pointer or byte order | documented ID register and a raw capture |
| NAK only after reset | readiness delay, reset or sequencing | reset-to-first-command timing, status polling |
| silent speaker, exit code 0 | amplifier enable or mute, output route, wiring, clock ownership | scope on the amplifier input and output; a human listening |
| motor twitches at boot | undefined driver input during reset | driver input level during reset and bootloader |
| works warm-started, fails cold | power sequencing, crystal start, supply ramp | scope ramp and reset; compare cold and warm captures |

For an intermittent fault capture a failing and a passing event with the same trigger and settings and compare rail droop, timing, reset reason, temperature, and mechanical state; if attaching a probe changes it, remove the probe and repeat. Reducing speed is a clue to timing or integrity, not a root-cause fix.
Escalate after three non-converging tests with: the missing exact schematic, datasheet, capture, or known-good comparison; the safe next acquisition; and the stopped branch.

## Sample, conditions, and the instrument

One unit is one unit: a claim about the product states how many units were tested, which board, firmware, and accessory revisions, the supply, temperature, and load conditions, and whether the margin was checked at the corners (low supply, high temperature, worst load) or only at room conditions. Keep a golden unit and note its revision. Record the instrument, its calibration status, and its uncertainty; a measurement is compared with a requirement only after its uncertainty is smaller than the margin. Environmental claims (temperature range, humidity, vibration, drop, ESD handling) are tested in the enclosure, not on the bare board.
Production test is its own deliverable: a jig or procedure that checks rails, identity, and function per unit, writes per-unit identity and calibration, and rejects a bad unit.

## Acceptance record

Per unit: identity and revisions of board, parts, and firmware; inspection findings with image identifiers and dispositions; unpowered values; first-power record; functional results with stimulus, expected, actual, repeat count, and conditions; open risks with owner. Release is a disposition, never a checkbox: **passed and repeatable**, **accepted with a bounded risk and owner**, or **blocked pending named evidence**. A passing functional test does not waive an unresolved electrical limit.
