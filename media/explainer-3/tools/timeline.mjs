// Builds src/timeline.json: when each narration line starts and ends in the film, the scene windows, caption cues, and the
// extra pause after any line that is spoken faster than a caption can be read (hold >= words/3 + 0.5 s, from the motion-editorial check).
//   bun media/explainer/tools/timeline.mjs [--audio audio/lines.json]    without --audio, durations are estimated (preview only)
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dir, "..");
const art = fs.readFileSync(path.resolve(root, "../../actualize/artifacts/motion-editorial/explainer-film.md"), "utf8");
const lines = [...art.matchAll(/^L(\d+): (.*)$/gm)].map((m) => ({ id: +m[1], raw: m[2], text: m[2].replace(/\s*\[C\d+\]/g, "").trim() }));
const ai = process.argv.indexOf("--audio");
const audio = ai > 0 ? JSON.parse(fs.readFileSync(path.resolve(root, process.argv[ai + 1]), "utf8")) : null;
const GAP = 0.55, LEAD = 0.5, TAIL = 3.0, need = (t) => t.split(/\s+/).length / 3 + 0.5;
let t = LEAD; const out = [], cues = [];
for (const l of lines) {
  const a = audio?.lines[l.id - 1];
  const dur = a ? a.duration : Math.max(1.8, l.text.split(/\s+/).length / 2.5), start = t, end = start + dur;
  // cues: sentences, merged up to two caption lines; cut where the voice pauses when those pauses were matched
  const sentences = l.text.split(/(?<=[.!?])\s+/), br = a?.breaks ?? [];
  let parts = sentences.map((s, i) => ({ text: s, start: i === 0 ? start : start + (br[i - 1] ?? (dur * sentences.slice(0, i).join(" ").length / l.text.length)), end: 0 }));
  parts.forEach((p, i) => { p.end = i + 1 < parts.length ? parts[i + 1].start : end; });
  const merge = (arr) => { for (let i = 0; i < arr.length - 1; i++) { const c = arr[i], n = arr[i + 1]; if (c.end - c.start < need(c.text) || (c.text + " " + n.text).length <= 100) { arr.splice(i, 2, { text: c.text + " " + n.text, start: c.start, end: n.end }); return true; } } return false; };
  while (parts.length > 1 && merge(parts));
  const last = parts[parts.length - 1], shortfall = Math.max(0, need(last.text) - (last.end - last.start));
  last.end += shortfall;                                              // the caption lingers into the pause that follows
  parts.forEach((p) => cues.push({ start: +p.start.toFixed(3), end: +p.end.toFixed(3), text: p.text }));
  out.push({ ...l, breaks: br, audioStart: a?.start ?? 0, start: +start.toFixed(3), end: +end.toFixed(3), duration: +dur.toFixed(3), pad: +shortfall.toFixed(3) });
  t = end + shortfall + GAP;
}
const total = +(out[out.length - 1].end + TAIL).toFixed(3);
fs.writeFileSync(path.join(root, "src/timeline.json"), JSON.stringify({ lines: out, captions: cues, total, fps: 30, estimated: !audio }, null, 1));
const vt = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = (s % 60).toFixed(3).padStart(6, "0"); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${x}`; };
fs.mkdirSync(path.join(root, "captions"), { recursive: true });
fs.writeFileSync(path.join(root, "captions/explainer.en.vtt"), "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${vt(c.start)} --> ${vt(c.end)}\n${c.text}\n`).join("\n"));
fs.writeFileSync(path.join(root, "script/transcript.md"), `# Transcript: Product Actualizer explainer 3\n\n` + out.map((l) => l.text).join("\n\n") + "\n");
const short = cues.filter((c) => c.end - c.start < need(c.text) - 0.01);
console.log(`timeline: ${out.length} lines, ${cues.length} cues, ${total}s ${audio ? "(from audio)" : "(estimated)"}; padded lines: ${out.filter((l) => l.pad > 0).map((l) => `L${l.id}+${l.pad}s`).join(" ") || "none"}; cues below the hold rule: ${short.length}`);
