# Power, drivers, protection, thermal

Load when the decision involves a rail, a regulator, a load, a battery, a driver, or heat. Every value used here comes from the fitted part's
matching-revision document (see `recon-physical/references/hardware-context.md`); the formulas are screening models with stated validity.

## Energy map first

Before choosing or judging parts, draw the current paths for: normal operation, startup, shutdown, supply reversal, disconnect, short, a
dead or rebooting controller, and loss of communication. Note source impedance and stored energy in inductors, capacitors, batteries,
cables, and rotating loads. A circuit that is correct in steady state can fail in each of the transitions.

## Budget method

| Rail | State | Consumers and current | Peak and duration | Source capability in that state | Margin and controlling corner |
|---|---|---|---|---|---|

- States: off/standby, boot (flash and radio calibration spike), idle, active, radio transmit burst, actuator start (inrush), actuator stall,
  charging while loaded, sleep. Sleep current is a product-boundary measurement: bridges, LEDs, regulators' quiescent current, level shifters, and sensors dominate.
- Source capability is the minimum of: the source rating; connector and cable rating and drop; regulator output current at the actual headroom
  and temperature; battery current at the actual state of charge, temperature, age, and protection-board cutoff; and what a host or charger
  actually negotiates (a port may offer far less than its connector can carry; measure it under load, do not read it off the label).
- Linear regulator loss is `(Vin - Vout) * I`; check dropout at peak current and minimum load, and the output-capacitor type the part is stable with.
  Switching regulators: efficiency at light load, startup overshoot, load-step droop, and that bulk capacitance does not hold off the soft start.
- **Motors, servos, solenoids, pumps, and fans** are budgeted at stall and start, not at their running figure, and at the supply voltage they
  will see. A stall that collapses a shared rail resets the controller: the symptom is a reboot when the actuator moves. Separate the rail or
  add a bulk store and a current limit, and keep the actuator return out of the logic reference.
- Radios, cameras, displays, and amplifier peaks are short and large; they are budgeted at the instant, so decoupling and source impedance matter, not average current.
- Brownout resets and flash-write corruption are the same fault seen at different layers. Measure at the board pins during the event
  (scope, trigger on the rail), do not disable the detector.

## Decoupling and storage

Local capacitors at every IC supply pin, sized to the part's document and placed at the pin; bulk capacitance sized to the largest load step (servo start, radio burst, amplifier peak) and the source impedance, so the rail droop stays above the lowest operating voltage of the weakest consumer.
Ceramic capacitance falls with DC bias and temperature (the value at the operating voltage is what counts), regulator stability depends on output-capacitor type and ESR, and a schematic export without passives gives no evidence either way: record it as unknown and verify with the rail on a scope at the worst event.

## Sequencing, back-power, reset states

- Input protection diodes conduct when a pin is driven above an unpowered rail: a powered module can back-feed a switched-off one through a shared bus
  or a shared signal. List shared signals between independently switched domains and check each device's powered-off pin behavior.
- Enables, resets, and straps have defined levels only after their own rail is up. Floating gates and enable pins during reset and boot cause
  twitching motors, clicking relays, and unwanted amplifier pops: put the safe level in hardware (pull-down on a gate, pull on an enable) and
  verify it on the unit during reset and with the controller held in the bootloader.
- Hot-plugging a connector with power applied (servos, sensor modules, speakers, battery packs) creates spikes and can latch or damage inputs; mark which connectors are safe to hot-plug and test the ones that will be.
- Camera, codec, and radio parts often require ordered rails and a stable clock before reset release; read the power-up diagram, do not assume simultaneous.

## Drivers and loads

- A MOSFET's gate threshold is the onset of a tiny drain current, not the voltage that gives its on-resistance. Use `Rds(on)` at the real gate
  voltage and temperature, check gate charge and driver strength, and avoid time in the linear region (slow gate, current limit, e-fuse, stall).
  Switching loss `~ 0.5*V*I*(tr+tf)*fs` is a screening number only when the overlap is roughly linear; release needs measured waveforms.
- Inductive loads: record inductance or stored energy, current at turn-off, the clamp location and voltage, and the release time needed. A flyback diode
  slows release; a TVS or active clamp trades speed for loss. Measure at the load pins and the switch pins; wiring inductance hides local spikes.
- H-bridges need dead time and a defined brake or coast state at reset; PWM frequency interacts with the load's inductance (audible whine, ripple current) and the driver's thermal limit.
- Relay modules: contacts are isolated, the control input often is not, and the input stage may need more current or voltage than a 3.3 V pin supplies.
- Class-D amplifiers and codecs have shutdown or mute pins that default to off; "plays with no error but silent" is often that enable, not the I2S stream.
- LEDs: `I = (Vsupply - Vf)/R` evaluated across supply, Vf, and resistor tolerance; check resistor dissipation and the pin's limit.

## Protection

| Threat | Candidate | Proof required |
|---|---|---|
| Inductive turn-off | flyback diode, TVS, active clamp, snubber | peak voltage, decay time, repetition heating |
| Overcurrent / short | fuse, current limit, foldback, e-fuse | trip delay, I2t, restart behavior, fault energy |
| Reverse supply | series FET or diode, ideal-diode controller | drop at load, reverse current, startup |
| Surge / ESD | TVS, series resistance, filtering, enclosure | source waveform, clamp voltage at actual current, pulse rating |
| Overtemperature | derating, sensing, shutdown with restart policy | hot-case behavior, repeated-fault accumulation |
| Cross-domain fault | isolation, current limiting | withstand rating, leakage, containment |

Reject a clamp with no source waveform, a fuse with no interrupt rating, a diode whose recovery and repetition loss are unknown, and "thermal
shutdown" without a restart and energy limit. Test a shorted switch, open clamp, stuck enable, reversed supply, and repeated restart.
Battery packs add their own failure physics (over-discharge, charge temperature window, short energy): a protected cell is not a protected product.

## Thermal

Name the loss: conduction (`I^2*R`), switching, magnetic, gate drive, quiescent, linear dropout. `Tj = Ta + P*theta_JA` applies only when copper area,
airflow, and steady state match the rating; otherwise use the junction-to-board or case path and transient impedance. Pulses and duty cycle are
analysed separately from steady state. In an enclosure ambient is the enclosure's, and the hottest component sets the limit (regulators, motor
drivers, amplifiers, SoC). Verify with a calibrated method at the hottest location after thermal equilibrium, not by feel except as a safety screen.

## Exit evidence

A measured normal waveform, startup and shutdown waveform, rail droop at the worst actuator and radio event, current and temperature at the controlling
corner, and the demonstrated recovery for each fault. If the fault waveform is unknown the protection result is incomplete, and the claim is graded accordingly.
