built_from: model@10
reads: [purpose, actors, form, voice, positioning, claims, decisions]
cites: [C2, C17, C34, C81]
public: false
status: final

# Creative direction: the calibrated instrument, at launch scale

Tokens: `brand/tokens.css` (the only place a colour, family or size is set). Fonts: `brand/fonts/` (Atkinson Hyperlegible Next, JetBrains Mono; both OFL-1.1, vendored so site and film render the same anywhere). Colour values are the product's own design system (DESIGN.md at the repository root), so the brand is the product's face, not a skin over it.

## Register, scene, axes
- **Register:** brand for the site and film, where the design is the product; product for any screenshot of the cockpit, which stays as shipped.
- **Scene sentence:** a technical founder at a desk in the evening, one monitor, lamp light mixed with screen light, reading a launch gate to decide whether they can stand behind it. Long reading, mixed light, a verdict to trust: light tinted-graphite surfaces by default, dark by the system preference, and neither is a mood.
- **Axes, each chosen by exclusion:** tone exact and dry-witted: provocative about a norm, never about a person (excludes hype, urgency, fear, and any joke at a buyer's expense); density restrained, with room around one dense object per view (excludes maximalist AI-product chaos); stance peer who shows the work (excludes authority by logo wall, coach, mascot); sensory ambition considered (excludes spectacle). Tension recorded: "restrained" plus a launch film that is meant to be sticky. Resolution (D19): the spectacle is spent on one thing, making the absurdity of "done" visible, and every movement is a state change that points at the message.
- **Colour strategy:** restrained. Tinted graphite neutrals, one accent, and the seven grade hues, which appear only when they label a grade.

## Rules (cite by id)
- **D-R1 Colour is a data channel.** A grade hue appears only on or beside the grade it names [C2]. Status colours appear only as status. If a colour means nothing it is not used.
- **D-R2 One accent.** Instrument Teal marks focus, the current step and the primary action, on at most one element per view.
- **D-R3 No glow, gradient, glass, orb, confetti, or celebration.** A no-go must be able to look like a no-go.
- **D-R4 Type.** Two families, roman headings, scale steps of at least 1.25, measure 68 characters. The stamp (`built_from: model@N`), claim ids, commands and grades are always mono.
- **D-R5 One signature.** The signature is the stamp line and the grade chip. Each view spends distinctiveness on one of them and nothing else.
- **D-R6 Motion is micro, luxe and semantic.** Each movement says something or points at the message: the mark's dashed frame closes as the page is scrolled (the product is being finished), cards are dragged to Done by an agent, the usual answer is struck as ours lands, a refusal nudges once, stale work dims under a warm wash. 140 ms to 900 ms, exponential ease-out, never a loop, never decoration, nothing that moves layout. Reduced-motion removes all of it and the page is whole without it.
- **D-R7 Structure by hairlines.** Left-aligned asymmetric grid; rules, not cards; never nested cards, never identical card grids.
- **D-R8 Real over invented.** Screenshots of the shipped cockpit and diagrams drawn from the repository's own data. No stock, no 3D, no invented dashboards, no logos of users (none exist, U2).
- **D-R9 Sound.** One voice, dry. A score is allowed when it serves the scene: synthesised from code (no third-party audio), ducked under the voice, tense while the norm is shown, resolving to a major chord at the end card; effects mark state changes only (a card landing, a note struck, a crack, a refusal). Never a melody that pretends an emotion the picture has not earned [C81].
- **D-R10 Wit.** Jokes land on systems and habits (a board, a test run, a demo, a launch week), never on a person, a company or a named product; one per beat; the line after the joke is a fact.
- **D-R11 Pain first.** Show the obvious pain before the product appears; features and mechanism come after the relief is wanted. Jargon in small doses: one load-bearing term at a time.

## Exclusions, each against a category reflex
1. No neon-on-black terminal look, though the buyer lives in a terminal: the product's own anti-references forbid it and it hides uncertainty behind atmosphere.
2. No purple-to-blue gradients or glowing "AI confidence" objects: confidence here is a graded claim.
3. No hero-metric tiles: every number must be a ledger claim, and no outcome numbers exist (U2).
4. No customer logos, quotes or avatars: none exist.
5. No mascot, no brain, no sparkles. The one drawn robot is Mote, the fictional unit of the hardware example, shown in film 3 as an object under test and never as the brand.
6. No call to "use it" that hides the license: wherever the code is offered, the license (AGPL-3.0) is named beside it [C17].

7. No joke at a person, company or named product, and no claim of superiority (C36): the usual answer in a comparison is always a habit.

## Mark and wordmark (executed by illustration)
Wordmark "Product Actualizer" in Atkinson Hyperlegible Next 800; "Architect" is never in the public lockup. Symbol: a square frame that is dashed where nothing is proven and solid where evidence exists, with a solid block set in the solid corner: potential closing around the actual. It must hold at 16 px, in one colour, reversed on dark; three failures at the application tests demote it from primary. Name screening is incomplete [C34].

## Art-direction briefs
**Site (premise: the page shows the mechanism by letting the visitor change a claim).**
- Look: D-R1..D-R11; hero is a live ledger, not an illustration; one interactive object per major section; real cockpit screenshots in a `<figure>` with a hairline, no re-drawn chrome. The first section after the hero shows the pain (a board that calls things done, then four questions it cannot answer) so the comparison is seen before it is explained.
- Execution: static HTML, CSS, ES modules; no framework; no runtime network except none; fonts local; budget 150 KB transfer excluding screenshots and the film.
- Approval bar: approved = every number traces to a claim id and the interaction runs the product's own validator; not approved = any sentence a sceptic can ask "says who?" of with no id.

**Film (premise: "done" is a status anyone can set; the gap between made and real has no owner).**
- Look: dark by choice (an evening viewer, possibly on a phone), the site's tokens in motion. Eight beats: a board where an agent moves cards to Done; three "done" items undone by what they leave out; the gap between made and real; a render that has never failed a drop test; the plot pinned to one model; four questions with the usual answer against ours; the agent refused; the end card. Captions burned in for no-sound viewing.
- Execution: 1920x1080, 30 fps, deterministic from source; voice per audio-sound; score and effects synthesised from code; 70 to 90 s.
- Approval bar: approved = every on-screen fact traces to a claim id or is plainly a premise (a joke about a habit), each beat changes one value, and no joke lands on a person; not approved = a beat that only decorates, or a laugh at a buyer.
- Earlier films are kept and superseded: film 1 (`media/explainer/`) and film 2 (`media/explainer-2/`).

**Social (premise: one claim, one grade).** Open Graph 1200x630, avatar 512x512, launch visual 1080x1350 (4:5) with the 1:1 crop safe at 1080x1080: the headline and the stamp stay inside the central 80%.

## Variant matrix
| deliverable | ratios | what each crop keeps | what moves |
|---|---|---|---|
| OG card | 1.91:1 | headline, stamp, mark | grade strip |
| Avatar | 1:1 | symbol only | nothing |
| Launch visual | 4:5, 1:1 | headline, stamp | ledger rows reflow |
| Film | 16:9 | all | poster frame is the comparison, complete |

## Token audit
Contrast ratios are computed for 50 text and background pairs, light and dark, by `actualize/evidence/direction/contrast.mjs`; result in `contrast.txt`: none below 4.5:1. Families: 2. Every colour has a role name in `brand/tokens.css`. Scale: 1.25.

## Rights
All type is OFL-1.1 (licenses in `brand/fonts/`). No photography, stock or third-party imagery is used, and the score and effects are synthesised by code in the repository [C81]. Screenshots are of this repository's own cockpit.

## Rebuild note
Rebuilt at model@4 after D10 (language policy). Changes: None to content; D10 touched decisions, which this lens reads.

Rebuilt at model@5 after D11: no content change.

Rebuilt at model@6 after D12: exclusion 6 changed from withholding the invitation to naming the license beside it.

Rebuilt at model@7 after D15 (the license event recorded as C68): no content change.

Rebuilt at model@8 after D16 (license restated as AGPL-3.0): no other change.

Rebuilt at model@10 after D19 and D20: motion and sound rules rewritten (D-R6, D-R9), wit and pain-first rules added (D-R10, D-R11), the film brief replaced by film 3, one new exclusion.
