built_from: model@10
reads: [purpose, form, voice, claims, constraints, unknowns, decisions]
cites: [C57, C79, C81, C82]
public: false
status: final

# Narration, score and mix record (film 3)

**Voice decision.** One voice, dry, as the brief requires. Model `fish-audio/s2.1-pro-free:free`, with the voice id documented for it (b347db033a6549378b48d00acb0d06cd). The model's catalogue entry lists no voices (`supported_voices: null`), so the only voice id known to be valid is the one in the model's own published usage note; no other voice was auditioned because no one can listen here. One synthesis per line, so each line's duration is measured and sync is exact per line. Eight lines, 156 words, 72.8 s of speech. [C82]

**Why per line, not one take.** A single take of the whole script aligned by detected pauses placed one line implausibly once a different voice was used; per-line synthesis removed the guesswork. With the voice pinned, ten independent calls measured a median pitch of 155 Hz with an 18 Hz spread (evidence/audio-sound/voice-consistency.txt). Each response's `X-Generation-Id` is logged in evidence/audio-sound/tts-calls-3.jsonl. The key was read from the environment only.

**Score and effects (D-R9, D20).** Synthesised from code by `media/explainer-3/tools/score.mjs`: no samples, no third-party audio, nothing to license or credit. A low A-minor pad; a clock tick that stops when the plot is pinned; after that a soft pulse and a plucked pentatonic pattern; a major chord at the end card. Forty effects mark state changes only (a card landing, a note struck, a crack, the pin, each answer, the refusal, the acceptance). Effect times are read from `src/cues.mjs`, the same file the picture reads, so a click sounds on the frame its card lands. [C81]

**Mix.** The score sits under the voice: its level is set 8.4 dB below its raw level and a sidechain compressor keyed by the voice ducks it further (ratio 7:1, attack 12 ms, release 450 ms). The result is normalised in two passes to -16 LUFS integrated with a -1.5 dBTP ceiling. Measured on the delivered mp4: integrated -16.0 LUFS, loudness range 3.5 LU, peak -1.5 dBFS, no digital silence of 40 ms or more, audio and video within half a frame [C79] (evidence/motion-editorial-3/probe.txt).

**Captions and sync.** Cues break where the voice pauses when the pause was matched, and otherwise in proportion to characters (sync confidence: exact per line, about 0.3 s within a line). A caption never stays up for less than words/3 + 0.5 s; fast lines get a longer pause after them. Where a clean pause was not measured for a sentence the picture times it in proportion to characters, so a few answers in the comparison land within about 0.3 s of the word.

**Not done.** No human has listened (U15): the balance of score and voice is set by measurement, not by ear, the pronunciation of "Actualizer" is unchecked, and whether the score helps or distracts is unknown. Commercial rights to the voice are unconfirmed [C57].

**Source ledger.** Voice: the model above, through OpenRouter [C82], rights pending. Score and effects: synthesised in the repository [C81]. Room tone: none in film 3. Films 1 and 2 keep their own records in earlier history.

Rebuilt at model@10 after D19 and D20: film 3 has a synthesised score and effects, which replaces the "no music, no effects" record of the earlier films.
