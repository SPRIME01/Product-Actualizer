# Film 3: Past the finish line

An 80-second film made entirely in JavaScript. It is not an explainer: it names a norm that makes "done" cheap, lets the audience see the absurdity, and only then shows the product. The jokes land on systems and habits (a board, a test run, a demo, a launch week), never on a person or a product. Script, shot ledger and checks: `actualize/artifacts/motion-editorial/explainer-film.md`. Films 1 and 2 (`media/explainer/`, `media/explainer-2/`) are kept and superseded.

Every frame is a pure function of time (`src/film.mjs`); picture and sound read the same timing (`src/cues.mjs`), so a card lands on the frame its click sounds. The score and effects are synthesised by `tools/score.mjs` from sine, noise and envelopes: no samples and no third-party audio.

## Reproduce from source

```
bun media/explainer-3/tools/build-data.mjs                         # facts from the model (version, claim count)
bash -ic 'bun media/explainer-3/tools/tts-lines.mjs'                # narration, one line at a time (needs OPENROUTER_API_KEY in the environment)
bun media/explainer-3/tools/timeline.mjs --audio audio/lines.json   # line times, caption cues, WebVTT, transcript
bun media/explainer-3/render.mjs --layout                          # no overlapping or out-of-bounds text in any scene
bun media/explainer-3/tools/score.mjs                              # score and effects, synthesised
bun media/explainer-3/tools/mix.mjs                                # voice placed, score ducked under it, two-pass loudness to -16 LUFS
bun media/explainer-3/render.mjs --captions on  --out renders/silent-captioned.mp4
bun media/explainer-3/render.mjs --captions off --out renders/silent-clean.mp4
bun media/explainer-3/tools/finish.mjs                             # mux, tag BT.709, poster, probes
bun media/explainer-3/render.mjs --hash --stride 15                # determinism: run twice, digests must match
```

Narration model: `fish-audio/s2.1-pro-free:free` through OpenRouter, voice id `b347db033a6549378b48d00acb0d06cd`. The key is read from the environment only. Commercial use of the voice is unconfirmed (U14) and no human has listened to the audio (U15).

## Files
`renders/explainer.mp4` (clean), `renders/explainer-captioned.mp4` (burned-in captions), `renders/poster.jpg`, `captions/explainer.en.vtt`, `script/transcript.md`, `audio/narration.mp3`, `storyboard/final/` (stills at the start, middle and end of each scene). Evidence: `actualize/evidence/motion-editorial-3/`.
