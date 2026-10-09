built_from: model@10
reads: [form, constraints, claims, decisions]
cites: [C59, C60, C61, C63, C67, C79, C80]
public: false
status: final

# Fidelity QA: the built site and film 3

Run: `bun website/build.mjs && bun website/qa.mjs` against `website/public`, in headless Chrome at 320, 375, 768, 1024 and 1440 px, light and dark. Each page is scrolled to the end first and given 3.3 s so that scroll animations have settled before anything is measured. Results: `actualize/evidence/fidelity-qa/site-qa.md` and `site-qa.json`, screenshots in `screens/`.

## Result: 42 of 43 checks pass
- Layout: no horizontal overflow at five widths in both themes; one h1, landmarks, language, title, description and social image present.
- Tokens and contrast: every computed colour is a design token (594 text nodes); every text and background pair meets WCAG AA [C63].
- Keyboard and motion: 125 focus stops, each with a visible 2 px ring and no trap; with `prefers-reduced-motion` no element transitions or animates (0 elements) [C63].
- Demos equal the product: the browser validator is byte-identical to the repository's [C59]; the ledger demo's refusal text equals the validator's for each single downgrade [C61]; the lifecycle demo equals `Control.move` on all 162 combinations [C60]; the waves function equals the engine's for the four presets; the lab picks its claim from the example and a decision stales the public page that cites it.
- Copy: every claim chip resolves to a row in the page's ledger and every row is OBSERVED or VERIFIED; every paragraph containing a number carries a chip (the board's counter reads "none" because a numeral would need a claim).
- Weight: first load 112 KB with gzip, within the 150 KB budget [C67].
- **One failure (N2):** the link to `github.com/SPRIME01/Product-Actualizer/tree/main/actualize` returns 404 because the run has not been pushed. It will pass once the owner pushes; it is not a defect in the page.

## What the QA found and fixed on this pass
The first run of the new motion failed 8 checks: the faint mark behind the hero overflowed the viewport on narrow screens; a counter showed a numeral without a claim; the claims-table selector also matched the hardware walk table; the QA read colours mid-transition (now it waits for animations to settle); the lab's check hard-coded one claim id. The header's three-row navigation took a quarter of a phone screen, so on narrow screens it now scrolls away and only the progress hairline stays.

## Film 3
- Layout scan: no overlapping or out-of-bounds text in any scene at three points per scene.
- Determinism: sampled frames hashed identically in two runs [C80].
- Delivered file: 80.6 s, 1920x1080, 30 fps, BT.709, -16.0 LUFS, audio and video within half a frame [C79].
- Text holds: every on-screen text that appears on a cue stays up at least words/3 + 0.5 s (14 of 14).
- Stills at the start, middle and end of each scene were looked at by the agent (`media/explainer-3/storyboard/final/`).

## Not run
No human has watched the film or listened to it; the joke timing and the score are unjudged. No real-device test (only emulated widths). No screen-reader pass. No cross-browser run (Chrome only). The dry voice has not been shown to a buyer. Visual regression against goldens does not exist (DEBT D15).
