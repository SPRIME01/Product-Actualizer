// Computes WCAG 2.x contrast for every text/background pair in brand/tokens.css, light and dark. Run: bun actualize/evidence/direction/contrast.mjs
import fs from "node:fs";
const css = fs.readFileSync(new URL("../../../brand/tokens.css", import.meta.url), "utf8");
const parseBlock = (re) => Object.fromEntries([...css.match(re)[1].matchAll(/--([\w-]+):\s*oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/g)].map((m) => [m[1], [m[2] / 100, +m[3], +m[4]]]));
const light = parseBlock(/:root \{([\s\S]*?)\n\}/);
const dark = parseBlock(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/);
const lin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const toRGB = ([L, C, h]) => { const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map((v) => Math.min(1, Math.max(0, lin(v)))); };
const relLum = (c) => { const [r, g, b] = toRGB(c).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [["ink", "surface-base"], ["ink", "surface-panel"], ["ink-2", "surface-base"], ["ink-2", "surface-panel"], ["ink-3", "surface-base"], ["ink-3", "surface-panel"], ["accent", "surface-base"], ["accent", "surface-panel"], ["accent-on", "accent"], ["ink", "accent-wash"], ["accent", "accent-wash"],
  ...["observed", "verified", "reported", "inferred", "proposed", "unknown", "contradicted"].flatMap((g) => [[`g-${g}`, "surface-base"], [`g-${g}`, "surface-panel"]])];
let fails = 0; const out = [];
for (const [name, set] of [["light", { ...light }], ["dark", { ...light, ...dark }]]) for (const [fg, bg] of pairs) { const r = ratio(set[fg], set[bg]); const ok = r >= 4.5; if (!ok) fails++; out.push(`${name.padEnd(5)} ${fg.padEnd(16)} on ${bg.padEnd(15)} ${r.toFixed(2).padStart(5)}:1 ${ok ? "AA" : "FAIL <4.5"}`); }
console.log(out.join("\n")); console.log(`\n${out.length} pairs, ${fails} below 4.5:1`);
