// Builds website/public from the validated copy artifact, the Product Model, and the repository's own data.
//   bun website/build.mjs            (SITE_URL=https://example.org bun website/build.mjs   for absolute Open Graph URLs)
// Refuses to build if the copy is stale against the model, or cites a claim below OBSERVED, using the product's own validator.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseModel, parseStamp, validateArtifact, PUBLIC_GRADES } from "../hooks/src/lib/md.mjs";
import { loadLenses, waves } from "../hooks/src/lib/lenses.mjs";
import { TRANSITIONS, REQUEST_STATUSES, TERMINAL } from "../cockpit/protocol/work.ts";

const root = path.resolve(import.meta.dir, "..");
const R = (...p) => path.join(root, ...p);
const out = R("website/public");
const SITE_URL = (process.env.SITE_URL ?? "").replace(/\/$/, "");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const die = (m) => { console.error("website build refused: " + m); process.exit(1); };

// ---------- the copy, validated by the product's own rules ----------
const model = parseModel(fs.readFileSync(R("actualize/product-model.md"), "utf8"));
const copyText = fs.readFileSync(R("actualize/artifacts/marketing/website-copy.md"), "utf8");
const stamp = parseStamp(copyText);
if (stamp.built !== model.version) die(`website-copy.md was built from model@${stamp.built}; the model is at ${model.version}. Re-run the marketing lens.`);
const errs = validateArtifact(copyText, model, { lensReads: null });
if (errs.length) die("website-copy.md fails validation: " + errs.join("; "));
if (!stamp.public) die("website-copy.md is not marked public");
const copy = {};
for (const m of copyText.matchAll(/^## (\S+)\n([\s\S]*?)(?=\n## |\s*$)/gm)) copy[m[1]] = m[2].trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cited = new Set();
const chip = (id) => { cited.add(id); const c = model.claims.get(id); return `<a class="cl" href="#claim-${id}" title="${id}: ${c.grade}">${id}</a>`; };
const html = (key) => { if (!(key in copy)) die(`template asks for copy key "${key}", which website-copy.md does not define`); return esc(copy[key]).replace(/(\s*)\[(C\d+)\]/g, (_, sp, id) => (sp ? " " : "") + chip(id)); };
const plain = (key) => esc(copy[key].replace(/\s*\[C\d+\]/g, ""));

// ---------- generated data ----------
fs.rmSync(out, { recursive: true, force: true });
for (const d of ["css", "js", "data", "vendor", "fonts", "img", "social", "icons", "media"]) fs.mkdirSync(path.join(out, d), { recursive: true });
const cp = (from, to) => fs.copyFileSync(from, path.join(out, to));
cp(R("brand/tokens.css"), "css/tokens.css");
for (const f of fs.readdirSync(R("brand/fonts")).filter((f) => f.endsWith(".woff2"))) cp(R("brand/fonts", f), "fonts/" + f);
for (const f of fs.readdirSync(R("brand/icons"))) cp(R("brand/icons", f), "icons/" + f);
for (const f of fs.readdirSync(R("brand/social"))) cp(R("brand/social", f), "social/" + f);
cp(R("brand/logo/favicon.svg"), "icons/favicon.svg"); cp(R("brand/logo/mark.svg"), "img/mark.svg");
cp(R("website/src/css/site.css"), "css/site.css");
for (const f of fs.readdirSync(R("website/src/js"))) cp(R("website/src/js", f), "js/" + f);
// the product's own validator, shipped unmodified so the demos run the real code
cp(R("hooks/src/lib/md.mjs"), "vendor/md.mjs");
const wt = R("tests/walkthrough");
const loam = {
  note: "Loam is a fictional soil probe used as a worked example (tests/walkthrough). These are its real files.",
  model: fs.readFileSync(`${wt}/product-model.md`, "utf8"),
  artifacts: ["marketing/beta-page.md", "brand/identity.md", "provenance-licensing/ledger.md", "release-readiness/gate.md"].map((p) => ({ path: p, text: fs.readFileSync(`${wt}/artifacts/${p}`, "utf8") })),
};
fs.writeFileSync(path.join(out, "data/loam.json"), JSON.stringify(loam));
const readEx = (dir, label, note, arts) => ({ label, note, model: fs.readFileSync(R(dir, "product-model.md"), "utf8"), artifacts: arts.map((a) => ({ path: a, text: fs.readFileSync(R(dir, "artifacts", a), "utf8") })) });
const examples = {
  loam: readEx("tests/walkthrough", "Loam, a fictional soil probe (software and a sensor)", "Real files from tests/walkthrough.", ["marketing/beta-page.md", "brand/identity.md", "provenance-licensing/ledger.md", "release-readiness/gate.md"]),
  mote: readEx("tests/walkthrough-mote", "Mote, a fictional desk robot (hardware and physical AI)", "Real files from tests/walkthrough-mote.", ["marketing/spec-sheet.md", "electronics/electrical-review.md", "embedded-systems/bringup.md", "robotics/behavior-envelope.md", "release-readiness/gate.md"]),
};
fs.writeFileSync(path.join(out, "data/examples.json"), JSON.stringify(examples));
const lensMap = loadLenses();
const lensList = Object.values(lensMap).map((l) => ({ name: l.name, description: l.description, reads: l.reads, needs: l.needs, executesWith: l.executesWith }));
const presets = {
  "A software product that needs a launch page": ["recon-software", "brand", "marketing", "release-readiness"],
  "A launch film with narration": ["recon-software", "brand", "direction", "motion-editorial", "audio-sound", "release-readiness"],
  "This site's own run": ["recon-software", "brand", "direction", "experience", "marketing", "illustration", "motion-editorial", "audio-sound", "fidelity-qa", "provenance-licensing", "release-readiness"],
  "A hardware product to bring up": ["recon-physical", "electronics", "embedded-systems", "robotics", "provenance-licensing", "release-readiness"],
  "A physical product with a launch film": ["recon-physical", "electronics", "embedded-systems", "brand", "direction", "product-visualization", "motion-editorial", "audio-sound", "provenance-licensing", "release-readiness"],
};
const presetWaves = Object.fromEntries(Object.entries(presets).map(([k, v]) => [k, waves(lensMap, v)]));
fs.writeFileSync(path.join(out, "data/lenses.json"), JSON.stringify({ lenses: lensList, presets, presetWaves }));
fs.writeFileSync(path.join(out, "data/lifecycle.json"), JSON.stringify({ statuses: REQUEST_STATUSES, terminal: TERMINAL, transitions: TRANSITIONS }));

// ---------- the page ----------
const lockup = fs.readFileSync(R("brand/logo/lockup.svg"), "utf8")
  .replace(/stroke="#[0-9a-f]{6}"/g, 'stroke="currentColor"').replace(/<rect([^>]*)fill="#[0-9a-f]{6}"/, '<rect$1fill="var(--accent)"').replace(/<path([^>]*)fill="#[0-9a-f]{6}"/g, '<path$1fill="currentColor"')
  .replace(/ width="[\d.]+" height="[\d.]+"/, "").replace("<svg ", '<svg class="lockup" ');
// the lens roster grouped as the cockpit groups it, and the hardware gate's physical evidence walk, both read from the repository
const cat = Object.fromEntries([...fs.readFileSync(R("cockpit/server/capabilities.ts"), "utf8").matchAll(/"?([a-z-]+)"?: \["([^"]+)", "([^"]+)"\]/g)].map((m) => [m[1], m[3]]));
const groups = {}; for (const l of lensList) (groups[cat[l.name] ?? "other"] ??= []).push(l);
const lensGroups = `<dl class="groups">` + ["Recon", "Strategy", "Design", "Media", "Hardware", "Build", "Governance", "Verification"].filter((g) => groups[g]).map((g) => `<div><dt>${g}</dt><dd>${groups[g].map((l) => `<span class="chip-lens" title="${esc(l.description.slice(0, 160))}">${l.name}</span>`).join(" ")}</dd></div>`).join("") + `</dl>`;
const gateText = fs.readFileSync(R("tests/walkthrough-mote/artifacts/release-readiness/gate.md"), "utf8");
const walk = [...gateText.matchAll(/^\| (PHY\d+) \| ([^|]+) \| [^|]+ \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm)].map((m) => ({ id: m[1], claim: m[2].trim(), kind: m[3].trim(), on: m[4].trim(), res: m[5].trim() }));
if (!walk.length) die("the hardware gate walk was not found");
const verdict = parseStamp(gateText).head.verdict;
const moteWalk = `<div class="tablewrap"><table class="claims walk"><caption>Physical evidence walk from the hardware worked example's release gate (Mote, a fictional desk robot)</caption><thead><tr><th scope="col">id</th><th scope="col">claim</th><th scope="col">evidence found</th><th scope="col">exercised on the unit</th><th scope="col">result</th></tr></thead><tbody>${walk.map((w) => `<tr><th scope="row">${w.id}</th><td>${esc(w.claim)}</td><td>${esc(w.kind)}</td><td>${esc(w.on)}</td><td><span class="g ${/fail/i.test(w.res) ? "g-contradicted" : "g-unknown"}">${esc(w.res)}</span></td></tr>`).join("")}</tbody></table></div><p class="verdict-line">Verdict: <span class="g g-contradicted">${esc(verdict)}</span></p>`;
const hasFilm = fs.existsSync(R("media/explainer-2/renders/explainer.mp4"));
if (hasFilm) { cp(R("media/explainer-2/renders/explainer.mp4"), "media/explainer.mp4"); cp(R("media/explainer-2/captions/explainer.en.vtt"), "media/explainer.en.vtt"); cp(R("media/explainer-2/renders/poster.jpg"), "media/poster.jpg"); if (fs.existsSync(R("media/explainer-2/script/transcript.md"))) cp(R("media/explainer-2/script/transcript.md"), "media/transcript.md"); }
const figs = fs.existsSync(R("website/src/figures.json")) ? JSON.parse(fs.readFileSync(R("website/src/figures.json"), "utf8")) : [];
for (const f of figs) cp(R(f.from), "img/" + path.basename(f.from));
const figures = figs.map((f) => `<figure><img src="img/${path.basename(f.from)}" alt="${esc(f.alt)}" width="${f.w}" height="${f.h}" loading="lazy"><figcaption>${esc(f.caption)}${f.claims.map((c) => " " + chip(c)).join("")}</figcaption></figure>`).join("\n");
const abs = (p) => (SITE_URL ? SITE_URL + "/" + p : p);
let page = fs.readFileSync(R("website/src/index.html"), "utf8");
page = page.replace(/\{\{html:([\w.]+)\}\}/g, (_, k) => html(k)).replace(/\{\{text:([\w.]+)\}\}/g, (_, k) => plain(k));
// ---------- the claims behind the page (after rendering, so every chip has been counted) ----------
const urlRe = /(https?:\/\/[^\s;)]+)/g;
const claimRows = [...cited].sort((a, b) => +a.slice(1) - +b.slice(1)).map((id) => {
  const c = model.claims.get(id);
  if (!PUBLIC_GRADES.has(c.grade)) die(`${id} is ${c.grade}`);
  const src = esc(c.source).replace(urlRe, (u) => `<a href="${u.replace(/@\d{4}-\d{2}-\d{2}$/, "")}" rel="noopener">${u}</a>`);
  return `<tr id="claim-${id}"><th scope="row">${id}</th><td>${esc(c.text)}</td><td><span class="g g-${c.grade.toLowerCase()}">${c.grade}</span></td><td class="src">${src}</td></tr>`;
}).join("\n");
const provenance = { modelVersion: model.version, copyBuiltFrom: stamp.built, vendoredValidator: { source: "hooks/src/lib/md.mjs", sha256: sha(fs.readFileSync(R("hooks/src/lib/md.mjs"))), shipped: "vendor/md.mjs", shippedSha256: sha(fs.readFileSync(path.join(out, "vendor/md.mjs"))) } };
fs.writeFileSync(path.join(out, "data/provenance.json"), JSON.stringify(provenance, null, 1));


page = page.replace("{{lens-groups}}", lensGroups).replace("{{mote-walk}}", moteWalk).replace("{{lockup}}", lockup).replace("{{claim-rows}}", claimRows).replace("{{figures}}", figures)
  .replace("{{film}}", hasFilm ? fs.readFileSync(R("website/src/film.html"), "utf8") : '<p class="note">The film has not been rendered in this build.</p>')
  .replace(/\{\{abs:([\w./-]+)\}\}/g, (_, p) => abs(p)).replace("{{model-version}}", String(model.version));
const missing = [...page.matchAll(/\{\{[^}]+\}\}/g)].map((m) => m[0]); if (missing.length) die("unfilled placeholders: " + missing.join(", "));
{ let n = 0; page = page.replace(/<span class="mono">\d\d<\/span>/g, () => `<span class="mono">${String(n++).padStart(2, "0")}</span>`); }
fs.writeFileSync(path.join(out, "index.html"), page);
fs.writeFileSync(path.join(out, "404.html"), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found: Product Actualizer</title><link rel="stylesheet" href="/css/tokens.css"><link rel="stylesheet" href="/css/site.css"><main class="wrap" style="padding-block:var(--s-9)"><h1>Not found</h1><p>There is no page here. <a href="/">Back to the start.</a></p></main>`);
fs.writeFileSync(path.join(out, "robots.txt"), "User-agent: *\nAllow: /\n");
console.log(`website built: ${fs.readdirSync(out).length} entries in website/public; ${cited.size} claims cited; model@${model.version}; film ${hasFilm ? "included" : "absent"}`);
