built_from: model@10
reads: [purpose, actors, form, voice, positioning, claims, unknowns, decisions]
cites: [C2, C5, C20]
public: false
status: final

# Illustration: the mark, its variants, and the diagram grammar

Direction rules apply (artifacts/direction/system.md). Source: `brand/build.mjs` writes every SVG and PNG from `brand/tokens.css`, the outlined wordmark in `brand/logo/wordmark.json`, and the Product Model's own claim rows. Re-run with `bun brand/build.mjs`.

## The mark
A square frame, dashed where nothing is proven and solid where evidence exists, closing around a solid block: potential closing around the actual. Meaning ties to the grades [C2]: dashed is the unproven half of the seven, solid is the evidenced half. It is drawn from the product's own vocabulary, not from a generic check or shield.

| file | use | colour |
|---|---|---|
| logo/mark.svg, mark-dark.svg | symbol on light or dark | ink frame, accent block |
| logo/mark-mono.svg, mark-mono-reversed.svg | one colour, stamps, print | single colour |
| logo/lockup*.svg | horizontal: mark plus outlined wordmark | as above |
| logo/stacked*.svg | square-ish alternate | as above |
| logo/icon.svg, icon-dark.svg, favicon.svg | 16 to 48 px: heavier frame, fewer dashes, larger block | favicon.svg follows the system colour scheme |
| icons/*.png | 16, 32, 48, 180, 192, 512 | |
| social/og.png, launch-4x5.png, avatar-512.png | 1200x630, 1080x1350, 512 | claims shown whole, never clipped; regenerated at model@6 with C3 and C18 because C17 changed |

Clear space is half the mark's width on every side. Minimum size: mark 16 px (icon variant), lockup 120 px wide. Architecture rule for later names: one name for everything; a sub-product is named by what it does, set in the same wordmark face. The word "Architect" never appears in a lockup.

## Application tests (a variant failing three contexts is not primary)
| context | result | evidence |
|---|---|---|
| favicon 16 and 32 px | holds: frame, block and the open corner read; the dashes are lost at 16 px, which is why the icon variant exists | evidence/illustration/mark-contact-sheet.png |
| reversed on dark | holds | same sheet |
| one colour | holds | same sheet |
| clear-space minimum, large format | holds by construction (vector) | |
| motion | the dashed frame closes as the page is scrolled (header mark and the faint mark behind the hero headline): the unfinished half becomes solid; film 3 uses the mark as a static end card | website/src/js/motion.mjs; media/explainer-3/src/film.mjs |
| embroidery or etching | not tested | |
| spoken or "meaning test" with three people | not run (U8) | |

Icon grid scan: the primary mark uses one stroke width (6 on a 64 grid), the icon variants use one (10). Two weights, chosen for size; not pixel-snapped at 16 px (anti-aliased).

## Diagram grammar (for the site's interactive diagrams)
One altitude per diagram. Boxes are numbered. Colour appears only as a grade or status and always with its name beside it, so nothing depends on hue [C2]. Every printed number traces to a data file generated from the repository: `website/data/*.json`.
- **Waves:** columns are waves from the lenses' declared needs, boxes are lenses, arrows are needs [C5].
- **Capability, implementation, executor:** three rows per lens, candidates marked found or unknown, never usable [C20].
- **Lifecycle:** nine states, the owner-only transitions drawn differently from the agent's.
Each diagram carries a text equivalent that states its mechanism without the image; the long description is part of the page, not an alt-text afterthought.

## Film 3 drawings
Two drawn objects serve the film's jokes, both from `media/explainer-3/src/film.mjs` and in the site's tokens, with no stock and no photographs: a task board (three columns, cards, an "agent" cursor) and a small desk robot drawn as a rounded square with two eyes and an antenna, shown once as a render and once as a unit that is dropped. The robot is a character for a fictional example (Mote), not a brand mascot, and is not used outside the film (direction exclusion 5 stands).

## Not run
Colour-vision simulation (every colour here is paired with a word, so the test would find nothing to fail, but it was not run); the meaning test with people.

Rebuilt at model@5 after D11: no content change.

Rebuilt at model@6 after D12: the social cards showed C17 ("no LICENSE file"), which became false; `bun brand/build.mjs` regenerated them with C3 and C18.

Rebuilt at model@7 after D15 (the license event recorded as C68): no content change.

Rebuilt at model@8 after D16 (license restated as AGPL-3.0): no other change.

Rebuilt at model@10 after D19 and D20: motion use of the mark and the film 3 drawings recorded; no change to the mark.
