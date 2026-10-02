# Veyra VT-53 time-of-flight sensor (chip rev 3.0) and VT-53 breakout module (rev 2)
(Synthetic fixture document for testing; the part and manufacturer are fictional.)

## Chip

| parameter | min | typ | max | unit | class | conditions |
|---|---|---|---|---|---|---|
| VDD | 2.6 | 2.8 | 3.5 | V | recommended | |
| VDD | | | 3.9 | V | absolute max | |
| range | 30 | | 1200 | mm | guaranteed | 17 % grey target |
| accuracy | | 3 | | % | typical | after offset calibration at 100 mm |

I2C 400 kHz max. Default 7-bit address 0x29 (0x52 in 8-bit write notation). Identity register 0xC0 reads 0xEE.
Offset calibration is required: place a 17 % grey target at 100 mm and store the measured offset.

## Breakout module rev 2

VIN 3.0-5.5 V; on-board 2.8 V regulator feeds the chip. SDA and SCL have 10 kohm pull-ups to **VIN** (not to the regulated
2.8 V); the module does no level shifting. With VIN at 5 V the I2C lines idle at 5 V.
