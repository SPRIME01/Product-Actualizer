# Product Actualizer: brand system

Public brand: **Product Actualizer**. Internal and category descriptor: Product Actualizer Architect (never in a lockup). Category: evidence-gated product completion. Command-line verb: `actualize`. The reasoning, with the name screening, is in `actualize/artifacts/brand/identity.md` and `actualize/evidence/brand/`. Screening is not legal clearance (U6).

The sources of truth are the validated artifacts, not this page: verbal identity in `actualize/artifacts/brand/identity.md`, visual direction in `actualize/artifacts/direction/system.md`, the mark system in `actualize/artifacts/illustration/mark-and-diagrams.md`. This guide only tells you where things are and how to use them.

## Files

| path | use |
|---|---|
| `tokens.css` | the only place colours, type families and sizes are set; light and dark |
| `fonts/` | Atkinson Hyperlegible Next and JetBrains Mono (both SIL OFL 1.1, license texts alongside) |
| `logo/mark*.svg` | the symbol: ink or accent on light, dark, one colour, one colour reversed |
| `logo/lockup*.svg` | symbol plus outlined wordmark, same four variants |
| `logo/stacked*.svg` | square-ish alternate |
| `logo/icon*.svg`, `logo/favicon.svg` | 16 to 48 px variant: heavier frame, larger block (favicon follows the colour scheme) |
| `icons/*.png` | favicon 16, 32, 48; apple-touch 180; app icon 192, 512 |
| `social/og.png` | Open Graph card, 1200 x 630 |
| `social/avatar-512.png` | square avatar |
| `social/launch-4x5.png` | launch visual, 1080 x 1350 (safe at 1:1 crop) |
| `build.mjs` | regenerates every file above: `bun brand/build.mjs` |

## Rules in one screen

- **Colour is a data channel.** The seven grade hues appear only beside the grade they name. One accent (Instrument Teal) marks focus, the current step and the primary action, on at most one element per view. No gradients, glow, glass, orbs, or confetti.
- **Type.** Atkinson Hyperlegible Next for text and headings (roman, never italic headings), JetBrains Mono for stamps, claim ids, commands and grades. Scale steps of at least 1.25; measure 68 characters.
- **The mark.** A square frame, dashed where nothing is proven and solid where evidence exists, closing around a solid block. Clear space is half the mark's width. Smallest sizes: mark 16 px (use the icon variant below 48 px), lockup 120 px wide.
- **Signature.** The stamp line `built_from: model@N` and the grade chip. One signature per view.
- **Voice.** Quiet, dense, legible. Direct, not curt; exact, not pedantic; dry, never jokey. Uses: evidence, claim, grade, source, ledger, model, stale, gate, verdict, owner, executor, lens, re-open. Refuses: AI-powered, seamless, effortless, revolutionary, supercharge, 10x, magic, streamline, modern teams, unlock the power of, "trusted by", "just works", and prove, guarantee or autonomous about anything the product does not do.
- **Claims.** Any sentence that states a fact about the product cites a claim at OBSERVED or VERIFIED. Third-party findings appear only as attributed statements of what the source says.

## Regenerate

```
bun brand/build.mjs          # needs system Chrome for the PNGs
bun brand/tools/outline.mjs <dir>/node_modules   # only if the wordmark text or weight changes (see the header of that file)
bun actualize/evidence/direction/contrast.mjs     # recompute the 50 text and background contrast pairs
```
