# Cockpit: design

Color strategy: Restrained. Tinted graphite neutrals (OKLCH, chroma under 0.02 at hue 250), one accent (teal-blue, hue 224) for selection, focus, and primary actions only. Semantic roles carry process meaning and nothing else: ok, warning, danger, unknown, and the seven claim grades (OBSERVED, VERIFIED, REPORTED, INFERRED, PROPOSED, UNKNOWN, CONTRADICTED). Light and dark follow the system; `data-theme` overrides.

Typography: system sans for UI, system mono for ids, refs, and data. Fixed scale (11, 12, 12.5, 13, 15, 22), no fluid type. Uppercase micro-labels at 11 px with tracking only for column heads and block titles. Tabular numerals for data.

Layout: rail on top (one row, expandable drawer, together at most 20vh); Dockview workspace below; minimized strip at the bottom only when needed. Surfaces are a header (title, intent, summary) and a stack or two-column grid of blocks. No nested cards; blocks are bordered only where they hold an interaction (entity, ask, preflight, chart).

Components: fifteen fixed blocks (see `protocol/spec.ts`). Every interactive one has default, hover, focus-visible, disabled, and, where relevant, loading and error states. Callouts use a leading glyph and a full border, never a side stripe.

Motion: 120 to 150 ms color and border transitions, a single live pulse on the connection dot and a sweep on running progress; all disabled under `prefers-reduced-motion`.
