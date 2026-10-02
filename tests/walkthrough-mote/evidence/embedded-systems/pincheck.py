#!/usr/bin/env python3
"""Compare the firmware pin map with the schematic nets of the matching revision. Static check of two files; exit 1 on any conflict.
Usage: python3 pincheck.py [firmware_config.py] [schematic.txt] [firmware_dir]"""
import os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
FIX = os.path.join(ROOT, "tests", "fixture-mote")
cfg_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(FIX, "firmware", "neck", "config.py")
sch_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(FIX, "hardware", "schematic-revC.txt")
fw_dir = sys.argv[3] if len(sys.argv) > 3 else os.path.join(FIX, "firmware", "neck")

# firmware constant -> net name the schematic should give that pin
EXPECT = {"PAN_PIN": "PAN_PWM", "TILT_PIN": "TILT_PWM", "I2C_SDA": "I2C1_SDA", "I2C_SCL": "I2C1_SCL", "UART_TX": "UART_TX", "UART_RX": "UART_RX"}

consts = {m.group(1): int(m.group(2)) for m in re.finditer(r"^([A-Z0-9_]+)\s*=\s*(\d+)", open(cfg_path).read(), re.M)}
net_of = {}
in_nets = False
for line in open(sch_path):
    if line.startswith("NETS"):
        in_nets = True
        continue
    if line.startswith("NOTES"):
        in_nets = False
    m = re.match(r"^([A-Za-z0-9_+]+)\s*:\s*(.*)", line)
    if in_nets and m:
        for gp in re.findall(r"U1\.GP(\d+)", m.group(2)):
            net_of[int(gp)] = m.group(1)

bad = 0
for name, want in EXPECT.items():
    pin = consts.get(name)
    got = net_of.get(pin)
    if got == want:
        status = "ok"
    elif got is None:
        status, bad = "UNCONNECTED in schematic", bad + 1
    else:
        status, bad = f"CONFLICT: schematic net is {got}", bad + 1
    print(f"{name} = GP{pin} (expect {want}): {status}")

src = "".join(open(os.path.join(fw_dir, f)).read() for f in sorted(os.listdir(fw_dir)) if f.endswith(".py"))
if net_of.get(14) == "SERVO_EN" and not re.search(r"SERVO_EN|GP14|Pin\(14", src):
    print("SERVO_EN (GP14) is never driven by the firmware: the Q1 servo supply stays off")
    bad += 1
sys.exit(1 if bad else 0)
