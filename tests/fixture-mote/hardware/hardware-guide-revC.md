# Mote hardware guide  (rev C, 2026-03-10)

Applies to MOTE-NECK REV C and the rev C kit.

## System

Raspberry Pi Zero 2 W (voice, camera, network) <-UART 115200 8N1, 3.3 V-> MOTE-NECK REV C (RP2040).
Camera: Optel O-2, 22-pin CSI. Microphone: Halden HM1100, I2S, on the Pi's I2S bus. Amplifier: CA3105 on the same
I2S bus, SD pin on Pi GPIO17 (low = off). Speaker: 4 ohm 3 W. Power: USB-C 5 V 2.5 A adapter into the neck board.
Servo supply is switched by Q1 (SERVO_EN on GP14); sensors are on I2C1 (GP10/GP11): VT-53 at 0x29, ST20 at 0x44.

## Power budget, +5V rail (typical)

| consumer | current |
|---|---|
| Raspberry Pi Zero 2 W | 0.60 A |
| Optel O-2 camera | 0.25 A |
| CA3105 amplifier (speech) | 0.30 A |
| MOTE-NECK board and sensors | 0.05 A |
| servos (idle) | 0.02 A |
| **total** | **1.22 A** of 2.5 A |

## Features

- Touch the capacitive pad on top of the head to wake Mote (U5).
- Pan range +/-70 degrees, tilt -25 to +35 degrees (bracket stops, see CAD).
- Head assembly 92.4 mm wide.
