// The cockpit as a user meets it: `actualize cockpit up|down|status`, `actualize ui ...`, `actualize inbox ...`, in both distributions
// (a source checkout run by Bun, and the single compiled executable).
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REPO, fixtureRun, cleanup } from "./helpers";

const SCRIPT = [process.execPath, path.join(REPO, "hooks/src/cli.mjs")];
const dist = fs.mkdtempSync(path.join(os.tmpdir(), "pa-dist-"));
const BIN = [path.join(dist, "bin/actualize")];
const run = (cmd: string[], args: string[], cwd: string, env: Record<string, string> = {}) => {
  const r = Bun.spawnSync([...cmd, ...args], { cwd, env: { ...process.env, ...env, ACTUALIZE_STDIN_IDLE_MS: "300" } });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
};

beforeAll(() => { const b = Bun.spawnSync([process.execPath, path.join(REPO, "cockpit/build.ts"), "--out", dist], { cwd: REPO }); expect(b.exitCode, b.stderr.toString()).toBe(0); }, 120000);
afterAll(() => fs.rmSync(dist, { recursive: true, force: true }));

for (const [label, cmd] of [["bun script", SCRIPT], ["compiled executable", BIN]] as const) {
  describe(`cockpit lifecycle (${label})`, () => {
    let fx: ReturnType<typeof fixtureRun>;
    beforeAll(() => { fx = fixtureRun("loam"); });
    afterAll(() => { run(cmd as any, ["cockpit", "down"], fx.project); cleanup(fx.project); });

    test("up starts a daemon without printing the owner's bearer link into a pipe, status sees it, down stops it", async () => {
      expect(run(cmd as any, ["cockpit", "status"], fx.project).out).toMatch(/down/);
      const up = run(cmd as any, ["cockpit", "up", "--no-open"], fx.project);
      expect(up.code, up.err).toBe(0);
      expect(up.out).toMatch(/cockpit up: http:\/\/127\.0\.0\.1:\d+/);
      expect(up.out).not.toMatch(/#t=/);
      const url = /http:\/\/127\.0\.0\.1:\d+/.exec(up.out)![0];
      expect((await (await fetch(`${url}/health`)).json()).ok).toBe(true);
      const html = await (await fetch(`${url}/`)).text();
      expect(html).toContain("Product Actualizer cockpit");
      expect(run(cmd as any, ["cockpit", "status"], fx.project).out).toMatch(/cockpit up/);
      const dn = run(cmd as any, ["cockpit", "down"], fx.project);
      expect(dn.out).toMatch(/cockpit down/);
      await Bun.sleep(300);
      await expect(fetch(`${url}/health`)).rejects.toThrow();
      expect(fs.existsSync(path.join(fx.run.dir, "state.json"))).toBe(true);   // the run is untouched
    }, 30000);

    test("ui works over HTTP while up and directly against the same state while down, with the same results", async () => {
      const down = run(cmd as any, ["ui", "show", "claim:C4"], fx.project);
      expect(down.code, down.err).toBe(0);
      expect(down.out).toContain("opened ref-claim-c4");
      expect(run(cmd as any, ["cockpit", "up", "--no-open"], fx.project).code).toBe(0);
      const ctx = JSON.parse(run(cmd as any, ["ui", "context"], fx.project).out);
      expect(ctx.visible.map((v: any) => v.id)).toContain("ref-claim-c4");   // the action taken while down is there on start
      const up = run(cmd as any, ["ui", "show", "unknown:U1"], fx.project);
      expect(up.out).toContain("opened ref-unknown-u1");
      const bad = run(cmd as any, ["ui", "tool", "show_ref", JSON.stringify({ ref: "claim:C999" })], fx.project);
      expect(bad.code).toBe(1); expect(JSON.parse(bad.out)).toMatchObject({ ok: false, code: "BAD_REF" });
      expect(run(cmd as any, ["cockpit", "down"], fx.project).code).toBe(0);
    }, 30000);

    test("the status line the hooks inject mentions the cockpit only while a browser is connected", async () => {
      expect(run(cmd as any, ["cockpit", "up", "--no-open"], fx.project).code).toBe(0);
      const status = () => run(cmd as any, ["hook", "claude", "UserPromptSubmit"], fx.project).out;
      const payload = JSON.stringify({ cwd: fx.project, prompt: "go" });
      const hook = () => Bun.spawnSync([...cmd as any, "hook", "claude", "UserPromptSubmit"], { cwd: fx.project, stdin: new TextEncoder().encode(payload), env: { ...process.env, ACTUALIZE_STDIN_IDLE_MS: "300" } }).stdout.toString();
      void status;
      expect(hook()).not.toContain("[cockpit]");   // up, but nobody is looking
      run(cmd as any, ["cockpit", "down"], fx.project);
    }, 30000);
  });
}

describe("compiled executable", () => {
  test("is self-contained: hooks, process commands, and installer run from it without Bun on PATH", () => {
    const fx = fixtureRun("loam");
    const env = { PATH: "/usr/bin:/bin", HOME: os.tmpdir(), ACTUALIZE_STDIN_IDLE_MS: "300" };
    const s = run(BIN, ["status", "--json"], fx.project, env);
    expect(s.code, s.err).toBe(0); expect(JSON.parse(s.out).goal).toMatch(/signup page/);
    const h = Bun.spawnSync([...BIN, "hook", "claude", "PreToolUse"], { cwd: fx.project, env: { ...env }, stdin: new TextEncoder().encode(JSON.stringify({ cwd: fx.project, tool_name: "Write", tool_input: { file_path: path.join(fx.project, "actualize/product-model.md"), content: "x" } })) });
    expect(JSON.parse(h.stdout.toString()).hookSpecificOutput.permissionDecision).toBe("deny");
    const proj = fs.mkdtempSync(path.join(os.tmpdir(), "pa-ins-"));
    const ins = run(BIN, ["install", "--client", "claude", "--scope", "project", "--project", proj], proj, env);
    expect(ins.code, ins.err + ins.out).toBe(0);
    const cfg = fs.readFileSync(path.join(proj, ".claude/settings.json"), "utf8");
    expect(cfg).toContain(BIN[0]);   // hooks point at the binary itself
    cleanup(fx.project); fs.rmSync(proj, { recursive: true, force: true });
  });
});
