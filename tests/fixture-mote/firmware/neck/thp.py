ADDR = 0x44


def read(i2c):
    i2c.writeto(ADDR, bytes([0x24, 0x00]))
    d = i2c.readfrom(ADDR, 6)
    t = -45 + 175 * (d[0] << 8 | d[1]) / 65535
    rh = 100 * (d[3] << 8 | d[4]) / 65535
    return t, rh
