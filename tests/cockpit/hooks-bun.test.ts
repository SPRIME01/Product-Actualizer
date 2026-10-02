// The Bun migration must not change what any client sees. This drives the real installed entry points as subprocesses:
// installer -> each client's native config -> the generated command -> bin/actualize -> Bun -> engine -> the client's native output format.
import { describe, test, expect, beforeAll } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REPO } from "./helpers";

const BIN = path.join(REPO, "hooks/bin/actualize");
const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const home = tmp("pa-home-"), project = tmp("pa-proj-");
const env = { ...process.env, HOME: home, ACTUALIZE_BACKUP_DIR: path.join(home, "bak"), ACTUALIZE_STDIN_IDLE_MS: "800" } as Record<string, string>;

const sh = (cmd: string, stdin = "", e = env, cwd = project) => {
  const r = Bun.spawnSync(["sh", "-c", cmd], { cwd, env: e, stdin: new TextEncoder().encode(stdin) });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
};
const bun = (args: string[], cwd = project) => { const r = Bun.spawnSync([process.execPath, ...args], { cwd, env }); return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() }; };

beforeAll(() => {
  fs.mkdirSync(path.join(project, "src"), { recursive: true });
  const r = bun([path.join(REPO, "hooks/src/cli.mjs"), "begin", "--goal", "hook test of the bun migration", "--bar", "demo"]);
  expect(r.code, r.err).toBe(0);
});

describe("installer", () => {
  test("installs every client into a project, reports in sync, and is idempotent", () => {
    const i = bun([path.join(REPO, "hooks/install.mjs"), "--scope", "project", "--project", project]);
    expect(i.code, i.err + i.out).toBe(0);
    const st = bun([path.join(REPO, "hooks/install.mjs"), "--scope", "project", "--project", project, "--status"]);
    expect(st.code, st.out).toBe(0);
    expect(st.out).not.toMatch(/!!/);
    const again = bun([path.join(REPO, "hooks/install.mjs"), "--scope", "project", "--project", project]);
    expect(again.out).toMatch(/already in sync|in sync/);
  });
  test("generated commands run through the Bun entry point, never node", () => {
    for (const f of [".claude/settings.json", ".codex/hooks.json"]) {
      const text = fs.readFileSync(path.join(project, f), "utf8");
      expect(text).toContain(BIN);
      expect(text).not.toMatch(/\bnode\b/);
    }
    for (const e of fs.readdirSync(path.join(project, ".clinerules/hooks"))) expect(fs.readFileSync(path.join(project, ".clinerules/hooks", e), "utf8")).toContain(BIN);
    expect(fs.readFileSync(BIN, "utf8")).toMatch(/exec bun /);
    expect(fs.readFileSync(BIN, "utf8")).not.toMatch(/exec node/);
  });
  test("the installer checks the runtime and reports no problem under the required Bun", () => {
    const r = Bun.spawnSync([process.execPath, "-e", `const m = await import("${path.join(REPO, "hooks/install.mjs")}"); console.log(JSON.stringify([m.MIN_BUN, m.runtimeProblem()]))`], { env });
    expect(JSON.parse(r.stdout.toString())).toEqual(["1.4.0", null]);
  });
});

const claudeCmd = (event: string) => {
  const cfg = JSON.parse(fs.readFileSync(path.join(project, ".claude/settings.json"), "utf8"));
  return cfg.hooks[event][0].hooks[0].command as string;
};
const codexCmd = (event: string) => JSON.parse(fs.readFileSync(path.join(project, ".codex/hooks.json"), "utf8")).hooks[event][0].hooks[0].command as string;
const writeModel = (extra = {}) => JSON.stringify({ hook_event_name: "PreToolUse", cwd: project, tool_name: "Write", tool_input: { file_path: path.join(project, "actualize/product-model.md"), content: "x" }, ...extra });

describe("native client output formats", () => {
  test("Claude Code: PreToolUse denial is the documented hookSpecificOutput", () => {
    const r = sh(claudeCmd("PreToolUse"), writeModel());
    expect(r.code).toBe(0);
    const o = JSON.parse(r.out);
    expect(o.hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", permissionDecision: "deny" });
    expect(o.hookSpecificOutput.permissionDecisionReason).toMatch(/reconcil/i);
  });
  test("Claude Code: status context on prompt, stop gate blocks with exit 2", () => {
    const p = sh(claudeCmd("UserPromptSubmit"), JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd: project, prompt: "continue" }));
    expect(JSON.parse(p.out).hookSpecificOutput.additionalContext).toMatch(/run active/);
    const s = sh(claudeCmd("Stop"), JSON.stringify({ hook_event_name: "Stop", cwd: project }));
    expect(s.code).toBe(2); expect(s.err).toMatch(/lens selection|No lens/i);
  });
  test("Codex: same payload shape, same denial", () => {
    const r = sh(codexCmd("PreToolUse"), writeModel());
    expect(JSON.parse(r.out).hookSpecificOutput.permissionDecision).toBe("deny");
  });
  test("Cline: cancel + errorMessage on a denied tool use, {} when nothing to say", () => {
    const script = path.join(project, ".clinerules/hooks/PreToolUse");
    const payload = JSON.stringify({ hookName: "PreToolUse", workspaceInfo: { rootPath: project }, preToolUse: { toolName: "write_to_file", parameters: { path: "actualize/product-model.md", content: "x" } } });
    const r = sh(`"${script}"`, payload);
    expect(JSON.parse(r.out)).toMatchObject({ cancel: true });
    const quiet = sh(`"${script}"`, JSON.stringify({ workspaceInfo: { rootPath: project }, preToolUse: { toolName: "read_file", parameters: { path: "src/x.js" } } }));
    expect(JSON.parse(quiet.out)).toEqual({});
  });
  test("OpenCode plugin runs in process under Bun and throws to block a tool call", async () => {
    const { ActualizePlugin } = await import(path.join(REPO, "hooks/clients/opencode/actualize.js"));
    const hooks = await ActualizePlugin({ directory: project, client: {} });
    await expect(hooks["tool.execute.before"]({ tool: "write" }, { args: { filePath: path.join(project, "actualize/product-model.md"), content: "x" } })).rejects.toThrow(/reconcil/i);
    await hooks["tool.execute.before"]({ tool: "read" }, { args: { filePath: path.join(project, "src/app.js") } });
  });
  test("Prime/Pi extension registers and blocks the same way", async () => {
    const handlers: Record<string, Function> = {};
    const mod = await import(path.join(REPO, "hooks/clients/prime/actualize.ts"));
    mod.default({ on: (n: string, f: Function) => { handlers[n] = f; } });
    const r = await handlers["tool_call"]({ toolName: "write", input: { path: path.join(project, "actualize/product-model.md"), content: "x" } }, { cwd: project });
    expect(r).toMatchObject({ block: true });
  });
});

describe("protected zones now include the cockpit's files", () => {
  test("the agent cannot write the inbox, the cockpit state, or its tokens directly", () => {
    for (const rel of ["actualize/inbox.jsonl", "actualize/.cockpit/cockpit.db", "actualize/.cockpit/agent.token", "actualize/.cockpit/context.json"]) {
      const r = sh(claudeCmd("PreToolUse"), writeModel({ tool_input: { file_path: path.join(project, rel), content: "{}" } }));
      expect(JSON.parse(r.out).hookSpecificOutput.permissionDecision, rel).toBe("deny");
    }
  });
});

describe("Bun is required, and its absence is clear", () => {
  const noBun = { ...env, PATH: "/usr/bin:/bin" };
  test("a hook fails open with one stderr line so the agent client is never bricked", () => {
    const r = sh(claudeCmd("PreToolUse"), writeModel(), noBun);
    expect(r.code).toBe(0); expect(r.out).toBe(""); expect(r.err).toMatch(/Bun >= 1\.4 is required/);
  });
  test("any other command fails loudly with 127", () => {
    const r = sh(`"${BIN}" status`, "", noBun);
    expect(r.code).toBe(127); expect(r.err).toMatch(/bun\.sh/);
  });
});
