# Bench notes (owner)

- Amp gives 3 W into the 4 ohm speaker at 5 V. Plenty loud.
- Servos are fine at 6 V from the bench supply and have more torque there.
- VT-53 module is 5V safe, so it sits on the 5V pin and its I2C goes straight to the neck MCU.
- Pi draw peaked at 0.9 A on a USB meter during a voice reply with Wi-Fi up (one run).
- VT-53 offset calibration: TODO, never done. ST20 reads a bit warm near the amp, fine for now.
- Mic is the PDM part, 3.3 V.
- Rev C respin moved the sensors; firmware not reflashed to the rev C board yet.
