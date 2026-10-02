built_from: model@5
reads: [claims]
cites: [C25, C26, C27, C28, C30, C31, C49, C50, C57, C58, C59, C60, C61, C62, C63, C76]
public: false

# Mote electrical review (MOTE-NECK REV C)

Scope: the electrical implementation of the unit, confirmed REV C [C76]. Evidence: evidence/recon-physical/hardware/ and evidence/electronics/. Basis marks: c calculated, r reported, o observed, v physically verified. No measurement has been taken yet; measurements.md M1-M6 are planned.

## Voltage domains and crossings

| device | supply and domain | crossing or limit | finding | basis |
|---|---|---|---|---|
| RP2040 (U1) | +3V3 from U2; pins 3.3 V, not 5 V tolerant [C27] | I2C1 GP10/GP11 to the VT-53 module | the module pulls SDA and SCL to VIN = +5V, so about 5 V sits on pins limited to 3.8 V [C59] | c |
| VT-53 module (U3) | +5V on J6.1; chip behind a 2.8 V regulator [C26] | SDA/SCL pull-ups to VIN, no level shifting | fix before first power: pull-ups to +3V3 or a level shifter, or power the module from +3V3 | r |
| ST20 (U4) | +3V3, 1.7-3.6 V recommended [C30] | I2C1 | within limits | r |
| Servos J3/J4 | SERVO_V through Q1, 4.8-5.5 V recommended, 6.0 V absolute maximum [C25] | signal from GP12/GP13 at 3.3 V, above the 2.5 V minimum | keep at 5 V; the bench habit of 6 V is outside the recommendation [C50] | r |
| Amplifier | +5V, 2.5-5.5 V recommended [C28] | I2S and shutdown from the Pi | cannot deliver the claimed 3 W [C49] | r |

## Power budget, +5V rail (calculated)

| state | load A | against 2.5 A |
|---|---|---|
| guide as published, servos idle | 1.22 | 49 % |
| speech and both servos moving, loaded | 2.00 | 80 % |
| full-output speech, servos moving | 2.26 | 90 % |
| full-output speech, both servos start (20 ms) | 2.76 | 110 %, exceeds |
| both servos stalled, typical | 3.06 | 122 %, exceeds |
| both servos stalled, datasheet maximum | 3.36 | 134 %, exceeds |

The hardware guide's 1.22 A omits servo motion and is contradicted by the datasheet figures [C31]; the budget is [C57]. The owner's resets when the head moves during speech fit the start-up and stall rows [C58]. F1 holds 2.5 A, so the adapter fails before the fuse acts [C61]. Capacitors are not in the export (U7); adapter behavior above 2.5 A is unknown (U8).

## Reset state and protection

Q1's gate is pulled to +5V by R3, so the servos are unpowered until GP14 is driven low [C60]. No clamp or inductive protection is listed for the servo rail; servo motors are internal to the modules, so the first check is rail behavior at start-up (M1).

## I2C1

One 10 k pull-up (the module's); 400 kHz meets the 300 ns rise-time limit only below about 35 pF [C62], and the line sits near 5 V [C59]. Use 100 kHz until the rise time is measured (M4).

## Sensor conditioning

The ST20 reads warm near the amplifier and the firmware applies no compensation, so 0.3 C cannot be claimed [C63].

## Acceptance plan

Bar (D4): +5V stays above 4.5 V at the worst servo-and-speech event on the shipping adapter, and no pin above its limit, measured and not calculated. Order: M3 (idle level at GP10/GP11, sensor removed), M5, M1, M2, M4, M6. Nothing is accepted yet.
