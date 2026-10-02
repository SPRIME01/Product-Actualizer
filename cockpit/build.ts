// `bun run build`: one self-contained executable (Bun runtime, process CLI, hook entry, cockpit server, and the bundled SPA),
// laid out with the markdown the agents read, so a release is a directory you can copy anywhere:
//   dist/bin/actualize   dist/skills/   dist/product-model/
// The binary has no node_modules and needs no Bun on the target machine. Hooks installed from it point at the binary itself.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const outIdx = process.argv.indexOf("--out");
const out = path.resolve(outIdx > 0 ? process.argv[outIdx + 1] : path.join(root, "dist"));
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "bin"), { recursive: true });

const t0 = performance.now();
const r = Bun.spawnSync([process.execPath, "build", "--compile", "--minify", path.join(root, "hooks/src/cli.mjs"), "--outfile", path.join(out, "bin/actualize")], { cwd: root, stdout: "pipe", stderr: "pipe" });
if (r.exitCode !== 0) { console.error(r.stderr.toString() || r.stdout.toString()); process.exit(1); }
for (const d of ["skills", "product-model"]) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
const size = (fs.statSync(path.join(out, "bin/actualize")).size / 1e6).toFixed(0);
console.log(`built ${path.relative(root, path.join(out, "bin/actualize"))} (${size} MB) in ${Math.round(performance.now() - t0)} ms, with skills/ and product-model/`);
