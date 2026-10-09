// Mux the mix into both renders, tag BT.709, cut the poster, and write the probes that the motion-editorial and audio-sound checks read.
//   bun media/explainer/tools/finish.mjs
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dir, "..");
const R = (...p) => path.join(root, ...p), ev = path.resolve(root, "../../actualize/evidence/motion-editorial-3"); fs.mkdirSync(ev, { recursive: true });
const dec = (b) => new TextDecoder().decode(b), run = (a) => { const r = Bun.spawnSync(a, { stdout: "pipe", stderr: "pipe" }); if (r.exitCode) throw new Error(dec(r.stderr).slice(-400)); return dec(r.stdout) + dec(r.stderr); };
for (const [src, out] of [["silent-captioned", "explainer-captioned"], ["silent-clean", "explainer"]]) run(["ffmpeg", "-y", "-loglevel", "error", "-i", R(`renders/${src}.mp4`), "-i", R("audio/mix.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-bsf:v", "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", R(`renders/${out}.mp4`)]);
const tl = JSON.parse(fs.readFileSync(R("src/timeline.json"), "utf8")), posterAt = tl.lines[5].start + tl.lines[5].duration * 0.97;   // the comparison, complete
run(["ffmpeg", "-y", "-loglevel", "error", "-ss", String(posterAt), "-i", R("renders/explainer-captioned.mp4"), "-frames:v", "1", "-q:v", "2", R("renders/poster.jpg")]);
const probe = (f) => dec(Bun.spawnSync(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,color_space,color_primaries,color_transfer,color_range,sample_rate,channels,duration,nb_frames", "-show_entries", "format=duration,size", "-of", "default=nw=1", f]).stdout).replace(/\n/g, " ");
const lines = [`# Delivered-file probes, ${new Date().toISOString().slice(0, 10)}`];
for (const f of ["renders/explainer.mp4", "renders/explainer-captioned.mp4"]) { lines.push(`## ${f}`, probe(R(f))); const j = JSON.parse(dec(Bun.spawnSync(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", R(f)]).stdout)); const d = Object.fromEntries(j.streams.map((s) => [s.codec_type, +s.duration])); lines.push(`video ${d.video}s audio ${d.audio}s difference ${(Math.abs(d.audio - d.video) * 30).toFixed(2)} frames at 30 fps`); }
const gapAt = tl.lines[0].end + 0.15;
lines.push("## loudness of the delivered file, decoded from the mp4", run(["bash", "-c", `ffmpeg -hide_banner -nostats -i ${R("renders/explainer.mp4")} -vn -af ebur128=peak=true -f null - 2>&1 | grep -E "^\\s+(I:|LRA:|Peak:)" | tail -3`]));
lines.push(`## noise floor in the gap after line 1 (${gapAt.toFixed(2)} s, 0.5 s)`, run(["bash", "-c", `ffmpeg -hide_banner -nostats -ss ${gapAt} -t 0.5 -i ${R("renders/explainer.mp4")} -vn -af astats=metadata=0 -f null - 2>&1 | grep "RMS level dB" | tail -1`]));
lines.push("## digital silence below -90 dB for 40 ms or more (count)", run(["bash", "-c", `ffmpeg -hide_banner -nostats -i ${R("renders/explainer.mp4")} -vn -af silencedetect=noise=-90dB:d=0.04 -f null - 2>&1 | grep -c silence_start || true`]));
fs.writeFileSync(path.join(ev, "probe.txt"), lines.join("\n") + "\n"); console.log(lines.join("\n"));
