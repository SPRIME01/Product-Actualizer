# Documentation map

This file records what each canonical documentation page is for, which reader need it serves, and **which
concepts it owns**. Its purpose is to prevent the documentation system from growing competing explanations of the
same thing. Before writing a new page, check the concept column: if a concept already has an owner, extend that page
rather than starting another. Update this file whenever a page is created, renamed, split, merged, or removed.

Layer labels are depth, not directory names: Layer 0 orientation, Layer 1 mental model, Layer 2 architecture,
Layer 3 subsystems, Layer 4 workflows, Layer 5 explanation, Layer 6 tutorials, Layer 7 how-to, Layer 8 reference.

## Canonical pages

| page | class | purpose | reader need | prerequisites | related | canonical concepts owned |
|---|---|---|---|---|---|---|
| [README.md](README.md) | orientation | navigation by intent | "where do I start?" | — | all pages | the documentation system's structure; nothing else |
| [getting-started.md](getting-started.md) | tutorial | run the system end to end on your own product | "show me it working" | README | architecture, hooks, cockpit, concepts | the six-step run as a first-time user experiences it; where work lands |
| [concepts.md](concepts.md) | explanation | the vocabulary of the system | "what do these words mean?" | getting-started | architecture, reference/product-model-schema | **the Product Model, lenses, claims, grades, versions, staleness, roles** |
| [architecture.md](architecture.md) | explanation | the canonical high-level architectural model | "how do the pieces relate?" | getting-started | all subsystems, all workflows | **the four layers, runtime topology, data flow, control flow, trust and security boundaries** |
| [physical-products.md](physical-products.md) | how-to + reference | actualize hardware | "my product has a board" | concepts | subsystems/skills, explanation/why-physical… | **the physical lens chain, the hardware evidence package, hardware-specific grades** |
| [subsystems/skills.md](subsystems/skills.md) | reference + explanation | the skill/lens layer as a component | "what may a lens do?" | concepts, architecture | reference/lenses, workflows/a-full-run | **lens file contract, the router's six steps, the enforced rules, what `executes_with` means** |
| [subsystems/hooks.md](subsystems/hooks.md) | reference | the enforcement engine as a component | "how does it deny a write?" | architecture | workflows/hook-enforcement, hooks.md | **the deny rules, run state, the five client adapters and their blocking strength, the installer** |
| [subsystems/cockpit.md](subsystems/cockpit.md) | reference + explanation | the cockpit as a component | "how does the cockpit work?" | architecture | cockpit.md, workflows/cockpit-session, reference/cockpit-protocol | **the rail, surfaces, the three authority tiers, the disposable projection, the known `columns` discrepancy** |
| [workflows/a-full-run.md](workflows/a-full-run.md) | explanation | one run from `begin` to a verdict | "what actually happens?" | concepts, subsystems/hooks | how-to/run-a-governed-run | the wave/reconcile/stale/gate cycle as an execution trace |
| [explanation/why-the-model-is-graded.md](explanation/why-the-model-is-graded.md) | explanation | why grades and per-claim staleness exist | "why is it this way?" | concepts | workflows/a-full-run | **the rationale for the claims ledger, the seven grades, per-claim staleness, the public-citation floor** |
| [explanation/why-authority-is-never-transferred.md](explanation/why-authority-is-never-transferred.md) | explanation | why the agent cannot apply an owner ruling | "why is it this way?" | architecture | subsystems/cockpit, workflows/cockpit-session | **the rationale for three authority tiers, transport-enforced roles, the inbox-as-routing-obligation, its limits** |
| [explanation/why-progressive-disclosure.md](explanation/why-progressive-disclosure.md) | explanation | why only the router loads always | "why is it this way?" | subsystems/skills, subsystems/cockpit | reference/lenses | **the rationale for frontmatter-only selection, `lens start` as sole disclosure, the closed vocabulary** |
| [explanation/why-physical-lenses-load-only-on-evidence.md](explanation/why-physical-lenses-load-only-on-evidence.md) | explanation | why the physical chain is evidence-gated | "why is it this way?" | physical-products | subsystems/skills | **the rationale for the chain, revision-first identity, the preflight discipline** |
| [explanation/why-bun-only.md](explanation/why-bun-only.md) | explanation | why there is one runtime | "why is it this way?" | subsystems/hooks | hooks.md | **the rationale for the single runtime, fail-open hooks, the compiled-executable mitigation** |
| [world-debugger.md](world-debugger.md) | explanation + reference | the read-only operations that interrogate the run | "why is this true, what changed, what depends on it?" | subsystems/cockpit | case-navigation, reference/cockpit-protocol | **the seven world operations, the effect classes, the reach ladder, the replay observer, the viewing banner, tools by context** |
| [case-navigation.md](case-navigation.md) | explanation + reference | the Case, the affordance field, and what the cockpit's composition is for | "where are we trying to go, and what can I do now?" | concepts, world-debugger | subsystems/cockpit, reference/product-model-schema | **the demand sections' semantics, the Case, deviations and salience, the affordance field, `settlementReachable` vs `shouldSettleNow`, decision states, experiments and patterns, the git and gh policy** |
| [workbench.md](workbench.md) | explanation + reference | the Workbench screens, the Work Terminal, work requests, and the storage classes of the cockpit's SQLite | "what do I see as the work changes, and what happens when I type?" | subsystems/cockpit, case-navigation | subsystems/cockpit, case-navigation, reference/cli | **the two storage classes, capability / implementation / executor, the Workbench modes, work-request lifecycle** |
| [reference/cli.md](reference/cli.md) | reference | every command, flag, exit code, env var, `just` recipe | "what are the exact arguments?" | — | how-to, subsystems/hooks, subsystems/cockpit | **the CLI surface, exit codes, environment variables, `just` recipes, the artifact header, what `check.py` enforces and does not** |
| [reference/lenses.md](reference/lenses.md) | reference | every lens and the dependency graph | "which lens do I need?" | concepts | subsystems/skills | **the canonical lens table (`needs`, `executes_with`, ownership) and the graph** |
| [reference/product-model-schema.md](reference/product-model-schema.md) | reference | the model contract | "is my model valid?" | concepts | concepts.md | **the ten sections and field keys, the seven grades, the source format, `proposals.md`, the staleness algorithm, the validity checklist** |
| [reference/cockpit-protocol.md](reference/cockpit-protocol.md) | reference | the typed surface vocabulary | "what can I compose?" | subsystems/cockpit | cockpit.md | **the 15 blocks, the six source families with their columns, refs, actions, error codes, the tools (14 always + 7 by context + `work_update` while pending), the events** |
| [reference/files-and-layout.md](reference/files-and-layout.md) | reference | the run directory and the repository tree | "where is this file?" | — | source-map.md | **the run directory's ownership table, the repository layout, the fixtures** |
| [reference.md](reference.md) | reference | cross-cutting reference index | "what is enforced?" | — | reference/cli.md | what `tests/check.py` enforces **and the four things it does not** |
| [source-map.md](source-map.md) | reference | concept → implementation | "where is it implemented?" | — | reference/files-and-layout.md | the concept/capability/workflow → code map |
| [documentation-map.md](documentation-map.md) | reference | this file | "what owns which concept?" | — | README.md | **canonical knowledge ownership across the documentation system** |
| [workflows/hook-enforcement.md](workflows/hook-enforcement.md) | explanation | one gated tool call, end to end | "why was my write denied?" | subsystems/hooks | troubleshooting | the event path client → adapter → engine → denial; the stop-gate loop |
| [workflows/cockpit-session.md](workflows/cockpit-session.md) | explanation | one live cockpit session | "what happens when I click?" | subsystems/cockpit | cockpit.md | the agent-compose path and the owner-input path as traces |
| [how-to/run-a-governed-run.md](how-to/run-a-governed-run.md) | how-to | execute the enforced sequence | "do this for me" | getting-started | reference/cli, workflows/a-full-run | the operational procedure and its recovery paths |
| [hooks.md](hooks.md) | how-to | install and operate hooks | "set up enforcement" | getting-started | subsystems/hooks, reference/cli | installer usage and per-client configuration |
| [cockpit.md](cockpit.md) | how-to | use the cockpit as an owner or agent | "show me the cockpit" | getting-started | subsystems/cockpit, reference/cockpit-protocol | cockpit task flow; the vocabulary lives in the reference |
| [troubleshooting.md](troubleshooting.md) | reference | diagnose a symptom | "it is broken" | — | every subsystem page | **failure symptoms and their real refusal messages** |

## Repository-root documents

These are not part of the `docs/` knowledge system but are canonical for their own subjects. Do not duplicate
their content into `docs/`.

| file | canonical for |
|---|---|
| `README.md` | the repository front door: what it is, the lens table in brief, how to run and check it |
| `AGENTS.md` | conventions for working *in* this repository |
| `DESIGN.md` | the design system: OKLCH tokens, grade palette, components, Do's and Don'ts |
| `PRODUCT.md` | who the product is for, its purpose, brand personality, anti-references, design principles, accessibility |
| `PROVENANCE.md` | which donor repositories informed which lens, and each donor's licence |

## Concept ownership rules

- A **grade** is defined once, in [concepts.md](concepts.md) (meaning), with the mechanical contract in
  [reference/product-model-schema.md](reference/product-model-schema.md). Other pages link; they do not redefine.
- The **lens table** is owned by [reference/lenses.md](reference/lenses.md). `README.md` may summarise it in one
  line; no other page may restate `reads`/`needs`.
- The **CLI surface** is owned by [reference/cli.md](reference/cli.md). Guides show only the commands they use.
- The **cockpit vocabulary** (blocks, sources, refs, error codes, tools, events) is owned by
  [reference/cockpit-protocol.md](reference/cockpit-protocol.md). `cockpit.md` explains the task flow around it.
- The **deny rules** are owned by [subsystems/hooks.md](subsystems/hooks.md);
  [workflows/hook-enforcement.md](workflows/hook-enforcement.md) traces one execution through them, and
  [troubleshooting.md](troubleshooting.md) lists symptoms. None of the three restates the full rule set.
- The **architecture** is owned by [architecture.md](architecture.md). Subsystem pages describe their component;
  they do not re-derive the layering.
- **Failure symptoms** are owned by [troubleshooting.md](troubleshooting.md). A subsystem page may name a symptom
  and link, but must not build a second symptom table.

## Known gaps

Recorded so a later run can close them rather than re-derive them:

- No dedicated tutorial for an **agent-author** ("I am writing a lens"). The material exists across
  [subsystems/skills.md](subsystems/skills.md) and [reference/lenses.md](reference/lenses.md) but is split.
- No how-to for **adding a cockpit block type or a new client adapter**. Both are described as extension points in
  their subsystem pages, but a step-by-step procedure would serve a reader who is actually doing it.
- No page for the **compiled executable** (`bun run build`) as a distribution topic; it is covered inside
  [reference/cli.md](reference/cli.md) and [explanation/why-bun-only.md](explanation/why-bun-only.md).
- No workflow trace for the **Work Terminal** as a round trip (a typed line → a queued request → the agent
  acknowledging → the owner's acceptance). The interpreter's four outcomes are documented in
  [workbench.md](workbench.md) and the request lifecycle is in
  [reference/cockpit-protocol.md](reference/cockpit-protocol.md), but no page walks one end to end the way
  [workflows/cockpit-session.md](workflows/cockpit-session.md) walks an owner gesture.