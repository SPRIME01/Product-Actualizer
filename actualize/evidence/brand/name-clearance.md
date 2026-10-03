# Name screening (not legal clearance), 2026-10-03
Method: web search through Exa, `gh search repos`, `npm view`, `getent hosts` (DNS resolves or not). A name with no DNS record is not proven available.

| candidate | live AI-agent / dev-tool use found | npm | domains tried | meaning check | verdict |
|---|---|---|---|---|---|
| Product Actualizer Architect | none found | n/a | n/a | "Architect" suggests a design-time role the product does not play; four words, no one will say it | descriptor only |
| **Product Actualizer** | none found: only this repo; a LinkedIn handle "alextheactualizer" is unrelated | `product-actualizer` free (404) | productactualizer.com, .dev, .ai: no DNS record | "Actualize" = make real, matches the mechanism; secondary sense "self-actualization" (psychology), disambiguated by "Product" | **selected** |
| Actualize | actualize.co.in (services firm); actualize.ai resolves | `actualize` taken | actualize.dev: no DNS; actualize.ai: resolves | generic verb; common word, hard to own | rejected |
| Actualizer | actualizer.ai resolves; no product found | `actualizer` free | actualizer.dev: no DNS | invented, transparent | held as short form, not the lead |
| Warrant | warrant.build ("an instrument for evidence") and warrantai.dev ("decision records for AI agents") | n/a | n/a | legal sense collides | rejected: live AI-evidence products |
| Plumbline | plumblinehq.ai ("Verification for AI-built software") and several GitHub repos | n/a | n/a | strong metaphor | rejected: live verification service in the same space |

Not run: trademark register search (USPTO/EUIPO/WIPO), registrar availability check, handle checks (X, Bluesky, LinkedIn), the three-person spoken test. These are U6 and U8.
Decision basis: keep the equity and the CLI verb (`actualize`), drop "Architect" from public use, and avoid the two stronger metaphors because live products already hold them.
