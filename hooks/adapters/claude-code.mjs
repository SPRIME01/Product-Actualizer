// Claude Code: hooks in settings.json (user: ~/.claude/settings.json, project: .claude/settings.json).
import path from "node:path";
import { home, result, mergeJsonHooks, jsonHooksStatus, removeJsonHooks } from "./common.mjs";

export const id = "claude";
export const aliases = ["claude-code"];
const SPEC = {
  SessionStart: { event: "session_start", matcher: "startup|resume|clear|compact" },
  UserPromptSubmit: { event: "prompt" },
  PreToolUse: { event: "pre_tool", matcher: "Bash|Write|Edit|MultiEdit|NotebookEdit|Read", timeout: 15 },
  PostToolUse: { event: "post_tool", matcher: "Write|Edit|MultiEdit|NotebookEdit|Bash", timeout: 15 },
  Stop: { event: "stop", timeout: 15 },
};
export const file = (scope, project) => (scope === "project" ? path.join(project, ".claude", "settings.json") : path.join(home(), ".claude", "settings.json"));

export function status({ scope, project }) {
  const s = jsonHooksStatus("claude", file(scope, project), SPEC);
  return result("Claude Code", s.actions, s.inSync);
}
export function apply({ scope, project, dryRun }) {
  const r = mergeJsonHooks("claude", file(scope, project), SPEC, { dryRun });
  return result("Claude Code", r.actions, true);
}
export function remove({ scope, project, dryRun }) {
  return result("Claude Code", removeJsonHooks(file(scope, project), { dryRun }).actions, true);
}
