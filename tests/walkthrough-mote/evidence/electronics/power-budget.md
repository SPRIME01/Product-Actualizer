# Power budget, +5V rail (calculated; basis: calculated, not measured)

Method: `python3 tests/walkthrough-mote/evidence/electronics/budget.py` (inputs cited in the script). Source capability is the adapter label,
2.5 A; cable drop, connector drop, and behavior above the rating are not documented (unknown U8), so the real capability is at most this.
The hardware guide's 1.22 A omits servo motion; the servo datasheet gives 250 mA loaded, 500 mA start-up, and 650 mA stall per servo at 5 V.

| state | load A | supply 2.5 A | margin A | verdict |
|---|---|---|---|---|
| guide as published (servos idle, typical) | 1.22 | 49 % | +1.28 | ok |
| speech + both servos moving, loaded | 2.00 | 80 % | +0.50 | thin (80 % or more) |
| full-output speech + both servos moving, loaded | 2.26 | 90 % | +0.24 | thin (80 % or more) |
| full-output speech + both servos start (20 ms) | 2.76 | 110 % | -0.26 | EXCEEDS supply |
| full-output speech + both servos stalled (typ) | 3.06 | 122 % | -0.56 | EXCEEDS supply |
| full-output speech + both servos stalled (max) | 3.36 | 134 % | -0.86 | EXCEEDS supply |

Controlling corner: servo start-up or stall during full-output speech with Pi, camera, and Wi-Fi active. Margin there is negative, which matches
the owner's report of resets when pan and tilt move while speaking (owner-notes.txt:3, reported). F1 holds 2.5 A and trips at 5 A, so it does not
act before the adapter reaches its limit: the failure mode is a collapsing rail (brownout), not a fuse trip.
Independent re-derivation of the controlling row: 0.90 + 0.25 + 0.56 + 0.05 + 2 x 0.65 = 3.06 A.
Open: decoupling and bulk capacitance (U7), adapter behavior above 2.5 A and cable drop (U8). Measurement plan: measurements.md M1-M2.
