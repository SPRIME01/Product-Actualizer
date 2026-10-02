"""Send readings to the collection endpoint."""
import json
import os
import urllib.request


def send_reading(percent, device_id):
    url = os.environ["LOAM_ENDPOINT"]
    body = json.dumps({"device": device_id, "moisture": percent}).encode()
    req = urllib.request.Request(url, body, {"Content-Type": "application/json"})
    return urllib.request.urlopen(req, timeout=10).status
