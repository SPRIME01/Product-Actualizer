built_from: model@2
reads: [constraints, form]
cites: []
public: false

# Provenance ledger

| item | origin | rights holder | license | commercial use | obligations | shipped in public artifact |
|---|---|---|---|---|---|---|
| tests/fixture/loam-fw/ (firmware) | owner (brief.txt) | owner, unconfirmed in writing | none: all rights reserved (C12) | owner's call | none | no |
| tests/fixture/probe-render.svg | "a friend" (brief.txt:5), name unknown | unknown (U5) | unknown | unknown | unknown | no (D8) |
| tests/fixture/brief.txt | owner | owner | n/a, internal | n/a | none | no |
| artifacts/marketing/beta-page.md (text) | written in this project from the ledger | owner | n/a | yes | none | yes |

Coverage by set difference: files shipped in public artifacts = {beta-page text}; ledger rows for them = {beta-page text}; difference = empty.
Dependency scan: no requirements file; imports are standard library; `loam.hw` is absent from the checkout, so its
license is unknown; it falls within U8 (the license question) and must be resolved before any code is shared.
Attribution rendering: no third-party credits required. Metadata test: no image ships; the render's SVG has no embedded author or location tags.
