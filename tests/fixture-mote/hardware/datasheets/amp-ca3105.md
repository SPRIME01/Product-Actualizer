# Corvane CA3105 I2S class-D amplifier, datasheet rev 2.0
(Synthetic fixture document for testing; the part and manufacturer are fictional.)

| parameter | min | typ | max | unit | class | conditions |
|---|---|---|---|---|---|---|
| supply voltage | 2.5 | 5.0 | 5.5 | V | recommended | |
| supply voltage | | | 6.5 | V | absolute max | |
| output power, 4 ohm | | 2.5 | | W | typical | VDD 5 V, THD+N 10 % |
| output power, 4 ohm | | 2.0 | | W | typical | VDD 5 V, THD+N 1 % |
| output power, 8 ohm | | 1.5 | | W | typical | VDD 5 V, THD+N 10 % |
| quiescent current | | 4 | 6 | mA | typical / max | |
| supply current at full output, 4 ohm | | 0.56 | | A | typical | VDD 5 V |

SD pin: low = shutdown (internal 1 Mohm pull-down, so an undriven pin leaves the amplifier off); high = enabled.
Requires BCLK present before SD goes high. Supply decoupling: 10 uF within 5 mm of VDD.
