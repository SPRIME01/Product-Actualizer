# The Workbench and the Work Terminal

The cockpit is an **instrument panel plus a natural-language terminal for purposeful work**. It is not a chat application and it is not a second Product Actualizer engine. This page owns four ideas: the two storage classes, the capability / implementation / executor layering, the deterministic Workbench screens, and the Work Terminal with its work requests. Everything else is linked.

## Two kinds of data in one SQLite file

`actualize/.cockpit/cockpit.db` (Bun's `bun:sqlite`, WAL, strict mode, prepared statements, no ORM) holds two classes, and the line between them is the point.

| class | tables | survives | lost with the file | truth? |
|---|---|---|---|---|
| **projection** | `meta`, `entities`, `search`, `events` where `channel = 'process'` | nothing needs to: `actualize cockpit rebuild` regenerates every row from the run directory | nothing the run does not still have | no. The run directory is |
| **cockpit state** | `ui_state`, `interactions`, `events` where `channel = 'cockpit'`, and `control_*` | `rebuild` and every schema migration | the owner's layout and pins, work requests, bindings, declared budgets and invariants, reviews, the terminal log | no. It records what the owner asked for and chose |

Rules that hold:

- The **run directory is authoritative** for the Product Model, proposals, artifacts, evidence, history, run state, the process log, the inbox, and the release gate. Only the router's reconciliation settles Product Model truth. Nothing in `control_*` can settle a claim, a proposal, or the gate, and the hooks and `process.mjs` never read it (`workbench.test.ts` greps `hooks/` for it).
- A schema change is a numbered migration in one transaction (`db.ts`, `migrate`). It may rebuild projection tables; it never drops a cockpit one. A migration that fails rolls back whole and leaves the file at its old version.
- `control_*` tables: `control_requests` (work requests), `control_bindings` (the owner's choice of implementation and executor per capability), `control_contracts` (a stage's declared budget, invariants, executor), `control_reviews` (the owner's review notes), `control_executors` (executor profiles the owner added). There is no workflow table: the workflow is derived from the run.
- Deleting the file loses cockpit state and nothing the process knows. `actualize cockpit reset` says so before it deletes.

## Capability, implementation, executor

Three layers, never merged. The owner reasons in the first.

| layer | what it is | where it comes from |
|---|---|---|
| **Capability** | the categorical kind of judgment work, such as *Visual Fidelity QA* | a lens: `skills/<lens>/SKILL.md` already gives `description`, `reads`, and `needs` (the dependency graph). No second ontology |
| **Implementation** | a mechanism that realises it, such as `playwright-cli` or `agent-browser` | the lens's `executes_with`, as *candidates*. The owner may bind one (`control_bindings`) |
| **Executor** | the agent, tool, or person that runs it | `current-agent` by default; the owner may add profiles. The cockpit never starts an executor |

**Reach is a separate idea**: how an outside *observation* (a browser, a serial port, an interview) is gathered, from `reach.providers.json`. The catalogue shows, for a few lenses, which observation capability their work leans on (`browser.inspect` for fidelity-qa). It is never an implementation name.

Availability is never guessed. An implementation is `found` where this process can see it (on `PATH`, or as a skill under `.agents/skills`, `skills`, `~/.agents/skills`, `~/.config/agents/skills`) and `unknown` everywhere else. Not found proves nothing, because an agent's skills live in places this process cannot list, so `unknown` is shown and is **not usable**. With nothing found, the honest default is "the lens procedure itself". A binding the owner chose that is not a declared candidate is ignored. If two *bound* implementations claim the same authority (declared data in `capabilities.ts`, today the design system for `hallmark` and `impeccable`), both capabilities show a conflict warning.

## The workflow is the real process, projected

`workflows.ts` projects the nine stages of the process: classify evidence, build or update the Product Model, select lenses, execute dependency waves, reconcile (again as needed), rebuild stale work, release readiness, review the gate, accept, defer, or no-go. Each status (`done`, `current`, `attention`, `ready`, `pending`) is a pure function of the run projection. Inside the waves stage the graph is the real lens `needs` graph with live status. It is not an engine: it runs nothing, stores nothing, and a stage never records that it happened.

The **task contract** (`Context | Goal | Skills | Authority | Executors | Budget | Invariants | Acceptance`) is derived the same way. The owner may declare a budget and extra invariants per stage; the rest is read from the run. Budget shows declared limits and observed facts (lens runs and minutes in the log) and says model cost is not recorded. Unknown is a valid value.

## The Workbench

One stable surface, `workbench`, whose contents change deterministically as the work changes. `screenOf` is a pure function of the run, the control state, and the Case. It composes only the fifteen existing blocks over `case:`, `pa:`, `graph:`, and `work:` sources, so every figure is computed at render time.

| mode | when (first match wins) | what it projects |
|---|---|---|
| **ORIENT** | no run, or no lens selection, or nothing running and nothing to check | the Case destination and deviation, the task contract, the workflow graph, the capabilities in play, the next move |
| **DECIDE** | the process is paused, a question is open, a request is blocked, or proposals are open with nothing running | the one thing waiting for you, what waits, the consequences, alternatives and their cost |
| **EXECUTE** | a lens is running, a reconciliation is open, or a request is running | run progress, the workflow, the contract, requests in flight, the next reachable move |
| **COMPLETE** | the run is settled, or the engine says ready **and** settlement is reachable | the verdict, evidence closure, artifacts, optional remaining moves, the reusable capabilities |
| **VERIFY** | artifacts exist, blockers stand, or work is ready for your review | the evidence ledger, what blocks acceptance, artifacts, work waiting for review, why stale |

(DECIDE and EXECUTE are checked before COMPLETE and VERIFY; ORIENT is the fallback.) COMPLETE says settlement is *reachable*. Whether to settle is the owner's call and the screen never says "ready to ship".

**The owner's layout is never stolen.** The Workbench is opened by the owner (the first hint, the terminal, or `⌘K`). Once open, its content is replaced in place, so position, tab, size, and pin are untouched. If the owner closes it, it stays closed. Changing mode is recorded as a `workbench.mode` event.

**The evidence ledger** (Product / model, Implementation, Verification, Quality) shows `pass`, `pending`, `fail`, or `unknown`, each with a real ref. A check the run does not record, such as test results, is `unknown`, never passed. The owner's review of an artifact (`accept <artifact>`) is a note in the cockpit; it does not touch the gate.

## The Work Terminal

A persistent line at the foot of the page. No bubbles, no assistant voice, no model. A small ordered rule set (`terminal.ts`) does one of four things.

1. **A known question compiles to an existing view or tool.** `what should happen next?` answers from the Case and opens it. `show me what blocks acceptance` opens the gate. `show the workflow`, `show capabilities`, `show capability fidelity-qa`, `show the task contract`, `show requests`, `review what changed before I accept it`, `why is <artifact> stale`, `open claim C4`, `show proposals|unknowns|claims|contradictions|the gate|run trace`. No request is created.
2. **An imperative becomes a typed, durable work request.** `verify the current frontend`, `audit accessibility`, `split the next work across independent workers`, `steer away from browser screenshot work`, `rebuild <artifact>`. It is classified only as far as the words support: a capability when a keyword names one (recorded with its basis, as a hint the router may overrule), explicit refs, a kind (`capability`, `steer`, `split`, `rebuild`, `unclassified`). `split` records which lenses are ready now and independent by the `needs` graph, as a fact and not a plan. `request: <anything>` queues a request verbatim.
3. **The owner's decisions on work in flight.** `accept R3`, `reject R3 because ...`, `cancel R3`, `accept <artifact>`.
4. **Anything else is not understood and nothing is queued.** It does not guess a capability.

Typing cannot rule, answer, confirm, or settle: `accept P12` is refused, because `accept` applies to a work request or an artifact, never to a proposal or the model.

### Work request lifecycle

```text
queued → acknowledged → running → produced → ready_for_review → accepted
                    blocked · cancelled · failed
```

The table is `TRANSITIONS` in `cockpit/protocol/work.ts`. The agent moves a request it holds: `acknowledged`, `running`, `produced`, `ready_for_review` (needs refs to what it produced, or a note), `blocked`, `failed`. **Only the owner** accepts, rejects (back to `blocked` with the reason), or cancels, and the reducer refuses the agent's attempt with `AUTHORITY_HUMAN` whatever the request's state. A request says `queued: no agent is connected; it will see this at its next interaction` until an agent has actually called the cockpit, and never says `running` unless an executor reported it. The cockpit does not wake an agent and does not run anything.

The router sees pending work in `.cockpit/context.json` (`work`) and in one hook line, whether or not the browser is open.

## Surfaces for the agent

| tool | effect | notes |
|---|---|---|
| `work_get` | read | `summary` (mode, stage, pending requests), `requests`, `workflow`, `capabilities`, `contract`, `ledger`, `screen`; `show` also opens it for the owner. Always offered |
| `work_update` | compose | moves a request the agent holds. Offered only while a request is pending, so the catalogue stays small |

CLI: `actualize work [requests [R3]|workflow|capabilities [lens]|contract [stage]|ledger|screen]` and `actualize work ack|run|produce|review|block|fail R3 [--note ...] [--refs ...]`. There is no `accept` verb. Both work with the cockpit closed, against the same file.

The owner's control operations (`human.terminal`, `human.review`, `human.cancel`, `human.bind`, `human.contract`, `human.executor`) arrive only over the authenticated human socket. An agent that sends one gets `AUTHORITY_HUMAN`.

## Where it lives

| concern | file |
|---|---|
| migrations and the two storage classes | `cockpit/server/db.ts` |
| control repository (requests, bindings, contracts, reviews, executors) | `cockpit/server/control.ts` |
| lifecycle table, control operations, screen modes | `cockpit/protocol/work.ts` |
| workflow, graph, task contract | `cockpit/server/workflows.ts` |
| capability catalogue, availability, conflicts | `cockpit/server/capabilities.ts` |
| rows behind `work:` sources, evidence ledger | `cockpit/server/workSources.ts` |
| mode rule and compositions | `cockpit/server/screens.ts` |
| terminal interpreter | `cockpit/server/terminal.ts` |
| core wiring (control ops, tools, Workbench follow, context) | `cockpit/server/core.ts` |
| UI | `cockpit/web/WorkTerminal.tsx` |
| tests | `tests/cockpit/workbench.test.ts`, `workbench.transport.test.ts`, `workbench.e2e.test.ts` |
