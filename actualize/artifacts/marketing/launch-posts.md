built_from: model@8
reads: [actors, capabilities, constraints, positioning, voice, claims, unknowns, decisions]
cites: [C2, C3, C4, C12, C14, C17, C18, C19, C23, C39, C59, C65, C68]
public: true
status: final

# Launch posts

Copy-ready. Every factual sentence cites a claim; the site's ledger shows each grade and source. Links carry `?ref=<channel>` so repository traffic can be read per channel (no analytics are installed). Channel order and stop thresholds: `actualize/evidence/marketing/channel-plan.md`. The voiceover is pending a licence check, so lead with the site and the captions, not the audio.

## LinkedIn (the owner's voice)
I asked my own tool to launch itself. [C39]

Product Actualizer keeps one model of what is true about a product. Every claim carries a grade and a source anyone can re-open, and public copy may cite only what was observed or verified. When I downgraded a claim in a worked example, the validator refused the page. [C2][C3]

So I ran it on its own launch: positioning, a brand, a website whose demos run the repository's own code, and a 72-second film. The run, with its decisions and evidence, is in the repository. [C39][C59][C65]

It caught three things I would have missed. A browser test raced the page and failed in some runs. [C19] The terminal did not understand my own example request. [C14] And a claim on its own ledger became false the day I added a license, so the artifacts that cited it were flagged stale instead of quietly shipping. [C68][C4]

It does not make an agent's code correct. It grades claims, cites sources, flags stale work and refuses to pass a gate. I make no claim about outcomes or adoption.

Licensed under the AGPL-3.0. [C17] Read the run: github.com/SPRIME01/Product-Actualizer?ref=linkedin

## X or Bluesky, single post
Finish the product. Show the evidence. Product Actualizer keeps one graded model of what is true about your product, and the validator refuses public copy that cites anything below OBSERVED. [C2][C3] I ran it on its own launch: github.com/SPRIME01/Product-Actualizer?ref=x

## X or Bluesky, thread
1/ I ran Product Actualizer on its own launch. One model of what is true, every claim graded, every artifact citing it. The run is in the repo. [C2][C39]
2/ Downgrade a claim and the page that cites it is refused. Change the model and whatever cites it goes stale, by version, not by memory. [C3][C4] The demo on the site runs the repository's own validator. [C59]
3/ An agent can mark work ready for review. Only the owner accepts it; the cockpit returns AUTHORITY_HUMAN when an agent tries. [C12]
4/ Honest limits: no release has been published, and the hooks have not been run on clients other than the one used here. [C18][C23] AGPL-3.0. [C17]

## Show HN
Title: Show HN: Product Actualizer, a gate for agent-built launches

First comment:
I built Product Actualizer to answer one question: when an agent says a product is done, what is true? It keeps a model where every claim has a grade and a source, orders specialist work (brand, site, film, QA and others) by what each needs, and runs a gate that can say no. [C2]

The test I trusted most was running it on itself. The result is a site, a brand and a short film, and the run that made them is in the repository. [C39] The site's demos run the repository's own validator in your browser, unmodified. [C59]

Limits, plainly: no release or package exists yet [C18]; the installer targets several clients but I only exercised the CLI here [C23]; it does not make your code correct, it makes claims accountable. It calls no model itself. AGPL-3.0. [C17]

I would like to know where the process is too heavy for a solo builder.

## r/ClaudeCode (read the community rules first; post only if allowed)
Title: I ran a claims-ledger process on its own launch. Here is what it caught.
Body: Same facts as the LinkedIn post, shorter, with the repository link and this question: "which step would you skip, and what would it cost you?" Facts: [C39][C19][C14][C68].

## Announcement (blog or release note)
Product Actualizer is evidence-gated product completion for people who build with coding agents. It keeps one Product Model in which every claim carries a grade and a re-openable source. Lenses for brand, experience, marketing, motion and QA read that model in dependency order, artifacts record the model version they were built from, and a release gate can refuse. [C2][C4]

This announcement came out of the product's own run: a site, a brand system and a 72-second film, all built from one model. [C39][C65] The run recorded its own failures, including a test race, a request the terminal did not understand, and a claim that went false when a license was added. [C19][C14][C68]

The source is licensed under the AGPL-3.0. [C17] Start from the run in `actualize/`, or replay a worked example with `python3 tests/check.py`.
