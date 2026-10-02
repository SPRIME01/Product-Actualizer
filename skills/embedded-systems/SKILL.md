---
name: embedded-systems
description: Judge the hardware/software boundary of a product that runs firmware or an embedded OS, on MCU-class targets (Arduino, ESP32, RP2040/RP2350, STM32, nRF) and Linux SBC targets (Raspberry Pi and similar) from exact target identity, boot, flashing and recovery to pin routing, drivers, firmware/hardware contracts, services, provisioning, persistent configuration, updates, and device diagnostics. Use when the product has a microcontroller or SBC; not for passive objects, pure circuits, or cloud-only software.
reads: [capabilities, constraints, form, claims, unknowns, decisions]
needs: [electronics]
executes_with: [esp32-development, xiao-assistant]
---
# Embedded systems

## Reads from the model
`form` (the controllers, modules, and links), `constraints` (rails, boot and recovery requirements, required revisions), `capabilities` and `claims` (what the device must do), `unknowns`, `decisions`. Target identity, pin maps of record, and documented limits come from `evidence/recon-physical/hardware/`; electrical judgments from `electronics`. Read `product-model/PHYSICAL-PREFLIGHT.md` before flashing, driving, or reconfiguring a unit. Load on demand: `references/mcu-bringup.md` (MCU-class targets), `references/linux-sbc.md` (embedded Linux), `references/device-integration.md` (peripherals, links, provisioning, persistence, updates). Exact device information is acquired from authoritative sources for the actual board, never recalled.

## Distinctions
- **Ownership.** Owns the boundary where firmware or an embedded OS meets the hardware: whether the software's assumptions about the board are true, and whether the device can be booted, observed, recovered, and updated. `electronics` owns the circuit; `robotics` owns closed-loop behavior; `recon-software` describes the code. Execution (build, flash, monitor) is delegated to the project's own toolchain and installed capabilities; do not reproduce their command catalogs.
- **Target identity has layers.** SoC family and revision, module, board or carrier, accessories, board revision, and the OS image or firmware framework version. `ESP32`, `Pi`, and `STM32` are family labels; a pin map, boot behavior, or peripheral list from one variant or revision is not a fact about another. The target string in the toolchain, the firmware build, and the silkscreen must agree.
- **SoC numbers are not board numbers.** Sleep current, available pins, flash size, and clocks of the bare chip differ from the board with its bridge, regulator, LED, camera, or microphone. Use the board's documents for the board.
- **The firmware/hardware contract is a table.** Pin map, rail and level assumptions, bus addresses, boot and reset state, timing, and device identity, each with its source in the matching-revision schematic. Constants in firmware are claims under test, not evidence; disagreement with the schematic is a contradiction recorded against both.
- **Pin gate.** For every used pin: exposed on this board, not consumed by flash, memory, camera, display, USB, or an onboard peripheral; capability matches (input-only, analog, wake, peripheral routing); not a strap or boot pin unless the external network preserves the level; no conflict with the log console, USB, debug, or recovery path; no radio-versus-ADC or shared-peripheral conflict; and a safe level while floating at reset. Stacked accessories share pins with their own parts.
- **Observability comes first.** Before anything else the device must show a boot log, a console, or equivalent. Opening a serial port can toggle reset lines; use the no-reset option when the running state matters. Use stable device paths, one owner per port or camera, and note that USB re-enumeration after a flash can drop the port.
- **Recovery is established before the first flash.** The documented download, bootloader, or mass-storage mode; the known-good image and offsets produced by the toolchain (never guessed); the board's reset and boot access; and a backup of anything readable that matters. Erase is the last rung and needs authorization. OTA is not a substitute for a wired recovery path.
- **Irreversible state is its own class.** Secure boot, flash encryption, fuses, lock bits, and anti-rollback are lifecycle decisions, proven on disposable hardware with update and RMA paths before they touch a product unit; follow `PHYSICAL-PREFLIGHT.md` (irreversible).
- **Compiled is not working.** A build is evidence that firmware compiled; a flash is evidence that bytes were written; a boot log is evidence the image started. Device function is observed at the hardware boundary, after reset and power-cycle. A static gate (lint, pin-conflict check) catches a different class of defect than a run.
- **Drivers follow the document.** Initialization sequences, delays, clock modes, and register values cite the device document; a delay or constant with no source is a guess. Read the identity register before trusting data, take raw values before conversion, poll before enabling interrupts, and respect memory placement and transfer limits for DMA.
- **Linux SBC is a different failure class.** Device enumeration (device tree, overlays, firmware config), kernel driver versus userspace, permissions and groups, stable names by udev rule, one process per camera or audio device, GPIO claimed by a dead process, services started at boot with the right ordering and environment, storage wear and sudden power loss, undervoltage and thermal throttling, and the difference between "works when I run it by hand" and "works after reboot".
- **Links between boards are protocols.** Roles, framing, addresses, versioning, timeouts, heartbeat, behavior when the peer is absent or resetting, and reset coupling are specified and tested with both ends real; each board instance has its own configuration.
- **Network and provisioning.** Credentials never in source or public output; a local setup mode and a recovery path; bounded retry with backoff; state transitions logged with reasons; time, DNS, and TLS prerequisites checked in order; wrong credentials, AP loss, DHCP failure, and weak signal are tested.
- **Persistent configuration and calibration.** Where each value lives, how it survives update, reset, and factory reset, wear and atomic writes, the schema version, and the provenance of each calibration constant (per unit, with units and date).
- **Updates are a system.** Artifact identity and compatibility, authentication, partition layout, a known-good image, a health criterion before confirming, rollback, data migration, and interrupted-update behavior, each exercised on a disposable unit.
- **Concurrency and liveness.** Interrupt and task priorities, stack and heap budgets, blocking calls in the main loop (a motion loop that sleeps starves command handling), and a watchdog fed from the path that proves the system is doing its job, not from a timer interrupt that keeps feeding while the application is hung. Reset reason is logged at every boot.
- **Safe state at boot, crash, and update.** Outputs take a defined level during reset, bootloader, panic, watchdog reset, and firmware update, agreed with `electronics` and enforced where possible in hardware.
- **Staged bring-up.** Exact target identity, power and boot, observability, a minimal known output, one interface or bus, peripheral identity, raw behavior, calibration, application behavior, restart and power-cycle verification; each stage's evidence is recorded before the next begins.

## Failure modes
- **Compile-as-done** — completion claimed after build or flash. *Recognize:* no boot log, readback, or physical observation recorded.
- **Sibling pin map** — a pin table from another variant or revision applied. *Recognize:* the source names a different board, chip variant, or revision.
- **Strapped away** — a peripheral on a boot or strap pin makes the unit unbootable with it attached. *Recognize:* boots on the bench bare and fails assembled.
- **Console reset** — opening the monitor restarts the device and hides the bug. *Recognize:* the fault vanishes when a no-reset monitor is used.
- **Erase first** — flash erased as a generic fix, losing calibration, identity, or credentials. *Recognize:* no backup or partition record before the erase.
- **Hand-run pass** — works from a shell, fails as a boot service. *Recognize:* never tested through a restart; environment loaded from a user profile; a missing ordering on a device or network.
- **Phantom peripheral** — a driver for a part that is absent or unpowered. *Recognize:* ACK-less init that is swallowed, or a stub returning constants.
- **Unrecoverable update** — OTA with no rollback or serial recovery proven. *Recognize:* no interrupted-update test, no recovery rung named.
- **Stale deprecation** — setup text for a retired SDK, flag, or image. *Recognize:* instructions that fail on the pinned toolchain or current OS image.
- **Config amnesia** — settings or calibration lost on update or reboot. *Recognize:* values in RAM or default arrays with no persistent store.
- **Unobserved audio or video** — success inferred from exit codes. *Recognize:* no captured frame, signal, or human confirmation.

## Check
1. Identity table: SoC, module, board, revision, framework or OS image, and toolchain target each sourced and mutually consistent; any mismatch is a contradiction naming both.
2. Contract table: every pin, address, and rail assumption in firmware is matched to the matching-revision schematic, with the pin-gate questions answered; unmatched constants are findings.
3. Boot, recovery, and observability: the boot log has been captured (or is a named gap), the recovery entry has been identified, and the known-good image and its source are recorded before any flash plan.
4. Device-level evidence for each peripheral, in order: identity or readback, raw output, then calibrated value, each from the unit; the first failing stage is named.
5. Restart evidence: behavior after reset, after power-cycle (and after a cold start for a service), and after an interrupted update where updates exist; "starts at boot" is shown by an actual restart.
6. Persistence: each configuration and calibration value is located, shown to survive reboot, and shown not to be overwritten by update.
7. Secrets scan of source, logs, and public artifacts for credentials and tokens; none present.
8. For each hardware-dependent claim: whether it is compile-only, flashed, booted, or observed on the unit, with the observation.

## Writes to proposals
- `constraints`: boot, recovery, toolchain, OS image, update, and timing requirements; required hardware revisions; permissions and services the device needs; each sourced.
- `claims`: device behavior graded by where it was seen (`INFERRED` for static analysis, `OBSERVED` for a captured boot or readback, `VERIFIED` for an expected-value check after restart); `CONTRADICTED` where firmware disagrees with schematic or docs.
- `unknowns`: unread revisions, absent recovery path, unobserved restart behavior, uncaptured boot log, uncalibrated sensors.
- `decisions`: framework or OS choice, recovery and update policy, accepted risks.
- `form`: links between boards, as `change`s when the contract table finds a missing or wrong one.
- Artifact `artifacts/embedded-systems/bringup.md` (target, contract table, staged plan with the observation for each stage; stamped); evidence under `evidence/embedded-systems/` (`contract.md`, `bringup-log.md`, `actions.md`).
