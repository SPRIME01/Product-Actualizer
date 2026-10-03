// Generates every brand asset from brand/tokens.css, brand/logo/wordmark.json and the Product Model's real claims.
// Run: bun brand/build.mjs      Needs system Chrome (CHROME=/path to override) for the PNG exports.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { parseModel } from "../hooks/src/lib/md.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const out = (...p) => path.join(here, ...p);
for (const d of ["logo", "icons", "social"]) fs.mkdirSync(out(d), { recursive: true });

// ---------- tokens: OKLCH in the CSS, hex in the SVG masters ----------
const css = fs.readFileSync(out("tokens.css"), "utf8");
const block = (re) => Object.fromEntries([...css.match(re)[1].matchAll(/--([\w-]+):\s*oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/g)].map((m) => [m[1], [m[2] / 100, +m[3], +m[4]]]));
const lightT = block(/:root \{([\s\S]*?)\n\}/);
const darkT = { ...lightT, ...block(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/) };
const lin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hex = ([L, C, h]) => { const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, lin(v))) * 255).toString(16).padStart(2, "0")).join(""); };
const pal = (T) => Object.fromEntries(Object.entries(T).map(([k, v]) => [k, hex(v)]));
const LIGHT = pal(lightT), DARK = pal(darkT);

// ---------- the mark: potential (dashed) closing around the actual (solid) ----------
const markBody = (c, o = {}) => {
  const { stroke = 6, a = 9, b = 55, dash = "14 6", block: blk = [29, 29, 20] } = o;
  const [bx, by, bs] = blk;
  return `<path d="M${a} ${b}V${a}H${b}" fill="none" stroke="${c.frame}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-linejoin="miter"/>` +
    `<path d="M${b} ${a}V${b}H${a}" fill="none" stroke="${c.frame}" stroke-width="${stroke}" stroke-linejoin="miter"/>` +
    `<rect x="${bx}" y="${by}" width="${bs}" height="${bs}" fill="${c.block}"/>`;
};
const svg = (w, h, inner, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}"><title>${title}</title>${inner}</svg>\n`;
const W = JSON.parse(fs.readFileSync(out("logo/wordmark.json"), "utf8")).wordmark;
const wm = (fill, height) => { const s = height / (W.y2 - W.y1); return { w: (W.x2 - W.x1) * s, g: `<path transform="translate(${(-W.x1 * s).toFixed(2)} ${(-W.y1 * s).toFixed(2)}) scale(${s.toFixed(5)})" d="${W.d}" fill="${fill}"/>` }; };
const variants = { "": { frame: LIGHT.ink, block: LIGHT.accent, text: LIGHT.ink }, "-dark": { frame: DARK.ink, block: DARK.accent, text: DARK.ink }, "-mono": { frame: "#000000", block: "#000000", text: "#000000" }, "-mono-reversed": { frame: "#ffffff", block: "#ffffff", text: "#ffffff" } };
for (const [suffix, c] of Object.entries(variants)) {
  fs.writeFileSync(out(`logo/mark${suffix}.svg`), svg(64, 64, markBody(c), "Product Actualizer mark"));
  const w = wm(c.text, 34); const gap = 20, W2 = 64 + gap + w.w;
  fs.writeFileSync(out(`logo/lockup${suffix}.svg`), svg(+W2.toFixed(1), 64, markBody(c) + `<g transform="translate(${64 + gap} ${(64 - 34) / 2})">${w.g}</g>`, "Product Actualizer"));
  const w2 = wm(c.text, 22); const SW = Math.max(64, w2.w);
  fs.writeFileSync(out(`logo/stacked${suffix}.svg`), svg(+SW.toFixed(1), 64 + 18 + 22, `<g transform="translate(${((SW - 64) / 2).toFixed(1)} 0)">${markBody(c)}</g><g transform="translate(${((SW - w2.w) / 2).toFixed(1)} ${64 + 18})">${w2.g}</g>`, "Product Actualizer"));
}
// small-size icon: heavier stroke, larger block, fewer dashes, still dashed to solid
const iconBody = (c) => markBody(c, { stroke: 10, a: 9, b: 55, dash: "20 8", block: [27, 27, 22] });
fs.writeFileSync(out("logo/icon.svg"), svg(64, 64, iconBody({ frame: LIGHT.ink, block: LIGHT.accent }), "Product Actualizer icon"));
fs.writeFileSync(out("logo/icon-dark.svg"), svg(64, 64, `<rect width="64" height="64" fill="${DARK["surface-base"]}"/>` + iconBody({ frame: DARK.ink, block: DARK.accent }), "Product Actualizer icon"));
fs.writeFileSync(out("logo/favicon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>.f{stroke:${LIGHT.ink};fill:none}.b{fill:${LIGHT.accent}}@media (prefers-color-scheme:dark){.f{stroke:${DARK.ink}}.b{fill:${DARK.accent}}}</style><path class="f" d="M9 55V9H55" stroke-width="10" stroke-dasharray="20 8"/><path class="f" d="M55 9V55H9" stroke-width="10"/><rect class="b" x="27" y="27" width="22" height="22"/></svg>\n`);

// ---------- raster exports and social cards, drawn in HTML with the vendored fonts ----------
const model = parseModel(fs.readFileSync(path.join(here, "../actualize/product-model.md"), "utf8"));
// A claim is shown whole or not at all: a clipped claim is a different claim.
const claimRow = (id) => { const c = model.claims.get(id); return `<div class="row"><b>${id}</b><span>${c.text}</span><i class="g ${c.grade.toLowerCase()}">${c.grade}</i></div>`; };
const fonts = `@font-face{font-family:"Atkinson Hyperlegible Next";src:url(file://${out("fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2")}) format("woff2");font-weight:200 800}
@font-face{font-family:"JetBrains Mono";src:url(file://${out("fonts/jetbrains-mono-latin-wght-normal.woff2")}) format("woff2");font-weight:100 800}`;
const vars = (P) => `:root{${Object.entries(P).map(([k, v]) => `--${k}:${v}`).join(";")}}`;
const base = `${fonts}${vars(LIGHT)}*{box-sizing:border-box;margin:0}body{background:var(--surface-base);color:var(--ink);font-family:"Atkinson Hyperlegible Next",sans-serif}
.mono{font-family:"JetBrains Mono",monospace}.g{font:500 14px "JetBrains Mono",monospace;font-style:normal;padding:2px 8px;border:1.5px solid currentColor;border-radius:3px;white-space:nowrap}
.observed{color:var(--g-observed)}.verified{color:var(--g-verified)}.reported{color:var(--g-reported)}.inferred{color:var(--g-inferred)}.proposed{color:var(--g-proposed)}.unknown{color:var(--g-unknown)}.contradicted{color:var(--g-contradicted)}
.row{display:grid;grid-template-columns:52px 1fr auto;gap:14px;align-items:center;padding:13px 0;border-top:1.5px solid var(--rule);font-size:20px}.row b{font:600 18px "JetBrains Mono",monospace;color:var(--ink-2)}.row span{color:var(--ink)}`;
const lock = (c, h) => { const w = wm(c.text, 34); const vw = 64 + 20 + w.w; return `<svg width="${(vw * h / 64).toFixed(0)}" height="${h}" viewBox="0 0 ${vw.toFixed(1)} 64">${markBody(c)}<g transform="translate(84 15)">${w.g}</g></svg>`; };
const pages = {
  "social/og.png": { w: 1200, h: 630, html: `<style>${base}body{width:1200px;height:630px;padding:56px 64px;display:grid;grid-template-columns:1fr 520px;gap:48px}.l{display:flex;flex-direction:column;justify-content:space-between}.k{font:500 17px "JetBrains Mono",monospace;color:var(--ink-3);letter-spacing:.02em}h1{font-weight:800;font-size:76px;line-height:1.02;letter-spacing:-.01em;margin-top:26px}.r{align-self:center;background:var(--surface-panel);border:1.5px solid var(--rule);padding:6px 24px 8px}.r .h{font:500 15px "JetBrains Mono",monospace;color:var(--ink-3);padding:14px 0}.r .row{grid-template-columns:48px 1fr auto;font-size:17px;padding:11px 0}</style>
    <div class="l"><div><div class="k">evidence-gated product completion</div><h1>Finish the product. Show the evidence.</h1></div>${lock(variants[""], 56)}</div>
    <div class="r"><div class="h">built_from: model@${model.version}</div>${["C3", "C18"].map(claimRow).join("")}</div>` },
  "social/launch-4x5.png": { w: 1080, h: 1350, html: `<style>${base}body{width:1080px;height:1350px;padding:96px 88px;display:flex;flex-direction:column;justify-content:space-between}.k{font:500 22px "JetBrains Mono",monospace;color:var(--ink-3)}h1{font-weight:800;font-size:112px;line-height:1.0;letter-spacing:-.015em;margin-top:34px}.row{font-size:24px}.row b{font-size:21px}.p{background:var(--surface-panel);border:1.5px solid var(--rule);padding:8px 30px 10px}</style>
    <div><div class="k">built_from: model@${model.version}</div><h1>Finish the product. Show the evidence.</h1></div>
    <div class="p">${["C3", "C18"].map(claimRow).join("")}</div>${lock(variants[""], 72)}` },
  "social/avatar-512.png": { w: 512, h: 512, html: `<style>${base}body{width:512px;height:512px;display:grid;place-items:center}svg{width:300px;height:300px}</style><svg viewBox="0 0 64 64">${markBody(variants[""])}</svg>` },
};
const icons = { "icons/favicon-16.png": 16, "icons/favicon-32.png": 32, "icons/favicon-48.png": 48, "icons/apple-touch-icon.png": 180, "icons/icon-192.png": 192, "icons/icon-512.png": 512 };
for (const [f, s] of Object.entries(icons)) pages[f] = { w: s, h: s, html: `<style>${base}body{width:${s}px;height:${s}px;display:grid;place-items:center;background:${s >= 180 ? "var(--surface-base)" : "transparent"}}svg{width:${s >= 180 ? s * 0.72 : s}px;height:${s >= 180 ? s * 0.72 : s}px}</style><svg viewBox="0 0 64 64">${s < 100 ? iconBody({ frame: LIGHT.ink, block: LIGHT.accent }) : markBody(variants[""])}</svg>`, transparent: s < 100 };
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
for (const [file, p] of Object.entries(pages)) {
  const page = await browser.newPage({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 1 });
  const tmp = out(`.tmp-${path.basename(file)}.html`); fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><body>${p.html}</body>`);
  await page.goto("file://" + tmp); await page.evaluate(() => document.fonts.ready); fs.rmSync(tmp);
  await page.screenshot({ path: out(file), omitBackground: !!p.transparent }); await page.close();
}
await browser.close();
console.log("brand assets written:", Object.keys(pages).length, "rasters;", fs.readdirSync(out("logo")).length, "svg/json files");
