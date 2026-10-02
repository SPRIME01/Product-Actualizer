# Buses

| bus | master | devices (7-bit address) | voltage | speed | pull-ups present | evidence |
|---|---|---|---|---|---|---|
| I2C1 (neck, GP10 SDA / GP11 SCL, REV C) | RP2040 | VT-53 at 0x29 (identity reg 0xC0 = 0xEE, never read); ST20 at 0x44 (ADDR low) | module pulls to VIN = +5V; ST20 on +3V3 | firmware asks 400 kHz | module 10 k to VIN; neck R1/R2 DNP | schematic-revC.txt:18,30-31,38; tof-vt53.md:13,18-19 |
| I2C0 (neck, GP4/GP5, REV B firmware) | RP2040 | none reachable on REV C | | 400 kHz | | firmware/neck/config.py:4-6; schematic-revC.txt (GP4/GP5 absent) |
| UART0 (neck to host) | either | n/a | 3.3 V | 115200 8N1 | n/a | schematic-revC.txt:32-33; hardware-guide-revC.md:7 |
| I2S (Pi) | Pi | mic (HM1100, SEL slot unknown), CA3105 | 3.3 V | unknown | n/a | hardware-guide-revC.md:8-9 |
| CSI | Pi | camera O-2, 2 lanes | | | n/a | camera-o2.md:4 |
| host I2C (claimed) | Pi | IMU at 0x68 | | | | host/mote/imu.py:2; no IMU in schematic or BOM |

Scan evidence: neck-boot.log:4 shows ACKs at 0x29 and 0x44 on I2C0 of a REV B board in February; these are ACKs, no identity register was read, and the board is not the REV C board.
