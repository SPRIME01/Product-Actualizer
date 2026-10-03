// The capability-native Workbench: the two storage classes, the workflow projection, the capability catalogue (capability, implementation, executor),
// the deterministic screens, the Work Terminal, and the authority rules. Each group is one invariant from the design, run against real fixture runs.
// The run directory stays authoritative throughout: every test that changes control state also proves the run files did not move.
import { describe, test, expect, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fixtureRun, cleanup, patchState, calm } from "./helpers";
import { Cockpit } from "../../cockpit/server/core";
import { openDb, SCHEMA_VERSION, entities, searchEntities, getUi, setUi } from "../../cockpit/server/db";
import { Control } from "../../cockpit/server/control";
import { workflowOf, workflowGraph } from "../../cockpit/server/workflows";
import { catalogue, findImpl, type AvailEnv } from "../../cockpit/server/capabilities";
import { interpret } from "../../cockpit/server/terminal";
import { ledgerOf, workRows } from "../../cockpit/server/workSources";
import { modeOf, workflowSurface, capabilitiesSurface, contractSurface, requestsSurface, reviewSurface } from "../../cockpit/server/screens";
import { SurfaceSchema, BLOCK_TYPES } from "../../cockpit/protocol/spec";
import { TRANSITIONS, legalNext, REQUEST_STATUSES } from "../../cockpit/protocol/work";
import { TOOLS, BASE_TOOLS, activeTools } from "../../cockpit/protocol/tools";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";

const made: { project: string; k?: Cockpit }[] = [];
const open = (fx: { project: string }) => { const k = new Cockpit(fx.project); made.push({ project: fx.project, k }); return k; };
afterEach(() => { for (const m of made.splice(0)) { try { m.k?.close(); } catch { /* closed */ } cleanup(m.project); } });
const survey = (dir: string) => { const out: Record<string, string> = {}; const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === ".cockpit") continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } }; walk(dir); return out; };
const term = (k: Cockpit, text: string) => k.human({ op: "human.terminal", text }) as any;
const none: AvailEnv = { which: () => null, exists: () => false, home: "/nonexistent-home", project: "/nonexistent-project" };
const hostless = { which: () => null, env: {}, exists: () => false, platform: "linux", probes: {} };

// ---- storage: two classes in one file ---------------------------------------------------------------------------------------------------
describe("storage has two classes: a disposable projection and durable cockpit state", () => {
  const v1 = (file: string) => {
    const db = new Database(file, { create: true, strict: true });
    db.run("CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)"); db.run("CREATE TABLE entities (kind TEXT NOT NULL, id TEXT NOT NULL, ord INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (kind, id))");
    db.run("CREATE VIRTUAL TABLE search USING fts5(kind UNINDEXED, id UNINDEXED, text, tokenize = 'porter unicode61')");
    db.run("CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, channel TEXT NOT NULL, type TEXT NOT NULL, subject TEXT, run TEXT, data TEXT NOT NULL DEFAULT '{}')"); db.run("CREATE INDEX events_type ON events (type)");
    db.run("CREATE TABLE ui_state (k TEXT PRIMARY KEY, v TEXT NOT NULL)"); db.run("CREATE TABLE interactions (seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, actor TEXT NOT NULL, op TEXT NOT NULL, data TEXT NOT NULL)");
    db.run("PRAGMA user_version = 1");
    db.query("INSERT INTO ui_state (k, v) VALUES ('ws', ?)").run(JSON.stringify({ rev: 7, marker: "kept" }));
    db.query("INSERT INTO interactions (ts, actor, op, data) VALUES ('t', 'human', 'human.pin', '{}')").run();
    db.query("INSERT INTO events (ts, channel, type, data) VALUES ('t', 'cockpit', 'surface.put', '{}')").run();
    return db;
  };
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "pa-db-"));
  test("a v1 file migrates to the control schema and keeps the owner's layout, interactions, and cockpit events", () => {
    const dir = tmp(); const f = path.join(dir, "c.db"); v1(f).close();
    const db = openDb(f);
    expect((db.query("PRAGMA user_version").get() as any).user_version).toBe(SCHEMA_VERSION); expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
    expect(getUi<any>(db, "ws")).toEqual({ rev: 7, marker: "kept" });
    expect((db.query("SELECT COUNT(*) n FROM interactions").get() as any).n).toBe(1); expect((db.query("SELECT COUNT(*) n FROM events WHERE channel = 'cockpit'").get() as any).n).toBe(1);
    const tables = (db.query("SELECT name FROM sqlite_master WHERE type = 'table'").all() as any[]).map((r) => r.name);
    expect(tables.filter((t) => t.startsWith("control_")).sort()).toEqual(["control_bindings", "control_contracts", "control_executors", "control_requests", "control_reviews"]);
    db.close(); fs.rmSync(dir, { recursive: true, force: true });
  });
  test("a fresh file and a migrated file end with the same tables, and reopening changes nothing", () => {
    const a = tmp(), b = tmp(); v1(path.join(b, "c.db")).close();
    const x = openDb(path.join(a, "c.db")), y = openDb(path.join(b, "c.db"));
    const names = (d: Database) => (d.query("SELECT name FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'search_%' ORDER BY name").all() as any[]).map((r) => r.name);
    expect(names(x)).toEqual(names(y)); x.close(); y.close();
    const z = openDb(path.join(a, "c.db")); expect((z.query("PRAGMA user_version").get() as any).user_version).toBe(SCHEMA_VERSION); z.close();
    for (const d of [a, b]) fs.rmSync(d, { recursive: true, force: true });
  });
  test("a migration that fails rolls back whole: the file stays at its old version with its data", () => {
    const dir = tmp(); const f = path.join(dir, "c.db"); const db = v1(f); db.run("CREATE TABLE control_requests (collides TEXT)"); db.close();
    expect(() => openDb(f)).toThrow();
    const after = new Database(f, { strict: true }); expect((after.query("PRAGMA user_version").get() as any).user_version).toBe(1);
    expect(getUi<any>(after, "ws")?.marker).toBe("kept"); expect((after.query("SELECT name FROM sqlite_master WHERE name = 'control_bindings'").get())).toBeNull(); after.close(); fs.rmSync(dir, { recursive: true, force: true });
  });
  test("rebuild regenerates the projection from the run and leaves every control row, the layout, and the terminal log alone", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx);
    term(k, "verify the current frontend"); term(k, "show the workflow");
    k.control.bind("fidelity-qa", { implementation: "agent-browser", executor: "owner" }, "owner"); k.control.setContract("waves", { budget: { minutes: 30 }, invariants: ["no new dependencies"] });
    k.control.review({ subjectType: "artifact", subjectId: "electronics/electrical-review.md", status: "accepted", reviewer: "owner" });
    const control = () => ({ req: k.db.query("SELECT * FROM control_requests").all(), bind: k.db.query("SELECT * FROM control_bindings").all(), con: k.db.query("SELECT * FROM control_contracts").all(), rev: k.db.query("SELECT * FROM control_reviews").all(), log: getUi(k.db, "terminal"), ws: k.db.query("SELECT v FROM ui_state WHERE k = 'ws'").get() });
    const before = JSON.stringify(control());
    k.db.run("DELETE FROM entities"); k.db.run("DELETE FROM search"); k.db.run("DELETE FROM events WHERE channel = 'process'");
    expect(entities(k.db, "claim").length).toBe(0);
    k.rebuild();
    expect(entities(k.db, "claim").length).toBeGreaterThan(0); expect(searchEntities(k.db, "power").length).toBeGreaterThan(0);
    expect((k.db.query("SELECT COUNT(*) n FROM events WHERE channel = 'process'").get() as any).n).toBeGreaterThan(0);
    expect(JSON.stringify(control())).toBe(before);
  });
  test("deleting the file loses only cockpit state: the workflow, the capabilities, and the Case are the same, and the run files never moved", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const runBefore = survey(fx.run.dir);
    term(k, "verify the current frontend"); k.control.bind("fidelity-qa", { implementation: "agent-browser" }, "owner");
    const flow = JSON.stringify(workflowOf(k.last.proj)); const caseJson = JSON.stringify(k.tool("case_get", {}));
    expect(survey(fx.run.dir)).toEqual(runBefore);
    k.close(); for (const s of ["", "-wal", "-shm"]) fs.rmSync(path.join(fx.run.dir, ".cockpit", `cockpit.db${s}`), { force: true });
    const fresh = new Cockpit(fx.project); made.push({ project: fx.project, k: fresh });
    expect(JSON.stringify(workflowOf(fresh.last.proj))).toBe(flow); expect(JSON.stringify(fresh.tool("case_get", {}))).toBe(caseJson);
    expect(fresh.control.requests().length).toBe(0); expect(survey(fx.run.dir)).toEqual(runBefore);
  });
  test("the hooks and the process engine never touch the control plane", () => {
    const root = path.resolve(import.meta.dir, "../../hooks");
    const files = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(d, e.name)) : /\.(mjs|js|ts)$/.test(e.name) ? [path.join(d, e.name)] : []));
    for (const f of files(root)) { const t = fs.readFileSync(f, "utf8"); expect(t, f).not.toMatch(/bun:sqlite|control_requests|control_bindings|cockpit\.db/); }
  });
});

// ---- the workflow ------------------------------------------------------------------------------------------------------------------------
describe("the workflow is the real process, projected", () => {
  test("it has the nine stages in order, and a settled-looking Loam run is at the owner's call, not done", () => {
    const k = open(fixtureRun("loam")); const w = workflowOf(k.last.proj);
    expect(w.stages.map((s) => s.id)).toEqual(["classify", "model", "select", "waves", "reconcile", "rebuild", "readiness", "review", "settle"]);
    expect(w.current).toBe("settle"); const settle = w.stages.find((s) => s.id === "settle")!;
    expect(settle.status).toBe("ready"); expect(settle.why).toMatch(/yours to weigh/); expect(w.stages.filter((s) => s.id !== "settle").every((s) => s.status === "done")).toBe(true);
  });
  test("its statuses are a function of the run: open proposals and stale artifacts need attention, a running lens is current, no selection is classify", () => {
    const fx = fixtureRun("mote", { stale: true, openProposals: ["P12"] }); const k = open(fx);
    const by = (kk: Cockpit) => Object.fromEntries(workflowOf(kk.last.proj).stages.map((s) => [s.id, s.status]));
    expect(by(k)).toMatchObject({ waves: "done", reconcile: "attention", rebuild: "attention", settle: "pending" }); expect(workflowOf(k.last.proj).current).toBe("reconcile");
    patchState(fx, (s) => { s.activeLenses = { electronics: { startedAt: new Date().toISOString() } }; }); k.refresh();
    expect(by(k).waves).toBe("current"); expect(workflowOf(k.last.proj).current).toBe("waves"); expect(by(k).review).toBe("pending");
    patchState(fx, (s) => { s.activeLenses = {}; s.selection = null; }); k.refresh();
    expect(by(k)).toMatchObject({ classify: "current", select: "pending", waves: "pending" }); expect(workflowOf(k.last.proj).current).toBe("classify");
    expect(JSON.stringify(workflowOf(k.last.proj))).toBe(JSON.stringify(workflowOf(k.last.proj)));
  });
  test("inside the waves the graph is the real lens `needs` graph, and reconcile feeds back into it", () => {
    const k = open(fixtureRun("mote")); const p = k.last.proj; const g = workflowGraph(p); const sel = new Set([...p.selection!.lenses, ...p.selection!.satisfied]);
    const want = new Set<string>(); for (const l of p.lenses.filter((x) => sel.has(x.name))) for (const d of l.needs.filter((n: string) => sel.has(n))) want.add(`l:${d}>l:${l.name}`);
    const got = new Set(g.edges.filter((e: any) => e.label === "needs").map((e: any) => `${e.from}>${e.to}`));
    expect(got).toEqual(want); expect(got.has("l:recon-physical>l:electronics")).toBe(true); expect(got.has("l:electronics>l:embedded-systems")).toBe(true);
    expect(g.edges.some((e: any) => e.from === "s:reconcile" && e.to === "s:waves")).toBe(true);
    expect(g.nodes.filter((n: any) => n.kind === "lens").every((n: any) => n.ref?.startsWith("lens:"))).toBe(true);
  });
});

// ---- capabilities ------------------------------------------------------------------------------------------------------------------------
describe("capability, implementation, and executor stay three layers", () => {
  const cat = (k: Cockpit, avail: AvailEnv = none, bindings = {}) => catalogue(k.last.proj, bindings as any, k.control.executors(), avail, hostless as any);
  test("every lens becomes a capability: needs and reads from its frontmatter, executes_with as implementation candidates", () => {
    const k = open(fixtureRun("mote")); const caps = cat(k);
    expect(caps.map((c) => c.id).sort()).toEqual(k.last.proj.lenses.map((l: any) => l.name).sort());
    for (const l of k.last.proj.lenses) { const c = caps.find((x) => x.id === l.name)!; expect(c.needs).toEqual(l.needs); expect(c.reads).toEqual(l.reads); expect(c.implementations.map((i) => i.name)).toEqual(l.executesWith); expect(c.purpose).toBe(l.description); }
    const qa = caps.find((c) => c.id === "fidelity-qa")!; expect(qa.title).toBe("Visual Fidelity QA"); expect(qa.implementations.map((i) => i.name)).toEqual(["playwright-cli", "agent-browser"]);
    expect(caps.find((c) => c.id === "experience")!.needs).toEqual(["brand"]);
    expect(caps.filter((c) => c.category === "uncategorized").map((c) => c.id)).toEqual([]);   // a new lens must be given a title and category
  });
  test("unknown availability is not reported as usable, and with nothing found the lens procedure is the honest default", () => {
    const k = open(fixtureRun("mote")); const qa = cat(k).find((c) => c.id === "fidelity-qa")!;
    expect(qa.implementations.every((i) => i.found === "unknown")).toBe(true); expect(qa.binding.implementation).toBeNull(); expect(qa.binding.basis).toBe("none found; the lens procedure itself");
    expect(JSON.stringify(qa)).not.toMatch(/usable/);
    const seen = cat(k, { ...none, which: (b) => (b === "playwright-cli" ? "/usr/bin/playwright-cli" : null) }).find((c) => c.id === "fidelity-qa")!;
    expect(seen.implementations.map((i) => i.found)).toEqual(["found", "unknown"]); expect(seen.binding).toMatchObject({ implementation: "playwright-cli", basis: "default: first one found" });
    expect(findImpl("hallmark", { ...none, exists: (p) => p === "/h/.agents/skills/hallmark/SKILL.md", home: "/h" }).state).toBe("found");
    expect(findImpl("../../etc/passwd", none).state).toBe("unknown");
  });
  test("the owner's choice wins, a non-candidate is ignored, and the executor defaults to the current agent", () => {
    const k = open(fixtureRun("mote")); const c = new Control(k.db);
    c.bind("fidelity-qa", { implementation: "agent-browser" }, "owner"); let qa = cat(k, none, c.bindings()).find((x) => x.id === "fidelity-qa")!;
    expect(qa.binding).toMatchObject({ implementation: "agent-browser", basis: "chosen by the owner", executor: "current-agent", executorBasis: "default", executorLabel: "Current agent or tool" });
    c.bind("fidelity-qa", { implementation: "not-a-candidate", executor: "owner" }, "owner"); qa = cat(k, none, c.bindings()).find((x) => x.id === "fidelity-qa")!;
    expect(qa.binding.implementation).toBeNull(); expect(qa.binding).toMatchObject({ executor: "owner", executorBasis: "chosen by the owner" });
  });
  test("Reach is a separate idea: observation capabilities are not implementation names, and nothing is usable without a probe", () => {
    const k = open(fixtureRun("mote")); const qa = cat(k).find((c) => c.id === "fidelity-qa")!;
    expect(qa.observes.map((o) => o.capability)).toEqual(["browser.inspect"]); expect(qa.implementations.map((i) => i.name)).not.toContain("browser.inspect");
    expect(qa.observes[0].status).toBe("blocked");
    const withChrome = catalogue(k.last.proj, {}, k.control.executors(), none, { ...hostless, which: (b: string) => (b === "chromium" ? "/usr/bin/chromium" : null) } as any).find((c) => c.id === "fidelity-qa")!;
    expect(withChrome.observes[0].status).toBe("unproven");
  });
  test("two bound implementations that claim the same authority are surfaced as a conflict on both capabilities, and not otherwise", () => {
    const k = open(fixtureRun("mote")); const p = structuredClone(k.last.proj); p.selection!.lenses = [...p.selection!.lenses, "experience", "direction"];
    const b = { experience: { capability: "experience", implementation: "impeccable", executor: null, setBy: "owner", updatedAt: "" }, direction: { capability: "direction", implementation: "hallmark", executor: null, setBy: "owner", updatedAt: "" } };
    const caps = catalogue(p, b, k.control.executors(), none, hostless as any);
    expect(caps.find((c) => c.id === "experience")!.warnings[0]).toMatch(/impeccable and hallmark \(direction\) both claim the design system/); expect(caps.find((c) => c.id === "direction")!.warnings.length).toBe(1);
    const same = catalogue(p, { ...b, direction: { ...b.direction, implementation: "impeccable" } }, k.control.executors(), none, hostless as any);
    expect(same.every((c) => c.warnings.length === 0)).toBe(true);
    expect(cat(k).every((c) => c.warnings.length === 0)).toBe(true);
  });
  test("the same rows reach the screen: capabilities, the three layers, and the contract are `work:` sources", () => {
    const k = open(fixtureRun("mote")); k.env.avail = none;
    const caps: any = k.data("work:capabilities?scope=all"); expect(caps.kind).toBe("rows"); expect(caps.rows.find((r: any) => r.id === "fidelity-qa")).toMatchObject({ capability: "Visual Fidelity QA", implementation: "the lens procedure itself", found: "n/a", _ref: "lens:fidelity-qa" });
    const layers: any = k.data("work:layers?capability=fidelity-qa"); expect(layers.rows.map((r: any) => r.layer)).toEqual(expect.arrayContaining(["Capability", "Implementation", "Alternative", "Executor", "Observation (Reach)"]));
    expect(layers.rows.filter((r: any) => r.layer === "Alternative").map((r: any) => `${r.name}:${r.state}`)).toEqual(["playwright-cli:unknown", "agent-browser:unknown"]);
    const contract: any = k.data("work:contract?stage=current"); expect(contract.rows.map((r: any) => r.field)).toEqual(["Context", "Goal", "Skills", "Authority", "Executors", "Budget", "Invariants", "Acceptance"]);
    expect(k.data("work:layers?capability=nope").kind).toBe("error"); expect(k.data("work:contract?stage=nope").kind).toBe("error");
  });
});

// ---- the task contract ------------------------------------------------------------------------------------------------------------------
describe("the task contract is derived, honest about unknowns, and layered with what the owner declared", () => {
  test("budget shows declared limits and observed facts only; model cost is not invented", () => {
    const k = open(fixtureRun("mote")); const budget = (k.data("work:contract?stage=waves") as any).rows.find((r: any) => r.field === "Budget");
    expect(budget.value).toMatch(/declared: none; observed: \d+ lens run\(s\), \d+ min in the log\. Model cost is not recorded\./); expect(budget.value).not.toMatch(/\$/);
    k.human({ op: "human.contract", stage: "waves", budget: { minutes: 45, lensRuns: 12 }, invariants: ["protected tests cannot change"] });
    const rows = (k.data("work:contract?stage=waves") as any).rows;
    expect(rows.find((r: any) => r.field === "Budget")).toMatchObject({ basis: "declared" }); expect(rows.find((r: any) => r.field === "Budget").value).toMatch(/declared: 45 min, 12 lens runs/);
    expect(rows.find((r: any) => r.field === "Invariants")).toMatchObject({ basis: "declared" }); expect(rows.find((r: any) => r.field === "Invariants").value).toMatch(/protected tests cannot change/);
    expect(rows.find((r: any) => r.field === "Invariants").value).toMatch(/Public copy may cite only OBSERVED or VERIFIED/);
    const noRun = (k.data("work:contract?stage=select") as any).rows.find((r: any) => r.field === "Skills"); expect(noRun.value).toMatch(/none/);
  });
  test("an agent cannot set a budget or an invariant: the control operation is the owner's", () => {
    const k = open(fixtureRun("mote")); const r: any = k.agent({ op: "human.contract", stage: "waves", budget: { minutes: 1 } }); expect(r.ok).toBe(false); expect(r.code).toBe("AUTHORITY_HUMAN");
    expect(k.control.contract("waves")).toBeNull();
    expect(k.human({ op: "human.contract", stage: "nope", budget: { minutes: 1 } }).ok).toBe(false);
  });
});

// ---- screens -----------------------------------------------------------------------------------------------------------------------------
describe("the Workbench picks its view from meaningful state, and composes only the existing blocks", () => {
  const mode = (k: Cockpit) => k.screen().mode;
  test("the five modes are selected by fixture state, deterministically", () => {
    const orient = fixtureRun("loam"); patchState(orient, (s) => { s.selection = null; }); expect(mode(open(orient))).toBe("orient");
    const exec = fixtureRun("loam"); patchState(exec, (s) => { s.activeLenses = { marketing: { startedAt: new Date().toISOString() } }; }); expect(mode(open(exec))).toBe("execute");
    const dec = fixtureRun("mote", { stale: true, openProposals: ["P12"] }); expect(mode(open(dec))).toBe("decide");
    const ver = fixtureRun("mote", { stale: true }); const kv = open(ver); expect(mode(kv)).toBe("verify");
    const done = open(fixtureRun("loam")); expect(mode(done)).toBe("complete"); calm({ run: done.run });
    for (const k of [kv, done]) expect(JSON.stringify(k.screen())).toBe(JSON.stringify(k.screen()));
  });
  test("a paused run, an open question, or a blocked request is DECIDE; a running request is EXECUTE; work ready for review is VERIFY", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx);
    k.agent({ op: "surface.put", surface: { id: "q", title: "Q", intent: "decide", blocks: [{ type: "ask", id: "a", prompt: "Which?", input: "select", options: [{ value: "x", label: "X" }, { value: "y", label: "Y" }] }] } });
    expect(k.screen()).toMatchObject({ mode: "decide" }); expect(k.screen().why).toMatch(/1 question waits for your answer/); k.agent({ op: "surface.remove", id: "q" });
    const r = term(k, "verify the current frontend").terminal; k.tool("work_update", { id: r.id, status: "acknowledged" }); k.tool("work_update", { id: r.id, status: "running" });
    expect(k.screen()).toMatchObject({ mode: "execute" }); expect(k.screen().why).toBe(`${r.id} is running`);
    k.tool("work_update", { id: r.id, status: "ready_for_review", note: "checked the journey" }); expect(k.screen()).toMatchObject({ mode: "verify" }); expect(k.screen().why).toMatch(/ready for your review/);
    k.tool("work_update", { id: r.id, status: "running" }); k.tool("work_update", { id: r.id, status: "blocked", note: "needs a decision" }); expect(k.screen().mode).toBe("decide");
    patchState(fx, (s) => { s.paused = { reason: "which launch date?" }; }); k.refresh(); const p = k.screen(); expect(p.mode).toBe("decide"); expect(p.why).toMatch(/paused for you: which launch date/);
  });
  test("every mode is a valid surface of the fifteen existing blocks, and every ref and source in it resolves", () => {
    expect(BLOCK_TYPES.length).toBe(15);
    const cases: [string, (fx: any) => void][] = [["loam", (fx) => patchState(fx, (s) => { s.selection = null; })], ["loam", (fx) => patchState(fx, (s) => { s.activeLenses = { marketing: { startedAt: new Date().toISOString() } }; })], ["mote", () => {}], ["loam", () => {}]];
    const seen = new Set<string>();
    for (const [name, prep] of cases) {
      const fx = fixtureRun(name as any, name === "mote" ? { stale: true } : {}); prep(fx); const k = open(fx); const sc = k.screen(); seen.add(sc.mode);
      const parsed = SurfaceSchema.safeParse(sc.surface); expect(parsed.success, `${sc.mode} ${parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))}`).toBe(true); expect(sc.surface.blocks.length).toBeLessThanOrEqual(6);
      for (const b of sc.surface.blocks) expect(BLOCK_TYPES as readonly string[]).toContain(b.type);
      const put = k.agent({ op: "surface.put", surface: sc.surface }); expect(put.ok, `${sc.mode}: ${JSON.stringify(put)}`).toBe(true);
      for (const b of sc.surface.blocks as any[]) if (b.source && b.type !== "progress") { const r: any = k.data(b.source, { as: b.type === "tree" ? "tree" : undefined }); expect(r.kind, `${sc.mode}/${b.id} ${b.source}`).not.toBe("error"); }
    }
    expect([...seen].sort()).toEqual(["complete", "execute", "orient", "verify"]);
    for (const s of [workflowSurface(), capabilitiesSurface(), capabilitiesSurface("fidelity-qa"), contractSurface(), requestsSurface(), reviewSurface()]) { const r = SurfaceSchema.safeParse(s); expect(r.success, `${s.id} ${r.success ? "" : JSON.stringify(r.error.issues.slice(0, 2))}`).toBe(true); }
  });
  test("opening the Workbench is the owner's act; once open its content follows the work and the owner's layout is never moved", () => {
    const fx = fixtureRun("loam"); const k = open(fx);
    k.refresh(); expect(Object.keys(k.ws.panels)).toEqual([]);   // nothing opens by itself
    expect(k.human({ op: "human.open", template: "workbench" }).ok).toBe(true); expect(k.ws.panels.workbench.spec.summary).toMatch(/^COMPLETE:/);
    k.human({ op: "human.open", template: "claims" });
    k.human({ op: "human.layout", tree: { t: "split", dir: "row", kids: [{ t: "tabs", panels: ["claims"], active: "claims" }, { t: "tabs", panels: ["workbench"], active: "workbench" }], w: [0.3, 0.7] }, moved: ["workbench", "claims"] });
    k.human({ op: "human.pin", id: "workbench", pinned: true });
    const tree = JSON.stringify(k.ws.tree), claims = JSON.stringify(k.ws.panels.claims.spec);
    patchState(fx, (s) => { s.activeLenses = { marketing: { startedAt: new Date().toISOString() } }; s.verdict = null; }); k.refresh();
    expect(k.ws.panels.workbench.spec.summary).toMatch(/^EXECUTE: running: marketing/);
    expect(JSON.stringify(k.ws.tree)).toBe(tree); expect(k.ws.panels.workbench).toMatchObject({ pinned: true, placedBy: "human" }); expect(JSON.stringify(k.ws.panels.claims.spec)).toBe(claims);
    const modes = (k.db.query("SELECT data FROM events WHERE type = 'workbench.mode'").all() as any[]).map((e) => JSON.parse(e.data)); expect(modes.at(-1)).toMatchObject({ from: "complete", to: "execute" });
    patchState(fx, (s) => { s.activeLenses = {}; }); k.refresh(); expect(k.ws.panels.workbench.spec.summary).toMatch(/^COMPLETE:/); expect(JSON.stringify(k.ws.tree)).toBe(tree);
  });
  test("a Workbench the owner closed stays closed through every transition", () => {
    const fx = fixtureRun("loam"); const k = open(fx); k.human({ op: "human.open", template: "workbench" }); k.human({ op: "human.close", id: "workbench" });
    patchState(fx, (s) => { s.activeLenses = { marketing: { startedAt: new Date().toISOString() } }; }); k.refresh(); term(k, "verify the current frontend");
    expect(Object.keys(k.ws.panels)).not.toContain("workbench");
  });
  test("the screen is a view: building it writes nothing to the run, the inbox, or the proposals", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const before = survey(fx.run.dir);
    for (let i = 0; i < 3; i++) { k.screen(); k.human({ op: "human.open", template: "workbench" }); k.tool("work_get", { part: "screen" }); }
    expect(survey(fx.run.dir)).toEqual(before); expect(readInbox(fx.run)).toEqual([]);
  });
  test("the evidence ledger says unknown for what the run does not record, and links pass/fail to real refs", () => {
    const k = open(fixtureRun("mote", { stale: true })); const rows = ledgerOf({ db: k.db, proj: k.last.proj, runDir: k.run.dir, avail: none });
    const sections = [...new Set(rows.map((r) => r.section))]; expect(sections).toEqual(["Product / model", "Implementation", "Verification", "Quality"]);
    const tests = rows.find((r) => /Test and browser-journey/.test(r.check))!; expect(tests.result).toBe("unknown"); expect(tests.evidence).toMatch(/does not record/);
    expect(rows.find((r) => r.check.startsWith("Artifact electronics/electrical-review.md"))).toMatchObject({ result: "fail", ref: "artifact:electronics/electrical-review.md" });
    expect(rows.filter((r) => r.ref).every((r) => k.refExists(r.ref!))).toBe(true);
    expect(rows.find((r) => /process accepts the run/.test(r.check))!.result).toBe("fail");
  });
  test("the mode rule is pure: the same facts give the same mode with no I/O", () => {
    const k = open(fixtureRun("loam")); const i = { proj: k.last.proj, requests: [], asksOpen: 0, settlementReachable: true, primary: null };
    expect(modeOf(i)).toEqual(modeOf(i)); expect(modeOf({ ...i, settlementReachable: false }).mode).toBe("verify");   // complete needs the engine's "ready" and a reachable settlement; one alone is still review
    expect(modeOf({ ...i, proj: { ...i.proj, run: { ...i.proj.run, goal: "" } } }).mode).toBe("orient");
  });
});

// ---- the Work Terminal -------------------------------------------------------------------------------------------------------------------
describe("the Work Terminal answers what it can without a model, and stores what needs an executor", () => {
  test("known questions compile to existing views and tools, and create no request", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const realFetch = globalThis.fetch; globalThis.fetch = (() => { throw new Error("the terminal must not call out"); }) as any;
    try {
      const art = k.last.proj.artifacts.find((a: any) => a.status === "stale")!; const claim = k.last.proj.claims[0].id;
      const table: [string, string, string][] = [
        ["show me what blocks acceptance", "view", "gate"], ["what should happen next?", "answer", "case-run"], ["why is this stale?", "view", "staleness"], ["show the workflow", "view", "workflow"],
        ["show the capabilities for this stage", "view", "capabilities"], ["show capabilities", "view", "capabilities"], ["show the task contract", "view", "contract"], ["show requests", "view", "requests"],
        ["review what changed before I accept it", "view", "review"], [`why is ${art.id.split("/").pop()} stale`, "view", "w-why-artifact-"], [`open claim ${claim}`, "view", `ref-claim-${claim.toLowerCase()}`],
        ["show proposals", "view", "proposals"], ["show the gate", "view", "gate"], ["show unknowns", "view", "unknowns"], ["show the workbench", "view", "workbench"], ["show run trace", "view", "trace"],
      ];
      for (const [text, kind, panel] of table) { const r = term(k, text); expect(r.ok, `${text}: ${JSON.stringify(r)}`).toBe(true); expect(r.terminal.kind, text).toBe(kind); expect(Object.keys(k.ws.panels).some((id) => id.startsWith(panel)), `${text} -> ${panel} in ${Object.keys(k.ws.panels)}`).toBe(true); }
      expect(k.control.requests().length).toBe(0);
    } finally { globalThis.fetch = realFetch; }
  });
  test("the run trace template opens: a progress block's source names a live stream, not a data source (regression)", () => {
    const k = open(fixtureRun("mote")); expect(k.human({ op: "human.open", template: "trace" }).ok).toBe(true); expect(Object.keys(k.ws.panels)).toContain("trace");
    expect(k.agent({ op: "surface.put", surface: { id: "p", title: "P", blocks: [{ type: "progress", id: "x", label: "gate", source: "gate" }] } }).ok).toBe(true);
  });
  test("\"what should happen next\" answers from the Case: the primary move and who may take it, as guidance", () => {
    const k = open(fixtureRun("mote", { stale: true })); const r = term(k, "what should happen next?").terminal;
    const prim = (k.tool("case_get", {}) as any).result.primary; expect(r.say).toContain(prim.move); expect(r.say).toMatch(/guidance, not an instruction/);
  });
  test("work becomes a typed request that says queued, not done, and carries only the classification the words support", () => {
    const k = open(fixtureRun("mote", { stale: true })); const run = k.last.proj.run.startedAt;
    const a = term(k, "verify the current frontend").terminal; const row = k.control.request(a.id)!;
    expect(row).toMatchObject({ status: "queued", kind: "capability", capability: "fidelity-qa", actor: "owner", run }); expect(row.facts.basis).toMatch(/keyword "frontend" suggests fidelity-qa \(a hint/);
    expect(a.say).toMatch(/Queued as a work request for fidelity-qa\. Nothing has run: an executor must acknowledge it/);
    const s = term(k, "split the next work across independent workers").terminal; const split = k.control.request(s.id)!;
    expect(split).toMatchObject({ kind: "split", capability: null }); expect(split.facts.independentNow).toEqual(k.last.proj.lenses.filter((l: any) => l.status === "ready").map((l: any) => l.name));
    const st = k.control.request(term(k, "steer away from browser screenshot work").terminal.id)!; expect(st.kind).toBe("steer");
    const acc = k.control.request(term(k, "audit accessibility").terminal.id)!; expect(acc).toMatchObject({ kind: "unclassified", capability: null }); expect(acc.facts.basis).toMatch(/no capability is named/);
    const moon = k.control.request(term(k, "verify the moon landing").terminal.id)!; expect(moon.capability).toBeNull();
    const ex = k.control.request(term(k, "request: something nobody has a word for").terminal.id)!; expect(ex).toMatchObject({ kind: "unclassified", capability: null, text: "something nobody has a word for" });
    const rb = k.control.request(term(k, `rebuild ${k.last.proj.artifacts.find((x: any) => x.status === "stale")!.id}`).terminal.id)!; expect(rb).toMatchObject({ kind: "rebuild", capability: "electronics" }); expect(rb.refs[0]).toMatch(/^artifact:electronics\//);
    expect(k.control.requests({ run }).length).toBe(7);
  });
  test("unknown phrasing is not guessed into work: it is said not to be understood and nothing is queued", () => {
    const k = open(fixtureRun("mote")); for (const t of ["flibber the quux", "the weather is nice", "show me the moon"]) { const r = term(k, t); expect(r.terminal.kind, t).toBe("unrecognized"); expect(r.terminal.say).toMatch(/nothing was queued/); }
    expect(term(k, "").ok).toBe(false); expect(term(k, "   ").terminal.kind).toBe("unrecognized");
    expect(k.control.requests().length).toBe(0);
  });
  test("a request is durable, visible in the snapshot, the tool, and the router's context file, and tells the truth about who has seen it", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const id = term(k, "verify the current frontend").terminal.id;
    const snap: any = k.snapshot(); expect(snap.work.requests[0]).toMatchObject({ id, status: "queued" }); expect(snap.work.requests[0].next).toMatch(/no agent is connected; it will see this at its next interaction/); expect(snap.work.pending).toBe(1);
    const ctx = JSON.parse(fs.readFileSync(path.join(fx.run.dir, ".cockpit/context.json"), "utf8")); expect(ctx.work).toMatchObject({ pending: 1, review: 0 }); expect(ctx.work.items[0]).toMatchObject({ id, status: "queued", capability: "fidelity-qa" });
    k.close(); const again = new Cockpit(fx.project); made.push({ project: fx.project, k: again });
    expect(again.control.request(id)?.status).toBe("queued"); expect((again.tool("work_get", {}) as any).result.pending[0]).toMatchObject({ id, status: "queued" });
    again.tool("get_status", {}); expect((again.snapshot() as any).work.requests[0].next).toMatch(/an agent last called the cockpit .*none has acknowledged/);
    const events = (again.db.query("SELECT type, subject FROM events WHERE type = 'work.requested'").all() as any[]); expect(events).toEqual([{ type: "work.requested", subject: id }]);
  });
  test("typing cannot rule, answer, confirm, or settle: a decision verb is not an authority, and the run does not move", () => {
    const fx = fixtureRun("mote", { stale: true, openProposals: ["P12"] }); const k = open(fx); const before = survey(fx.run.dir);
    for (const t of ["accept P12", "approve proposal P12", "reject C1", "settle the run", "rule accept claim C1", "done"]) { const r = term(k, t); expect(["unrecognized", "refused"].includes(r.terminal?.kind ?? "refused") || r.ok === false, t).toBe(true); }
    expect(readInbox(fx.run)).toEqual([]); expect(survey(fx.run.dir)).toEqual(before); expect(k.control.requests().length).toBe(0);
    expect(interpret("accept P12", { proj: k.last.proj, requests: [] }).kind).toBe("review");   // only ever a note on an artifact or request; the cockpit refuses anything else
    const r = term(k, "accept P12"); expect(r.ok).toBe(false); expect(r.code).toBe("BAD_REF"); expect(k.db.query("SELECT COUNT(*) n FROM control_reviews").get()).toEqual({ n: 0 });
  });
  test("the owner's choices are typed too: bind an implementation, declare a budget and an invariant; each is cockpit state and nothing else", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const before = survey(fx.run.dir);
    expect(term(k, "use agent-browser for fidelity-qa").ok).toBe(true); expect(k.control.bindings()["fidelity-qa"]).toMatchObject({ implementation: "agent-browser", setBy: "owner" });
    expect(term(k, "bind direction to impeccable").ok).toBe(true); expect(k.control.bindings().direction.implementation).toBe("impeccable");
    expect(term(k, "use nothing-real for fidelity-qa").ok).toBe(false); const odd = term(k, "use agent-browser for not-a-lens").terminal; expect(odd.kind).toBe("request"); expect(k.control.request(odd.id)).toMatchObject({ kind: "unclassified", capability: null }); k.human({ op: "human.cancel", request: odd.id });   // not a capability, so it is only a request, never a binding
    expect(term(k, "clear binding fidelity-qa").ok).toBe(true); expect(k.control.bindings()["fidelity-qa"]).toBeUndefined();
    term(k, "budget waves 45 minutes"); term(k, "budget waves 12 lens runs"); term(k, "invariant waves: protected tests cannot change"); term(k, "invariant waves: no new dependencies");
    expect(k.control.contract("waves")).toMatchObject({ budget: { minutes: 45, lensRuns: 12 }, invariants: ["protected tests cannot change", "no new dependencies"] });
    expect(term(k, "budget nowhere 5 minutes").ok).toBe(false);
    const rows = (k.data("work:contract?stage=waves") as any).rows; expect(rows.find((r: any) => r.field === "Budget").value).toMatch(/declared: 45 min, 12 lens runs/);
    expect(survey(fx.run.dir)).toEqual(before); expect(readInbox(fx.run)).toEqual([]); expect(k.control.pending().length).toBe(0);
    expect((k.agent({ op: "human.terminal", text: "use hallmark for direction" }) as any).code).toBe("AUTHORITY_HUMAN"); expect(k.control.bindings().direction.implementation).toBe("impeccable");
  });
  test("the log is compact and survives a reconnect; refused commands are logged as refused", () => {
    const k = open(fixtureRun("mote")); term(k, "show the workflow"); term(k, "accept R9"); term(k, "flibber");
    const log = (k.snapshot() as any).work.log as any[]; expect(log.map((e) => e.kind)).toEqual(["view", "refused", "unrecognized"]); expect(log[1].say).toMatch(/no work request R9/);
    for (let i = 0; i < 60; i++) term(k, "show requests"); expect(((k.snapshot() as any).work.log as any[]).length).toBe(40);
  });
  test("the interpreter is pure: the same words and facts give the same plan", () => {
    const k = open(fixtureRun("mote")); const i = { proj: k.last.proj, requests: [], primary: null };
    for (const t of ["verify the current frontend", "show workflow", "what next", "split the work across workers"]) expect(JSON.stringify(interpret(t, i))).toBe(JSON.stringify(interpret(t, i)));
    expect(interpret("what next", i).kind).toBe("answer");
  });
});

// ---- the request lifecycle and who may move it --------------------------------------------------------------------------------------------
describe("a request moves through a bounded lifecycle, and the agent can never accept its own work", () => {
  const fresh = () => { const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const id = term(k, "verify the current frontend").terminal.id as string; return { fx, k, id }; };
  const up = (k: Cockpit, id: string, status: string, extra: object = {}) => k.tool("work_update", { id, status, ...extra }) as any;
  test("the table: every non-terminal state has a way forward, terminal states have none, and accepted is reachable only by the owner", () => {
    for (const s of REQUEST_STATUSES) { const next = Object.keys(TRANSITIONS[s]); if (["accepted", "cancelled", "failed"].includes(s)) expect(next).toEqual([]); else expect(next.length).toBeGreaterThan(0); }
    for (const s of REQUEST_STATUSES) { expect(legalNext(s, "agent")).not.toContain("accepted"); expect(legalNext(s, "agent")).not.toContain("cancelled"); }
    expect(legalNext("ready_for_review", "human")).toContain("accepted");
  });
  test("queued -> acknowledged -> running -> produced -> ready_for_review -> accepted, each by the right party, with a history", () => {
    const { k, id } = fresh(); const art = `artifact:${k.last.proj.artifacts[0].id}`;
    expect(up(k, id, "acknowledged").ok).toBe(true); expect(up(k, id, "running", { note: "started" }).ok).toBe(true);
    expect(up(k, id, "produced", { refs: [art] }).ok).toBe(true); expect(up(k, id, "ready_for_review").ok).toBe(true);
    expect(k.control.request(id)!.refs).toEqual([art]);
    const r: any = k.human({ op: "human.review", subject: id, outcome: "accepted", note: "looks right" }); expect(r.ok).toBe(true);
    const row = k.control.request(id)!; expect(row.status).toBe("accepted"); expect(row.history.map((h) => `${h.status}:${h.by}`)).toEqual(["queued:owner", "acknowledged:agent", "running:agent", "produced:agent", "ready_for_review:agent", "accepted:human"]);
    expect(k.control.latestReview("request", id)).toMatchObject({ status: "accepted", reviewer: "owner", note: "looks right", evidenceRefs: [art] });
    expect((up(k, id, "running")).ok).toBe(false);   // finished is finished
  });
  test("the agent cannot accept, reject, cancel, or review: AUTHORITY_HUMAN, and the state does not change", () => {
    const { k, id } = fresh(); up(k, id, "acknowledged"); up(k, id, "running"); up(k, id, "ready_for_review", { note: "done" });
    for (const s of ["accepted", "cancelled"]) { const r = up(k, id, s); expect(r.ok, s).toBe(false); expect(r.code, s).toBe("AUTHORITY_HUMAN"); }
    for (const op of [{ op: "human.review", subject: id, outcome: "accepted" }, { op: "human.cancel", request: id }, { op: "human.terminal", text: "accept " + id }, { op: "human.bind", capability: "fidelity-qa", implementation: "agent-browser" }]) { const r: any = k.agent(op); expect(r.ok).toBe(false); expect(r.code).toBe("AUTHORITY_HUMAN"); }
    expect(k.control.request(id)!.status).toBe("ready_for_review"); expect(k.control.reviews().length).toBe(0);
    expect(TOOLS.map((t) => t.name).filter((n) => /accept|reject|cancel|review|approve/.test(n))).toEqual([]);
  });
  test("the owner cannot report the executor's progress either, and an illegal step names the legal ones", () => {
    const { k, id } = fresh(); expect(k.control.move(id, "running", "human").ok).toBe(false);
    const skip = up(k, id, "ready_for_review", { note: "x" }); expect(skip.ok).toBe(false); expect(skip.message).toMatch(/queued; it cannot go to ready_for_review\. From here: acknowledged, blocked, failed, cancelled/);
    expect((k.human({ op: "human.review", subject: id, outcome: "accepted" }) as any).message).toMatch(/only work marked ready_for_review is reviewed/);
  });
  test("ready_for_review needs something to review, and refs must name real things", () => {
    const { k, id } = fresh(); up(k, id, "acknowledged"); up(k, id, "running");
    expect(up(k, id, "ready_for_review").message).toMatch(/needs something the owner can review/); expect(up(k, id, "produced", { refs: ["artifact:nope/never.md"] }).code).toBe("BAD_REF");
    expect(up(k, id, "ready_for_review", { note: "nothing found; the page already passes" }).ok).toBe(true);
  });
  test("rejecting returns the work to the agent as blocked, with the reason; cancelling is the owner's and ends it", () => {
    const { k, id } = fresh(); up(k, id, "acknowledged"); up(k, id, "running"); up(k, id, "ready_for_review", { note: "done" });
    expect(k.human({ op: "human.review", subject: id, outcome: "rejected", note: "missed the mobile layout" }).ok).toBe(true);
    const row = k.control.request(id)!; expect(row.status).toBe("blocked"); expect(row.note).toBe("review rejected: missed the mobile layout"); expect(k.control.latestReview("request", id)!.status).toBe("rejected");
    expect(((k.tool("work_get", { part: "requests", id }) as any).result.request.next)).toMatch(/blocked: review rejected: missed the mobile layout/);
    expect(up(k, id, "running").ok).toBe(true); expect(k.human({ op: "human.cancel", request: id }).ok).toBe(true); expect(k.control.request(id)!.status).toBe("cancelled");
  });
  test("work_update is offered only while work is pending, and no tool changes a binding, a budget, or a model", () => {
    const { k, id } = fresh(); expect(activeTools({ mode: "current", subjects: [] })).not.toContain("work_update"); expect(BASE_TOOLS).toContain("work_get"); expect(BASE_TOOLS).not.toContain("work_update");
    expect(k.tools()).toContain("work_update"); k.human({ op: "human.cancel", request: id }); expect(k.tools()).not.toContain("work_update");
    for (const t of TOOLS) expect(t.name).not.toMatch(/bind|budget|contract_set|model|reconcile/);
  });
  test("a review of an artifact is the owner's own note: it never touches the gate, the model, or the inbox", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const before = survey(fx.run.dir); const a = k.last.proj.artifacts.find((x: any) => !x.isGate)!;
    const r = term(k, `accept ${a.id}`); expect(r.ok).toBe(true); expect(k.control.latestReview("artifact", a.id)).toMatchObject({ status: "accepted", reviewer: "owner" });
    const row = (k.data("work:ledger") as any).rows.find((x: any) => x.check === `Your review of ${a.id}`); expect(row.result).toBe("pass"); expect(row.evidence).toMatch(/does not change the gate/);
    expect(survey(fx.run.dir)).toEqual(before); expect(readInbox(fx.run)).toEqual([]); expect(k.last.proj.run.ready).toBe(false);
    expect(k.human({ op: "human.review", subject: "claim:C1", outcome: "accepted" }).ok).toBe(false);
  });
  test("every control action leaves the Product Model and the process untouched; only the router path changes them", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const before = survey(fx.run.dir);
    const id = term(k, "verify the current frontend").terminal.id; up(k, id, "acknowledged"); up(k, id, "running"); up(k, id, "ready_for_review", { note: "ok" });
    k.human({ op: "human.review", subject: id, outcome: "accepted" }); k.human({ op: "human.bind", capability: "fidelity-qa", implementation: "agent-browser", executor: "owner" }); k.human({ op: "human.executor", id: "claude-opus", label: "Opus via the CLI", kind: "agent", provider: "anthropic", role: "builder" });
    k.human({ op: "human.contract", stage: "waves", budget: { minutes: 5 } });
    expect(survey(fx.run.dir)).toEqual(before); expect(readInbox(fx.run)).toEqual([]); expect(k.control.executors().map((e) => e.id)).toEqual(["current-agent", "owner", "claude-opus"]);
    expect(k.human({ op: "human.executor", id: "owner", label: "x", kind: "human" }).ok).toBe(false);
    expect(k.human({ op: "human.bind", capability: "fidelity-qa", implementation: "nope" }).ok).toBe(false); expect(k.human({ op: "human.bind", capability: "nope" }).ok).toBe(false); expect(k.human({ op: "human.bind", capability: "fidelity-qa", executor: "ghost" }).ok).toBe(false);
  });
});

describe("work rows", () => {
  test("the request table and the waiting table speak in the owner's terms", () => {
    const fx = fixtureRun("mote", { stale: true, openProposals: ["P12"] }); const k = open(fx); const id = term(k, "audit accessibility").terminal.id;
    const req: any = workRows({ db: k.db, proj: k.last.proj, runDir: k.run.dir, avail: none }, "requests", {}); expect(req.rows[0]).toMatchObject({ id, status: "queued", capability: "unclassified" });
    const wait: any = workRows({ db: k.db, proj: k.last.proj, runDir: k.run.dir, avail: none }, "waiting", {}); expect(wait.rows.map((r: any) => r.kind)).toContain("proposal"); expect(wait.rows.find((r: any) => r.kind === "proposal")._ref).toBe("proposal:P12");
    expect(workRows({ db: k.db, proj: k.last.proj, runDir: k.run.dir }, "bogus", {})).toEqual({ error: "unknown work source bogus" });
  });
});
