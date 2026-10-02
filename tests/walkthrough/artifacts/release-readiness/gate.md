built_from: model@4
reads: [purpose, actors, capabilities, constraints, form, voice, positioning, claims, unknowns, decisions]
cites: [C1, C2, C3, C13, C14]
public: false
verdict: defer
owner: product owner

# Release gate: Loam beta page

Ledger walk (sources re-opened): C1 [C1] sensor.py:7-9 reads as stated. C2 [C2] tests re-run, 2 passed. C3 [C3] uplink.py:7-11 posts JSON.
C13 [C13] listing shows no app code. C14 [C14] `should_alert(10.0)` and `should_alert(80.0)` printed `False False`, so the email alert never fires.

Staleness: after D10 the marketing page was rebuilt at model@4; brand and provenance-licensing artifacts do not cite C4 and stay current.
Placeholder scan: none. Name check: "Loam (working name)" on every surface. Executed action test: alert path (failed, see C14).
Not run: link and CTA sweep (no call to action exists), clean-room install (hardware module absent), name screening, human listen.

Verdict: defer. Blocker: U9, no signup channel, so the page has no call to action. Non-blocking by decision: U5 (no image shipped), U7 (working-name label), U8 (no code claims).
