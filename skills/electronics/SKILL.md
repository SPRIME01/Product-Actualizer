---
name: electronics
description: Judge the electrical implementation of a physical product, from exact-component compatibility, voltage and logic domains, power paths and budgets, protection, and bus/signal behavior to sensor conditioning, schematic-to-wiring translation, and bench verification. Use when the product contains powered circuitry (boards, module wiring, supplies, drivers, sensors, actuators); not for passive objects or software-only products.
reads: [constraints, form, capabilities, claims, unknowns, decisions]
needs: [recon-physical]
executes_with: [kicad-design, schematic-analyzer, ee-datasheet-master]
---
# Electronics

## Reads from the model
`form` (subsystems and links), `constraints` (rails, limits, envelope), `capabilities` and `claims` (what the circuit must make true), `unknowns`, and `decisions` (scope, waivers, the launch bar). Component identity, revisions, and documented values come from `evidence/recon-physical/hardware/`; this lens never re-derives them, and sends a doubtful identity back as an unknown. Read `product-model/PHYSICAL-PREFLIGHT.md` before any state-changing action on a unit. Deeper material, loaded when the decision needs it: `references/power-and-protection.md`, `references/signals-and-buses.md`, `references/bench-verification.md`.

## Distinctions
- **Ownership.** Owns the electrical system: function, domains, power, signals, protection, thermal, and how they are verified. Recon owns what the evidence says exists; embedded-systems owns pin routing, boot, and firmware contracts; robotics owns closed-loop behavior; release-readiness owns the gate. PCB or schematic edits go to `kicad-design`; reading netlists and datasheets to `schematic-analyzer` and `ee-datasheet-master`. This lens decides and records, it is not a KiCad manual.
- **Five bases, never blended.** `calculated` (from stated inputs), `simulated` (a model run), `reported` (someone's reading or a document), `observed` (seen on the unit), `physically verified` (a check that could have failed, run on the assembled unit against a predicted value). Model grades: calculated and simulated are `INFERRED` and cite their inputs, reported is `REPORTED`, observed is `OBSERVED`, physically verified is `VERIFIED`. A plausible schematic or a clean simulation is an intermediate artifact; it does not verify an assembled circuit. A clean ERC or netlist does not verify symbol semantics or pin function.
- **Exact component, exact revision.** Limits come from the datasheet of the fitted part and package, split into recommended operating, absolute maximum, typical, guaranteed, and measured; a typical value is no bound and an absolute maximum is no operating point. A module or breakout adds regulators, pulls, level shifters, straps, and LEDs the chip document never shows: read both.
- **Function before parts.** State what the circuit must do, the energy and signal paths, and what failure costs; then check parts. Replace a part only with current evidence that the substitute meets the same limits, package, and lifecycle.
- **Domains and levels.** A board label such as `5V` names a rail, not a tolerance. For every crossing record direction, topology (push-pull, open-drain, bidirectional), thresholds at the worst corner, speed, and the level-shifting that preserves release behavior. Powered-off or unpowered devices can be back-fed through protection structures.
- **Power path and budget.** Budget every rail by state: boot, idle, peak, radio burst, startup inrush, actuator stall. Compare with what the source can actually deliver at that state, through cable, connector, regulator, battery sag, and temperature. A budget that omits actuator current or radio peaks is the usual failure; a brownout is power evidence and the detector is not disabled to hide it.
- **Returns and references.** Draw where load current returns. Motor and servo return currents through a shared logic ground, ground bounce on analog references, and isolation boundaries are traced, not assumed.
- **A GPIO is a control signal.** Loads need an external driver and supply, a flyback or clamp path for inductive loads, a defined state at reset and boot (pull on the gate or enable), and a limit on what happens if firmware dies. Where an invalid state has consequence, hardware excludes it; firmware sequencing alone is not an interlock.
- **Protection matches the fault waveform and must survive the source.** Fuse, TVS, clamp, current limit, and reverse-polarity parts are checked for the real waveform, repetition, and restart behavior; the protected part must stay inside its own limits.
- **Bus electrical behavior is a budget.** Effective pull-up (all fitted pulls in parallel), rise time against capacitance, sink current, address and strap uniqueness, and recovery ownership are computed before a scan. A bus ACK says something answered; identity is a documented ID register read, and correct operation is a measured response.
- **Analog and sensing.** Source impedance against the ADC, reference, scaling with fault voltage, filtering, noise, drift, and a calibration plan with an independent reference. Declare whether an error budget is a guaranteed bound or a statistical estimate; correlated systematic errors are not combined as independent noise.
- **Thermal.** Name the loss mechanism and the hottest part; `Tj = Ta + P*theta` applies only when board, airflow, and steady state match the rating. Enclosure, duty cycle, and touch temperature belong in the budget.
- **Schematic to real wiring.** Translate net by net: component reference, pin, return, state at reset and active, limits, test point. Silkscreen and a familiar breakout show placement, not pin function, tolerance, pulls, or address straps. A second engineer must be able to wire or probe from the record.
- **Measure to decide.** Each measurement names its quantity and test point, instrument configuration (meter mode and jack, probe, bandwidth, reference), predicted value or range, validity limits, and the decision it resolves. Instruments load and disturb circuits; a current limit is not a substitute for understanding stored energy.
- **Stage gates do not transfer.** Documentation, unpowered inspection, first power, signal idle levels, integration (identity and readback with timeout), and release (power-cycle, handling, thermal) each need their own evidence; a stable rail proves nothing about signaling, and a working demo proves nothing about recovery.
- **Fault isolation is hypothesis-led.** One leading hypothesis per branch with its predicted observation, the least intrusive decisive test, and the layer it addresses (power, topology, levels, timing, protocol, driver, application). Do not raise speed, add stronger pulls, or disable protection before measuring the failing layer. After three non-converging passes, stop and name the missing artifact.
- **Out of scope here.** Mains, high energy, RF and high-speed layout, functional safety, medical, and certification need specialist evidence; this lens can organize the requirements and cannot confer approval. A pre-certified radio module does not certify the product built around it (antenna, enclosure, and power change the result).

## Failure modes
- **Plausible-schematic acceptance** — design reviewed, assembly never measured. *Recognize:* acceptance rows with no instrument, setup, or value.
- **Simulation as verification** — a model run reported as a result. *Recognize:* `OBSERVED` or `VERIFIED` with a simulator as the source.
- **ACK as identity** — an address response accepted as the right device. *Recognize:* no ID-register read or documented response beside the scan.
- **Label as tolerance** — a `5V` pin or 5 V module assumed compatible with 3.3 V I/O. *Recognize:* no threshold and absolute-maximum check for the pin on the fitted part.
- **Omitted load** — actuator, radio, or LED current missing from the budget. *Recognize:* the budget has no stall, inrush, or peak row for a motor or servo.
- **Typical as limit** — a headline value used as a bound. *Recognize:* a margin computed from a `typ` column.
- **Hidden module circuitry** — chip rules applied to a module. *Recognize:* a pull-up, rail, or address taken from the chip datasheet for a board with its own schematic.
- **Fix by loosening** — speed lowered, pulls strengthened, or brownout disabled without a measurement. *Recognize:* a change with no before and after capture.
- **Unbounded protection** — a clamp or fuse with no source waveform or rating. *Recognize:* the proof column is empty.
- **Gate leakage** — one stage's pass used for the next. *Recognize:* first-power success cited as functional evidence.
- **Probe artifact** — a fault that disappears or appears with the instrument attached. *Recognize:* the failing and passing captures differ in probe setup.

## Check
1. Domain table: every device supply pin to its rail and range, logic thresholds, and every domain crossing with direction and topology; none exceeds recommended operating limits for the fitted part and revision.
2. Power budget: per rail and per state including peak, inrush, stall, and radio burst, against delivered source capability at that state; the controlling corner and a numeric margin are stated, and the budget is re-derived independently from the cited limits.
3. Reset, boot, and power-off states of every driven load, and every back-power path, are listed with the evidence for their default level.
4. Bus budget: effective pull-up, rise-time and sink-current bounds with capacitance, address and strap uniqueness, and the recovery owner; computed before any scan, and compared to measurement after.
5. Protection table: threat, device, source waveform, rating, and the evidence for survival and restart.
6. Net-level schematic-to-wiring record complete enough for another person to wire it; every unknown marked rather than assumed.
7. Every acceptance statement has a measurement plan row (quantity, test point, instrument configuration, predicted range, decision) and, once run, a result row with the measured value.
8. Each number carries its basis from the five above; any physical claim resting only on calculation, simulation, a document, or an ACK is listed as unverified, with the smallest decisive test.
9. First-power record: current limit, loads disabled, rails, startup and steady current, reset reason, temperature; critical results repeated after handling and a power-cycle; each failure has a disposition (fixed and retested, bounded risk with owner, or blocked).

## Writes to proposals
- `constraints`: rail and logic-domain limits, required supply capability, power ceiling, thermal and protection requirements, each with basis and grade.
- `claims`: electrical claims graded by basis (`INFERRED` when calculated, `VERIFIED` only on measurement); `CONTRADICTED` when a datasheet disagrees with project notes or the firmware.
- `unknowns`: unmeasured currents, unread revisions, missing waveforms, parts without a matching document.
- `decisions`: accepted risks with owner and expiry, waivers, and the electrical acceptance bar.
- `form`: a subsystem or link the electrical analysis shows is missing or wrong, as a `change`.
- Artifact `artifacts/electronics/electrical-review.md` (domains, budget, protection, acceptance plan; stamped) and evidence under `evidence/electronics/` (`power-budget.md`, `bus-budget.md`, `measurements.md`, `actions.md`). Defects in a design go to its owner; board changes go to `kicad-design`.
