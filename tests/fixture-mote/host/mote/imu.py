"""Pick-up detection from an IMU on the host I2C bus."""
IMU_ADDR = 0x68


def picked_up(bus):
    ax = bus.read_word_data(IMU_ADDR, 0x3B)
    return abs(ax) > 12000
