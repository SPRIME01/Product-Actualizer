# Robot bring-up, physical testing, and field lessons

Load when starting up a machine for the first time, planning tests, or diagnosing behavior that differs between desk, simulation, and the floor.

## Bring-up order

1. Hardware identity and electrical acceptance exist (`recon-physical`, `electronics`); firmware boots, is observable, and is recoverable (`embedded-systems`).
2. Immobilize: wheels off the ground, arm unloaded or clamped, props removed, current-limited supply, e-stop within reach, clear space, an observer. Read-only checks first (status, battery, sensor self-test, camera frame, range reading).
3. Actuators one at a time with a bound and an independent observation: direction, polarity, zero, travel, speed range, stop, coast distance. Record the commanded-versus-actual table.
4. Sensors one at a time against references, then the envelope table; calibrate.
5. Close the smallest loop at low speed in a clear space (observe, small action, observe); widen speed and range only as measured behavior supports it.
6. Add decision layers, then autonomy; add failure injection (sensor dropout, link loss, low battery, e-stop).
7. Startup and shutdown by actual restart; then unattended-start behavior.

## Startup and shutdown

Ordered startup with health checks (device present, sensor producing fresh data, controller enabled only after checks); retry limits instead of tight restart loops; stable device names rather than enumeration order; services run as a dedicated user with narrow device permissions; log rotation on small media.
Shutdown handlers command zero velocity and engage holds in the actuating process, and a hardware path still reaches a safe state if the process is killed. Verify with `stop service`, kill, power pull, and network loss, each observed on the machine.

## Test levels and what each can support

| Level | Supports | Does not support |
|---|---|---|
| unit and property tests of pure functions | logic, math, limit enforcement | physical behavior |
| integration with mocks | message flow, error paths | sensor and actuator reality |
| simulation | architecture, regression of control logic | friction, latency, noise, contact, power |
| hardware-in-the-loop, benched | driver, timing, electrical interaction | free motion in the world |
| real machine, controlled space | behavior claims, safe stop, calibration | other environments |
| field | environment-specific claims | anything without logs |

Waiting with sleeps is not a test; assert on events or states with timeouts. Tests include failure cases (dropout, bad data, stall, link loss), are deterministic, and can fail; a test that passes against an empty or mocked input proves only that it ran. Record sensors and commands with timestamps during tests so failures can be replayed.

## Physical acceptance examples

| Claim | Evidence |
|---|---|
| stops safely | command motion, trigger the stop path (e-stop, heartbeat loss, process kill), measure time and distance to stationary, repeat; motors verified stopped afterwards |
| reaches position X | independent measurement of the resulting position over repeated trials, with spread |
| obstacle avoidance | placed obstacles of several materials, heights, and approach angles; recorded outcomes including misses |
| follows a person or target | trials across lighting and distances; hit and lost-target rates |
| speaks / hears | a person confirms audibility; a captured signal at the right level and rate |
| runs unattended | actual cold boot and a duration run with logs; recovery after fault injection |

## Field lessons from operating a real small robot (generalized)

- **Bound every motion in the same process that drives it.** Planning to stop in a later remote command fails when the connection drops; vendor example programs that were terminated left motors driven until an explicit stop-and-center.
- **Small steps, then look.** Real displacement per command was far below the nominal (startup inertia), and turns overshot; a loop of observe, estimate, one small bounded move, stop, observe converged where long blind sequences did not.
- **Range sensors lied in specific ways:** useless while motors ran, blind to people at close range because the beam sat low and narrow, fixed to the chassis rather than the camera head, no echo from angled soft surfaces. The empirical limits were recorded as gotchas and used to choose which sensor to trust in which regime.
- **A face detector worked only upright, frontal, lit;** a general vision model found the same person from their feet. Pick the tool per task, and record hit rates by condition.
- **Exit code 0 can be silence.** The amplifier was gated behind a GPIO that defaults off, and the sound server could route to an unplugged jack; playback "succeeded" and nothing was heard. A human confirming audibility was the only terminal proof.
- **Device ownership and stale holders.** One process owned the camera; killing a process left a GPIO line claimed; killing a capture mid-frame wedged a driver until reboot. Clean up with the right signal and a time limit, and check for holders first.
- **Status queries from a retired stack can be wrong** (a legacy camera query reporting no camera while capture worked); the truth is the current stack's listing plus a real capture.
- **First calls are slow** (model load, constructor recentering servos); do not mistake that for a hang, and do not rely on settings that a constructor resets (camera aim lost when the driver was reinstantiated).
- **Experiments end in a known state:** motors stopped, steering centered, temporary processes ended, devices released, then the state recorded.
- **Audience is not at the keyboard.** For a machine that works around people, anything that matters must be communicated through the machine's own channel (speech, light) and confirmed, and spoken transcripts are not gospel: destructive or motion intents are confirmed before acting.
