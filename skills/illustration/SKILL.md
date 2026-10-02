---
name: illustration
description: Make non-photographic, non-literal visuals: illustrations, icon sets, diagrams, exploded views, charts, and animated doodles. Use when a deliverable needs a visual that explains or atmospheres rather than depicts the product itself.
reads: [purpose, actors, form, voice, positioning, claims, unknowns, decisions]
needs: [direction]
executes_with: [anidoodle, hallmark]
---
# Illustration and specialized visuals

## Reads from the model
`form` (real structure for diagrams), `claims` (every number or mechanism a visual states), `voice` and `positioning` (what the imagery should and should not say), `decisions` (direction rules, sizes, formats), `unknowns`.

## Distinctions
- **Ownership.** Owns visuals that explain, symbolize, or set mood without being a literal picture of the product. Product-visualization owns literal depiction; direction owns the system these must follow.
- **Diagram vs. decoration:** a diagram encodes a mechanism or relation, and every mark has a referent and a label. Decoration states nothing and is judged on fit.
- **Statements inside visuals are claims:** exploded views assert part order and count, cutaways assert internal layout, charts assert numbers, icons assert metaphors.
- **Chart integrity:** bars start at zero; units, period, source, and n are shown; no dual axes without explicit labels; direct labels beat legends; color alone never carries meaning (color-vision safe); no 3D.
- **Icon systems** are one grid, one stroke weight, one corner logic, one optical size set (16/20/24), drawn or sourced together. Metaphors are tested for the audience.
- **Product screens in a figure are real captures.** A hand-drawn browser, phone, or app screen presented as the product is a depiction claim about behavior; stylized UI is labeled illustrative and states nothing the product does not do.
- **Generated imagery risks:** invented product details, garbled text, inconsistent parts. It may carry atmosphere; it is never evidence or a depiction of the real product.
- **One altitude per diagram.** Mixing system overview and component detail in one picture gives boxes that each hide a different amount; split by level, and number every box so text can refer to it.
- **Technical-illustration conventions carry meaning.** Exploded views separate parts along their assembly axes in assembly order, with dashed lines showing where they mate and callout numbers matching the BOM; measurements are preserved by orthographic or true isometric projection, while perspective distorts them.
- **Complex diagrams ship with a text equivalent:** a long description that states the same mechanism, so the information survives without the picture; chart numbers show their source and as-of date.
- **Format follows use:** vector (SVG, cleaned, `currentColor` where themed) for diagrams and icons; raster only for texture or photo-like work; dark-mode and reduced-motion variants; alt text written for the information, not the picture.
- **A style is a way of making marks:** medium, edge quality, and the order marks are laid down, not a palette. Recoloring one style into another is a palette swap.
- **Realism is stated.** For any animal, object, or person drawn from reference, the piece names the anatomy, the view, and the reference actually opened. Subjects assembled from ellipses and figures with rubber joints are the common tells of mechanical shape-assembly.
- **Prove the look on one still,** then build everything else; a style judged only after full production is expensive to change.
- **Animated pieces never go dead:** something visibly changes every second, and a piece meant to draw itself is drawn, not faded in.
- **Style characters** (mascots, figures) need written rules: proportions, features, allowed poses, and where they never appear.

## Failure modes
- **Inaccurate depiction by illustration** — generated or stylized art shows features the product lacks. *Recognize:* part census differs from CAD or BOM.
- **Empty abstraction** — blobs, orbs, gradients that fit any product. *Recognize:* swap the product and the image still works.
- **Misleading chart** — truncated axis, cherry-picked range, mixed units. *Recognize:* redraw from the data with zero baseline and the story changes.
- **Number without source** — plotted values with no ledger id or dataset path. *Recognize:* chart data hard-coded in the SVG.
- **Mixed icon sources** — stroke widths and radii differ. *Recognize:* the set of distinct stroke-widths in the SVG files has more than one member.
- **Text baked into raster** — unreadable, untranslatable, inaccessible. *Recognize:* words visible in a PNG with no live-text source.
- **Metaphor collision** — symbol that means something else here (cloud for local-only software, padlock for a feature that isn't encryption). *Recognize:* a viewer asked for the meaning says something else.
- **Altitude mix** — overview and detail drawn together. *Recognize:* two boxes in one diagram differ by an order of magnitude in what they contain.
- **Illegible at use size** — works on a canvas, fails at the page. *Recognize:* smallest text under 12 px at display size or contrast under 4.5:1.
- **Convention break** — exploded parts displaced off-axis or out of order, callouts numbered by position instead of BOM. *Recognize:* a builder following the picture assembles it wrong.
- **Character drift** — the same figure drawn differently shot to shot. *Recognize:* overlaying key poses of one character shows changed proportions or features.
- **Style drift** — new pieces follow taste rather than the direction rules. *Recognize:* rule ids not cited.

## Check
1. Data trace: every plotted or printed number traces to a ledger id or a data file path; regenerating the chart from that file reproduces the image; bar baselines are zero.
2. Icon grid: programmatic scan of the SVG set finds one stroke width, one corner radius set, and pixel-snapped output at 16 and 24 px.
3. Part census for any exploded or cutaway view: part count and order equal the CAD or BOM; extra or missing parts are listed with a decision id.
4. Legibility render at the real display size and on the darkest supported background: smallest text ≥ 12 px and ≥ 4.5:1 contrast.
5. Color-vision simulation (deuteranopia and protanopia): every data series remains distinguishable, or has direct labels.
6. Text equivalent: each complex diagram has a long description that states its mechanism without the image; a reader of only the text can answer the diagram's one question.
7. Meaning test: ask what each metaphor stands for before revealing it; record the answers; mismatches are replaced.

## Writes to proposals
- `claims`: mechanisms and numbers the visuals state, with the source that supports them (or the gap as an `unknowns` row).
- `form`: internal arrangement learned while diagramming.
- `actors`: reading contexts that change how a visual must work (print, projector, small phone, grayscale, screen reader).
- `unknowns`: internal structure not documented, data series missing.
- `decisions`: icon grid and chart conventions, style-character rules.
- Direction-token gaps encountered, as `change` proposals.
