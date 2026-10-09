// Synthesises the film's score and effects from code: no samples, no third-party audio, so nothing to license or credit.
// Effect times come from src/cues.mjs, the same file the picture reads, so a click sounds on the frame a card lands.
//   bun media/explainer-3/tools/score.mjs   -> audio/score.wav (48 kHz, stereo, 16-bit)
import fs from "node:fs";
import path from "node:path";
import { events } from "../src/cues.mjs";
const root = path.resolve(import.meta.dir, "..");
const TL = JSON.parse(fs.readFileSync(path.join(root, "src/timeline.json"), "utf8"));
const { e: EV, cues } = events(TL);
const SR = 48000, N = Math.ceil(TL.total * SR), L = new Float32Array(N), R = new Float32Array(N);
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;   // deterministic noise
const add = (t, fn, dur, g = 1, pan = 0) => { const s0 = Math.floor(t * SR), n = Math.floor(dur * SR); for (let i = 0; i < n && s0 + i < N; i++) { const v = fn(i / SR, i / n) * g; L[s0 + i] += v * (1 - Math.max(0, pan)); R[s0 + i] += v * (1 + Math.min(0, pan)); } };
const env = (x, a = 0.005, k = 5) => (x < a ? x / a : Math.exp(-k * (x - a)));
const TAU = Math.PI * 2, hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
// ---- effects
const FX = {
  click: (t) => { add(t, (x, u) => rnd() * 0.5 * Math.exp(-u * 40), 0.02, 0.5); add(t, (x, u) => Math.sin(TAU * 1700 * x) * env(u, 0.002, 9), 0.06, 0.3); },
  tick: (t) => add(t, (x, u) => Math.sin(TAU * 2300 * x) * env(u, 0.001, 8), 0.04, 0.18),
  pop: (t) => add(t, (x, u) => Math.sin(TAU * (600 + 500 * u) * x) * env(u, 0.003, 6), 0.07, 0.2),
  lowpop: (t) => add(t, (x, u) => Math.sin(TAU * 300 * x) * env(u, 0.004, 5), 0.1, 0.22),
  stamp: (t) => { add(t, (x, u) => Math.sin(TAU * (95 - 35 * u) * x) * env(u, 0.002, 7), 0.22, 0.6); add(t, (x, u) => rnd() * Math.exp(-u * 30), 0.03, 0.3); },
  whoosh: (t) => { let y = 0; add(t, (x, u) => { const a = 0.04 + 0.5 * (1 - u) * (1 - u); y += a * (rnd() - y); return y * Math.sin(Math.PI * Math.min(1, u * 1.2)); }, 0.42, 0.55); },
  crash: (t) => { let y = 0; add(t, (x, u) => { y += 0.35 * (rnd() - y); return (rnd() * 0.6 + y) * Math.exp(-u * 6); }, 0.6, 0.55); add(t, (x, u) => Math.sin(TAU * (75 - 30 * u) * x) * env(u, 0.002, 8), 0.4, 0.8); },
  thunk: (t) => add(t, (x, u) => (Math.sin(TAU * 55 * x) + 0.5 * Math.sin(TAU * 110 * x)) * env(u, 0.004, 4.5), 0.6, 0.55),
  chime: (t, f = 880) => add(t, (x, u) => { const e2 = Math.exp(-u * 3.2); return e2 * (Math.sin(TAU * f * x) + 0.45 * Math.sin(TAU * f * 2.01 * x) + 0.25 * Math.sin(TAU * f * 3.02 * x)); }, 1.6, 0.16),
  buzz: (t) => add(t, (x, u) => { const saw = ((x * 110) % 1) * 2 - 1; return saw * (0.6 + 0.4 * Math.sin(TAU * 18 * x)) * env(u, 0.01, 2.2); }, 0.5, 0.22),
};
for (const [t, k] of cues) FX[k](t);
// ---- bed: a low A-minor pad, a clock that stops when the plot is pinned, a pulse and plucks after, a major resolution at the end card
const padNote = (t0, t1, f, g, fadeIn = 2.5, fadeOut = 1.5) => add(t0, (x) => { const tt = t0 + x, a = Math.min(1, x / fadeIn) * Math.min(1, (t1 - tt) / fadeOut); const trem = 0.85 + 0.15 * Math.sin(TAU * 0.13 * tt + f); return a * trem * (Math.sin(TAU * f * x) + 0.4 * Math.sin(TAU * f * 2 * x + 0.5) + 0.15 * Math.sin(TAU * f * 3 * x)); }, t1 - t0, g);
const end = TL.total, resolve = EV.end.mark;
padNote(0, end, hz(45), 0.1, 3, 3); padNote(6, end, hz(52), 0.07, 4, 3); padNote(TL.lines[4].start - 1, resolve + 0.6, hz(60), 0.06, 3, 1.5);   // A2, E3, C4 (minor third)
padNote(resolve - 0.2, end, hz(61), 0.06, 1.8, 3); padNote(resolve - 0.2, end, hz(57), 0.05, 1.8, 3);                                             // C#4 and A3: the major resolves the minor
for (let t = 1; t < EV.plot.pin; t += 0.5) add(t, (x, u) => rnd() * Math.exp(-u * 30), 0.025, 0.07 * Math.min(1, (EV.plot.pin - t) / 1.2) * Math.min(1, t / 3), (Math.floor(t * 2) % 2 ? 0.4 : -0.4));   // the clock
const pent = [57, 60, 64, 69, 64, 60, 62, 64], beat = 0.6;
for (let t = EV.plot.pin, k = 0; t < EV.refusal.agent - 0.4; t += beat / 2, k++) {
  if (k % 2 === 0) add(t, (x, u) => Math.sin(TAU * (62 - 22 * Math.min(1, u * 6)) * x) * env(u, 0.003, 9), 0.28, 0.32);   // soft kick on the beat
  const f = hz(pent[k % 8]); add(t, (x, u) => { const e2 = Math.exp(-u * 7); return e2 * (Math.sin(TAU * f * x) + 0.5 * Math.sin(TAU * f * 2 * x) * Math.exp(-u * 12) + 0.2 * Math.sin(TAU * f * 3 * x)); }, 0.45, 0.09, (k % 4 - 1.5) * 0.25);
}
for (let t = EV.refusal.owner, k = 0; t < EV.end.mark - 0.2; t += beat, k++) add(t, (x, u) => Math.sin(TAU * hz(pent[(k * 3) % 8]) * x) * Math.exp(-u * 6), 0.4, 0.07);
[57, 61, 64, 69].forEach((n, i) => add(resolve + 0.1 + i * 0.16, (x, u) => Math.exp(-u * 4) * (Math.sin(TAU * hz(n) * x) + 0.3 * Math.sin(TAU * hz(n) * 2 * x)), 1.4, 0.12));
// ---- write
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); peak ||= 1; const scale = Math.min(1, 0.9 / peak), out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * scale)) * 32767), 44 + i * 4); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * scale)) * 32767), 46 + i * 4); }
fs.writeFileSync(path.join(root, "audio/score.wav"), out);
console.log(`score.wav: ${TL.total}s, ${cues.length} effects, peak ${peak.toFixed(2)} (scaled by ${scale.toFixed(2)})`);
