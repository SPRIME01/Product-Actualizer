# Measurement plan (planned; none run, no unit access in this pass)

| id | quantity / test point | reference | instrument and configuration | predicted | decision it resolves | result | grade |
|---|---|---|---|---|---|---|---|
| M1 | +5V at the neck-board J2 pins during servo start with speech at full volume | GND J2.2 | oscilloscope, DC, 10x probe, short ground spring, single-shot trigger on droop below 4.6 V | below 4.5 V at the controlling corner with the 2.5 A adapter | is the supply adequate; is a rail change needed | not run | none |
| M2 | adapter current during stall, servo stopped at a bracket stop | n/a | current-limited bench supply first, then the adapter with a shunt and fast capture | above 2.5 A for typical stall | supply requirement; servo current limit | not run | none |
| M3 | SDA and SCL idle level at U1 GP10/GP11 | GND | DMM DC before first power of the module, then scope | about 5 V (module pull-up to VIN) | confirms the over-voltage; blocks first power with the sensor attached | not run | none |
| M4 | I2C1 SDA rise time with the real probe | GND | scope, 10x probe, 100 kHz and 400 kHz | slower than 300 ns at 10 k if Cb > 35 pF | clock choice | not run | none |
| M5 | SERVO_V with SERVO_EN undriven | GND | DMM | 0 V (R3 pulls the gate to +5V) | safe state at reset | not run | none |
| M6 | ST20 against a reference thermometer through a speech and motion cycle | n/a | calibrated probe at the same location | warm bias of a few degrees C | whether 0.3 C can be claimed at all | not run | none |

First power gate for the rev C board with the sensor removed (M3 first), then servos disabled, then one servo with a current-limited supply. State-changing steps follow product-model/PHYSICAL-PREFLIGHT.md.
