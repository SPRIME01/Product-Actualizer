built_from: model@8
reads: [purpose, actors, form, voice, claims, capabilities, unknowns, decisions]
cites: [C2, C3, C4, C5, C6, C12, C18, C20, C22, C31, C39, C43, C64, C65, C66]
public: true
status: final

# Explainer film: script, shot ledger, and build

Format: 1920x1080, 30 fps, constant frame rate, yuv420p, BT.709, AAC audio, target 60 to 90 seconds. Deterministic: every frame is a pure function of time (`media/explainer/src/film.mjs`); `bun media/explainer/render.mjs` regenerates it from source. Premise: an agent says it is done, and the model says what is true. Each scene changes at least one value.

## Narration (the spoken script; each line is one scene)
L1: Your coding agent says it's done.
L2: One developer writes that the bottleneck isn't building anymore. It's completing. [C31]
L3: One Hacker News post puts it plainly: instructions are not guarantees. [C43]
L4: Product Actualizer keeps one model of what is true about your product. Every claim carries a grade, and a source anyone can re-open. [C2]
L5: Public copy may cite only what was observed or verified. Downgrade a claim, and the validator refuses the page. [C3]
L6: Change the model, and whatever cites it goes stale. By version, not by memory. [C4]
L7: The work is split into lenses, ordered by what each one needs. The tools that do it are replaceable. [C5][C20]
L8: An agent can report work as ready for review. Only the owner can accept it. [C12]
L9: And the gate can say no. It will not let the run end while work is outstanding. [C6]
L10: Product Actualizer. Finish the product. Show the evidence.

## Shot ledger
| scene | line | on screen | state change | new information | source of every on-screen fact |
|---|---|---|---|---|---|
| report | L1 | the agent's statement "The launch page is ready." with UNKNOWN and "source: none" | a claim appears with no grade | what an unchecked "done" looks like | none: this is the premise; it makes no claim about any product |
| quote1 | L2 | a developer's sentence and its source | quote appears | the buyers' own words | C31 |
| quote2 | L3 | a Show HN sentence and its source | quote appears | enforcement beats instruction | C43 |
| ledger | L4 | two real claims with grade and source; the seven grades | rows appear in order | claims carry grades | C2; rows C18 [C18] and C22 [C22] from the model, with the seven grades [C2] |
| refusal | L5 | a real public line from website-copy.md; C3 flips VERIFIED to REPORTED; the validator's actual refusal | a grade changes, a page is refused | the copy rule | C3; refusal text produced by `validateArtifact` at build time |
| stale | L6 | four artifacts built from model@4; decision D11; each turns "stale by D11" | a decision lands | version, not memory | C4; the stale list is the terminal output of this run |
| waves | L7 | the four waves of this run's 11 selected lenses, the gate last; ffmpeg found, three tools unknown | waves appear in order | order comes from needs; tools are replaceable | C5, C20; evidence/recon-software/select-waves.json |
| authority | L8 | request states queued to accepted; an agent's attempt to accept returns AUTHORITY_HUMAN | a refusal appears | who may accept | C12; the message is the cockpit's own |
| gate | L9 | "Gate blocked" with the reasons from a snapshot of this run | reasons list | a gate can say no | C6; evidence/motion-editorial/gate-snapshot.json |
| end | L10 | mark, wordmark, tagline, where to read the run | end card | where to look | none (identity) |

## Feature map
Features on the goal's list: the graded ledger (ledger), the public-copy rule (refusal), staleness (stale), capability order and replaceable executors (waves), owner-only acceptance (authority), the gate (gate). Excluded on purpose: the Case, the world debugger, the Work Terminal's grammar, the hooks for other clients (detail the first minute does not need).

## Facts shown and where each is cited
The refusal scene shows the validator's real output for a downgraded C3 [C3]. The stale scene shows the stale list printed by this run's reconciliation to model@5 (evidence/motion-editorial/real-events.md). The gate scene shows a snapshot of this run's gate (evidence/motion-editorial/gate-snapshot.json) [C6]. The closing card names the run's location [C39]. Every claim id shown on screen is cited in this artifact, so a change to any of them makes the film stale.

## Verification (see evidence/motion-editorial)
Delivered files probed [C65]; frames sampled twice and hashed identically [C64]; narration generated and logged [C66]; text holds computed from the final timeline (text-holds.json): none below words/3 + 0.5 s. Accepted deviation, decision D14 context: the first frame of each scene starts at zero opacity and fades in over 0.4 s, so a cut shows one frame of background; no black frame, no repeated wrong-state frame.

## Text holds and tiers
Each on-screen text is held at least words/3 + 0.5 s (checked by `window.textHolds()` against the final timeline in the build log). At most two text tiers per scene; captions are a separate layer. Scenes are cut, not crossfaded; each scene's own elements reveal on entry (no sibling-fade sections).

## Variants
16:9 master with captions burned in (`explainer-captioned.mp4`) for social and standalone; the same picture without burned captions (`explainer.mp4`) with a WebVTT track for the site. No 9:16 cut is made: the captions and type are sized to stay readable at 390 px wide.

Rebuilt at model@7 after D15 (the license event recorded as C68): no content change.

Rebuilt at model@8 after D16 (license restated as AGPL-3.0): no other change.
