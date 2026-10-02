---
product: Mote
model_version: 4
---

## Purpose

Give builders a desk companion that hears them, sees what they hold up, talks back, and turns its head toward them (tests/fixture-mote/brief.txt:1-3).

## Actors

| id | actor | job |
|---|---|---|
| A1 | Beta builder | Assemble, flash, and hack a desk companion kit without a finished product's polish |
| A2 | Owner and maintainer | Design, build, and ship the kit; answer builders; decide what is claimed |
| A3 | Person at the desk, including a bystander within reach of the moving head | Use the companion without being hurt, startled, or recorded without knowing |

## Capabilities

| id | capability | claims |
|---|---|---|
| K1 | Turn the head on command: host command path tested in software only; an unbounded sweep starts at app start; never run on a REV C unit; no follow loop | C1, C2, C3, C74 |
| K2 | Hear speech and transcribe it through a cloud service | C4 |
| K3 | Play spoken replies through the speaker | C5 |
| K4 | Capture a camera image | C6 |
| K5 | Report distance from the VT-53 sensor | C15 |
| K6 | Report temperature and humidity from the ST20 | C16 |

## Constraints

**Technical**

- Host and neck board talk over UART 115200 8N1 at 3.3 V (tests/fixture-mote/hardware/hardware-guide-revC.md:7; tests/fixture-mote/hardware/schematic-revC.txt:32-33).
- Speech-to-text needs a network and MOTE_STT_KEY, and the audio leaves the device (C4, C48).
- RP2040 pins are 3.3 V only; no pin may see more than 3.8 V (C27).
- The camera works only through the libcamera stack (C56).
- The +5V rail must either supply at least 3.4 A at the servo stall corner or the servo current must be limited so the worst state stays near 2.0 A (80 % of the adapter) (C57).
- Servos run at 5 V (4.8-5.5 V recommended), never 6 V (C25, C50).
- Nothing may put more than 3.3 V on an RP2040 pin; the VT-53 module's VIN and pull-ups are fixed or level-shifted before first power (C59).
- The boot service loads its key from an EnvironmentFile, orders after the network-online target and the sound device, and drives the amplifier enable; a restart test is required (C68, C67).
- Firmware matches the REV C pin map and drives SERVO_EN (GP14) (C64).
- Calibration is per unit and persisted (C70); a recovery entry and a known-good image exist before any flash plan (U9).
- Every actuation carries a local bound enforced on the neck board (proposed: stop after 500 ms without a command, owner to confirm); joint limits follow the bracket stops, pan +/-70 and tilt -25 to +35 degrees (C72, C71).
- No unattended motion in the beta; supervised use only (D6).

**Physical**

- Head assembly 92.4 x 71.0 x 80.5 mm, 0.31 kg; hard stops pan +/-70 degrees, tilt -25 to +35 degrees (C22).
- Power is the 5 V 2.5 A USB-C adapter in the box (tests/fixture-mote/unit/inspection.txt:6).

**Legal**

- No license file in the repository (C17); the owner decides before any public code claim (U6).

## Form and interaction

A desk companion: a head on a two-axis neck, operated by voice through a host app. Subsystems (detail in evidence/recon-physical/hardware/):

- Host: Raspberry Pi Zero 2 W Rev 1.0 for voice, camera, and network (C23).
- Neck controller: RP2040 on the MOTE-NECK board; its revision is a claims-ledger question (U1).
- Actuators: two TS-9 servos, pan on J3 and tilt on J4, powered through load switch Q1; bracket stops pan +/-70, tilt -25 to +35 (C22).
- Sensors: VT-53 time-of-flight module and ST20 temperature and humidity sensor on the neck board's I2C1.
- Voice: a microphone (part per the claims ledger, U2) and a CA3105 amplifier with a 4 ohm speaker on the Pi's I2S bus.
- Camera: Optel O-2 on the Pi's CSI connector (C24).
- Power: 5 V 2.5 A USB-C adapter into the neck board, which feeds the host.
- Links: Pi to neck board over UART; neck board to sensors over I2C1; microphone and amplifier on the Pi's I2S.
- Links the schematic export omits: Pi GPIO17 to the amplifier shutdown pin (nothing drives it); SERVO_EN (GP14) to Q1 (nothing drives it).
- Absent: battery, charger, IMU, and touch pad (U5 is not populated) (C20, C46, C47).
- Size: the brief's 85 mm is contradicted by the 92.4 mm head (C44).
- Today the app starts an unbounded sweep and a listen-and-upload loop; the camera, speaker, and sensors have no end-to-end use.

## Voice

Warm and short, never chirpy (tests/fixture-mote/brief.txt:6). Examples that are not product claims: "Morning. Tea is probably cold." / "Say that again?"

## Positioning

Category: a hackable desk companion robot kit for builders. Alternative the actor uses now: a smart speaker with no body, or a plain Raspberry Pi project (inferred from the brief's framing; untested). The one difference: a head that turns on command (not yet a head that follows, C45). Not for: anyone who wants a finished product or a private-by-design assistant today (C48). Direction taken from the brief; name not screened.

## Claims ledger

| id | claim | grade | source |
|---|---|---|---|
| C1 | Host `neck.frame` and `Neck.pan` produce `PAN <int>` lines, pan is clamped to the range, and `stop` sends `SWEEP 0` | VERIFIED | test:python3 -m unittest discover -s tests -t . (in tests/fixture-mote/host): 3 passed |
| C2 | Host clamps pan and tilt commands to +/-90 degrees | OBSERVED | tests/fixture-mote/host/mote/neck.py:2-3,21,24 |
| C3 | `Neck.sweep(True)`, which the host calls at startup, starts a continuous pan sweep on the neck firmware that ends only when `SWEEP 0` arrives; no duration, step count, or timeout bounds it on either side | OBSERVED | tests/fixture-mote/host/mote/neck.py:26-28; tests/fixture-mote/host/mote/__main__.py:9; tests/fixture-mote/firmware/neck/main.py:27-28,34-39 |
| C4 | The host uploads captured microphone audio to a cloud transcription URL | OBSERVED | tests/fixture-mote/host/mote/voice.py:13-18; tests/fixture-mote/host/mote/config.py:6-7 |
| C5 | Host `speak()` plays a WAV with `aplay` and returns True when the exit code is 0 | OBSERVED | tests/fixture-mote/host/mote/voice.py:21-23 |
| C6 | Camera code uses the legacy `picamera` module | OBSERVED | tests/fixture-mote/host/mote/camera.py:2-7 |
| C7 | Face tracking is a stub: `follow_face` raises NotImplementedError | OBSERVED | tests/fixture-mote/host/mote/track.py:4-6 |
| C8 | Importing host `config` raises KeyError when MOTE_STT_KEY is unset | OBSERVED | tests/fixture-mote/host/mote/config.py:6 |
| C9 | The service unit orders after network.target, loads no environment, and starts the app as user pi | OBSERVED | tests/fixture-mote/host/systemd/mote.service:3,6,8 |
| C10 | At boot the service exits with KeyError MOTE_STT_KEY and ends in start-limit-hit | REPORTED | tests/fixture-mote/unit/boot-journal.txt:3-10 |
| C11 | Firmware pin map is labelled REV B: PAN GP10, TILT GP11, I2C0 on GP4/GP5 | OBSERVED | tests/fixture-mote/firmware/neck/config.py:1-6 |
| C12 | Firmware opens the sensor bus at 400 kHz | OBSERVED | tests/fixture-mote/firmware/neck/main.py:12 |
| C13 | Firmware has no watchdog, heartbeat, or command timeout | OBSERVED | test:grep -n -i -e wdt -e watchdog -e timeout -e heartbeat tests/fixture-mote/firmware/neck/*.py (no matches) |
| C14 | Firmware compiles: 5 files, 0 warnings, no target tests defined | OBSERVED | tests/fixture-mote/firmware/neck/build/ci-build.log:1-4 |
| C15 | Firmware applies a VT-53 offset of 0 (TODO) and never reads the identity register | OBSERVED | tests/fixture-mote/firmware/neck/tof.py:2,13 |
| C16 | Firmware reports ST20 temperature with no offset compensation | OBSERVED | tests/fixture-mote/firmware/neck/thp.py:7 |
| C17 | The Mote repository has no license file | OBSERVED | tests/fixture-mote/ listing (no LICENSE*) |
| C18 | The REV C schematic routes PAN to GP12 and TILT to GP13 and puts the sensors on I2C1 (GP10/GP11) | OBSERVED | tests/fixture-mote/hardware/schematic-revC.txt:28-31,37 |
| C19 | The REV C schematic feeds the servos through load switch Q1 (SERVO_EN on GP14, gate pulled up, off at reset) and feeds the VT-53 module VIN from +5V | OBSERVED | tests/fixture-mote/hardware/schematic-revC.txt:10,23-24,27 |
| C20 | The REV C schematic marks touch controller U5 do-not-populate with no touch net connected, and lists no battery, charger, or IMU | OBSERVED | tests/fixture-mote/hardware/schematic-revC.txt:9,34,39 |
| C21 | BOM rev B lists camera Optel O-1 with a 15-to-22 pin adapter and microphone Halden HM1000 (PDM), and no servo load switch | OBSERVED | tests/fixture-mote/hardware/bom-revB.csv:11-12 |
| C22 | CAD rev C (default configuration, mm): head bounding box 92.4 x 71.0 x 80.5 mm; hard stops pan +/-70 deg, tilt -25 to +35 deg | OBSERVED | tests/fixture-mote/hardware/cad-neck-revC.json:3-8 |
| C23 | The unit's host is a Raspberry Pi Zero 2 W Rev 1.0 on Debian 12 (bookworm), kernel 6.6 | REPORTED | tests/fixture-mote/unit/inspection.txt:2 |
| C24 | The unit's camera module is labelled Optel O-2 V1.1 | REPORTED | tests/fixture-mote/unit/inspection.txt:4 |
| C25 | TS-9 servo: recommended 4.8-5.5 V, absolute max 6.0 V; stall 650 mA typical / 800 mA max, start-up 500 mA, loaded 250 mA typical at 5 V | REPORTED | tests/fixture-mote/hardware/datasheets/servo-ts9.md:6-12 |
| C26 | The VT-53 module pulls SDA and SCL up to its own VIN and does no level shifting; the chip's VDD absolute max is 3.9 V | REPORTED | tests/fixture-mote/hardware/datasheets/tof-vt53.md:9,18-19 |
| C27 | RP2040 GPIO are not 5 V tolerant; maximum input voltage is IOVDD + 0.5 V | REPORTED | tests/fixture-mote/hardware/datasheets/rp2040-excerpt.md:4 |
| C28 | CA3105 delivers 2.5 W into 4 ohm at 5 V (10 % THD+N), 2.0 W at 1 %; an undriven shutdown pin leaves it off; full-output supply current 0.56 A | REPORTED | tests/fixture-mote/hardware/datasheets/amp-ca3105.md:8-9,12,14 |
| C29 | HM1100 is an I2S microphone, 1.8-3.3 V recommended; the HM1000 (PDM) is a different part and not a drop-in | REPORTED | tests/fixture-mote/hardware/datasheets/mic-hm1100.md:6,14 |
| C30 | ST20 temperature accuracy is 0.3 C typical and 0.5 C maximum over 5-60 C | REPORTED | tests/fixture-mote/hardware/datasheets/thp-st20.md:7 |
| C31 | The supply has ample margin: hardware guide rev C budgets 1.22 A typical of 2.5 A, with servos at idle only | CONTRADICTED | tests/fixture-mote/hardware/hardware-guide-revC.md:12-21; tests/walkthrough-mote/evidence/electronics/budget.py output: 2.76 A at start-up, 3.06 A at stall against 2.5 A |
| C32 | Pi draw peaked at 0.9 A on a USB meter during a voice reply with Wi-Fi up (one run) | REPORTED | tests/fixture-mote/docs/notes.md:6 |
| C33 | Owner notes the ST20 reads warm near the amplifier | REPORTED | tests/fixture-mote/docs/notes.md:7 |
| C34 | The unit resets when pan and tilt both move while it speaks | REPORTED | tests/fixture-mote/unit/owner-notes.txt:3 |
| C35 | Owner reports the app works from a shell but not at boot | REPORTED | tests/fixture-mote/unit/owner-notes.txt:2 |
| C36 | The firmware has not been flashed to the REV C board | REPORTED | tests/fixture-mote/docs/notes.md:9; tests/fixture-mote/unit/owner-notes.txt:5 |
| C37 | A bench run on a REV B board found ACKs at 0x29 and 0x44 on I2C0 | REPORTED | tests/fixture-mote/unit/neck-boot.log:1-6 |
| C38 | Mote hears you from across the room (no range stated or measured) | REPORTED | tests/fixture-mote/docs/old-product-page.md:5 |
| C39 | Temperature is accurate to 0.3 C | REPORTED | tests/fixture-mote/README.md:26; tests/fixture-mote/docs/old-product-page.md:11 |
| C40 | A closed beta kit goes to 10 builders | PROPOSED | tests/fixture-mote/brief.txt:5 |
| C41 | Price is about $149 | PROPOSED | tests/fixture-mote/brief.txt:5 |
| C42 | Assembly guide rev B (servos on the raw 5 V rail, PAN GP10, TILT GP11) vs REV C schematic (switched servo supply, PAN GP12, TILT GP13) | CONTRADICTED | tests/fixture-mote/hardware/assembly-guide-revB.md:5-7; tests/fixture-mote/hardware/schematic-revC.txt:10,28-29 |
| C43 | README places the VT-53 on I2C bus 0 at 0x52; the REV C schematic puts it on I2C1, and 0x52 is the 8-bit form of 0x29 | CONTRADICTED | tests/fixture-mote/README.md:16; tests/fixture-mote/hardware/schematic-revC.txt:30-31,38; tests/fixture-mote/hardware/datasheets/tof-vt53.md:13 |
| C44 | Product is 85 mm across (brief, old page) vs a 92.4 mm head bounding box in CAD rev C (8.7 % wider) | CONTRADICTED | tests/fixture-mote/brief.txt:2; tests/fixture-mote/docs/old-product-page.md:6; tests/fixture-mote/hardware/cad-neck-revC.json:6 |
| C45 | Mote follows you with its head (brief, old page, README) vs a stub that raises NotImplementedError | CONTRADICTED | tests/fixture-mote/brief.txt:1-2; tests/fixture-mote/docs/old-product-page.md:3; tests/fixture-mote/README.md:26; tests/fixture-mote/host/mote/track.py:4-6 |
| C46 | Up to 8 hours on a built-in battery (old page) vs no battery in the REV C schematic or on the unit | CONTRADICTED | tests/fixture-mote/docs/old-product-page.md:7; tests/fixture-mote/hardware/schematic-revC.txt:39; tests/fixture-mote/unit/inspection.txt:7 |
| C47 | Touch the top to wake it (old page, hardware guide) vs touch controller U5 do-not-populate, no touch net, no BOM line, nothing on the unit | CONTRADICTED | tests/fixture-mote/docs/old-product-page.md:8; tests/fixture-mote/hardware/hardware-guide-revC.md:25; tests/fixture-mote/hardware/schematic-revC.txt:9,34; tests/fixture-mote/unit/inspection.txt:7 |
| C48 | Everything stays on the device (brief, old page) vs audio uploaded to a cloud URL | CONTRADICTED | tests/fixture-mote/brief.txt:3; tests/fixture-mote/docs/old-product-page.md:9; tests/fixture-mote/host/mote/voice.py:13-18 |
| C49 | The amplifier delivers a full 3 W into the speaker (README, notes) vs 2.5 W maximum at 10 % THD+N and 2.0 W at 1 % | CONTRADICTED | tests/fixture-mote/README.md:19; tests/fixture-mote/docs/notes.md:3; tests/fixture-mote/hardware/datasheets/amp-ca3105.md:8-9 |
| C50 | Servos are fine at 6 V (notes) vs recommended maximum 5.5 V and absolute maximum 6.0 V | CONTRADICTED | tests/fixture-mote/docs/notes.md:4; tests/fixture-mote/hardware/datasheets/servo-ts9.md:6-7,16 |
| C51 | The VT-53 module is 5 V safe (README, notes) vs module pull-ups to VIN with no level shifting and RP2040 pins that are not 5 V tolerant | CONTRADICTED | tests/fixture-mote/README.md:16; tests/fixture-mote/docs/notes.md:5; tests/fixture-mote/hardware/datasheets/tof-vt53.md:18-19; tests/fixture-mote/hardware/datasheets/rp2040-excerpt.md:4 |
| C52 | Firmware pin map (REV B) vs REV C schematic: PAN and TILT on GP10/GP11 are the REV C I2C1 SDA/SCL, and the sensor bus on GP4/GP5 reaches nothing | CONTRADICTED | tests/fixture-mote/firmware/neck/config.py:2-6; tests/fixture-mote/hardware/schematic-revC.txt:28-31 |
| C53 | The camera is Optel O-1 (BOM rev B, assembly guide rev B) vs Optel O-2 (hardware guide rev C, unit label) | CONTRADICTED | tests/fixture-mote/hardware/bom-revB.csv:11; tests/fixture-mote/hardware/assembly-guide-revB.md:8; tests/fixture-mote/hardware/hardware-guide-revC.md:8; tests/fixture-mote/unit/inspection.txt:4 |
| C54 | The microphone is HM1000 PDM (BOM rev B, assembly guide rev B, README, notes, host capture device) vs HM1100 I2S (hardware guide rev C) | CONTRADICTED | tests/fixture-mote/hardware/bom-revB.csv:12; tests/fixture-mote/README.md:12; tests/fixture-mote/docs/notes.md:8; tests/fixture-mote/hardware/hardware-guide-revC.md:8 |
| C55 | Host code expects an IMU at 0x68 vs no IMU in the REV C schematic or BOM rev B | CONTRADICTED | tests/fixture-mote/host/mote/imu.py:2,6; tests/fixture-mote/hardware/schematic-revC.txt:39; tests/fixture-mote/hardware/bom-revB.csv:3-15 |
| C56 | README says the legacy camera setup works vs a camera module supported by libcamera only on a bookworm unit | CONTRADICTED | tests/fixture-mote/README.md:8-10; tests/fixture-mote/hardware/datasheets/camera-o2.md:4-5; tests/fixture-mote/unit/inspection.txt:2 |
| C57 | Budgeted by state, the +5V rail needs 2.00 A with speech and both servos moving, 2.76 A for 20 ms at servo start-up with full-output speech, and 3.06 A (3.36 A at the datasheet maximum) if both servos stall, against a 2.5 A supply | INFERRED | C25, C28, C32, C31, C19; tests/walkthrough-mote/evidence/electronics/budget.py |
| C58 | The reported resets when pan and tilt move while speaking are consistent with the supply limit at servo start-up (a brownout); not yet measured | INFERRED | C34, C57 |
| C59 | With VIN on +5V, the VT-53 module holds SDA and SCL near 5 V, above the 3.8 V limit of RP2040 pins GP10/GP11 | INFERRED | C19, C18, C26, C27 |
| C60 | In REV C the servo supply is off at reset until GP14 is driven low | INFERRED | C19 |
| C61 | F1 holds 2.5 A, the adapter's rating, so the fuse does not act before the adapter: an overload shows as a collapsing rail, not a trip | INFERRED | C57; tests/fixture-mote/hardware/schematic-revC.txt:11 |
| C62 | With the module's single 10 k pull-up, 400 kHz rise time (300 ns) is met only below about 35 pF of bus capacitance, which is unmeasured, and the firmware asks for 400 kHz | INFERRED | C26, C12; tests/walkthrough-mote/evidence/electronics/bus-budget.md |
| C63 | The ST20 reading carries an uncompensated warm bias near the amplifier, so 0.3 C cannot be claimed | INFERRED | C16, C33, C30 |
| C64 | Comparing the firmware pin map with the REV C schematic nets by script finds: PAN on GP10 (I2C1_SDA), TILT on GP11 (I2C1_SCL), I2C0 GP4/GP5 unconnected, and SERVO_EN (GP14) never driven | VERIFIED | test:python3 tests/walkthrough-mote/evidence/embedded-systems/pincheck.py (exit 1, 5 findings) |
| C65 | Flashed to a REV C board, the current firmware would put PWM on the I2C1 lines, give the servos no signal and no supply, and reach no sensor | INFERRED | C64, C11, C18, C19 |
| C66 | Nothing in host or firmware code drives the amplifier enable; GPIO17 appears only as a constant | OBSERVED | test:grep -rn -e AMP_ENABLE -e "GPIO.\?17" -e "GPIO(17" tests/fixture-mote/host tests/fixture-mote/firmware (one match, host/mote/config.py:10) |
| C67 | `speak()` can return True while the CA3105 is shut down, so playback success does not show audible output | INFERRED | C5, C66, C28 |
| C68 | The service fails at boot because MOTE_STT_KEY is set only in the owner's shell and the unit orders after network.target only; a shell run succeeds | INFERRED | C8, C9, C10, C35 |
| C69 | The only evidence of working sensors is ACKs from a REV B board; no identity register has been read on any board | INFERRED | C37, C15 |
| C70 | Calibration constants are source literals and the firmware has no persistent store | OBSERVED | tests/fixture-mote/firmware/neck/tof.py:2; tests/fixture-mote/firmware/neck/thp.py:1-9; test:grep -n -e flash -e nvm -e json -e "open(" tests/fixture-mote/firmware/neck/*.py (no matches) |
| C71 | Host limits of +/-90 deg let pan and tilt commands run past the bracket stops (pan +/-70, tilt -25 to +35) and stall the servo | INFERRED | C2, C22, C25 |
| C72 | A host crash, restart, or lost serial link leaves the neck sweeping: SWEEP persists and the firmware has no timeout | INFERRED | C3, C13 |
| C73 | Neither BOM rev B nor the REV C schematic has a neck position sensor or end-stop input; position is commanded only | OBSERVED | tests/fixture-mote/hardware/bom-revB.csv:3-15; tests/fixture-mote/hardware/schematic-revC.txt:5-19 |
| C74 | The follow-with-head loop does not exist: nothing converts an observation into a neck command | INFERRED | C7, C6, C3 |
| C75 | VT-53 distances are uncalibrated (offset 0) and no envelope has been measured | INFERRED | C15 |

## Unknowns

| id | question | blocks | who can answer |
|---|---|---|---|
| U1 | Which letter ends the neck-board silkscreen 'MOTE-NECK REV _' (hidden under the pan bracket)? | every claim about the unit's wiring; contradictions C42, C52 | owner (remove the bracket and read it) |
| U2 | Is the unit's microphone the HM1100 (I2S) or the HM1000 (PDM)? Marking reads 'HM11' | audio capture configuration; claim C54 | owner (macro photo of the marking) |
| U3 | Has any firmware run on the REV C board, and with which pin map? | any firmware behavior claim on the unit | owner |
| U4 | What is the real pickup range and wake reliability of the microphone in the head? | claim C38; any 'across the room' statement | owner (recorded range test) |
| U5 | Is cloud speech-to-text acceptable, or must audio stay on the device? | claim C48; positioning; any privacy statement | owner (decision) |
| U6 | Who owns and which license covers the host code, firmware, and the vendor excerpts in the kit? | any public code claim; kit documentation | owner |
| U7 | What decoupling and bulk capacitors sit on +5V and SERVO_V? The schematic export lists no capacitors | claim C57; power acceptance | owner (full schematic or BOM with passives) |
| U8 | How does the 2.5 A adapter behave above its rating, and what is the cable and connector drop? | claims C57, C58; supply requirement | measurement M1-M2 |
| U9 | What is the RP2040 recovery entry (BOOTSEL or SWD) on the REV C board, and where is a known-good image? | any flashing plan | owner; REV C boot-pin sheet |
| U10 | Does the service start after a reboot once environment, ordering, and amplifier enable are fixed? | any unattended-boot claim | restart test on the unit |
| U11 | What is the commanded-versus-actual travel, speed, and stop distance of pan and tilt at the real supply and load? | any head-motion claim; capability K1 | motion test (robotics) |
| U12 | What is the VT-53 envelope on real desk surfaces and with servos and amplifier running, and what is its calibrated offset? | any distance claim; capability K5 | measurement on the unit |

## Decision log

| n | decision | rationale | touched | version |
|---|---|---|---|---|
| D1 | Model created from recon of host/, firmware/, the hardware package, the unit captures, and the brief | Recon output P1-P7; gaps recorded as unknowns | all | 1 |
| D2 | Goal: closed-beta hardware kit for 10 builders with a public spec sheet. Bar: no public claim below OBSERVED/VERIFIED, and any claim that a physical feature works needs an exercised check on the real unit at the shipping revision (REV C) | brief.txt:5; owner asked for a launchable result | purpose | 1 |
| D3 | Lenses: recon-software, recon-physical, electronics, embedded-systems, robotics, marketing, release-readiness. Satisfied: brand (the brief states name, voice, and positioning direction; recorded as direction, not screened). Excluded: direction, experience, product-visualization, motion-editorial, audio-sound, illustration, fidelity-qa, legacy-modernization, provenance-licensing | direction, illustration, motion-editorial: the deliverables are a kit and a text spec sheet; experience: no software flows in scope; product-visualization: CAD exists but no renders are wanted; audio-sound: sound design is not in scope (audio function is checked by embedded-systems); fidelity-qa: no built visual output; legacy-modernization: code is not being changed in this goal; provenance-licensing: no assets are published and the license decision is deferred (U6) | decisions | 1 |
| D4 | Electronics accepted: the +5V rail is under-budgeted (the guide omits servo motion; claim C31 CONTRADICTED); the VT-53 module puts about 5 V on RP2040 pins; servos stay at 5 V; electrical acceptance bar recorded | P8-P11; evidence/electronics/budget.py output; owner-notes.txt:3 consistent with the stall corner | constraints, claims:C57+C58+C59+C60+C61+C62+C63+C31, unknowns, decisions | 2 |
| D5 | Embedded-systems accepted: firmware is a REV B build and is not usable on REV C; boot service, amplifier enable, restart evidence, and persistence are constraints; recovery path unknown | P12-P15; pincheck.py exit 1; boot-journal.txt | constraints, form, claims:C64+C65+C66+C67+C68+C69+C70, unknowns | 3 |
| D6 | Robotics accepted: no unattended motion in the beta; every actuation carries a local bound; joint limits follow the bracket stops; K1 reworded; the follow capability is not claimed | P16-P20; loop.md; envelopes.md | constraints, capabilities, claims:C71+C72+C73+C74+C75, unknowns, decisions | 4 |
