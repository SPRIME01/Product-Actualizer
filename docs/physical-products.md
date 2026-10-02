# Products with hardware

For anything with a board, sensors, actuators, firmware, or a body. Digital-only and passive-object products never load any of this: the physical lenses
are selected only on evidence of powered hardware, and the router records the exclusion otherwise.

## What loads, and in what order

```text
passive physical object          recon-physical
ESP32 sensor product             recon-physical -> electronics -> embedded-systems
Raspberry Pi voice device        recon-physical -> electronics (as needed) -> embedded-systems
robot / physical-AI product      recon-physical -> electronics -> embedded-systems -> robotics
ROS 2 robot                      robotics, with ros2-skill as the live execution layer when installed
```

`needs` encodes the chain (electronics needs recon-physical, embedded-systems needs electronics, robotics needs embedded-systems). A lens whose information the
model already holds is marked `--satisfied` instead of run. Ownership stays separate:

| lens | judges |
|---|---|
| `recon-physical` | what the evidence says exists: exact devices, revisions, sources, connections |
| `electronics` | the electrical implementation: domains, power, protection, buses, sensing, bench verification |
| `embedded-systems` | the hardware/software boundary: target identity, boot, flash, recovery, pins, drivers, services, updates |
| `robotics` | embodied closed-loop behavior: observation, estimation, decision, control, actuation, safe states |
| `fidelity-qa` | visual and reference fidelity only |
| `release-readiness` | the final gate, including whether physical claims were exercised on the unit |

## What to give it

The messy package a capable builder would hand over: the schematic and BOM, assembly guide and hardware manual, datasheets, firmware and host software, CAD,
photos or transcriptions of the unit's markings, boot logs, and the owner's notes. Revisions matter more than volume. The first thing the system does is establish
which revision of the board, parts, and documents it is looking at, and treat any mismatch as a contradiction.

## The hardware evidence package

`recon-physical` writes detail where it can be re-opened, and sends only product-level consequences to the model:

```text
actualize/evidence/recon-physical/hardware/
  manifest.yaml        unit identity, revision table, contradictions (open or resolved), components
  system-map.md  power-tree.md  buses.md  wiring.md
  components/<name>/profile.yaml   identity, role, limits (each with class and source), interfaces, physical, operational, quirks, unknowns
  components/<name>/sources.md     document, type, revision, which revisions it covers, authority 1-10, location, pages used
```

Source authority runs from the actual unit and matching-revision artifacts down through the manufacturer's documentation, the exact datasheet, official vendor material, and errata, to distributor
and community material, which is troubleshooting evidence only. A similar-looking module is never evidence for the unit being actualized.

## Evidence grades for hardware

| what | grade |
|---|---|
| a datasheet, manual, guide, or wiki statement | `REPORTED` |
| a schematic, BOM, or CAD file read directly, as that file at its revision | `OBSERVED` |
| a fact about the unit built from those files | `INFERRED`, citing the file claim and the claim that the unit is that revision |
| a calculation or simulation | `INFERRED` |
| a marking, enumeration, or capture this project made | `OBSERVED` |
| an owner-supplied capture or transcription | `REPORTED` (an owner's written confirmation of one fact is `VERIFIED`) |
| a check that could have failed, run on the unit against a predicted value | `VERIFIED` |

A bus ACK, a driver returning numbers, a compile, and a successful flash are each `OBSERVED` at most, and say nothing about identity or function.

## Acting on a real unit

State-changing actions (power, rewiring, flashing, any actuator or motion, destructive configuration) follow `product-model/PHYSICAL-PREFLIGHT.md`: target, current state,
expected result, bounds, action, locally bounded completion, observation, and recovery are recorded in `evidence/<lens>/actions.md` first; read-only discovery is never blocked, but discovery that mutates is classified by effect.
With hooks installed, flashing and erasing commands are denied unless a physical lens is running and the action log has a preflight record, and irreversible steps (fuses, secure boot, OTP) are denied for the owner to run.

With the cockpit up, the agent shows the preflight as a `preflight` block (class, target, current state, expected result, stop-if, bounds, bounded-by, observation, recovery) and the owner confirms or declines it. The confirmation is recorded as the owner's own input; it does not replace the preflight record or the hook rule, and it authorizes nothing by itself: the agent still performs the action through the normal path and a named person still observes what the agent cannot.

## Worked example

`tests/walkthrough-mote/TRANSCRIPT.md` takes a fictional desk robot (Raspberry Pi, RP2040 neck board, servos, camera, microphone, amplifier) from a messy package to a no-go verdict: 15 contradictions across revisions, documents, code, and marketing;
a power budget that the hardware guide understated; a sensor module that puts 5 V on 3.3 V pins; firmware for the wrong board revision; an unbounded motion command; a boot service that fails; and a gate that refuses to pass hardware
claims that were never exercised on the unit. `python3 tests/check.py` re-runs its executed evidence, and `bun test` replays it through the hook engine.
