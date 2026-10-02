# Halden HM1100 I2S MEMS microphone, datasheet rev 1.1
(Synthetic fixture document for testing; the part and manufacturer are fictional.)

| parameter | min | typ | max | unit | class | conditions |
|---|---|---|---|---|---|---|
| supply voltage | 1.8 | 3.3 | 3.3 | V | recommended | |
| supply voltage | | | 3.6 | V | absolute max | |
| supply current | | 0.6 | 0.9 | mA | typical / max | active |
| SNR | | 65 | | dB(A) | typical | |
| sensitivity | | -26 | | dBFS | typical | 94 dB SPL, 1 kHz |
| start-up time | | 50 | | ms | typical | to valid data |

Interface: I2S slave, 24-bit, BCLK 1.0-3.2 MHz, WS 16-48 kHz. SEL pin low = left slot, high = right slot.
Important: the HM1000 (PDM output) shares this footprint but is a different part; it is not a drop-in replacement.
