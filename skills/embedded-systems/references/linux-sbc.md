# Embedded Linux / SBC targets

Load for Raspberry Pi and comparable boards running a general-purpose Linux. Distribution, kernel, firmware/boot configuration, and board revision all change behavior; record the exact OS image, kernel
version, and board model from the unit (`/proc/device-tree/model`, release files, boot configuration), and read the vendor documentation for that combination. Old tutorials describe retired stacks.

## Identity and baseline

Record: board model and revision, SoC, RAM, OS image and version, kernel, bootloader and firmware configuration file in use, boot media, installed hat/accessory EEPROM IDs, and power supply. A model number covers boards with different peripherals and different default overlays.
First read-only checks: boot log, `dmesg` for undervoltage, throttling, and driver binding; device-tree overlays loaded; the devices that actually enumerated.

## Enumeration: a device exists only when the stack says so

- Hardware present is not hardware enabled: buses, camera interfaces, audio codecs, and hats are enabled by boot configuration and overlays. Enumerate through the kernel (`/dev`, sysfs, device-tree, bus listings), not through the vendor's marketing text.
- Legacy and current stacks coexist and disagree. A status query from an old interface can report "not detected" for a working camera on the current stack; the truth is the current stack's own device listing and an actual capture.
- A driver binding without a device node, a node without permissions, and a device claimed by another process are three different faults.
- GPIO, I2C, SPI: userspace libraries claim lines exclusively; a killed process can leave a line claimed ("busy") until cleaned up or rebooted. Check which process owns a resource before changing code.

## Audio and camera

- Audio has layers: the codec/HAT driver, the sound server's default sink and source, the user session versus root, sample rate negotiation, and the amplifier enable. Tools can exit 0 while playing to a null or an unplugged route; the only terminal proof of a speaker is a person hearing it, and of a microphone a captured, inspected signal at the expected rate, level, and channel.
  A microphone that captures at a fixed rate regardless of the request needs explicit resampling or playback is slow or fast. Check default devices for both the service user and the interactive user.
- Camera: one process owns the device; find holders before capture; use a time limit on captures (killing a capture mid-frame can wedge a driver until reboot); verify with a real frame whose content and dimensions are inspected, not the tool's exit code.
- Neither works headless the same as at a desk: autologin, session bus, and sound-server user sessions differ between a login shell and a boot service.

## Services, boot, and restart

- A service does not load a user shell profile. Environment, paths, and virtualenvs are explicit in the unit. Ordering is declared (`After=` and `Wants=` on the device, the sound server, and `network-online.target` rather than `network.target`).
- Restart policy has a rate limit; unlimited restart on a missing device floods logs and CPU. A pre-start health check that the device node exists turns a mystery failure into a clear one.
- Stable device names come from udev rules (by serial, port, or ID), not enumeration order; permissions through groups and rule modes, not root. Test by unplugging, replugging, and rebooting.
- "Works by hand, fails at boot" is the default suspect set: environment, ordering, permissions, a device not yet present, a user session that does not exist yet, and time/network not yet available.
- Graceful shutdown: SIGTERM does not run cleanup in every runtime; outputs that must be safe are made safe by the unit's stop step or by hardware.

## Storage, power, and thermal

- SD/eMMC media wear and corrupt on sudden power loss; decide what writes, how often, and whether to use a read-only root, an overlay, or a journaled filesystem; test a power pull during a write on a disposable unit.
- Undervoltage and thermal throttling change timing and drop USB devices; read the kernel's flags, measure the supply under camera, radio, and USB load, and add cooling before blaming software.
- Clock and time: no battery-backed clock means wrong time at boot until synchronized, which breaks certificates and logs; order dependent services after time sync or tolerate it.
- Logs need rotation and a size cap on small media; swap and journal writes wear flash, so decide where volatile data lives.
- A hang is recovered by a hardware watchdog plus a service restart policy; test it by actually hanging a process and by cutting the network, and confirm the unit returns to a working state without a person.

## Provisioning and updates

Headless first boot (network, credentials, user, keys, regional Wi-Fi setting, radio kill-switch state) is a procedure with its own failure modes, including default accounts, open remote-login services, and secrets with loose file permissions; document and exercise it on a clean image, not on the author's configured one. An update path covers package or image replacement, config migration, rollback, and what happens on power loss mid-update.
Use a clean-image install test, from public instructions, as the evidence that setup text is current and the deprecated steps have been removed.

## Evidence shapes for this class

| Claim | Evidence |
|---|---|
| device present | kernel listing plus an actual use (frame, sample, bus transaction) |
| service starts at boot | actual reboot and a post-boot check from a fresh session, with timestamps |
| survives power loss | power pull during activity, then a clean start and integrity check |
| permissions correct | the service user performs the operation, not the interactive user |
| stable naming | replug and reboot with the device in a different port |
