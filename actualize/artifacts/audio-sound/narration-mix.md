built_from: model@8
reads: [purpose, form, voice, claims, constraints, unknowns, decisions]
cites: [C57, C65, C66]
public: false
status: final

# Narration and mix record

**Voice decision.** One voice, dry, no music (D-R9). Model `fish-audio/s2.1-pro-free:free`, as the brief requires, with the voice id documented for it (b347db033a6549378b48d00acb0d06cd). The model's catalogue entry lists no voices (`supported_voices: null`), so the only voice id known to be valid is the one in the model's own published usage note; no other voice was auditioned because no one can listen here. One synthesis per line, so each line's duration is measured and sync is exact per line. [C66]

**Why per line, not one take.** A single take of the whole script aligned by detected pauses placed one line implausibly (4.3 words a second) once a different voice was used; per-line synthesis removed the guesswork. With no voice id the provider default varied its pacing by 25% between two calls of the same sentence; with the voice pinned, ten independent calls measured a median pitch of 155 Hz with an 18 Hz spread (evidence/audio-sound/voice-consistency.txt).

**Delivery.** Integrated loudness -16.2 LUFS (target -16 within 1 LU), sample peak -4.5 dBFS, loudness range 2.7 LU, noise floor -66 dB RMS in gaps, no digital silence of 40 ms or more, audio and video within 0.39 frame [C65]. Measured on the delivered mp4, not the mix bus (evidence/motion-editorial/probe.txt).

**Captions and sync.** Cues break where the voice pauses when the pause was matched, and otherwise in proportion to characters (sync confidence: exact per line, about 0.3 s within a line). A caption never stays up for less than words/3 + 0.5 s; fast lines get a longer pause after them.

**Not done.** No human has listened (U15). The pronunciation of "Actualizer" is unchecked. Commercial rights to the voice are unconfirmed [C57].

**Source ledger.** Voice: the model above, through OpenRouter [C66], rights pending. Room tone: synthetic. No music, no effects.
