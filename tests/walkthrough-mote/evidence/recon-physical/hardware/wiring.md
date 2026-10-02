# Wiring: as designed vs as built

| connection | as designed (REV C schematic) | as built (traced on the unit) | difference |
|---|---|---|---|
| pan servo signal | GP12 -> J3.3 | not traced | none known; firmware drives GP10 |
| tilt servo signal | GP13 -> J4.3 | not traced | firmware drives GP11 |
| sensors | I2C1 GP10/GP11 | not traced | firmware uses I2C0 GP4/GP5 |
| servo supply | +5V -> Q1 -> SERVO_V, enable on GP14 | not traced | firmware never drives GP14 |
| VT-53 VIN | +5V (J6.1) | not traced | README says 5 V is safe |
| amp enable | Pi GPIO17 (hardware guide) | not traced | no code drives GPIO17 |
| mic / amp I2S pins | not in the neck-board export | not traced | unknown |

"Not traced" means no continuity or visual trace of the unit has been supplied or made. Nothing in this file is `OBSERVED` on the unit.
