"""Probe entry point."""
import os
import time

from loam import alerts, sensor, uplink

INTERVAL_S = 900


def run_once(adc, device_id):
    percent = sensor.read_moisture(adc)
    uplink.send_reading(percent, device_id)
    if alerts.should_alert(percent) and os.environ.get("ALERT_EMAIL"):
        alerts.send_email(os.environ["ALERT_EMAIL"], percent)
    return percent


if __name__ == "__main__":
    from loam.hw import adc  # hardware module, not in this checkout
    while True:
        run_once(adc, os.environ.get("DEVICE_ID", "loam-1"))
        time.sleep(INTERVAL_S)
