# Site QA, 2026-10-03

Command: `bun website/build.mjs && bun website/qa.mjs`. Opens the delivered files in system Chrome and measures; it shares no code with the build.

| id | check | result | detail |
|---|---|---|---|
| L1 | no horizontal overflow at 320px, light | pass | scrollWidth 320/320, offenders 0 |
| L1 | no horizontal overflow at 320px, dark | pass | scrollWidth 320/320, offenders 0 |
| L1 | no horizontal overflow at 375px, light | pass | scrollWidth 375/375, offenders 0 |
| L1 | no horizontal overflow at 375px, dark | pass | scrollWidth 375/375, offenders 0 |
| L1 | no horizontal overflow at 768px, light | pass | scrollWidth 768/768, offenders 0 |
| L1 | no horizontal overflow at 768px, dark | pass | scrollWidth 768/768, offenders 0 |
| L1 | no horizontal overflow at 1024px, light | pass | scrollWidth 1024/1024, offenders 0 |
| L1 | no horizontal overflow at 1024px, dark | pass | scrollWidth 1024/1024, offenders 0 |
| L1 | no horizontal overflow at 1440px, light | pass | scrollWidth 1440/1440, offenders 0 |
| L1 | no horizontal overflow at 1440px, dark | pass | scrollWidth 1440/1440, offenders 0 |
| T1 | computed colours are all tokens (light) | pass | 594 text nodes checked |
| T2 | font families are the two specified (light) | pass | [["Atkinson Hyperlegible Next",237],["JetBrains Mono",357]] |
| T3 | text contrast on rendered backgrounds, WCAG AA (light) | pass | all text meets 4.5:1 (3:1 large) |
| T4 | both font files loaded, none fell back | pass | Atkinson Hyperlegible Next, JetBrains Mono |
| T1 | computed colours are all tokens (dark) | pass | 594 text nodes checked |
| T2 | font families are the two specified (dark) | pass | [["Atkinson Hyperlegible Next",237],["JetBrains Mono",357]] |
| T3 | text contrast on rendered backgrounds, WCAG AA (dark) | pass | all text meets 4.5:1 (3:1 large) |
| A1 | lang, one h1, landmarks, title, description, og:image | pass | {"lang":"en","h1":1} |
| A2 | every image has alt; every control has an accessible name | pass | missing alt 0, unnamed 0 |
| A3 | heading levels never skip a level | pass | skips 0 |
| A4 | interactive targets at least 44px in one dimension | pass | 0 smaller |
| K1 | keyboard: every focus stop has a visible 2px+ outline, no trap | pass | 125 stops; without ring: none |
| K2 | first Tab stop is the skip link and it jumps to main | pass | skip/Skip to content |
| D1 | ledger demo: keyboard downgrade prints the repository validator's exact refusal | pass | public artifact cites C1 graded REPORTED; only OBSERVED or VERIFIED may be public |
| D2 | ledger demo: restoring returns validateArtifact: [] | pass |  |
| D3 | ledger demo: all five single-claim downgrades match the repository validator | pass |  |
| D4 | lab: downgrading C1 stales the public page that cites it and leaves an unrelated artifact current | pass |  |
| D5 | lab: rebuilding the public page unchanged is refused with the validator's text | pass |  |
| D6 | lab: rebuilding without C1 passes | pass |  |
| D7 | waves: the page's wave function equals the engine's for all four presets | pass |  |
| D8 | waves: preset buttons run without error | pass |  |
| D9 | lifecycle: the page's move equals the cockpit's Control.move for all 162 (from, to, by) combinations | pass | 0 differences |
| D10 | lifecycle: an agent's attempt to accept returns AUTHORITY_HUMAN in the page | pass |  |
| M1 | prefers-reduced-motion: no element transitions or animates | pass | 0 elements |
| C1 | every claim chip resolves to a row in the page's ledger, and every row is OBSERVED or VERIFIED | pass | 84 chips, 52 rows |
| C2 | every paragraph that contains a number carries a claim chip | pass |  |
| C3 | the validator shipped to the browser is byte-identical to hooks/src/lib/md.mjs | pass | 2954367383f30b02 |
| C4 | the site was built from copy that is current against the model and valid | pass | model@10 |
| P1 | estimated first-load transfer (gzip text, fonts as is) excluding images and film is within the 150 KB budget | pass | 112 KB (html 17, js 10, css 7, fonts 73, json 5) |
| P2 | largest contentful paint under 2.5 s and layout shift under 0.1 on localhost | pass | LCP 112 ms, CLS 0.015 (localhost, no throttling) |
| N1 | every in-page link resolves to an element | pass | 96 links |
| N2 | every external link answers 200 | FAIL | 404 https://github.com/SPRIME01/Product-Actualizer/tree/main/actualize |
| R1 | no console errors, no page errors, no failed or 4xx/5xx requests across the run | pass |  |

42 of 43 passed.
