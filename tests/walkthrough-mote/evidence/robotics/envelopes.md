# Sensor and actuator envelopes (robotics)

| device | valid range | blind spots / failure conditions | self-interference | health signal | calibration | evidence |
|---|---|---|---|---|---|---|
| VT-53 | 30-1200 mm on a 17 % grey target (guaranteed) | other targets, glossy or dark desk surfaces, angle: unmeasured | servo and amplifier noise on a shared 5 V rail: unknown | none in firmware (no timeout, no status) | offset 0, never calibrated | tof-vt53.md:10-14; notes.md:7 |
| ST20 | 5-60 C, 20-80 %RH within stated accuracy | warm bias near the amplifier and Pi | amplifier heat reported by the owner | none | none | thp-st20.md:7-8; notes.md:7 |
| camera O-2 | unknown | exposure settling, lighting, focus: unmeasured | none known | none | no intrinsics | camera-o2.md |
| microphone HM1100 | SNR 65 dB typ | pickup range ("across the room") unmeasured; speaker self-hearing unmeasured | the speaker 20 mm away in the same head: unknown | none | none | mic-hm1100.md:9-10; old-product-page.md:5 |
| pan servo | +/-70 deg by bracket stops | commands beyond the stops stall the servo | start and stall current collapse the shared rail | no feedback | zero and travel not measured | cad-neck-revC.json:8; servo-ts9.md |
| tilt servo | -25..+35 deg by bracket stops | same | same | no feedback | same | same |

Commanded-versus-actual table: empty (no motion has been observed). Sentinel handling for the ToF: none written. Every envelope above is a document value or an unknown; none is measured on the unit.
