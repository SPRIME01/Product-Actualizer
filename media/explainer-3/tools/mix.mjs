// Builds audio/mix.wav: the voice lines placed at their film times, the synthesised score and effects ducked under them
// (sidechain compression keyed by the voice), then loudness-normalised in two passes (-16 LUFS integrated, true peak ceiling -1.5 dBTP).
//   bun media/explainer-3/tools/score.mjs && bun media/explainer-3/tools/mix.mjs
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dir, "..");
const tl = JSON.parse(fs.readFileSync(path.join(root, "src/timeline.json"), "utf8"));
const TARGET = { I: -16, TP: -1.5, LRA: 11 };
const run = (args) => { const r = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe" }); if (r.exitCode !== 0) throw new Error(new TextDecoder().decode(r.stderr).slice(-600)); return new TextDecoder().decode(r.stderr); };
const n = tl.lines.length;
const inputs = [...tl.lines.flatMap((l) => ["-i", path.join(root, "audio/lines", `L${String(l.id).padStart(2, "0")}.mp3`)]), "-i", path.join(root, "audio/score.wav")];
const parts = tl.lines.map((l, i) => `[${i}:a]asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.012,afade=t=out:st=${(l.duration - 0.012).toFixed(3)}:d=0.012,adelay=${Math.round(l.start * 1000)}:all=1[v${i}]`);
const voice = `${tl.lines.map((_, i) => `[v${i}]`).join("")}amix=inputs=${n}:normalize=0:duration=longest,apad=whole_dur=${tl.total},atrim=0:${tl.total},asplit=2[vk][vm]`;
const graph = `${parts.join(";")};${voice};[${n}:a]aresample=48000,volume=0.38[mus];[mus][vk]sidechaincompress=threshold=0.015:ratio=7:attack=12:release=450:makeup=1[duck];[vm]pan=stereo|c0=c0|c1=c0[vs];[duck][vs]amix=inputs=2:normalize=0:duration=longest,atrim=0:${tl.total}`;
const raw = path.join(root, "audio/mix-raw.wav");
run(["ffmpeg", "-y", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-ar", "48000", "-ac", "2", raw]);
const m1 = run(["ffmpeg", "-hide_banner", "-nostats", "-i", raw, "-af", `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`, "-f", "null", "-"]);
const j = JSON.parse(m1.slice(m1.lastIndexOf("{"), m1.lastIndexOf("}") + 1));
const norm = `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`;
run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", norm, "-ac", "2", "-ar", "48000", path.join(root, "audio/mix.wav")]);
fs.rmSync(raw);
console.log("mix.wav written; before normalisation:", JSON.stringify({ I: j.input_i, TP: j.input_tp, LRA: j.input_lra }));
