// Outcome-directed navigation: the demand sections, the Case, the affordance field, settlement, decision states, experiments, patterns.
// Each group is one invariant from the design, run against real fixture runs (the Loam and Mote walkthroughs) edited the way a lens or a
// reconciliation would have left them. The Case is derived, so every test also holds with the cockpit rebuilt from the files.
import { describe, test, expect, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fixtureRun, cleanup, calm, makeStale, addDemand, patchState, writeRun, rewriteModel, decisionArtifact, experimentFile, DEMAND } from "./helpers";
import { Cockpit } from "../../cockpit/server/core";
import { parseModel, validateModel } from "../../hooks/src/lib/md.mjs";
import * as C from "../../cockpit/server/case";
import * as L from "../../cockpit/server/learn";
import * as W from "../../cockpit/server/world";
import * as CS from "../../cockpit/server/caseSurfaces";
import { parseRef, caseAnchor } from "../../cockpit/protocol/refs";
import { SurfaceSchema, BLOCK_TYPES, SourceSchema } from "../../cockpit/protocol/spec";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";

const made: { project: string; k?: Cockpit }[] = [];
const open = (fx: { project: string }) => { const k = new Cockpit(fx.project); made.push({ project: fx.project, k }); return k; };
afterEach(() => { for (const m of made.splice(0)) { try { m.k?.close(); } catch { /* closed */ } cleanup(m.project); } });
const caseOf = (k: Cockpit, id = "run") => { const c = C.caseOf(k.worldEnv(), id); if (!c.ok) throw new Error(c.message); return c; };
const survey = (dir: string) => { const out: Record<string, string> = {}; const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === ".cockpit") continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } }; walk(dir); return out; };
const gitIn = (dir: string, ...a: string[]) => Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { cwd: dir, stdout: "pipe", stderr: "pipe" });

// ---- the model: three optional sections --------------------------------------------------------------------------------------------
describe("the Product Model's demand sections", () => {
  const modelWith = (parts: Partial<typeof DEMAND>) => { const fx = fixtureRun("loam"); calm(fx); addDemand(fx, { ...DEMAND, ...parts }); made.push({ project: fx.project }); return parseModel(fs.readFileSync(fx.run.modelPath, "utf8")); };
  test("the template a new model starts from has exactly the ten required headings, so a new run does not gain empty optional sections", () => {
    const m = parseModel(fs.readFileSync(path.join(import.meta.dir, "../../product-model/TEMPLATE.md"), "utf8"));
    expect(m.heads.length).toBe(10); expect(m.heads).not.toContain("Jobs");
  });
  test("a model without them is valid and a model with them is valid", () => {
    const fx = fixtureRun("loam"); made.push({ project: fx.project });
    expect(validateModel(parseModel(fs.readFileSync(fx.run.modelPath, "utf8")))).toEqual([]);
    expect(validateModel(modelWith({}))).toEqual([]);
  });
  test("a measured importance must carry the source it came from; anything else must be UNKNOWN", () => {
    expect(validateModel(modelWith({ criteria: DEMAND.criteria.replace("| UNKNOWN | UNKNOWN |", "| 8 | UNKNOWN |") }))[0]).toMatch(/importance must be UNKNOWN or "<number> \(<source>\)"/);
    expect(validateModel(modelWith({ criteria: DEMAND.criteria.replace("| UNKNOWN | UNKNOWN |", "| high | UNKNOWN |") }))[0]).toMatch(/importance must be UNKNOWN/);
    expect(validateModel(modelWith({ criteria: DEMAND.criteria.replace("| UNKNOWN | UNKNOWN |", "| 8 (survey:2026-03@n=40) | 3 (survey:2026-03@n=40) |") }))).toEqual([]);
  });
  test("an opportunity must recover a criterion or a job: a feature request is not one", () => {
    expect(validateModel(modelWith({ opportunities: DEMAND.opportunities.replace("| OP1 | S1 |", "| OP1 | add-a-dashboard |") }))[0]).toMatch(/basis add-a-dashboard is not a success criterion or a job/);
    expect(validateModel(modelWith({ opportunities: DEMAND.opportunities.replace("| OP1 | S1 |", "| OP1 | J1 |") }))).toEqual([]);   // a job alone is a legitimate basis
  });
  test("a criterion must judge a real job, in a known direction; a job must belong to a real actor", () => {
    expect(validateModel(modelWith({ criteria: DEMAND.criteria.replace("| S1 | J1 | minimize |", "| S1 | J9 | minimize |") }))[0]).toMatch(/judges J9/);
    expect(validateModel(modelWith({ criteria: DEMAND.criteria.replace("minimize", "delight") }))[0]).toMatch(/direction "delight"/);
    expect(validateModel(modelWith({ jobs: DEMAND.jobs.replace("| J1 | A1 |", "| J1 | A9 |") }))[0]).toMatch(/actor A9 is not in the Actors table/);
  });
  test("the sections are optional but ordered: out of order is invalid", () => {
    const fx = fixtureRun("loam"); made.push({ project: fx.project }); calm(fx);
    rewriteModel(fx, (t) => `${t.trimEnd()}\n\n## Opportunities\n\n${DEMAND.opportunities}\n## Jobs\n\n${DEMAND.jobs}`);
    expect(validateModel(parseModel(fs.readFileSync(fx.run.modelPath, "utf8")))[0]).toMatch(/optionally followed by Jobs \| Success criteria \| Opportunities/);
  });
  test("a row in them changes a version like any other, so a reader of the field goes stale", () => {
    const m = modelWith({}); expect(m.jobs.size).toBe(1); expect(m.criteria.get("S1").importance).toBe("UNKNOWN");
  });
});

describe("a success criterion is not a settlement outcome, and an opportunity is not a candidate", () => {
  test("the two vocabularies share no ref kind, no table, and no column", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx);
    expect(parseRef("criterion:S1")!.kind).toBe("criterion"); expect(parseRef("decision:D1")!.kind).toBe("decision");
    const crit: any = k.data("pa:criteria"); expect(crit.columns.map((c: any) => c.field).join()).not.toMatch(/outcome|settle|consequence/);
    const why: any = k.tool("world_why", { ref: "criterion:S1" }); expect(why.result.answers.find((a: any) => a.q === "What does it judge?").a).toMatch(/expectation, not a settlement outcome/);
  });
  test("an opportunity stays itself when a proposal names it; the proposal becomes its candidate, and accepting one is not evidence the shortfall shrank", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx);
    fs.appendFileSync(fx.run.proposalsPath, "| P99 | marketing | positioning | discovery | A weekly digest email would address OP1 | evidence/recon-software/interview-1.md | open |  |\n");
    const k = open(fx); const rows = (k.data("pa:opportunities") as any).rows;
    expect(rows[0].id).toBe("OP1"); expect(rows[0].candidates).toBe("P99"); expect(rows[0].deficiency).toMatch(/noticed only after they wilt/);
    expect(rows[0].evidence).toBe("insufficient");   // naming a candidate did not size anything
    const imp: any = k.tool("world_impact", { ref: "opportunity:OP1" }); expect(JSON.stringify(imp.result)).toContain("proposal:P99");
    const cf: any = k.tool("world_counterfactual", { candidate: "proposal:P99" });
    expect(cf.result.effects.join("\n")).toMatch(/declared as a candidate for OP1/); expect(cf.result.effects.join("\n")).toMatch(/not yet measured/);
    expect(cf.result.effects.join("\n")).toMatch(/whether the shortfall is actually reduced is observed afterwards, not settled by accepting this/);
  });
});

describe("unknown stays unknown: no market score is ever fabricated", () => {
  test("unmeasured demand is reported as insufficient, not as a number", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx);
    const crit = (k.data("pa:criteria") as any).rows[0];
    expect(crit.importance).toBe("UNKNOWN"); expect(crit.satisfaction).toBe("UNKNOWN"); expect(crit.evidence).toBe("insufficient"); expect(crit.score).toBe("UNCOMPUTED");
    const c = caseOf(k, "OP1");
    expect(c.material!.text).toMatch(/evidence insufficient/); expect(c.material!.text).toMatch(/UNCOMPUTED/);
    expect(JSON.stringify(c)).not.toMatch(/"score":\s*\d/);
  });
  test("even fully measured, no opportunity score is computed: the numbers are shown with their sources and nothing is derived from them", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx, { criteria: DEMAND.criteria.replace("| UNKNOWN | UNKNOWN |", "| 9 (survey:2026-03@n=40) | 3 (survey:2026-03@n=40) |") }); const k = open(fx);
    const crit = (k.data("pa:criteria") as any).rows[0];
    expect(crit.evidence).toBe("measured"); expect(crit.importanceValue).toBe(9); expect(crit.score).toBe("UNCOMPUTED");
    expect(caseOf(k, "OP1").settlement.reachable).toBe(true);   // measured enough to base a direction on, still the owner's call
  });
  test("a measurement route is data: the providers that could measure it are listed with their ladder, and the owner is one of them", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx);
    const r: any = k.tool("world_reach", { ref: "criterion:S1" });
    expect(r.result.needs.map((n: any) => n.capability)).toEqual(["market.interview", "market.survey", "behavior.analytics", "support.history"]);
    const rows = (k.data("world:reach?ref=criterion:S1") as any).rows;
    expect(rows.find((x: any) => x.provider === "owner").status).toBe("unproven");
    expect(rows.find((x: any) => x.provider === "posthog").status).toBe("blocked");
  });
});

// ---- the Case: derived, never stored ---------------------------------------------------------------------------------------------------
describe("the Case is derived from the run files", () => {
  test("it rebuilds identically after the cockpit's database is deleted, and the run files are untouched", () => {
    const fx = fixtureRun("mote", { stale: true, openProposals: ["P12"] }); const k = open(fx);
    const before = JSON.stringify(caseOf(k)), files = survey(fx.run.dir);
    k.close();
    for (const f of ["cockpit.db", "cockpit.db-wal", "cockpit.db-shm"]) fs.rmSync(path.join(fx.run.dir, ".cockpit", f), { force: true });
    const k2 = open(fx);
    expect(JSON.stringify(caseOf(k2))).toBe(before); expect(survey(fx.run.dir)).toEqual(files);
  });
  test("reading a Case, composing its surface, and asking for its moves write nothing to the run", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx); const files = survey(fx.run.dir);
    for (const ref of ["run", "OP1", "S1", "J1", "C4", "U1"]) for (const part of ["summary", "moves", "settlement"]) expect((k.tool("case_get", { ref, part, show: part === "summary" }) as any).ok, `${ref} ${part}`).toBe(true);
    expect(survey(fx.run.dir)).toEqual(files); expect(readInbox(fx.run)).toEqual([]);
  });
  test("only anchors that have an authoritative home are Cases; a gate, a lens, or a made-up id is not", () => {
    const fx = fixtureRun("loam"); calm(fx); const k = open(fx);
    expect(C.caseOf(k.worldEnv(), "OP9").ok).toBe(false); expect(C.caseOf(k.worldEnv(), "lens/x").ok).toBe(false); expect(caseAnchor("nonsense")).toBeNull();
    expect(caseAnchor("OP1")!.ref).toBe("opportunity:OP1"); expect(caseAnchor("evidence/marketing/x.md")!.ref).toBe("evidence:marketing/x.md");
  });
});

// ---- the affordance field -----------------------------------------------------------------------------------------------------------------
describe("the affordance field follows the evidence, and says why a move is blocked", () => {
  test("A: an obvious next move: a stale artifact makes its owning lens the primary move; settling is not foregrounded", () => {
    const fx = fixtureRun("loam"); calm(fx); makeStale(fx, "marketing/beta-page.md"); const k = open(fx); const c = caseOf(k);
    expect(c.primary).toBe("lens.start:marketing"); const p = c.field.find((m) => m.primary)!;
    expect(p.status).toBe("available"); expect(p.lane).toBe("next move"); expect(p.authority).toBe("agent"); expect(p.recovery).toMatch(/reversible/);
    const settle = c.field.find((m) => m.id === "settle")!; expect(settle.status).toBe("blocked"); expect(settle.lane).toBe("blocked"); expect(settle.blockedBy.length).toBeGreaterThan(0);
    expect(c.settlement.reachable).toBe(false); expect(c.settlement.shouldSettleNow.lean).toBe("not-yet");
  });
  test("the field changes when the prerequisite evidence changes: rebuild the artifact and the move disappears while settling opens", () => {
    const fx = fixtureRun("loam"); calm(fx); makeStale(fx, "marketing/beta-page.md"); let k = open(fx);
    expect(caseOf(k).field.some((m) => m.id === "lens.start:marketing")).toBe(true);
    const f = path.join(fx.run.artifactsDir, "marketing/beta-page.md"); fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("model@2", "model@4"));
    k.refresh();
    const c = caseOf(k); expect(c.field.some((m) => m.id === "lens.start:marketing")).toBe(false); expect(c.settlement.reachable).toBe(true);
    expect(c.field.find((m) => m.id === "settle")!.status).toBe("available");
  });
  test("a move whose prerequisites are unmet is blocked, with the unmet need named, never offered as available", () => {
    const fx = fixtureRun("loam"); calm(fx); makeStale(fx, "marketing/beta-page.md"); makeStale(fx, "brand/identity.md"); const k = open(fx); const c = caseOf(k);
    const m = c.field.find((x) => x.id === "lens.start:marketing");
    if (m && m.status === "blocked") expect(m.blockedBy.map((b) => b.text).join()).toMatch(/lens brand/);
    for (const x of c.field) if (x.status === "available") expect(x.requires.every((r) => r.met), x.id).toBe(true);
  });
  test("B: evidence outranks the wish: a contradiction the build rests on leads, settling stays out of reach, and no language smooths it", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx); const c = caseOf(k);
    expect(c.material!.severity).toBe("interrupt"); expect(c.material!.kind).toBe("contradiction"); expect(c.material!.text).toMatch(/CONTRADICTED/);
    expect(c.field.find((m) => m.primary)!.op).toBe("inspect");
    expect(c.field.find((m) => m.id === "settle")!.status).toBe("blocked"); expect(c.settlement.destinationAttained).not.toBe(true);
    const words = JSON.stringify([C.caseStateRows(c), C.caseMoveRows(c), c.settlement]);
    expect(words).not.toMatch(/almost|nearly|on track|great|good news|ready to ship|looking good|you've got this|congrat/i);
    expect(c.deviations.filter((d) => d.kind === "contradiction").length).toBeGreaterThan(3);   // none of them was dropped to keep the view small
  });
  test("C: settling is reachable and optional work remains: the two are shown apart, nothing is chosen for the owner, and nothing closes", () => {
    const fx = fixtureRun("loam"); calm(fx); const k = open(fx); const before = survey(fx.run.dir); const c = caseOf(k);
    expect(c.settlement.reachable).toBe(true); expect(c.settlement.optionalCount).toBeGreaterThan(0);
    expect(c.primary).toBeNull();   // the owner is choosing, so no move is marked
    expect(c.settlement.shouldSettleNow.call).toBe("owner"); expect(c.settlement.shouldSettleNow.lean).toBe("weigh");
    const lanes = new Set(c.field.map((m) => m.lane)); expect(lanes.has("choose")).toBe(true); expect(lanes.has("next move")).toBe(false);
    expect(c.field.find((m) => m.id === "settle")!.status).toBe("available");
    const rows = C.caseStateRows(c); expect(rows.find((r) => r.id === "settlement")!.answer).toMatch(/^Reachable\..*optional move\(s\) remain.*your judgment/);
    expect(survey(fx.run.dir)).toEqual(before);
  });
  test("settlementReachable and shouldSettleNow are different questions: reachable can be true while the lean is still to weigh, and it is never an instruction", () => {
    const fx = fixtureRun("loam"); calm(fx); const k = open(fx); const s = caseOf(k).settlement;
    expect(s.reachable).toBe(true); expect(s.shouldSettleNow.lean).not.toBe("nothing-to-weigh");
    expect(["not-yet", "weigh", "nothing-to-weigh"]).toContain(s.shouldSettleNow.lean);
    expect(JSON.stringify(s)).not.toMatch(/"lean":"(settle|yes|go|close)"/);
    const blocked = open(fixtureRun("mote", { stale: true })); expect(caseOf(blocked).settlement.reachable).toBe(false);
  });
  test("D: authority unavailable: the blocked move says so, names the authority, and the moves that can still be made are listed", () => {
    const fx = fixtureRun("loam"); calm(fx); patchState(fx, (s) => { s.paused = { reason: "owner sign-off needed", at: new Date().toISOString() }; }); const k = open(fx); const c = caseOf(k);
    const settle = c.field.find((m) => m.id === "settle")!;
    expect(settle.status).toBe("blocked"); expect(settle.authority).toBe("owner"); expect(settle.blockedBy.map((b) => b.text).join()).toMatch(/authority unavailable: the run is paused for the owner \(owner sign-off needed\)/);
    expect(c.field.find((m) => m.primary)!.op).toBe("owner.respond");
    expect(c.field.some((m) => m.status === "available" && m.op !== "owner.respond")).toBe(true);   // meanwhile, other things can still be done
  });
  test("every blocked move says why, and says what would reach it where a provider or a prerequisite exists", () => {
    for (const fx of [fixtureRun("mote", { stale: true, openProposals: ["P12"] }), (() => { const f = fixtureRun("loam"); calm(f); addDemand(f); return f; })()]) {
      const k = open(fx);
      for (const id of ["run", "OP1"]) { const c = C.caseOf(k.worldEnv(), id); if (!c.ok) continue; for (const m of c.field.filter((x) => x.status === "blocked")) { expect(m.blockedBy.length, `${id} ${m.id}`).toBeGreaterThan(0); if (m.reach) expect(m.reach.next, m.id).toBeTruthy(); } }
    }
  });
  test("at most one primary move; it is never blocked; it is never the settling move", () => {
    const runs = [fixtureRun("mote", { stale: true, openProposals: ["P12"] }), fixtureRun("loam"), (() => { const f = fixtureRun("loam"); calm(f); makeStale(f, "marketing/beta-page.md"); return f; })(), (() => { const f = fixtureRun("loam"); calm(f); addDemand(f); return f; })()];
    for (const fx of runs) { const k = open(fx); for (const id of ["run", "OP1", "S1", "J1", "C4", "U1"]) { const c = C.caseOf(k.worldEnv(), id); if (!c.ok) continue; const prim = c.field.filter((m) => m.primary); expect(prim.length, id).toBeLessThanOrEqual(1); for (const m of prim) { expect(m.status).toBe("available"); expect(["settle", "rule"]).not.toContain(m.op); expect(m.lane).toBe("next move"); } } }
  });
  test("a payment is a measured fact or 'unknown'; it is never invented", () => {
    const fx = fixtureRun("loam"); calm(fx); makeStale(fx, "marketing/beta-page.md"); const k = open(fx);
    for (const m of caseOf(k).field) { if (m.payment.basis === "unknown") expect(m.payment.estimate).toBe("unknown"); else expect(m.payment.estimate).toMatch(/median of \d+ earlier run|instant/); }
  });
  test("successors are shown only as far as the move: at most a few, never a workflow map", () => {
    const fx = fixtureRun("loam"); calm(fx); makeStale(fx, "marketing/beta-page.md"); const k = open(fx); const g: any = k.data("graph:case");
    expect(g.nodes.length).toBeLessThan(14); expect(g.nodes.some((n: any) => n.kind === "move")).toBe(true);
  });
});

// ---- demand: opportunity case ------------------------------------------------------------------------------------------------------------------------
describe("E: an opportunity with missing market evidence", () => {
  test("the Case says the evidence is insufficient, offers ways to acquire it, and refuses to take the opportunity as direction yet", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx); const c = caseOf(k, "OP1");
    expect(c.purpose.text).toMatch(/minimize time to notice a dry plant/); expect(c.material!.kind).toBe("unmeasured");
    const p = c.field.find((m) => m.primary)!; expect(p.op).toMatch(/^observe\./); expect(p.reach!.capability).toMatch(/^market\./);
    expect(c.field.find((m) => m.id === "accept")!.status).toBe("blocked"); expect(c.settlement.reachable).toBe(false);
    expect(c.field.some((m) => m.op === "propose" && m.status === "available")).toBe(true);   // a candidate can still be drafted; the measuring comes first
  });
  test("a candidate and its opportunity are different rows, and a job with no success criterion is called out", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx, { criteria: "| id | job | direction | measure | object | context | importance | satisfaction | grade | source |\n|---|---|---|---|---|---|---|---|---|---|\n", opportunities: "| id | basis | deficiency | alternatives | grade | source |\n|---|---|---|---|---|---|\n" }); const k = open(fx);
    const c = caseOf(k, "J1"); expect(c.material!.text).toMatch(/no success criterion says how it is judged/);
  });
});

// ---- decision state -----------------------------------------------------------------------------------------------------------------------------------
describe("F: a DecisionState belongs to a situation, never to a person", () => {
  const rows = ["| OP1 | A1 | J1 | the owner is leaving for a week | the last plant died | a reminder that knows the soil | another thing to set up | poking the soil | REPORTED | evidence/recon-software/interview-1.md |", "| run | A1 | J1 | the owner is demoing to a friend | embarrassment | looks like it just works | looks gimmicky | showing by hand | INFERRED | evidence/recon-software/interview-2.md |"];
  test("the same actor and job in two Cases have different states, and the Product Model never records either", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); writeRun(fx, "artifacts/marketing/decision-states.md", decisionArtifact(rows)); const k = open(fx);
    const ds = L.decisionStates(k.worldEnv());
    expect(ds.rows.length).toBe(2); expect(ds.rows.every((r) => r.issues.length === 0)).toBe(true);
    const [a, b] = [ds.forCase("OP1")[0], ds.forCase("run")[0]];
    expect([a.actor, a.job]).toEqual([b.actor, b.job]); expect(a.trigger).not.toBe(b.trigger); expect(a.anxiety).not.toBe(b.anxiety);
    expect(fs.readFileSync(fx.run.modelPath, "utf8")).not.toMatch(/anxiety|\| trigger \||decision.?state|salience/i);
    expect((k.data("pa:decision-states?case=OP1") as any).rows.length).toBe(1);
    expect(caseOf(k, "OP1").decisionStates.length).toBe(1); expect(caseOf(k).decisionStates.length).toBe(1);
  });
  test("an inferred state is marked inferred; a state with a quoted source is not", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); writeRun(fx, "artifacts/marketing/decision-states.md", decisionArtifact(rows)); const k = open(fx);
    const ds = L.decisionStates(k.worldEnv()); expect(ds.forCase("OP1")[0].inferred).toBe(false); expect(ds.forCase("run")[0].inferred).toBe(true);
    expect((k.data("pa:decision-states") as any).rows.map((r: any) => r.kind).sort()).toEqual(["direct", "inferred"]);
  });
  test("a table that tries to label a person (persona, type, segment, mindstate) is not read at all", () => {
    for (const col of ["persona", "type", "segment", "mindstate"]) {
      const fx = fixtureRun("loam"); calm(fx); addDemand(fx);
      writeRun(fx, "artifacts/marketing/decision-states.md", decisionArtifact(rows.map((r) => `${r} cautious |`), ` ${col} |`));
      const k = open(fx); const ds = L.decisionStates(k.worldEnv());
      expect(ds.rows.length, col).toBe(0); expect(ds.issues[0].message, col).toMatch(/describes a situation, so it cannot label a person/);
    }
  });
  test("rows with no trigger, no evidence, a bad Case, or a job that belongs to another actor are flagged invalid", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx);
    writeRun(fx, "artifacts/marketing/decision-states.md", decisionArtifact(["| nowhere | A1 | J1 |  | x | y | z | w | REPORTED | evidence/a |", "| run | A2 | J1 | t | x | y | z | w | REPORTED |  |"])); const k = open(fx);
    const ds = L.decisionStates(k.worldEnv()).rows;
    expect(ds[0].issues.join()).toMatch(/not a Case anchor/); expect(ds[0].issues.join()).toMatch(/no trigger/); expect(ds[1].issues.join()).toMatch(/belongs to A1, not A2/); expect(ds[1].issues.join()).toMatch(/no evidence/);
  });
});

// ---- experiments and durable learning ------------------------------------------------------------------------------------------------------------
describe("experiments and patterns: one result is not a durable learning", () => {
  const pass = ["| control-led | 4.0 | 1 |"], fail = ["| control-led | -2.0 | 1 |"];
  const run = (exps: ReturnType<typeof experimentFile>[], claimSource: string) => {
    const fx = fixtureRun("loam"); calm(fx);
    for (const e of exps) writeRun(fx, e.rel, e.text);
    rewriteModel(fx, (t) => t.replace(/^\| C10 \|.*$/m, `| C10 | Leading with control raises qualified signups | REPORTED | ${claimSource} |`));
    return open(fx);
  };
  test("G: one successful experiment is a result, and the system says it is not a pattern", () => {
    const a = experimentFile({ name: "trust-a", scope: "smb", rows: pass }); const k = run([a], `${a.rel} (supports)`);
    const e = L.experiments(k.worldEnv())[0]; expect(e.state).toBe("observed"); expect(e.direction).toBe("supports"); expect(e.frozen).toBe("frozen");
    const p = L.patterns(k.worldEnv()).find((x) => x.id === "C10")!; expect(p.status).toBe("single-result"); expect(p.summary).toMatch(/an outcome, not a durable learning/);
  });
  test("support in two settings, none contradicting, is a supported pattern; support in one setting is only emerging", () => {
    const [a, b, c] = [experimentFile({ name: "t-a", scope: "smb", rows: pass }), experimentFile({ name: "t-b", scope: "enterprise", rows: pass }), experimentFile({ name: "t-c", scope: "smb", rows: pass })];
    const two = run([a, b], `${a.rel} (supports); ${b.rel} (supports)`); expect(L.patterns(two.worldEnv()).find((x) => x.id === "C10")!.status).toBe("supported");
    const same = run([a, c], `${a.rel} (supports); ${c.rel} (supports)`); const p = L.patterns(same.worldEnv()).find((x) => x.id === "C10")!;
    expect(p.status).toBe("emerging"); expect(p.variationCovered).toEqual(["smb"]);
  });
  test("H: contradicting evidence survives: a pattern with a failing experiment is contested, both sides are listed, and nothing is averaged", () => {
    const [a, b, f] = [experimentFile({ name: "t-a", scope: "smb", rows: pass }), experimentFile({ name: "t-b", scope: "enterprise", rows: pass }), experimentFile({ name: "t-f", scope: "consumer", rows: fail })];
    const k = run([a, b, f], `${a.rel} (supports); ${b.rel} (supports); ${f.rel} (contradicts)`); const p = L.patterns(k.worldEnv()).find((x) => x.id === "C10")!;
    expect(p.status).toBe("contested"); expect(p.supporting.length).toBe(2); expect(p.contradicting).toEqual([`evidence:${f.rel.replace("evidence/", "")}`]); expect(p.summary).toMatch(/kept side by side, not averaged/);
    const row = (k.data("pa:patterns") as any).rows.find((r: any) => r.id === "C10"); expect(row.status).toBe("contested"); expect(row.supports).toBe(2); expect(row.contradicts).toBe(1);
  });
  test("a label cannot hide a failed observer: marking a failed experiment (supports) is overridden and noted", () => {
    const [a, f] = [experimentFile({ name: "t-a", scope: "smb", rows: pass }), experimentFile({ name: "t-f", scope: "consumer", rows: fail })];
    const k = run([a, f], `${a.rel} (supports); ${f.rel} (supports)`); const p = L.patterns(k.worldEnv()).find((x) => x.id === "C10")!;
    expect(p.status).toBe("contested"); expect(p.issues.join()).toMatch(/marked \(supports\) but its frozen criterion failed/);
  });
  test("an experiment whose criterion was not frozen, or was edited after the freeze, cannot count as support", () => {
    const unfrozen = experimentFile({ name: "u", scope: "smb", rows: pass, frozen: false }), edited = experimentFile({ name: "e", scope: "enterprise", rows: pass, frozen: "obs-0000000000" });
    const k = run([unfrozen, edited], `${unfrozen.rel} (supports); ${edited.rel} (supports)`); const exps = L.experiments(k.worldEnv());
    expect(exps.find((e) => e.name === "u")!.frozen).toBe("unfrozen"); expect(exps.find((e) => e.name === "e")!.frozen).toBe("changed");
    const p = L.patterns(k.worldEnv()).find((x) => x.id === "C10")!; expect(p.supporting.length).toBe(0); expect(p.cited.length).toBe(2); expect(p.status).toBe("single-result");
    expect(exps.find((e) => e.name === "e")!.issues.join()).toMatch(/edited after the freeze/);
  });
  test("an experiment with no result rows is designed, not observed, and an empty selection is never a pass", () => {
    const d = experimentFile({ name: "d", scope: "smb" }); const k = run([d], "x"); const e = L.experiments(k.worldEnv())[0];
    expect(e.state).toBe("designed"); expect(e.result).toBe("not-selected"); expect(e.direction).toBe("none");
  });
  test("an experiment is a Case of its own: its hypothesis is the destination and its unfrozen criterion is the deviation", () => {
    const u = experimentFile({ name: "u", scope: "smb", frozen: false }); const k = run([u], "x"); const c = caseOf(k, `evidence/${u.rel.replace("evidence/", "")}`);
    expect(c.purpose.text).toMatch(/learn whether: if the message leads with control/); expect(c.material!.kind).toBe("unfrozen"); expect(c.settlement.reachable).toBe(false);
  });
  test("looking before paying again: prior knowledge finds the pattern, and an empty answer says the record is empty, not that nothing is known", () => {
    const [a, b] = [experimentFile({ name: "t-a", scope: "smb", rows: pass }), experimentFile({ name: "t-b", scope: "enterprise", rows: pass })];
    const k = run([a, b], `${a.rel} (supports); ${b.rel} (supports)`);
    const hit = L.prior(k.worldEnv(), "does leading with control raise qualified signups"); expect(hit.hits[0].kind).toBe("pattern"); expect(hit.hits[0].status).toBe("supported");
    const none = L.prior(k.worldEnv(), "pricing page typography"); expect(none.hits).toEqual([]); expect(none.note).toMatch(/nothing is recorded here, not that nothing is known/);
    const t: any = k.tool("case_get", { part: "prior", q: "leading with control" }); expect(t.result.hits.length).toBeGreaterThan(0);
  });
  test("git orders the freeze against the results: criterion first is recorded, results first is an interrupting deviation", () => {
    const ok = experimentFile({ name: "ok", scope: "smb", rows: pass }), late = experimentFile({ name: "late", scope: "smb", rows: pass });
    const fx = fixtureRun("loam"); calm(fx); made.push({ project: fx.project });
    gitIn(fx.project, "init", "-q");
    writeRun(fx, ok.rel, ok.text.replace(/\| control-led.*\n/, "")); writeRun(fx, late.rel, late.text.replace(/^frozen:.*\n/m, ""));
    gitIn(fx.project, "add", "-A"); gitIn(fx.project, "commit", "-q", "-m", "freeze one, results of the other");
    writeRun(fx, ok.rel, ok.text); writeRun(fx, late.rel, late.text);   // results arrive for both; only `late` gets its freeze after them
    const lateNoFreeze = late.text.replace(/^frozen:.*\n/m, ""); writeRun(fx, late.rel, lateNoFreeze);
    gitIn(fx.project, "add", "-A"); gitIn(fx.project, "commit", "-q", "-m", "results");
    writeRun(fx, late.rel, late.text); gitIn(fx.project, "add", "-A"); gitIn(fx.project, "commit", "-q", "-m", "freeze, too late");
    const k = open(fx); const exps = L.experiments(k.worldEnv());
    expect(exps.find((e) => e.name === "ok")!.ordering).toBe("frozen-first"); expect(exps.find((e) => e.name === "late")!.ordering).toBe("results-first");
    expect(exps.find((e) => e.name === "late")!.issues.join()).toMatch(/result rows were committed before the criterion was frozen/);
    expect(caseOf(k, "evidence/marketing/late.md").material!.severity).toBe("interrupt");
  });
  test("without git the order is simply unavailable, never guessed", () => {
    const a = experimentFile({ name: "t-a", scope: "smb", rows: pass }); const k = run([a], "x"); expect(L.experiments(k.worldEnv())[0].ordering).toBe("unavailable");
  });
});

// ---- the world debugger sees the new entities ---------------------------------------------------------------------------------------------------------
describe("the new refs take part in why, impact, diff, reach, and counterfactual, and only where the run records something", () => {
  test("why answers for a job, a criterion, an opportunity, and a Case, each with its basis; unrecorded things say unavailable", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx);
    for (const ref of ["job:J1", "criterion:S1", "opportunity:OP1", "case:run", "case:OP1", "actor:A1"]) { const r: any = k.tool("world_why", { ref }); expect(r.ok, ref).toBe(true); expect(r.result.answers.length, ref).toBeGreaterThan(2); for (const a of r.result.answers) expect(["recorded", "derived", "unavailable"]).toContain(a.basis); }
    const op: any = k.tool("world_why", { ref: "opportunity:OP1" }); const sup = op.result.answers.find((a: any) => a.q === "What supports it?");
    expect(sup.a).toMatch(/exposes|no recorded evidence/);
    expect((k.tool("world_why", { ref: "actor:A1" }) as any).result.answers.find((a: any) => a.q === "Is a mindset or type recorded?").a).toMatch(/never to the actor/);
  });
  test("impact connects actor, job, criterion, opportunity and its candidates, and a recorded evidence file appears only when the source names it", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx);
    const down: any = k.tool("world_impact", { ref: "actor:A1", depth: 4 }); const refs = JSON.stringify(down.result);
    for (const r of ["job:J1", "criterion:S1", "opportunity:OP1"]) expect(refs).toContain(r);
    expect(JSON.stringify((k.tool("world_impact", { ref: "opportunity:OP1", dir: "up", depth: 3 }) as any).result)).not.toMatch(/evidence:recon-software\/interview-1\.md/);   // that file does not exist in this run
    writeRun(fx, "evidence/recon-software/interview-1.md", "Quote: I check the pots every morning.\n"); k.refresh();
    expect(JSON.stringify((k.tool("world_impact", { ref: "opportunity:OP1", dir: "up", depth: 3 }) as any).result)).toContain("evidence:recon-software/interview-1.md");
  });
  test("diff and timeline see the rows, and a world without them differs from one with them", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx);
    const d: any = k.tool("world_diff", { a: "3", b: "current" }); expect(d.result.changes.join("\n")).toMatch(/added job:J1/); expect(d.result.changes.join("\n")).toMatch(/added opportunity:OP1/);
    const old = W.worlds(k.worldEnv()).load(3)!; expect(old.identity.digest.covers.join()).not.toMatch(/success criteria/);
    expect(W.worlds(k.worldEnv()).load("current")!.identity.digest.covers.join()).toMatch(/success criteria/);
  });
  test("a model without the sections keeps the digest it always had", () => {
    const fx = fixtureRun("loam"); const k = open(fx);
    expect(W.worlds(k.worldEnv()).load("current")!.identity.digest.covers).toEqual(["claims", "unknowns", "decisions (without version)", "capabilities", "narrative sections"]);
  });
});

// ---- authority ----------------------------------------------------------------------------------------------------------------------------------------------
describe("none of this lets anyone speak as the owner or mutate truth", () => {
  test("case_get accepts no field that rules, answers, settles, or writes; extra fields are refused and nothing changes", () => {
    const fx = fixtureRun("loam"); calm(fx); addDemand(fx); const k = open(fx); const files = survey(fx.run.dir);
    for (const input of [{ ruling: "accept" }, { settle: true }, { apply: true }, { answer: "yes" }, { ref: "OP1", accept: true }, { ref: "../../etc" }, { part: "everything" }]) { const r: any = k.tool("case_get", input); expect(r.ok, JSON.stringify(input)).toBe(false); }
    expect(survey(fx.run.dir)).toEqual(files); expect(readInbox(fx.run)).toEqual([]);
  });
  test("the primary move is guidance: marking it does not run it, and no tool performs a Case move", () => {
    const fx = fixtureRun("loam"); calm(fx); makeStale(fx, "marketing/beta-page.md"); const k = open(fx); const files = survey(fx.run.dir);
    const r: any = k.tool("case_get", { show: true }); expect(r.result.primary.move).toMatch(/Run lens marketing/); expect(r.result.note).toMatch(/guidance, not authority/);
    expect(survey(fx.run.dir)).toEqual(files);   // showing the surface ran nothing
  });
  test("a historical viewport never replaces the current Case: viewing model@2 leaves the Case at the current world", () => {
    const fx = fixtureRun("mote", { stale: true }); const k = open(fx);
    k.agent({ op: "surface.put", surface: { id: "then", title: "Then", blocks: [{ type: "table", id: "t", source: "pa:claims?at=2" }] } });
    expect((k.context() as any).world.mode).toBe("historical"); const c = caseOf(k); expect(c.world).toBe("model@6"); expect(k.rail().version).toBe(6);
  });
});

// ---- the surfaces are the existing grammar ---------------------------------------------------------------------------------------------------------------
describe("the views are compositions of the existing fifteen blocks", () => {
  test("Case, Opportunity, and Decision surfaces validate, use only existing block types and valid sources, and never add a block", () => {
        for (const s of [CS.caseSurface("run"), CS.caseSurface("U1"), CS.opportunitySurface("OP1"), CS.decisionSurface("run"), CS.surfaceFor("S1")]) {
      const parsed = SurfaceSchema.safeParse(s); expect(parsed.success, s.id + (parsed.success ? "" : JSON.stringify((parsed as any).error.issues[0]))).toBe(true);
      for (const b of s.blocks as any[]) { expect(BLOCK_TYPES as readonly string[]).toContain(b.type); if (b.source) expect(SourceSchema.safeParse(b.source).success, b.source).toBe(true); }
    }
    expect(BLOCK_TYPES.length).toBe(15);
  });
  test("every Case source resolves, and each table of moves puts the primary move first, in its own lane", () => {
    const fx = fixtureRun("loam"); calm(fx); makeStale(fx, "marketing/beta-page.md"); addDemand(fx); const k = open(fx);
    for (const s of ["case:state", "case:affordances", "case:settlement", "case:state?ref=OP1", "case:affordances?ref=OP1", "case:settlement?ref=S1", "graph:case", "graph:case?ref=OP1", "pa:jobs", "pa:criteria", "pa:opportunities", "pa:decision-states", "pa:experiments", "pa:patterns"]) expect((k.data(s) as any).kind, s).not.toBe("error");
    const rows = (k.data("case:affordances") as any).rows; expect(rows[0].primary).toBe("primary"); expect(rows.filter((r: any) => r.primary).length).toBe(1); expect(rows[0].lane).toBe("next move");
    const lanes = rows.map((r: any) => r.lane); expect(lanes.indexOf("blocked")).toBeGreaterThan(lanes.lastIndexOf("next move"));
  });
  test("the opening surface is quiet when the run is healthy: no deviation row shouts, and nothing is marked primary", () => {
    const fx = fixtureRun("loam"); calm(fx); patchState(fx, () => {}); rewriteModel(fx, (t) => t); const k = open(fx);
    const rows = (k.data("case:state") as any).rows; const dev = rows.find((r: any) => r.id === "deviation");
    expect(["quiet", "salient"]).toContain(dev.signal); expect(dev.signal).not.toBe("interrupt");
  });
  test("the empty workspace offers the Case first, then at most three other things", () => {
    const fx = fixtureRun("mote", { stale: true, openProposals: ["P12"] }); const k = open(fx); const h = (k.snapshot() as any).hints;
    expect(h[0].template).toBe("case"); expect(h.length).toBeLessThanOrEqual(4);
    const r = k.human({ op: "human.open", template: "case" }); expect(r.ok).toBe(true); expect(Object.keys(k.ws.panels)).toContain("case-run");
    expect(readInbox(fx.run)).toEqual([]);   // opening a view is layout, not authority
  });
});
