"""Runtime configuration for the Mote host app."""
import os

NECK_PORT = "/dev/ttyAMA0"
NECK_BAUD = 115200
STT_KEY = os.environ["MOTE_STT_KEY"]
STT_URL = "https://stt.example.com/v1/transcribe"
CAPTURE_DEVICE = "mote_pdm"
PLAYBACK_DEVICE = "mote_out"
AMP_ENABLE_GPIO = 17
