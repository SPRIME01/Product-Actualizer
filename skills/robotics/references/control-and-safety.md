# Embodied control, timing, actuation, and safety

Load when judging how decisions become motion: control loops, rates, actuator commands, limits, watchdogs, safe states, and recovery.

## Layers and who may command

```text
application / mission -> behavior (state machine, behavior tree) -> functional (perception, estimation, planning, control)
-> hardware abstraction (limits, rates, staleness) -> drivers -> actuators and sensors -> the world
```

Information flows up through perception and decisions flow down through control. Nothing above the abstraction layer commands a driver; the abstraction layer enforces limits and rejects stale or out-of-range commands.

## Rates, latency, and buffers

- Order: safety monitor and control faster than planning, planning faster than perception where possible; whatever is slower hands its output to the faster loop through a bounded buffer. A direct call from a fast loop into a slow one couples their rates and stalls the fast one.
- Policies: state is latest-wins with age; commands are FIFO with an expiry and a depth limit; telemetry may drop. Unbounded queues turn latency into a memory fault and a stale-actuation fault.
- Write the budget: sensing latency + transport + processing + decision + command transport + actuator response. Compare with the control period and with the time to stop. Measure it on the unit under load (camera, radio, inference all running), not idle.
- Open-loop versus closed-loop is declared per motion. Closed-loop gains, saturation limits, and anti-windup are tuned on the real plant; a tuning from simulation or another unit is a starting point.
- Timing in software is not hardware timing: sleeps drift; blocking I/O and garbage collection break deadlines; a non-real-time OS gives no hard guarantee, so anything that must not miss a deadline (current limiting, stop) lives in hardware or on the microcontroller.

## Motion profiles and plant identification

Step commands to an actuator are not motions: limit velocity and acceleration (and jerk where the mechanism or the load needs it) in the layer that issues the command, so a large request becomes a bounded ramp. Identify the plant before tuning: step and ramp responses give latency, deadband, saturation, and slew rate; gains and limits come from those measurements and are re-measured at the real supply and load. Filters, estimators, and sampling add delay that belongs in the loop budget; sample fast enough for the actuator bandwidth and the quantity being controlled.
Contact and manipulation tasks add force and torque limits, compliance, and grip checks; a stall is detected from current or position error and handled, not waited out.

## Commanded versus actual

Servo and motor commands are requests. Backlash, friction and stiction, steering geometry, load, battery sag, temperature, latency, and unit-to-unit variance decide the outcome; short bursts also cover less than their duration suggests because starting inertia dominates. Build a commanded-versus-actual table from physical measurements (displacement or angle per command, at speeds and loads used) and use it to calibrate; large steering or turn commands overshoot small aiming corrections, so aim with small arcs and re-observe.
Servos can reach a command and still be wrong at the output (horn indexing, slip); confirm travel, center, and range with an independent observation, and keep software limits inside mechanical stops.

## Locally bounded actuation

```text
actuate with its own bound (duration, steps, travel, speed, current) -> stop locally -> observe actual result
```

- The bound travels with the command and is enforced where the actuator is driven. A later "stop" message is a backup, not the mechanism.
- Cleanup that runs only on normal exit is not safe: a terminated process may skip its `finally`, a killed process may leave a line claimed or a motor driven. After killing or timing out any process that may have driven an actuator, run an explicit stop-and-center and verify stationary state.
- Heartbeats and watchdogs convert silence into a stop: the actuating side stops if commands stop arriving within a stated time; a hardware or microcontroller watchdog backs a software one.
- Reject unreasonable requests (distance, angle, speed, duration) above stated ceilings without confirmation; a new command during motion stops the old one first; never run two velocity commands in parallel.
- After a timeout or failure: stop, verify the stop, read the actual state, then decide; never re-issue the original full command from a partially moved position.

## Safe states

| Condition | Required behavior (designed and demonstrated) |
|---|---|
| boot, bootloader, firmware update | outputs at the safe level by hardware default |
| controller crash, watchdog reset | actuators reach the safe state without software |
| communication or heartbeat loss | stop within the stated time |
| sensor loss or implausible data | degrade or stop; do not hold the last reading as truth |
| low battery or brownout | reduce, then stop, before the controller resets mid-motion |
| operator e-stop | independent of software; verified by its effect on the actuator supply or drive enable |
| shutdown | zero velocity, hold or brake as designed, then power down |

Applicable standards for the machine class (for example ISO 10218 for industrial robots, ISO/TS 15066 for collaborative operation, ISO 13482 for personal-care robots) are identified as requirements and handed to the owner for review.
Safety hierarchy: a hardware cut or disable that does not depend on software; a hardware or microcontroller watchdog and limits; software monitors; application limits. Use the layer below to back the layer above; a software limit alone does not protect against its own failure. This repository does not certify safety functions; where harm is possible, record the requirement and the independent review needed.
Defaults are safe: low speed, limits on, explicit enable, workspace boundaries, and "stop" for unknown state, not "continue".

## Degradation

Map capabilities to the components they need (full autonomy, perception-only, blind manipulation, safe stop). Transitions are announced and logged; recovery re-enters through health checks, not by assumption.

## Learned and agent-driven control

A model or agent proposes; the bounded layer disposes. Its latency (often seconds for a language agent) is outside any fast loop, so it supervises and sets goals while a local controller performs bounded steps. Record the model version, input distribution, and evaluation on the real unit; keep a human-visible stop and a local stop that works if the agent or network is gone.

## Evaluating learned and embodied behavior

Define the success criterion and trial protocol before running (initial conditions, reset procedure between trials, number of trials, what counts as a failure); report rates with their trial counts and spread, per condition, not one aggregate. Simulation is used for regression and bring-up, not as the performance claim. Training and replay data keep timestamps, synchronization, action-observation alignment, and the calibration version in force; failure episodes are kept. Evaluation on the real unit happens inside the same bounded envelope as any other motion.

## Recovery

Per failure class: detect, stop, verify state, choose retry/fallback/escalate, limit retries (two timeouts on the same move escalate), and leave the unit in a known state. Failures of sensors, actuators, and links are injected in tests, not hoped away.
