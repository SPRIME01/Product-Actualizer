# Loop graph (robotics)

| node | kind | rate and latency | frame and units | consumer | evidence |
|---|---|---|---|---|---|
| camera (O-2) | sensor | unknown, unmeasured | image px; no intrinsics recorded | host snapshot only (camera.py) | camera.py:5-8 |
| microphone (HM1100) | sensor | audio 4 s capture windows | PCM 16 kHz (host command) | cloud STT | voice.py:7-10 |
| VT-53 ToF | sensor | on request over UART (DIST), unmeasured | mm, offset 0 uncalibrated | none (no consumer in host code) | main.py:29-30; tof.py:2 |
| ST20 | sensor | on request (CLIMATE) | C and %RH, no compensation | none | main.py:31-33; thp.py:7 |
| state estimation | none | none | none | none | no module |
| decision | voice loop only | blocking: listen 4 s, upload, print | text | print | __main__.py:11-14 |
| face tracking | decision | not implemented | none | none | track.py:4-6 |
| neck control | actuation | host commands PAN/TILT/SWEEP; firmware 20 ms sweep step | degrees, commanded; no feedback | 2 hobby servos | neck.py; main.py:23-39 |
| servo supply | actuation | Q1 on SERVO_EN (GP14), never driven by REV B firmware | | | schematic-revC.txt:10,27 |

The loop cannot be drawn end to end: nothing converts an observation into a neck command (no perception, no estimator, no tracking), and the only actuation path is open-loop with no position feedback in the BOM or schematic.
