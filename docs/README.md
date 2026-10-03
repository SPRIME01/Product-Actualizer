# Documentation

Two products live in this repository: a **specification** (Markdown skills plus a model schema) and an
**optional runtime** (a Bun enforcement engine, and a cockpit UI). Start here, then pick a path by intent.

New to the repository? Read [Getting started](getting-started.md) — it takes you from an untouched checkout to a
governed run on your own product. Trying to understand the shape of the thing? Read
[Architecture](architecture.md).

## Learn the system

Orientation → mental model → architecture → subsystems. Stop when you have enough.

| page | read it to |
|---|---|
| [Getting started](getting-started.md) | run the system on your own product, start to finish |
| [Concepts](concepts.md) | understand the Product Model, lenses, claims, versions, and staleness |
| [Architecture](architecture.md) | understand the layers, runtime processes, data flow, dependency direction, and trust boundaries |
| [The skills subsystem](subsystems/skills.md) | understand the router, the 17 lenses, and what a lens may and may not do |
| [The hooks subsystem](subsystems/hooks.md) | understand the engine, its deny rules, its state, and its five client adapters |
| [The cockpit subsystem](subsystems/cockpit.md) | understand the rail, surfaces, authority tiers, and the disposable projection |
| [Products with hardware](physical-products.md) | actualize boards, firmware, sensors, actuators, and robots: lens chain, evidence package, preflight |

## Follow execution

What actually happens, traced end to end against the tests that verify it.

| page | read it to |
|---|---|
| [A full run](workflows/a-full-run.md) | follow a run from `begin` to a gate verdict, wave by wave |
| [Hook enforcement](workflows/hook-enforcement.md) | follow one gated tool call from a client event to a denial |
| [A cockpit session](workflows/cockpit-session.md) | follow an agent composing a surface and an owner's answer landing in the inbox |

## Get something done

| page | read it to |
|---|---|
| [Run a governed run](how-to/run-a-governed-run.md) | execute the enforced sequence with the exact commands, validation, and recovery |
| [Hooks](hooks.md) | install and operate the enforcement hooks across the five clients |
| [Cockpit](cockpit.md) | use the cockpit: the rail, surfaces, authority, the inbox, WebMCP |
| [Case navigation](case-navigation.md) | see where the work is trying to go, what stands between, the one move that answers it, its cost and authority, and whether settling is reachable |
| [Workbench and Work Terminal](workbench.md) | see the view that fits the work now, ask about it in plain words, queue work for an agent, and review what comes back |
| [World debugger](world-debugger.md) | ask why something is true, what changed, what depends on it, what a candidate would do, and who could gather missing evidence |
| [Troubleshooting](troubleshooting.md) | diagnose a symptom; every row is keyed to a real refusal message |

## Understand why

Where the evidence supports a rationale, this layer states it — and marks inference as inference.

| page | read it to |
|---|---|
| [Why the model is graded](explanation/why-the-model-is-graded.md) | understand why claims carry grades, why staleness is per-claim, and what the public-citation floor costs |
| [Why authority is never transferred](explanation/why-authority-is-never-transferred.md) | understand why the agent cannot apply the owner's answer and the cockpit cannot edit the model |
| [Why progressive disclosure](explanation/why-progressive-disclosure.md) | understand why only the router and schema always load, and why the cockpit is a vocabulary not a code surface |
| [Why physical lenses load only on evidence](explanation/why-physical-lenses-load-only-on-evidence.md) | understand the evidence-gated chain and why the preflight discipline exists |
| [Why Bun only](explanation/why-bun-only.md) | understand the single-runtime constraint, what it buys, and what it costs |

## Look something up

| page | read it to |
|---|---|
| [CLI](reference/cli.md) | an exact command, flag, default, exit code, environment variable, `just` recipe, or the artifact header |
| [Lenses](reference/lenses.md) | every lens, its `reads`/`needs`/`executes_with`, and the dependency graph |
| [Product Model schema](reference/product-model-schema.md) | write or validate a `product-model.md`: sections, grades, sources, `proposals.md`, staleness |
| [Cockpit protocol](reference/cockpit-protocol.md) | compose a surface: 15 blocks, source grammar (`pa:`, `graph:`, `case:`, `work:`, `world:`, `file:`), refs, actions, error codes, 22 tools, events |
| [Files and layout](reference/files-and-layout.md) | find a file: the run directory, this repository, and the test fixtures |
| [Reference index](reference.md) | the cross-cutting summaries: what `tests/check.py` enforces, and what it does not |
| [Documentation map](documentation-map.md) | which page owns which concept, what each one must not duplicate, and the repository-root documents that stay outside `docs/` |

## Find the implementation

- [Source map](source-map.md) — concept → implementation location
- [Files and layout](reference/files-and-layout.md) — the run directory and this repository's tree

## Worked examples

Two complete runs live in the repository as hand-executed transcripts, and both are replayed by `bun test`:

- `tests/walkthrough/TRANSCRIPT.md` — **Loam**, a software-and-sensor product, taken to a `defer` verdict.
- `tests/walkthrough-mote/TRANSCRIPT.md` — the **Mote**, a hardware and physical-AI product, taken to a `no-go`
  gate. It shows revision contradictions, a power budget the hardware guide understated, and a gate that refuses
  hardware claims never exercised on the unit.
