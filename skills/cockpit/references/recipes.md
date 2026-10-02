# Recipes: situation to surface

Each is data you send with `actualize ui put`; the schemas live in code and `actualize ui catalog`.

| Situation | Surface (intent) | Blocks, in order |
|---|---|---|
| Recon found contradictions | verify | table `pa:claims?grade=CONTRADICTED` → entity `follow` it → document of the contradicting source with `lines` |
| Three options for a decision | decide | compare `matrix` (criteria, `consequence` per option) → callout (the unknown that decides it) → ask `select` with `resolves` |
| Rendered output vs reference | verify | compare `overlay` → media with `pins` on defects → chart of per-region delta with a tolerance `threshold` |
| Power / timing / budget | verify | callout (the failing corner, `[[claim]]`) → chart with `threshold` → table of states `file:…#table1` grouped by verdict |
| Wiring or control chain | verify | graph (inline nodes: sensor → bus → MCU → driver → actuator, tone on suspect links) → table of measurements → preflight if acting |
| Before touching hardware | decide | preflight (class, target, current state, expected, stop-if, bounds, bounded-by, observation, recovery) |
| Public copy vs evidence | verify | document of the artifact → table `pa:claims` filtered to REPORTED/INFERRED → entity of the artifact |
| Open proposals at a reconciliation | decide | table `pa:proposals?status=open` → entity `follow` (consequence + actions) |
| Why is this stale | verify | graph `graph:staleness` → table `pa:artifacts?stale=1` → entity `decision:D<n>` |
| Release gate | decide | entity `gate` → table `pa:blockers` → table of the gate's evidence walk grouped by result → form for an exception (`confirm` + `multiline`) |
| Where is the run | monitor | progress `wave` → tree `pa:trace` |
| Why is this true | inspect | `actualize world why <ref> --show` (entity → table `world:why` → graph `graph:why` → timeline `world:timeline`) |
| What does this decision touch | inspect | `world impact <ref> --show` (graph `graph:impact` → table `world:impact`); add `--gate` to keep only what reaches the gate |
| What changed since version N | compare | `world diff N --show` (table `world:diff` grouped by change → graph of the first changed claim → compare diff of the two model files) |
| What if we accepted this | verify | `world counterfactual proposal:P<n> --show` (entity → table `world:counterfactual` grouped by class → graph); then `ask` the owner only about what only they can decide |
| What would settle this unknown | verify | `world reach unknown:U<n>`, then `ask_human` if the best provider is the owner; the answer comes back as a recorded response |
| Is this measurement still true | verify | `world replay --selects file:evidence/<lens>/<file>#table1 --expect margin_a~gt~0`; a failing row is evidence for a proposal, not a regrade |

Layout moves: `place: {rel: right|below|within, to: <surface id>, size: 0.4}`. Open evidence beside what the owner is reading (`rel: right, to: <their surface>`), not over it. Minimize a surface you are done with (`view.size minimized`) instead of closing the owner's work.
