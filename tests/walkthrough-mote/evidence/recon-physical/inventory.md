# recon-physical: inventory (evidence, not a derived artifact)

| file | kind | classification | extracted facts |
|---|---|---|---|
| tests/fixture-mote/hardware/schematic-revC.txt | schematic (text export) | design source, REV C | parts, nets, DNP U5, notes: no battery/charger/IMU |
| tests/fixture-mote/hardware/bom-revB.csv | BOM | design source, rev B | O-1 camera, HM1000 PDM mic, no Q1 |
| tests/fixture-mote/hardware/assembly-guide-revB.md | assembly guide | prose, rev B | direct servo supply, PAN GP10, TILT GP11, O-1, HM1000 |
| tests/fixture-mote/hardware/hardware-guide-revC.md | hardware guide | prose, rev C | O-2, HM1100, Q1, I2C1 addresses, touch pad, 1.22 A budget, 92.4 mm |
| tests/fixture-mote/hardware/cad-neck-revC.json | CAD export metadata | design source, REV C, default configuration, mm | bbox 92.4 x 71.0 x 80.5; stops pan +/-70, tilt -25..+35; no suppressed bodies |
| tests/fixture-mote/hardware/datasheets/*.md (7) | component documents | prose, per part revision | limits per part with class |
| tests/fixture-mote/unit/inspection.txt | owner transcription | unit markings (not photographs) | Pi model, OS, labels; revision letter hidden; mic marking "HM11" |
| tests/fixture-mote/unit/boot-journal.txt | log | owner-supplied capture | KeyError MOTE_STT_KEY, start-limit-hit |
| tests/fixture-mote/unit/neck-boot.log | log | owner-supplied capture from a REV B board | ACKs at 0x29, 0x44 |
| tests/fixture-mote/unit/owner-notes.txt | messages | owner statements | resets on move, shell vs boot, firmware not flashed |
| tests/fixture-mote/brief.txt, docs/old-product-page.md, docs/notes.md, README.md | prose | owner description, February copy, bench notes | claims: 85 mm, follows, battery, touch, private, 3 W, 6 V, 5V-safe |

Dimension cross-source test (lens check 2): head width 85 mm (brief.txt:2, old-product-page.md:6) vs 92.4 mm (CAD): 8.7 % apart, fails the 1 % test -> CONTRADICTED.
Revision table: see hardware/manifest.yaml. Cross-artifact pass: firmware pin map B vs schematic C conflicts on GP10/GP11; README bus/address vs schematic; IMU in code, absent in schematic and BOM; touch pad in guide and page, DNP in schematic; battery in page, absent everywhere else.
Orphan references: hardware-guide-revC.md:26 "see CAD" resolved (cad-neck-revC.json); the Pi-side wiring and boot configuration are referenced nowhere and not supplied.
Images: none supplied; no render, mockup, or photograph contributes any claim.
