# Perception, calibration, and state estimation

Load when sensors feed decisions: cameras, depth, range finders, IMUs, encoders, contact sensors, microphones used as sensors. Hardware identity and electrical limits come from the hardware package and `electronics`; here the question is what the sensor tells the loop and when to distrust it.

## Sensor record (one per sensor, in `evidence/robotics/envelopes.md`)

`sensor | mounting and frame | rate and latency | output and units | valid range | blind spots | failure conditions (lighting, surface, motion, orientation, interference) | self-interference by own actuators | health signals | calibration | evidence`.

Fill the envelope from the unit, not the datasheet alone: a datasheet range is for a target and a condition the product may never meet.

## Typical envelope traps (check each against the unit)

- **Range finders (ultrasonic, optical time-of-flight):** a narrow beam at bumper height passes between legs and chair rails or skims over a foot at point-blank range and reads the far wall; soft or angled surfaces return no echo; readings are meaningless while motors run (vibration and electrical noise); a fixed sensor does not follow a pan or tilt head. Take the median of several readings at rest after settling, treat a timeout or negative value as no measurement, and let a camera outrank it in the regime where it is blind.
- **Cameras:** auto-exposure and white balance need frames to settle after start; discard warm-up frames; a single owner per device; rolling shutter and motion blur at speed; low light and backlight change detector hit rates dramatically; lens focus or mount changes invalidate intrinsics. Judge image quality from a captured, inspected frame.
- **Detectors:** a classic face or color detector may work only upright and frontal at moderate range and fail on tilted, backlit, or close faces; a learned model may fail off its training distribution. Measure hit rate under the conditions the product will meet and record the conditions that fail. Choose per task (a cheap detector to track a cooperative target, a stronger model for search).
- **Depth and point clouds:** zero and saturated values mean no measurement; sample a neighborhood and use a robust statistic, not one pixel; align depth to color before back-projecting; registration needs overlap and an initial guess.
- **IMU, encoders, odometry:** gyro bias drift, magnetometer disturbance near motors, wheel slip and backlash, encoder counts that wrap or lose steps, timestamps taken at processing rather than capture. Odometry read while the machine is still decelerating is not its resting pose.
- **Microphones:** self-noise from motors and the speaker, fixed capture rates, gain control, directionality; transcription mishears proper nouns and numbers, so safety-relevant or destructive intents are confirmed.
- **Contact, current, and torque sensing:** thresholds are load- and temperature-dependent; calibrate with the actual mechanism.

## Calibration

| Item | Method | Quality and independent check | Recalibrate when |
|---|---|---|---|
| camera intrinsics | many views of a target across the field, with tilt; fixed focus during calibration and operation | reprojection error small and a known-distance check | focus or zoom changes, bump, remount, large temperature change |
| camera-to-camera or camera-to-range extrinsics | shared target or correspondences | independent measurement with a ruler or known distance | remount or any mechanical change |
| camera-to-robot (hand-eye) | many diverse poses | placement error against the task tolerance, repeatability of the arm accounted for | re-homing, joint recalibration, remount |
| actuator zero and travel | drive to stops or reference marks at low speed | position read by an independent method | after any reassembly or horn re-seating |
| sensor offset and scale | two or more references spanning use range | residual against a reference with known uncertainty | after drift, temperature change, new unit |

Intrinsics and nominal parameters from a datasheet or a different unit are placeholders. Store calibration with unit serial, date, method, and tool version.

## Time and synchronization

Timestamp at capture, from a monotonic clock, not at the callback; processing time includes queueing. Cross-sensor fusion needs synchronized or bounded-skew timestamps and an interpolation or latest-with-age policy. Hardware triggering where skew matters. Keep a latency budget (capture, transfer, decode, preprocess, inference, post-process) and compare it with the control period; a perception stage slower than the control rate is pipelined and the control loop uses the previous result with its age.
Decouple capture from processing; a bounded buffer that keeps the latest frame beats a growing queue. Process every Nth frame when the task allows it.

## State estimation and fusion

Use fusion when no single sensor is sufficient; each input contributes with a stated uncertainty and a validity gate. The estimator reports uncertainty and a staleness age, and downstream decisions use both. Compare estimates against an independent truth at least once (a mark on the floor, a tape-measure displacement, a motion-capture or known-pose target). Estimator divergence has a detector and a defined response (stop, re-localize).
Frames: name the world, base, sensor, and tool frames; use consistent units (SI) and axis conventions; keep the transform tree in one place; verify handedness with a physical motion, not by reading the file.

## Localization, mapping, and navigation

Where the machine moves through space, the pose estimate has drift, a reference (map, marker, floor feature), and a failure mode (kidnapping, symmetric environments, featureless surfaces, a stale map). Record how pose is initialized, how divergence is detected, and what the machine does when it is lost. Odometry from wheel slip or integrated inertial data is dead reckoning: it needs a correction source and an independent ground-truth check (a marked path, a measured return-to-start error).

## Fidelity of perception evidence

Evaluate on data recorded from this unit in the environments of use, versions of the model and thresholds recorded, with held-out cases and the failure cases kept. Synthetic or clean sample inputs verify the code path only. Report per-condition results rather than one aggregate.
