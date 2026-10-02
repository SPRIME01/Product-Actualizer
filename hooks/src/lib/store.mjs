// Run state on disk: locating the run, state.json, event log, model hash, snapshots.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// Running as a `bun build --compile` executable, source files live in a virtual filesystem. The skills and product-model are real files
// the agents read, so they ship beside the binary: <home>/bin/actualize, <home>/skills, <home>/product-model (override with ACTUALIZE_HOME).
export const IS_COMPILED = typeof globalThis.Bun !== "undefined" && String(globalThis.Bun.main ?? "").startsWith("/$bunfs");
export const HOOKS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const REPO_ROOT = IS_COMPILED ? path.resolve(process.env.ACTUALIZE_HOME ?? path.join(path.dirname(process.execPath), "..")) : path.resolve(HOOKS_ROOT, "..");
export const CLI_PATH = IS_COMPILED ? process.execPath : path.join(HOOKS_ROOT, "src", "cli.mjs");
export const DIR_NAME = "actualize";

export function skillsDir(env = process.env) {
  return env.ACTUALIZE_SKILLS_DIR || path.join(REPO_ROOT, "skills");
}
export function schemaDir(env = process.env) {
  return env.ACTUALIZE_MODEL_DIR || path.join(REPO_ROOT, "product-model");
}

const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

// Find the run directory: ACTUALIZE_DIR, else the nearest `actualize/` (with state.json) at or above cwd.
export function findRun(cwd = process.cwd(), env = process.env) {
  let dir = null;
  if (env.ACTUALIZE_DIR) dir = path.resolve(env.ACTUALIZE_DIR);
  else {
    let cur = path.resolve(cwd);
    for (;;) {
      const cand = path.join(cur, DIR_NAME);
      if (exists(path.join(cand, "state.json"))) { dir = cand; break; }
      const up = path.dirname(cur);
      if (up === cur) break;
      cur = up;
    }
  }
  if (!dir || !exists(path.join(dir, "state.json"))) return null;
  return makeRun(dir);
}

export function makeRun(dir) {
  return {
    dir,
    project: path.dirname(dir),
    statePath: path.join(dir, "state.json"),
    modelPath: path.join(dir, "product-model.md"),
    proposalsPath: path.join(dir, "proposals.md"),
    artifactsDir: path.join(dir, "artifacts"),
    evidenceDir: path.join(dir, "evidence"),
    historyDir: path.join(dir, "history"),
    hiddenDir: path.join(dir, ".state"),
    logPath: path.join(dir, ".log.jsonl"),
    inboxPath: path.join(dir, "inbox.jsonl"),
    cockpitDir: path.join(dir, ".cockpit"),
  };
}

export function readText(p, fallback = null) {
  try { return fs.readFileSync(p, "utf8"); } catch { return fallback; }
}

export function writeAtomic(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, p);
}

export const sha = (text) => crypto.createHash("sha256").update(text ?? "").digest("hex").slice(0, 16);

export function loadState(run) {
  const t = readText(run.statePath);
  if (!t) return null;
  try { return JSON.parse(t); } catch { return null; }
}

export function saveState(run, state) {
  writeAtomic(run.statePath, JSON.stringify(state, null, 2) + "\n");
}

export function newState(opts) {
  return {
    version: 1, active: true, goal: opts.goal, bar: opts.bar, strict: opts.strict !== false,
    phase: "idle", selection: null, selectionLogged: false,
    activeLenses: {}, completed: {}, unreconciled: [],
    reconcile: null, modelVersion: 0, modelHash: null,
    stopBlocks: 0, lastBlockSig: "", startedAt: new Date().toISOString(),
  };
}

export function log(run, entry) {
  try {
    fs.appendFileSync(run.logPath, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch { /* logging must never break a hook */ }
}

export function modelHash(run) {
  const t = readText(run.modelPath);
  return t === null ? null : sha(t);
}

export function listFiles(dir, base = dir) {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else out.push(path.relative(base, p));
  }
  return out.sort();
}

// Classify a path relative to the run: which protected zone (if any) does it fall in?
export function zoneOf(run, target, cwd = process.cwd()) {
  const abs = path.resolve(cwd, target);
  const rel = path.relative(run.dir, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    const relProject = path.relative(run.project, abs);
    return { zone: relProject.startsWith("..") || path.isAbsolute(relProject) ? "outside" : "project", abs };
  }
  const parts = rel.split(path.sep);
  if (rel === "product-model.md") return { zone: "model", abs };
  if (rel === "proposals.md") return { zone: "proposals", abs };
  if (rel === "state.json" || parts[0] === ".state" || parts[0] === ".cockpit" || rel === ".log.jsonl" || rel === "inbox.jsonl") return { zone: "state", abs };
  if (parts[0] === "history") return { zone: "history", abs };
  if (parts[0] === "artifacts") return { zone: "artifact", lens: parts[1] ?? null, abs };
  if (parts[0] === "evidence") return { zone: "evidence", lens: parts[1] ?? null, abs };
  return { zone: "run-other", abs };
}
