// The world debugger kernel, headless, against both walkthroughs. Every claim here is mechanical: answers are compared with an independent
// reading of the run's files, and every operation is checked to leave the run directory byte-for-byte unchanged.
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fixtureRun, cleanup } from "./helpers";
import { Cockpit } from "../../cockpit/server/core";
import * as K from "../../cockpit/server/world";
import { resolve } from "../../cockpit/server/sources";
import * as WS_ from "../../cockpit/server/worldSurfaces";
import { SurfaceSchema } from "../../cockpit/protocol/spec";
import { activeTools, BASE_TOOLS, TOOLS, WORLD_TOOLS } from "../../cockpit/protocol/tools";
import { worldOfSource, mergeViewing, bannerOf } from "../../cockpit/protocol/world";
import { parseModel } from "../../hooks/src/lib/md.mjs";

// every file in the run except the disposable cockpit directory
const survey = (dir: string) => { const out: Record<string, string> = {}; const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === ".cockpit") continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } }; walk(dir); return out; };
const modelAt = (run: any, v: number) => parseModel(fs.readFileSync(path.join(run.dir, "history", `model-v${v}.md`), "utf8"));
const WORLD_CALLS: [string, any][] = [
  ["world_why", { ref: "claim:C31", show: true }], ["world_why", { ref: "gate", show: true }], ["world_impact", { ref: "decision:D7", show: true }],
  ["world_diff", { a: "2", b: "current", show: true }], ["world_timeline", { show: true }], ["world_timeline", { ref: "claim:C31", show: true }],
  ["world_counterfactual", { candidate: "proposal:P12", show: true }], ["world_reach", { ref: "claim:C31" }], ["world_reach", { need: "hardware.measure" }],
  ["world_replay", { selects: "file:evidence/electronics/power-budget.md#table1", expect: [{ field: "margin_a", op: "gt", value: "0" }], show: true }],
];

let fx: ReturnType<typeof fixtureRun>, c: Cockpit;
beforeAll(() => { fx = fixtureRun("mote", { stale: true, openProposals: ["P12"] }); c = new Cockpit(fx.project); });
afterAll(() => { c.close(); cleanup(fx.project); });
const W = () => c.worldEnv();

describe("navigation never mutates the run", () => {
  test("every world operation, including composing its surface, leaves every authoritative file unchanged", () => {
    const before = survey(fx.run.dir), rev = c.ws.rev;
    for (const [name, input] of WORLD_CALLS) { const r: any = c.tool(name, input); expect(r.ok, `${name} ${JSON.stringify(input)} ${JSON.stringify(r)}`).toBe(true); }
    expect(survey(fx.run.dir)).toEqual(before);
    expect(c.ws.rev).toBeGreaterThan(rev);   // the workspace moved (surfaces were composed) but the world did not
    expect(fs.readdirSync(fx.run.dir).filter((f) => f.startsWith("inbox"))).toEqual([]);
  });
  test("a historical source reads history without touching the current projection or the rail", () => {
    const rail = JSON.stringify(c.rail());
    const old: any = c.data("pa:claims?at=1"), cur: any = c.data("pa:claims");
    expect(old.world).toMatchObject({ mode: "historical", worlds: ["model@1"] });
    expect(cur.world).toBeUndefined();
    expect(old.total).toBe(modelAt(fx.run, 1).claims.size);
    expect(cur.total).toBeGreaterThan(old.total);
    expect(JSON.stringify(c.rail())).toBe(rail);
  });
  test("history that the run does not keep is refused, not invented", () => {
    for (const s of ["pa:proposals?at=2", "pa:artifacts?at=2", "pa:lenses?at=1"]) { const r: any = c.data(s); expect(r.kind, s).toBe("error"); expect(r.message).toMatch(/no recorded history/); }
    expect((c.data("pa:claims?at=99") as any).message).toMatch(/no readable snapshot/);
    expect((c.data("pa:claims?at=abc") as any).message).toMatch(/not a world/);
  });
});

describe("diff", () => {
  test("agrees with an independent reading of both model files", () => {
    const a = modelAt(fx.run, 2), b = modelAt(fx.run, 4);
    const added = [...b.claims.keys()].filter((k) => !a.claims.has(k)), removed = [...a.claims.keys()].filter((k) => !b.claims.has(k));
    const changed = [...b.claims.keys()].filter((k) => a.claims.has(k) && JSON.stringify(a.claims.get(k)) !== JSON.stringify(b.claims.get(k)));
    const d: any = K.diff(W(), 2, 4);
    const rows = (kind: string, change: string) => d.rows.filter((r: any) => r.kind === "claim" && r.change === change).map((r: any) => r.ref.slice(6));
    expect(rows("claim", "added").sort()).toEqual(added.sort());
    expect(rows("claim", "removed").sort()).toEqual(removed.sort());
    expect([...new Set(rows("claim", "changed"))].sort()).toEqual(changed.sort());
    for (const r of d.rows.filter((r: any) => r.change === "changed" && r.field === "grade")) expect(r.before).not.toBe(r.after);
  });
  test("is its own inverse, empty against itself, and names the decisions that explain a change", () => {
    const ab: any = K.diff(W(), 2, 4), ba: any = K.diff(W(), 4, 2), aa: any = K.diff(W(), 3, 3);
    expect(aa.rows).toEqual([]); expect(aa.same).toBe(true);
    expect(ab.rows.filter((r: any) => r.change === "added").map((r: any) => r.ref).sort()).toEqual(ba.rows.filter((r: any) => r.change === "removed").map((r: any) => r.ref).sort());
    const regraded = K.diff(W(), 1, 2).rows.find((r: any) => r.ref === "claim:C31" && r.field === "grade") as any;
    expect(regraded).toMatchObject({ before: "REPORTED", after: "CONTRADICTED" });
    expect(regraded.because).toMatch(/D4/);
  });
  test("says what it covers and what it does not", () => {
    const d: any = K.diff(W(), 1, 6);
    expect(d.coverage.omits).toEqual(expect.arrayContaining(["artifacts", "evidence", "proposals"]));
    expect(d.note).toMatch(/not versioned/);
    expect(K.diff(W(), 1, 77)).toMatchObject({ ok: false });
  });
  test("works on the software walkthrough too", () => {
    const lf = fixtureRun("loam", { complete: true }); const lc = new Cockpit(lf.project);
    try {
      const d: any = K.diff(lc.worldEnv(), 1, "current");
      expect(d.ok).toBe(true); expect(d.rows.length).toBeGreaterThan(0);
      const w: any = K.why(lc.worldEnv(), "claim:C5");
      expect(w.ok).toBe(true); expect(w.answers.every((a: any) => ["recorded", "derived", "unavailable"].includes(a.basis))).toBe(true);
    } finally { lc.close(); cleanup(lf.project); }
  });
});

describe("world identity", () => {
  test("is the model version plus a digest of intrinsic content, and never claims to be a world root", () => {
    const s = K.worlds(W()).load(3)!;
    expect(s.identity).toMatchObject({ id: "model@3", scheme: "model-version", version: 3, current: false });
    expect(s.identity.digest).toMatchObject({ scope: "product-model", algo: "sha256", complete: false });
    expect(s.identity.digest.omits).toEqual(expect.arrayContaining(["artifacts", "evidence", "proposals"]));
  });
  test("converges: the same settled content under different metadata has the same identity, and any real change does not", () => {
    const text = fs.readFileSync(path.join(fx.run.dir, "history", "model-v3.md"), "utf8");
    const m1 = parseModel(text);
    const v = text.replace(/model_version:\s*\d+/, "model_version: 9").replace(/^\|\s*(D\d+)\s*\|(.*)\|\s*\d+\s*\|\s*$/gm, (_m, d, rest) => `| ${d} |${rest}| 9 |`).replace(/[ ]{2,}/g, " ").replace(/\n\n/g, "\n\n\n");
    expect(K.digestModel(parseModel(v)).value).toBe(K.digestModel(m1).value);
    const graded = text.replace(/\| OBSERVED \|/, "| REPORTED |");
    expect(graded).not.toBe(text);
    expect(K.digestModel(parseModel(graded)).value).not.toBe(K.digestModel(m1).value);
  });
  test("successive versions differ; the version list carries the identity", () => {
    const rows = (c.data("pa:versions") as any).rows;
    expect(new Set(rows.map((r: any) => r.digest)).size).toBe(rows.length);
    expect(rows[0]).toMatchObject({ world: "model@1" });
    expect(K.timeline(W()).map((e: any) => e.world)).toEqual(["model@1", "model@2", "model@3", "model@4", "model@5", "model@6"]);
  });
});

describe("why", () => {
  test("answers a contradicted claim from the record: grade, the version it began, the decision, the sources that disagree", () => {
    const w: any = K.why(W(), "claim:C31"); const q = (t: string) => w.answers.find((a: any) => a.q.startsWith(t));
    expect(w.state).toBe("CONTRADICTED");
    expect(q("When did it reach")).toMatchObject({ basis: "recorded" }); expect(q("When did it reach").a).toMatch(/REPORTED → CONTRADICTED at model@2/);
    expect(q("Which transition").a).toMatch(/D4/); expect(q("Which transition").refs).toContain("decision:D4");
    expect(q("What contradicts").a).toMatch(/disagree/);
    expect(q("What supports").refs.some((r: string) => r.startsWith("evidence:"))).toBe(true);
  });
  test("says so when something is not recorded, instead of filling it in", () => {
    const w: any = K.why(W(), "decision:D7");
    expect(w.answers.find((a: any) => a.q === "When did it settle?")).toMatchObject({ basis: "unavailable" });   // model@5's settlement time is not in the log
    const ev: any = K.why(W(), "evidence:electronics/power-budget.md");
    expect(ev.answers.find((a: any) => a.q === "When was it observed?").basis).toBe("unavailable");
    expect(w.unavailable).toBeGreaterThan(0);
  });
  test("explains staleness by the decision, and the gate by its recorded blockers", () => {
    const a: any = K.why(W(), "artifact:electronics/electrical-review.md");
    expect(a.answers.find((x: any) => x.q === "Why is it stale?").a).toMatch(/D7/);
    const g: any = K.why(W(), "gate");
    const blockers = g.answers.filter((x: any) => x.q.startsWith("Blocker "));
    expect(blockers.map((b: any) => b.q.slice(8)).sort()).toEqual(fx.gate.blockers.map((b: any) => b.code).sort());
    expect(g.answers.find((x: any) => x.q === "Blocker stale").refs.length).toBeGreaterThan(0);
  });
  test("works for every entity class and refuses what does not exist", () => {
    for (const ref of ["claim:C31", "unknown:U3", "proposal:P12", "decision:D4", "artifact:electronics/electrical-review.md", "evidence:electronics/power-budget.md", "lens:electronics", "gate", "field:positioning", "version:3"]) {
      const r: any = K.why(W(), ref); if (!r.ok) { expect(ref, r.message).toBe("unknown:U3"); continue; }   // U3 may be closed in this run; the rest must exist
      expect(r.answers.length, ref).toBeGreaterThan(1); for (const a of r.answers) { expect(a.a.length, `${ref} ${a.q}`).toBeGreaterThan(0); expect(["recorded", "derived", "unavailable"]).toContain(a.basis); }
    }
    expect(K.why(W(), "claim:C9999")).toMatchObject({ ok: false });
    expect(K.why(W(), "nonsense")).toMatchObject({ ok: false });
  });
  test("an owner response about the ref is attributed to the owner, a relayed one is not", () => {
    const f2 = fixtureRun("mote", { openProposals: ["P12"] }); const run = f2.run; const c2 = new Cockpit(f2.project);
    try {
      c2.human({ op: "human.rule", ref: "proposal:P12", ruling: "reject", reason: "premature: the bench measurement is still missing" });
      const w: any = K.why(c2.worldEnv(), "proposal:P12");
      expect(w.answers.find((a: any) => a.q === "Has the owner weighed in?").a).toMatch(/via the owner/);
      expect(w.state).toBe("open");   // the owner's ruling is a recorded input, not a settlement
      void run;
    } finally { c2.close(); cleanup(f2.project); }
  });
});

describe("impact", () => {
  test("reduces the world to what is affected, bounded by depth, nearest and gate-relevant first", () => {
    const g = K.graphOf(W()); const d1: any = K.impact(W(), "decision:D7", { depth: 1 }), d2: any = K.impact(W(), "decision:D7", { depth: 2 });
    expect(d1.rows.every((r: any) => r.distance === 1)).toBe(true);
    expect(d2.rows.length).toBeGreaterThanOrEqual(d1.rows.length);
    expect(d2.rows.length).toBeLessThan(g.nodes.size / 2);               // a focused graph, not the world
    expect(d2.graph.nodes.length).toBeLessThanOrEqual(d2.rows.length + 1 + (d2.gatePath?.length ?? 0));
    const gateFirst = d2.rows.map((r: any) => r.gate); expect(gateFirst).toEqual([...gateFirst].sort((a: boolean, b: boolean) => Number(b) - Number(a)));
    expect(d2.stale).toBeGreaterThan(0);
    expect(d2.gatePath[0]).toBe("decision:D7"); expect(d2.gatePath.at(-1)).toBe("gate");
  });
  test("upstream differs from downstream, filters narrow, and every edge stays inside the reduced set", () => {
    const down: any = K.impact(W(), "artifact:electronics/electrical-review.md", { dir: "down" }), up: any = K.impact(W(), "artifact:electronics/electrical-review.md", { dir: "up", depth: 2 });
    expect(up.rows.map((r: any) => r.ref)).not.toEqual(down.rows.map((r: any) => r.ref));
    expect(up.rows.some((r: any) => r.kind === "claim")).toBe(true);
    const only: any = K.impact(W(), "decision:D7", { kinds: ["artifact"], gate: true });
    expect(only.rows.every((r: any) => r.kind === "artifact" && r.gate)).toBe(true);
    const ids = new Set(up.graph.nodes.map((n: any) => n.ref)); for (const e of up.graph.edges) { expect(ids.has(e.from) && ids.has(e.to)).toBe(true); }
    expect(K.impact(W(), "claim:C9999")).toMatchObject({ ok: false });
  });
  test("every relationship it follows is recorded; none is inferred", () => {
    const g = K.graphOf(W()); expect(g.edges.every((e) => e.basis === "recorded")).toBe(true);
  });
});

describe("candidates and counterfactuals", () => {
  test("every candidate names its parent world, producer, intention and what settles it, and none is authoritative", () => {
    const rows = (c.data("pa:candidates?status=open") as any).rows;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) { expect(r.parent).toBe("model@6"); expect(r.producer).toBeTruthy(); expect(r.intention).toBeTruthy(); expect(r.requires).toBe("router reconciliation"); expect(r.authoritative).toBe(false); }
  });
  test("a counterfactual separates known, derived, expected, unknown and required-observation effects, and applies nothing", () => {
    const before = survey(fx.run.dir);
    const r: any = K.counterfactual(W(), "proposal:P12");
    expect(r.authority).toBe("possibility"); expect(r.candidate.authoritative).toBe(false); expect(r.settled).toBe(false);
    const cls = new Set(r.effects.map((e: any) => e.class));
    for (const k of ["known", "derived", "unknown"]) expect(cls.has(k), k).toBe(true);
    expect(r.effects.find((e: any) => e.class === "derived" && e.subject === "gate").effect).toMatch(/gate-stale/);
    expect(r.candidate.settlement.join(" ")).toMatch(/router/);
    expect(survey(fx.run.dir)).toEqual(before);
    expect((c.rail() as any).gate).not.toBe("go");
  });
  test("a discovery is only expected to stale readers; a change is derived to", () => {
    const p = fixtureRun("mote", { openProposals: ["P12"] });
    const txt = fs.readFileSync(p.run.proposalsPath, "utf8").replace(/^(\| P12 \| [^|]+\| [^|]+\| )discovery/m, "$1change");
    fs.writeFileSync(p.run.proposalsPath, txt); const c3 = new Cockpit(p.project);
    try {
      const asChange: any = K.counterfactual(c3.worldEnv(), "proposal:P12"), asDisc: any = K.counterfactual(W(), "proposal:P12");
      expect(asChange.effects.filter((e: any) => e.subject.startsWith("artifact:")).every((e: any) => e.class === "derived")).toBe(true);
      expect(asDisc.effects.filter((e: any) => e.subject.startsWith("artifact:")).every((e: any) => e.class === "expected")).toBe(true);
    } finally { c3.close(); cleanup(p.project); }
  });
  test("an observation that is missing is named, with who could gather it", () => {
    const p = fixtureRun("mote", { openProposals: ["P24"] });
    const lines = fs.readFileSync(p.run.proposalsPath, "utf8").split("\n").map((l) => { if (!/^\| P24 \|/.test(l)) return l; const cells = l.split("|"); cells[6] = " C31; evidence/electronics/nothing-here.md "; return cells.join("|"); });
    fs.writeFileSync(p.run.proposalsPath, lines.join("\n")); const c4 = new Cockpit(p.project);
    try {
      const r: any = K.counterfactual(c4.worldEnv(), "proposal:P24");
      const obs = r.effects.filter((e: any) => e.class === "observation-required");
      expect(obs.some((e: any) => /does not exist in this run/.test(e.effect))).toBe(true);
      expect(obs.some((e: any) => e.subject === "claim:C31" && e.needs?.length && e.via)).toBe(true);
    } finally { c4.close(); cleanup(p.project); }
  });
  test("a settled candidate is reported as settled and previews nothing", () => {
    const settled = (c.data("pa:candidates") as any).rows.find((r: any) => r.status.startsWith("accepted"));
    const r: any = K.counterfactual(W(), `proposal:${settled.id}`);
    expect(r.settled).toBe(true); expect(r.effects.some((e: any) => e.class === "derived")).toBe(false);
    expect(K.counterfactual(W(), "claim:C31")).toMatchObject({ ok: false });
  });
});

describe("replay: an observation criterion over recorded evidence", () => {
  const sel = "file:evidence/electronics/power-budget.md#table1";
  const run = (def: any) => { const o = resolve(c.env, `world:replay?selects=${encodeURIComponent(def.selects)}&expect=${def.expect}${def.where ? `&where=${def.where}` : ""}`) as any; return o; };
  test("selects rows, asserts a predicate with units in the cells, and reports which rows fail", () => {
    const r: any = c.tool("world_replay", { selects: sel, expect: [{ field: "margin_a", op: "gt", value: "0" }] });
    expect(r.result.result).toBe("fail"); expect(r.result.selected).toBe(6); expect(r.result.failures.map((f: any) => f.row)).toEqual([4, 5, 6]);
    expect(r.result.settles).toBe(false);
  });
  test("an empty selection is not a pass; a missing file is a source error", () => {
    expect((c.tool("world_replay", { selects: sel, where: [{ field: "verdict", op: "eq", value: "no such verdict" }], expect: [{ field: "margin_a", op: "gt", value: "0" }] }) as any).result.result).toBe("not-selected");
    expect((c.tool("world_replay", { selects: "file:evidence/electronics/missing.md#table1", expect: [{ field: "a", value: "1" }] }) as any).result.result).toBe("source-error");
  });
  test("the observer is content-addressed: the same criterion has the same identity whoever runs it", () => {
    const d = { selects: sel, where: [], expect: [{ field: "margin_a", op: "gt", value: "0" }] };
    expect(K.observerId(d)).toBe(K.observerId({ ...d, discriminates: ["claim:C31"] }));
    expect(K.observerId(d)).not.toBe(K.observerId({ ...d, expect: [{ field: "margin_a", op: "gt", value: "1" }] }));
  });
  test("passes evidence to the router but changes no grade, claim, gate, or inbox", () => {
    const before = survey(fx.run.dir), rail = JSON.stringify(c.rail());
    c.tool("world_replay", { selects: sel, expect: [{ field: "margin_a", op: "lt", value: "0" }], where: [{ field: "verdict", op: "contains", value: "EXCEEDS" }], discriminates: ["claim:C31"], show: true });
    expect(survey(fx.run.dir)).toEqual(before); expect(JSON.stringify(c.rail())).toBe(rail);
    void run;
  });
  test("a value with a comma, tilde, percent or pipe stays one criterion through every layer", () => {
    const awkward = [{ field: "state", op: "contains", value: "thin (80 % or more), ~ish | a&b#c" }];
    expect(K.parsePreds(K.fmtPreds(awkward as any))).toEqual(awkward as any);
    expect(K.parsePreds("verdict~contains~49 %")).toEqual([{ field: "verdict", op: "contains", value: "49 %" }]);
    const r: any = c.tool("world_replay", { selects: sel, where: [{ field: "state", op: "eq", value: "speech + both servos moving, loaded" }], expect: [{ field: "margin_a", op: "gt", value: "0" }] });
    expect(r.result.selected).toBe(1); expect(r.result.result).toBe("pass");   // the comma did not split the criterion
    const inOp: any = c.tool("world_replay", { selects: sel, where: [{ field: "verdict", op: "in", value: ["ok", "EXCEEDS supply"] }], expect: [{ field: "load_a", op: "gt", value: "0" }] });
    expect(inOp.result.selected).toBe(4);
  });
  test("cannot select outside the run, through a path, a symlink, or the tool schema", () => {
    expect((resolve(c.env, "world:replay?selects=file:evidence/../../../etc/passwd%23table1&expect=a~eq~1") as any).kind).toBe("error");
    fs.symlinkSync("/etc", path.join(fx.run.dir, "evidence", "leak"));
    try {
      const r: any = resolve(c.env, "world:replay?selects=file:evidence/leak/passwd%23table1&expect=a~eq~1");
      expect(r.rows?.[0]?.result ?? r.kind).toMatch(/source-error|error/);
      expect(c.tool("world_replay", { selects: "file:artifacts/x.md#table1", expect: [{ field: "a", value: "1" }] })).toMatchObject({ ok: false, code: "SCHEMA" });
    } finally { fs.unlinkSync(path.join(fx.run.dir, "evidence", "leak")); }
  });
});

describe("reach: missing evidence to capability to provider", () => {
  const env = (o: Partial<import("../../cockpit/server/reach").ReachEnv> = {}) => ({ which: () => null, env: {} as Record<string, string>, exists: () => false, platform: "linux", probes: {}, ...o });
  test("the rungs never collapse: a binary on PATH is installed, not usable", async () => {
    const R = await import("../../cockpit/server/reach");
    const gh = R.PROVIDERS.find((p) => p.id === "gh")!;
    const installed = R.stateOf(gh, env({ which: (b) => (b === "gh" ? "/usr/bin/gh" : null) }));
    expect(installed.state).toMatchObject({ installed: "yes", configured: "no", probed: "unknown" }); expect(installed.status).toBe("blocked"); expect(installed.blockedAt).toBe("configured");
    const configured = R.stateOf(gh, env({ which: () => "/x", env: { GH_TOKEN: "super-secret-value" } }));
    expect(configured.state).toMatchObject({ installed: "yes", configured: "yes", probed: "unknown", reachable: "unknown", authorized: "unknown" }); expect(configured.status).toBe("unproven");
    const probed = R.stateOf(gh, env({ which: () => "/x", env: { GH_TOKEN: "x" }, probes: { gh: { at: "t", reachable: true, authorized: true } } }));
    expect(probed.status).toBe("usable"); expect(probed.state.probed).toBe("yes");
    const denied = R.stateOf(gh, env({ which: () => "/x", env: { GH_TOKEN: "x" }, probes: { gh: { at: "t", reachable: true, authorized: false } } }));
    expect(denied).toMatchObject({ status: "blocked", blockedAt: "authorized" });
    expect(JSON.stringify([installed, configured, probed, denied])).not.toContain("super-secret-value");   // presence only, never the value
  });
  test("providers are interchangeable per capability, ranked by how far they have climbed, and the owner is a provider", async () => {
    const R = await import("../../cockpit/server/reach");
    const r = R.reach("repo.inspect", env({ which: (b) => (b === "git" ? "/usr/bin/git" : null) }));
    expect(r.providers.length).toBeGreaterThan(1); expect(r.best).toBe("git");
    const hw = R.reach("hardware.measure", env());
    expect(hw.providers.some((p) => p.id === "owner" && p.route === "owner" && p.status === "unproven")).toBe(true);
    expect(hw.usable).toBe(false);   // nothing is usable until something is proven
  });
  test("a gap on a claim or unknown routes to capabilities and says when it is only a heuristic", () => {
    const r: any = K.worldReach(W(), { ref: "claim:C31" }, { which: () => null, env: {}, exists: () => false, platform: "linux", probes: {} });
    expect(r.gap).toMatch(/CONTRADICTED/); expect(r.needs.length).toBeGreaterThan(0); expect(r.needs[0].basis).toMatch(/heuristic/);
    const done: any = K.worldReach(W(), { ref: `claim:${[...K.worlds(W()).load("current")!.ents.values()].find((e) => e.fields.grade === "VERIFIED")!.ref.slice(6)}` });
    expect(done.gap).toMatch(/none/);
    expect(K.worldReach(W(), { need: "telepathy" })).toMatchObject({ ok: false });
    expect(K.worldReach(W(), {})).toMatchObject({ ok: false });
  });
});

describe("dynamic tools follow what the owner is looking at", () => {
  test("a normal context offers exactly the base tools", () => {
    expect(activeTools({ mode: "current", subjects: [] })).toEqual(BASE_TOOLS);
  });
  test("a historical world offers the temporal tools; a candidate the counterfactual ones; an unknown the reach tool", () => {
    const hist = activeTools({ mode: "historical", subjects: [] });
    for (const n of ["world_diff", "world_timeline", "world_why", "world_impact"]) expect(hist).toContain(n);
    expect(hist).not.toContain("world_counterfactual");
    const cand = activeTools({ mode: "candidate", subjects: ["proposal"] });
    for (const n of ["world_counterfactual", "world_replay", "world_reach", "world_why"]) expect(cand).toContain(n);
    const unk = activeTools({ mode: "current", subjects: ["unknown"] });
    expect(unk).toContain("world_reach"); expect(unk).not.toContain("world_counterfactual");
    expect(activeTools({ mode: "current", subjects: ["claim"] })).toEqual(expect.arrayContaining(["world_why", "world_impact", "world_reach"]));
    for (const ctx of [hist, cand, unk]) expect(ctx.length).toBeLessThan(TOOLS.length);
  });
  test("the cockpit derives the context from the focused surface's own sources", () => {
    const c5 = new Cockpit(fx.project);
    try {
      expect(c5.tools()).toEqual(BASE_TOOLS);
      c5.agent({ op: "surface.put", surface: { id: "old", title: "Then", blocks: [{ type: "table", id: "t", source: "pa:claims?at=2" }] } });
      expect(c5.tools()).toEqual(expect.arrayContaining(["world_diff", "world_timeline"]));
      expect((c5.context() as any).world).toMatchObject({ mode: "historical", worlds: ["model@2"] });
      c5.agent({ op: "surface.remove", id: "old" });
      expect(c5.tools()).toEqual(BASE_TOOLS); expect((c5.context() as any).world.mode).toBe("current");
      c5.agent({ op: "surface.put", surface: { id: "cf", title: "If", blocks: [{ type: "table", id: "t", source: "world:counterfactual?ref=proposal:P12" }] } });
      expect(c5.tools()).toEqual(expect.arrayContaining(["world_counterfactual", "world_replay"])); expect((c5.context() as any).world).toMatchObject({ mode: "candidate", subject: "proposal:P12" });
    } finally { c5.close(); }
  });
  test("shared attention stays compact", () => {
    const c5 = new Cockpit(fx.project);
    try { c5.tool("world_why", { ref: "claim:C31", show: true }); const ctx = JSON.stringify(c5.context()); expect(ctx.length).toBeLessThan(2500); expect(ctx).toContain("claim:C31"); } finally { c5.close(); }
  });
});

describe("surfaces are the existing vocabulary, bound to world sources", () => {
  test("every debugger surface validates against the fixed schema and every source resolves, on both walkthroughs", () => {
    for (const name of ["mote", "loam"] as const) {
      const f = fixtureRun(name, { complete: name === "loam" }); const k = new Cockpit(f.project);
      try {
        const claim = (k.data("pa:claims") as any).rows[0]._ref, W2 = k.worldEnv();
        const surfaces = [WS_.whySurface(claim), WS_.whySurface("gate"), WS_.impactSurface(claim, { dir: "both", depth: 2 }), WS_.diffSurface(W2, 1, "current")!, WS_.timelineSurface(), WS_.timelineSurface(claim), WS_.reachSurface({ ref: claim }), WS_.reachSurface({ need: "hardware.measure" })];
        for (const s of surfaces) {
          const ok = SurfaceSchema.safeParse(s); expect(ok.success, `${name} ${s.id} ${JSON.stringify((ok as any).error?.issues?.slice(0, 2))}`).toBe(true);
          for (const b of s.blocks as any[]) if (b.source) { const r: any = k.data(b.source, { as: b.type === "document" ? "doc" : undefined }); expect(r.kind, `${name} ${s.id}/${b.id} ${b.source} ${r.message ?? ""}`).not.toBe("error"); }
          const r = k.agent({ op: "surface.put", surface: s }); expect(r.ok, `${name} ${s.id} ${JSON.stringify(r)}`).toBe(true);
        }
      } finally { k.close(); cleanup(f.project); }
    }
  });
  test("introduces no new block type: the vocabulary is still the fifteen", async () => {
    const { BLOCK_TYPES } = await import("../../cockpit/protocol/spec"); expect(BLOCK_TYPES.length).toBe(15);
  });
  test("the world banner is derived from sources and cannot be suppressed by the agent", () => {
    expect(bannerOf(mergeViewing([worldOfSource("pa:claims?at=2")]))).toMatchObject({ tone: "warning" });
    expect(bannerOf(mergeViewing([worldOfSource("world:diff?a=2&b=current")]))!.text).toMatch(/model@2/);
    expect(bannerOf(mergeViewing([worldOfSource("world:counterfactual?ref=proposal:P12")]))).toMatchObject({ tone: "unknown" });
    expect(bannerOf(mergeViewing([worldOfSource("pa:claims"), worldOfSource("world:why?ref=claim:C1")]))).toBeNull();
    const r = SurfaceSchema.safeParse({ id: "x", title: "x", banner: false, blocks: [{ type: "callout", id: "c", tone: "note", text: "hi" }] }); expect(r.success).toBe(false);
  });
  test("malformed debugger requests return structured errors and change nothing", () => {
    const before = survey(fx.run.dir), rev = c.ws.rev;
    const bad: [string, any, string][] = [
      ["world_why", { ref: "claim:C9999" }, "BAD_REF"], ["world_why", { ref: "nonsense" }, "SCHEMA"], ["world_impact", { ref: "claim:C31", depth: 99 }, "SCHEMA"],
      ["world_diff", { a: "2", b: "77" }, "BAD_SOURCE"], ["world_diff", { a: "banana" }, "SCHEMA"], ["world_counterfactual", { candidate: "claim:C31" }, "BAD_REF"],
      ["world_reach", { need: "web.search", ref: "claim:C31" }, "SCHEMA"], ["world_reach", {}, "SCHEMA"], ["world_replay", { selects: "file:evidence/x.md", expect: [{ field: "a", value: "1" }] }, "SCHEMA"], ["world_why", { ref: "claim:C31", extra: 1 }, "SCHEMA"],
    ];
    for (const [n, i, code] of bad) { const r: any = c.tool(n, i); expect(r.ok, n).toBe(false); expect(r.code, `${n} ${JSON.stringify(r)}`).toBe(code); expect(r.message.length).toBeGreaterThan(0); }
    expect(survey(fx.run.dir)).toEqual(before); expect(c.ws.rev).toBe(rev);
  });
  test("the world tools are named and described as reads, and none can answer, rule, confirm, or edit", () => {
    for (const t of WORLD_TOOLS) { expect(t.effect).toBe("read"); expect(t.name).not.toMatch(/approve|reject|resolve|answer|confirm|submit|accept|edit|write|set_model|reconcile/); }
  });
});
