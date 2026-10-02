// Codex CLI: hooks in hooks.json (user: ~/.codex/hooks.json, project: .codex/hooks.json).
// Same entry shape as Claude Code. Codex keeps a trust hash per hook in config.toml; that is the operator's to approve.
import path from "node:path";
import { home, result, mergeJsonHooks, jsonHooksStatus, removeJsonHooks } from "./common.mjs";

export const id = "codex";
export const aliases = [];
const SHELL = "local_shell|shell|shell_command|exec_command|Bash|Shell|apply_patch|Edit|Write|MultiEdit";
const SPEC = {
  SessionStart: { event: "session_start", matcher: "startup|resume|compact" },
  UserPromptSubmit: { event: "prompt" },
  PreToolUse: { event: "pre_tool", matcher: SHELL, timeout: 15 },
  PostToolUse: { event: "post_tool", matcher: SHELL, timeout: 15 },
  Stop: { event: "stop", timeout: 15 },
};
export const file = (scope, project) => (scope === "project" ? path.join(project, ".codex", "hooks.json") : path.join(home(), ".codex", "hooks.json"));
const NOTE = "Codex asks you to review new hooks the first time it sees them (run codex, then /hooks, and trust the actualize entries).";

export function status({ scope, project }) {
  const s = jsonHooksStatus("codex", file(scope, project), SPEC);
  return result("Codex", s.actions, s.inSync, s.inSync ? [] : [NOTE]);
}
export function apply({ scope, project, dryRun }) {
  const r = mergeJsonHooks("codex", file(scope, project), SPEC, { dryRun });
  return result("Codex", r.actions, true, r.changed ? [NOTE] : []);
}
export function remove({ scope, project, dryRun }) {
  return result("Codex", removeJsonHooks(file(scope, project), { dryRun }).actions, true);
}
