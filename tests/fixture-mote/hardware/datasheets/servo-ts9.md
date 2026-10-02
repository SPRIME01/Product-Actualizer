# Tanzo TS-9 micro servo, datasheet rev 1.2
(Synthetic fixture document for testing; the part and manufacturer are fictional.)

| parameter | min | typ | max | unit | class | conditions |
|---|---|---|---|---|---|---|
| supply voltage | 4.8 | 5.0 | 5.5 | V | recommended | |
| supply voltage | | | 6.0 | V | absolute max | |
| idle current | | 8 | 12 | mA | typical / max | no signal motion |
| moving current, no load | | 120 | 180 | mA | typical / max | 5.0 V |
| moving current, loaded | | 250 | 400 | mA | typical / max | rated load 1.0 kg.cm |
| stall current | | 650 | 800 | mA | typical / max | 5.0 V |
| start-up current peak | | 500 | | mA | typical | first 20 ms of a move |
| signal high level | 2.5 | | 5.0 | V | recommended | |

Control: 50 Hz, pulse 500-2500 us for -90 to +90 degrees, 1500 us centre. Stall torque 1.6 kg.cm at 5.0 V.
Note: operation at 6 V is not recommended; torque gain is small and heating and gear wear increase.
