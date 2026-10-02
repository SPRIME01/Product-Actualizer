# Mote assembly guide  (rev B, 2026-01-25)

For the MOTE-NECK REV B board and the kit parts in BOM rev B.

1. Plug the pan servo into J3 and the tilt servo into J4. Servos take power directly from the 5 V rail;
   there is no switch.
2. Firmware pin map: PAN = GP10, TILT = GP11, sensors on I2C0 (SDA GP4, SCL GP5).
3. Fit the Optel O-1 camera with the 15-to-22 pin adapter cable, contacts facing the board.
4. Fit the Halden HM1000 PDM microphone to the Pi's PDM pins.
5. Connect the VT-53 module to J6; pin 1 (VIN) is the 5 V rail.
6. Power on with the 5 V 2.5 A adapter and run `python -m mote`.
