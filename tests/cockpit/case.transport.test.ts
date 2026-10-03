// The Case over every transport, with the cockpit open and closed, and the two local-history sources behind it: git (read-only, default on)
// and gh (a prober for the reach ladder, off unless ACTUALIZE_GH=1).
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fixtureRun, cleanup, REPO, calm, addDemand, makeStale, writeRun } from "./helpers";
import { serveCockpit } from "../../cockpit/server/serve";
import { TOOLS, BASE_TOOLS, toolSchemas, activeTools } from "../../cockpit/protocol/tools";
import { probesFor, hostEnv } from "../../cockpit/server/reach";
import * as K from "../../cockpit/server/world";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";

const H = (t: string) => ({ "x-cockpit-token": t, "content-type": "application/json" });
let fx: ReturnType<typeof fixtureRun>, srv: ReturnType<typeof serveCockpit>;
const post = (p: string, t: string, body: any) => fetch(srv.url + p, { method: "POST", headers: H(t), body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const cli = async (args: string[], cwd = fx.project) => { const p = Bun.spawn(["bun", path.join(REPO, "hooks/src/cli.mjs"), ...args], { cwd, stdout: "pipe", stderr: "pipe", env: { ...process.env, ACTUALIZE_DIR: "" } }); const [out, code] = [await new Response(p.stdout).text(), await p.exited]; return { out, code }; };
const git = (dir: string, ...a: string[]) => Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { cwd: dir, stdout: "pipe", stderr: "pipe" });

beforeAll(() => { fx = fixtureRun("loam"); calm(fx); addDemand(fx); makeStale(fx, "marketing/beta-page.md"); srv = serveCockpit({ cwd: fx.project }); });
afterAll(() => { try { srv.stop(); } catch { /* stopped */ } cleanup(fx.project); });

describe("one definition, every transport", () => {
  test("case_get is a base tool, read-only, and offered in every context", () => {
    expect(BASE_TOOLS).toContain("case_get"); expect(toolSchemas(["case_get"])[0].annotations.readOnlyHint).toBe(true);
    for (const mode of ["current", "historical", "candidate"] as const) expect(activeTools({ mode, subjects: [] })).toContain("case_get");
    expect(TOOLS.filter((t) => t.effect === "read" || t.effect === "compose").length).toBe(TOOLS.length);
  });
  test("the cockpit, HTTP, MCP and the CLI answer a Case identically", async () => {
    for (const [input, argv] of [[{}, ["case"]], [{ ref: "OP1" }, ["case", "OP1"]], [{ part: "moves" }, ["case", "moves"]], [{ ref: "OP1", part: "settlement" }, ["case", "settlement", "OP1"]]] as [any, string[]][]) {
      const direct = srv.cockpit.tool("case_get", input) as any;
      const http = (await post("/api/agent/tool", srv.agentToken, { name: "case_get", input })).body;
      const mcp = (await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "case_get", arguments: input } })).body.result;
      const viaCli = await cli(argv);
      expect(direct.ok).toBe(true); expect(JSON.stringify(http)).toBe(JSON.stringify(direct)); expect(JSON.parse(mcp.content[0].text)).toEqual(direct.result); expect(viaCli.code).toBe(0); expect(JSON.parse(viaCli.out)).toEqual(direct.result);
    }
  });
  test("the answer is small: a Case summary fits in one glance, not a dump", () => {
    const r = (srv.cockpit.tool("case_get", {}) as any).result;
    expect(JSON.stringify(r).length).toBeLessThan(3500); expect(Object.keys(r)).toEqual(expect.arrayContaining(["destination", "now", "deviation", "primary", "blocked", "settlement"]));
  });
});

describe("the agent gets the same navigation through typed tools, and no more authority", () => {
  test("the agent can find the Case, the deviation, the move, what blocks, the evidence it needs, and whether settlement is reachable, without reading a pixel", async () => {
    const r = (await post("/api/agent/tool", srv.agentToken, { name: "case_get", input: { ref: "OP1" } })).body.result;
    expect(r.destination.text).toMatch(/dry plant/); expect(r.deviation.text).toMatch(/evidence insufficient/); expect(r.primary.move).toMatch(/Measure S1/); expect(r.primary.evidence).toMatch(/measured importance and satisfaction/);
    expect(r.blocked.map((b: any) => b.id)).toContain("accept"); expect(r.settlement.settlementReachable).toBe(false); expect(r.settlement.shouldSettleNow.call).toBe("owner");
  });
  test("no tool input, and no tool, performs a Case move or speaks as the owner; the run and the inbox stay exactly as they were", async () => {
    const before = JSON.stringify(fs.readdirSync(fx.run.dir)); const prop = fs.readFileSync(fx.run.proposalsPath, "utf8");
    for (const input of [{ ref: "run", show: true }, { ref: "OP1", show: true, view: "decision" }, { part: "moves", show: true }]) expect((await post("/api/agent/tool", srv.agentToken, { name: "case_get", input })).body.ok).toBe(true);
    for (const input of [{ ruling: "accept" }, { do: "settle" }]) expect((await post("/api/agent/tool", srv.agentToken, { name: "case_get", input })).body.ok).toBe(false);
    expect(readInbox(fx.run)).toEqual([]); expect(fs.readFileSync(fx.run.proposalsPath, "utf8")).toBe(prop); expect(JSON.stringify(fs.readdirSync(fx.run.dir))).toBe(before);
  });
  test("a human-only opening of a Case is refused over the agent channel, and allowed (as layout, not authority) for the owner", async () => {
    const op = { op: "human.open", template: "ref", ref: "opportunity:OP1", as: "case" };
    const refused = (await post("/api/agent/action", srv.agentToken, op)).body; expect(refused.ok).toBe(false); expect(refused.code).toBe("AUTHORITY_HUMAN");
    const ws = await new Promise<WebSocket>((res, rej) => { const w = new WebSocket(`${srv.url.replace("http", "ws")}/ws?t=${srv.humanToken}`); w.onopen = () => res(w); w.onerror = () => rej(new Error("ws")); });
    const ack = await new Promise<any>((res) => { ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.t === "ack" && m.rid === 5) res(m.result); }; ws.send(JSON.stringify({ rid: 5, ...op })); });
    expect(ack.ok).toBe(true); expect(Object.keys(srv.cockpit.ws.panels)).toContain("opp-op1"); expect(readInbox(fx.run)).toEqual([]);
    ws.close();
  });
});

describe("the Case is not the cockpit's", () => {
  test("with the cockpit closed the CLI answers the same Case from the files", async () => {
    const open = JSON.stringify((srv.cockpit.tool("case_get", { ref: "OP1" }) as any).result);
    srv.stop();
    const r = await cli(["case", "OP1"]); expect(r.code).toBe(0); expect(JSON.stringify(JSON.parse(r.out))).toBe(open);
    const bad = await cli(["case", "OP99"]); expect(bad.code).not.toBe(0);
    const prior = await cli(["case", "prior", "--q", "soil moisture alerts"]); expect(prior.code).toBe(0); expect(JSON.parse(prior.out).note).toMatch(/nothing is recorded here, not that nothing is known/);
    expect((await cli(["case", "prior"])).code).toBe(2);
  });
});

// ---- local git: a read-only timeline --------------------------------------------------------------------------------------------------------------------
describe("git is a read-only timeline for the run", () => {
  test("a model version whose settlement is missing from the log gets its time from the commit that recorded it, labelled as git", () => {
    const f = fixtureRun("loam"); try {
      git(f.project, "init", "-q"); git(f.project, "add", "-A"); git(f.project, "commit", "-q", "-m", "record the run");
      fs.writeFileSync(f.run.logPath, fs.readFileSync(f.run.logPath, "utf8").split("\n").filter((l) => !l.includes("reconcile_done")).join("\n"));
      const { project } = require("../../cockpit/server/project"); const proj = project(f.project).proj; const W = { proj, runDir: f.run.dir };
      const w = K.why(W, "version:3") as any; const when = w.answers.find((a: any) => a.q === "When did it settle?");
      expect(when.a).toMatch(/\(git [0-9a-f]{7}\)/); expect(when.basis).toBe("recorded");
    } finally { cleanup(f.project); }
  });
  test("without a repository the same question still answers 'not recorded' and nothing is guessed", () => {
    const f = fixtureRun("loam"); try {
      fs.writeFileSync(f.run.logPath, fs.readFileSync(f.run.logPath, "utf8").split("\n").filter((l) => !l.includes("reconcile_done")).join("\n"));
      const { project } = require("../../cockpit/server/project"); const W = { proj: project(f.project).proj, runDir: f.run.dir };
      const w = K.why(W, "version:3") as any; expect(w.answers.find((a: any) => a.q === "When did it settle?").basis).toBe("unavailable");
      const t = K.timeline(W, undefined, { git: true }); expect(t.some((e) => e.type === "git.unavailable")).toBe(true);
    } finally { cleanup(f.project); }
  });
  test("the timeline can interleave commits, and only reads: the repository is exactly as it was", () => {
    const f = fixtureRun("loam"); try {
      git(f.project, "init", "-q"); git(f.project, "add", "-A"); git(f.project, "commit", "-q", "-m", "first"); writeRun(f, "evidence/notes.md", "n\n"); git(f.project, "add", "-A"); git(f.project, "commit", "-q", "-m", "second");
      const head = git(f.project, "rev-parse", "HEAD").stdout.toString(), status = git(f.project, "status", "--porcelain").stdout.toString();
      const { project } = require("../../cockpit/server/project"); const W = { proj: project(f.project).proj, runDir: f.run.dir };
      const t = K.timeline(W, undefined, { git: true }); expect(t.filter((e) => e.type === "git.commit").map((e) => e.detail.split(": ")[1]).join()).toBe("first,second");
      expect(git(f.project, "rev-parse", "HEAD").stdout.toString()).toBe(head); expect(git(f.project, "status", "--porcelain").stdout.toString()).toBe(status);
    } finally { cleanup(f.project); }
  });
});

// ---- gh: opt-in only --------------------------------------------------------------------------------------------------------------------------------------
describe("gh is an opt-in prober: nothing runs unless ACTUALIZE_GH=1", () => {
  const which = (b: string) => (b === "gh" ? "/usr/bin/gh" : null);
  test("by default no probe runs, however the environment looks", () => {
    let ran = 0; const run = () => { ran++; return { code: 0 }; };
    expect(probesFor({}, which, run)).toEqual({}); expect(probesFor({ ACTUALIZE_GH: "0" }, which, run)).toEqual({}); expect(probesFor({ ACTUALIZE_GH: "true" }, which, run)).toEqual({}); expect(ran).toBe(0);
    expect(hostEnv({}, run).probes).toEqual({}); expect(ran).toBe(0);
  });
  test("opted in, a signed-in gh climbs the ladder; a failing one records authorization as refused; a missing gh records nothing", () => {
    const now = () => "2026-10-02T00:00:00.000Z";
    expect(probesFor({ ACTUALIZE_GH: "1" }, which, () => ({ code: 0 }), now)).toEqual({ gh: { at: now(), reachable: true, authorized: true } });
    expect(probesFor({ ACTUALIZE_GH: "1" }, which, () => ({ code: 1 }), now).gh.authorized).toBe(false);
    expect(probesFor({ ACTUALIZE_GH: "1" }, () => null, () => ({ code: 0 }))).toEqual({}); expect(probesFor({ ACTUALIZE_GH: "1" }, which, () => ({ code: null }))).toEqual({});
  });
  test("the probe appears on the reach ladder as probed, and still never makes the answer an action", () => {
    const base = { which, env: { GH_TOKEN: "x" }, exists: () => false, platform: "linux" };
    const off = K.worldReach({ proj: srvProj(), runDir: fx.run.dir }, { need: "github.search" }, { ...base, probes: {} }) as any;
    const on = K.worldReach({ proj: srvProj(), runDir: fx.run.dir }, { need: "github.search" }, { ...base, probes: probesFor({ ACTUALIZE_GH: "1" }, which, () => ({ code: 0 })) }) as any;
    expect(off.providers.find((p: any) => p.id === "gh").state.probed).toBe("unknown"); expect(on.providers.find((p: any) => p.id === "gh").state.probed).toBe("yes");
    expect(on.providers.find((p: any) => p.id === "gh").status).toBe("usable");
  });
});
function srvProj() { return srv.cockpit.worldEnv().proj; }
