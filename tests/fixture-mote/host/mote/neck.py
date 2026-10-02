"""Serial client for the Mote Neck Board. Commands are ASCII lines."""
PAN_MIN, PAN_MAX = -90, 90
TILT_MIN, TILT_MAX = -90, 90


def clamp(value, low, high):
    return max(low, min(high, value))


def frame(command, arg=None):
    if arg is None:
        return f"{command}\n".encode()
    return f"{command} {int(arg)}\n".encode()


class Neck:
    def __init__(self, port):
        self.port = port

    def pan(self, deg):
        self.port.write(frame("PAN", clamp(deg, PAN_MIN, PAN_MAX)))

    def tilt(self, deg):
        self.port.write(frame("TILT", clamp(deg, TILT_MIN, TILT_MAX)))

    def sweep(self, on):
        # Starts a continuous sweep on the neck board; it runs until SWEEP 0 is received.
        self.port.write(frame("SWEEP", 1 if on else 0))

    def stop(self):
        self.port.write(frame("SWEEP", 0))
