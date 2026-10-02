built_from: model@5
reads: [claims]
cites: [C11, C23, C36, C56, C64, C65, C66, C67, C68, C69, C70, C76, C78]
public: false

# Mote bring-up plan (embedded-systems)

Target: Raspberry Pi Zero 2 W Rev 1.0 [C23] and the RP2040 on a REV C neck board [C76]. The firmware in the repository is a REV B build [C11] that has never run on this board [C36].

## Contract findings

| item | finding | basis |
|---|---|---|
| pin map | the pin script finds PAN on I2C1 SDA, TILT on I2C1 SCL, the sensor bus unconnected, and SERVO_EN never driven [C64] | v (static) |
| consequence | on a REV C board no servo signal, no servo supply, no sensor [C65] | c |
| sensor identity | ACKs came from a REV B board and no identity register was ever read [C69] | o |
| audio output | the amplifier enable is driven by nothing, so playback can succeed in silence [C66][C67] | o, c |
| boot service | fails at boot for a missing key and weak ordering; works from a shell [C68] | c |
| camera | legacy stack code and README steps on a libcamera-only module [C56] | o |
| persistence | calibration constants are source literals [C70] | o |
| microphone | host and README describe the PDM part; the unit has the I2S HM1100 [C78] | v, o |

## Staged plan (nothing run on the unit)

1. Identity: REV C and the board's recovery entry (U9) before any flash. Observable: the owner's photo of the boot pin, a known-good image.
2. Boot and console: capture the Pi boot log and the neck console before changing anything.
3. Minimal output with servos disabled: flash a REV C pin-map build that drives only SERVO_EN high and prints its version.
4. One bus: idle levels on I2C1 with the VT-53 module removed (electronics M3), then the ST20 alone, then identity registers (0xC0 == 0xEE on the VT-53).
5. Raw sensor values, then calibration (VT-53 offset at 100 mm; ST20 against a reference).
6. Audio: drive the amplifier enable, play a tone, and have a named person confirm they heard it; capture the microphone and inspect level and rate.
7. Camera: capture one frame with the libcamera tools and inspect it.
8. Service: fix environment and ordering, reboot, check from a fresh session; cold power-cycle.
