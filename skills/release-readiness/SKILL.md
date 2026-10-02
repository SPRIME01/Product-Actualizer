---
name: release-readiness
description: Verify that the actualized whole is true, current, coherent, and launchable by running it, not reading it, including physical claims exercised on the real unit. Use as the final gate and after every re-run of stale artifacts.
reads: [purpose, actors, capabilities, constraints, form, voice, positioning, claims, unknowns, decisions]
needs: []
executes_with: [playwright-cli, agent-browser]
---
# Verification and release readiness

## Reads from the model
All fields. Chiefly `claims` (every public statement), `unknowns` (what remains open and what it blocks), `decisions` (scope and waivers), `constraints`, and each artifact's `built_from` stamp.

## Distinctions
- **Ownership.** Owns the final gate and cross-artifact coherence. Fidelity-qa measures visual output against its oracle; provenance-licensing owns the rights ledger; this lens consumes both and tests what they cannot see.
- **Verify by running.** Review is reading; verification is executing the install, the flow, the link, the purchase, the render-vs-source measurement, and recording the result.
- **The oracle is the model, not the artifact.** Copy checked against copy proves consistency, not truth. Each public statement is traced to its ledger row, and the row's source is re-opened.
- **Coherence across artifacts:** the same name, spelling, price, spec numbers, capability set, ship status, and contact appear identically on every surface (site, store listing, README, film captions, packaging, support text).
- **Staleness is mechanical:** compare each artifact's `built_from`, `reads`, and `cites` with the decision log. Updating a stamp without rebuilding is a defect.
- **The gate outputs one of four decisions with a named accountable owner:** go, no-go, defer, or go-with-exception (the exception, its risk, and its expiry recorded). Evidence scales with risk class: a copy fix needs a proportionate packet, a hardware ship does not. Every evidence category maps to a named source or to an explicit missing-evidence outcome.
- **Launch is defined per goal:** demo, closed beta, public release, and sale each have a different bar; the bar is written in the decision log before the gate runs.
- **Do the check that was asked.** Substituting an easier "equivalent" check is how defects ship; a check not run is reported as unverified with the reason and when it will run. An expectation not yet checked is labeled an assumption, never written as a fact. If the named source is unreachable, say so with the failed attempt; evidence from a neighbor is labeled secondary.
- **Exit code 0 proves the tool ran,** not that its output is right. Evidence is the recorded content compared to an expected value from the model or the requirement source.
- **Deployment is a separate fact from build:** the artifact at each place it is consumed (site, store, bundle, mirror) is hash-compared with the built artifact; "copy succeeded" is not evidence the right content arrived.
- **Open unknowns are explicit gates.** An unknown that blocks a public claim blocks the artifact carrying it; it is not rewritten into confident copy.
- **Verdicts are four-valued:** passed, failed, blocked (evidence unobtainable), not applicable. Missing evidence is never converted to a pass. A verdict names the artifact hash it covers; a later failure against the primary source supersedes an earlier pass on that hash, and the earlier pass is marked superseded so nobody ships on it.
- **Lanes do not average.** When fidelity, rights, copy, and flow are checked separately, no single lane's pass is the gate result; the gate waits for all and reconciles conflicts.
- **Some qualities cannot be measured by the agent:** how audio sounds, how motion feels, whether an interaction is pleasant. Each such claim is backed by a named human's recorded review or stays unverified; a green automated check is a claim until it is re-run.
- **Severity classes:** blocker (false or ungraded public claim, unlicensed asset, broken primary flow or CTA, secret exposed), major (incoherence, stale artifact, missing state), minor.
- **Rollback is decided before cutover:** the abort criteria (the metric and threshold that trigger it), the rehearsed rollback path, and the lead-time items (for example lowering DNS TTL ahead of any DNS change) are in place before launch day. Each cutover step has an owner, a verification, and a rollback.
- **Clean-room first run:** a person or fresh environment with only the public instructions, not the author's machine and memory.
- **Physical claims need physical evidence, scaled to risk.** For a product with hardware, a release cannot pass on a firmware build, passing software tests, a plausible schematic, a clean render, or documentation that says it works. The claim is exercised on the real unit at the revision being shipped: a camera by a captured frame, a microphone by an inspected captured signal, a speaker by actual output plus a named human's confirmation, a servo by command plus an independent observation of travel, a sensor's accuracy by calibration or measurement against a reference, unattended boot by an actual reboot or power-cycle, a boot-time service by an actual restart of the target, an update or recovery path by running it (including interruption), a safe stop by a bounded-stop test. Electrical, device-integration, and embodied-behavior verification are owned by `electronics`, `embedded-systems`, and `robotics`; this lens consumes their records and decides whether they cover the public claims and the launch bar. Where physical claims are irrelevant, nothing here applies.
- **Hardware revision is part of the verdict.** A physical pass names the board, firmware, and accessory revisions it covers; evidence from another revision, a similar module, or a bench prototype is secondary. Open hardware contradictions between schematic, BOM, guide, firmware, and the unit block any claim they touch.
- **Calibration and envelope claims** (accuracy, range, battery life, latency, speed) are stated with their conditions and backed by a measurement made under them; an uncalibrated sensor supports "reads a value", not "measures X".
- **Support and recovery surfaces** (contact, legal pages, uninstall, refund or rollback path) are part of readiness.

## Failure modes
- **Self-referential check** — artifact verified against itself. *Recognize:* the evidence column points to the artifact.
- **Stamp laundering** — `built_from` bumped with no rebuild. *Recognize:* file contents unchanged across versions where decisions touched its `reads`.
- **Author-machine pass** — works only with local state. *Recognize:* never run in a clean environment.
- **"Looks good" gate** — report without commands or outputs. *Recognize:* no exit codes or recorded results.
- **Cross-artifact drift** — price, count, or name differs. *Recognize:* number or name extraction differs across surfaces.
- **Unknown laundering** — open question turned into assertion. *Recognize:* copy states a fact whose ledger row is `UNKNOWN` or `REPORTED`.
- **Placeholder leak** — lorem, TODO, `example.com`, sample data in public surfaces.
- **Silent downgrade ignored** — claim marked `CONTRADICTED` but its artifact unchanged.
- **"Done" without evidence** — completion stated, no command and result attached. *Recognize:* a gate row with a verdict and no output.
- **Wrong build deployed** — verified artifact differs from the published one. *Recognize:* hashes at the consumption point differ from the build.
- **Tests that cannot fail** — checks that pass on a blank page or empty fixture.
- **Build-as-function** — hardware behavior claimed from a compile, a flash, or an exit code. *Recognize:* the physical claim's evidence is a build log or a mocked device.
- **Wrong-revision pass** — a physical test on another board revision or a prototype cited for the shipping unit. *Recognize:* the test record names no revision, or one that differs from the claim's.

## Check
1. Ledger walk: for every claim id cited in any public artifact, re-open the source and record the result; any cited claim not `OBSERVED`/`VERIFIED`, or whose source no longer reproduces, is a blocker. Where a public sentence asserts behavior and the claim was graded from reading code, execute that behavior with inputs on both sides of any threshold; a sentence that fails the run is a downgrade proposal, however correct the code looked.
2. Staleness report: for each artifact, `built_from` vs. the highest decision version touching any of its `reads` fields (for claims, only its `cites` ids); the stale list must be empty at gate time.
3. Placeholder scan over every public artifact for lorem, TODO, TBD, `example.com`, `xxx`, and bracketed placeholders; zero hits.
4. Cross-artifact extraction: names, prices, numbers, dates, and capability lists pulled from all surfaces; the diff table shows no differences or each is explained.
5. Clean-environment first run: install or open, complete the primary job of each actor, using only public docs; transcript with exit codes or screenshots stored.
6. Link and action sweep: every link resolves; each CTA completes; each form submits in a test.
7. Physical evidence walk (only when public claims or the bar involve hardware): for each physical claim, the exercised test on the real unit (what was done, the expected value, the observed value, the revision covered, who observed what the agent cannot), plus any open hardware contradiction; a claim backed only by build, simulation, schematic, render, or documentation is a blocker for the artifact that states it.
8. Gate summary lists each check, its command or method, its result, and every waiver with decision id. Missing checks are listed as not run, not omitted.

## Writes to proposals
- `unknowns`: open items with the artifacts they block, including unexercised physical claims.
- `claims`: downgrades (`CONTRADICTED`) found during re-checking, with the contradicting source.
- `decisions`: scope cuts, waivers, and the launch bar for this goal.
- `constraints`: operational requirements discovered (support, legal pages, monitoring).
- Defect lists go to the producing lens, not to the model.
