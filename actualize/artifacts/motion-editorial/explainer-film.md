built_from: model@10
reads: [purpose, actors, form, voice, claims, capabilities, unknowns, decisions]
cites: [C1, C2, C12, C73, C79, C80, C81]
public: true
status: final

# Film 3: Past the finish line

The current film. Film 1 (software launch story, `media/explainer/`) and film 2 (a serious explainer, `media/explainer-2/`) are kept as asked; their artifacts are `actualize/history/explainer-film@8.md` and `actualize/history/explainer-film-2@9.md`. Film 3 is not an explainer. It names the gap first (a norm that makes "done" cheap), lets the audience see the absurdity, and only then shows the product. The jokes land on systems (a board, a test run, a demo, a launch week), never on a person.

Format: 1920x1080, 30 fps, BT.709, AAC, dark theme, 80.6 seconds [C79]. Every frame is a pure function of time. Sound: a score and effects synthesised from source by `tools/score.mjs` (no third-party audio, so no licence to track [C81]), the Fish Audio voice under it, ducked.

## Narration (each line is one scene)
L1: Your agent says it's done. So the board says it's done. The board has never met a customer.
L2: The tests pass, on the machine that wrote them. The demo is real, at eight times speed. The testimonial comes from a very satisfied placeholder.
L3: Making got fast. Believing did not. The gap between made and real has no owner, so it gets a launch week.
L4: A render has never failed a drop test. [C73]
L5: Everything is already conspiring to get you over the line: agents, tools, suppliers, testers. Product Actualizer pins the plot to one board. One model, every claim graded, every lens reading it. [C2][C1]
L6: Says who? Trust me. On the real unit? On the render. Who decides it's done? Whatever did the work. Here the answers are a source, a gate, and you. [C2][C73][C12]
L7: Even the agent cannot accept its own work. It tried. The cockpit declined, in capital letters. [C12]
L8: Product Actualizer. Finish the product. Show the evidence.

## Shot ledger
| scene | line | on screen | state change | new information | source of every on-screen fact |
|---|---|---|---|---|---|
| board | L1 | a task board; four cards are dragged to Done by a cursor labelled "agent"; a counter "customers met by this board: 0" | cards land | the norm: whatever did the work moves the card | premise only; names no company |
| lies | L2 | three "done" items, each followed by what it leaves out | a note is struck in after each | how cheap "done" is | premise (satire of norms); no claim about a real party |
| gap | L3 | fast chips (code, logo, render, copy, page) pile up on the left, three slow ones on the right, a hatched gap between marked "no owner", then "launch week" | the gap fills with a sticky label | the missing owner | premise |
| drop | L4 | a render passes; the unit is dropped and cracks | a crack | physical proof is different from a picture | C73 for the rule; the object is drawn, not a photo |
| plot | L5 | scattered nodes and tangled strings pull into a ring around one model box, which shows the model's version, claim count and the seven grades | strings straighten | one model that all lenses read | C1, C2; counts read from the Product Model at build time |
| compare | L6 | three questions with the usual answer and Product Actualizer's answer | answers land in turn | the comparison we want to own: says who, on what, who decides | usual answers are editorial jokes about norms, not claims about any product; ours are C2, C73, C12 |
| refusal | L7 | a terminal: the agent tries to accept; the cockpit refuses; the owner accepts | a refusal, then an acceptance | who may say done | C12; message text read from the repository |
| end | L8 | mark, wordmark, tagline | end card | where to look | none (identity) |

## Feature map
On screen: the gap (norms), physical evidence rule (drop), one graded model read by every lens (plot), the comparison on three questions (compare), owner-only acceptance (refusal). Left out on purpose: staleness, the copy-grade rule and the lens list, which the site and film 2 carry.

## Sound plan
Dry, low, slightly ominous bed (A minor) with a tick that stops when the plot is pinned; a pulse and plucked pattern enter at "conspiring"; the bed resolves to a major chord at the end card. Effects mark: a card landing, a note struck, the crack, the pin, each answer, the refusal and the acceptance. The score is synthesised by `tools/score.mjs` from code, so there is no third-party audio. Voice: `fish-audio/s2.1-pro-free:free`, pinned voice id; its commercial-use terms are unconfirmed (U14) and no human has listened (U15).

## Checks recorded (evidence/motion-editorial-3/)
- Layout: `render.mjs --layout` finds no overlapping or out-of-bounds text in any scene at 40%, 70% and 97% of each scene.
- Determinism: every fifteenth frame hashed in two independent runs, same digest [C80] (determinism-run1.json, determinism-run2.json).
- Delivered file: 1920x1080, 30 fps, BT.709, integrated loudness -16.0 LUFS, audio and video within half a frame, no digital silence [C79] (probe.txt).
- Text holds: every on-screen text that appears on a cue stays up at least words/3 + 0.5 s (text-holds.json, 14 of 14).
- Not done: no human has watched it or listened to it (U15); the dry voice has not been shown to any buyer (U17); the narration's commercial terms are unconfirmed (U14).

## Rebuild note
Written at model@10 after D19 and D20. Film 3 replaces film 2 as the current film; film 2's artifact is kept in `actualize/history/explainer-film-2@9.md`.
