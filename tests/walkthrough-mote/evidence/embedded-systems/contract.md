# Firmware / hardware contract (embedded-systems)

Target identity: host Raspberry Pi Zero 2 W Rev 1.0, Debian 12, kernel 6.6 (owner transcription); neck MCU RP2040 on MOTE-NECK REV C (owner confirmation 2026-10-01);
firmware labelled REV B (config.py:1), compiled with mpy-cross (ci-build.log), never flashed to the REV C board (notes.md:9; owner-notes.txt:5).

| item | firmware or host value (file:line) | schematic or document value (source, revision) | match | evidence on unit | grade |
|---|---|---|---|---|---|
| pan signal pin | PAN_PIN = GP10 (config.py:2) | PAN_PWM on GP12 (schematic REV C :28) | no | none | contradiction; GP10 is I2C1_SDA in REV C |
| tilt signal pin | TILT_PIN = GP11 (config.py:3) | TILT_PWM on GP13 (:29) | no | none | contradiction; GP11 is I2C1_SCL |
| sensor bus | I2C0 SDA GP4, SCL GP5 (config.py:4-6) | I2C1 on GP10/GP11 (:30-31) | no | none | GP4/GP5 not connected in REV C |
| servo supply enable | never driven | SERVO_EN on GP14, gate pulled up, off at reset (:10,27) | no | none | the servos stay unpowered on REV C with this firmware |
| UART | GP0 TX, GP1 RX, 115200 (config.py:8-9; main.py:13) | GP0 TX, GP1 RX (:32-33); host /dev/ttyAMA0 115200 (config.py:4-5) | yes | none | match on paper |
| VT-53 address | 0x29 (tof.py:1) | 0x29 default (tof-vt53.md:13); README says 0x52 | yes (firmware); README wrong | ACK only on a REV B board (neck-boot.log:5) | identity register never read |
| ST20 address | 0x44 (thp.py:1) | 0x44 with ADDR low (schematic :8,38) | yes | ACK only on a REV B board (neck-boot.log:6) | no identity read |
| I2C clock | 400 kHz (main.py:12) | module pull-up 10 k to +5V (tof-vt53.md:18) | marginal | none | rise time unmeasured (bus-budget.md) |
| microphone format | capture device mote_pdm, PDM (config.py:8; asound.conf:1; README.md:12) | HM1100 is I2S (mic-hm1100.md:13); unit confirmed HM1100 | no | none | host configuration describes the PDM part |
| amplifier enable | GPIO17 appears only as a constant (config.py:10); nothing drives it | CA3105 SD low = off; undriven pin leaves it off (amp-ca3105.md:14); guide: SD on GPIO17 | no | none | playback can report success in silence |
| camera stack | legacy picamera (camera.py:2); README raspi-config legacy (README.md:8-10) | O-2 supported by libcamera only (camera-o2.md:4-5); Debian 12 | no | none | deprecated instructions remain |
| service start | After=network.target; no environment (mote.service:3) | needs MOTE_STT_KEY (config.py:6), network, and sound devices | no | boot-journal.txt:3-10 shows KeyError and start-limit-hit | fails at boot, works from a shell |
| persisted calibration | OFFSET_MM = 0 literal (tof.py:2) | datasheet: offset calibration required (tof-vt53.md:14) | no | none | no store, no per-unit value |
| bounded motion | SWEEP persists until SWEEP 0 (main.py:27-28,34-39); no timeout | none documented | no | none | see robotics |

Executed check: `python3 tests/walkthrough-mote/evidence/embedded-systems/pincheck.py` (static, two files) exits 1 and lists the pan, tilt, bus, and SERVO_EN findings above.
