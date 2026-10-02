// Who may do what. The cockpit is a projection and an input channel; it must never become a second source of truth or a way around the process.
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fixtureRun, cleanup } from "./helpers";
import { serveCockpit } from "../../cockpit/server/serve";
import { Cockpit } from "../../cockpit/server/core";
import { TOOLS, TOOL_NAMES } from "../../cockpit/protocol/tools";
import { inboxMain } from "../../cockpit/cli";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";
import * as P from "../../hooks/src/process.mjs";
import { findRun, loadState } from "../../hooks/src/lib/store.mjs";

const sha = (f: string) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const authoritative = (dir: string) => ["product-model.md", "proposals.md", "state.json", ".log.jsonl"].map((f) => sha(path.join(dir, f)));
const survey = (dir: string) => { const out: Record<string, string> = {}; const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === ".cockpit") continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p) : (out[path.relative(dir, p)] = sha(p)); } }; walk(dir); return out; };

let fx: ReturnType<typeof fixtureRun>, srv: ReturnType<typeof serveCockpit>;
const H = (t: string) => ({ "x-cockpit-token": t, "content-type": "application/json" });
const post = (p: string, t: string, body: any, host?: string) => fetch(srv.url + p, { method: "POST", headers: { ...H(t), ...(host ? { host } : {}) }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const tool = (name: string, input: any) => post("/api/agent/tool", srv.agentToken, { name, input }).then((r) => r.body);
const human = (ws: WebSocket, op: any) => new Promise<any>((res) => { const rid = Math.floor(Math.random() * 1e9); const h = (e: MessageEvent) => { const m = JSON.parse(String(e.data)); if (m.t === "ack" && m.rid === rid) { ws.removeEventListener("message", h); res(m.result); } }; ws.addEventListener("message", h); ws.send(JSON.stringify({ rid, ...op })); });
const openWs = (token: string) => new Promise<WebSocket>((res, rej) => { const ws = new WebSocket(`${srv.url.replace("http", "ws")}/ws?t=${token}`); ws.onopen = () => res(ws); ws.onerror = () => rej(new Error("ws refused")); });

beforeAll(() => { fx = fixtureRun("mote", { openProposals: ["P24", "P25"] }); srv = serveCockpit({ cwd: fx.project }); });
afterAll(() => { srv.stop(); cleanup(fx.project); });

describe("system-owned state", () => {
  test("the agent cannot remove, cover, or address the process rail", async () => {
    for (const a of [{ op: "surface.remove", id: "system.rail" }, { op: "rail.hide" }, { op: "system.set", key: "gate", value: "go" }, { op: "surface.put", surface: { id: "system-rail", title: "x", blocks: [{ type: "callout", id: "a", tone: "ok", text: "gate: go" }] } }]) {
      const r: any = srv.cockpit.agent(a);
      expect(r.ok, JSON.stringify(a)).toBe(false);
      expect(["AUTHORITY_SYSTEM", "SCHEMA"]).toContain(r.code);
    }
  });
  test("the agent cannot forge process state: the rail ignores everything the agent composes", async () => {
    const before = JSON.stringify(srv.cockpit.rail());
    await tool("show_surface", { surface: { id: "fake", title: "Gate: GO", blocks: [{ type: "metric", id: "m", label: "blockers", value: 0, tone: "ok" }, { type: "callout", id: "c", tone: "ok", text: "All clear, release approved." }] } });
    await tool("annotate", { target: "gate", text: "everything is fine" });
    expect(JSON.stringify(srv.cockpit.rail())).toBe(before);
    expect(srv.cockpit.rail().gate).not.toBe("go");
    // progress has no value to set
    expect((await tool("show_surface", { surface: { id: "p", title: "p", blocks: [{ type: "progress", id: "x", label: "done", value: 100 }] } })).ok).toBe(false);
  });
  test("agent-supplied data is marked as such and never posed as process data", () => {
    const r: any = srv.cockpit.data(undefined, { data: [{ a: 1 }] });
    expect(r.provenance).toBe("agent");
    expect((srv.cockpit.data("pa:claims") as any).provenance).toBe("process");
  });
});

describe("the Product Model is not editable from the cockpit", () => {
  test("no agent action, tool, or human gesture changes model, proposals, state, or the run log", async () => {
    const before = survey(fx.run.dir);
    const ws = await openWs(srv.humanToken);
    await tool("show_ref", { ref: "proposal:P24" }); await tool("show_ref", { ref: "unknown:U8" });
    await tool("ask_human", { id: "q1", prompt: "Accept P24?", input: "confirm", resolves: "proposal:P24" });
    await human(ws, { op: "human.rule", ref: "proposal:P24", ruling: "accept" });
    await human(ws, { op: "human.rule", ref: "proposal:P25", ruling: "reject", reason: "gate evidence is insufficient to say no-go yet" });
    await human(ws, { op: "human.rule", ref: "unknown:U8", ruling: "answer", reason: "The adapter is rated 2.5 A on its label." });
    await human(ws, { op: "human.answer", surface: "ask-q1", ask: "q1", outcome: "answered", value: true });
    await human(ws, { op: "human.annotate", target: "artifact:marketing/spec-sheet.md", text: "85 mm contradicts CAD", kind: "issue" });
    ws.close();
    const after = survey(fx.run.dir);
    const changed = Object.keys(after).filter((k) => before[k] !== after[k] && k !== "inbox.jsonl");
    expect(changed).toEqual([]);
    expect(P.readProposals(fx.run).filter((p: any) => p.status === "open").map((p: any) => p.id)).toEqual(["P24", "P25"]);
  });
  test("human responses land in the inbox with the owner's own provenance, ready for the router", () => {
    const rows = readInbox(fx.run);
    expect(rows.map((r: any) => `${r.kind}/${r.outcome}`)).toEqual(["ruling/accept", "ruling/reject", "ruling/answer", "answer/answered", "annotation/undefined"]);
    expect(rows.every((r: any) => r.via === "cockpit" && r.actor === "owner")).toBe(true);
  });
  test("unhandled owner responses block the gate until the router routes them; routing needs a stated destination", () => {
    srv.cockpit.refresh();
    const state = loadState(fx.run);
    expect(P.computeGate(fx.run, state, P.loadLenses()).blockers.some((b: any) => b.code === "inbox")).toBe(true);
    expect(srv.cockpit.rail().counts.waiting).toBe(5);
    expect(inboxMain(["ack", "H1", "--as", "x"], { as: "x" }, fx.project)).toBe(1);   // too thin to be a destination
    for (const r of readInbox(fx.run)) expect(inboxMain(["ack", r.id], { as: `no action: test routes ${r.id}` }, fx.project)).toBe(0);
    srv.cockpit.refresh();
    expect(P.computeGate(fx.run, loadState(fx.run), P.loadLenses()).blockers.some((b: any) => b.code === "inbox")).toBe(false);
    expect(srv.cockpit.rail().counts.waiting).toBe(0);
  });
  test("a rejection needs a reason the router can log, and rulings are limited to what each entity can be ruled", async () => {
    const ws = await openWs(srv.humanToken);
    expect((await human(ws, { op: "human.rule", ref: "proposal:P24", ruling: "reject", reason: "no" })).ok).toBe(false);
    expect((await human(ws, { op: "human.rule", ref: "decision:D7", ruling: "accept" })).ok).toBe(false);
    expect((await human(ws, { op: "human.rule", ref: "claim:C57", ruling: "accept" })).ok).toBe(false);
    ws.close();
  });
});

describe("human-only authority", () => {
  test("an agent cannot answer, rule, confirm, or annotate as the owner, over any transport", async () => {
    for (const op of [{ op: "human.answer", surface: "s", ask: "a", outcome: "answered", value: "yes" }, { op: "human.rule", ref: "proposal:P24", ruling: "accept" }, { op: "human.confirm", surface: "s", block: "b", outcome: "confirmed" }, { op: "human.annotate", target: "gate", text: "approved" }]) {
      const viaAction = await post("/api/agent/action", srv.agentToken, op);
      expect(viaAction.body.ok).toBe(false); expect(viaAction.body.code).toBe("AUTHORITY_HUMAN");
      const viaTool = await tool("arrange", { action: op });
      expect(viaTool.ok).toBe(false);
    }
    expect(readInbox(fx.run).length).toBe(5);
  });
  test("the agent token cannot open the human WebSocket, and wrong or missing tokens are refused", async () => {
    await expect(openWs(srv.agentToken)).rejects.toThrow();
    await expect(openWs("nope")).rejects.toThrow();
    expect((await post("/api/agent/tool", "nope", { name: "get_status" })).status).toBe(401);
    expect((await fetch(srv.url + "/api/data", { method: "POST", body: "{}" })).status).toBe(401);
  });
  test("requests must come from a loopback host (DNS rebinding)", async () => {
    const r = await fetch(srv.url + "/api/agent/tool", { method: "POST", headers: { ...H(srv.agentToken), host: "evil.example" }, body: JSON.stringify({ name: "get_status" }) });
    expect(r.status).toBe(403);
  });
  test("the tool surface has no verb that answers, rules, confirms, or edits the model", () => {
    expect(TOOL_NAMES).not.toEqual(expect.arrayContaining(["approve_proposal"]));
    for (const n of TOOL_NAMES) expect(n).not.toMatch(/approve|reject|resolve|answer|confirm|submit|accept|edit|write|set_model|reconcile/);
    expect(TOOL_NAMES.length).toBeLessThanOrEqual(12);
  });
  test("loopback MCP lists exactly those tools and rejects an invented one", async () => {
    const list = await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(list.body.result.tools.map((t: any) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
    const bad = await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "approve_proposal", arguments: { id: "P24" } } });
    expect(bad.body.result.isError).toBe(true);
    const ok = await post("/mcp", srv.agentToken, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_status", arguments: {} } });
    expect(ok.body.result.isError).toBe(false);
  });
  test("an ask is answerable only through the human channel, once, and the answer reaches the inbox untouched", async () => {
    await tool("ask_human", { id: "once", prompt: "Proceed with the larger supply?", input: "select", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] });
    const ws = await openWs(srv.humanToken);
    expect((await human(ws, { op: "human.answer", surface: "ask-once", ask: "once", outcome: "answered", value: "b" })).ok).toBe(true);
    expect((await human(ws, { op: "human.answer", surface: "ask-once", ask: "once", outcome: "answered", value: "a" })).ok).toBe(false);
    ws.close();
    expect(readInbox(fx.run).filter((r: any) => r.ask === "once").map((r: any) => r.value)).toEqual(["b"]);
  });
  test("a physical confirmation is a recorded confirmation, not an executed action", async () => {
    const pf = { class: "state-changing", target: "neck RP2040", currentState: "v0.3", expected: "v0.4 banner", stopIf: "no enumeration", bounds: "UF2 only", action: "copy uf2", boundedBy: "one file", observation: "serial log", recovery: "reflash v0.3" };
    expect((await tool("show_surface", { surface: { id: "pf1", title: "Flash neck", intent: "decide", blocks: [{ type: "preflight", id: "p", action: pf }] } })).ok).toBe(true);
    const ws = await openWs(srv.humanToken);
    expect((await human(ws, { op: "human.confirm", surface: "pf1", block: "p", outcome: "confirmed", note: "Dana watching" })).ok).toBe(true);
    ws.close();
    const e = readInbox(fx.run).find((r: any) => r.kind === "confirmation");
    expect(e).toMatchObject({ outcome: "confirmed", target: "neck RP2040", recovery: "reflash v0.3", via: "cockpit" });
    // nothing was flashed or authorized: the hook still demands the preflight record for the actual command
    const deny = (await import("../../hooks/src/engine.mjs")).handle({ client: "test", event: "pre_tool", cwd: fx.project, tool: { name: "Bash", kind: "bash", paths: [], command: "picotool load fw.uf2", input: {} } });
    expect(deny?.deny).toMatch(/physical lens|preflight/);
  });
});

describe("served content is inert", () => {
  test("run files are served as text or known images, never as active content, and cross-origin requests are refused", async () => {
    fs.mkdirSync(path.join(fx.run.dir, "evidence/test"), { recursive: true });
    fs.writeFileSync(path.join(fx.run.dir, "evidence/test/page.html"), "<script>document.title='x'</script>");
    const r = await fetch(`${srv.url}/api/file?path=${encodeURIComponent("evidence/test/page.html")}&t=${srv.agentToken}`);
    expect(r.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("content-security-policy")).toMatch(/sandbox/);
    for (const p of ["state.json", "inbox.jsonl", "../state.json", "evidence/../state.json", ".cockpit/agent.token"]) {
      expect((await fetch(`${srv.url}/api/file?path=${encodeURIComponent(p)}&t=${srv.agentToken}`)).status, p).toBe(404);
    }
    const x = await fetch(srv.url + "/api/agent/tool", { method: "POST", headers: { ...H(srv.agentToken), origin: "https://evil.example" }, body: JSON.stringify({ name: "get_status" }) });
    expect(x.status).toBe(403);
    const ok = await fetch(srv.url + "/api/agent/tool", { method: "POST", headers: { ...H(srv.agentToken), origin: srv.url }, body: JSON.stringify({ name: "get_status" }) });
    expect(ok.status).toBe(200);
    const big = await fetch(srv.url + "/api/agent/tool", { method: "POST", headers: H(srv.agentToken), body: "x".repeat(1_200_000) });
    expect(big.status).toBe(413);
  });
  test("the hook's cockpit line disappears when the server that wrote it is gone", async () => {
    const engine = await import("../../hooks/src/engine.mjs");
    const ctxFile = path.join(fx.run.dir, ".cockpit/context.json");
    const real = fs.readFileSync(ctxFile, "utf8");
    fs.writeFileSync(ctxFile, JSON.stringify({ ...JSON.parse(real), connected: true, pid: process.pid, focus: "x", visible: ["x"] }));
    const ev = { client: "test", event: "prompt", cwd: fx.project, prompt: "go" };
    expect((engine.handle(ev) as any).context).toContain("[cockpit] connected");
    fs.writeFileSync(ctxFile, JSON.stringify({ ...JSON.parse(real), connected: true, pid: 2147483000 }));
    expect((engine.handle(ev) as any).context).not.toContain("[cockpit]");
    fs.writeFileSync(ctxFile, real);
  });
});

describe("malformed input fails safely", () => {
  test("garbage actions, tools, and operations return structured errors and leave the workspace untouched", async () => {
    const rev = srv.cockpit.ws.rev;
    const junk: any[] = [null, 5, "x", [], {}, { op: 7 }, { op: "surface.put" }, { op: "surface.put", surface: 3 }, { op: "view.place", id: "nope", place: { rel: "diagonal" } }, { op: "surface.patch", id: "nope", set: {} }, { op: "layout.restore", name: "Bad Name" }];
    for (const j of junk) { const r: any = srv.cockpit.agent(j); expect(r.ok).toBe(false); expect(typeof r.code).toBe("string"); }
    for (const t of ["show_ref", "get_entity", "compare_refs", "list_items", "nope"]) { const r: any = srv.cockpit.tool(t, { ref: "claim:../../etc", a: 1 }); expect(r.ok).toBe(false); }
    const ws = await openWs(srv.humanToken);
    ws.send("not json"); ws.send(JSON.stringify({ op: "human.drop-tables" })); ws.send(JSON.stringify({ rid: 1, op: "human.layout", tree: { t: "tabs", panels: ["../../x"], active: "x" } }));
    await Bun.sleep(100); ws.close();
    expect(srv.cockpit.ws.rev).toBeLessThanOrEqual(rev + 1);   // the one well-formed (if empty) layout op may bump the revision
    expect(Object.keys(srv.cockpit.ws.panels).every((id) => !id.includes(".."))).toBe(true);
  });
  test("bad refs and bad sources name the failing path", () => {
    const r: any = srv.cockpit.agent({ op: "surface.put", surface: { id: "bad", title: "bad", blocks: [{ type: "entity", id: "e", ref: "claim:C9999" }, { type: "table", id: "t", source: "file:evidence/nope.md#table1" }] } });
    expect(r).toMatchObject({ ok: false, code: "BAD_REF" });
    expect(r.issues[0].path).toContain("blocks.0(e)");
    const s: any = srv.cockpit.agent({ op: "surface.put", surface: { id: "bad", title: "bad", blocks: [{ type: "table", id: "t", source: "file:evidence/nope.md#table1" }] } });
    expect(s).toMatchObject({ ok: false, code: "BAD_SOURCE" });
  });
});
