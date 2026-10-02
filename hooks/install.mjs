#!/usr/bin/env bun
// Reconcile actualize hooks into each agent client's native config. Idempotent; never touches unmanaged entries.
//   bun hooks/install.mjs [--client claude|codex|cline|opencode|pi|prime|all] [--scope user|project] [--project <dir>]
//                          [--dry-run] [--status] [--uninstall] [--force]
import path from "node:path";
import { IS_COMPILED } from "./src/lib/store.mjs";
import * as claude from "./adapters/claude-code.mjs";
import * as codex from "./adapters/codex.mjs";
import * as cline from "./adapters/cline.mjs";
import * as opencode from "./adapters/opencode.mjs";
import * as prime from "./adapters/prime.mjs";

const ADAPTERS = [claude, codex, cline, opencode, prime];
const USAGE = `usage: install [--client claude|codex|cline|opencode|pi|prime|all] [--scope user|project] [--project <dir>] [--dry-run] [--status] [--uninstall] [--force]
  scope user    installs into your global client config (hooks stay silent unless an actualize run exists in the cwd's project)
  scope project installs into <project>/.claude, .codex, .clinerules, .opencode, .prime (default project: cwd)`;

export function resolveAdapters(name) {
  if (!name || name === "all") return ADAPTERS;
  const a = ADAPTERS.find((x) => x.id === name || x.aliases.includes(name));
  if (!a) throw new Error(`unknown client "${name}". Known: ${ADAPTERS.flatMap((x) => [x.id, ...x.aliases]).join(", ")}, all`);
  return [a];
}

// Hooks run `hooks/bin/actualize`, which execs `bun`; a client launched with a PATH that lacks it would fail open and silently do nothing.
export const MIN_BUN = "1.4.0";
export function runtimeProblem() {
  if (IS_COMPILED) return null;   // the single executable carries its own runtime
  const v = globalThis.Bun?.version;
  if (!v) return `Product Actualizer runs on Bun >= ${MIN_BUN}; run this installer with bun`;
  if (Bun.semver.order(v, MIN_BUN) < 0) return `Bun ${v} is older than the required ${MIN_BUN} (bun upgrade)`;
  if (!Bun.which("bun")) return "bun is not on PATH, so client-launched hooks cannot start it";
  return null;
}

export function run(opts) {
  const adapters = resolveAdapters(opts.client);
  const ctx = { scope: opts.scope ?? "user", project: path.resolve(opts.project ?? process.cwd()), dryRun: Boolean(opts.dryRun), force: Boolean(opts.force) };
  return adapters.map((a) => (opts.status ? a.status(ctx) : opts.uninstall ? a.remove(ctx) : a.apply(ctx)));
}

export async function main(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") { console.log(USAGE); return 0; }
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--status") opts.status = true;
    else if (a === "--uninstall") opts.uninstall = true;
    else if (a === "--force") opts.force = true;
    else if (["--client", "--scope", "--project"].includes(a)) opts[a.slice(2)] = argv[++i];
    else { console.error(`unknown option ${a}\n${USAGE}`); return 2; }
  }
  if (opts.scope && !["user", "project"].includes(opts.scope)) { console.error("--scope must be user or project"); return 2; }
  const problem = runtimeProblem();
  if (problem && !opts.status && !opts.dryRun && !opts.uninstall) { console.error(`install: ${problem}`); return 2; }
  if (problem) console.error(`note: ${problem}`);
  let results;
  try { results = run(opts); } catch (e) { console.error(`install: ${e.message}`); return 2; }
  let drift = false;
  for (const r of results) {
    console.log(`${r.inSync ? "ok " : "!! "} ${r.client}`);
    for (const a of r.actions) console.log(`     ${a}`);
    for (const w of r.warnings ?? []) console.log(`     note: ${w}`);
    if (!r.inSync) drift = true;
  }
  return opts.status && drift ? 1 : 0;
}

if (!IS_COMPILED && import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((c) => process.exit(c));
