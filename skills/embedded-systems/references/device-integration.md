# Peripherals, links, provisioning, persistence, updates

Load when integrating or judging sensors, audio, displays, actuators, inter-board links, networking, stored configuration, or update paths on an MCU or SBC.

## Component contract (per peripheral, from its matching-revision documents)

Identity and revision; breakout or module schematic if not a bare part; supply and logic ranges; current by state; interface, address, strap pins, register map, command timing, reset behavior;
measurement range, resolution, accuracy, drift, warm-up, calibration; actuator voltage, stall, inrush; a readable identity or self-test; the safe inactive state; the recovery procedure. A breakout can add regulators, pulls,
level shifters, address jumpers, and transistors: read both artifacts. A part with no reliable document is unsupported, not guessable from a similar module.

## Sensor integration sequence

Rail at the sensor, idle bus levels and straps, a bus scan or loopback, identity read, documented reset and startup wait, one conservative mode, raw registers before conversion, comparison with an independent reference at several points,
then compensation, calibration, and filtering added separately, then repetition across reset, power-cycle, network activity, and the intended environment. For interrupt-driven sensors poll and log status first; add the interrupt after the clear sequence, polarity, and open-drain pull are understood.
Warm-up and auto-exposure/auto-gain settle before a first sample is trusted. Placement matters: heat from regulators, airflow, enclosure, and contamination move readings in ways correct code cannot fix.

## Audio and display

- Output: amplifier enable defaults, sample rate and format agreement from the source to the codec, volume path, and a recorded human confirmation for audibility. Microphone: confirm the actual sample rate, channel layout, level, and noise floor from a capture.
  Wake-word or speech models are tested on captured audio from the unit, not on clean samples. Echo and self-hearing (speaker into microphone) is a physical property of the enclosure.
- Display: controller variant, resolution, color order, orientation setting, reset and backlight pins, and memory needs for the frame buffer; DMA limits constrain transfer size. Visual correctness is judged from a photograph of the real screen under controlled light compared with the intended image; a code path that looks right is no evidence.

## Actuators from the firmware side

Define the safe state at reset, bootloader, panic, disconnect, and update; test the control signal with the load disconnected, then with a benign or current-limited load, then the real load with rail droop measured. Limits (travel, speed, current, time) are enforced in the driver and again in the layer that decides, and a stop that depends on a later message is not a stop (see `robotics` for locally bounded actuation).
Servo and motor commands are not positions; confirm with feedback or an external observation. Add timeouts, end stops, and interlocks before unattended use; software cannot be the only protection where hardware can provide one.

## Links between boards and hosts

Specify per link: master/target roles, framing and versioning, addresses or channel, bit rate, voltage, timeouts, heartbeat, what each side does when the other is absent, resetting, or busy, and which side resets which. Bus targets that clock-stretch or lock a line need controller-side deadlines.
Link tests run with both ends as built; a mock on one side verifies only the other side's reading of the document. Host-to-MCU serial protocols are checked for partial frames, overruns, and baud error; a flood of host commands needs a bounded queue and an explicit drop policy.

## Network, BLE, and provisioning

Prove radio initialization alone, then join or advertise with temporary credentials kept out of source, record address, signal, channel, and the disconnect reason, verify time, DNS, and route before debugging TLS or the application protocol, bound retries with backoff, and provide a local recovery mode.
Test wrong credentials, access point loss, DHCP or DNS failure, weak signal, server unavailability, and reboot. Certificate verification is not disabled as a production fix. Radio activity changes the power budget and may block analog inputs on some chips.

## Persistent configuration and calibration

Inventory every value that must survive restart: what stores it (non-volatile key-value area, flash filesystem, EEPROM, file), the schema version, defaults, wear and write frequency, atomic update, behavior on corruption, and behavior across update and factory reset.
Calibration constants are per unit, carry units, date, method, and reference, are visible and replaceable, and are not shipped as a single bench unit's values (state that as a limitation until a population is calibrated). Raw values stay available beside converted ones.

## Updates and recovery

Artifact identity and board compatibility, authentication of the artifact, partition layout with a known-good image where rollback is required, a health criterion that confirms a new image, a boot-attempt limit, data migration, and a wired recovery path that still works after a bad update.
Exercise: a deliberately bad image, an unconfirmed image, power loss at several stages, and a low-supply update, each on a disposable unit; the device must return to a valid prior image or a documented recovery state. Calibration and user data are checked across update and rollback.

## Production provisioning

Per-unit identity (serial, keys, certificates), per-unit calibration, firmware and configuration version, and the end-of-line check are written and verified by a repeatable procedure with a jig; the result is stored per unit. A kit assembled by builders needs the same steps as documented instructions with checks they can run, not as the author's memory.

## Device diagnostics

Report firmware and hardware version, build identity, reset reason, uptime, peripheral status, and error counters through a path that works when the application fails; keep a bounded log with a retention policy. Self-tests are traceable to the contract table so a field fault points to a stage.

## Contract table format (`evidence/embedded-systems/contract.md`)

`item | firmware value (file:line) | schematic/doc value (source, revision) | match | evidence on unit | grade`. Items: each pin, bus address, voltage assumption, boot state, clock, sample rate, protocol constant, and persisted key. Mismatch rows are contradictions.
