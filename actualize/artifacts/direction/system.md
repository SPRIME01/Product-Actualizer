built_from: model@8
reads: [purpose, actors, form, voice, positioning, claims, decisions]
cites: [C2, C17, C34]
public: false
status: final

# Creative direction: the calibrated instrument, at launch scale

Tokens: `brand/tokens.css` (the only place a colour, family or size is set). Fonts: `brand/fonts/` (Atkinson Hyperlegible Next, JetBrains Mono; both OFL-1.1, vendored so site and film render the same anywhere). Colour values are the product's own design system (DESIGN.md at the repository root), so the brand is the product's face, not a skin over it.

## Register, scene, axes
- **Register:** brand for the site and film, where the design is the product; product for any screenshot of the cockpit, which stays as shipped.
- **Scene sentence:** a technical founder at a desk in the evening, one monitor, lamp light mixed with screen light, reading a launch gate to decide whether they can stand behind it. Long reading, mixed light, a verdict to trust: light tinted-graphite surfaces by default, dark by the system preference, and neither is a mood.
- **Axes, each chosen by exclusion:** tone exact, not provocative (excludes hype, urgency, fear); density restrained, with room around one dense object per view (excludes maximalist AI-product chaos); stance peer who shows the work (excludes authority by logo wall, coach, mascot); sensory ambition considered (excludes spectacle). Tension recorded: "restrained" plus a launch film. Resolution: the film's only spectacle is state change.
- **Colour strategy:** restrained. Tinted graphite neutrals, one accent, and the seven grade hues, which appear only when they label a grade.

## Rules (cite by id)
- **D-R1 Colour is a data channel.** A grade hue appears only on or beside the grade it names [C2]. Status colours appear only as status. If a colour means nothing it is not used.
- **D-R2 One accent.** Instrument Teal marks focus, the current step and the primary action, on at most one element per view.
- **D-R3 No glow, gradient, glass, orb, confetti, or celebration.** A no-go must be able to look like a no-go.
- **D-R4 Type.** Two families, roman headings, scale steps of at least 1.25, measure 68 characters. The stamp (`built_from: model@N`), claim ids, commands and grades are always mono.
- **D-R5 One signature.** The signature is the stamp line and the grade chip. Each view spends distinctiveness on one of them and nothing else.
- **D-R6 Motion reports change.** 140 to 220 ms, exponential ease-out, only when a value changed. No motion on load. Reduced-motion removes all non-essential motion.
- **D-R7 Structure by hairlines.** Left-aligned asymmetric grid; rules, not cards; never nested cards, never identical card grids.
- **D-R8 Real over invented.** Screenshots of the shipped cockpit and diagrams drawn from the repository's own data. No stock, no 3D, no invented dashboards, no logos of users (none exist, U2).
- **D-R9 Sound.** One voice, dry. No music that pretends an emotion. If a bed exists it sits under -30 LUFS short-term and carries no melody.

## Exclusions, each against a category reflex
1. No neon-on-black terminal look, though the buyer lives in a terminal: the product's own anti-references forbid it and it hides uncertainty behind atmosphere.
2. No purple-to-blue gradients or glowing "AI confidence" objects: confidence here is a graded claim.
3. No hero-metric tiles: every number must be a ledger claim, and no outcome numbers exist (U2).
4. No customer logos, quotes or avatars: none exist.
5. No mascot, no robot, no brain, no sparkles.
6. No call to "use it" that hides the license: wherever the code is offered, the license (AGPL-3.0) is named beside it [C17].

## Mark and wordmark (executed by illustration)
Wordmark "Product Actualizer" in Atkinson Hyperlegible Next 800; "Architect" is never in the public lockup. Symbol: a square frame that is dashed where nothing is proven and solid where evidence exists, with a solid block set in the solid corner: potential closing around the actual. It must hold at 16 px, in one colour, reversed on dark; three failures at the application tests demote it from primary. Name screening is incomplete [C34].

## Art-direction briefs
**Site (premise: the page shows the mechanism by letting the visitor change a claim).**
- Look: D-R1..D-R9; hero is a live ledger, not an illustration; one interactive object per major section; real cockpit screenshots in a `<figure>` with a hairline, no re-drawn chrome.
- Execution: static HTML, CSS, ES modules; no framework; no runtime network except none; fonts local; budget 150 KB transfer excluding screenshots and the film.
- Approval bar: approved = every number traces to a claim id and the interaction runs the product's own validator; not approved = any sentence a sceptic can ask "says who?" of with no id.

**Film (premise: an agent says done, and the model says what is true).**
- Look: the site's tokens in motion; scenes are state changes of one ledger: claim graded, artifact built from model@N, claim downgraded, artifact stale, gate refuses, evidence added, gate passes. Captions burned in for no-sound viewing, large enough at 390 px width.
- Execution: 1920x1080, 30 fps, deterministic from source; voice per audio-sound; target 70 to 90 s.
- Approval bar: approved = every on-screen claim has a ledger id and each scene changes at least one value; not approved = a scene that only decorates.

**Social (premise: one claim, one grade).** Open Graph 1200x630, avatar 512x512, launch visual 1080x1350 (4:5) with the 1:1 crop safe at 1080x1080: the headline and the stamp stay inside the central 80%.

## Variant matrix
| deliverable | ratios | what each crop keeps | what moves |
|---|---|---|---|
| OG card | 1.91:1 | headline, stamp, mark | grade strip |
| Avatar | 1:1 | symbol only | nothing |
| Launch visual | 4:5, 1:1 | headline, stamp | ledger rows reflow |
| Film | 16:9 | all | poster frame is scene 1 |

## Token audit
Contrast ratios are computed for 50 text and background pairs, light and dark, by `actualize/evidence/direction/contrast.mjs`; result in `contrast.txt`: none below 4.5:1. Families: 2. Every colour has a role name in `brand/tokens.css`. Scale: 1.25.

## Rights
All type is OFL-1.1 (licenses in `brand/fonts/`). No photography, stock, music, or third-party imagery is used. Screenshots are of this repository's own cockpit.

## Rebuild note
Rebuilt at model@4 after D10 (language policy). Changes: None to content; D10 touched decisions, which this lens reads.

Rebuilt at model@5 after D11: no content change.

Rebuilt at model@6 after D12: exclusion 6 changed from withholding the invitation to naming the license beside it.

Rebuilt at model@7 after D15 (the license event recorded as C68): no content change.

Rebuilt at model@8 after D16 (license restated as AGPL-3.0): no other change.
