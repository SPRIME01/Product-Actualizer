# recon-software: capability trace (evidence, not a derived artifact)

Analyzed: `tests/fixture/loam-fw/` (not a git repository; no commit to pin). Not read: `loam.hw` (referenced at
`main.py:19`, absent from the checkout). Entry points: `main.py` (`__main__` loop, `run_once`).

| capability | declared | implemented | reachable | executed |
|---|---|---|---|---|
| ADC count to percent | README.md:3 | loam/sensor.py:7-9 | main.py:11 via `run_once` | test: 2 passed |
| Upload reading | README.md:10 | loam/uplink.py:7-11 | main.py:12 | n/a (needs endpoint) |
| Email alert | README.md:8 | loam/alerts.py:9-20 | main.py:13-14 (only if `ALERT_EMAIL` set) | n/a (needs SMTP) |
| SMS alert | README.md:8 | none: loam/alerts.py:23-25 raises `NotImplementedError` | none | n/a |
| Hourly reading | README.md:5 | main.py:7 sets 900 s | main.py:20-22 | n/a (hardware module absent) |

Stub sweep (TODO, NotImplemented, example.com, lorem, constant returns): 1 hit, `alerts.py:24-25`, classified stub.
Clean-checkout test command: `python3 -m unittest discover -s tests -t .` exit 0, 2 tests.
Secret scan: no credential-shaped strings; `LOAM_ENDPOINT`, `SMTP_HOST`, `ALERT_EMAIL` are read from the environment.
Dependencies: standard library only; no requirements file.
Not run: an alert path with real values (recorded as read-only structure; execution is the release gate's job).
