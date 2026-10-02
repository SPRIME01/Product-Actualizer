# Bus budget, I2C1 (calculated; basis: calculated, capacitance assumed)

Devices: VT-53 module (0x29) with a 10 k pull-up to VIN, ST20 (0x44). Neck-board pull-ups R1/R2 are DNP, so the module's 10 k is the only pull-up. Firmware requests 400 kHz (firmware/neck/main.py:12).

| quantity | value | source or method |
|---|---|---|
| effective pull-up | 10 k (one pull-up, to +5V) | schematic-revC.txt:18; tof-vt53.md:18 |
| Fast-mode rise-time limit (30-70 %) | 300 ns | reference bound; device documents govern |
| Rp(max) for 300 ns at Cb | Rp <= 300 ns / (0.8473 x Cb) | formula |
| Cb that 10 k supports at 300 ns | about 35 pF | 300e-9 / (0.8473 x 10e3) |
| Cb that 10 k supports at 1000 ns (100 kHz) | about 118 pF | 1000e-9 / (0.8473 x 10e3) |
| Cb on the unit | unknown | not measured (header, module, ST20, wiring) |
| line idle level | about 5 V | module pull-up to VIN = +5V; RP2040 limit IOVDD + 0.5 V = 3.8 V (rp2040-excerpt.md:4) |

Findings: (1) the idle level is an over-voltage on RP2040 pins, independent of speed; (2) 400 kHz is met only with very low bus capacitance, so 100 kHz is the conservative choice until `tr` is measured;
(3) a found address is an ACK; identity needs the register-0xC0 read (never done in firmware). Sink-current bound: Rp(min) = (5.0 - 0.4) / 3 mA, about 1.5 k, satisfied by 10 k.
