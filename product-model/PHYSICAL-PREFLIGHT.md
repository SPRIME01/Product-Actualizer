# Physical action preflight

Read by every lens that touches a real unit (`recon-physical`, `electronics`, `embedded-systems`, `robotics`, `release-readiness`). The
discipline is proportionate: it exists so that a state change on real hardware is intended, bounded, observed, and recoverable, not
to slow down looking.

## Classes

| Class | Examples | Requirement |
|---|---|---|
| **Read-only discovery** | read files, logs, schematics; list devices; passive measurement with the correct meter mode and probe rating; capture an existing boot log | none, but see the next rule |
| **Reversible, low energy** | blink an indicator; toggle a non-persistent setting; play a quiet test tone; capture a frame | one line in the action log: target, action, observation |
| **State-changing** | applying power or first power after assembly; rewiring or hot-plugging; flashing, erasing, OTA, partition or eFuse changes; any actuator, motor, servo, relay, or robot motion; persistent or destructive configuration; stored-energy, battery, mains, or thermal risk | full preflight below, and the owner has confirmed target, scope, and rollback for this run (or durably authorized the class) |
| **Irreversible** | eFuse burns, secure boot / flash encryption, production lock bits, destructive calibration overwrite | full preflight plus explicit per-action confirmation, even in an authorized run |

**Discovery that mutates is an action.** A bus scan can write, opening a serial port can toggle DTR/RTS and reset the target, probing can
brown a rail, listing an audio device can wake an amplifier, and cleanup commands can kill the wrong process. Classify by effect, not by verb.

## Preflight record

One block per state-changing action, appended to `evidence/<lens>/actions.md` before acting and completed after:

```text
target            exact unit / port / address / rail (identity from the hardware package, not "the board")
current state     read before acting: rail voltages, firmware identity, actuator position, mode, what is connected
expected result   the value or behavior that would mean success, and the one that would mean stop
known bounds      limits from the package: voltage, current, travel, speed, temperature, duration
action            the exact command or operation
bounded completion  how it ends on its own: duration, step count, current limit, timeout, travel limit (set on the device, see below)
observation       what instrument or human will observe the actual result, and when
recovery          the path back to a known state and the person/tool that owns it
result            what was observed, compared with the expectation; grade (OBSERVED, or VERIFIED if the check could have failed)
```

## Rules

- **Bound the action locally.** Never rely on the agent, the network, or the session staying alive to send a later stop. The duration, step
  limit, or current limit travels with the command and is enforced on the device or in the same process that actuates. Signals do not run
  cleanup (a terminated process skips its `finally`), so a safe end state is a property of the device, not of a handler.
- **Observe, small action, observe.** Estimate, command one small bounded step, stop, observe the actual result, update. Long blind sequences
  are open-loop; they are allowed only after the small steps have shown the behavior is predictable.
- **Commanded is not actual.** The expected result is compared with an independent observation, never with the command's exit code.
- **Stop on surprise.** An unexpected reading, smell, heat, noise, reset, or current stops the sequence. One retry needs a new hypothesis;
  three non-converging passes end with a report of what each proved and which artifact or measurement is missing.
- **Restore a known state.** Leave actuators stopped and centered or bounded, outputs in their safe level, test processes ended, buses and
  GPIO released, temporary wiring and jumpers removed or recorded, and the unit in the control state the next step assumes. Record the end state.
- **What the agent cannot observe, a named human does.** Sound, motion feel, heat, smell, and "it looks right" are recorded with who observed
  them and when; without that they are unverified.
- **Verify de-energized before touching.** Stored energy (capacitors, batteries, springs, raised loads) and a second supply can keep a circuit live after the main source is removed; confirm with the meter, not with the switch position, and discharge or block first.
- **Read the current state, do not assume it.** A prior session's profile, pin map, or position is a hypothesis for this run.
