// Shared adapter plumbing. Same contract as ~/.agents/tooling adapters:
// every adapter exposes status() and apply() returning { client, actions, inSync, warnings }.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { HOOKS_ROOT, IS_COMPILED } from "../src/lib/store.mjs";

export const BIN = IS_COMPILED ? process.execPath : path.join(HOOKS_ROOT, "bin", "actualize");
export const MANAGED = "actualize-managed";
// A command string we own, whatever path the repo lived at when it was installed.
export const OWNED_CMD = /(^|[\s"'/])actualize"?\s+hook\s+(claude|codex|cline)\b/;

export const home = () => os.homedir();

export function backupDir() {
  if (process.env.ACTUALIZE_BACKUP_DIR) return process.env.ACTUALIZE_BACKUP_DIR;
  const agents = path.join(home(), ".agents", "state");
  return fs.existsSync(agents) ? path.join(agents, "actualize-backups") : path.join(home(), ".local", "state", "actualize", "backups");
}

export function backup(file) {
  if (!fs.existsSync(file)) return null;
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${path.basename(path.dirname(file))}-${path.basename(file)}.${Date.now()}.bak`);
  fs.copyFileSync(file, dest);
  return dest;
}

export function readJson(file, fallback = {}) {
  if (!fs.existsSync(file)) return structuredClone(fallback);
  const t = fs.readFileSync(file, "utf8");
  if (!t.trim()) return structuredClone(fallback);
  return JSON.parse(t);
}

// Write through symlinks (config files in this setup are often symlinked into ~/.agents/config).
export function writeFileThrough(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const real = fs.existsSync(file) ? fs.realpathSync(file) : file;
  fs.writeFileSync(real, text);
}

export const result = (client, actions, inSync, warnings = []) => ({ client, actions, inSync, warnings });
export const cmdFor = (client, event) => `"${BIN}" hook ${client} ${event}`;

// ---- shared by Claude Code and Codex: hooks live in a JSON { hooks: { Event: [ {matcher, hooks:[{type,command}]} ] } } ----
export function wantedEntries(client, spec) {
  return Object.entries(spec).map(([event, s]) => ({ event, matcher: s.matcher, hook: { type: "command", command: cmdFor(client, s.event), ...(s.timeout ? { timeout: s.timeout } : {}) } }));
}

export function stripManaged(hooksObj) {
  let removed = 0;
  for (const [event, groups] of Object.entries(hooksObj)) {
    if (!Array.isArray(groups)) continue;
    const kept = [];
    for (const g of groups) {
      const inner = (g.hooks ?? []).filter((h) => !(h.type === "command" && OWNED_CMD.test(h.command ?? "")));
      removed += (g.hooks ?? []).length - inner.length;
      if (inner.length) kept.push({ ...g, hooks: inner });
    }
    if (kept.length) hooksObj[event] = kept; else delete hooksObj[event];
  }
  return removed;
}

export function mergeJsonHooks(client, file, spec, { dryRun }) {
  const actions = [];
  const cfg = readJson(file, {});
  cfg.hooks ??= {};
  const before = JSON.stringify(cfg.hooks);
  stripManaged(cfg.hooks);
  for (const w of wantedEntries(client, spec)) {
    const group = { ...(w.matcher ? { matcher: w.matcher } : {}), hooks: [w.hook] };
    (cfg.hooks[w.event] ??= []).push(group);
  }
  const changed = JSON.stringify(cfg.hooks) !== before;
  if (!changed) return { actions: [`${file}: hooks already in sync`], changed: false };
  actions.push(`${dryRun ? "would write" : "wrote"} ${Object.keys(spec).length} actualize hook event(s) into ${file}`);
  if (!dryRun) { const b = backup(file); if (b) actions.push(`backup: ${b}`); writeFileThrough(file, JSON.stringify(cfg, null, 2) + "\n"); }
  return { actions, changed: true };
}

export function jsonHooksStatus(client, file, spec) {
  if (!fs.existsSync(file)) return { inSync: false, actions: [`missing ${file}`] };
  let cfg;
  try { cfg = readJson(file, {}); } catch (e) { return { inSync: false, actions: [`${file}: parse error: ${e.message}`] }; }
  const missing = [];
  for (const w of wantedEntries(client, spec)) {
    const groups = cfg.hooks?.[w.event] ?? [];
    const ok = groups.some((g) => (g.matcher ?? "") === (w.matcher ?? "") && (g.hooks ?? []).some((h) => h.command === w.hook.command));
    if (!ok) missing.push(w.event);
  }
  return missing.length ? { inSync: false, actions: [`${file}: missing or drifted: ${missing.join(", ")}`] } : { inSync: true, actions: [] };
}

export function removeJsonHooks(file, { dryRun }) {
  if (!fs.existsSync(file)) return { actions: [`${file}: nothing to remove`] };
  const cfg = readJson(file, {});
  if (!cfg.hooks) return { actions: [`${file}: nothing to remove`] };
  const n = stripManaged(cfg.hooks);
  if (!cfg.hooks || !Object.keys(cfg.hooks).length) delete cfg.hooks;
  if (!n) return { actions: [`${file}: no actualize hooks present`] };
  if (!dryRun) { backup(file); writeFileThrough(file, JSON.stringify(cfg, null, 2) + "\n"); }
  return { actions: [`${dryRun ? "would remove" : "removed"} ${n} actualize hook command(s) from ${file}`] };
}
