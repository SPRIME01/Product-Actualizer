built_from: model@4
reads: [capabilities, constraints, claims]
cites: [C2, C3, C7, C19, C64, C71, C72, C73, C74, C75]
public: false

# Mote behavior envelope (robotics)

Evidence: evidence/robotics/loop.md and envelopes.md. No motion has been commanded or observed on any unit.

## The loop as it exists

The follow loop (camera, estimate, decide, move head) is not drawn because it does not exist: face tracking raises NotImplementedError [C7] and nothing turns an observation into a neck command [C74]. The only actuation is the host's unbounded sweep [C3] with commands limited to +/-90 degrees [C2].

## Actuation

| item | finding | basis |
|---|---|---|
| local bound | none: SWEEP persists until SWEEP 0 and the firmware has no timeout, so a host crash or lost link leaves the neck sweeping [C72] | c |
| joint limits | host allows +/-90 while the bracket stops are pan +/-70 and tilt -25 to +35, so commands run into the stops and stall the servo [C71] | c |
| feedback | no position sensor or end stop input in the BOM or schematic [C73] | o |
| safe state at reset | servo supply off until GP14 is driven low (Q1 gate pulled up) [C19]; the REV B firmware never drives GP14 [C64] | o, v (static) |
| commanded versus actual | not measured (U11) | none |

## Sensor envelopes

VT-53: offset 0, never calibrated, envelope unmeasured on desk surfaces and with servos and amplifier running [C75] (U12). Microphone pickup range is unmeasured (U4).

## Required before any motion on a unit

Head clear of the desk, servo supply current-limited, one servo at a time, 5 degrees, bounded to 0.5 s in the firmware, stop, read the angle with a protractor, restore centre, record the end state. Owner and an observer present. Supervised use only in the beta (D6).
