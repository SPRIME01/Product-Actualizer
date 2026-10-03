# Product Actualizer: public site

Static HTML, CSS and ES modules. No framework, no runtime network calls, no analytics, no cookies. Output is the folder `website/public/`.

## Build

```
bun website/build.mjs                        # relative URLs
SITE_URL=https://example.org bun website/build.mjs   # absolute Open Graph image URLs (social previews need them)
```

The build refuses to run if `actualize/artifacts/marketing/website-copy.md` is stale against `actualize/product-model.md`, fails the product's own validator, or cites any claim below OBSERVED. Every sentence on the page comes from that copy file. The claims table at the foot of the page is generated from the model.

What the build copies in: `brand/tokens.css`, the two fonts, icons and social cards from `brand/`, the repository's validator (`hooks/src/lib/md.mjs`, unmodified), the Loam worked example from `tests/walkthrough/`, the lens front matter from `skills/`, the work-request transition table from `cockpit/protocol/work.ts`, and, when rendered, the film from `media/explainer/renders/`.

## Verify

```
bun website/qa.mjs      # needs system Chrome; writes actualize/evidence/fidelity-qa/site-qa.md
```

It opens the built files in Chrome and measures: overflow at 320 to 1440 px in light and dark, computed colours against the tokens, contrast on rendered text, font loading, keyboard order and focus rings, the demos driven by keyboard and compared with the repository's own validator, wave function and cockpit `Control.move`, reduced motion, copy trace, payload size, links, and console errors.

## Deploy

Upload the contents of `website/public/` to any static host. Requirements: serve `.mjs` as JavaScript, enable gzip or brotli (the payload budget assumes it), and serve `404.html` for unknown paths.

```
# Cloudflare Pages, for example
bunx wrangler pages deploy website/public --project-name product-actualizer
```

Not decided: the hosting account and the domain (model unknown U7). Nothing here deploys itself.

## Before it is public

1. The `Read the run` link points at `github.com/SPRIME01/Product-Actualizer/tree/main/actualize`. It answers 404 until the run is pushed.
2. The page deliberately does not invite reuse of the code, because the repository has no license (U1). When the owner declares one, record it in the model, update the copy artifact, rebuild.
3. The film's voiceover rights are unconfirmed (U14); see `launch/README.md`.
