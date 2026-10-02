# Sentio ST20 temperature and humidity sensor, datasheet rev 1.0
(Synthetic fixture document for testing; the part and manufacturer are fictional.)

| parameter | min | typ | max | unit | class | conditions |
|---|---|---|---|---|---|---|
| VDD | 1.7 | 3.3 | 3.6 | V | recommended | |
| temperature accuracy | | 0.3 | 0.5 | C | typical / max | 5-60 C |
| humidity accuracy | | 2 | 4 | %RH | typical / max | 20-80 %RH |

I2C address 0x44 (ADDR low) or 0x45 (ADDR high). Serial-number command 0x3682. Self-heating of nearby parts shifts readings;
keep the sensor away from heat sources or compensate and verify against a reference.
