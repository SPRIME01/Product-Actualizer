// One synthesis per narration line with a pinned voice id, so each line's duration is measured, not inferred.
// Run under a shell that has OPENROUTER_API_KEY in its environment. Writes audio/lines/Lnn.mp3 (trimmed) and audio/lines.json.
//   bun media/explainer/tools/tts-lines.mjs [--voice <id>]
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dir, "..");
const VOICE = process.argv.includes("--voice") ? process.argv[process.argv.indexOf("--voice") + 1] : "b347db033a6549378b48d00acb0d06cd";
const dec = (b) => new TextDecoder().decode(b);
const lines = fs.readFileSync(path.join(root, "audio/narration.txt"), "utf8").trim().split(/\n\n/);
fs.mkdirSync(path.join(root, "audio/lines"), { recursive: true });
const logFile = path.resolve(root, "../../actualize/evidence/audio-sound/tts-calls-3.jsonl");
const out = [];
for (const [i, text] of lines.entries()) {
  const id = String(i + 1).padStart(2, "0"), txt = path.join(root, `audio/lines/L${id}.txt`), raw = path.join(root, `audio/lines/L${id}.raw.mp3`), fin = path.join(root, `audio/lines/L${id}.mp3`);
  fs.writeFileSync(txt, text + "\n");
  const r = Bun.spawnSync(["bun", path.join(root, "tools/tts.mjs"), txt, raw, "--voice", VOICE, "--log", logFile], { stdout: "pipe", stderr: "pipe", env: process.env });
  if (r.exitCode !== 0) { console.error(`line ${id} failed:`, dec(r.stderr).slice(0, 300)); process.exit(1); }
  // trim leading and trailing silence so the measured duration is the speech
  Bun.spawnSync(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse", "-ar", "48000", "-ac", "1", fin]);
  fs.rmSync(raw);
  const d = +dec(Bun.spawnSync(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fin]).stdout).trim();
  const lg = dec(Bun.spawnSync(["ffmpeg", "-hide_banner", "-nostats", "-i", fin, "-af", "silencedetect=noise=-38dB:d=0.18", "-f", "null", "-"], { stderr: "pipe" }).stderr);
  const S = [...lg.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]), E = [...lg.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const inner = S.map((s, k) => ({ s, e: E[k] ?? d, mid: ((s + (E[k] ?? d)) / 2) })).filter((p) => p.s > 0.4 && p.e < d - 0.1);
  const sentences = text.split(/(?<=[.!?])\s+/), breaks = []; let chars = 0;
  for (let si = 0; si < sentences.length - 1; si++) { chars += sentences[si].length + 1; const expect = d * chars / text.length; const c = inner.filter((p) => Math.abs(p.mid - expect) < d * 0.3).sort((a, b) => Math.abs(a.mid - expect) - Math.abs(b.mid - expect))[0]; if (c) breaks.push(+c.mid.toFixed(3)); }
  out.push({ id: i + 1, text, file: `audio/lines/L${id}.mp3`, start: 0, duration: +d.toFixed(3), words: text.split(/\s+/).length, breaks });
  console.log(`L${id} ${d.toFixed(2)}s ${(d / out[i].words).toFixed(2)} s/word  breaks ${breaks.length}/${sentences.length - 1}`);
}
fs.writeFileSync(path.join(root, "audio/lines.json"), JSON.stringify({ voice: VOICE, method: "one synthesis per line; durations measured with ffprobe after trimming edge silence", lines: out }, null, 1));
