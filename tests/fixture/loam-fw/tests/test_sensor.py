import unittest

from loam import sensor


class SensorTest(unittest.TestCase):
    def test_endpoints_map_to_0_and_100(self):
        self.assertEqual(sensor.raw_to_percent(sensor.DRY_RAW), 0.0)
        self.assertEqual(sensor.raw_to_percent(sensor.WET_RAW), 100.0)

    def test_clamps_outside_calibration(self):
        self.assertEqual(sensor.raw_to_percent(sensor.DRY_RAW + 500), 0.0)
        self.assertEqual(sensor.raw_to_percent(sensor.WET_RAW - 500), 100.0)


if __name__ == "__main__":
    unittest.main()
