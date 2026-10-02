---
name: motion-editorial
description: Structure and cut time-based work: product films, demos, social cuts, and UI motion. Use when a deliverable plays over time.
reads: [purpose, actors, form, voice, claims, capabilities, unknowns, decisions]
needs: [brand, direction]
executes_with: [hyperframes, bang-motion, ffmpeg]
---
# Motion and video editorial

## Reads from the model
`claims` (what each shot may assert), `capabilities` and `form` (what footage can be real), `voice` (script register), `actors` (platform and viewing context), `decisions` (direction rules, durations), `unknowns` (footage not yet existing).

## Distinctions
- **Ownership.** Owns time: structure, pacing, shot order, cuts, transitions, on-screen text timing, and motion behavior. Audio-sound owns everything audible. Product-visualization owns the faithful frames of the product; direction owns the look rules.
- **An edit is an argument.** Each shot supports one claim; the sequence is the order a viewer needs it. Demonstration shots must be real captures; a staged or mocked demonstration is a claim about behavior.
- **Every shot must add new information.** Map the product's feature list to shots before filming; a core feature with no shot is rework later. One animation technique is the star once per film; repeated material or information is cut.
- **Information needs rest.** Once a carrying element lands (a number, a card, the wordmark), hold it still for at least one second before cutting, spending that stillness on the brand moment and the key claim rather than on every card. Bulk entrances accelerate (constant speed reads cheap) and then rest about half a second.
- **First cuts run a notch too fast.** Open with a single subject and a complete motion arc of about three seconds or more; simulated interaction (typing, filtering, clicking) runs at human speed so a viewer could follow along.
- **Existing product screens come from real captures,** at 2-4x the display size when they will be scaled in 3D; hand-built imitations are for scenes that never existed in the product. Demo data is invented or cleared and carries no real customer or personal names; cursor and clicks stay legible and the device pixel ratio is recorded.
- **Camera serves legibility.** Information-dense shots face front; close-ups of text stay near horizontal; tilted camera is decided shot by shot, not film-wide; no handheld shake on a bright UI film; a light sweep or glint is used at most once per shot, on the hero, clipped inside its rounded boundary.
- **Lay out the hero frame first.** For each scene, build the static layout at the moment most elements are visible, then animate to it; positioning elements at their offscreen start state hides overlaps until render. Intentional layering (glow, depth stacks) is distinguished from accidental overlap.
- **The transition is the exit.** The outgoing scene stays fully formed until the transition runs; emptying it first makes the transition act on a blank frame. Only the last scene fades out on its own.
- **Dark full-frame linear gradients band under H.264;** use radial or solid fields with localized glow. Rendered-video type floors at 1080p are about 60 px headlines, 20 px body, 16 px data labels, with tabular numerals in number columns.
- **Palette and type trace to the direction file.** Reaching for a default gray, blue, or system font means the direction gate was skipped.
- **Slide deck vs. film is checkable in the source,** not by feel. Scenes that change by fading sections on and off are a deck; scenes should change because the camera or world moves. A film keeps one visual through-line (one subject in continuous action, or one world the camera travels through); unrelated full-bleed images in sequence are a slideshow.
- **Text tiers per scene are capped at two** (one large number or sentence plus one label). Eyebrow plus title plus body is a slide. A list of points becomes a visual device (one feature demonstrated, a transformation, a shuffle), not three tiles, and consecutive pieces don't reuse the same device.
- **Template skeletons are detectable:** a first scene of enlarged text that exits left, three side-by-side feature tiles, a typed search box, the sequence hook-feature-feature-promise-logo-CTA. Two or more without a concept reason means a template in a new skin.
- **Motion every second comes from a chosen background motion language,** not Ken Burns alone; transitions beyond fade, scale bump, and light leak (whip to another angle, cut to an instrument, push-through). "Zoom in and out" means shot size follows what is being narrated (close-up, then wide), not a barely visible breathing scale.
- **Procedural motion is a pure function of timeline time:** no system clock or unseeded randomness, so scrubbing is exact and every render is frame-identical.
- **Show state continuity:** the product's state (UI screen, LED, door, data) at the end of one shot must match the start of the next unless a cut says time passed.
- **Reading time is a constraint:** on-screen text needs about 3 words per second plus half a second; captions carry the claims for sound-off viewing.
- **Platform format sets structure:** aspect ratio, safe zones covered by interface chrome, length, loop behavior, and opening seconds differ by destination. Choose the destination before the cut.
- **Conform before cutting.** Variable-frame-rate phone and screen captures are converted to constant frame rate; mixed rates (24/25/30/60, 29.97 vs. 30) are resolved deliberately; untagged color is tagged; a project resolution is chosen.
- **Color pipeline is declared per source.** Phone HDR (HLG/PQ) re-encoded through an SDR path goes flat; wide-gamut SDR (BT.2020) is not BT.709-ready, and retagging is not converting; log camera footage is tagged SDR but looks grey until its LUT is applied first. Decide HDR-kept or SDR-converted per destination.
- **Frame order of operations:** reframe and resize to the delivery size first, burn captions and graphics second, export last. Captions burned before a crop land off-frame; captions burned small then upscaled go soft.
- **Reframing is a composition decision.** Cropping 16:9 to 9:16 discards about 70% of the width; choose per shot what the vertical frame keeps. "A 60-second cut" by speed-up and by trimming are different edits; say which.
- **Lossless cuts snap to keyframes** and can start up to one GOP early or on a frozen frame, particularly on variable-rate sources; frame-accurate cuts re-encode.
- **Automated highlight picking ranks loudness or duration, never meaning.** Its picks are candidates for the shot ledger, not the cut.
- **UI motion** explains state change: duration by distance and importance (roughly 150-300 ms for small elements), ease-out on enter and ease-in on exit; reduced-motion alternative exists.

## Failure modes
- **Feature slideshow** — shots in feature order with no through-line. *Recognize:* the shots can be reordered with no loss.
- **Faked demo** — mocked UI or staged result implying function. *Recognize:* a shot's source footage is not a capture of the real product.
- **Unreadable text** — gone before it can be read or under platform chrome. *Recognize:* hold time below words/3 + 0.5 s; text inside safe-zone margins.
- **VFR drift** — audio and picture slide apart. *Recognize:* picture and audio durations differ by more than one frame.
- **Washed or crushed encode** — preview and delivered file look different. *Recognize:* limited/full range or primaries untagged or mismatched.
- **State jump** — screen shows a different UI state across a cut. *Recognize:* shot notes disagree on state.
- **Tofu captions** — missing glyphs render as empty boxes while the tool exits 0. *Recognize:* a still frame of non-Latin or emoji text shows boxes; the font does not cover the script.
- **Platform chrome collision** — text under the area the platform covers (commonly the bottom fifth and the right edge on vertical feeds). *Recognize:* overlay of the destination's safe-zone template shows text outside it.
- **Upscale** — source below delivery resolution scaled up. *Recognize:* detail softer than the native-resolution shots.
- **Blurry text in 3D or zoom** — UI texture rasterized at layout size then scaled up. *Recognize:* pixel blocks on text edges in a zoomed frame; the fix is a higher-resolution source and rasterization path, not depth of field or camera changes.
- **Self-review skipped** — first inspection left to the client. *Recognize:* no rendered stills of key frames checked for composition, jitter, text sharpness, and slip-ups before delivery.
- **Motion as decoration** — animation with no change of meaning, or long eases that delay use. *Recognize:* removing it loses nothing; interaction waits on it.
- **Cut-in claim** — voiceover or caption states something no shot shows.

## Check
1. Probe each delivered file: resolution, frame rate, constant-rate flag, pixel format, color primaries/transfer/range tags, duration, audio rate and channels. All match the spec in the decision log.
2. Audio and video stream durations differ by ≤ 1 frame.
3. Shot ledger: every shot lists source file with timecode, claim id(s), and state description; every on-screen or spoken claim appears in it with an `OBSERVED`/`VERIFIED` claim id.
4. Text hold: for each on-screen text, hold time ≥ words/3 + 0.5 s; each lies inside the destination's safe area.
5. Feature map: every product feature on the goal's list has a shot or an explicit exclusion; every shot's new-information line is non-empty and unique.
6. Deck test: grep the composition source: three or more scenes switched by fading sibling sections, more than two text tiers in any scene, or two or more template-skeleton items each fail the piece.
7. Determinism: render twice and compare frame hashes; any difference is a defect (clock or random source).
8. Continuity pass: state descriptions at each cut boundary agree.
9. Frame check: stills extracted at the first and last frame of each shot and at each cut are reviewed for black, duplicated, or wrong-state frames.

## Writes to proposals
- `unknowns`: footage that does not exist and must be captured, states not yet reachable on the real product.
- `capabilities` and `claims`: confirmed behaviors captured on camera (source = file#timecode).
- `constraints` (technical): platform specs, deliverable formats.
- `form`: states and sequences of the product observed during capture.
- `decisions`: destination, duration, and the claim each shot carries.
