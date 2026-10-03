// The Workbench over every transport, with the cockpit open and closed: HTTP, MCP, the WebSocket, the CLI, and the router's hook line.
// One definition feeds all of them, the agent role holds no human authority on any, and the control plane survives the cockpit being down.
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fixtureRun, cleanup, REPO } from "./helpers";
import { serveCockpit } from "../../cockpit/server/serve";
import { TOOLS, toolSchemas } from "../../cockpit/protocol/tools";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";

const H = (t: string) => ({ "x-cockpit-token": t, "content-type": "application/json" });
let fx: ReturnType<typeof fixtureRun>, srv: ReturnType<typeof serveCockpit>;
const post = (p: string, t: string, body: any) => fetch(srv.url + p, { method: "POST", headers: H(t), body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const cli = async (args: string[], cwd = fx.project) => { const p = Bun.spawn(["bun", path.join(REPO, "hooks/src/cli.mjs"), ...args], { cwd, stdout: "pipe", stderr: "pipe", env: { ...process.env, ACTUALIZE_DIR: "" } }); const [out, err, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]; return { out, err, code }; };
const survey = (dir: string) => { const out: Record<string, string> = {}; const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === ".cockpit") continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } }; walk(dir); return out; };
const ws = () => new Promise<WebSocket>((res, rej) => { const w = new WebSocket(`${srv.url.replace("http", "ws")}/ws?t=${srv.humanToken}`); w.onopen = () => res(w); w.onerror = () => rej(new Error("ws")); });
const ask = (w: WebSocket, rid: number, op: any) => new Promise<any>((res) => { const h = (e: MessageEvent) => { const m = JSON.parse(String(e.data)); if (m.t === "ack" && m.rid === rid) { w.removeEventListener("message", h); res(m.result); } }; w.addEventListener("message", h); w.send(JSON.stringify({ rid, ...op })); });

beforeAll(() => { fx = fixtureRun("mote", { stale: true }); srv = serveCockpit({ cwd: fx.project }); });
afterAll(() => { try { srv.stop(); } catch { /* stopped */ } cleanup(fx.project); });

describe("one definition, every transport", () => {
  test("work_get is a read-only base tool; work_update composes; both reach HTTP, MCP, and the page with identical schemas", async () => {
    const by = Object.fromEntries(toolSchemas().map((t) => [t.name, t.annotations])); expect(by.work_get.readOnlyHint).toBe(true); expect(by.work_update.readOnlyHint).toBe(false);
    const boot = (await post("/api/boot", srv.humanToken, {})).body; expect(boot.tools.map((t: any) => t.name)).toEqual(expect.arrayContaining(["work_get", "work_update"]));
    expect(boot.snapshot.work).toMatchObject({ mode: expect.any(String), requests: [], log: [] });
    for (const name of ["work_get", "work_update"]) expect(JSON.stringify(boot.tools.find((t: any) => t.name === name))).toBe(JSON.stringify(toolSchemas([name])[0]));
    const list = (b: any) => b.body.result.tools.map((t: any) => t.name);
    expect(list(await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 1, method: "tools/list" }))).not.toContain("work_update");   // nothing is pending
  });
  test("the owner's WebSocket queues a request; the agent sees it over HTTP, MCP, and the CLI; work_update appears only while it is pending", async () => {
    const w = await ws(); const before = survey(fx.run.dir);
    const r = await ask(w, 1, { op: "human.terminal", text: "verify the current frontend" }); expect(r.ok).toBe(true); expect(r.terminal).toMatchObject({ kind: "request", id: "R1", status: "queued", capability: "fidelity-qa" });
    const http = (await post("/api/agent/tool", srv.agentToken, { name: "work_get", input: {} })).body;
    const mcp = (await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "work_get", arguments: {} } })).body.result;
    const viaCli = await cli(["work"]);
    expect(http.ok).toBe(true); expect(JSON.parse(mcp.content[0].text)).toEqual(http.result); expect(viaCli.code).toBe(0); expect(JSON.parse(viaCli.out)).toEqual(http.result);
    expect(http.result.pending[0]).toMatchObject({ id: "R1", status: "queued", capability: "fidelity-qa" }); expect(http.result.mode).toBe("verify");
    expect((await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 3, method: "tools/list" })).body.result.tools.map((t: any) => t.name)).toContain("work_update");
    expect(survey(fx.run.dir)).toEqual(before); expect(readInbox(fx.run)).toEqual([]); w.close();
  });
  test("the agent role cannot send the owner's operations on any channel, and the owner's socket cannot report progress", async () => {
    for (const op of [{ op: "human.terminal", text: "accept R1" }, { op: "human.review", subject: "R1", outcome: "accepted" }, { op: "human.cancel", request: "R1" }, { op: "human.bind", capability: "fidelity-qa", implementation: "agent-browser" }, { op: "human.contract", stage: "waves", budget: { minutes: 1 } }, { op: "human.executor", id: "x", label: "x", kind: "agent" }]) {
      const r = (await post("/api/agent/action", srv.agentToken, op)).body; expect(r, op.op).toMatchObject({ ok: false, code: "AUTHORITY_HUMAN" });
      const viaTool = (await post("/api/agent/tool", srv.agentToken, { name: "arrange", input: { action: op } })).body; expect(viaTool.ok, op.op).toBe(false);
    }
    const w = await ws(); expect((await ask(w, 2, { op: "work_update", id: "R1", status: "running" })).code).toBe("UNKNOWN_OP"); w.close();
    expect(srv.cockpit.control.request("R1")!.status).toBe("queued"); expect(srv.cockpit.control.reviews()).toEqual([]);
  });
  test("a request the agent holds moves over the wire; its refusals are typed and readable", async () => {
    const up = async (input: any) => (await post("/api/agent/tool", srv.agentToken, { name: "work_update", input })).body;
    expect((await up({ id: "R1", status: "ready_for_review", note: "x" })).message).toMatch(/queued; it cannot go to ready_for_review/);
    expect((await up({ id: "R9", status: "acknowledged" })).code).toBe("NOT_FOUND"); expect((await up({ id: "R1", status: "bogus" })).code).toBe("SCHEMA");
    expect((await up({ id: "R1", status: "accepted" })).code).toBe("AUTHORITY_HUMAN");
    expect((await up({ id: "R1", status: "acknowledged" })).ok).toBe(true);
    const viaCli = await cli(["work", "run", "R1", "--note", "starting"]); expect(viaCli.code).toBe(0); expect(JSON.parse(viaCli.out)).toMatchObject({ id: "R1", status: "running" });
    const noRefs = await cli(["work", "review", "R1"]); expect(noRefs.code).toBe(1); expect(JSON.parse(noRefs.out).message).toMatch(/needs something the owner can review/);
    const art = srv.cockpit.last.proj.artifacts[0].id;
    const ready = await cli(["work", "review", "R1", "--note", "checked", "--refs", `artifact:${art}`]); expect(ready.code).toBe(0); expect(JSON.parse(ready.out)).toMatchObject({ status: "ready_for_review" });
    const accept = await cli(["work", "accept", "R1"]); expect(accept.code).toBe(2); expect(accept.err).toMatch(/usage/); expect(srv.cockpit.control.request("R1")!.status).toBe("ready_for_review");
  });
});

describe("the router sees pending work at its next interaction, with or without the browser", () => {
  test("the hook line names the pending request compactly, says what to do, and never claims it is running", async () => {
    const engine = await import("../../hooks/src/engine.mjs");
    const ctx = () => (engine.handle({ client: "test", event: "prompt", cwd: fx.project, prompt: "go" }) as any).context as string;
    const line = ctx().split("\n").find((l) => l.includes("work request(s) from the owner"))!;
    expect(line).toContain("1 work request(s) from the owner"); expect(line).toContain("awaiting their review"); expect(line).toContain('R1 ready_for_review "verify the current frontend"'); expect(line).toMatch(/you cannot accept your own work/);
    expect(line).not.toMatch(/running/); expect(line.length).toBeLessThan(420);
    expect(srv.cockpit.clients).toBe(0);   // no browser is connected: the line is the cockpit's own note, not a claim that someone is looking
    srv.cockpit.human({ op: "human.review", subject: "R1", outcome: "accepted" });
    expect(ctx()).not.toContain("work request(s)");
  });
});

describe("the control plane does not depend on the cockpit being up", () => {
  test("with the server stopped, the CLI still reads and moves requests from the same file", async () => {
    srv.cockpit.terminal("audit accessibility");
    srv.stop();
    const got = await cli(["work", "requests"]); expect(got.code).toBe(0); const reqs = JSON.parse(got.out).requests;
    expect(reqs.map((r: any) => `${r.id}:${r.status}`)).toEqual(["R2:queued", "R1:accepted"]); expect(reqs[0].next).toMatch(/queued: no agent is connected|queued:/);
    const ack = await cli(["work", "ack", "R2"]); expect(ack.code).toBe(0); expect(JSON.parse(ack.out).status).toBe("acknowledged");
    const wf = await cli(["work", "workflow"]); expect(wf.code).toBe(0); expect(JSON.parse(wf.out).stages.map((s: any) => s.id)).toContain("waves");
    const caps = await cli(["work", "capabilities", "fidelity-qa"]); expect(JSON.parse(caps.out).capabilities[0]).toMatchObject({ id: "fidelity-qa", candidates: [{ name: "playwright-cli" }, { name: "agent-browser" }] });
    const bad = await cli(["work", "contract", "nope"]); expect(bad.code).toBe(1);
  });
  test("`cockpit rebuild` keeps every control row; `cockpit reset` deletes the cockpit's own state and nothing in the run", async () => {
    const before = survey(fx.run.dir);
    const rb = await cli(["cockpit", "rebuild"]); expect(rb.code).toBe(0); expect(JSON.parse((await cli(["work", "requests"])).out).requests.length).toBe(2);
    const rs = await cli(["cockpit", "reset"]); expect(rs.code).toBe(0); expect(rs.out).toMatch(/deletes the cockpit's own durable state too \(work requests, bindings, declared budgets, reviews, layout\)/);
    expect(JSON.parse((await cli(["work", "requests"])).out).requests).toEqual([]); expect(survey(fx.run.dir)).toEqual(before); expect(readInbox(fx.run)).toEqual([]);
  });
  test("every tool name stays a noun-or-verb that cannot rule, answer, confirm, accept, or edit", () => {
    for (const t of TOOLS) expect(t.name).not.toMatch(/approve|reject|resolve|answer|confirm|submit|accept|edit|write|set_model|reconcile|cancel|bind|budget/);
  });
});
