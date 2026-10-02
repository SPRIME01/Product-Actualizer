# RP2040 (excerpt, paraphrased for the fixture)
(A short paraphrase written for this fixture. The RP2040 is a real part; use its real datasheet for real work.)

IOVDD 3.3 V nominal. GPIO pins are **not 5 V tolerant**; maximum input voltage is IOVDD + 0.5 V.
I2C1 SDA may be GP2, GP6, GP10, GP14, GP18, GP26; SCL may be GP3, GP7, GP11, GP15, GP19, GP27.
I2C0 SDA may be GP0, GP4, GP8, GP12, GP16, GP20; SCL may be GP1, GP5, GP9, GP13, GP17, GP21.
Any GPIO can carry PWM; GP10/GP11 are PWM slice 5 channels A/B, GP12/GP13 slice 6 channels A/B.
