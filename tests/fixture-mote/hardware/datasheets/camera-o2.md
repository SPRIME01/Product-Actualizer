# Optel O-2 camera module, hardware specification v1.1
(Synthetic fixture document for testing; the part and manufacturer are fictional.)

8 MP, 2-lane MIPI CSI-2, 22-pin FFC (matches the Pi Zero 2 W connector). Supported by the libcamera stack only; the legacy
camera stack and its tools are not supported. The predecessor Optel O-1 (5 MP, 1-lane, 15-pin FFC) has a different connector and
sensor and needs a different driver configuration. Supply 3.3 V from the host connector; on-module regulators derive the other rails.
