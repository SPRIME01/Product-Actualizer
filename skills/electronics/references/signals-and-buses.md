# Signals, buses, analog, and sensing

Load when the decision involves a logic level, a bus, an audio or camera link, an analog input, or a sensor. Exact pinout, thresholds, addresses, and timing
come from the fitted part's document; nothing below is a portable default.

## Logic levels and translation

- Compare the driver's `VOH`/`VOL` with the receiver's `VIH`/`VIL` at the worst supply, temperature, and load, not nominal supply labels. A "5 V-tolerant" input
  tolerates 5 V; it does not necessarily read a 3.3 V high reliably. An input clamp diode to the supply conducts when driven above it.
- Translation depends on topology. Open-drain bidirectional lines (I2C, 1-Wire) need a translator that preserves release; unidirectional push-pull can use a
  buffer or divider (slow edges limit speed); bidirectional push-pull (a shared data line) needs a direction-controlled or auto-direction part.
  Resistor dividers are not translators for open-drain or for edges above their RC.
- Boot-time pins: straps, boot-select, and UART/USB pins carry meaning at reset. External pulls, level shifters, and connected peripherals must leave the strap level intact (see `embedded-systems` for the pin restrictions; here the question is what the external network does).

## I2C

- Treat it as an electrical bus plus a transaction contract. Effective pull-up is every fitted pull in parallel (modules ship their own); `Rp(min) = (VDD(max) - VOL) / IOL`
  with the weakest guaranteed sink of any device; `tr(30-70%) = 0.8473 * Rp * Cb`, so `Rp(max) = tr_max / (0.8473 * Cb)`. Reference rise-time limits are 1000/300/120 ns for
  Standard/Fast/Fast-mode Plus with 400/400/550 pF maximum bus capacitance; the selected devices' documents govern. Cable length and connector count raise `Cb`.
  Worked case: Cb 120 pF, 3.3 V, Fast mode, 0.4 V at 3 mA gives `Rp` between about 970 ohm and 2.95 kohm; two 4.7 k pulls on separate modules already make 2.35 k.
- Measure the real rise time with a probe that does not load it; a nominal resistor is not compliance, and a lower clock speed hides a marginal edge without fixing it.
- Addresses: state 7-bit or shifted 8-bit notation; trace strap pins to their nets; check for conflicts including fixed-address parts and modules with multiplexed or jumpered addresses.
  A scan is an active transaction and can alter write-capable devices; decide read/write mode before the scan and record it. A found address is a clue; identity is a documented ID, status, or revision register.
- A stuck bus: SDA low is cleared by up to nine clocks only when the controller may own the lines and every other controller is quiet; SCL low is a reset or power-cycle first.
  Every wait has a deadline and reports its phase. Clock stretching is distinguished from a stuck output by a deadline and a waveform.
- Do not apply bus pull power to an unpowered device unless its powered-off pin behavior allows it.

## SPI, UART, RS-485, CAN, USB

- SPI: mode (clock polarity and phase) from the device document, one select per device, a tri-stated MISO from deselected parts (a floating or contending MISO looks like a driver bug), clock limited by trace and
  cable, reset and ready lines honored. Display and flash on the same bus share timing limits.
- UART: TX/RX cross, common reference unless isolated, matching voltage standard (RS-232 swings are not TTL), baud error within the receiver's tolerance, flow control wired if the peripheral requires it. A boot ROM or a radio module may emit bytes
  on its UART at power-up that a connected peripheral misreads.
- RS-485 and CAN need transceivers, a differential pair, termination at the two ends only (commonly 120 ohm for CAN), bias for 485, a stable common-mode reference, and matching bit timing; stub length and node count are budgeted.
- USB: series resistors and ESD parts as the controller's guide requires, correct VBUS sensing, CC resistors that advertise the intended role and current, and a data-capable cable; a charge-only cable and a weak port look like firmware faults.

## Audio, camera, and other high-rate links

- I2S/PDM: one device owns the bit and word clocks; the others are targets. Word-select polarity, justification, slot width, and sample rate must agree end to end; a wrong slot gives a half-level or channel-swapped signal, not silence.
  A PDM microphone needs its clock within its documented range and a decimation filter; its output is not PCM. An analog microphone needs bias and an ADC with the right reference; ground noise from a switching or motor supply shows up as a tone.
- Hum and buzz: a ground loop or a shared return with a switching or motor load puts a tone on analog audio; a digital (I2S/PDM) path is immune to the loop but not to a noisy reference or clock. Locate by disconnecting loads one at a time while capturing.
- Speaker path: amplifier supply decoupling at its pins, shutdown/mute default, load impedance and power rating, and the pop on enable. "Plays with exit code 0 and no sound" is checked at the amplifier enable and the OS output route before the stream.
- Camera interfaces (parallel, MIPI CSI lanes): lane count, connector keying and ribbon orientation, control-bus address, required rails and their order, input clock source, and flex length. Documented sensor variants of the same module family differ in lanes and
  clock, so the module revision is part of identity.

## Analog inputs and sensing

- ADC input: source impedance against the sampling capacitor (buffer or add a settling capacitor), an anti-alias filter with a corner chosen from the signal and sample rate, a reference with a known tolerance, and scaling so the worst fault voltage stays in range.
  Nonlinearity near the rails, attenuation settings, and temperature are part of the transfer function; a number from the converter is a code until calibrated.
- Conditioning by sensor class: resistive (divider or bridge, excitation limited and switched to avoid heating and corrosion), thermistor (linearization range), photodiode (transimpedance), capacitive (oscillator or charge-transfer, shielding), microphone, current sense (shunt and amplifier common-mode range).
  A resistive soil or liquid probe corrodes and drifts; a capacitive one depends on the dielectric and temperature. Physical placement (heat from regulators, airflow, contamination) can dominate error.
- Calibration plan: at least two reference points that span the use range, an independent reference with known uncertainty, temperature and warm-up noted, constants stored with units and provenance, and raw values kept beside converted ones. Never invent constants; derive them from a datasheet or a measured run.
- Sensor faults and acceptance: excitation can self-heat a resistive sensor; test increasing and decreasing stimulus (hysteresis), warm-up, and supply variation separately; short and open the input to separate sensor, wiring, conditioner, and converter; check stale or invalid flags before filtering (an average can hide aliasing or intermittent saturation);
  define behavior for invalid, stale, disconnected, saturated, and implausible readings. Reject a calibration with untraceable references, discarded raw data, points that do not span the range, or acceptance only at the fitted points; calibration cannot remove noise, hysteresis variation, future drift, or an unmeasured installation shift.
- Error budgets: add guaranteed bounds linearly for a worst-case claim; combine independent random terms in quadrature only for a statistical claim, and say which. Systematic, correlated errors are never treated as independent noise. Filtering reduces visible noise, not range, wiring, saturation, drift, or a wrong transfer function.
- Sensors have operating envelopes: blind spots, minimum range, saturation and clipping, motion or vibration noise, ambient light dependence, orientation dependence, interference from nearby actuators (see `robotics` for how these are recorded).

## Timing where it is electrical

Reset hold and release, power-up settling, conversion time, debounce, rise and fall times, and setup/hold are checked against the part's table at the real rail and temperature. A delay with no document behind it is a guess and is recorded as one.

## Selecting and substituting parts

State the requirement as an observable behavior with its corners (minimum, nominal, maximum, transients, fault states, temperature, supply, expected failure behavior), not as a part name. One row per requirement with the evidence, controlling corner, calculated margin, and verification method; reject a candidate whose needed value is unavailable, out of range, or only typical where a guarantee is required.
A second source, a new revision, or a different package is a new candidate: redo thermal, timing, protection, and calibration checks, and confirm lifecycle status from the manufacturer (not-recommended-for-new-design and last-time-buy parts are risks, not defaults). Shortcuts that fail: a switch chosen on nominal current (it needs SOA, gate drive, and fault energy), a regulator on output voltage (transients, stability, heat), an op amp on offset (common-mode range, noise gain, stability), a comparator swapped for an op amp, a module's range read as accuracy, protection chosen by package size.
