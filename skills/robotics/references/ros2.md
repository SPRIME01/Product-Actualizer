# ROS 2 products

Load only when ROS 2 is present in the evidence (packages, launch files, a `ros2` environment, a robot profile). Without it none of this is read. For live work on a running robot the execution layer is the installed `ros2-skill`; this reference says what to ask of it and what to distrust, not how to type its commands.

## Operating pattern

```text
known profile first -> live introspection where needed -> preflight -> resolve the exact interface -> bounded action -> observe -> verify
```

- **Profile first.** A scanned profile records static facts: velocity topic and message type, odometry topic, velocity ceilings, frame names, controller names, e-stop service, joint names, sensor topics. Static facts come from the profile; only runtime state is read live. A profile value that fails against the live graph stops the work and escalates; it is not silently replaced.
- **Preflight (live, because runtime state is not in a profile):** the controller that will move the robot is active, the robot is stationary (odometry velocities near zero), the odometry source is publishing at a sane rate, the relevant lifecycle nodes are active, QoS between publisher and subscriber is compatible, and a baseline pose is captured fresh.
- **Resolve the exact interface:** names and types are used verbatim from discovery or the profile; an empty discovery result is broadened, never guessed.
- **Bounded action:** every motion has a distance, angle, or duration bound and a speed within the profile ceiling; unreasonably large requests are rejected without confirmation; a new command during motion stops the old one first.
- **Observe and verify:** after any action, read the effect. A command that returned without error was delivered, not performed. After motion, stop, verify stationary from odometry, then read the final pose (a pose read mid-motion is wrong). After a timeout, read the actual pose before deciding; never replay the full move.

## What the ROS layer can and cannot establish

| Observation | Establishes | Does not establish |
|---|---|---|
| node/topic/service listed | it is advertised | that data flows, that it is the right one, that it is active |
| lifecycle node `inactive` | topics may exist but messages are silently dropped | any publish failure will be reported |
| message received on a topic | a publisher exists with compatible QoS | the sensor is healthy or the data is fresh (check stamps and rate) |
| controller listed `active` | the controller manager says so | the hardware interface is responding or the drive is enabled |
| action result `SUCCEEDED` | the server reports success | the robot reached the physical goal (verify with an independent source) |
| simulation clock running | `use_sim_time` consistency | real-machine timing |

## Design points to check in a ROS 2 product

- **Frames and conventions:** standard unit and axis conventions; the odometry-base-map frame chain consistent; the transform tree has one authority per transform; extrinsics from this unit's calibration.
- **Rates and QoS:** control loop not blocked by perception callbacks (separate callback groups or processes); sensor topics use a best-effort or latest-only profile where freshness matters; command topics have expiry; subscriptions that sit on stale transient-local data are noticed.
- **Lifecycle and startup:** ordered activation with health checks; node states verified, not assumed; stable device names; services run under a dedicated user with environment set in the unit, not in a user profile; restart limits; network readiness and discovery configuration for multi-machine setups (domain and discovery settings must match).
- **Safety path:** an e-stop that does not depend on the ROS graph; a watchdog node or controller timeout that zeroes velocity on lost commands; shutdown commanding zero velocity; velocity limits applied at the controller or a command gate, not only in the planner.
- **Deprecated or distro-specific instructions:** check setup text against the pinned distribution and package versions; a launch argument, parameter, or package named in docs may no longer exist.
- **Records:** bag files or an equivalent with timestamps and metadata for tests; replay is part of how a failure is reproduced.

## Evidence mapping

Profile and configuration contents read from files are `OBSERVED` as configuration. Live graph facts are `OBSERVED` for the time they were read and expire (runtime state does not persist). Behavior claims need a physical observation of the result or an independent sensor; a successful action result or a clean log is a report from the system, not the world.
