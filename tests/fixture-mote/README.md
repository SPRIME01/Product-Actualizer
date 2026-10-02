# Mote

Desk companion: Raspberry Pi Zero 2 W (voice, camera) + Mote Neck Board (pan/tilt servos, distance and
climate sensors) over a serial link.

## Setup (Pi)

    sudo raspi-config        # Interface Options > Legacy Camera > Enable
    pip install picamera     # camera support
    raspistill -o test.jpg   # check the camera works

Microphone is a PDM MEMS mic: `arecord -D mote_pdm -d 4 -f S16_LE -r 16000 test.wav`.

## Wiring

- Distance sensor (VT-53 module): I2C bus 0, address 0x52. VIN can go to 5V, the module is 5V safe.
- Climate sensor: I2C, address 0x44.
- Servos: pan on GP10, tilt on GP11, powered straight from the 5V rail.
- Speaker: 4 ohm, 3 W. Amp delivers a full 3 W from 5V.

## Run

    export MOTE_STT_KEY=...   # speech-to-text key
    python -m mote

Face tracking follows you with its head. Temperature is accurate to 0.3 C.
