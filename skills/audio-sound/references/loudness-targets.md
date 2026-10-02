# Loudness and delivery targets

Load when setting or checking an audio deliverable's level. Platform values change; confirm the current
published figure and record it as `url@date` in the decision log before relying on a number here.

| destination | integrated loudness | true-peak ceiling | notes |
|---|---|---|---|
| broadcast, EBU R128 regions | -23 LUFS (±0.5 LU) | -1 dBTP | program loudness |
| broadcast, ATSC A/85 (US) | -24 LKFS (±2 dB) | -2 dBTP | dialogue-gated |
| music streaming (typical) | about -14 LUFS | -1 dBTP; -2 if the service re-encodes lossy | services normalize down, rarely up |
| online video (typical) | about -14 LUFS | -1 dBTP | quieter masters are not boosted much, louder ones are turned down |
| podcast | -16 LUFS stereo, -19 LUFS mono | -1 dBTP | spoken-word norm |
| audiobook retail (ACX style) | -23 to -18 dB RMS | -3 dB peak | noise floor at or below -60 dB RMS |

Measurement rules: measure the final encoded file, not the mix bus; measure with the gated algorithm
(ITU-R BS.1770 / EBU R128); report integrated loudness, loudness range, and true peak together. A lossy
encode can add inter-sample overs to a file whose pre-encode peak was clean.

Sample rate and format: video work at 48 kHz; music-only at 44.1 or 48 kHz; mix at 24-bit; dither once when
reducing to 16-bit. Do not mix 44.1 and 48 kHz assets without explicit conversion.

Spoken word: recording distance and microphone are kept consistent across takes; room tone is recorded for
every location (30 seconds is typical) and used under edits; plosives and sibilance are fixed at the source or
by targeted processing, not by overall compression.

Synthetic or generated sound: record the tool, version, date, prompt, and the plan or license terms in force
at generation; terms differ by plan and change over time. Voice cloning requires documented consent from the
person whose voice it is.
