# Hardware context acquisition

Load when any electronics are in evidence (a board, module, component, harness, or a schematic/BOM/datasheet). The goal is not to
describe the hardware generally; it is to establish what the evidence says **this exact unit** is, keep the detail re-openable, and
send only product-level consequences to the model. Nothing here replaces the unit, and nothing here judges the circuit
(`electronics`), the firmware boundary (`embedded-systems`), or closed-loop behavior (`robotics`).

## Pipeline

| # | Step | Output | Stop and record an unknown when |
|---|---|---|---|
| 1 | **Identify the device.** Markings, silkscreen, labels, date codes, USB descriptors, boot banner, `/proc/device-tree/model`, EEPROM/ID chips, serial number. Photos suggest; they do not establish. | `identity` with how each field was obtained | the only evidence is a marketplace listing or a lookalike |
| 2 | **Resolve exactly:** manufacturer, model/SKU, revision, package, and level (`component`, `module`, `board`, `carrier`, `accessory`, `assembly`). Name the discriminator that separates revisions (silkscreen text, BOM variant, date code, connector population). | one resolved identity per component | a marketing name spans revisions and no discriminator was read |
| 3 | **Locate authoritative sources** in the order below; record each with location, document revision/date, and which revisions it covers. | `sources.md` | the matching-revision artifact is referenced but absent |
| 4 | **Acquire and index.** Keep a local copy or `url@date`, and a page/section map for the parts that matter. An empty 2xx body, a login wall, or a bot page is a failed fetch, not an absent document. | page map per source | the document cannot be retrieved: ask for the file, do not answer from memory |
| 5 | **Extract facts from the document only.** Each number carries its class (`recommended`, `absolute_max`, `typical`, `guaranteed`, `measured`), conditions, page, and document revision. A derived value shows its inputs and arithmetic. | `profile.yaml` | the parameter is not in the document: write `NOT SPECIFIED` plus the likeliest document or the measurement that would close it |
| 6 | **Reconcile revisions** (below). | `manifest.yaml` revisions and contradictions | two artifacts disagree and the unit's revision is unread |
| 7 | **Reconstruct product-relevant connections** from schematic or netlist, then check them against firmware and wiring. | `system-map.md`, `power-tree.md`, `buses.md`, `wiring.md` | a net crosses a sheet or connector that was not supplied |
| 8 | **Write evidence**, then **propose only consequential truths** (last section). | evidence package, proposals | |

## Source authority

```text
actual unit / markings -> supplied matching-revision artifacts -> manufacturer product documentation -> manufacturer
schematic or hardware guide -> exact component datasheet -> official vendor wiki -> official SDK and examples ->
manufacturer errata -> distributor material -> community information (troubleshooting evidence only)
```

- A higher rank wins a conflict only if it covers the same revision; a newer document for a different revision is not a correction.
- **Never substitute generic board knowledge for an exact board and revision when authoritative information exists.** A similar-looking
  module, a pin table for the previous revision, or "all boards of this family do X" is not evidence about the unit being actualized.
- Vendor wiki pin tables and example sketches are `REPORTED` until compared with the schematic; they are usually right and sometimes
  describe a sibling board. A distributor catalogue gives availability and lifecycle as of its query date, and technical suitability
  comes from the datasheet. Community posts explain symptoms; they never set a limit.
- Errata outrank the datasheet they amend. Search for them by exact part and silicon revision; "no errata found" is recorded as the query, not as "none".

## Grades for hardware facts

The subject of a claim decides its grade. Prose documents (datasheets, manuals, guides, vendor wiki, a brief) say what a design is meant to be, so what they state is `REPORTED`,
and a matching-revision manufacturer document is the best `REPORTED`. A design source file read directly (schematic or netlist, BOM, CAD) is `OBSERVED` as a statement about that file at that
revision ("the REV C schematic routes pan to GP12"); a claim about the unit built from it is `INFERRED` and cites both the file claim and the claim that the unit is that revision. Calculated and
simulated values are `INFERRED` and cite their inputs. `OBSERVED` is something read or measured on the unit this project: a marking, an enumeration, a continuity result, a captured boot log;
the same content transcribed or captured by someone else is `REPORTED`, unless a named owner confirms a specific fact in writing (`VERIFIED`). `VERIFIED` otherwise means a check that could
have failed, run on the unit against an expected value. A bus ACK or a driver returning numbers is `OBSERVED` that something answered, never identity or correct function.

## Revision reconciliation

Build a table: artifact kind (unit marking, schematic, layout, BOM, assembly guide, hardware manual, mechanical drawing/CAD, firmware, host
software, datasheet) against the revision it describes and whether that matches the unit. Then test:

- Revisions differ across artifacts -> a contradiction in `manifest.yaml`, never averaged and never resolved to "the latest". The unit in hand
  decides; if the unit's revision is unread, the contradiction stays open and the artifact set is `unreconciled`.
- Part numbers differ between schematic and BOM for the same reference designator; a DNP part treated as fitted, or a populated option the
  schematic omits.
- Firmware pin or address constants that disagree with the schematic nets of the matching revision; software for a component absent from the BOM
  (stub, removed, or never fitted); documentation describing a component the schematic/BOM never contains.
- Package or footprint differences that change pinout (same part family, different package), and module-vs-chip confusion (a module's
  internal regulator, pulls, or level shifter appear in no chip datasheet).
- Datasheet revision older than the silicon revision on the unit, or errata that apply to the fitted stepping.

## Connection reconstruction

Each claim needs evidence of its own type; inference from device type, connector name, page, or neighbors is not enough.

| Claim | Required evidence | Insufficient |
|---|---|---|
| Power domain of a device | its supply pins traced to a named net, and that net's source | the bus pull-up voltage; the neighboring part's rail |
| Bus participant | the device's signal pins on the bus nets | same page, same rail, same family |
| Interface mode | every signal line traced to both endpoints, including lines left unconnected or strapped | connector pin names |
| Address | strap pins traced to their nets plus the datasheet's address table, with 7-bit/8-bit notation stated | the library's default |
| Fitted or not | BOM population and DNP state, then the unit | the schematic symbol |

Negative evidence is evidence: unconnected lines, DNP parts, no-connect marks, and straps define the operating mode. A relay `NC` terminal
is normally closed, not "not connected". On multi-board products record each board as an instance (id, type, revision, role) and each
link (protocol, address or channel, connector, direction, voltage); shared or multiplexed pins on stacked accessories are listed with
what else uses them.

## Evidence package

```text
actualize/evidence/recon-physical/hardware/
  manifest.yaml   unit identity; revisions table; contradictions (H1...) with claim ids; component list; unreconciled flag
  system-map.md   blocks and links, each tagged with its source and grade
  power-tree.md   sources -> regulators/switches -> rails -> loads, documented values and where observed
  buses.md        one row per bus: master, devices, address (7-bit), voltage, speed, pull-ups present, evidence
  wiring.md       as-built connections (what was traced on the unit) vs as-designed (schematic), differences marked
  components/<name>/profile.yaml   identity, role, limits, interfaces, physical, operational, quirks, unknowns
  components/<name>/sources.md     table: id | document | type | revision/date | covers revisions | authority | location | pages used
```

`profile.yaml` keys: `component`, `identity` (manufacturer, model, revision, package, level, ref_des), `role`, `sources` (ids),
`limits` (list: param, min/typ/max, unit, class, conditions, src), `interfaces` (type, pins, address, voltage, src), `physical`
(dimensions_mm, connectors, mounting), `operational` (boot, reset, flash, calibration, recovery), `quirks`, `unknowns`. Every `limits` item
has a `class` and a `src` that resolves in `sources.md`; a value without them is not recorded. Keep it small: record the parameters that
bound a product decision, not the datasheet.

## What reaches the model

Propose only what changes a product decision or claim: `form` (major subsystems, sensors, actuators, ports, and the connections between them,
one line each, citing the package), `constraints` (rail/logic-domain limits, power ceiling, thermal and mechanical envelope, operating
conditions, required revisions), `capabilities` and `claims` (graded as above), `unknowns` (revision unread, document absent, parameter not
specified), and contradictions as `change` proposals naming both artifacts. Pin maps, register addresses, and per-part limits stay in evidence.
