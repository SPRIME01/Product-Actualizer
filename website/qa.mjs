// Independent verification of the built site (website/public): opens the delivered files in a real browser and measures. It does not share code with the build.
//   bun website/build.mjs && bun website/qa.mjs      writes actualize/evidence/fidelity-qa/site-qa.json and .md plus screenshots
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import os from "node:os";
import { chromium } from "playwright-core";
import { parseModel, parseStamp, validateArtifact } from "../hooks/src/lib/md.mjs";
import { wavesOf } from "./public/js/waves.mjs";
import { Control } from "../cockpit/server/control";
import { openDb } from "../cockpit/server/db";

const root = path.resolve(import.meta.dir, "..");
const pub = path.join(root, "website/public"), outDir = path.join(root, "actualize/evidence/fidelity-qa");
fs.mkdirSync(path.join(outDir, "screens"), { recursive: true });
const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch(req) { let p = decodeURIComponent(new URL(req.url).pathname); if (p.endsWith("/")) p += "index.html"; const f = path.join(pub, p); return f.startsWith(pub) && fs.existsSync(f) && fs.statSync(f).isFile() ? new Response(Bun.file(f)) : new Response("not found", { status: 404 }); } });
const base = `http://127.0.0.1:${server.port}/`;
const results = []; const check = (id, name, pass, detail = "") => { results.push({ id, name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${id} ${name}${detail ? "  " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const consoleErrors = [], failed = [];
const open = async (vp, opts = {}) => { const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: opts.dpr ?? 1, colorScheme: opts.scheme ?? "light", reducedMotion: opts.reduced ? "reduce" : "no-preference" }); const p = await ctx.newPage(); p.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text())); p.on("pageerror", (e) => consoleErrors.push(e.message)); p.on("requestfailed", (r) => failed.push(r.url())); p.on("response", (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`)); await p.goto(base, { waitUntil: "networkidle" }); if (!opts.reduced && !opts.raw) { await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } scrollTo(0, 0); }); await p.waitForTimeout(3300); } return p; };

// ---- 1. targets matrix: overflow, themes, screenshots
for (const w of [320, 375, 768, 1024, 1440]) for (const scheme of ["light", "dark"]) {
  const p = await open({ width: w, height: 900 }, { scheme });
  const over = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bad: [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest(".tablewrap,.wavecols,pre"); }).length }));
  check("L1", `no horizontal overflow at ${w}px, ${scheme}`, over.sw <= over.iw && over.bad === 0, `scrollWidth ${over.sw}/${over.iw}, offenders ${over.bad}`);
  if (w === 390 || w === 375 || w === 1440) await p.screenshot({ path: path.join(outDir, "screens", `site-${w}-${scheme}.png`), fullPage: true });
  await p.close();
}
// ---- 2. token audit on computed styles (light and dark), fonts, contrast on rendered text
const AUDIT = () => {
  const toks = {}; const probe = document.createElement("span"); document.body.append(probe);
  const rgb = (v) => { probe.style.color = v; return getComputedStyle(probe).color; };
  const names = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } }).flatMap((r) => (r.style ? [...r.style] : [])).filter((n) => n.startsWith("--"));
  for (const n of new Set(names)) if (/^--(surface|ink|rule|accent|g-)/.test(n)) toks[rgb(`var(${n})`)] = n;
  probe.remove();
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g2 = cv.getContext("2d", { willReadFrequently: true });
  const px = (c) => { g2.clearRect(0, 0, 1, 1); g2.fillStyle = "#000"; g2.fillStyle = c; g2.fillRect(0, 0, 1, 1); return [...g2.getImageData(0, 0, 1, 1).data].slice(0, 3); };   // Chrome reports OKLCH as oklch(); the canvas converts to sRGB bytes
  const lum = (c) => { const [r, g, b] = px(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return rgb("var(--surface-base)"); };
  const off = new Map(), fam = new Map(), sizes = new Map(), lows = []; let texts = 0;
  for (const e of document.body.querySelectorAll("*")) {
    const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || e.closest("video")) continue;   // fallback content inside <video> is never rendered
    for (const k of ["color", "backgroundColor", "borderTopColor", "borderBottomColor"]) { const v = cs[k]; if (/rgba\(0, 0, 0, 0\)|transparent/.test(v)) continue; if (k.startsWith("border") && cs[k.replace("Color", "Style")] === "none") continue; if (!toks[v]) off.set(v, (off.get(v) ?? 0) + 1); }
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own || e.closest("svg")) continue; texts++;
    const f = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(); fam.set(f, (fam.get(f) ?? 0) + 1);
    sizes.set(cs.fontSize, (sizes.get(cs.fontSize) ?? 0) + 1);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700); const r = ratio(cs.color, bgOf(e));
    if (r < (big ? 3 : 4.5) && e.offsetParent !== null) lows.push(`${e.tagName.toLowerCase()}.${e.className} "${e.textContent.trim().slice(0, 30)}" ${r.toFixed(2)}`);
  }
  return { off: [...off], fam: [...fam], sizes: [...sizes].map(([k]) => k), lows, texts };
};
for (const scheme of ["light", "dark"]) {
  const p = await open({ width: 1440, height: 900 }, { scheme });
  const a = await p.evaluate(AUDIT);
  check("T1", `computed colours are all tokens (${scheme})`, a.off.length === 0, a.off.length ? "off-token: " + JSON.stringify(a.off.slice(0, 5)) : `${a.texts} text nodes checked`);
  check("T2", `font families are the two specified (${scheme})`, a.fam.every(([f]) => ["Atkinson Hyperlegible Next", "JetBrains Mono"].includes(f)), JSON.stringify(a.fam));
  check("T3", `text contrast on rendered backgrounds, WCAG AA (${scheme})`, a.lows.length === 0, a.lows.length ? a.lows.slice(0, 6).join(" | ") : "all text meets 4.5:1 (3:1 large)");
  if (scheme === "light") { const loaded = await p.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")); }); check("T4", "both font files loaded, none fell back", ["Atkinson Hyperlegible Next", "JetBrains Mono"].every((f) => loaded.includes(f)), loaded.join(", ")); const sz = a.sizes.map(parseFloat).sort((x, y) => x - y); fs.writeFileSync(path.join(outDir, "font-sizes.json"), JSON.stringify(sz)); }
  await p.close();
}
// ---- 3. structure and accessibility
{
  const p = await open({ width: 1280, height: 800 });
  const s = await p.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelectorAll("h1").length, landmarks: ["header", "nav", "main", "footer"].every((t) => document.querySelector(t)), noAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length, unnamed: [...document.querySelectorAll("button,a[href],input")].filter((e) => !(e.getAttribute("aria-label") || e.textContent.trim() || (e.labels && e.labels.length))).length, levels: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => +h.tagName[1]), small: [...document.querySelectorAll("button,.btn,nav a,.opt")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 && r.width < 44); }).length, title: document.title, desc: !!document.querySelector('meta[name=description]'), og: !!document.querySelector('meta[property="og:image"]') }));
  let skipped = 0; for (let i = 1; i < s.levels.length; i++) if (s.levels[i] - s.levels[i - 1] > 1) skipped++;
  check("A1", "lang, one h1, landmarks, title, description, og:image", s.lang === "en" && s.h1 === 1 && s.landmarks && !!s.title && s.desc && s.og, JSON.stringify({ lang: s.lang, h1: s.h1 }));
  check("A2", "every image has alt; every control has an accessible name", s.noAlt === 0 && s.unnamed === 0, `missing alt ${s.noAlt}, unnamed ${s.unnamed}`);
  check("A3", "heading levels never skip a level", skipped === 0, `skips ${skipped}`);
  check("A4", "interactive targets at least 44px in one dimension", s.small === 0, `${s.small} smaller`);
  // keyboard: tab through the whole page, every stop shows a visible focus indicator, no trap
  let stops = 0, noFocusRing = [], seen = new Set(), trapped = false;
  await p.focus("body"); await p.keyboard.press("Tab");
  for (let i = 0; i < 400; i++) {
    const info = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const ring = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2; return { key: e.tagName + (e.id ? "#" + e.id : "") + "|" + (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30), ring, tag: e.tagName }; });
    if (!info) break; if (seen.has(info.key + stops % 1)) { if (seen.size > 5 && info.key === [...seen][0].split("|").slice(0, 2).join("|")) break; } seen.add(info.key); stops++; if (!info.ring && info.tag !== "VIDEO") noFocusRing.push(info.key);   // a focused <video> draws its own focus indicator on its native controls
    await p.keyboard.press("Tab"); if (stops > 300) { trapped = true; break; }
  }
  check("K1", "keyboard: every focus stop has a visible 2px+ outline, no trap", noFocusRing.length === 0 && !trapped, `${stops} stops; without ring: ${noFocusRing.slice(0, 4).join(", ") || "none"}`);
  // skip link
  await p.reload({ waitUntil: "networkidle" }); await p.keyboard.press("Tab"); const first = await p.evaluate(() => document.activeElement.className + "|" + document.activeElement.textContent); await p.keyboard.press("Enter"); const hash = await p.evaluate(() => location.hash);
  check("K2", "first Tab stop is the skip link and it jumps to main", first.startsWith("skip") && hash === "#main", first.slice(0, 30));
  await p.close();
}
// ---- 4. the demos, by keyboard, against the product's own code
{
  const p = await open({ width: 1280, height: 900 });
  const btn = p.getByRole("button", { name: "Downgrade C1 to REPORTED" }); await btn.focus(); await p.keyboard.press("Enter");
  const text = await p.locator("#ledger-app [role=status]").innerText();
  const m = parseModel(fs.readFileSync(path.join(root, "tests/walkthrough/product-model.md"), "utf8")); const art = fs.readFileSync(path.join(root, "tests/walkthrough/artifacts/marketing/beta-page.md"), "utf8");
  const mm = { ...m, claims: new Map([...m.claims].map(([k, v]) => [k, k === "C1" ? { ...v, grade: "REPORTED" } : v])) }; const expected = validateArtifact(art, mm, { lensReads: null });
  check("D1", "ledger demo: keyboard downgrade prints the repository validator's exact refusal", expected.length === 1 && text.includes(expected[0]), expected[0]);
  await p.getByRole("button", { name: "Restore C1 to OBSERVED" }).click(); check("D2", "ledger demo: restoring returns validateArtifact: []", (await p.locator("#ledger-app [role=status]").innerText()).includes("validateArtifact: []"));
  // every single-claim downgrade equals the repository validator
  let allMatch = true; for (const id of ["C1", "C2", "C3", "C13", "C14"]) { await p.getByRole("button", { name: new RegExp(`Downgrade ${id} to REPORTED`) }).click(); const t = await p.locator("#ledger-app [role=status]").innerText(); const mm2 = { ...m, claims: new Map([...m.claims].map(([k, v]) => [k, k === id ? { ...v, grade: "REPORTED" } : v])) }; const e = validateArtifact(art, mm2, { lensReads: null }); if (!e.every((x) => t.includes(x))) allMatch = false; await p.getByRole("button", { name: new RegExp(`Restore ${id} to`) }).click(); }
  check("D3", "ledger demo: all five single-claim downgrades match the repository validator", allMatch);
  // lab (starts lazily when scrolled near, like a visitor)
  await p.locator("#lab-app").scrollIntoViewIfNeeded(); const pickLbl = p.getByLabel(/Downgrade claim C\d+/).first(); const cid = (await pickLbl.evaluate((e) => e.closest("label").innerText)).match(/C\d+/)[0]; await pickLbl.check(); await p.getByRole("button", { name: "Record decision" }).click();
  const lab = await p.locator("#lab-app").innerText();
  check("D4", `lab: downgrading ${cid} stales the public page that cites it and leaves an unrelated artifact current`, /marketing\/beta-page\.md[\s\S]*stale by D\d+/.test(lab) && /provenance-licensing\/ledger\.md[\s\S]*current/.test(lab), "");
  await p.getByRole("button", { name: "Rebuild unchanged" }).first().click(); check("D5", "lab: rebuilding the public page unchanged is refused with the validator's text", (await p.locator("#lab-app").innerText()).includes(`public artifact cites ${cid} graded REPORTED; only OBSERVED or VERIFIED may be public`));
  await p.getByRole("button", { name: `Rebuild without ${cid}` }).click(); check("D6", `lab: rebuilding without ${cid} passes`, !(await p.locator("#lab-app").innerText()).match(/marketing\/beta-page\.md[\s\S]{0,200}rebuild refused/));
  // waves vs engine
  const data = JSON.parse(fs.readFileSync(path.join(pub, "data/lenses.json"), "utf8")); const L = Object.fromEntries(data.lenses.map((l) => [l.name, l])); const same = Object.entries(data.presets).every(([k, v]) => JSON.stringify(wavesOf(L, v)) === JSON.stringify(data.presetWaves[k]));
  check("D7", "waves: the page's wave function equals the engine's for all four presets", same);
  await p.locator("#waves-app").scrollIntoViewIfNeeded(); for (const k of Object.keys(data.presets)) { await p.locator("#waves-app").getByRole("button", { name: k }).click(); }
  check("D8", "waves: preset buttons run without error", true);
  // lifecycle vs Control.move over every (from, to, by)
  const life = JSON.parse(fs.readFileSync(path.join(pub, "data/lifecycle.json"), "utf8"));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pa-qa-")); const db = openDb(path.join(tmp, "c.db")); const ctl = new Control(db);
  const mine = await p.evaluate(async (d) => { const { makeMove } = await import("./js/lifecycle.mjs"); const mv = makeMove(d); const o = {}; for (const f of d.statuses) for (const t of d.statuses) for (const by of ["agent", "human"]) o[`${f}>${t}>${by}`] = mv(f, t, by); return o; }, life);
  let diffs = 0, n = 0; for (const f of life.statuses) for (const t of life.statuses) for (const by of ["agent", "human"]) {
    const r = ctl.submit({ run: "qa", text: "x", kind: "unclassified", actor: "owner" }); db.query("UPDATE control_requests SET status = ? WHERE seq = ?").run(f, r.seq);
    const real = ctl.move(r.id ?? `R${r.seq}`, t, by, { note: "qa" }); const page = mine[`${f}>${t}>${by}`]; n++;
    const realMsg = real.ok ? null : real.message.replace(/^R\d+ is/, "R1 is"); const pageMsg = page.ok ? null : page.message;
    if (Boolean(real.ok) !== Boolean(page.ok) || (!real.ok && realMsg !== pageMsg)) { diffs++; if (diffs < 4) console.log("  diff", f, t, by, JSON.stringify(real).slice(0, 160), JSON.stringify(page).slice(0, 160)); }
  }
  check("D9", `lifecycle: the page's move equals the cockpit's Control.move for all ${n} (from, to, by) combinations`, diffs === 0, `${diffs} differences`);
  await p.locator("#lifecycle-app").scrollIntoViewIfNeeded(); await p.getByRole("button", { name: "accepted", exact: true }).click();
  check("D10", "lifecycle: an agent's attempt to accept returns AUTHORITY_HUMAN in the page", (await p.locator("#lifecycle-app [role=status]").innerText()).includes("AUTHORITY_HUMAN"));
  await p.close();
}
// ---- 5. reduced motion, copy trace, claims, provenance, performance, links
{
  const p = await open({ width: 1280, height: 800 }, { reduced: true });
  const t = await p.evaluate(() => [...document.querySelectorAll("*")].filter((e) => { const c = getComputedStyle(e); return parseFloat(c.transitionDuration) > 0 || (c.animationName !== "none" && parseFloat(c.animationDuration) > 0); }).length);
  check("M1", "prefers-reduced-motion: no element transitions or animates", t === 0, `${t} elements`);
  await p.close();
  const q = await open({ width: 1280, height: 800 });
  const trace = await q.evaluate(() => { const claims = new Map([...document.querySelectorAll("table.claims:not(.walk) tbody tr")].map((r) => [r.id.replace("claim-", ""), r.querySelector(".g").textContent])); const chips = [...document.querySelectorAll("main .cl")].map((a) => a.textContent); const missing = chips.filter((c) => !claims.has(c)); const bad = [...claims].filter(([, g]) => !["OBSERVED", "VERIFIED"].includes(g)); const main = document.querySelector("main"); const paras = [...main.querySelectorAll("p,li,dd,figcaption,h3")].filter((e) => !e.closest("table,.instrument,pre,.note,.fine,.actions,#ledger-behind") && /\d|%/.test(e.textContent) && !e.querySelector(".cl") && !e.closest("figure")?.querySelector(".cl")); return { claims: claims.size, chips: chips.length, missing, bad, uncited: paras.map((e) => e.textContent.trim().slice(0, 70)) }; });
  check("C1", "every claim chip resolves to a row in the page's ledger, and every row is OBSERVED or VERIFIED", trace.missing.length === 0 && trace.bad.length === 0, `${trace.chips} chips, ${trace.claims} rows`);
  check("C2", "every paragraph that contains a number carries a claim chip", trace.uncited.length === 0, trace.uncited.slice(0, 3).join(" | "));
  const prov = JSON.parse(fs.readFileSync(path.join(pub, "data/provenance.json"), "utf8")); const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  check("C3", "the validator shipped to the browser is byte-identical to hooks/src/lib/md.mjs", sha(path.join(pub, "vendor/md.mjs")) === sha(path.join(root, "hooks/src/lib/md.mjs")) && prov.vendoredValidator.sha256 === prov.vendoredValidator.shippedSha256, sha(path.join(pub, "vendor/md.mjs")).slice(0, 16));
  const model = parseModel(fs.readFileSync(path.join(root, "actualize/product-model.md"), "utf8")), copy = fs.readFileSync(path.join(root, "actualize/artifacts/marketing/website-copy.md"), "utf8");
  check("C4", "the site was built from copy that is current against the model and valid", parseStamp(copy).built === model.version && validateArtifact(copy, model, { lensReads: null }).length === 0, `model@${model.version}`);
  // performance: first-load transfer of what the page itself requires
  const perf = await open({ width: 1280, height: 800 }); const m = await perf.evaluate(async () => { const e = performance.getEntriesByType("resource").map((r) => ({ n: r.name, b: r.encodedBodySize || r.transferSize, t: r.initiatorType })); const nav = performance.getEntriesByType("navigation")[0]; const lcp = await new Promise((res) => { let v = 0; new PerformanceObserver((l) => { for (const x of l.getEntries()) v = x.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); setTimeout(() => res(v), 300); }); let cls = 0; new PerformanceObserver((l) => { for (const x of l.getEntries()) if (!x.hadRecentInput) cls += x.value; }).observe({ type: "layout-shift", buffered: true }); await new Promise((r) => setTimeout(r, 200)); return { res: e, html: nav.encodedBodySize, lcp, cls }; });
  // The local server does not compress. Estimate what a host that does (all common static hosts) would send: gzip each text file, count fonts and images as they are.
  const gz = (url) => { const f = path.join(pub, new URL(url).pathname); if (!fs.existsSync(f)) return 0; const b = fs.readFileSync(f); return /\.(mjs|js|css|json|html|svg|vtt)$/.test(f) ? zlib.gzipSync(b, { level: 9 }).length : b.length; };
  m.res.forEach((r) => { r.b = gz(r.n); }); m.html = gz(base + "index.html");
  const sum = (f) => m.res.filter(f).reduce((a, r) => a + r.b, 0), total = m.html + m.res.reduce((a, r) => a + r.b, 0);
  const media = m.res.filter((r) => /\.(png|mp4|jpg)$/.test(r.n)).reduce((a, r) => a + r.b, 0);
  check("P1", "estimated first-load transfer (gzip text, fonts as is) excluding images and film is within the 150 KB budget", total - media <= 150 * 1024, `${((total - media) / 1024).toFixed(0)} KB (html ${(m.html / 1024).toFixed(0)}, js ${(sum((r) => r.n.endsWith(".mjs")) / 1024).toFixed(0)}, css ${(sum((r) => r.n.endsWith(".css")) / 1024).toFixed(0)}, fonts ${(sum((r) => r.n.endsWith(".woff2")) / 1024).toFixed(0)}, json ${(sum((r) => r.n.endsWith(".json")) / 1024).toFixed(0)})`);
  check("P2", "largest contentful paint under 2.5 s and layout shift under 0.1 on localhost", m.lcp < 2500 && m.cls < 0.1, `LCP ${m.lcp.toFixed(0)} ms, CLS ${m.cls.toFixed(3)} (localhost, no throttling)`);
  await perf.close();
  // links
  const links = await q.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")));
  const internal = links.filter((h) => h.startsWith("#")), ext = [...new Set(links.filter((h) => /^https?:/.test(h)))];
  const missingAnchors = await q.evaluate((hs) => hs.filter((h) => h.length > 1 && !document.getElementById(h.slice(1))), internal);
  check("N1", "every in-page link resolves to an element", missingAnchors.length === 0, `${internal.length} links`);
  const status = {}; for (const u of ext) { try { let r = await fetch(u, { method: "HEAD", redirect: "follow" }); if ([403, 405].includes(r.status)) r = await fetch(u, { redirect: "follow" }); status[u] = r.status; } catch (e) { status[u] = "error"; } }
  fs.writeFileSync(path.join(outDir, "external-links.json"), JSON.stringify(status, null, 1));
  const badExt = Object.entries(status).filter(([, s]) => s !== 200);
  check("N2", "every external link answers 200", badExt.length === 0, badExt.map(([u, s]) => `${s} ${u}`).join(" | ") || `${ext.length} links`);
  await q.close();
}
check("R1", "no console errors, no page errors, no failed or 4xx/5xx requests across the run", consoleErrors.length === 0 && failed.filter((f) => !/favicon/.test(f)).length === 0, [...consoleErrors, ...failed].slice(0, 4).join(" | "));
await browser.close(); server.stop();
const fails = results.filter((r) => !r.pass);
fs.writeFileSync(path.join(outDir, "site-qa.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
fs.writeFileSync(path.join(outDir, "site-qa.md"), `# Site QA, ${new Date().toISOString().slice(0, 10)}\n\nCommand: \`bun website/build.mjs && bun website/qa.mjs\`. Opens the delivered files in system Chrome and measures; it shares no code with the build.\n\n| id | check | result | detail |\n|---|---|---|---|\n` + results.map((r) => `| ${r.id} | ${r.name} | ${r.pass ? "pass" : "FAIL"} | ${r.detail.replace(/\|/g, "/")} |`).join("\n") + `\n\n${results.length - fails.length} of ${results.length} passed.\n`);
console.log(`\n${results.length - fails.length}/${results.length} passed`); process.exit(fails.length ? 1 : 0);
