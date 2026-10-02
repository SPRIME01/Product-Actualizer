---
name: provenance-licensing
description: Establish where every asset and dependency came from and what may be done with it. Use before any asset or dependency ships in a public artifact, and whenever recon finds third-party material.
reads: [constraints, capabilities, claims, form, unknowns, decisions]
needs: []
executes_with: []
---
# Asset provenance and licensing

## Reads from the model
`constraints` (legal), `claims` (e.g. "open source" is a claim), `form` and `capabilities` (what depends on which asset), `unknowns` (unlicensed or unlabeled material), `decisions` (replacements, waivers).

## Distinctions
- **Ownership.** Owns where assets and dependencies came from and the terms attached. Brand owns name and trademark screening; release-readiness owns the gate that uses this ledger. Not legal advice: items for counsel are flagged, not resolved.
- **Four separate things:** origin (who made it, when, with what), license (terms granted), permission (consent from people shown or heard, and from the client who supplied it), obligation (notice, attribution, share-alike, source offer). Having one does not imply the others.
- **No license means all rights reserved.** A repository without a license file, or a file labeled "free to use" without terms, is not licensed for reuse.
- **Copyleft scope depends on distribution:** strong copyleft attaches on distributing a combined work (and for the strongest network-use variants on serving it); weak copyleft attaches at the library boundary; permissive licenses still require notices. Check against how this product ships.
- **Creative Commons variants differ in kind:** attribution-only is compatible with commercial use; non-commercial and no-derivatives are not; share-alike carries to adaptations. Derived renders, edits, and composites inherit the obligation.
- **Fonts, icons, and 3D models** have their own use scopes: desktop vs. web vs. app embedding vs. broadcast; per-seat or per-domain terms; editorial vs. commercial stock.
- **Generated assets:** record tool, model, date, prompt, and plan or terms in force at generation. Protection and ownership of purely generated output vary by jurisdiction and are an open item for counsel, not an assumption.
- **People, places, and brands in material:** likeness, voice, property, and third-party logos or UI in screenshots need releases or removal.
- **A license belongs to a version.** Projects relicense; record the version, commit, and retrieval date with the license text. Dual-licensed material records which option is taken.
- **Masters and delivered files are kept apart.** Without the original and its credit, rights, and alt metadata, a derivative can neither be regenerated nor audited; rights metadata travels with the asset through every derivative.
- **Names and logos imply endorsement.** Third-party marks in comparisons, "works with" lines, and screenshots of other products carry trademark and terms-of-use limits that a copyright license doesn't cover. Distinctive marks and descriptive names are protected differently (generic and descriptive terms weakest, arbitrary and invented terms strongest).
- **Embedded metadata** (location, device, author) is stripped from anything published unless intended.
- **Client-supplied assets:** the supplier's right to grant use is confirmed by the named owner in writing.

## Failure modes
- **"Found online"** — image with no recorded source. *Recognize:* a ledger row whose origin is a search engine or a screenshot.
- **Unlicensed repo as free** — dependency or snippet without a license. *Recognize:* no license file and no stated terms.
- **Lost or buried attribution** — required credit absent from the derived render, film, or page, or present only in a notices file or for a single frame. *Recognize:* attribution obligation in the ledger, no notice in the context the license requires.
- **Non-commercial in a commercial launch.** *Recognize:* license id contains NC and the artifact is public marketing.
- **Wrong font scope** — desktop license serving a webfont. *Recognize:* font file in the site bundle with no web license.
- **Assumed provenance** — "probably CC0". *Recognize:* a license cited with no URL and date.
- **Unrecorded generation** — generated asset with no tool, date, or plan.
- **Unreleased people or voices** in footage or audio.
- **Customer data in a capture** — real names, records, or screens from a client's system in a demo or recording. *Recognize:* a frame or screenshot showing data not invented for the demo; consent absent.
- **Transitive surprise** — a permissive top-level package pulling in a restrictive dependency. *Recognize:* the dependency tree was not scanned.
- **Repackaged asset** — a free-looking file that someone else republished without authority. *Recognize:* the uploader isn't the creator, and the original source can't be found.
- **Unversioned license** — license cited from a project's current page for an older copy. *Recognize:* no version or commit beside the license id.
- **Metadata leak** — GPS and device data in published photos.

## Check
1. Coverage by set difference: the list of every file and dependency shipped in public artifacts minus the ledger rows must be empty. Any shipped item without a row blocks the artifact.
2. Each row has origin, author or rights holder, license id (SPDX for code), license text location as `url@date` or file path, commercial-use yes/no, obligations, and the artifact's notice that satisfies them.
3. Dependency scan over the full resolved tree (not top-level only): every license identified; none unknown; strong copyleft matches the intended distribution or is flagged.
4. Notice presence test: for each obligation, grep the shipped artifact or its notices file for the required text.
5. Version pin: every license id has the version or commit and retrieval date beside it; a license cited without them is treated as unknown.
6. Attribution rendering: each required credit is visible in the shipped context (page footer, video end card, store listing) at a legible size.
7. Metadata test: published images, audio, and video checked for embedded location and device tags; none remain unless a decision id allows it.
8. Pending decisions: every unlicensed or unconfirmed row names the owner action that resolves it (choose a license, confirm authorship, obtain a release) and the artifact it blocks.
9. Release and consent records exist for every identifiable person or voice, or the material is excluded.

## Writes to proposals
- `constraints` (legal): obligations, restrictions, territory or channel limits attached to assets.
- `claims`: licensing statements (e.g. "licensed MIT"), graded `VERIFIED` only after the license text was read.
- `unknowns`: assets with no license, authors to contact, items for counsel.
- `decisions`: replace-or-obtain choices, attribution placement.
- `form`: parts of the product's appearance or content that are third-party works and cannot be restyled or republished freely.
- `capabilities`: features that depend on an asset or service that cannot be shipped as-is.
