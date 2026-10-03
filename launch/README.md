# Launch kit: Product Actualizer

Everything here was produced by a governed run on this repository (`actualize/`). The copy files are validated artifacts: every factual sentence cites a claim at OBSERVED or VERIFIED, and the product's own validator checks that before the run can finish. Edit the artifact, not a copy of it, and re-run the lens; a stale artifact blocks the gate.

## What is in the kit

| need | file | status |
|---|---|---|
| Name, category, positioning, message hierarchy, voice, objections, short and long descriptions | `actualize/artifacts/brand/identity.md` | final |
| Website source and build | `website/` (`bun website/build.mjs`), output `website/public/` | final, verified (`bun website/qa.mjs`) |
| Website copy (every string on the page) | `actualize/artifacts/marketing/website-copy.md` | final |
| Brand system: tokens, fonts, logos, icons, social cards, guide | `brand/` (`bun brand/build.mjs`), `brand/README.md` | final |
| Explainer film, captions, transcript, poster, narration, source | `media/explainer/` (`media/explainer/README.md`) | final picture; voice pending (below) |
| LinkedIn, X or Bluesky, Show HN, r/ClaudeCode, announcement | `actualize/artifacts/marketing/launch-posts.md` | final |
| One-page brief, three-minute demo narrative, use cases | `actualize/artifacts/marketing/sales-brief.md` | final |
| Alternatives and battlecard (internal; do not publish) | `actualize/artifacts/marketing/alternatives.md` | final |
| Channel plan with stop and continue thresholds | `actualize/evidence/marketing/channel-plan.md` | decided before launch |
| Market research, buyers' own language, name screening, ICP | `actualize/evidence/brand/` | evidence |
| Validation report (what the run proved, bypassed, and left as debt) | `docs/validation/self-actualization.md` | final |

## Before anything goes public

1. **Push the license commit and the run.** The AGPL-3.0 `LICENSE` (commit 5118770) is committed locally; the public remote still shows the GPL-3.0 file until it is pushed. The site's "Read the run" link answers 404 until `actualize/` is pushed.
2. **Voiceover rights (U14).** The narration came from `fish-audio/s2.1-pro-free:free`. Fish Audio's pages say commercial use of its model needs a separate license, and the endpoint's own terms were not found. Either confirm the terms or re-voice (`media/explainer/tools/tts-lines.mjs`, then the mix and finish steps) before publishing the film commercially. The site and posts work without audio: the film has captions and a transcript.
3. **A human listen (U15).** Nobody has listened to the narration. Listen on headphones and a phone speaker; record your name and the date in `actualize/evidence/audio-sound/pronunciation.md`, and check how "Actualizer" is pronounced.
4. **Reddit quotes (U13).** Nine Reddit statements are in the model as REPORTED and are not used publicly. Open the links; if they read as recorded, confirm in writing and the claims can move to VERIFIED.
5. **Hosting and domain (U7).** `website/README.md` has the deploy commands; set `SITE_URL` for social previews. Nothing deploys itself.
6. **Name (U6, U8).** The name was screened by web, GitHub, npm and DNS lookups only. A trademark search and a spoken test with three people have not been done.

## Order of launch
Site live and linked from the repository, then the channel plan: Show HN, r/ClaudeCode (read its rules first), the DEV article, LinkedIn for studios. Use the `?ref=` links in the posts; the only measurement is repository traffic, stars and replies.
