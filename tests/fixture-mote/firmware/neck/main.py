import time

from machine import I2C, UART, Pin

import config
import servo
import thp
import tof

pan = servo.Servo(config.PAN_PIN)
tilt = servo.Servo(config.TILT_PIN)
i2c = I2C(config.I2C_ID, sda=Pin(config.I2C_SDA), scl=Pin(config.I2C_SCL), freq=400000)
uart = UART(config.UART_ID, 115200, tx=Pin(config.UART_TX), rx=Pin(config.UART_RX))

sweeping = False
angle, step = -60, 2
tof.scan(i2c)

while True:
    line = uart.readline()
    if line:
        cmd = line.decode().split()
        if cmd[0] == "PAN":
            pan.angle(int(cmd[1]))
        elif cmd[0] == "TILT":
            tilt.angle(int(cmd[1]))
        elif cmd[0] == "SWEEP":
            sweeping = cmd[1] == "1"
        elif cmd[0] == "DIST":
            uart.write(b"%d\n" % tof.read_mm(i2c))
        elif cmd[0] == "CLIMATE":
            t, rh = thp.read(i2c)
            uart.write(b"%.1f %.0f\n" % (t, rh))
    if sweeping:
        angle += step
        if angle > 60 or angle < -60:
            step = -step
        pan.angle(angle)
        time.sleep_ms(20)
