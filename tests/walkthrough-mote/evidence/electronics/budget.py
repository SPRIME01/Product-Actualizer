#!/usr/bin/env python3
"""+5V rail budget by state for Mote REV C. Every input is cited. The output is a calculation, not a measurement."""
SUPPLY_A = 2.5  # adapter label, tests/fixture-mote/unit/inspection.txt:6

PI_TYP, PI_PEAK = 0.60, 0.90   # hardware-guide-revC.md:16 (typical); docs/notes.md:6 (one USB-meter run)
CAMERA = 0.25                  # hardware-guide-revC.md:17
AMP_SPEECH, AMP_FULL = 0.30, 0.56  # hardware-guide-revC.md:18; amp-ca3105.md:12 (full output, 4 ohm, 5 V)
LOGIC = 0.05                   # hardware-guide-revC.md:19 (neck board and sensors)
SERVO_IDLE = 0.008             # servo-ts9.md:8 (each, typical)
SERVO_LOADED = 0.250           # servo-ts9.md:10 (each, typical, rated load)
SERVO_START = 0.500            # servo-ts9.md:12 (each, first 20 ms of a move)
SERVO_STALL, SERVO_STALL_MAX = 0.650, 0.800  # servo-ts9.md:11 (each, 5.0 V)

STATES = [
    ("guide as published (servos idle, typical)", PI_TYP + CAMERA + AMP_SPEECH + LOGIC + 0.02),
    ("speech + both servos moving, loaded", PI_PEAK + CAMERA + AMP_SPEECH + LOGIC + 2 * SERVO_LOADED),
    ("full-output speech + both servos moving, loaded", PI_PEAK + CAMERA + AMP_FULL + LOGIC + 2 * SERVO_LOADED),
    ("full-output speech + both servos start (20 ms)", PI_PEAK + CAMERA + AMP_FULL + LOGIC + 2 * SERVO_START),
    ("full-output speech + both servos stalled (typ)", PI_PEAK + CAMERA + AMP_FULL + LOGIC + 2 * SERVO_STALL),
    ("full-output speech + both servos stalled (max)", PI_PEAK + CAMERA + AMP_FULL + LOGIC + 2 * SERVO_STALL_MAX),
]

print(f"| state | load A | supply {SUPPLY_A} A | margin A | verdict |")
print("|---|---|---|---|---|")
for name, load in STATES:
    pct = 100 * load / SUPPLY_A
    verdict = "EXCEEDS supply" if load > SUPPLY_A else ("thin (80 % or more)" if pct >= 80 else "ok")
    print(f"| {name} | {load:.2f} | {pct:.0f} % | {SUPPLY_A - load:+.2f} | {verdict} |")
