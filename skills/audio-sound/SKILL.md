---
name: audio-sound
description: Own everything audible in a deliverable: dialogue and voiceover, music, product and effect sounds, mix, and loudness. Use when any artifact has sound or the product itself makes sound.
reads: [purpose, form, voice, claims, constraints, unknowns, decisions]
needs: [motion-editorial]
executes_with: [ffmpeg]
---
# Audio engineering and sound for picture

## Reads from the model
`voice` (script register, pronunciation of names), `claims` (what the narration may assert), `form` (sounds the real product makes), `constraints` (legal: music, voice, and likeness rights), `decisions` (destination, loudness target, direction's sonic rules).

## Distinctions
- **Ownership.** Owns what is audible and how it is mixed. Motion-editorial owns picture timing and the cut; brand owns verbal voice; this lens renders it sonically and owns the product's sonic character.
- **Dialogue is the priority layer.** Music and effects are mixed around intelligibility. Speech and most music overlap in the 1-4 kHz region, so music beds sit well below speech there or are carved to leave room.
- **Loudness is measured, not set by ear:** integrated loudness (LUFS), loudness range, and true peak per destination. Targets differ (broadcast, streaming, podcast, social); they change over time, so the current platform value is confirmed and recorded, and a lossy encode needs true-peak headroom of about -1 to -2 dBTP.
- **A product's real sound is evidence.** A recording of the actual unit (distance, microphone, room, noise floor noted) is `OBSERVED`. A substituted or synthesized click, hum, or alert is a claim about the product's sound.
- **Voiceover:** script comes from `voice` and `claims`; speaking pace for narration is roughly 140-160 words per minute and is set against picture. Synthetic voices need a pronunciation list for brand and part names and numbers, plus disclosure and license checks; voice cloning needs documented consent.
- **A music brief is a plan, not an adjective:** style, intended mood per section, structure and tempo, then measured results. The agent cannot hear the result, so claims about how it sounds come from measurement or from one named human listening before release, and the record says which.
- **Music:** tempo and structure follow the cut, not the reverse; licensing is per use and per territory; generated music is governed by the tool's terms at the time and plan of generation, which are recorded.
- **Sound for picture:** hard effects tied to on-screen events, ambience, and room tone under every cut so no edit drops to digital silence.
- **Normalized can still clip.** Loudness normalization does not bound peaks; true peak is measured separately. Ambience and near-silence (about -40 LUFS or lower) is room tone or noise; raising it to a speech target raises the noise, so leave the level and say so.
- **Sync tools align audio to audio, never lip to voice.** Alignment confidence under about 0.3, or an offset that is a large share of the search window, is suspect; recordings over roughly ten minutes from separate devices drift and need drift correction; verify by re-running alignment on the output and getting ~0 offset. Lip sync is judged by looking.
- **Source files carry extra tracks.** Phone and camera files hold several audio streams and timecode tracks; a re-encode that maps only the first silently drops the rest. Choose the track deliberately.
- **Loudness and delivery numbers live in `references/loudness-targets.md`;** load it when setting or checking a target, and confirm current platform values before relying on them.
- **Technical format:** work at 48 kHz for picture, 24-bit during mixing, dither once when reducing bit depth; check mono compatibility; fade or zero-cross edits.
- **Cue sheets are declarative.** Every effect is a row: frame or timecode, source, level, and the picture action it answers. Sound is placed after picture lock, and any change to shot length or order re-pins the whole table.
- **Rapid repeats avoid the machine-gun.** Alternate two samples, step levels down along the sequence, and let spacing follow the animation curve; when the density blurs, fade the sound out.
- **Match the action's real sound over generic whooshes,** and cut each sample to the exact length of the action it covers. Effect vocabulary is chosen for the kind of film (whoosh for camera moves, impact for landings, riser for build, sparkle for light, transition for cuts); sample timbres from game packs read as the wrong genre. Music candidates are auditioned against the actual cut, not alone.
- **Device UX sounds** (beeps, chimes) are interaction feedback and belong to experience's feedback model; this lens designs and measures them.

## Failure modes
- **Peak overs after encode** — master clean, delivered file clips. *Recognize:* true peak above target after re-measuring the encoded file.
- **Masked narration** — music or effects fight speech. *Recognize:* speech-to-music level difference under 12 dB in spoken segments, or words unintelligible on small speakers.
- **Fake product sound** — stock whirr for hardware. *Recognize:* no recording of the unit exists; source is a library.
- **Sample-rate mismatch** — pitch and sync drift. *Recognize:* mixed 44.1/48 kHz assets without conversion.
- **Edit clicks and dead air** — no crossfade or room tone. *Recognize:* spikes at cut points; digital silence between clips.
- **Phase collapse** — stereo wide effects vanish in mono. *Recognize:* mono fold-down drops more than ~3 dB or loses elements.
- **Dropped track** — the wrong or only the first audio stream carried through. *Recognize:* stream list before and after differs unintentionally.
- **Mispronounced names and numbers** in synthetic VO. *Recognize:* a brand or part name, unit, or number in the script that is absent from the pronunciation list.
- **Voice without consent** — cloned or sound-alike voice with no agreement. *Recognize:* no signed permission from the person whose voice it imitates.
- **Unlicensed or unrecorded music** — source not in provenance. *Recognize:* a track with no license row.
- **Over-compressed master** — loudness war applied to a quiet product. *Recognize:* loudness range near zero where the picture needs dynamics.

## Check
1. Measure the delivered file: integrated loudness within ±1 LU of the destination target, true peak ≤ the destination ceiling, loudness range recorded. Re-measure after final encode, not on the mix bus.
2. Mono fold-down level within 3 dB of the stereo level and no stem disappears.
3. Speech-to-music: in spoken segments, music is at least 12 dB under speech by short-term measurement.
4. Noise floor: in silence between phrases, the floor sits at the target set in the decision log (a common spoken-word delivery bar is -60 dBFS RMS).
5. Cue sheet audit: every effect row's frame lands within one frame of its picture action in the final render; after any timeline change the table was re-pinned.
6. Cut audit: every cut point and clip edge has a crossfade or room tone under it; no digital silence longer than one frame.
7. Pronunciation: for synthetic or briefed voice, every brand name, part number, unit, and number in the script appears in the pronunciation list, and the delivered take was checked word by word against it.
8. Listening record: one human has listened to the final mix on small speakers and headphones, with name and date; measurements alone do not release audio.
9. Source ledger: every audio element (VO, music, effect, recording) has an origin and license row; every narrated claim has a ledger id at `OBSERVED`/`VERIFIED`.

## Writes to proposals
- `voice`: pronunciation guide and spoken-register samples.
- `claims`: sounds of the real product with recording details as source.
- `unknowns`: recordings needed, device sound behaviors not yet specified.
- `constraints` (legal): rights and terms for music, voice, and effects.
- `decisions`: destination loudness target, voice choice, and licensing basis.
