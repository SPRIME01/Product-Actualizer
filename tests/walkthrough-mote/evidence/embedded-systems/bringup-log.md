# Bring-up log: embedded-systems (planned stages; nothing run on the unit this pass)

| stage | evidence required | status |
|---|---|---|
| exact target identity | board silkscreen letter, SoC, module, OS image | done for identity (owner confirmed REV C 2026-10-01); OS image from owner transcription |
| power / boot | boot log of the neck MCU and the Pi captured before any change | not captured (REV C board never flashed; no log supplied) |
| observability | USB or UART console on the neck board; serial console on the Pi | console exists in firmware (print on scan); no REV C capture |
| minimal known output | one known output, servos disabled | not run |
| one bus | I2C1 idle levels, then scan | blocked by M3 over-voltage finding; see electronics |
| peripheral identity | read 0xC0 == 0xEE on the VT-53, ST20 serial command | not run |
| raw behavior | raw ToF and ST20 values before conversion | not run |
| calibration | VT-53 offset at 100 mm; ST20 against a reference | not run |
| application behavior | speech, camera, head motion | not run |
| restart / power-cycle | reboot with the service enabled; cold power-cycle | failed in the owner's capture (boot-journal.txt) |

Recovery: the REV C export shows SWD on J5 and SWD_RESET on J2.6; BOOTSEL access and a known-good image are not documented (U9). No flashing plan is made until they are.
Secrets: the key is read from an environment variable (config.py:6); no credential appears in source or captures (grep found none).
