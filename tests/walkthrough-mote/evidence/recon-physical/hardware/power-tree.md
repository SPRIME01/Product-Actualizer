# Power tree (documented, REV C)

```text
wall adapter 5 V 2.5 A (label) -> J1 USB-C -> F1 (2.5 A hold / 5 A trip) -> +5V
  +5V -> J2.1 (host link; the Pi's own supply path is not documented)
  +5V -> U2 ALD-3V3 (500 mA) -> +3V3 -> U1 RP2040, U4 ST20
  +5V -> J6.1 VT-53 module VIN (module regulator 2.8 V; module pulls SDA/SCL to VIN)
  +5V -> Q1 source -> SERVO_V -> J3, J4 (pan, tilt servos); Q1 gate pulled to +5V by R3 (off at reset); GP14 low = on
  +5V -> amplifier VDD and speaker (per hardware guide; wiring not in the neck-board export)
```

Documented loads (+5V): Pi 0.60 A, camera 0.25 A, amp 0.30 A (speech), neck board and sensors 0.05 A, servos 0.02 A idle (hardware-guide-revC.md:14-21).
Observed value in project notes: Pi peak 0.9 A on a USB meter, one run (docs/notes.md:6).
Not documented: capacitors on +5V and SERVO_V; cable and connector drop; adapter behavior above its rating.
