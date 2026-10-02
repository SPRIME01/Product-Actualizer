// Per-client translation: native hook payloads -> normalized events, and decisions -> native output.
// Normalized event: { client, event, cwd, prompt?, tool?: {name, kind, paths, command?, content?}, raw }
import path from "node:path";

const BASH = /^(bash|shell|local_shell|shell_command|exec_command|run_commands|execute_command|container\.exec)$/i;
const READ = /^(read|read_file|read_files|view|cat)$/i;
const WRITE = /^(write|write_to_file|create|create_file)$/i;
const EDIT = /^(edit|multiedit|str_replace_editor|replace_in_file|notebookedit|editor)$/i;
const PATCH = /^(apply_patch|patch)$/i;
const PATH_KEYS = ["file_path", "filePath", "path", "file", "notebook_path", "paths", "files", "filename", "target_file"];
const CONTENT_KEYS = ["content", "file_text", "text", "contents"];
const PATCH_KEYS = ["patch", "patchText", "input", "diff", "command", "cmd"];

const asArray = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.flatMap(asArray);
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("[")) { try { return asArray(JSON.parse(t)); } catch { /* plain string */ } }
    return [v];
  }
  return [];
};

export function patchPaths(text) {
  const out = [];
  for (const m of String(text).matchAll(/^\*\*\* (?:Add|Update|Delete) File:\s*(.+)$/gm)) out.push(m[1].trim());
  for (const m of String(text).matchAll(/^\*\*\* Move to:\s*(.+)$/gm)) out.push(m[1].trim());
  for (const m of String(text).matchAll(/^\+\+\+ (?:b\/)?(\S+)/gm)) if (m[1] !== "/dev/null") out.push(m[1]);
  return [...new Set(out)];
}

export function classifyTool(name, input = {}) {
  const inp = typeof input === "string" ? safeJson(input) : input ?? {};
  const n = String(name ?? "");
  const tool = { name: n, kind: "other", paths: [], input: inp };
  const paths = PATH_KEYS.flatMap((k) => asArray(inp[k]));
  if (BASH.test(n)) {
    tool.kind = "bash";
    const cmd = inp.command ?? inp.cmd ?? inp.commands ?? inp.script;
    tool.command = Array.isArray(cmd) ? cmd.join(" ") : asArray(cmd).join(" && ");
    if (!tool.command && typeof inp === "string") tool.command = inp;
  } else if (PATCH.test(n)) {
    tool.kind = "patch";
    const text = PATCH_KEYS.map((k) => inp[k]).find((v) => typeof v === "string" && /\*\*\* (Add|Update|Delete)|^\+\+\+ /m.test(v)) ?? "";
    tool.paths = [...new Set([...paths, ...patchPaths(text)])];
  } else if (READ.test(n)) { tool.kind = "read"; tool.paths = paths; }
  else if (WRITE.test(n) || (EDIT.test(n) && /^(create)$/i.test(String(inp.command ?? "")))) {
    tool.kind = "write"; tool.paths = paths;
    const c = CONTENT_KEYS.map((k) => inp[k]).find((v) => typeof v === "string");
    if (c !== undefined) tool.content = c;
  } else if (EDIT.test(n)) { tool.kind = "edit"; tool.paths = paths; }
  return tool;
}

const safeJson = (s) => { try { return JSON.parse(s); } catch { return {}; } };

const CLAUDE_EVENTS = { SessionStart: "session_start", UserPromptSubmit: "prompt", PreToolUse: "pre_tool", PostToolUse: "post_tool", Stop: "stop", PreCompact: "compact" };
const CLINE_EVENTS = { PreToolUse: "pre_tool", PostToolUse: "post_tool", UserPromptSubmit: "prompt", TaskStart: "session_start", TaskResume: "session_start", TaskComplete: "stop", PreCompact: "compact" };

export function normalizeEvent(client, eventName, payload = {}, env = process.env) {
  const c = client.toLowerCase();
  if (c === "cline") {
    const event = CLINE_EVENTS[eventName] ?? eventName;
    const cwd = payload.workspaceInfo?.rootPath ?? payload.workspaceRoots?.[0] ?? process.cwd();
    const ev = { client: c, event, cwd, raw: payload };
    if (event === "pre_tool" || event === "post_tool") {
      const d = payload.preToolUse ?? payload.postToolUse ?? {};
      ev.tool = classifyTool(d.toolName, d.parameters ?? {});
    }
    if (event === "prompt") ev.prompt = payload.userPromptSubmit?.prompt ?? "";
    return ev;
  }
  // claude-code and codex share a payload shape
  const event = CLAUDE_EVENTS[eventName] ?? eventName;
  const cwd = payload.cwd ?? env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const ev = { client: c, event, cwd: path.resolve(cwd), sessionId: payload.session_id, stopActive: Boolean(payload.stop_hook_active), raw: payload };
  if (event === "pre_tool" || event === "post_tool") ev.tool = classifyTool(payload.tool_name, payload.tool_input);
  if (event === "prompt") ev.prompt = payload.prompt ?? "";
  return ev;
}

// Native output for command-style hooks. Returns { stdout, stderr, code }.
export function formatOutput(client, eventName, ev, d) {
  const c = client.toLowerCase();
  const none = { stdout: c === "cline" ? "{}\n" : "", stderr: "", code: 0 };
  if (!d) return none;
  if (c === "cline") {
    const o = {};
    if (d.deny) { o.cancel = true; o.errorMessage = d.deny; }
    const ctx = [d.context, d.feedback, d.block, d.notice].filter(Boolean).join("\n");
    if (ctx) o.contextModification = ctx;
    return { stdout: JSON.stringify(o) + "\n", stderr: "", code: 0 };
  }
  // claude-code / codex
  const event = ev.event;
  if (event === "pre_tool" && d.deny) {
    return { stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: d.deny } }) + "\n", stderr: "", code: 0 };
  }
  if (event === "post_tool" && d.feedback) return { stdout: "", stderr: d.feedback + "\n", code: 2 };
  if (event === "stop") {
    if (d.block) return { stdout: "", stderr: d.block + "\n", code: 2 };
    if (d.notice) return { stdout: JSON.stringify({ systemMessage: d.notice }) + "\n", stderr: "", code: 0 };
  }
  if (event === "session_start" && d.context) return { stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: d.context } }) + "\n", stderr: "", code: 0 };
  if (event === "prompt" && d.context) return { stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: d.context } }) + "\n", stderr: "", code: 0 };
  return none;
}
