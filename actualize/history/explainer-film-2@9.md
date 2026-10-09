built_from: model@9
reads: [purpose, actors, form, voice, claims, capabilities, unknowns, decisions]
cites: [C1, C2, C3, C4, C12, C69, C70, C71, C72, C73, C38]
public: true
status: draft

# Explainer film 2: any product, not only code

The current film. Film 1 (software launch story, `media/explainer/`) is retained as a superseded version at the owner's request; its artifact is `actualize/history/explainer-film@8.md`. Film 2 widens the story: a demo nobody can verify, a model of what is true, lenses for code and for circuits and renders, the rule that physical claims must be exercised on the real unit, a hardware gate that said no, and the same mechanism for copy. Format: 1920x1080, 30 fps, constant frame rate, yuv420p, BT.709, AAC; every frame is a pure function of time (`media/explainer-2/src/film.mjs`); regenerate with the commands in `media/explainer-2/README.md`.

## Narration (each line is one scene)
L1: A demo video says the robot works.
L2: Someone asks whether it is real, or sped up, or remote controlled. [C69][C70]
L3: Code, a circuit board, or a launch page: the question is the same. What is true?
L4: Product Actualizer keeps one model of what is true. Every claim carries a grade, and a source anyone can re-open. [C2]
L5: Seventeen lenses read that model: brand and motion, electronics and firmware, three-dimensional renders. [C71][C1]
L6: A hardware release cannot pass on a build, a schematic, or a render. The claim has to be exercised on the real unit. [C73]
L7: In the hardware example, the gate said no. Most physical claims had never run on the unit. [C72]
L8: A page cannot cite what was only reported. [C3]
L9: And when the model changes, whatever cites it goes stale. [C4]
L10: Agents and tools do the work. Only the owner accepts it. [C12]
L11: Product Actualizer. Finish the product. Show the evidence.

## Shot ledger
| scene | line | on screen | state change | new information | source of every on-screen fact |
|---|---|---|---|---|---|
| demo | L1 | "The robot works." with UNKNOWN and the question real, sped up, or teleoperated | a claim appears with no grade | what an unchecked demo claim looks like | premise only; names no company |
| quotes | L2 | two Hacker News comments with their date | quotes appear | the buyers' own question | C69, C70 |
| same | L3 | Code. A circuit board. A launch page. What is true? | the question appears | one question across product types | none (framing) |
| ledger | L4 | two claims from the hardware worked example with grade and source, and the seven grades | rows appear | claims carry grades, for hardware too | C2; rows from the Mote model (fictional product, [C38]) |
| lenses | L5 | all 17 lenses grouped as the cockpit groups them | groups appear | the range: software, design, media, hardware, proof | C71, C1; names and groups from the repository |
| rule | L6 | "Exercised on the real unit, at the shipping revision" and five kinds of evidence that are not enough | struck-through list | the physical rule | C73 |
| walk | L7 | the hardware gate's physical evidence walk and its verdict | rows appear, verdict last | most claims never ran on the unit | C72; table parsed from the gate file |
| refusal | L8 | a real public line and the validator's refusal when its claim is REPORTED | a grade changes, a page is refused | the copy rule | C3; refusal text produced by `validateArtifact` at build time |
| stale | L9 | four artifacts built from model@4 turn "stale by D11" | a decision lands | version, not memory | C4; the stale list is the terminal output of this run (evidence/motion-editorial/real-events.md) |
| authority | L10 | request states and the cockpit's refusal when an agent accepts | a refusal appears | who may accept | C12 |
| end | L11 | mark, wordmark, tagline, where to read the run | end card | where to look | none (identity) |

## Feature map
On the goal's list: the graded ledger (ledger), the lens range including physical engineering (lenses), the physical evidence rule and a gate that refused (rule, walk), the copy rule (refusal), staleness (stale), owner-only acceptance (authority). Excluded on purpose: the Case, the world debugger, the Work Terminal grammar, hooks for other clients, executors (film 1 covers executors and the run itself).

## Text holds and tiers
Each on-screen text is held at least words/3 + 0.5 s (computed from the final timeline). At most two text tiers per scene; captions are a separate layer. Scenes are cut, not crossfaded. An automated layout check (`render.mjs --layout`) confirms no text overlaps another or leaves the scene region at 40%, 70% and 97% of every scene.

## Variants
16:9 master with captions burned in (`explainer-captioned.mp4`) for social and standalone; the same picture without burned captions (`explainer.mp4`) with a WebVTT track for the site. Type is sized to stay readable at 390 px wide.
