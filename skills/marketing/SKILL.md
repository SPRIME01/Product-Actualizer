---
name: marketing
description: Plan and produce acquisition, launch, and conversion: channels, offers, pages, and measurement. Use when the product needs to be found, understood, and chosen.
reads: [actors, capabilities, constraints, positioning, voice, claims, unknowns, decisions, jobs, criteria, opportunities]
needs: [brand]
executes_with: [marketingskills, humanizer]
---
# Marketing

## Reads from the model
`actors` (trigger events, where they are, what they use now), `positioning`, `claims` (the only source of factual public statements), `constraints` (legal), `capabilities` actually shipped, `unknowns` that block pricing or availability statements, and when the model has them `jobs`, `criteria`, and `opportunities` (the progress sought, how it is judged, where it is under-served).

## Distinctions
- **Ownership.** Marketing owns how attention is acquired and turned into action: channels, offers, launch sequence, page conversion structure, measurement. Brand owns who the product is. Experience owns in-product flows. Direction owns the look of marketing artifacts.
- **Funnel stages are separate problems:** acquisition (be found), activation (first value), conversion (commit), retention. A launch plan names which one is the current constraint.
- **Start from the actor's trigger.** The event that makes them look, the alternative they use now, and what they fear in switching drive message and channel. A feature list is not a message.
- **Owned, rented, borrowed.** Owned channels (list, site, product) compound but start slow; rented ones (social, marketplaces, app stores) give speed, not stability, and exist to funnel visibility into owned; borrowed ones (guests, collaborations, partner audiences) shortcut being noticed. A plan says which role each channel plays.
- **Launches are staged to the evidence:** internal, alpha, beta, early access, full. Each stage's audience size and promises match what the ledger supports at that stage; waitlists and previews state the stage, and an unshipped product is not marketed as available.
- **One channel as the bet,** chosen by where the specific actors already are and what reach costs for the margin available, with the others explicit non-goals for this launch.
- **Page structure follows objections,** not the order of features. Proof sorted by strength; one primary action; secondary actions don't compete.
- **Everything factual on a public surface is a claim:** numbers, comparatives, superlatives, capability verbs, prices, ship dates, availability, certifications, testimonials, customer counts, logos of customers. Social proof is evidence that must exist before it can be shown.
- **Legal surface:** comparative and "best" claims, endorsements and disclosures, ratings and compliance marks (ingress protection, radio and safety marks, health), pricing and refund terms, data collection and consent.
- **Marketplace and ad surfaces have measurable specs** (background value, subject fill, minimum edge for zoom, file size, aspect ratio, text limits) that differ per platform and change; compliance is measured on pixels against the platform's current rules, and a clean-looking image can still fail (an off-white studio grey is not the required white). Headline text must stay legible at thumbnail size (a heading about 8% of image height is a workable floor).
- **Statements of absence are claims too.** "No app yet" or "alerts are not working yet" is honest early-stage copy, and it still cites a ledger row (`OBSERVED`/`VERIFIED`) like any other statement; say what exists and what doesn't in separate sentences.
- **Absolute words and promotions are claims too:** "best", "No. 1", "only", "guaranteed", and any sale or discount shown must have a source, and the sale must exist.
- **Synthetic presenters are allowed only when disclosed.** An AI-voiced or AI-presented demonstration is a demonstration; presenting it as a named real customer's experience is a fabricated testimonial.
- **Style edits are claim edits.** Rewriting copy to sound less machine-made changes qualifiers, numbers, and implied simultaneity; a rewrite may reshape sentences and paragraphs but never adds or drops a fact, name, number, date, quote, or ranking. Unnamed authority ("experts say"), prestige-outlet lists, and follower counts are borrowed proof; name the real source or cut them.
- **Machine cadence is structural, not lexical:** staged "not X but Y" contrasts, forced triads, the same one-line closer after every section, and a heading echoed by its first sentence. Replacing flagged words alone leaves the shape.
- **Demand evidence keeps three things apart.** The job is the progress an actor seeks, never a feature or a workflow of today's product. A success criterion says how that progress is judged; its importance and satisfaction are `UNKNOWN` or `<number> (<source>)`, never a score derived from prose. An opportunity is evidenced progress that is under-served and names the criterion or job it recovers. "Customers asked for X" is evidence about a candidate: recover the progress it assumes before writing an opportunity. A quote is `REPORTED`; your synthesis across quotes is `INFERRED`.
- **A decision state is a situation, never a type.** For one Case, record the trigger and what was salient (push, pull, anxiety, habit) in a table in an artifact with columns `case | actor | job | trigger | push | pull | anxiety | habit | grade | evidence`. There is no persona, segment, or type column, and the same actor in another Case gets another row.
- **A message is a hypothesis about a decision state.** Name the state, the difference in positioning that answers it, and the behavior it should change. Freeze the observation criterion (an `experiment:` head in an `evidence/marketing/` file with `expect:` and `frozen:`) before the message is shown. One result is an outcome; a durable pattern is a claim whose source cites several experiments, each marked `(supports)` or `(contradicts)`, and the contradicting ones stay.
- **Measurement is designed before launch:** one metric per stage with a threshold that changes a decision; baseline known. Experiments fix sample size, duration in whole weeks (so every weekday is balanced), and a guardrail metric before data arrives; looking early and stopping on a good result inflates false positives.

## Failure modes
- **Claim inflation** — "AI-powered", "military-grade", "instant". *Recognize:* the sentence survives replacing the product with any other.
- **Wrong room** — channel the actors don't use. *Recognize:* no evidence the actor is there.
- **Feature-as-value** — what it has, not what it changes. *Recognize:* each line starts with a capability noun.
- **Manufactured proof** — invented testimonials, scarcity, counts, "as seen in". *Recognize:* no ledger id or owner-confirmed source.
- **Unmeasured launch** — no instrumented conversion path. *Recognize:* nothing to read after day one.
- **Page for everyone** — no named actor or objection. *Recognize:* the hero can't be traced to an actor id.
- **Promised, not shipped** — launch assets showing unfinished features. *Recognize:* a capability cited with a grade below `OBSERVED`.
- **Rewrite that changed the claims** — humanizing pass drops a hedge or adds a number. *Recognize:* the extracted claim set differs between the pre- and post-rewrite text.
- **Machine voice** — generic cadence and superlatives ("elevate", "seamless", "unlock"). *Recognize:* the humanizer pass changes more than punctuation.
- **Spec-blind asset** — creative approved by eye, rejected by the platform. *Recognize:* no pixel measurement against the platform's current spec.
- **Disguised synthetic testimonial** — scripted presenter framed as a real buyer. *Recognize:* a first-person experience claim with no customer record behind it.
- **Broken action** — CTA leads nowhere, checkout untested, email unconfirmed.
- **Persona by another name** — a "type" of buyer attached to the actor. *Recognize:* a decision-state column that names a kind of person instead of a trigger.
- **Request as opportunity** — a feature ask copied into an opportunity row. *Recognize:* the deficiency names a solution and no criterion or job.
- **One test as law** — a single winning variant written up as a pattern. *Recognize:* a pattern claim citing one experiment, or none marked `(contradicts)` although one failed.

## Check
1. Claim trace: extract every factual statement from every public copy artifact (numbers, comparatives, superlatives, capability verbs, prices, dates). Each cites a ledger id at `OBSERVED`/`VERIFIED`; any unmatched or lower-grade statement fails the artifact.
2. Rewrite diff: for any copy edited for voice, the factual statements extracted before and after are identical sets; additions and drops are listed and reverted or traced to a ledger id.
3. Objection coverage: list the top five objections from actor evidence; each is answered on the page with a cited proof. An objection with no proof is an `unknowns` row, not filler text.
4. Channel plan: each channel row has the actor id, evidence they are there (source), cost per attempt, and a stop/continue threshold set before launch.
5. Funnel instrumentation: for each stage the event name and where it fires; a test run of the full path produces each event.
6. Asset specs: each marketplace or ad asset is measured on pixels (dimensions, background value, subject fill, file size, type size relative to height) against the destination's current published rules, with the rule cited as `url@date`.
7. Absence statements: each "not yet" or "no X" sentence on a public surface cites a claim, and the claim's source shows the absence (code listing, failed run).
8. Demand rows: every job, criterion, and opportunity has a source; each measured value carries its source; each opportunity names a criterion or job. Decision-state rows each have a Case, a trigger, and evidence, and an experiment's criterion is frozen before its result.
9. Action test: every CTA performed end to end (signup completes, purchase test passes, link resolves) with the result recorded.

## Writes to proposals
- `claims` the market needs, as `PROPOSED` with the evidence that would upgrade them, plus matching `unknowns`.
- `actors`: triggers, alternatives, objections, and where they spend attention.
- `positioning` conflicts surfaced by channel or search research.
- `constraints` (legal): rules that apply to the claims and channels chosen.
- `jobs`, `criteria`, `opportunities` (model sections) when transcripts, reviews, or support threads show progress sought or under-served.
- `decisions`: the channel bet, the stage being optimized, and the thresholds.
