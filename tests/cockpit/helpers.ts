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

// ---- scenario builders: edit a fixture run the way a reconciliation or a lens would have left it -----------------------------------
import { loadState } from "../../hooks/src/lib/store.mjs";
export const rewriteModel = (fx: { run: any }, fn: (text: string) => string) => {
  fs.writeFileSync(fx.run.modelPath, fn(fs.readFileSync(fx.run.modelPath, "utf8")));
  const st = loadState(fx.run); st.modelHash = modelHash(fx.run); saveState(fx.run, st);
};
export const writeRun = (fx: { run: any }, rel: string, text: string) => { const f = path.join(fx.run.dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
export const patchState = (fx: { run: any }, fn: (s: any) => void) => { const st = loadState(fx.run); fn(st); saveState(fx.run, st); };
// A Loam run with no contradicted claims: the engine is satisfied, nothing is stale, and the gate is ready.
export const calm = (fx: { run: any }) => rewriteModel(fx, (t) => t.replace(/\| CONTRADICTED \|/g, "| REPORTED |"));
// Rebuild the gate and every artifact "at" an older model, so the engine sees them stale.
export const makeStale = (fx: { run: any }, rel: string) => { const f = path.join(fx.run.artifactsDir, rel); fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/^built_from: model@\d+/m, "built_from: model@2")); };
export const DEMAND = {
  jobs: "| id | actor | job | grade | source |\n|---|---|---|---|---|\n| J1 | A1 | Know in time that a plant needs water, without checking by hand | REPORTED | evidence/recon-software/interview-1.md |\n",
  criteria: "| id | job | direction | measure | object | context | importance | satisfaction | grade | source |\n|---|---|---|---|---|---|---|---|---|---|\n| S1 | J1 | minimize | time to notice a dry plant | the owner | away for a week | UNKNOWN | UNKNOWN | REPORTED | evidence/recon-software/interview-1.md |\n",
  opportunities: "| id | basis | deficiency | alternatives | grade | source |\n|---|---|---|---|---|---|\n| OP1 | S1 | Dry plants are noticed only after they wilt | poking the soil; a phone reminder | REPORTED | evidence/recon-software/interview-1.md |\n",
};
export const addDemand = (fx: { run: any }, parts: Partial<Record<keyof typeof DEMAND, string>> = DEMAND) => rewriteModel(fx, (t) => `${t.trimEnd()}\n\n## Jobs\n\n${parts.jobs ?? DEMAND.jobs}\n## Success criteria\n\n${parts.criteria ?? DEMAND.criteria}\n## Opportunities\n\n${parts.opportunities ?? DEMAND.opportunities}`);
// A decision-state artifact as the marketing lens would write it (stamped, so the engine accepts it).
export const decisionArtifact = (rows: string[], extraHead = "") => `built_from: model@4\nreads: [actors, jobs]\ncites: []\n\n| case | actor | job | trigger | push | pull | anxiety | habit | grade | evidence |${extraHead}\n|---|---|---|---|---|---|---|---|---|---|${extraHead ? "---|" : ""}\n${rows.join("\n")}\n`;
// An experiment: a hypothesis with a criterion frozen before the rows. `rows` are the result table (empty = designed, not yet observed).
import { observerId, parsePreds, normPreds } from "../../cockpit/server/world";
export function experimentFile(o: { name: string; scope: string; rows?: string[]; frozen?: boolean | string; expect?: string; limitations?: string; hypothesis?: string; case?: string }) {
  const expect = o.expect ?? "lift~gt~0", rel = `marketing/${o.name}.md`;
  const id = observerId({ selects: `file:evidence/${rel}#table1`, where: [], expect: normPreds(parsePreds(expect)) });
  const frozen = o.frozen === false ? "" : `frozen: ${typeof o.frozen === "string" ? o.frozen : id}\n`;
  return { rel: `evidence/${rel}`, id, text: `experiment: ${o.name}\nhypothesis: ${o.hypothesis ?? "if the message leads with control then qualified signups rise because the owner fears losing control"}\ncase: ${o.case ?? "run"}\nprimary: lift\nguardrail: bounce\nscope: ${o.scope}\nexpect: ${expect}\n${frozen}limitations: ${o.limitations ?? "small sample"}\n\n| variant | lift | bounce |\n|---|---|---|\n${(o.rows ?? []).join("\n")}${o.rows?.length ? "\n" : ""}` };
}
