# Product

## Register

product

## Users

Two users, in tension with each other, and the design serves both without collapsing them.

**The owner** is a person with a real, incomplete product: a repo, a board, a CAD file, a transcript, any mix. They are technical, often deeply so, but not necessarily a frontend person. They are mid-session, usually beside a terminal, for hours, at a desk with mixed light. They are trying to decide what is actually true about their product, and they do not fully trust any answer that has not been checked. They need to see what the agent found, judge it, rule on it, and know that nothing happened behind their back. They are accountable for the launch bar, and the tool is the thing that tells them honestly whether they have met it.

**The agent** is the other reader of every surface here. It works in long autonomous stretches, and it is wrong in a specific way: it will produce something that reads as finished. This product is built to make that failure hard. Every claim carries a grade and a re-openable source, artifacts record the model version they were built from, and the release gate can refuse. Design here means making those constraints legible and hard to route around, not softening them.

The owner and the agent are never confused for each other. Anything the agent supplies is visibly marked as such; anything the owner does is recorded with their provenance and states plainly what it does and does not change.

## Product Purpose

Take an incomplete real product and move it toward a coherent, launchable whole, through one shared Product Model that every artifact is derived from.

The mechanism is a claims ledger. Every claim a product may make carries an evidence grade (`OBSERVED`, `VERIFIED`, `REPORTED`, `INFERRED`, `PROPOSED`, `UNKNOWN`, `CONTRADICTED`) and a source that can be re-opened. Public-facing copy may only use `OBSERVED` or `VERIFIED`. Gaps are written as unknowns and never filled by guessing. A no-go verdict is a real outcome, not a failure to route around.

The system is delivered as lenses: each is how a professional in that field represents the problem, expressed as the distinctions they make, the failure modes they know, and the checks they run. The process is described, not merely suggested: hook engines block writes that break the rules and refuse to let a run stop while lenses, reconciliation, stale artifacts, or the gate are outstanding. The cockpit is an optional projection for the owner; the process works with it closed, and it is never a second source of truth or a second decision system.

Success is an owner who can state what is true about their product, cite where each statement came from, and stop at a verdict they believe, with the blockers named. Success is not a green gate the system produced on its own.

## Brand Personality

**Quiet, dense, legible.** An instrument, not a dashboard.

Familiar patterns over invention: tabs, splits, tables, a command palette, a status rail. The interface earns trust by being unsurprising and by being fast, not by being novel. Density is a courtesy to an expert reading closely, not a failure of friendliness. Colour only ever carries process meaning (grade, status, severity, staleness); it is never decorative, and when it means nothing it does not appear. Nothing moves that has not changed. Confidence comes from provenance, not polish.

## Anti-references

- Generic SaaS admin dashboards: identical card grids, hero metrics, supporting stat rows, gradient accents.
- Chat-first interfaces. This product is not a conversation, and attaching evidence to a message thread is not a model of the work.
- Anything that animates on load, and anything whose motion is a substitute for information.
- Playful, cozy consumer apps: gamified progress, confetti, streaks, celebration for work that has not actually been done.
- Anything that hides uncertainty behind confidence smoothing. A no-go gate must feel like a no-go gate, never like an encouraging nudge toward a yes.
- Dark-mode terminal cosplay: neon on black, glow, hacker aesthetic. Also the opposite failure, skeuomorphic lab or industrial-instrument styling, which would be the wrong kind of literal about "instrument".
- Fake AI furniture: purple-to-blue gradients, glowing status orbs, invented "AI confidence" meters. Confidence is a claim, and claims are graded here.

## Design Principles

1. **Show the grade, not the conclusion.** The interesting information is how well something is known, not that it exists. Every claim, artifact, proposal, and verdict carries its evidence grade and stays linked to its source, and no surface may smooth a mixed picture into a clean one.
2. **Familiar patterns over invention.** Use the interaction the owner already knows. A new pattern has to earn its place against a table or a split or a rail, and the burden of proof runs the other way for anything decorative.
3. **Authority is visible and never transferable.** Process data is plain; agent-supplied data is marked as agent-supplied; the cockpit shows, it does not decide; an owner's gesture states what it records and what it leaves untouched. The interface must never let it look as though something was applied when it was only recorded.
4. **Friction in proportion to consequence.** Reading state is instant and quiet. Ruling, confirming a physical action, or passing a gate is deliberately not. Never make a destructive or irreversible-feeling act as easy to trigger as a look.
5. **Dense is not the same as loud.** Prefer the smaller surface, the closer comparison, the next useful affordance over a menu of every affordance. Respect the expert's attention as a finite resource.

## Accessibility & Inclusion

WCAG 2.2 AA is the floor, not the target.

The evidence-grade palette is meaning-bearing, so it is held to a stronger bar than ordinary decoration: grades must remain distinguishable under deuteranopia, protanopia, and tritanopia. Colour is never the sole carrier of a grade, a status, a severity, or a verdict. Every one of them keeps a text or shape cue alongside the hue, and the palette must survive simulation, not just pass on a default-vision monitor.

Reduced motion is respected: live and pulsing indicators need a static equivalent that communicates the same state. Long sessions by tired technical users are a design condition, not an edge case; legibility under fatigue outranks squeezing in more density.
