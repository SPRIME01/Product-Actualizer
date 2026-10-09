---
name: recon-software
description: Establish what software actually does from source and/or demonstrated experience, without mistaking UI or narration for verified implementation. Use for available code, applications, videos, transcripts, screenshots or user-described workflows.
reads: [purpose, actors, capabilities, constraints, claims, unknowns]
needs: []
executes_with: [reconstruct-experience]
---
# Recon: software

## Reads from the model
`capabilities` and `claims` (to find what is already asserted and needs confirming), `constraints` (to extend), `unknowns` (to close). On a first pass the model is empty and this lens supplies its first rows.

## Distinctions
- **Ownership.** Owns what software does according to available evidence, whether source code or a demonstrated experience. Does not own what the target should do (experience), what to call it (brand), or how to change it safely (legacy-modernization).
- **External experience path (conditional).** If the user supplies a demonstrated application, invoke `skills/reconstruct-experience/SKILL.md` as an execution skill inside this active recon lens; follow its full versioned method and `references/model-handoff.md`. Store the resulting dossier in `evidence/recon-software/reconstruct-experience/` and propose model changes; never let the tool edit the model. For a source-only repository, skip it entirely.
- **Do not confound reference and target.** Record demonstrated affordances and narration as evidence about the reference, while user-specified changes remain target proposals. A visible control is not proof its behavior executed; an acceptance trace is not evidence that the target passed. Reconstruct behavior before choosing OSS mechanisms or inspecting the target architecture.
- **Different evidence, different checks.** The source-code checks below apply when source exists; for demonstration-only cases explicitly mark those checks not applicable and use the method's evidence coverage, state graph, contradictions, and validation traces. No fabricated `path:line`, HEAD SHA, executable tests, or inspected video.
- **Four states of a capability, graded separately:** declared (README, UI label, route table), implemented (a real code path), reachable (an entry point leads there with default config), executed (it ran and produced the result). Declared alone is `REPORTED`; reachable earns `OBSERVED`; executed with a check that could have failed earns `VERIFIED`.
- **Reading is not running.** A capability graded from reading alone is marked "read, not run" in its source; code can look right and not be (a threshold in the wrong unit passes review). Execution is what promotes it.
- **Entry points are not libraries.** Find every way execution starts (bin/scripts, `main`, route registration, workers, cron, container `CMD`, build hooks) before judging any function. Code with no path from an entry point is dead until proven dynamic.
- **Scaffold output is not product.** Generator-default CRUD, framework welcome pages, and template auth are present but are not a decision anyone made. Separate them by diffing against the generator's output or the first commit.
- **Stub vs. real:** constant returns, `NotImplemented`, `TODO`/`FIXME` bodies, mocks on the production path, hard-coded sample data, `example.com`/lorem strings, handlers that only log, buttons bound to nothing.
- **Config-gated behavior:** a feature behind a flag, env var, or build tag exists only under that setting. Record the default and who flips it.
- **History is evidence.** Last-commit date, abandoned branches, churn concentrated in one area, and TODO age show what was alive and what was dropped. Read it, don't just run `HEAD`.
- **External dependencies of function:** accounts, API keys, paid services, hardware, network, seeded data. A feature that needs a secret nobody has is `UNKNOWN` to users, not absent.
- **Pin evidence to a commit.** Record the HEAD SHA and whether the tree was dirty in every code-derived claim's source. Later drift is detected by changed paths between SHAs intersected with the paths the claims cite, never by file timestamps (a fresh clone rewrites them all).
- **Coverage is stated, not implied.** Paths not read (vendored, generated, skipped packages) stay on the map marked "not read"; nothing is claimed about them, so "five services; this pass read one" is the honest summary.
- **Why is not in the code.** A magic threshold, special-case branch, or hard-coded exception shows what, not why. The rationale becomes an `unknowns` row with the evidence; it is never reconstructed by plausibility.
- **A reference is not a use.** Dependency declarations and imports show what a project can touch; dynamic wiring (DI, reflection, config-driven loading) couples things no static link shows. Treat both as incomplete evidence of dependence.
- **Deployed is not HEAD.** The running system may differ from the repo (hotfixes, unmerged branches, config). Compare the deployed build identifier, container tag, or live behavior against the commit before claiming what users have.
- **Data provenance:** for each datum that matters, record the system of record, whether this code reads the authority or a copy (cache, replica, denormalized field), how stale it can be, and where one identifier maps to a different identifier in another system. A source that cannot be determined is `UNKNOWN`, never guessed.
- **Personal data is a legal constraint in code form:** what the code collects, stores, and sends, and to whom, bounds what privacy claims the product may make.
- **Data vs. code:** schema and migrations say what is persisted; seed and fixture data say what was demoed, not what is real.

## Failure modes
- **README inventory** — capabilities lifted from docs. *Recognize:* a capability row whose source is a README line, not `path:line`.
- **UI theater** — an affordance in a screenshot reported as demonstrated or executed behavior. *Recognize:* no witnessed interaction episode or source span.
- **Target contamination** — a desired new behavior presented as an existing reference capability. *Recognize:* user deltas silently overwrite the observed model.
- **Route theatre** — route or menu exists, handler is a stub. *Recognize:* handler body under ~5 lines with no I/O, or returns a literal.
- **Works-on-my-machine** — build depends on undeclared tools, env, or global state. *Recognize:* clean-clone install/build fails or differs from documented commands.
- **Scaffold mistaken for product** — generated pages counted as features. *Recognize:* file matches generator output byte-for-byte or has a single initial commit.
- **Test as spec** — skipped, mocked, or snapshot-only tests read as proof. *Recognize:* assertions never touch real I/O; skip/xfail counts.
- **Monorepo generalization** — one package inspected, whole repo described. *Recognize:* claims with no package path.
- **Secret echo** — a key found in the repo copied into notes or the model. *Recognize:* any high-entropy string in your output. Record path and kind only, never the value.
- **Cache read as authority** — a copy treated as the system of record. *Recognize:* a data claim whose source is a cache, replica, or denormalized field with no staleness window.
- **Deployed drift** — repo behavior reported as the live product. *Recognize:* no deployed build identifier compared to HEAD.
- **Unit or scale mismatch across modules** — a threshold or constant in one scale compared with a value in another (fraction vs. percent, seconds vs. milliseconds). *Recognize:* for any comparison on a capability's path, the units of both sides were not written down.
- **Documentation drift accepted** — doc commands that fail are silently corrected in your head. *Recognize:* you ran something other than what the doc says without writing the discrepancy down.

## Check
1. For a demonstrated experience, require source coverage, state/affordance and causal-transition records, invariant contracts, separated owner deltas, unknowns and unexecuted validation traces, all under `evidence/recon-software/reconstruct-experience/`. Check the source-status→Product Model grade crosswalk before proposing; do not promote narration to `OBSERVED` or `VERIFIED`.
2. Clean-checkout run (when source is available): record the exact install, build, and test commands with exit codes and the first failing line. Documented commands that fail are recorded as `CONTRADICTED` against the doc.
3. Capability trace table: every capability has `declared | implemented | reachable | executed` each cited with `path:line` or `test:<command>` or `n/a`. A row with no `reachable` entry cannot be graded above `REPORTED`.
4. Spot test: choose three capability rows at random; a reader following only the cited paths must arrive at code that does what the row says, starting from an entry point. One miss fails the whole recon.
5. Deployed-vs-HEAD: the live build's identifier (tag, version endpoint, commit) is compared with the analyzed commit; a mismatch is a `CONTRADICTED` row or a re-analysis.
6. Data provenance table for the five data items that matter most: origin, authority vs copy, staleness window, identifier mapping, failure behavior; blanks are `UNKNOWN`.
7. Secret scan over the tree and history: results recorded as path, kind, and commit only (never the value), with each hit marked live, rotated, or test.
8. Units: every threshold, interval, and comparison on a graded capability's path has the units of both sides recorded; any mismatch is a finding, and a capability with unrecorded units is not graded above `OBSERVED` as "read, not run".
9. Stub sweep: the grep-class list in Distinctions was run over the repo and every hit is classified (stub/real/test) or listed; a capability whose code path contains a hit is downgraded.

## Writes to proposals
- `capabilities` and `claims` with the four-state source trace where code exists, or a reference-behavior contract with evidence IDs where it does not; target capabilities remain `PROPOSED` until built.
- `constraints` (technical): runtime versions, required services, platform limits, hardware dependencies.
- `unknowns`: required secrets or accounts, unrun paths, unclear intent in stubs, who can answer.
- `form`: the surfaces that exist (CLI, API, UI routes, config files) and their state, or demonstrated UI states, affordances and transitions with observation boundaries.
- Contradictions between docs and behavior, as `change` proposals against the existing row.
- `unknowns` owners: the authors or code owners most likely to answer each open question, from history.
- Handoff notes: debt that blocks launch (to legacy-modernization), existing flows worth keeping (to experience), dependency licenses (to provenance-licensing).
