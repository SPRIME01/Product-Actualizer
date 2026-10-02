# System map (recon-physical, hardware package)

Blocks and links as the evidence stands. Each line: what, source, and basis (D = design file at its revision, P = prose document, U = owner-supplied unit capture).

| block | role | source | basis |
|---|---|---|---|
| host-sbc (Raspberry Pi Zero 2 W Rev 1.0) | voice, camera, network, serial link | unit/inspection.txt:2; hardware-guide-revC.md:7 | U, P |
| neck-mcu (RP2040 on MOTE-NECK REV C) | servo PWM, servo supply enable, I2C1 sensors | schematic-revC.txt:5,27-31 | D |
| servo-pan-tilt (2 x TS-9, J3/J4) | head motion, bracket stops pan +/-70, tilt -25..+35 | schematic-revC.txt:14-15; cad-neck-revC.json:8 | D |
| tof (VT-53 module on J6) | distance | schematic-revC.txt:7,17,30-31 | D |
| thp (ST20, U4) | temperature, humidity | schematic-revC.txt:8,30-31 | D |
| mic (HM1100, I2S) | voice capture | hardware-guide-revC.md:8; owner confirmation | P, U |
| amp (CA3105) and speaker (4 ohm 3 W) | voice output, SD on Pi GPIO17 | hardware-guide-revC.md:8-9; amp-ca3105.md:14 | P |
| camera (Optel O-2, 22-pin CSI) | images | hardware-guide-revC.md:8; unit/inspection.txt:4 | P, U |
| power-input (USB-C 5 V 2.5 A, J1, F1) | +5V rail | schematic-revC.txt:10-12,22-23; unit/inspection.txt:6 | D, U |

Links: host to neck UART 115200 8N1 3.3 V (J2); mic and amp on the Pi I2S bus; camera on CSI; sensors on neck I2C1; servo supply through Q1.
Not in any supplied file: the Pi-side wiring (I2S pins, GPIO17), decoupling capacitors, the Pi boot configuration.
Absent by design evidence: battery, charger, IMU, touch pad (U5 is do-not-populate).
