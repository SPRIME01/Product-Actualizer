built_from: model@6
reads: [purpose, actors, capabilities, constraints, form, claims, unknowns, decisions]
cites: [C1, C8, C14, C22, C44, C45, C46, C47, C48, C56, C57, C59, C63, C64, C65, C67, C68, C72, C75, C78]
public: false
verdict: no-go
owner: owner (Dana)

# Release gate: Mote beta kit (10 builders) with a public spec sheet

Bar (D2): no public claim below OBSERVED/VERIFIED, and every claim that a physical feature works exercised on a REV C unit.

Ledger walk (sources re-opened): [C22] cad-neck-revC.json:6 reads 92.4 x 71.0 x 80.5; [C1] tests re-run, 3 passed; [C14] ci-build.log:3 reads "5 files OK"; [C64] pincheck.py re-run, exit 1, 5 findings; [C57] budget.py re-run, 2.76 A and 3.06 A rows reproduce; [C8] executed, see below.
Executed: `from mote import config` without MOTE_STT_KEY raised KeyError (P24 regrades [C8] to VERIFIED). The same cause explains the boot failure [C68] but the service itself has not been restarted on a unit (U10).
Cross-artifact extraction: the public spec sheet says 92.4 mm; the brief and the live February page say 85 mm, 8.7 % narrower than the CAD [C44]. The live page also claims a follow-with-head behavior [C45], an eight-hour battery [C46], a touch wake [C47], and on-device privacy [C48]; all four are CONTRADICTED, so the page cannot stay up with a launch of this kit.
Placeholder scan: spec sheet none. Shipped code has a placeholder: STT_URL is stt.example.com (host/mote/config.py:7).
Staleness: after D7, history/electrical-review@2 and history/bringup@3 were stale (they cited claims whose parents changed); both were rebuilt at model@5. behavior-envelope (model@4) and spec-sheet cite no claim touched by D7 or D9 and are current.
Spec-sheet wording: the draft built at model@4 said the neck "pans +/-70 degrees"; the CAD claim allows it, but a servo range is a physical claim needing command plus observation. Returned to marketing; the current text says "designed to" and states travel is unmeasured.
Not run (no unit access): every row below marked no; link and signup sweep (no call to action exists, U13); clean-image install (the setup text is deprecated, [C56]); human listen.

## Physical evidence walk

| id | claim | required test | evidence kind | exercised on the unit | result |
|---|---|---|---|---|---|
| PHY1 | camera works | capture a real frame with the libcamera tools and inspect it | documentation | no | none |
| PHY2 | microphone works | inspected capture at the expected rate and level (the host configuration describes the PDM part, [C78]) | documentation | no | none |
| PHY3 | speaker is audible | output with the amplifier enabled plus a named person's confirmation ([C67]) | documentation | no | none |
| PHY4 | servos reach the stated range | command plus an independent observation of travel | build | no | none |
| PHY5 | head stops safely | bounded-stop test after a killed host ([C72]) | documentation | no | none |
| PHY6 | sensors are accurate | calibration against a reference ([C75], [C63]) | documentation | no | none |
| PHY7 | starts unattended at boot | actual reboot of the unit | unit capture | yes | fail |
| PHY8 | update and recovery work | exercise the recovery path (U9) | documentation | no | none |
| PHY9 | supply holds under motion and speech | rail measured at the worst event ([C57]) | calculation | no | none |

Verdict: no-go for the beta kit. Accountable owner: owner (Dana). No waivers.
Blockers: U14 (no physical claim exercised on a REV C unit); the REV B firmware does not drive the REV C servo supply or pins [C65]; about 5 V on RP2040 pins [C59]; the +5V budget [C57]; the boot failure (PHY7); the live page's contradicted claims.
Next, in order: electronics M3, M5, M1; embedded-systems REV C build and restart test; robotics bounded first motion; then rerun this gate.
