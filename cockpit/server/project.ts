// Read a run directory into a plain projection object. Pure: files in, data out. No cockpit state is consulted,
// so the rail and every process-backed view are, by construction, a function of authoritative process state.
import fs from "node:fs";
import path from "node:path";
import { findRun, loadState, readText, listFiles } from "../../hooks/src/lib/store.mjs";
import { parseProposals, parseModel } from "../../hooks/src/lib/md.mjs";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";
import * as P from "../../hooks/src/process.mjs";

export type Claim = { id: string; text: string; grade: string; source: string };
export type Proj = {
  run: { dir: string; product: string; goal: string; bar: string; active: boolean; phase: string; modelVersion: number; verdict: string | null; paused: string | null; startedAt: string; next: string; activeLenses: string[]; ready: boolean };
  selection: { lenses: string[]; waves: string[][]; excluded: Record<string, string>; satisfied: string[] } | null;
  claims: Claim[]; unknowns: any[]; decisions: any[]; proposals: any[]; artifacts: any[]; blockers: any[]; versions: any[]; lenses: any[]; waves: any[]; evidence: any[]; responses: any[];
  log: any[];
};

const empty = (dir: string): Proj => ({ run: { dir, product: "", goal: "", bar: "", active: false, phase: "none", modelVersion: 0, verdict: null, paused: null, startedAt: "", next: "no run", activeLenses: [], ready: false }, selection: null, claims: [], unknowns: [], decisions: [], proposals: [], artifacts: [], blockers: [], versions: [], lenses: [], waves: [], evidence: [], responses: [], log: [] });

export function readLog(runLogPath: string): any[] {
  const out: any[] = [];
  for (const ln of (readText(runLogPath, "") ?? "").split("\n")) { if (!ln.trim()) continue; try { out.push(JSON.parse(ln)); } catch { /* torn line */ } }
  return out;
}

export function project(cwd: string): { run: any | null; proj: Proj } {
  const run = findRun(cwd);
  if (!run) return { run: null, proj: empty(path.join(cwd, "actualize")) };
  const state = loadState(run);
  if (!state) return { run, proj: empty(run.dir) };
  const lenses = P.loadLenses();
  const g = P.computeGate(run, state, lenses);
  const model = g.model ?? P.readModel(run);
  const proj = empty(run.dir);
  proj.run = {
    dir: run.dir, product: model?.fm?.product ?? "(model not built)", goal: state.goal, bar: state.bar, active: state.active,
    phase: Object.keys(state.activeLenses).length ? "lens" : state.phase, modelVersion: state.modelVersion, verdict: state.verdict ?? null,
    paused: state.paused?.reason ?? null, startedAt: state.startedAt, next: P.withCli(P.nextAction(run, state, lenses)), activeLenses: Object.keys(state.activeLenses), ready: g.ready,
  };
  proj.selection = state.selection ? { lenses: state.selection.lenses, waves: state.selection.waves, excluded: state.selection.excluded, satisfied: state.selection.satisfied } : null;
  proj.blockers = g.blockers.map((b: any, i: number) => ({ id: `B${i + 1}`, code: b.code, text: b.text, fix: P.withCli(b.fix) }));
  if (model) {
    proj.claims = [...model.claims.values()];
    proj.unknowns = [...model.unknowns.values()];
    proj.decisions = model.decisions.map((d: any) => ({ id: d.n, ...d }));
  }
  proj.proposals = g.props;
  proj.artifacts = g.arts.map((a: any) => ({
    id: a.rel, rel: a.rel, lens: a.lens, built: a.stamp.built, stale: a.stale, errors: a.errors, isGate: a.isGate, public: a.stamp.public,
    reads: a.stamp.reads, cites: a.stamp.cites, verdict: a.stamp.head.verdict ?? null, status: a.errors.length ? "invalid" : a.stale.length && !a.isGate ? "stale" : "current",
  }));
  proj.versions = listFiles(run.historyDir).filter((f: string) => /^model-v\d+\.md$/.test(f)).map((f: string) => {
    const v = Number(/\d+/.exec(f)![0]); const m = parseModel(readText(path.join(run.historyDir, f), ""));
    return { id: String(v), version: v, claims: m.claims.size, unknowns: m.unknowns.size, decisions: m.decisions.length, latest: m.decisions.filter((d: any) => d.version === v).map((d: any) => d.n).join(", ") };
  }).sort((a: any, b: any) => a.version - b.version);
  const staleLenses = new Set(proj.artifacts.filter((a) => a.status === "stale").map((a) => a.lens));
  const ready = new Set(P.readyLenses(state, lenses, g));
  const all = Object.values(lenses) as any[];
  proj.lenses = all.map((l) => ({
    id: l.name, name: l.name, needs: l.needs, reads: l.reads, executesWith: l.executesWith, description: l.description,
    status: state.activeLenses[l.name] ? "running" : !state.selection ? "unselected" : state.selection.excluded[l.name] !== undefined ? "excluded" : state.selection.satisfied.includes(l.name) ? "satisfied"
      : staleLenses.has(l.name) ? "stale" : state.completed[l.name] ? "done" : ready.has(l.name) ? "ready" : state.selection.lenses.includes(l.name) ? "waiting" : "unselected",
    runs: state.completed[l.name] ?? 0, reason: state.selection?.excluded?.[l.name] ?? "",
  }));
  proj.waves = (state.selection?.waves ?? []).map((w: string[], i: number) => {
    const done = w.filter((n) => state.completed[n]).length; const running = w.some((n) => state.activeLenses[n]);
    return { id: `W${i + 1}`, wave: i + 1, lenses: w.join(", "), done, total: w.length, status: done === w.length ? "done" : running || done ? "running" : "pending" };
  });
  proj.evidence = listFiles(run.evidenceDir).map((f: string) => ({ id: f, rel: f, lens: f.split(path.sep)[0], bytes: (() => { try { return fs.statSync(path.join(run.evidenceDir, f)).size; } catch { return 0; } })() }));
  proj.responses = readInbox(run).map((r: any) => ({ ...r, status: r.handled ? "handled" : "waiting" }));
  proj.log = readLog(run.logPath);
  return { run, proj };
}

// Rail: the smallest honest answer to "where are we, what is happening, what matters now, what next". Derived only from Proj.
export function railOf(p: Proj) {
  const contradicted = p.claims.filter((c) => c.grade === "CONTRADICTED").length;
  const stale = p.artifacts.filter((a) => a.status === "stale").length;
  const openProposals = p.proposals.filter((x: any) => x.status === "open").length;
  const waiting = p.responses.filter((r) => r.status === "waiting").length;
  const wave = p.waves.find((w) => w.status !== "done");
  const needsHuman = Boolean(p.run.paused) || waiting > 0;
  return {
    active: p.run.active, product: p.run.product, goal: p.run.goal, bar: p.run.bar, version: p.run.modelVersion, phase: p.run.phase,
    lenses: p.run.activeLenses, wave: wave ? { n: wave.wave, of: p.waves.length, lenses: wave.lenses } : null,
    done: p.lenses.filter((l) => l.status === "done").length, selected: p.selection?.lenses.length ?? 0,
    next: p.run.next, counts: { proposals: openProposals, unknowns: p.unknowns.length, contradictions: contradicted, stale, blockers: p.blockers.length, waiting },
    gate: p.run.verdict ?? (p.run.ready ? "ready" : p.blockers.length ? "blocked" : "open"),
    humanInput: needsHuman ? (p.run.paused ? `paused: ${p.run.paused}` : `${waiting} response(s) await the router`) : null,
    blockers: p.blockers.slice(0, 4).map((b) => b.text),
  };
}
export type Rail = ReturnType<typeof railOf>;
