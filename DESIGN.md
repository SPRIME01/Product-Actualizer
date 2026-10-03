---
name: Product Actualizer
description: An evidence instrument. Tinted graphite surfaces, one accent, and colour that only ever means something.
colors:
  surface-base: "oklch(97.0% 0.002 248)"
  surface-panel: "oklch(99.3% 0.002 248)"
  surface-raised: "oklch(98.2% 0.002 248)"
  ink-primary: "oklch(20.7% 0.012 254)"
  ink-secondary: "oklch(43.5% 0.019 254)"
  ink-tertiary: "oklch(51.0% 0.017 251)"
  accent: "oklch(50.1% 0.091 224)"
  accent-on: "oklch(98.5% 0.004 224)"
  accent-wash: "oklch(94.5% 0.018 218)"
  state-ok: "oklch(51.0% 0.114 156)"
  state-warn: "oklch(50.8% 0.108 73)"
  state-danger: "oklch(50.1% 0.178 29)"
  state-unknown: "oklch(50.6% 0.019 251)"
  grade-observed: "oklch(51.0% 0.114 156)"
  grade-verified: "oklch(47.5% 0.083 180)"
  grade-reported: "oklch(48.5% 0.133 255)"
  grade-inferred: "oklch(50.8% 0.108 73)"
  grade-proposed: "oklch(46.7% 0.152 301)"
  grade-unknown: "oklch(50.6% 0.019 251)"
  grade-contradicted: "oklch(50.1% 0.178 29)"
  border-strong: "oklch(90.2% 0.006 255)"
  border-soft: "oklch(93.9% 0.005 258)"
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.06em"
  mono:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "3px"
  md: "4px"
  lg: "5px"
  pill: "999px"
spacing:
  hairline: "2px"
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
components:
  button:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "3px 10px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    rounded: "{rounded.md}"
    padding: "3px 10px"
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  grade-badge:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.grade-observed}"
    rounded: "{rounded.sm}"
    padding: "0 5px"
  callout:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "7px 10px 7px 30px"
  input:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "5px 7px"
  status-rail:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.ink-secondary}"
    height: "44px"
---

# Design System: Product Actualizer

## 1. Overview

**Creative North Star: "the calibrated instrument"**

This system looks like equipment, not like an app. Its whole purpose is to make the difference between what is known and what is merely believed impossible to miss, so every visual decision serves legibility of evidence. Density is the point: an expert reads this closely, and every pixel spent on decoration is a pixel stolen from the facts. Nothing here is trying to be pleasant. It is trying to be trustworthy at a glance.

The palette is deliberately unremarkable. Tinted graphite neutrals in OKLCH, chroma held under 0.02 at a cool hue near 250, so nothing vibrates and nothing competes with the coloured things. There is exactly one accent, a muted teal-blue, rationed to selection, focus, and primary actions. Everything coloured beyond that is a process meaning: ok, warning, danger, unknown, and the seven evidence grades.

This is Restrained strategy, taken as a discipline rather than a default. It is what the product's own anti-references demand: no SaaS admin card grids, no hero metrics, no chat UI, no gamified progress, and above all **no confidence smoothing** (PRODUCT.md). A no-go gate must be able to feel like a no-go gate.

Layout is one fixed rail above a docking workspace, and the rail is capped at a fifth of the viewport including its drawer. Below the workspace sits the Work Terminal: one input line with a mode chip, the last result, and, when work is queued, a strip of request chips that state their real lifecycle status. It is a command line for the work, never a chat: no bubbles, no assistant voice, and no claim that anything ran that an executor did not report. A surface is a sticky header plus a stack or two-column grid of blocks. Borders do the structural work that shadows would do in a softer system. The system rejects any interface where a viewer could not tell at a glance which parts are checked fact and which parts are the agent's opinion.

**Key Characteristics:**
- Colour is a data channel, never decoration. If it means nothing, it does not appear.
- One accent, used sparingly enough that its presence is informative.
- Every grade, status, and verdict carries a text or glyph cue as well as a hue.
- Fixed type scale, no fluid type, tabular numerals everywhere a number can change.
- Motion is 120 to 150 ms and only ever reports a state change.
- Light and dark both defined; the system preference wins unless `data-theme` overrides.
- **The Deviation-Leads Rule.** The cockpit conspires toward the declared desired outcome by making the material deviation and the next affordable corrective move visually dominant, while never suppressing contradicting evidence. The destination stays legible, a contradiction outranks the owner's wish, healthy state recedes, one move is marked and is never a blocked one, and a blocked move states what blocks it in its own row. The reading order is the point, not the furniture: destination, where we are, the deviation, the move, what it costs and who may take it, how we will know, what opens. It is expressed with the existing blocks and tokens.

## 2. Colors

A cool graphite neutral spine in three depths, one teal-blue accent, four process semantics, and a seven-step grade scale. Light values sit high and low-chroma; the dark set is the same hues re-stepped for a dark room, not an inversion.

### Primary
- **Instrument Teal** (oklch(50.0% 0.091 224) light; oklch(73.2% 0.106 219) dark): the single accent. Selection, focus rings, the active tab, primary buttons, drag-target borders, pinned markers, progress fill. It is the only colour allowed to mean "you are here" or "act on this", and it is rationed so that seeing it means something.
- **Accent Wash** (oklch(94.5% 0.018 218) light; oklch(29.9% 0.040 222) dark): the accent at background strength, for selected rows, chosen options, and note callouts. Never for borders on their own.

### Neutral
- **Base Ground** (oklch(97.0% 0.002 248) light; oklch(18.1% 0.007 258) dark): the page behind everything.
- **Panel** (oklch(99.3% 0.002 248) light; oklch(21.6% 0.009 256) dark): the working surface. Rails, surfaces, sticky headers, the toast. One step off the base, which is the only depth cue most of this system needs.
- **Raised Panel** (oklch(98.2% 0.002 248) light; oklch(24.2% 0.011 254) dark): inputs, metrics, documents, tree and table interiors, group rows. The second step, used when content sits inside a panel.
- **Ink** (oklch(20.7% 0.012 254) light; oklch(93.6% 0.005 258) dark): body text and anything a reader must not miss.
- **Ink Secondary** (oklch(43.5% 0.019 254) light; oklch(75.8% 0.015 255) dark): supporting prose, summaries, descriptions.
- **Ink Tertiary** (oklch(51.0% 0.017 251) light; oklch(62.0% 0.018 254) dark): micro-labels, counts, hints, de-emphasised metadata. Never body copy.
- **Rule Strong** (oklch(90.2% 0.006 255) light; oklch(30.7% 0.014 257) dark): interactive borders and table headers.
- **Rule Soft** (oklch(93.9% 0.005 258) light; oklch(27.1% 0.013 258) dark): internal row separators and header underlines. The subdivision level.

### Semantic (process meaning, never decoration)
- **Verdict Green** (oklch(51.0% 0.114 156) light): ok, done, satisfied, go, handled.
- **Caution Amber** (oklch(50.8% 0.108 73) light; oklch(78.5% 0.131 82) dark): running, open, stale, pending, waiting, and the amber warning tint.
- **Halt Red** (oklch(50.1% 0.178 29) light; oklch(72.6% 0.136 25) dark): failed, rejected, no-go, contradicted, invalid, destructive.
- **Unknown Slate** (oklch(50.6% 0.019 251) light; oklch(71.1% 0.018 251) dark): deliberately near-neutral. An unknown claim should look like an absence of knowledge, not like a sixth opinion. It carries no chroma on purpose.

### Evidence Grades
The seven claims-ledger values, each a distinct hue reserved for exactly one meaning. `OBSERVED` shares Verdict Green and `CONTRADICTED` shares Halt Red deliberately, because a grade and a status are the same axis of judgement at different scales.

- **Observed** (oklch(51.0% 0.114 156) light; oklch(74.1% 0.137 158) dark)
- **Verified** (oklch(47.5% 0.083 180) light; oklch(74.1% 0.112 180) dark): a deeper cyan, one step darker than Observed so the two stay separable under tritanopia.
- **Reported** (oklch(48.5% 0.133 255) light; oklch(72.1% 0.119 254) dark): the blue of assertion-from-somewhere-else.
- **Inferred** (oklch(50.8% 0.108 73) light; oklch(78.5% 0.131 82) dark): amber, shared with Caution. Inference is a caution.
- **Proposed** (oklch(46.7% 0.152 301) light; oklch(71.0% 0.140 304) dark): the only violet, reserved so that anything speculative is unmistakable.
- **Unknown** (oklch(50.6% 0.019 251) light; oklch(71.1% 0.018 251) dark): no chroma, same as Unknown Slate.
- **Contradicted** (oklch(50.1% 0.178 29) light; oklch(72.6% 0.136 25) dark): the only grade with a background wash (danger-bg) behind it, because a contradiction must interrupt.

**The Grade Never Stands Alone Rule.** A grade is always rendered as its name in mono text, and `CONTRADICTED` additionally carries a background tint. Measured under simulation, `OBSERVED` and `VERIFIED` collapse to a perceptual distance of about 3 under tritanopia, and `INFERRED` and `CONTRADICTED` to under 10 under deuteranopia and protanopia. The hue cannot carry the meaning, so the text always does. A bare colour dot for a grade is prohibited.

**The One Voice Rule.** The accent appears on at most a tenth of any screen. When it is everywhere, it is telling you nothing; reserve it for the current selection, the focus ring, and the one action being offered.

## 3. Typography

**Body Font:** ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif (with no webfont; the system stack is the fallback and the whole stack is the family)
**Label/Mono Font:** ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace (with each listed face tried in turn)

**Character:** one sans for every piece of language, one mono for every identifier. The split is semantic, never decorative: if a string is a claim id, a path, a grade, a count that must not reflow, or source code, it is mono. If a human wrote it to be read, it is sans. No display face exists in this system, and introducing one is prohibited.

### Hierarchy
- **Title** (400, 15px): surface titles and the empty-state heading. The largest thing on any screen, and only barely.
- **Body** (400, 13px/1.45, antialiased): the default for everything read as prose. 13px is a deliberate floor; do not drop to 12 for body copy.
- **Label** (400, 11px, 0.06em tracking, uppercase): block titles, column heads, rail micro-labels, metric captions. Uppercase only here.
- **Small** (400, 12px): summaries, secondary descriptions, tree labels.
- **Metric Value** (600, 22px/1.1, tabular): the one large number in the system, and it belongs to a single figure with a grade or status attached.
- **Mono Data** (400, 12px, tabular): ids, refs, durations, line numbers. A 10.5 to 11.5px mono tier carries grade badges and chips.

**The Fixed Scale Rule.** Steps are 11, 12, 12.5, 13, 15, and 22px. Never fluid, never `clamp()`. A product tool is read at a consistent DPI, and a heading that resizes with the window is a heading that misaligns its neighbours. The scale ratio stays tight (roughly 1.1); exaggerated contrast in a dense tool is noise.

**The Tabular Rule.** Every number that can change while someone is watching gets `font-variant-numeric: tabular-nums`. Values must not jitter horizontally as a count ticks from 9 to 10 or a duration advances.

## 4. Elevation

This system is flat by default and separates depth with tonal steps and 1px borders, not shadows. There is exactly one shadow in the whole stylesheet, on the transient toast, because a floating element genuinely leaves the plane. Panels never cast one; docked surfaces never cast one. Structure is communicated by `--panel` against `--panel-2` against `--bg`, and by `--line` against `--line-soft`, which is enough at this density and never competes with the coloured process signals.

### Shadow Vocabulary
- **Transient Lift** (`box-shadow: 0 4px 20px oklch(20% 0.01 250 / .25)`): the toast, and pinned media markers on images. The only sanctioned elevation in the system.
- **No shadow for hover, focus, or drag.** A state change is communicated by border colour and background tint. Adding a shadow there is a tell that the interface is showing off.

**The Flat-By-Default Rule.** Surfaces are flat at rest. If a shadow has crept into a persistent component, it is wrong: replace it with a one-step tonal difference or a 1px border.

## 5. Components

### Buttons
- **Shape:** barely rounded (4px), never pill, never large. Padding 3px 10px.
- **Default:** panel background, 1px `--line` border, primary ink.
- **Hover:** border to `--accent`. The background does not change; the border is the signal.
- **Primary:** accent fill, `--accent-ink` text, 600 weight. Exactly one per view, on the action the surface is actually offering.
- **Danger:** red ink on the default background. Never a red fill; a filled red button is a trigger, not a variant.
- **Focus:** 2px `--accent` outline at 1px offset, via `:focus-visible`. The same ring on every focusable element in the system.
- **Disabled:** 50% opacity, `not-allowed`. The one place reduced opacity is acceptable, because disabled must read as unavailable.

### Grade Badge
Mono, 10.5px, 600 weight, 1px border in `currentColor`, 3px radius, padding 0 5px. Renders the grade's name, never an icon. `CONTRADICTED` adds a danger background. A grade is a readout, not a control, so it has no hover or focus state.

### Status Badge
11px, 3px radius, 1px border, colour by meaning: green for ok/done/go/satisfied/handled, amber for running/open/stale/pending/waiting, red for failed/rejected/no-go/invalid. The word is the message; the colour is the fast path. Because the same word-class appears in many contexts, a status is never shortened to its initial.

### Chips
Pill (999px), `--panel-2` background, 1px `--line`, 11.5px, holding a count in tabular numerals. They summarise process state in the rail: unknowns, contradictions, open proposals, stale artifacts. At zero, a chip dims to 55% rather than disappearing, so the absence of a problem is still visible as a checked value. Tinted variants reuse the semantic pairs for danger, warn, and ok.

### Verdict Badge
Uppercase, 600 weight, 11.5px, 0.03em tracking, on a tinted background with a matching border. Reserved for the release gate. It is the only badge permitted to shout, because it is the only answer the owner is accountable for.

### Callouts
1px border, 5px radius, `--panel-2` background, and a 30px left padding that reserves room for a leading glyph in a 14px circle: `i` for a note, `!` for warning and danger, a check for ok, `?` for unknown. The glyph is a `::before` on the circle, so the semantic is carried by shape as well as hue. **Callouts use a full border and a leading glyph, never a coloured side stripe.** A 1px accent stripe down the left edge of a card is prohibited throughout this system.

### Tables
12.5px, collapsed borders, sticky uppercase 11px headers on `--line` at 500 weight. Row separators are `--line-soft`; group rows invert to `--panel-2` at 600 weight. Hover tints the row to `--panel-2`, selection to `--accent-soft`, and a highlighted row gets both the `--warn-bg` tint and a leading `▸` marker so the highlight survives greyscale. Numeric cells are mono, right-aligned, 12px, tabular. Wrapping cells cap at 460px rather than running to the viewport.

In a Case view the group rows are lanes: **next move**, **choose**, **alternatives**, **blocked**. Only the next-move lane is set in capitals with an accent rule (one per view); alternatives are muted; blocked is danger text and the reason is in the row. A lane exists only if it has rows, and a view carries a table only if it has something to say.

### Tree Rows
12.5px, 2px 4px padding, 3px radius, 14px twisty column, label truncating with an ellipsis, mono duration at the right. Row hover to `--panel-2`, selection to `--accent-soft`. A 4px duration bar in `--accent` at 55% opacity shows relative cost inline.

### Inputs and Controls
Text inputs, textareas, and selects share `--panel` background, 1px `--line` border, 4px radius, 5px 7px padding. Checkboxes and radios are custom-drawn at 15px with a 1.5px `--ink-3` border (3px square for checkbox, full circle for radio); checked, they fill `--accent` and the inner mark scales in over 120ms on an ease-out-quart curve. A checkbox's mark is a clip-path polygon, not a glyph, so it renders identically everywhere.

### Option Rows
For grouped choices and multiple selects: 6px 8px padding, 1px `--line`, 4px radius, with hover and selected both moving to an `--accent` border over `--accent-soft`. Cons (the reason against an option) render in `--warn`, so the trade-off is visible before the choice is made.

### Preflight Panel
The state-changing physical action block, and the highest-consequence component in the system. 1px `--warn` border by default with a `--warn-bg` header row; the `irreversible` variant switches both header and border to danger and turns the header text red. A two-column description list pairs field names in `--ink-3` against their values. Nothing in this panel is a light click, which is the point: this is where a real machine can be powered, flashed, or moved.

### Agent Tag
A 10px dashed `--warn` border, radius 3px, reading `agent-supplied`. Dashed rather than solid is deliberate: it is a provenance mark, not a status. Any value the agent invented rather than read from the run directory carries this tag. Inline data in an ask, a note, or a table cell is always tagged.

### Rail
The fixed top process bar, 44px collapsed and never more than 20vh including its drawer, on `--panel` with a `--line` bottom border. It carries product name and id, phase, the next action, state chips, verdict, owner-needed flag, a 7px connection dot, and a lens-pill row in the expandable drawer. It is chrome, not a surface: no action can be added to it, removed from it, or edited in it.

### Prose and Documents
Rendered documents use 12px/1.5 mono with `pre-wrap` and `overflow-wrap: anywhere`, line numbers right-aligned in a 42px gutter. Highlighted lines take `--warn-bg`. Markdown bodies run in sans at 12px. A sticky annotate bar sits at the bottom of a document; the 65 to 75ch measure applies to running prose, not to code or tables.

## 6. Do's and Don'ts

### Do
- Use colour only where it carries a grade, status, severity, or verdict. If you cannot name the meaning, delete the colour.
- Pair every grade and status with its word or glyph. The hue is the shortcut; the text is the fact.
- Spend screen space on the next useful affordance, not on a menu of every affordance.
- Let evidence lead. When the destination and the evidence disagree, the evidence is the dominant row, in plain words, with no optimistic framing.
- Keep the accent scarce: selection, focus, and at most one primary action per view.
- Use tabular numerals anywhere a value can change under the reader's eye.
- Cap the rail at a fifth of the viewport and let the workspace take the rest.
- State what the owner just recorded, and what it did not change, right where they acted.

### Don't
- **No SaaS admin clichés.** No identical card grids of icon-plus-heading-plus-text, no hero metric with supporting stat row, no gradient accent. PRODUCT.md names these as anti-references and the Don'ts repeat them deliberately.
- **No chat UI.** This is not a conversation. Attaching evidence to a message thread is not a model of the work, and the cockpit is not a chat client.
- **No confidence smoothing.** Never soften a no-go gate, an unknown, or a contradicted claim into an encouraging nudge. A gate that blocks must feel like it blocks. Do not add a progress ring implying momentum the evidence does not support.
- **No gamified progress.** No streaks, confetti, celebration, or congratulation for work not actually done. Nothing animates on load.
- **No side-stripe borders.** A coloured `border-left` or `border-right` thicker than 1px on a card, row, callout, or alert is prohibited. Use a full border, a background tint, or a leading glyph.
- **No gradient text, glassmorphism, or glow.** No `background-clip: text` gradients, no decorative backdrop blur, no neon or bloom. No dark-mode-terminal cosplay either: this is a graphite instrument, not a hacker screen.
- **No nested cards.** A bordered block inside a bordered block reads as noise. Blocks get a title and a border only when they hold an interaction.
- **No colour-only encoding.** Not for grades, not for status, not for a verdict, and never a bare dot as the sole indicator of an evidence value.
- **No fluid type and no display face.** The fixed 11 to 22px scale and the sans-plus-mono pairing are the whole system.
- **No decorative motion.** Transitions run 120 to 150ms on colour and border only, easing out on `cubic-bezier(.22, 1, .36, 1)`, and every one collapses under `prefers-reduced-motion`.
- **No motion that isn't a state change.** If it is not reporting that something happened, it does not move.
