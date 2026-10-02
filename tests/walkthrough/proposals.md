# proposals.md

| id | lens | field | kind | proposal | evidence | status | reason |
|---|---|---|---|---|---|---|---|
| P1 | recon-software | capabilities | discovery | K1 convert reading, K2 upload, K3 email alert, each with its four-state trace | evidence/recon-software/trace.md | accepted:D1 | |
| P2 | recon-software | claims | discovery | C1-C6, C12, C13 with grades; C5 and C6 CONTRADICTED against README | evidence/recon-software/trace.md | accepted:D1 | |
| P3 | recon-software | constraints | discovery | Technical constraints: env vars, one-unit calibration, missing hardware module; no license file | evidence/recon-software/trace.md | accepted:D1 | |
| P4 | recon-physical | form | discovery | Render classified as render; C7-C11 from the brief; no dimensions | evidence/recon-physical/inventory.md | accepted:D1 | |
| P5 | recon-physical | unknowns | discovery | U1-U6: dimensions, waterproof rating, audience, battery test, render origin, endpoint host | evidence/recon-physical/inventory.md | accepted:D1 | |
| P6 | brand | positioning | discovery | Positioning: measures moisture directly vs. finger test or schedule; not for app seekers | tests/fixture/brief.txt:1; C1; C2; C13 | accepted:D4 | |
| P7 | brand | voice | discovery | Voice: plain, short, a little wry; lexicon and refused words | artifacts/brand/identity.md | accepted:D5 | |
| P8 | brand | constraints | discovery | Use 'Loam (working name)'; clearance not run, so U7 | artifacts/brand/identity.md | accepted:D6 | |
| P9 | provenance-licensing | constraints | discovery | Repository unlicensed; no public code claims until owner picks a license (U8) | C12 | accepted:D7 | |
| P10 | provenance-licensing | constraints | change | Exclude the render from public artifacts until authorship and permission are confirmed | tests/fixture/brief.txt:5 | accepted:D8 | |
| P11 | marketing | positioning | change | Reposition as "the only soil sensor with email and SMS alerts" | tests/fixture/loam-fw/README.md:8 | rejected | Rests on C5 (SMS), graded CONTRADICTED: README states it, alerts.py:23-25 raises NotImplementedError. "Only" is a comparative with no ledger claim about any competitor. Revisit only with new evidence: shipped SMS and a competitor comparison. |
| P12 | marketing | unknowns | discovery | U9: signup channel, price, ship date are unknown, so the page has no call to action | artifacts/marketing/beta-page.md | accepted:D9 | |
| P13 | release-readiness | claims | change | C4 to CONTRADICTED; add C14 VERIFIED; reword K3 | executed check: should_alert(10.0), should_alert(80.0) both False | accepted:D10 | |
| P14 | release-readiness | decisions | discovery | Gate verdict defer; blocker U9; non-blockers U5, U7, U8 | TRANSCRIPT.md step 7 | accepted:D11 | |
