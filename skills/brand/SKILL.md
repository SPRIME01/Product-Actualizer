---
name: brand
description: Decide who the product is: positioning, name, identity, and voice. Use when the product lacks a defended position, a cleared name, an identity system, or a voice that can be written down.
reads: [purpose, actors, constraints, voice, positioning, claims, unknowns, decisions]
needs: []
executes_with: []
---
# Brand

## Reads from the model
`purpose` and `actors` (the alternative each actor would otherwise use), `claims` (what proof exists), `constraints` (legal: names and marks), current `voice` and `positioning`, `unknowns` that block naming.

## Distinctions
- **Ownership.** Brand owns who the product is: category, difference, name, identity, voice. Marketing owns how attention is acquired. Direction owns how the identity looks and sounds in each medium. Experience owns behavior; it uses brand voice but decides what must be said and when.
- **Positioning is a decision, messaging is derived, a tagline is last.** Positioning has four parts: category the actor files it under, the named alternative they use today, the one difference that matters to them, and who it is not for. Messaging and taglines are outputs.
- **The difference must be real.** The difference must rest on a claim at `OBSERVED`/`VERIFIED`; if it rests on `PROPOSED`, the positioning is a plan, labeled so, and nothing public cites it.
- **Name is both a creative and a legal constraint:** trademark conflicts in the relevant classes and jurisdictions, domain, handles, store listing collisions, searchability (generic words are un-findable), pronounceability read aloud, and meaning in the markets served.
- **Identity is a system, the logo is its smallest part:** name treatment, mark, color roles, type, usage rules, minimum size, clear space, one-color and reversed versions, favicon/app-icon size.
- **Mark architecture is chosen from the name and the smallest context.** Wordmark, lockup, symbol, letterform-as-symbol, and monogram each serve different contexts; descriptive names invite literal symbols, abstract names need geometric ones. A typical production set is a primary lockup, a square or stacked alternate, and a favicon-grade letterform, all from one wordmark. A variant that fails three or more application contexts (favicon 16-32 px, app icon ~28 px, reversed on dark, one-color, embroidery or etched, large-format, motion) is not a primary mark.
- **Voice is traits with limits** ("direct, not curt") plus lexicon (words used, words refused) plus samples across moods: success, error, apology, legal, onboarding. Adjective lists are not a voice.
- **Availability needs depend on product type.** A developer tool must hold its repo org and package registry names; a consumer app, its domain and store listing; open source, its org and package. Checking all namespaces for all products wastes effort and hides the one that matters.
- **Ecosystem trademark policies bind names.** Platform owners restrict use of their marks inside product names (plugin and add-on marketplaces especially); "for X" as a descriptor is often allowed where "X" in the name is not.
- **Check availability after creative filtering and before attachment.** Availability must not choose the name, but it must be known before anyone is invested in it.
- **Brand architecture is decided before the second product.** One name for everything, a family with a shared endorser, or independent names each cost differently; naming sub-products without a rule creates the rename later.
- **Taglines are tested as non-claims.** A tagline is read by users as a promise; if a skeptical reader would ask "says who?", it needs a ledger-backed line beside it or it is cut.
- **Voice has a floor.** Legal, safety, security, and error copy must be unambiguous first and on-brand second; the voice guide says where personality stops.
- **A working name is labeled until screened.** Public use of an unscreened name without the label is a commitment made by accident; the label stays until the clearance table exists.
- **Equity.** If the product already has a name, users, or reputation, the choice is evolve vs. replace, and the cost of replacement is recorded. A rename is a decision, not a default.
- **The brand is for the actor, not the founder.** A positioning that only the builder would choose is a preference, not a position.

## Failure modes
- **Interchangeable positioning** — "simple, powerful, for teams", or a table-stakes difference ("great support"). *Recognize:* negate it; if no competitor would claim the opposite, or every competitor already claims it, it says nothing.
- **Uncleared name** — chosen, designed, and launched before screening. *Recognize:* no clearance table with dated sources.
- **Logo first** — mark designed before the position and name are fixed. *Recognize:* identity files predate the positioning decision in the decision log.
- **Voice by adjective** — guide of traits with no samples. *Recognize:* two different writers produce indistinguishable output from it.
- **Aspiration as fact** — "trusted by", "the fastest", "secure" stated as brand truth. *Recognize:* a proof point with no ledger id.
- **Feature-shaped name** — name boxes the product into today's function. *Recognize:* the name is the capability description.
- **Identity that breaks in use** — fails at 16 px, one color, on dark, or on a curved surface. *Recognize:* never rendered at those sizes and states.
- **Name without specificity** — compound of generic parts. *Recognize:* cover either word, or swap one for a synonym, and the name is no worse; or strip capitals and symbol substitution and what remains is a common word.
- **Self-contradicting name** — a secondary meaning undercuts the product. *Recognize:* a dictionary or idiom search of the word finds a common sense that opposes the product's function.
- **Name chosen because the domain was free.** *Recognize:* the stated virtue is availability; or it is available everywhere only because nobody wants it.
- **Unprotectable name** — generic or purely descriptive of the category. *Recognize:* the name is what the product is called in plain speech; trademark screening shows many similar uses in the same class.
- **Competitor echo** — differentiates against a straw alternative the actor does not use. *Recognize:* the "alternative" has no source in actor evidence.

## Check
1. Negation test on every positioning sentence: write the opposite; at least one real named competitor must plausibly say it. Sentences that fail are removed.
2. Alternative test: the named alternative appears in actor evidence (transcript, doc, user quote) with a source; otherwise it is `PROPOSED` and the position is marked provisional.
3. Name clearance table, one row per candidate: trademark search per relevant class and jurisdiction, domain, two primary handles, store collision, read-aloud ambiguity, meaning check, each with `url@date`. Marked as screening, not legal clearance; any hit is shown, not summarized.
4. Spoken test: say each finalist to three people who haven't seen it written and ask them to type it; spelling errors, and any "like [other product]" reaction, are recorded. Two or more such failures eliminate the name.
5. Identity reproduces: mark rendered at 16 px, in one color, reversed on a dark ground, and at clear-space minimum; each render is checked to remain distinguishable.
6. Tagline challenge: ask three readers "says who?" of the tagline; each answer must be a ledger id, or the tagline is cut or reframed as an aspiration labeled as such.
7. Architecture rule: write the rule by which the next product would be named; apply it to two hypothetical products and confirm the results are distinct and clearable.
8. Voice transfer: five neutral sentences (error, confirmation, price, warning, greeting) rewritten in the voice using only its lexicon; every refused word is absent and every claim in them cites a ledger id.

## Writes to proposals
- `positioning` and `voice` with the four-part structure and the samples.
- `claims` the position requires, as `PROPOSED` rows with the evidence that would upgrade them, plus matching `unknowns`.
- `constraints` (legal): trademark findings, name restrictions.
- `unknowns`: screening not yet run, who files and owns the marks, markets whose language meanings are unchecked.
- `decisions`: name, category, and keep-vs-replace-equity with rationale.
- `actors`: alternatives and trigger events discovered when testing the position.
