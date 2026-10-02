// Cline CLI: executable hook files named after the event (user: ~/.cline/hooks/, project: .clinerules/hooks/).
// Each file is a one-line shim that calls `actualize hook cline <Event>`. Cline cannot veto task completion,
// so TaskComplete only reports; the PreToolUse gate and context injection carry the enforcement.
import fs from "node:fs";
import path from "node:path";
import { home, result, backup, BIN, MANAGED } from "./common.mjs";

export const id = "cline";
export const aliases = [];
const EVENTS = ["PreToolUse", "PostToolUse", "UserPromptSubmit", "TaskStart", "TaskResume", "TaskComplete", "PreCompact"];
export const dir = (scope, project) => (scope === "project" ? path.join(project, ".clinerules", "hooks") : path.join(home(), ".cline", "hooks"));
const shim = (event) => `#!/bin/sh\n# ${MANAGED}\nexec "${BIN}" hook cline ${event}\n`;
const isOurs = (t) => t.includes(MANAGED);

export function status({ scope, project }) {
  const d = dir(scope, project);
  const actions = [];
  const warnings = [];
  for (const e of EVENTS) {
    const f = path.join(d, e);
    if (!fs.existsSync(f)) { actions.push(`missing ${f}`); continue; }
    const t = fs.readFileSync(f, "utf8");
    if (!isOurs(t)) warnings.push(`${f} is a foreign hook; actualize cannot share an event file`);
    else if (t !== shim(e)) actions.push(`${f} drifted`);
  }
  return result("Cline", actions, actions.length === 0 && warnings.length === 0, warnings);
}

export function apply({ scope, project, dryRun, force }) {
  const d = dir(scope, project);
  const actions = [];
  const warnings = [];
  for (const e of EVENTS) {
    const f = path.join(d, e);
    const exists = fs.existsSync(f);
    const cur = exists ? fs.readFileSync(f, "utf8") : null;
    if (exists && !isOurs(cur) && !force) { warnings.push(`${f} already exists and is not managed here; left alone (use --force to replace, or chain it manually)`); continue; }
    if (cur === shim(e)) continue;
    actions.push(`${dryRun ? "would write" : "wrote"} ${f}`);
    if (!dryRun) { if (exists) backup(f); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(f, shim(e), { mode: 0o755 }); fs.chmodSync(f, 0o755); }
  }
  return result("Cline", actions.length ? actions : [`${d}: hooks already in sync`], true, warnings);
}

export function remove({ scope, project, dryRun }) {
  const d = dir(scope, project);
  const actions = [];
  for (const e of EVENTS) {
    const f = path.join(d, e);
    if (fs.existsSync(f) && isOurs(fs.readFileSync(f, "utf8"))) { actions.push(`${dryRun ? "would remove" : "removed"} ${f}`); if (!dryRun) fs.unlinkSync(f); }
  }
  return result("Cline", actions.length ? actions : [`${d}: nothing to remove`], true);
}
