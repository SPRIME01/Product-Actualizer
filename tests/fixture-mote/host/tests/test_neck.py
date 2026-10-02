import unittest

from mote import neck


class FakePort:
    def __init__(self):
        self.sent = []

    def write(self, data):
        self.sent.append(data)


class NeckTest(unittest.TestCase):
    def test_frame_with_argument(self):
        self.assertEqual(neck.frame("PAN", 30), b"PAN 30\n")

    def test_pan_is_clamped_to_range(self):
        port = FakePort()
        neck.Neck(port).pan(400)
        self.assertEqual(port.sent[-1], b"PAN 90\n")

    def test_stop_sends_sweep_off(self):
        port = FakePort()
        neck.Neck(port).stop()
        self.assertEqual(port.sent[-1], b"SWEEP 0\n")
