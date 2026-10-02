"""Camera snapshot (legacy camera stack)."""
import picamera


def snap(path="/tmp/mote.jpg"):
    with picamera.PiCamera() as cam:
        cam.capture(path)
    return path
