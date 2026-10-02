"""Listen and speak. Speech-to-text and text-to-speech use a cloud service."""
import subprocess

from . import config


def listen(seconds=4):
    wav = "/tmp/mote-capture.wav"
    subprocess.run(["arecord", "-D", config.CAPTURE_DEVICE, "-d", str(seconds), "-f", "S16_LE", "-r", "16000", wav], check=True)
    return upload_for_transcription(wav)


def upload_for_transcription(path):
    import requests

    with open(path, "rb") as f:
        r = requests.post(config.STT_URL, headers={"Authorization": config.STT_KEY}, data=f)
    return r.json()["text"]


def speak(wav_path):
    proc = subprocess.run(["aplay", "-D", config.PLAYBACK_DEVICE, wav_path])
    return proc.returncode == 0
