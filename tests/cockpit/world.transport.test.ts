// The same world questions over every transport, under every role, with the cockpit open, closed, and rebuilt.
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fixtureRun, cleanup, REPO } from "./helpers";
import { serveCockpit } from "../../cockpit/server/serve";
import { Cockpit } from "../../cockpit/server/core";
import { TOOLS, TOOL_NAMES, WORLD_TOOLS, toolSchemas } from "../../cockpit/protocol/tools";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";

const survey = (dir: string) => { const out: Record<string, string> = {}; const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === ".cockpit") continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } }; walk(dir); return out; };
const H = (t: string) => ({ "x-cockpit-token": t, "content-type": "application/json" });
let fx: ReturnType<typeof fixtureRun>, srv: ReturnType<typeof serveCockpit>;
const post = (p: string, t: string, body: any) => fetch(srv.url + p, { method: "POST", headers: H(t), body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const cli = async (args: string[]) => {
  const p = Bun.spawn(["bun", path.join(REPO, "hooks/src/cli.mjs"), ...args], { cwd: fx.project, stdout: "pipe", stderr: "pipe", env: { ...process.env, ACTUALIZE_DIR: "" } });
  const [out, code] = [await new Response(p.stdout).text(), await p.exited]; return { out, code };
};
const CALLS: [string, any, string[]][] = [
  ["world_why", { ref: "claim:C31" }, ["world", "why", "claim:C31"]],
  ["world_impact", { ref: "decision:D7" }, ["world", "impact", "decision:D7"]],
  ["world_diff", { a: "2", b: "current" }, ["world", "diff", "2"]],
  ["world_timeline", { ref: "claim:C31" }, ["world", "timeline", "claim:C31"]],
  ["world_counterfactual", { candidate: "proposal:P12" }, ["world", "counterfactual", "proposal:P12"]],
  ["world_reach", { ref: "claim:C31" }, ["world", "reach", "claim:C31"]],
];
const same = (v: any) => JSON.stringify(v);

beforeAll(() => { fx = fixtureRun("mote", { stale: true, openProposals: ["P12"] }); srv = serveCockpit({ cwd: fx.project }); });
afterAll(() => { try { srv.stop(); } catch { /* already stopped */ } cleanup(fx.project); });

describe("one definition, every transport", () => {
  test("the page's catalogue, the MCP list, and the CLI list are the same definitions", async () => {
    const boot = await post("/api/boot", srv.agentToken, {});
    expect(same(boot.body.tools)).toBe(same(toolSchemas()));
    expect(boot.body.tools.map((t: any) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
    const mcp = await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    for (const t of mcp.body.result.tools) expect(same(t)).toBe(same(toolSchemas([t.name])[0]));
    const listed = (await cli(["ui", "tools", "--all"])).out.trim().split("\n");
    expect(listed.sort()).toEqual([...TOOL_NAMES].sort());
  });
  test("annotations follow WebMCP's: reads are read-only, and tools that return run text are marked untrusted", () => {
    const by = Object.fromEntries(toolSchemas().map((t) => [t.name, t.annotations]));
    for (const t of WORLD_TOOLS) expect(by[t.name].readOnlyHint, t.name).toBe(true);
    expect(by.show_surface.readOnlyHint).toBe(false);
    for (const n of ["world_why", "get_entity", "list_items", "read_responses"]) expect(by[n].untrustedContentHint, n).toBe(true);
    expect(by.get_status.untrustedContentHint).toBe(false);
  });
  test("a question gets the same answer from the cockpit, HTTP, MCP and the CLI", async () => {
    for (const [name, input, argv] of CALLS) {
      const direct = srv.cockpit.tool(name, input) as any;
      const http = (await post("/api/agent/tool", srv.agentToken, { name, input })).body;
      const mcp = (await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: input } })).body.result;
      const viaCli = await cli(argv);
      expect(direct.ok, name).toBe(true);
      expect(same(http), name).toBe(same(direct));
      expect(JSON.parse(mcp.content[0].text), name).toEqual(direct.result);
      expect(viaCli.code, name).toBe(0); expect(JSON.parse(viaCli.out), name).toEqual(direct.result);
    }
  });
});

describe("shared perception is not shared authority", () => {
  test("the agent token reads and composes the debugger, and none of it reaches the inbox, the rail, or the run", async () => {
    const before = survey(fx.run.dir), rail = same(srv.cockpit.rail());
    for (const [name, input] of CALLS) expect((await post("/api/agent/tool", srv.agentToken, { name, input: { ...input, ...(WORLD_TOOLS.find((t) => t.name === name) ? { show: true } : {}) } })).body.ok, name).toBe(true);
    expect(survey(fx.run.dir)).toEqual(before); expect(same(srv.cockpit.rail())).toBe(rail);
    expect(readInbox(fx.run)).toEqual([]);
  });
  test("a human-only operation sent as the agent, directly or through arrange, is refused and changes nothing", async () => {
    const rev = srv.cockpit.ws.rev;
    for (const op of [{ op: "human.open", template: "ref", ref: "claim:C31", as: "why" }, { op: "human.rule", ref: "proposal:P12", ruling: "accept" }, { op: "human.answer", surface: "s", ask: "a", outcome: "answered", value: "x" }, { op: "human.layout", tree: null }]) {
      const direct = (await post("/api/agent/action", srv.agentToken, op)).body; expect(direct.ok, op.op).toBe(false); expect(direct.code, op.op).toBe("AUTHORITY_HUMAN");
      const arranged = (await post("/api/agent/tool", srv.agentToken, { name: "arrange", input: { action: op } })).body; expect(arranged.ok, op.op).toBe(false);
    }
    expect(srv.cockpit.ws.rev).toBe(rev); expect(readInbox(fx.run)).toEqual([]);
  });
  test("a world tool cannot be made to carry a ruling: no input shape reaches the inbox", async () => {
    for (const input of [{ ref: "proposal:P12", ruling: "accept" }, { candidate: "proposal:P12", accept: true, apply: true }, { candidate: "proposal:P12", show: true, settle: true }]) {
      const r = (await post("/api/agent/tool", srv.agentToken, { name: "world_counterfactual", input })).body; expect(r.ok).toBe(false); expect(r.code).toBe("SCHEMA");
    }
    expect(readInbox(fx.run)).toEqual([]);
    expect(fs.readFileSync(fx.run.proposalsPath, "utf8")).toMatch(/\| P12 \|.*\| open \|/);
  });
  test("the owner opening a debugger view is layout, not authority: it appears in the workspace and writes no inbox entry", async () => {
    const ws = await new Promise<WebSocket>((res, rej) => { const w = new WebSocket(`${srv.url.replace("http", "ws")}/ws?t=${srv.humanToken}`); w.onopen = () => res(w); w.onerror = () => rej(new Error("ws")); });
    const ack = await new Promise<any>((res) => { ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.t === "ack" && m.rid === 7) res(m.result); }; ws.send(JSON.stringify({ rid: 7, op: "human.open", template: "ref", ref: "decision:D7", as: "impact" })); });
    expect(ack.ok).toBe(true); expect(srv.cockpit.ws.panels["w-impact-decision-d7"]).toBeTruthy();
    expect(readInbox(fx.run)).toEqual([]);
    const v: any = await new Promise((res) => { ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.t === "ack" && m.rid === 8) res(m.result); }; ws.send(JSON.stringify({ rid: 8, op: "human.open", template: "ref", ref: "version:3", as: "diff" })); });
    expect(v.ok).toBe(true); expect(srv.cockpit.ws.panels["w-diff-3-current"]).toBeTruthy();
    ws.close();
  });
  test("history and candidates do not become the current world: the rail and the process stay on the settled model", async () => {
    await post("/api/agent/tool", srv.agentToken, { name: "world_diff", input: { a: "1", b: "2", show: true } });
    await post("/api/agent/tool", srv.agentToken, { name: "world_counterfactual", input: { candidate: "proposal:P12", show: true } });
    expect(srv.cockpit.rail().version).toBe(6);
    expect(srv.cockpit.rail().gate).toBe(fx.gate.blockers.length ? "blocked" : "ready");
    expect((srv.cockpit.context() as any).world.mode).toBe("candidate");   // the viewport moved; the process did not
  });
});

describe("the router is told what the owner is looking at, compactly", () => {
  test("the hook line says when the owner is viewing history or a candidate, and that the run is unchanged", async () => {
    const engine = await import("../../hooks/src/engine.mjs");
    srv.cockpit.clients = 1;
    try {
      srv.cockpit.agent({ op: "layout.reset" });
      srv.cockpit.agent({ op: "surface.put", surface: { id: "then", title: "Then", blocks: [{ type: "table", id: "t", source: "pa:claims?at=2" }] } });
      const line = ((engine.handle({ client: "test", event: "prompt", cwd: fx.project, prompt: "go" }) as any).context as string).split("\n").find((l) => l.startsWith("[cockpit]"))!;
      expect(line).toContain("viewing historical model@2"); expect(line).toContain("the run is unchanged"); expect(line.length).toBeLessThan(260);
      srv.cockpit.agent({ op: "layout.reset" });
      const back = ((engine.handle({ client: "test", event: "prompt", cwd: fx.project, prompt: "go" }) as any).context as string).split("\n").find((l) => l.startsWith("[cockpit]"));
      expect(back ?? "").not.toContain("viewing");
    } finally { srv.cockpit.clients = 0; srv.cockpit.writeContext(); }
  });
});

describe("the cockpit is not the source of truth", () => {
  test("the same questions are answered with the cockpit closed", async () => {
    const open = CALLS.map(([n, i]) => same((srv.cockpit.tool(n, i) as any).result));
    srv.stop();
    for (const [i, [name, , argv]] of CALLS.entries()) { const r = await cli(argv); expect(r.code, name).toBe(0); expect(same(JSON.parse(r.out)), name).toBe(open[i]); }
  });
  test("deleting the SQLite projection and rebuilding changes no answer and loses only preferences", () => {
    const k = new Cockpit(fx.project);
    const answers = () => CALLS.map(([n, i]) => same((k.tool(n, i) as any).result));
    const before = answers(), files = survey(fx.run.dir);
    k.close();
    for (const f of ["cockpit.db", "cockpit.db-wal", "cockpit.db-shm"]) fs.rmSync(path.join(fx.run.dir, ".cockpit", f), { force: true });
    const k2 = new Cockpit(fx.project);
    try {
      expect(CALLS.map(([n, i]) => same((k2.tool(n, i) as any).result))).toEqual(before);
      expect(survey(fx.run.dir)).toEqual(files);
      expect(Object.keys(k2.ws.panels)).toEqual([]);   // surfaces and layout were preferences
      k2.rebuild(); expect(CALLS.map(([n, i]) => same((k2.tool(n, i) as any).result))).toEqual(before);
    } finally { k2.close(); }
  });
});
