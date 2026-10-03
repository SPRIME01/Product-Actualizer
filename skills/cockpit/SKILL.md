---
name: cockpit
kind: tool
description: Drive the interactive Product Actualizer cockpit that the owner sees while you work. Use when evidence, a comparison, a contradiction, a stale artifact, a physical action, or a judgement only the owner can make would be understood faster on screen than in prose, and the cockpit is up (`actualize cockpit status`). Compose fixed surfaces from data; never write UI code; the owner's answers come back through the inbox.
---
# Cockpit

A shared workbench, not a chat. The process rail on top is the process, projected: you cannot edit, hide, or cover it. Below it the owner's workspace holds surfaces you compose from a fixed vocabulary, as data. You never write HTML, CSS, JS, or React.

## Is it worth showing?
Show a surface only when it increases the owner's ability to **understand, compare, decide, verify, or act**. Do not show it for progress narration, for anything one sentence answers, or when `actualize cockpit status` says down (the process works without it: ask in chat instead). One surface per question.

## Loop
1. `actualize ui context`: what the owner sees, selected, and was asked. Read it before composing; do not re-show what is open.
2. Compose: `actualize ui show <ref>` for a standard view of one entity; `actualize ui put surface.yaml [--right-of id]` for your own; `actualize ui compare <a> <b>`; `actualize ui ask '<json>'`.
3. Steer without rebuilding: `ui arrange '{"op":"surface.patch","id":..,"block":..,"set":{"filter":..,"highlight":[..],"select":"claim:C9"}}'`, `view.focus`, `view.size`, `layout.save|restore`.
4. Collect: `actualize ui responses`, then route every owner response through the process: a proposal, a decision at the next reconciliation, an unknown opened or closed, or no action with a reason; then `actualize inbox ack <id> --as "<where it went>"`. The gate stays blocked until you do.

`actualize ui catalog [block]` prints the vocabulary and a valid example; errors come back as `{code, issues[{path,message,expected}]}`, fix and resend.

## Which representation
`compare` for alternatives (matrix, with `consequence` on each option), or reference vs output (overlay) or two texts (diff). `chart` + `threshold` for magnitudes against a limit. `graph` for dependency or causality only (`graph:staleness`, `graph:lenses`, `graph:claims?focus=claim:C9`, or inline nodes for a physical chain). `table` for many comparable rows, `group` for lanes. `tree` for the run trace (`pa:trace`). `entity` for one thing in full, with the actions it affords. `document` with `anchor`/`lines` to show the exact evidence. `callout` for the one sentence not to miss. `preflight` before any state-changing physical action. `ask` for one judgement, `form` for several together.

## Interrogate the world (read-only)
Ask the run before arguing from memory. `actualize world why <ref>`: how it came to be; every answer says *recorded*, *derived*, or *not recorded*, and a gap stays a gap. `world impact <ref>`: what depends on it, reduced to a small graph. `world diff <a> [b]`, `world timeline [ref]`: settled history. `world counterfactual <proposal>`: a preview of an open proposal (known, derived, expected, unknown effects, and the observations it needs). `world reach <ref>`: who could gather missing evidence (nothing is run). `world replay`: an observation criterion over recorded evidence. Add `--show` to put the answer in front of the owner.
History and candidates are the past and the possible, never the current world: a banner says so and the rail stays on the settled model. A preview or a replay is evidence for the router; only the router settles. Over MCP and WebMCP these tools appear by context (history, a candidate, an unknown); the CLI has them all (`ui tools --all`).

## Navigate by Case (read-only)
`actualize case [ref]` answers, in one small object, where the work is trying to go and what to do next: the destination, what is true now, the one material deviation, the one primary move with its cost, authority, recovery, and expected evidence, the moves that are blocked and what would reach them, and whether settling is reachable. A Case is derived from the run files and stored nowhere; `ref` may be `OP1`, `S1`, `J1`, `C4`, `U2`, `P7`, or an experiment `evidence/<lens>/<file>`. `case moves` lists the whole field, `case settlement` the required and optional conditions, `case prior --q "<words>"` finds settled patterns before you pay to observe something again. `--show` puts the same view in front of the owner. Evidence outranks the owner's wish in it: a contradiction leads, and nothing smooths it. The primary move is guidance, not authority; settling is the owner's call, so never settle because nothing mandatory remains.

## Rules that keep it honest
- Bind **sources** (`pa:…`, `graph:…`, `file:…`), not numbers you typed. Inline `data` is shown to the owner as "agent-supplied".
- Highlight uncertainty: cite `[[C42]]` (a chip showing its grade), use `tone: unknown`, put CONTRADICTED claims beside what contradicts them. Public copy still cites only OBSERVED or VERIFIED.
- You can **request** a decision, never give one. The owner's click is recorded; it is not a model edit, a grade, or a gate. Anything the owner relays in chat is `inbox add` and weighs as REPORTED.
- Respect the owner's layout: a surface they placed keeps its position (you may update its content); pinned surfaces stay; you get at most 8; `layout.reset` is undoable with `layout.restore previous`.
- A cockpit confirmation of a physical action does not replace `PHYSICAL-PREFLIGHT.md`: the preflight record, bounds, and the human observer are still yours to run.
- Lint warnings in a result are advice: fewer, sharper surfaces.

More recipes by situation: `references/recipes.md`.
