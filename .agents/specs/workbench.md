# The capability-native Workbench: specification, plan, and result

Status: implemented. Source brief: `.agents/prompts/product_actualizer_cockpit_implementation_prompt.md`. Canonical description: `docs/workbench.md`. This file records the decisions and the evidence; it does not repeat the page.

## The question this answers

The owner should see, from the cockpit alone, the view that fits the work now, and be able to ask about it in plain words. Work that needs an executor is stored as a typed request and is never presented as done. The Product Model, proposals, artifacts, evidence, inbox, and gate stay where they were: only the router's reconciliation settles truth.

## Decisions

| decision | why |
|---|---|
| Two storage classes in one file: a disposable projection, and durable cockpit state (`control_*`, `ui_state`, `interactions`, cockpit events) | the brief allows durable control-plane state; the line must be explicit and tested, and deleting the file must never lose process truth |
| Numbered migrations in one transaction; the v1 "drop and rebuild" is gone | a v1 file loses nothing; a failing step rolls back whole |
| No workflow or capability table | the workflow is derived from the run, and a capability is a lens. Only what the owner chose or asked for is stored: five small tables |
| Capability = lens; implementation = `executes_with` candidates; executor = who runs it; Reach stays separate | the repo already encodes all of it; a second ontology would drift |
| Availability is `found` or `unknown`, never `usable` | not finding a skill proves nothing about where an agent keeps its skills |
| The Workbench is one stable surface the owner opens; its content follows the work | the reducer already replaces a surface's content in place without touching placement, pins, or tabs; a closed Workbench stays closed |
| The terminal is a rule table, not a model | no hidden interpreter; unknown phrasing is refused and nothing is queued |
| A request is `queued` until an executor acknowledges it; only the owner accepts, rejects, or cancels | the cockpit cannot wake an agent, so it must not claim to |
| `work_get` is a base tool; `work_update` is offered only while a request is pending | the always-visible catalogue stays small |
| The router sees pending work in `context.json` and one hook line, whether or not the browser is open | the owner may queue work and close the tab |

## Plan, as built

1. `db.ts` migrations, `control.ts` repository, `protocol/work.ts` lifecycle table and control operations.
2. `workflows.ts`, `capabilities.ts`, `workSources.ts`, `screens.ts`, `terminal.ts`; `work:` sources and `graph:workflow`.
3. Wiring in `core.ts` (control operations, `work_get`/`work_update`, Workbench follow, context), `serve.ts`, `cli.ts` (`actualize work`), `hooks/src/engine.mjs` (`workLine`).
4. `WorkTerminal.tsx`, templates, palette, styles.
5. Tests and documentation.

## Found and fixed on the way

- A `progress` block's `source` is an enum naming a live stream, but the reducer resolved it as a data source, so every surface with a progress block (including the existing `trace` template and the first offer "Follow the run") was refused with `cannot parse source run`. `surfaceSources` now skips progress blocks; a regression test opens `trace`.
- `bunfig.toml`'s `[test] timeout` is ignored by Bun 1.4: a 6 s test timed out at 5 s with it set. `tests/setup.ts` raises the default through a preload, and DEBT D1 is corrected.
- A binary lookup on WSL scans slow Windows mounts, so a screenful of capability lookups took seconds. `cachedWhich` keeps an answer for a minute, keyed by `PATH` and name.

## Verification

Baseline (clean checkout, real path): 250 tests, typecheck clean, `check.py` OK. After: see the final report; the three new test files are `workbench.test.ts` (kernel), `workbench.transport.test.ts`, `workbench.e2e.test.ts` (system Chrome). Three existing expectations changed with intent: the first offer is the Workbench and the Case is second (`case.test.ts`, `case.e2e.test.ts`), and the always-visible tool budget is fourteen (`authority.test.ts`).
