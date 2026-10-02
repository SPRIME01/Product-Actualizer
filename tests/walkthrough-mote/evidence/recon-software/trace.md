# recon-software: capability trace (evidence, not a derived artifact)

Analyzed: `tests/fixture-mote/host/` (Python, runs on the Pi) and `tests/fixture-mote/firmware/neck/` (MicroPython for the RP2040); not a git repository, no commit to pin.
Not read: the SD card image, the Pi boot configuration, ALSA/PipeWire configuration beyond `host/config/asound.conf`, any recorded audio.

| capability | declared | implemented | reachable | executed |
|---|---|---|---|---|
| Move pan/tilt on command | README.md:18 | host/mote/neck.py:20-24; firmware/neck/main.py:23-26 | host: only via `Neck`; `__main__` calls sweep only | host framing test: 3 passed; firmware: n/a (compiled, not run) |
| Continuous sweep | none | neck.py:26-28; main.py:27-28,34-39 | `__main__.py:9` at startup | n/a |
| Hear and transcribe | README.md:12,23 | voice.py:7-18 | `__main__.py:11-13` | n/a (needs network, key, microphone) |
| Speak | none declared | voice.py:21-23 | not called from `__main__` | n/a |
| Camera snapshot | README.md:8-10 | camera.py:5-8 (legacy picamera) | not called from `__main__` | n/a (import fails on a libcamera-only OS) |
| Face tracking | README.md:26; brief | track.py:4-6 raises NotImplementedError | none | n/a |
| Distance | README.md:16 | tof.py:11-13; main.py:29-30 | firmware command DIST; no host caller | n/a |
| Temperature and humidity | README.md:17,26 | thp.py:4-9; main.py:31-33 | firmware command CLIMATE; no host caller | n/a |
| Pick-up detection | none | imu.py:5-7 | no caller | n/a |

Stub sweep: 1 hit, track.py:5-6 (stub). `imu.py` reads an IMU no hardware file mentions. Clean-checkout test: `python3 -m unittest discover -s tests -t .` in `host/`, exit 0, 3 tests.
Secret scan: no credential-shaped strings; the key is read from MOTE_STT_KEY. Dependencies: pyserial, requests, picamera (legacy), none pinned; no requirements file.
Firmware has no watchdog, heartbeat, or timeout (grep, no matches). Build log: 5 files compiled, no target tests.
Not run: anything needing hardware, network, or credentials. Behavior claims graded from reading are `OBSERVED` for structure only.
