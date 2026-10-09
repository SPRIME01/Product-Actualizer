built_from: model@10
reads: [purpose, actors, capabilities, constraints, form, voice, positioning, claims, unknowns, decisions]
cites: [C1, C2, C3, C4, C6, C12, C17, C57, C58, C59, C60, C61, C63, C67, C72, C73, C79, C80, C81, C82]
public: false
verdict: defer
owner: product owner

# Release gate: Product Actualizer public launch kit (site, brand, film 3, posts)

Covers: `website/public` built from model@10, `brand/`, `media/explainer-3/` (film 3), and the marketing artifacts in `actualize/artifacts/marketing/`. The gate re-opened what it could and records what it could not.

## Ledger walk (check 1)
Every claim cited by a public artifact was re-checked now, 52 of 52, by `actualize/evidence/release-readiness/ledger-walk.mjs` (results in `ledger-walk.md` and `.json`). Re-run in this walk: the 17 lenses and 19 skill directories [C1]; the grades and the copy rule [C2][C3]; staleness on the Loam fixture [C4]; the hook test suite behind the gate rules [C6]; AUTHORITY_HUMAN in the cockpit and its test [C12]; the license file and its commit [C17]; the Fish pricing page statement [C57]; a tree and history scan with full-token patterns (the pattern text alone is not a match) [C58]; the site QA checks behind [C59][C60][C61][C63][C67]; the hardware gate's no-go and the lens rule on physical evidence [C72][C73]; film 3's probe and determinism files [C79][C80]; the score's code and its shared cue file [C81]; the narration call log [C82]. Third-party claims were re-fetched: the Hacker News items through its API, the Stack Overflow, arXiv, Fowler, GitHub star counts and vendor pages.

## Staleness (check 2)
After D19 and D20 every artifact whose lens reads voice, positioning, claims or decisions was stale; each was rebuilt in its lens at model@10 (brand, direction, experience, marketing x4, illustration, motion-editorial, audio-sound, provenance-licensing, and fidelity-qa run fresh). The engine reports no stale artifact.

## Placeholder scan and cross-surface coherence (checks 3 and 4)
`coherence.mjs`: no placeholder text in any public artifact (the matches are stamp lines and the word "todo" in the copy key `gap.board.todo`, which is the board's column label). The name, the AGPL-3.0 license, the lens count, the seven grades, the 162 combinations and the film length read the same on every surface; the only GPL mentions are about the remote's file and the history of the rebuild notes. No surface still says 72 seconds. The model version named on the site, posts and brief is model@10.

## Executed checks (check 5)
- Full suite: `bun run test` passed (typecheck, 315 tests, `tests/check.py`) on the working tree (`full-suite.log`).
- Clean room: the working tree copied without `node_modules`, renders or `website/public`; `bun install --frozen-lockfile`, typecheck, `check.py`, 315 tests and the site build all exit 0 (`clean-room.txt`). The copy carries uncommitted changes; a clone of HEAD would not.
- Site: 42 of 43 QA checks pass in headless Chrome at five widths, both themes, after scrolling to settle animations (`actualize/artifacts/fidelity-qa/site-and-film.md`). The failing check is the link to `actualize/` on GitHub, which answers 404 until the run is pushed.
- The demos run the product: the in-page validator is the repository's file [C59], the lifecycle equals `Control.move` on 162 combinations [C60], the ledger refusals equal the validator's [C61].
- Film 3: layout scan, hashed frames identical across two runs, 80.6 s, -16.0 LUFS, 14 of 14 text holds [C79][C80].

## Not run
No human has watched the film or listened to the voice and the score. The voice's pronunciation of "Actualizer" is unchecked. No real-device, screen-reader or cross-browser pass. No hook enforcement test (the run used the CLI only, DEBT D12). The comparative claim "no other tool does this" is not made and was not tested (C36). No buyer has seen the site or the film (U9, U10, U17). The clone-of-HEAD clean room was run earlier at 931a76f and not repeated, because the work is uncommitted beyond b56435c.

## Rollback
Nothing has been published or deployed, so there is nothing to roll back. The site is static; "rollback" is removing the files from wherever the owner hosts them. The owner has not chosen a host or domain (U7).

## Verdict: defer
Accountable owner: the product owner. The kit is built, consistent, re-checked and honest about its limits; it is not released because four things only the owner can settle are open.

Blocking, with how each is closed:
1. **Voice rights (U14).** Fish Audio's pages say commercial use of its model needs a separate license, and the terms of this endpoint's output were not found [C57]. Confirm the terms or re-voice; the picture, script and captions do not depend on the voice.
2. **Nobody has watched and listened (U15).** Film 3's timing, jokes, score balance and the pronunciation of the name are judged by measurement and stills only. Watch it once with sound and record the date and name.
3. **The license and the run are not pushed.** Commit 5118770 holds the AGPL-3.0 text the owner chose, but the public remote still shows GPL-3.0, and `actualize/` is not on GitHub, so the site's main link 404s [C17]. Push when ready; this gate does not push.
4. **Name screening (U6, U8).** Trademark and domain checks are incomplete; the name is a screened working choice.

Non-blocking by decision: U7 (hosting and domain are the owner's), U13 (the Reddit lines stay out of public copy until re-opened), U16 (the hardware buyer is a hypothesis and the copy says so), U17 (the dry voice has not met a buyer), U9 to U12 (no market-size, pricing or funnel data; the posts make no outcome claims).
