---
name: direction
description: Define the project-wide aesthetic system (creative direction) and interpret it for each deliverable (art direction). Use before any visual, motion, or audio artifact is produced.
reads: [purpose, actors, form, voice, positioning, claims, decisions]
needs: [brand]
executes_with: [hallmark, impeccable]
---
# Creative direction and art direction

## Reads from the model
`form` (real materials, colors, proportions), `voice`, `positioning`, `actors` (where and how the product is met), `claims` (what visuals may show), `decisions` (earlier aesthetic choices).

## Distinctions
- **Ownership.** Brand decides who the product is and how it speaks; direction decides how that looks, moves, and sounds. Where the two conflict, brand wins and direction revises. Visualization owns faithful depiction of the real object; illustration owns non-literal visuals; direction constrains both.
- **Creative direction vs. art direction.** Creative direction is decided once per project, as rules: tokens, proportion and density logic, imagery stance, motion character, sonic character, and what is excluded. Art direction is per deliverable: for this hero, this poster, this 30-second cut, which rules apply, what the subject, crop, light, and hierarchy are, and what is left out.
- **Register comes first.** In a brand register (marketing, campaign, launch film) the design is the product; in a product register (app UI, tool, device interface) it serves the product. Density, color commitment, and motion budget follow from it.
- **Color is a commitment level, chosen deliberately:** restrained (tinted neutrals plus one accent, roughly 10% of the surface), committed (one saturated color carries 30-60%), full palette (3-4 named roles), or drenched (the surface is the color). The 10% accent rule belongs to restrained only. Neutrals are tinted toward the brand hue; chroma drops toward black and white; pure #000 and #fff are not base colors.
- **Light vs. dark is derived, never defaulted.** Write one sentence naming who uses it, where, under what ambient light, in what mood; if the sentence doesn't force the answer it isn't concrete enough. "Observability dashboard" doesn't decide; "an on-call engineer scanning severity at 2 a.m. in a dim room" does.
- **A direction is its exclusions.** Moods ("warm, premium", "clean and modern") do not constrain anything; a tone is an extreme with a name (editorial, brutalist, austere, playful, technical). Constraints do: "no gradients, one accent used on at most one element per view, photography only on neutral grey".
- **Four axes, each chosen by exclusion.** Tone register (professional to provocative), visual density (restrained to maximalist), stance toward the audience (authority, peer, companion, coach), and sensory ambition (functional, considered, resonant). Each pick rules out its neighbors; choose against what the audience already gets too much of in this category. Incompatible pairings (functional + provocative) are recorded as a tension with a stated resolution, not silently accepted.
- **An art-direction brief has five parts:** premise and takeaway (what the piece is about; weak premise gives pretty work that says nothing), look, execution specs, variants, and the approval bar with examples of approved and not-approved. References are written "like X in respect A, not like X in respect B".
- **Variants are planned in the brief.** One piece must live as 16:9 hero, 4:5 or 1:1, 9:16, and small ad sizes; the brief says what each crop keeps, what moves, and which assets each needs, so cropping isn't improvised at the end.
- **Rights are settled before production,** not after: usage, territory, duration, and attribution agreed before the shoot, render, or commission, because renegotiating them after the work exists costs more.
- **The retouching boundary is set in the brief.** What may be cleaned (dust, stray reflections, background) and what may not (shape, color, labels, seams, wear that is the product) is written down; retouching past it edits a claim about the product.
- **Derive from the object and the use setting,** not the category default. A field instrument used outdoors in glare and gloves has a different truth than a desk gadget.
- **Three layers:** tokens (values), rules (when a value applies, with ids so briefs can cite them), exemplar (one finished deliverable proving the system holds).
- **References are analyzed for the structural decision** (proportion, contrast logic, grid, rhythm, shot scale), then discarded; a copied surface treatment is not a direction.
- **Type decisions are numeric:** body line length capped near 65-75 characters, scale steps at least 1.25 apart so hierarchy shows, roman (not italic) headings unless the system says otherwise.
- **One signature, everything else quiet.** Decide where the system spends its distinctiveness, and make that the only place it does.
- **Cross-medium consistency:** the same system must be statable for screen, print, packaging, motion, and sound, or the direction is a web style, not a direction.

## Failure modes
- **Adjective soup** — "modern, clean, premium". *Recognize:* swap in a competitor's name and nothing in the document becomes false.
- **Category reflex, two orders deep** — the category's standard look applied without a product reason (neon-on-black for developer tools, soft gradients for AI); no rule cites a product fact. First order: the theme and palette can be guessed from the category alone (observability gets dark blue, finance gets navy and gold). Second order: they can be guessed from the category plus the obvious anti-references. *Recognize:* a stranger told only the category (and the anti-references) predicts the look.
- **Default-stack fingerprints** — unspecified defaults leak in: Inter/Roboto/system display type, gradient-filled headline text, identical icon-over-heading three-column cards, nested cards, thick colored side stripes, a centered-everything hero, hero-metric tiles, glass blur as decoration, "Acme/Jane Doe" placeholders. *Recognize:* a literal scan of the built source finds them; structural look-alike across deliverables (not just recolors) counts as one fingerprint.
- **Direction drift** — each deliverable reinterprets the system. *Recognize:* count of typefaces, colors, and corner radii across deliverables exceeds the token set.
- **Fictional materials** — brushed metal rendered for a molded plastic body. *Recognize:* a material or color in a brief that has no source in `form`.
- **Mood board without decisions** — images pinned, nothing excluded or ranked. *Recognize:* no rule id could be cited by a brief.
- **Special everywhere** — every deliverable gets a unique hero treatment. *Recognize:* more than one "signature" move in a single view.
- **Contrast sacrificed to taste** — pale-on-pale type, low-contrast accents. *Recognize:* a text/background token pair below 4.5:1 (3:1 for large text).
- **Brief exists, nobody consults it.** *Recognize:* no deliverable cites a rule id; the brief could be swapped for another and the output wouldn't change. Deviations must be logged with the reason, not silently made.
- **Retouch drift** — images polished until the product no longer matches the unit. *Recognize:* the delivered image differs from the source in shape, color, or labels beyond the stated boundary.
- **Variant improvisation** — crops and adaptations decided at export. *Recognize:* the vertical cut chops the subject or key claim.
- **Exemplar missing** — system never tested on a real layout. *Recognize:* no deliverable built from tokens alone.

## Check
1. Swap test: replace the product's name with a named competitor throughout the creative direction; if it still holds, it fails and must be rewritten with product-specific rules.
2. Exclusion count: at least three exclusions, each one a thing a designer in this category would otherwise reach for. Each cites a model fact or an actor's setting.
3. Token audit by computation: every text/background pair has its contrast ratio computed and listed; type families ≤ 2; every color has a role name; every size/spacing value is on a stated scale.
4. Traceability: every art-direction brief cites at least one rule id and every rule id is used by at least one brief or marked reserved. Every visual claim the brief makes about the product (material, color, feature) cites a model field or claim id.
5. Variant matrix: for every deliverable, each required aspect ratio has a stated crop priority; a render of each shows the subject and any claim text intact.
6. Retouch register: each delivered image lists its applied retouches; none falls outside the boundary.
7. Exemplar renders from the token file with no hand-set values; a grep of its CSS or style source for literal colors/sizes outside the tokens returns nothing.

## Writes to proposals
- `voice` or `positioning` conflicts discovered when making them visible or audible.
- `form` facts discovered in the exemplar work (actual colors, finishes, proportions), with source.
- `decisions`: the aesthetic system as a proposed decision with its rationale and exclusions.
- `unknowns`: audience conditions that change legibility (lighting, distance, devices), whether the physical product's finish is fixed or open.
- Token gaps found by fidelity-qa, as `change` proposals against the direction artifact's stated rules.
