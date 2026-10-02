// Build a run directory from a walkthrough's final state so the cockpit can be exercised against both fixtures.
// The Product Model, proposals, artifacts, evidence, and history are the walkthrough's real files; only state.json and the event log are
// synthesized (the hook tests already prove the state machine reaches these states by replaying every step).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeRun, saveState, newState, modelHash } from "../../hooks/src/lib/store.mjs";
import { loadLenses, waves as wavesOf } from "../../hooks/src/lib/lenses.mjs";
import * as P from "../../hooks/src/process.mjs";

export const REPO = path.resolve(import.meta.dir, "../..");
const copy = (src: string, dst: string) => { if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true }); };

export const FIXTURES = {
  loam: { dir: "walkthrough", chosen: ["recon-software", "recon-physical", "brand", "provenance-licensing", "marketing", "release-readiness"], satisfied: [] as string[], goal: "closed-beta signup page, text only", bar: "beta", versions: 4 },
  mote: { dir: "walkthrough-mote", chosen: ["recon-software", "recon-physical", "electronics", "embedded-systems", "robotics", "marketing", "release-readiness"], satisfied: ["brand"], goal: "closed-beta hardware kit for 10 builders with a public spec sheet", bar: "beta", versions: 6 },
} as const;
export type FixtureName = keyof typeof FIXTURES;

export function fixtureRun(name: FixtureName, opts: { complete?: boolean; stale?: boolean; openProposals?: string[] } = {}) {
  const f = FIXTURES[name];
  const project = fs.mkdtempSync(path.join(os.tmpdir(), `cockpit-${name}-`));
  const src = path.join(REPO, "tests", f.dir);
  const run = makeRun(path.join(project, "actualize"));
  for (const d of [run.dir, run.hiddenDir, run.historyDir]) fs.mkdirSync(d, { recursive: true });
  copy(path.join(src, "artifacts"), run.artifactsDir); copy(path.join(src, "evidence"), run.evidenceDir);
  copy(path.join(src, "history"), run.historyDir);
  fs.copyFileSync(path.join(src, "product-model.md"), run.modelPath);
  fs.copyFileSync(path.join(src, "proposals.md"), run.proposalsPath);
  for (let v = 1; v <= f.versions; v++) fs.copyFileSync(path.join(src, `model-v${v}.md`), path.join(run.historyDir, `model-v${v}.md`));
  if (opts.stale && name === "mote") {
    // the walkthrough's own pre-rebuild artifacts: built at older versions, so decision D7 left them stale
    fs.copyFileSync(path.join(src, "history", "electrical-review@2.md"), path.join(run.artifactsDir, "electronics", "electrical-review.md"));
    fs.copyFileSync(path.join(src, "history", "bringup@3.md"), path.join(run.artifactsDir, "embedded-systems", "bringup.md"));
  }
  if (opts.openProposals?.length) {
    const lines = fs.readFileSync(run.proposalsPath, "utf8").split("\n").map((l) => { const m = /^\| (P\d+) \|/.exec(l); if (!m || !opts.openProposals!.includes(m[1])) return l; const c = l.split("|"); c[7] = " open "; c[8] = " "; return c.join("|"); });
    fs.writeFileSync(run.proposalsPath, lines.join("\n"));
  }
  const lenses = loadLenses();
  const excluded = Object.fromEntries(Object.keys(lenses).filter((n) => !(f.chosen as readonly string[]).includes(n) && !(f.satisfied as readonly string[]).includes(n)).map((n) => [n, "not needed for this goal and evidence"]));
  const state = newState({ goal: f.goal, bar: f.bar, strict: true });
  state.selection = { lenses: [...f.chosen], satisfied: [...f.satisfied], excluded, waves: wavesOf(lenses, [...f.chosen]) };
  state.selectionLogged = true; state.modelVersion = f.versions; state.completed = Object.fromEntries(f.chosen.map((n) => [n, 1]));
  state.modelHash = modelHash(run); state.startedAt = new Date(Date.now() - 3600_000).toISOString();
  saveState(run, state);
  // a plausible event log: wave by wave, each wave reconciled once
  let t = Date.now() - 3500_000; const ts = (s: number) => new Date((t += s * 1000)).toISOString();
  const lines: any[] = [{ ts: ts(0), type: "begin", goal: f.goal, bar: f.bar }, { ts: ts(5), type: "select", chosen: f.chosen, satisfied: f.satisfied, excluded: Object.keys(excluded) }];
  let v = 0;
  for (const w of state.selection.waves) {
    for (const n of w) { lines.push({ ts: ts(2), type: "lens_start", lens: n, version: v }); }
    for (const n of w) lines.push({ ts: ts(40), type: "lens_done", lens: n, proposals: [], files: [] });
    if (v < f.versions) { lines.push({ ts: ts(3), type: "reconcile_start", baseVersion: v }); v += 1; lines.push({ ts: ts(30), type: "reconcile_done", version: v, changed: true }); }
  }
  fs.writeFileSync(run.logPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  const g = P.computeGate(run, state, lenses);
  if (opts.complete && g.ready) P.finish(run, state, lenses);
  return { project, run, state, gate: g };
}

export function cleanup(project: string) { fs.rmSync(project, { recursive: true, force: true }); }

// Tiny valid PNGs (1x1) for composition tests that need images in the run.
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
export function addAsset(run: any, rel: string) { const f = path.join(run.dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, PNG); }
