from machine import PWM, Pin

PERIOD_US = 20000


class Servo:
    def __init__(self, pin):
        self.pwm = PWM(Pin(pin))
        self.pwm.freq(50)

    def angle(self, deg):
        deg = max(0, min(180, deg + 90))
        pulse = 500 + int(deg / 180 * 2000)
        self.pwm.duty_u16(int(pulse / PERIOD_US * 65535))
