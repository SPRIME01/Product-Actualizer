# MCU-class targets: identity, boot, flash, recovery, bring-up

Load for Arduino-class, ESP32, RP2040/RP2350, STM32, nRF, and comparable microcontroller targets. Family knowledge below is a set of prompts to look the exact
thing up; the matching SoC, module, and board documents decide. Do not carry a rule from one family or revision to another.

## Identify before acting

| Question | Strong evidence | Does not prove |
|---|---|---|
| Which board? | silkscreen and revision text, schematic, USB VID/PID and product string | a marketing name can span revisions and variants |
| Which SoC and module? | module shield marking, BOM and schematic, the vendor tool's chip-ID after a successful handshake | a serial device name alone |
| Memory sizes? | module documents plus the tool's flash/PSRAM query or build metadata | configured size is not measured size |
| Which port? | a disconnect/reconnect diff, a stable `/dev/serial/by-id` path, USB location | the first listed port |
| What firmware runs? | boot log, banner, version endpoint, image metadata | USB strings describe the board |
| Is it recoverable? | the documented download mode, BOOT/RESET access, a known-good image and offsets | OTA existing |

A failed chip-ID handshake means only that the loader did not answer: wrong port, charge-only cable, permissions, port already open, not in download mode, native-USB state,
weak power, or another chip. It is never a reason to erase.

## Pin and peripheral gate (answer per pin, per board)

1. Exposed on this board and unused by flash, PSRAM, camera, display, SD, USB, antenna switch, Ethernet, or an onboard sensor.
2. Direction and function available on this pin (input-only pins, analog channels, touch, wake sources, peripheral routing matrix limits).
3. Strap or boot role at reset (a level on this pin selects boot mode, flash voltage, or log level); the external network preserves it.
4. No clash with the console UART, USB serial/JTAG, debug, or recovery path.
5. Shared resources: some analog channels are unavailable while the radio is active; DMA needs memory in a DMA-capable region, alignment, and has a maximum transfer length;
   timers and PWM channels share clocks; low-power wake works on a subset of pins.
6. The level while floating at reset is safe for what is attached (see `electronics`).
7. Pull resistors in the firmware, on the module, and externally do not fight.

Examples of why this is a lookup and not a table: on one classic family, the level on a boot-strap pin at reset selects the flash supply voltage; on another, only a subset of pins can wake deep sleep. Both facts are from that family's documents.

## Observability and boot

- Capture the first complete boot log after power-on before changing anything: reset reason, boot mode, image and partition selected, panic, backtrace. A backtrace decodes only against the ELF of the running build; keep ELF, map, configuration, commit, and toolchain version for any image that ships.
- Serial monitors may toggle DTR/RTS and reset the target; use the tool's no-reset mode to observe a running state. USB CDC consoles can vanish and re-enumerate across a reset or upload; wait with a timeout.
- Debug access (SWD or JTAG, trace, RTT) is part of observability and of recovery; know which pins carry it on this board, whether the production unit exposes it, and whether a lock or fuse disables it. A debugger changes timing: reproduce without it before concluding a race is fixed.
- Brownout, watchdog, stack overflow, heap failure, and panic are different faults. Brownout points at supply (see `electronics`); a watchdog points at a blocked task or interrupt, so extending its timeout is not a fix; a crash only with a peripheral attached points at power, a pin clash, a bus lock, or an interrupt storm.

## Flash and recovery ladder (least destructive first)

1. Close port owners; capture logs with no-reset.
2. Reset or power-cycle by the documented board path (button timing is board-specific; use the board guide).
3. Enter the documented ROM download, bootloader, DFU, or mass-storage mode.
4. Query chip and flash identity.
5. Reflash the known-good build using toolchain-generated offsets and image metadata; never guess an offset.
6. Reflash bootloader, partition table, and application together when the framework requires it.
7. Erase only the specific corrupt data partition, when supported and authorized.
8. Full-chip erase only after recording partition layout, identity (MAC/serial), security state, and the effect on calibration, credentials, and user data, and with authorization.
9. Hardware debugger or board repair.

Try a lower baud rate only after port, cable, and power are ruled out. After two genuinely different approaches fail at one layer, stop and report: board and evidence, wiring and power state, tool versions, complete errors, what each attempt proved, and the next action with its risk.

## Frameworks and toolchains

Choose the smallest supported control plane that meets the constraint: the vendor SDK for full feature, update, and security access; an Arduino-style core for library ecosystem; a managed-language runtime for interactive work on constrained hardware; a declarative framework for a device built from catalog components; an RTOS with devicetree when portability or upstream drivers matter.
Do not migrate a working project because another framework exists; the move changes drivers, timing, partitions, networking, and recovery. Pin versions of core, libraries, and toolchain; a build that is not reproducible cannot be bisected. Generated artifacts (partition tables, offsets) are read from the tool's output.

## Security and lifecycle

Secure boot, flash encryption, fuses, debug-port locks, signing keys, and anti-rollback are decisions with a lifecycle: development, manufacturing, return, field update, and decommission paths are defined first, the scheme is the one the exact chip revision supports, keys live outside source and logs, and the whole path is proven on disposable hardware. Do not copy fuse commands from a guide; read the chip's own summary of writable fields. A development-mode posture must not ship by accident.

## Power and sleep

Budget by state with measurements at the product boundary (see `electronics`); wake sources are pin- and family-specific; reinitialize peripherals deliberately after wake and read the wake cause. Board-level sleep current (bridge chip, regulator, LED, camera and microphone rails) usually dominates the SoC's figure; a quoted microamp figure may be the bare chip.

## Staged bring-up record

`target identity | power and boot | observability | minimal known output | one bus or interface | peripheral identity | raw behavior | calibration | application behavior | reset and power-cycle`.
Each column: the observation and where it is stored, or the stage that failed. Change one thing at a time between stages; add the real load last.
