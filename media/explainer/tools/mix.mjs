// Builds audio/mix.wav from the per-line takes and the timeline: each line placed at its film time, over low-level room tone,
// then loudness-normalised in two passes (target -16 LUFS integrated, true peak ceiling -1.5 dBTP). Re-measured after the final encode in the check step.
//   bun media/explainer/tools/mix.mjs
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dir, "..");
const tl = JSON.parse(fs.readFileSync(path.join(root, "src/timeline.json"), "utf8"));
const TARGET = { I: -16, TP: -1.5, LRA: 11 };
const run = (args) => { const r = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe" }); if (r.exitCode !== 0) throw new Error(new TextDecoder().decode(r.stderr).slice(-600)); return new TextDecoder().decode(r.stderr); };
const inputs = [...tl.lines.flatMap((l) => ["-i", path.join(root, "audio/lines", `L${String(l.id).padStart(2, "0")}.mp3`)]), "-f", "lavfi", "-i", `anoisesrc=color=pink:amplitude=0.0012:sample_rate=48000:duration=${tl.total}`];
const parts = tl.lines.map((l, i) => `[${i}:a]asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.012,afade=t=out:st=${(l.duration - 0.012).toFixed(3)}:d=0.012,adelay=${Math.round(l.start * 1000)}:all=1[v${i}]`);
const mixIn = [`[${tl.lines.length}:a]`, ...tl.lines.map((_, i) => `[v${i}]`)].join("");
const graph = `${parts.join(";")};${mixIn}amix=inputs=${tl.lines.length + 1}:normalize=0:duration=longest,atrim=0:${tl.total},apad=whole_dur=${tl.total},atrim=0:${tl.total}`;
const raw = path.join(root, "audio/mix-raw.wav");
run(["ffmpeg", "-y", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-ar", "48000", "-ac", "1", raw]);
// pass 1: measure
const m1 = run(["ffmpeg", "-hide_banner", "-nostats", "-i", raw, "-af", `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`, "-f", "null", "-"]);
const j = JSON.parse(m1.slice(m1.lastIndexOf("{"), m1.lastIndexOf("}") + 1));
// pass 2: apply linearly with the measured values
const norm = `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`;
run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", norm, "-ac", "2", "-ar", "48000", path.join(root, "audio/mix.wav")]);
fs.rmSync(raw);
console.log("mix.wav written; before normalisation:", JSON.stringify({ I: j.input_i, TP: j.input_tp, LRA: j.input_lra }));
