---
name: robotics
description: Judge embodied closed-loop behavior in robots and physical-AI products (sensors, observations, state estimation, decisions, control, actuators, the physical world, new observations) including frames, calibration, sensor health, timing, safe states, startup and shutdown, and physical testing. Use when the product senses and acts on the physical world with software in the loop (mobile or armed robots, servo or motor driven devices, agents with a body); not for sensor-only, display-only, or purely electrical products.
reads: [purpose, actors, capabilities, constraints, form, claims, unknowns, decisions]
needs: [embedded-systems]
executes_with: [ros2-skill]
---
# Robotics and physical AI

## Reads from the model
`purpose` and `actors` (who is near the machine, including bystanders), `capabilities` and `claims` (what it must do in the world), `constraints` (power, mass, speed, envelope), `form` (the sensor and actuator inventory and their links), `unknowns`, `decisions`. Hardware facts come from `evidence/recon-physical/hardware/`, electrical limits from `electronics`, firmware and boot facts from `embedded-systems`. Read `product-model/PHYSICAL-PREFLIGHT.md` before any motion. Load on demand: `references/perception-and-state.md`, `references/control-and-safety.md`, `references/bring-up-and-testing.md`, and `references/ros2.md` only when ROS is present.

## Distinctions
- **Ownership.** Owns whether the machine behaves correctly as a closed loop in the physical world: observation, estimation, decision, control, actuation, and the new observation. `electronics` owns the circuit, `embedded-systems` the boundary and boot, release-readiness the gate. Not a catalog of robotics topics: it is one loop, analysed edge by edge.
- **The loop is the unit.** Write it as a graph: each sensor and actuator, the rate it runs at, its latency, its frame, its units, its validity, and who consumes it. A product whose loop cannot be drawn from the evidence has an unknown, not a behavior.
- **Hardware abstraction.** Decision code does not command hardware directly; it goes through an interface that enforces limits, rates, and staleness. The same interface may serve a simulator, but simulation passing says nothing about the real machine: list the gap (friction, latency, noise, backlash, power sag, lighting, contact).
- **Frames and units are explicit.** Each measurement and command names its frame, units, axis convention, and timestamp source. Extrinsics and zero offsets are measured on this unit, and re-measured after a bump, remount, re-homing, or thermal change.
- **Calibration is part of the interface.** Intrinsics, extrinsics, hand-eye, actuator zero and travel, and sensor offsets have a method, a quality measure, an independent check, and a recorded date; nominal values are placeholders. An uncalibrated sensor is present, not trusted.
- **Sensors have operating envelopes.** A driver returning a number is not trustworthiness. Blind spots, minimum range, clipping, motion-induced noise (including the machine's own actuators), lighting and surface dependence, orientation dependence, and interference are properties of the unit and its environment; record them when discovered, with the condition. A sentinel return (timeout, `-1`, zero depth) means no measurement, not "nothing there". When two sensors disagree decide which is authoritative in which regime, from evidence.
- **Sensor health is monitored.** Stale, frozen, out-of-range, and warming-up sensors are detected and handled by the loop; an observation carries its capture time and is rejected past a stated age.
- **Perception is conditional.** Detector accuracy is measured on captured data from this unit and environment, with confidence, failure cases, and the condition under which it fails (pose, lighting, distance). Fusion needs calibrated, timestamped inputs and carries uncertainty; averaging unsynchronized sensors is not fusion.
- **Choose the decision structure by need.** A small explicit state machine for a few well-defined states; behavior trees or an equivalent for composition, reactivity, and fallbacks. Every action has a failure result and a cancel path; conditions have no side effects; a decision layer holds no hardware authority.
- **Control rates are respected.** Faster loops are never blocked by slower ones (control above planning above perception); slower producers hand data across a bounded buffer with latest-wins for state and expiring FIFO for commands. Latency budgets are written and measured; control on a stale observation is an explicit decision.
- **Commanded motion is not actual motion.** Backlash, friction, steering error, load, latency, power state, and actuator variance separate command from outcome. Behavior is calibrated from physical feedback and the measured displacement per command is recorded.
- **Locally bounded actuation.** Every actuation carries its own duration, step, travel, speed, or current bound, enforced on the device or in the actuating process, then stops locally. A stop that depends on the agent, the network, or the session staying alive is not a stop. Process termination does not run cleanup in every runtime.
- **Observe, small action, observe.** Estimate, command one small bounded step, stop, observe the actual result, update; long open-loop sequences are earned by demonstrated predictability and declared as open-loop.
- **Safe states are designed per actuator and per condition.** Boot, crash, watchdog reset, communication loss, sensor loss, low battery, e-stop, and shutdown each have a defined state (brake, coast, hold, retract), and a hardware path to it where harm is possible. Software watchdogs and application limits sit above, not instead of, a hardware cut. Certification is not conferred here.
- **Degrade, do not collapse.** List capabilities and the components each needs; losing a component moves to the best remaining mode or a safe stop, announced to the operator.
- **Startup and shutdown are deterministic.** Ordered bring-up with health checks gates any motion; shutdown commands zero velocity and engages holds in the actuating process; both are tested by actually restarting.
- **Learned components are inside the envelope.** A vision model, policy, or language agent is a perception or decision source with latency, error, and distribution shift; its outputs pass the same bounds, rate, and staleness gates, it is evaluated on data from this unit, and it is never the only path to stop.
- **Restore known state.** An experiment leaves motors stopped, actuators bounded and safe, temporary processes ended, GPIO and devices released, and the control state recorded.
- **ROS present.** Load `references/ros2.md`; use `ros2-skill` as the live execution layer (known profile, introspection, preflight, exact interface, bounded action, observe, verify) rather than reimplementing its commands. Without ROS that knowledge stays unloaded.

## Failure modes
- **Open-loop unbounded** — motion issued with no bound and no feedback. *Recognize:* a loop or command with no duration, no travel limit, or a stop planned for a later message.
- **Command as outcome** — success asserted from the command or its return. *Recognize:* no independent observation of the result.
- **Trusted driver** — sensor values used with no envelope or health check. *Recognize:* no stale-age check, no handling of sentinel values.
- **Sim-only pass** — behavior shown only in simulation or a mock. *Recognize:* the test double stands in for the physics the claim is about.
- **Rate coupling** — control blocked by perception, or an unbounded queue. *Recognize:* a synchronous call or growing buffer between rates.
- **Nominal calibration** — default intrinsics, zero offsets, or one bench unit's constants shipped. *Recognize:* calibration files with no unit serial, date, or method.
- **Stale actuation** — command from an old observation or after reconnect. *Recognize:* no timestamp or age check on the action path.
- **Overshoot on retry** — re-issuing a full move after a timeout. *Recognize:* retry that does not read the actual position first.
- **Manual-start pass** — works when launched by hand, fails from boot. *Recognize:* no restart test, hardcoded device names, environment from a profile.
- **Cleanup on a signal** — safe state only in an exit handler. *Recognize:* the stop lives in `finally` or a signal handler.
- **Hidden self-interference** — sensor noise from the machine's own motors or speakers. *Recognize:* readings that change when actuators run.

## Check
1. Loop graph: every sensor, actuator, and decision source with rate, latency, frame, units, timestamp source, and consumer; every missing item is an unknown.
2. Envelope table per sensor: valid range, blind spots, conditions where it fails, measured on the unit, with the evidence; sentinel handling written.
3. Calibration record per sensor and actuator: method, date, quality measure, independent check; nominal values listed as unverified.
4. Actuation audit: each actuator has a bound enforced locally, a safe state per condition, a limit on speed or force, and a demonstrated stop (command, stop, and measured stationary state).
5. Timing: rates and latencies measured, staleness limits stated, queues bounded, and the loop's behavior under sensor dropout and communication loss shown.
6. Physical test evidence graded by environment (mock, simulation, hardware-in-the-loop, real machine in a controlled space) with the claim each can support; the commanded-versus-actual table for repeatable motions.
7. Startup and shutdown shown by actual restart and power-cycle, including that no motion occurs before health checks pass.
8. Restore-state record after every experiment; the action log follows `PHYSICAL-PREFLIGHT.md`.

## Writes to proposals
- `claims`: behaviors graded by environment (`INFERRED` for analysis or simulation, `OBSERVED` for a recorded run, `VERIFIED` for an expected-value check on the real machine); `CONTRADICTED` when documentation or code disagrees with measured behavior.
- `constraints`: safe-state requirements, speed and force limits, operating environment, rates and latency ceilings, required calibration, supervision requirements.
- `capabilities`: only those whose loop has been traced; others stay unknowns.
- `unknowns`: uncalibrated sensors, unmeasured latencies, untested failure modes, unobserved shutdown, unknown envelopes.
- `actors`: bystanders and operators with their exposure and authority; `decisions`: autonomy level, accepted risks, supervision rules.
- Artifact `artifacts/robotics/behavior-envelope.md` (loop graph, envelopes, safe states, test matrix; stamped); evidence under `evidence/robotics/` (`loop.md`, `envelopes.md`, `motion-log.md`, `actions.md`).
