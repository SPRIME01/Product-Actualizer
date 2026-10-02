import serial

from . import config, neck, voice


def main():
    port = serial.Serial(config.NECK_PORT, config.NECK_BAUD)
    n = neck.Neck(port)
    n.sweep(True)
    while True:
        text = voice.listen()
        if text:
            print("heard:", text)


if __name__ == "__main__":
    main()
