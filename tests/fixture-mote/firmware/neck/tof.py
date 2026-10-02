ADDR = 0x29
OFFSET_MM = 0  # TODO calibrate at 100 mm against a grey target


def scan(i2c):
    found = i2c.scan()
    print("i2c scan:", [hex(a) for a in found])
    return found


def read_mm(i2c):
    raw = i2c.readfrom_mem(ADDR, 0x1E, 2)
    return (raw[0] << 8 | raw[1]) + OFFSET_MM  # TODO verify identity register 0xC0 == 0xEE
