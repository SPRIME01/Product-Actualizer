built_from: model@10
reads: [actors, capabilities, constraints, form, voice, claims, unknowns]
cites: [C2, C3, C4, C5, C8, C12, C15, C17, C20, C73]
public: false
status: final

# Experience: the public site

Actor and job (A4): a technical founder deciding in under a minute whether this is worth a look, then checking one claim themselves. Secondary (A5): a studio lead looking for what the handoff artifact would be. Step budget (proposed as a decision): first factual claim checked by the visitor in at most 2 interactions and 10 seconds from landing; every section reachable by keyboard in tab order.

## Flow inventory (all PROPOSED until QA records the run)
1. Land: headline, a pain-first sentence ("Your agent says it's done. So does the board."), primary CTA, the live ledger (real data) in view without scrolling at 1280x800; on 390 px the ledger sits under the CTA.
1a. See the pain (owner: visitor, no input needed): scrolling to the first section plays a board where an agent drags four cards to Done and the counter of customers met reads none; four questions follow (says who, on the real unit, what changed since, who decides it's done), each with the usual answer struck as this repository's answer, cited to a claim, lands [C2][C73][C4][C12]. It is the comparison to own (D19). Under reduced motion or without script the final state is simply shown.
2. Check a claim (owner: visitor): press "Downgrade C1 to REPORTED". The page runs the product's own validator on a real public artifact and prints its refusal [C3]. Press again to restore. Exit: any other section.
3. Watch the film (owner: visitor): film 3, about 80 seconds, poster is the finished comparison, captions on by default, no autoplay.
4. Change the model (the Lab): choose a decision; see which artifacts go stale and which stay current [C4]; "rebuild" is labelled as simulated because the rebuild is a lens run.
5. See the order of work: choose a goal; lenses arrange into waves from their declared `needs` [C5]; each lens lists candidate implementations and says unknown until a process looks [C20].
6. Try to accept as the agent: step through a work request's lifecycle; the agent's attempt to accept returns the cockpit's real refusal [C12].
7. Read the proof: what was run, what passed, what has not been run. Honest list including U1 to U10.
8. Leave: read the run, replay a worked example [C15], or open the source. "Run it on your product" is offered with the license (AGPL-3.0) named beside it [C17].

No orphan nodes: every flow returns to the page; every loop (downgrade/restore, step/reset) has a visible reset.

## State matrix (interactive objects)
| object | empty | loading | success | error | stale | disabled | offline |
|---|---|---|---|---|---|---|---|
| Live ledger | shows model@4 as shipped | data inlined, no spinner | validator returns [] and says so | prints validator errors verbatim | n/a: ledger is one version | buttons disabled only while a run is pending | works offline: all data is inlined |
| Lab | "No decision recorded: nothing is stale" | n/a: synchronous | artifacts marked current | shows validator refusal for a public artifact | artifacts marked stale with decision id | rebuild disabled until a decision exists | works offline |
| Waves | all lenses unselected | n/a | waves shown | unmet `needs` named | n/a | n/a | works offline |
| Lifecycle | queued only | n/a | accepted by owner | agent attempt prints AUTHORITY_HUMAN | n/a | owner-only steps marked | works offline |
| Gap board and comparison | final state shown (no script, or reduced motion) | n/a | cards in Done, answers landed, usual answers struck | n/a | n/a | n/a | works offline |
| Film | poster | preload none | plays with captions | download link and transcript | n/a | n/a | transcript always present |
No-script: every object degrades to a static before-and-after with the same text.

## Capability to surface
| capability | surface | note |
|---|---|---|
| K2, K3 | live ledger, hero | real validator in the browser |
| K4 | Lab | real staleness function |
| K5, K13 | waves explorer | waves computed from lens frontmatter; implementations listed as candidates |
| K12 | lifecycle explorer | transition table generated from cockpit/protocol/work.ts |
| K9 | install and replay block | commands only; no download claim [C8] |
| K10, K11 | screenshots of this run's cockpit | real captures, not redrawn |
| K15 | proof section | replay command [C15] |
| K8, K14 | hidden | detail does not serve the first-minute job; stays in docs |

## Copy trace
Every sentence that states a fact on the page cites a claim id in `actualize/artifacts/marketing/website-copy.md` at OBSERVED or VERIFIED. Quotations from third parties are attributed with source and date and are claims about what the source says. Sentences without a claim are rewritten as questions, instructions or labels. No numbers about outcomes.

## Checks recorded as not run here
Localization pass (English-only launch; RTL and 40% expansion not rendered). Realistic-data pass n/a: the page holds no user data. Automated accessibility and task walk are run by fidelity-qa on the built site.

## Motion commitments (D-R6)
Micro, luxe, semantic: a hairline under the header that is solid behind you and dashed ahead (progress to the finish line), the mark's dashed frame closing as the page is scrolled, sections revealing in order with a short stagger, the board and comparison above, a refusal that nudges once, stale rows that dim under a warm wash, a soft pointer light on live panels. Each is decoration-free: it reports a change or points at the message. None moves layout; none loops.

## Accessibility commitments
Landmarks, a skip link, visible focus (2 px accent outline), targets at least 44 px, no information by colour alone (every grade shows its name, as C2 defines the seven grades [C2]), `prefers-reduced-motion` removes every transition and animation (the header progress line, the mark closing, reveals on scroll, the board, the pointer light) and leaves the page whole, the toggle for theme is a real button, results of interactions announce through a polite live region.

## Rebuild note
Rebuilt at model@4 after D10 (language policy). Changes: None to content; D10 touched claims this lens reads. Problem section now leads with the one re-opened quotation (C43).

Rebuilt at model@6 after D12: flow 8 now offers use under the committed license.

Rebuilt at model@8 after D16 (license restated as AGPL-3.0): no other change.

Rebuilt at model@10 after D19 and D20: a pain-first opening and the comparison section added as flow 1a; the film is now film 3; motion commitments written down.
