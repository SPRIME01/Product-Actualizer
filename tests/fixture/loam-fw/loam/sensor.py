"""Soil moisture reading for the Loam probe."""

DRY_RAW = 3100  # ADC count in dry air, measured on bench unit 1
WET_RAW = 1400  # ADC count submerged in water


def raw_to_percent(raw):
    pct = (DRY_RAW - raw) * 100 / (DRY_RAW - WET_RAW)
    return max(0.0, min(100.0, pct))


def read_moisture(adc):
    return raw_to_percent(adc.read())
