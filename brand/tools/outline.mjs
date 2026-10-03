// Converts the wordmark text to outlined SVG path data, once, so the logo files need no font at view time.
// Reproduce: in a scratch directory run `npm i opentype.js@1.3.4 @fontsource/atkinson-hyperlegible-next @fontsource/jetbrains-mono`,
// (opentype.js 2.x produced NaN path data for this font; 1.3.4 is the version that worked), then `bun outline.mjs <that directory>/node_modules`. Output: brand/logo/wordmark.json (committed).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const nm = path.resolve(process.argv[2] ?? "node_modules");
const require = createRequire(path.join(nm, "x.js"));
const opentype = require("opentype.js");
const load = (p) => { const b = fs.readFileSync(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const text = load(path.join(nm, "@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-800-normal.woff"));
const mono = load(path.join(nm, "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff"));
const SIZE = 100;
const out = {};
for (const [key, font, str] of [["wordmark", text, "Product Actualizer"], ["stamp", mono, "built_from: model@N"], ["cli", mono, "actualize"]]) {
  const p = font.getPath(str, 0, 0, SIZE, { kerning: true });
  const b = p.getBoundingBox();
  out[key] = { text: str, size: SIZE, d: p.toPathData(2), x1: +b.x1.toFixed(2), y1: +b.y1.toFixed(2), x2: +b.x2.toFixed(2), y2: +b.y2.toFixed(2), unitsPerEm: font.unitsPerEm, ascender: font.ascender, descender: font.descender };
}
fs.writeFileSync(new URL("../logo/wordmark.json", import.meta.url), JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${(v.x2 - v.x1).toFixed(0)} x ${(v.y2 - v.y1).toFixed(0)} @${SIZE}`])));
