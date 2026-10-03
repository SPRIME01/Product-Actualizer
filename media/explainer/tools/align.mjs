// Aligns the single narration take to its ten lines. There is no speech-to-text here, so boundaries come from the audio's own pauses:
// choose the nine pauses that end lines so that every line's pace (seconds per word) stays close to the take's average and longer pauses are preferred
// (dynamic programming over the detected pauses). Sentence breaks inside a line use the pause nearest the character-proportional expectation.
// Sync confidence is reported, not assumed: boundaries are pauses, not word timings.
//   bun media/explainer/tools/align.mjs
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dir, "..");
const mp3 = path.join(root, "audio/narration.mp3");
const dec = (b) => new TextDecoder().decode(b);
const dur = +dec(Bun.spawnSync(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).stdout).trim();
const log = dec(Bun.spawnSync(["ffmpeg", "-hide_banner", "-nostats", "-i", mp3, "-af", "silencedetect=noise=-38dB:d=0.2", "-f", "null", "-"], { stderr: "pipe" }).stderr);
const S = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]), E = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
const pauses = S.map((s, i) => ({ s, e: E[i] ?? dur })).filter((p) => p.s > 0.5 && p.e < dur - 0.1).map((p) => ({ ...p, len: p.e - p.s, mid: (p.s + p.e) / 2 }));
const lines = fs.readFileSync(path.join(root, "audio/narration.txt"), "utf8").trim().split(/\n\n/);
const words = lines.map((l) => l.split(/\s+/).length), K = lines.length, N = pauses.length, mean = dur / words.reduce((a, b) => a + b, 0);
const LAMBDA = 2.5;
const cost = (k, from, to) => { const d = Math.max(0.2, to - from); return Math.log(d / words[k] / mean) ** 2; };
// best[k][i]: minimal cost with line k ending at pause i
const best = Array.from({ length: K - 1 }, () => Array(N).fill(Infinity)), prev = Array.from({ length: K - 1 }, () => Array(N).fill(-1));
for (let i = 0; i < N; i++) best[0][i] = cost(0, 0, pauses[i].s) - LAMBDA * pauses[i].len;
for (let k = 1; k < K - 1; k++) for (let i = 0; i < N; i++) for (let j = 0; j < i; j++) { const c = best[k - 1][j] + cost(k, pauses[j].e, pauses[i].s) - LAMBDA * pauses[i].len; if (c < best[k][i]) { best[k][i] = c; prev[k][i] = j; } }
let bi = -1, bc = Infinity; for (let i = 0; i < N; i++) { const c = best[K - 2][i] + cost(K - 1, pauses[i].e, dur); if (c < bc) { bc = c; bi = i; } }
const ends = Array(K - 1); for (let k = K - 2, i = bi; k >= 0; k--) { ends[k] = i; i = prev[k][i]; }
const out = lines.map((t, k) => {
  const st = k === 0 ? 0 : pauses[ends[k - 1]].e, en = k === K - 1 ? dur : pauses[ends[k]].s;
  const inside = pauses.filter((p, i) => p.s > st && p.e < en && !ends.includes(i));
  const sentences = t.split(/(?<=[.!?])\s+/), breaks = [];
  let chars = 0; for (let si = 0; si < sentences.length - 1; si++) { chars += sentences[si].length + 1; const expect = st + (en - st) * (chars / t.length); const cand = inside.filter((p) => Math.abs(p.mid - expect) < (en - st) * 0.3).sort((a, b) => Math.abs(a.mid - expect) - Math.abs(b.mid - expect))[0]; if (cand) breaks.push(+(cand.mid - st).toFixed(3)); }
  return { id: k + 1, text: t, start: +st.toFixed(3), duration: +(en - st).toFixed(3), breaks };
});
const pace = out.map((l, k) => +(l.duration / words[k]).toFixed(2));
fs.writeFileSync(path.join(root, "audio/lines.json"), JSON.stringify({ total: dur, lines: out, pauses: N, pausesAtLineEnds: K - 1, secondsPerWord: pace, method: "pause detection + pace-regularised dynamic programming" }, null, 1));
console.log(`pauses ${N}, line ends chosen ${K - 1}; seconds per word by line: ${pace.join(" ")} (take average ${mean.toFixed(2)})`);
out.forEach((l) => console.log(String(l.id).padStart(2), l.start.toFixed(2).padStart(6), "+", l.duration.toFixed(2).padStart(5), l.text.slice(0, 54), l.breaks.length ? `breaks ${l.breaks}` : ""));
