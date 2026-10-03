// Renders the film from source. Deterministic: frames are pure functions of time.
//   bun media/explainer/render.mjs [--captions on|off] [--out renders/x.mp4] [--hash]   (hash: print per-frame sha256 digest of all frames, write no video)
//   bun media/explainer/render.mjs --stills "0,5.5,12" --dir storyboard/stills
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright-core";
const here = import.meta.dir;
const repo = path.resolve(here, "../..");
// ES modules do not load from file://, so serve the repository read-only on a free local port for the duration of the render.
const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch(req) { const f = path.join(repo, decodeURIComponent(new URL(req.url).pathname)); return f.startsWith(repo) && fs.existsSync(f) && fs.statSync(f).isFile() ? new Response(Bun.file(f)) : new Response("not found", { status: 404 }); } });
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const data = JSON.parse(fs.readFileSync(path.join(here, "src/data.json"), "utf8"));
const tl = JSON.parse(fs.readFileSync(path.join(here, "src/timeline.json"), "utf8"));
const captions = arg("--captions", "on") !== "off";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", args: ["--no-sandbox", "--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.port}/media/explainer-2/src/film.html`); await page.waitForFunction(() => typeof window.initFilm === "function");
await page.evaluate(() => document.fonts.ready);
const scenes = await page.evaluate(([d, t, c]) => window.initFilm(d, t, c), [data, tl, captions]);
const frame = async (t) => { await page.evaluate((x) => window.renderFrame(x), t); await page.evaluate(() => document.fonts.ready); return page.screenshot({ type: "png" }); };
if (process.argv.includes("--stills")) {
  const dir = path.join(here, arg("--dir", "storyboard/stills")); fs.mkdirSync(dir, { recursive: true });
  for (const t of arg("--stills", "0").split(",").map(Number)) fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(6, "0")}.png`), await frame(t));
  console.log("holds:", JSON.stringify(await page.evaluate(() => window.textHolds()))); await browser.close(); server.stop(); process.exit(0);
}
if (process.argv.includes("--layout")) {   // overlap and bounds check: in every scene, at several times, no two text boxes may intersect and none may leave the scene region
  const problems = [];
  for (const sc of scenes) for (const f of [0.4, 0.7, 0.97]) {
    const t = sc.start + (sc.end - sc.start) * f; await page.evaluate((x) => window.renderFrame(x), t);
    const res = await page.evaluate(() => { const root = document.querySelector("#scene").getBoundingClientRect(); const boxes = [...document.querySelectorAll("#scene *")].filter((e) => e.offsetParent !== null && getComputedStyle(e).opacity !== "0" && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => ({ e, t: e.textContent.trim().slice(0, 30), r: e.getBoundingClientRect() }));
      const out = []; for (const b of boxes) { if (b.r.right > root.right + 1 || b.r.bottom > root.bottom + 1) out.push(`out of bounds: ${b.t}`); }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { if (boxes[i].e.contains(boxes[j].e) || boxes[j].e.contains(boxes[i].e)) continue; const a = boxes[i].r, c = boxes[j].r; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) out.push(`overlap: "${boxes[i].t}" with "${boxes[j].t}"`); }
      return out; });
    for (const p of res) problems.push(`${sc.id} @${t.toFixed(1)}s ${p}`);
  }
  console.log(problems.length ? problems.join("\n") : "layout ok: no overlapping or out-of-bounds text in any scene at 40%, 70% and 97%"); await browser.close(); server.stop(); process.exit(problems.length ? 1 : 0);
}
const N = Math.round(tl.total * tl.fps);
if (process.argv.includes("--hash")) {
  const stride = +arg("--stride", 1); const h = crypto.createHash("sha256"); const per = [];
  for (let f = 0; f < N; f += stride) { const d = crypto.createHash("sha256").update(await frame(f / tl.fps)).digest("hex"); per.push(d); h.update(d); }
  console.log(JSON.stringify({ frames: per.length, stride, digest: h.digest("hex") })); await browser.close(); server.stop(); process.exit(0);
}
const out = path.join(here, arg("--out", "renders/silent.mp4")); fs.mkdirSync(path.dirname(out), { recursive: true });
const ff = Bun.spawn(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(tl.fps), "-i", "-", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-r", String(tl.fps), "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart", out], { stdin: "pipe", stdout: "inherit", stderr: "inherit" });
for (let f = 0; f < N; f++) { ff.stdin.write(await frame(f / tl.fps)); if (f % 300 === 0) console.error(`frame ${f}/${N}`); }
ff.stdin.end(); await ff.exited; await browser.close(); server.stop(); console.log(`rendered ${N} frames to ${path.relative(here, out)} (${scenes.length} scenes, captions ${captions ? "on" : "off"})`);
