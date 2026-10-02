// Live behaviour: events from the real engine reach the cockpit as they happen, the run never depends on the cockpit,
// and everything the cockpit keeps can be lost and rebuilt.
import { describe, test, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { sandbox, ctx, addProposals, resolveProposals, walk, CHOSEN, EXCLUDE } from "../hooks/helpers.mjs";
import { serveCockpit } from "../../cockpit/server/serve";
import { Cockpit } from "../../cockpit/server/core";
import { fixtureRun, cleanup } from "./helpers";
import { loadState } from "../../hooks/src/lib/store.mjs";

const sleep = (ms: number) => Bun.sleep(ms);
async function until(fn: () => boolean, ms = 4000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(25); } return fn(); }
const connect = (srv: ReturnType<typeof serveCockpit>) => new Promise<{ ws: WebSocket; msgs: any[] }>((res) => { const msgs: any[] = []; const ws = new WebSocket(`${srv.url.replace("http", "ws")}/ws?t=${srv.humanToken}`); ws.onmessage = (e) => msgs.push(JSON.parse(String(e.data))); ws.onopen = () => res({ ws, msgs }); });
const types = (msgs: any[]) => msgs.filter((m) => m.t === "events").flatMap((m) => m.events.map((e: any) => e.type));

describe("the cockpit follows a real run", () => {
  const project = sandbox(); const c = ctx(project);
  const srv = serveCockpit({ cwd: project });
  test("with no run yet the cockpit starts empty and the rail says so", async () => {
    expect(srv.cockpit.rail()).toMatchObject({ hasRun: false });
  });
  test("engine steps appear as events and rail updates without polling", async () => {
    const { ws, msgs } = await connect(srv);
    await until(() => msgs.some((m) => m.t === "snapshot"));
    c.cmd.begin({ goal: "closed-beta signup page, text only", bar: "beta" });
    expect(await until(() => types(msgs).includes("run.started"))).toBe(true);
    c.cmd.select({ chosen: CHOSEN, exclude: EXCLUDE });
    c.cmd.lensStart("recon-software"); c.cmd.lensStart("recon-physical");
    expect(await until(() => ["lenses.selected", "lens.started"].every((t) => types(msgs).includes(t)))).toBe(true);
    const rail = [...msgs].reverse().find((m) => m.t === "rail")!.rail;
    expect(rail.lenses.sort()).toEqual(["recon-physical", "recon-software"]);
    expect(rail.phase).toBe("lens");
    // a proposal row appears -> proposal.added; finishing the lens -> lens.finished
    c.put("actualize/evidence/recon-software/trace.md", walk("evidence/recon-software/trace.md"));
    addProposals(c, ["P1", "P2"]);
    expect(await until(() => types(msgs).includes("proposal.added"))).toBe(true);
    c.put("actualize/evidence/recon-physical/inventory.md", walk("evidence/recon-physical/inventory.md"));
    c.cmd.lensDone("recon-software"); c.cmd.lensDone("recon-physical");
    expect(await until(() => types(msgs).filter((t) => t === "lens.finished").length === 2)).toBe(true);
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v1.md")); resolveProposals(c);
    c.cmd.reconDone();
    expect(await until(() => types(msgs).includes("model.updated"))).toBe(true);
    expect(await until(() => [...msgs].reverse().find((m) => m.t === "rail")?.rail.version === 1)).toBe(true);
    const order = types(msgs); expect(order.indexOf("run.started")).toBeLessThan(order.indexOf("lens.started")); expect(order.indexOf("lens.finished")).toBeLessThan(order.indexOf("model.updated"));
    ws.close();
  });
  test("the run trace is nested activity built from the event log", () => {
    const t: any = srv.cockpit.data("pa:trace");
    const flat: string[] = []; const walkT = (n: any, d = 0) => { flat.push("  ".repeat(d) + n.label); n.children.forEach((k: any) => walkT(k, d + 1)); }; t.nodes.forEach((n: any) => walkT(n));
    expect(flat.join("\n")).toMatch(/selected/); expect(flat.join("\n")).toMatch(/lenses: recon-software, recon-physical|lenses: recon-physical, recon-software/); expect(flat.join("\n")).toMatch(/reconcile → model@1/);
  });
  test("a closed cockpit does not halt the run: the process keeps advancing and the cockpit catches up on return", async () => {
    srv.stop();   // browser and server gone
    c.cmd.lensStart("brand"); c.cmd.lensStart("provenance-licensing");
    expect(loadState(c.get().run).activeLenses).toHaveProperty("brand");
    const status = Bun.spawnSync([process.execPath, path.resolve(import.meta.dir, "../../hooks/src/cli.mjs"), "status", "--json"], { cwd: project });
    expect(JSON.parse(status.stdout.toString()).activeLenses.sort()).toEqual(["brand", "provenance-licensing"]);
    const again = serveCockpit({ cwd: project });
    const { ws, msgs } = await connect(again);
    await until(() => msgs.some((m) => m.t === "snapshot"));
    expect(msgs[0].rail.lenses.sort()).toEqual(["brand", "provenance-licensing"]);
    expect(msgs[0].events.map((e: any) => e.type)).toContain("lens.started");
    ws.close(); again.stop();
  });
});

describe("reconnect and rebuild", () => {
  test("a reconnecting browser gets the workspace back exactly, including the owner's layout choices", async () => {
    const fx = fixtureRun("mote"); const srv = serveCockpit({ cwd: fx.project });
    srv.cockpit.tool("show_ref", { ref: "claim:C57" });
    srv.cockpit.tool("show_ref", { ref: "unknown:U8", beside: "ref-claim-c57" });
    const a = await connect(srv); await until(() => a.msgs.length > 0);
    a.ws.send(JSON.stringify({ rid: 1, op: "human.pin", id: "ref-claim-c57", pinned: true }));
    await until(() => a.msgs.some((m) => m.t === "ack"));
    a.ws.close();
    const b = await connect(srv); await until(() => b.msgs.length > 0);
    const snap = b.msgs[0];
    expect(Object.keys(snap.ws.panels).sort()).toEqual(["ref-claim-c57", "ref-unknown-u8"]);
    expect(snap.ws.panels["ref-claim-c57"].pinned).toBe(true);
    expect(snap.ws.tree.t).toBe("split");
    b.ws.close(); srv.stop();
    // a full server restart restores from SQLite
    const again = new Cockpit(fx.project);
    expect(Object.keys(again.ws.panels).sort()).toEqual(["ref-claim-c57", "ref-unknown-u8"]);
    again.close(); cleanup(fx.project);
  });
  test("deleting the SQLite file loses only preferences; the projection rebuilds from the run and authoritative files are untouched", async () => {
    const fx = fixtureRun("mote", { stale: true }); let c = new Cockpit(fx.project);
    const before = { rail: c.rail(), claims: (c.data("pa:claims") as any).total, stale: (c.data("pa:artifacts?stale=1") as any).total, search: c.search("servo").length };
    const files = ["product-model.md", "proposals.md", "state.json", ".log.jsonl"].map((f) => fs.readFileSync(path.join(fx.run.dir, f), "utf8"));
    c.close();
    for (const f of fs.readdirSync(path.join(fx.run.dir, ".cockpit"))) if (f.startsWith("cockpit.db")) fs.unlinkSync(path.join(fx.run.dir, ".cockpit", f));
    c = new Cockpit(fx.project);
    expect(c.rail().counts).toEqual(before.rail.counts);
    expect((c.data("pa:claims") as any).total).toBe(before.claims);
    expect((c.data("pa:artifacts?stale=1") as any).total).toBe(before.stale);
    expect(c.search("servo").length).toBe(before.search);
    expect(["product-model.md", "proposals.md", "state.json", ".log.jsonl"].map((f) => fs.readFileSync(path.join(fx.run.dir, f), "utf8"))).toEqual(files);
    const r = c.rebuild();
    expect(r.events.filter((e) => e.type === "lens.finished").length).toBeGreaterThan(5);
    c.close(); cleanup(fx.project);
  });
  test("owner responses survive deleting the database because they live in the run, not in SQLite", async () => {
    const fx = fixtureRun("mote"); let c = new Cockpit(fx.project);
    c.human({ op: "human.annotate", target: "artifact:marketing/spec-sheet.md", text: "85 mm vs 92.4 mm", kind: "issue" });
    c.close(); for (const f of fs.readdirSync(path.join(fx.run.dir, ".cockpit"))) if (f.startsWith("cockpit.db")) fs.unlinkSync(path.join(fx.run.dir, ".cockpit", f));
    c = new Cockpit(fx.project);
    expect((c.data("pa:responses") as any).rows.map((r: any) => r.note)).toEqual(["85 mm vs 92.4 mm"]);
    c.close(); cleanup(fx.project);
  });
});

describe("workspace precedence", () => {
  const mk = () => { const fx = fixtureRun("mote"); return { fx, c: new Cockpit(fx.project) }; };
  const put = (c: Cockpit, id: string, place?: any) => c.agent({ op: "surface.put", surface: { id, title: id, blocks: [{ type: "callout", id: "c", tone: "note", text: id }] }, place });
  test("the agent opens beside the owner's work without moving it, and replacing content keeps the position", () => {
    const { fx, c } = mk();
    put(c, "a"); put(c, "b", { rel: "right", to: "a" });
    c.human({ op: "human.layout", tree: c.ws.tree, moved: ["a"] });
    expect(c.ws.panels.a.placedBy).toBe("human");
    const before = JSON.stringify(c.ws.tree);
    const r: any = put(c, "a", { rel: "below", to: "b" });
    expect(r.ok).toBe(true); expect(r.warnings.join()).toMatch(/PLACEMENT_IGNORED/);
    expect(JSON.stringify(c.ws.tree)).toBe(before);
    const mv: any = c.agent({ op: "view.place", id: "a", place: { rel: "below", to: "b" } });
    expect(mv).toMatchObject({ ok: false, code: "AUTHORITY_LAYOUT" });
    c.close(); cleanup(fx.project);
  });
  test("pinned surfaces survive removal, reset, and eviction; reset is restorable", () => {
    const { fx, c } = mk();
    put(c, "keep"); c.human({ op: "human.pin", id: "keep", pinned: true });
    expect(c.agent({ op: "surface.remove", id: "keep" })).toMatchObject({ ok: false, code: "AUTHORITY_PINNED" });
    put(c, "x"); put(c, "y");
    expect(c.agent({ op: "layout.reset" })).toMatchObject({ ok: true });
    expect(Object.keys(c.ws.panels)).toEqual(["keep"]);
    expect(c.agent({ op: "layout.restore", name: "previous" })).toMatchObject({ ok: true });
    expect(Object.keys(c.ws.panels).sort()).toEqual(["keep", "x", "y"]);
    c.close(); cleanup(fx.project);
  });
  test("a ninth surface evicts the least recent unpinned one, but never one that is waiting on an answer", () => {
    const { fx, c } = mk();
    c.tool("ask_human", { id: "wait", prompt: "Need your call on the supply?", input: "confirm" });
    for (let i = 0; i < 9; i++) put(c, `s${i}`);
    expect(Object.keys(c.ws.panels).length).toBe(8);
    expect(c.ws.panels["ask-wait"]).toBeDefined();
    expect(c.ws.panels.s0).toBeUndefined();
    c.close(); cleanup(fx.project);
  });
  test("layout restore returns a saved arrangement, minimize/maximize round-trip", () => {
    const { fx, c } = mk();
    put(c, "a"); put(c, "b", { rel: "right", to: "a" });
    c.agent({ op: "layout.save", name: "inspect" });
    c.agent({ op: "view.size", id: "b", state: "minimized" });
    expect(c.ws.panels.b.minimized).toBe(true);
    expect(JSON.stringify(c.ws.tree)).not.toContain('"b"');
    c.agent({ op: "layout.restore", name: "inspect" });
    expect(c.ws.panels.b.minimized).toBe(false);
    expect(c.ws.tree).toMatchObject({ t: "split" });
    c.close(); cleanup(fx.project);
  });
  test("the agent-visible context is compact and says what the owner sees, selects, and has been asked", () => {
    const { fx, c } = mk();
    c.tool("show_ref", { ref: "claim:C57" }); c.tool("ask_human", { id: "q", prompt: "Which supply?", input: "text" });
    c.human({ op: "human.select", surface: "ref-claim-c57", block: "e", ref: "claim:C57" });
    const ctxo: any = c.context();
    expect(ctxo.visible.map((v: any) => v.id).sort()).toEqual(["ask-q", "ref-claim-c57"]);
    expect(ctxo.asking).toEqual([expect.objectContaining({ ask: "q", prompt: "Which supply?" })]);
    expect(JSON.stringify(ctxo).length).toBeLessThan(1500);
    const file = JSON.parse(fs.readFileSync(path.join(fx.run.dir, ".cockpit/context.json"), "utf8"));
    expect(file.asking[0].prompt).toBe("Which supply?");
    c.close(); cleanup(fx.project);
  });
});
