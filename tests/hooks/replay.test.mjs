// Replays tests/walkthrough (the Loam transcript) through the real state machine and hook engine.
// If the process could not be run cleanly, the design would be wrong; this is that check, mechanically.
import { test, describe } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sandbox, ctx, walk, addProposals, resolveProposals, CHOSEN, EXCLUDE, WALK, P } from "./helpers.mjs";

const throwsMsg = (fn, re) => assert.throws(fn, (e) => { assert.match(e.message, re); return true; });
const denied = (d, re) => { assert.ok(d?.deny, `expected a denial, got ${JSON.stringify(d)}`); if (re) assert.match(d.deny, re); };

describe("Loam walkthrough, end to end", () => {
  const project = sandbox();
  const c = ctx(project);

  test("no run: hooks are silent; an actualize prompt gets a nudge", () => {
    assert.equal(c.ev("session_start"), null);
    assert.equal(c.ev("prompt", { prompt: "fix the typo in README" }), null);
    assert.match(c.ev("prompt", { prompt: "please help me actualize this product" }).context, /begin --goal/);
    assert.equal(c.write("src/app.js", "x"), null);
  });

  test("begin opens a run; hooks now inject status", () => {
    throwsMsg(() => c.cmd.begin({ goal: "short", bar: "beta" }), /goal is required/);
    throwsMsg(() => c.cmd.begin({ goal: "closed-beta signup page, text only", bar: "nope" }), /--bar/);
    c.cmd.begin({ goal: "closed-beta signup page, text only, for about 50 people", bar: "beta" });
    assert.match(c.ev("session_start").context, /run active.*bar: beta.*model@0/s);
    assert.match(c.ev("prompt", { prompt: "go" }).context, /Next: classify evidence/);
  });

  test("product files, the model, and lens bodies are gated before a lens runs", () => {
    denied(c.write("src/app.js", "x"), /only inside a lens run/);
    denied(c.write("actualize/product-model.md", "x"), /only inside a reconciliation/);
    denied(c.write("actualize/state.json", "{}"), /managed by the process CLI/);
    denied(c.bash("echo hi > actualize/product-model.md"), /reconciliation/);
    denied(c.bash("rm -rf actualize/history"), /managed/);
    denied(c.read(path.join(P.loadLenses()["brand"].file)), /lens start brand/);
    denied(c.bash(`cat ${P.loadLenses()["brand"].file}`), /lens start brand/);
    assert.equal(c.read(path.join(project, "src", "app.js")), null);
    assert.equal(c.bash(`node ${path.join(WALK, "..", "..", "hooks", "src", "cli.mjs")} status`), null);
  });

  test("select: closure, reasons, final gate, recon required", () => {
    throwsMsg(() => c.cmd.select({ chosen: CHOSEN, exclude: {} }), /exclusion reason for each unselected lens/);
    throwsMsg(() => c.cmd.select({ chosen: CHOSEN.filter((x) => x !== "release-readiness"), exclude: { ...EXCLUDE, "release-readiness": "skip it because we are in a hurry" } }), /must always be selected/);
    throwsMsg(() => c.cmd.select({ chosen: ["marketing", "release-readiness"], exclude: { ...EXCLUDE, brand: "not part of the beta", "recon-software": "no code to read", "recon-physical": "no files to read", "provenance-licensing": "nothing ships yet" } }), /recon-\*/);
    throwsMsg(() => c.cmd.select({ chosen: CHOSEN.filter((x) => x !== "brand"), exclude: { ...EXCLUDE, brand: "positioning is already known" } }), /marketing needs brand/);
    throwsMsg(() => c.cmd.select({ chosen: CHOSEN, exclude: { ...EXCLUDE, direction: "no" } }), /specific/);
    const waves = c.cmd.select({ chosen: CHOSEN, exclude: EXCLUDE });
    assert.deepEqual(waves, [["brand", "provenance-licensing", "recon-physical", "recon-software", "release-readiness"], ["marketing"]]);
  });

  test("order: no downstream lens before the model exists; excluded lenses cannot run", () => {
    throwsMsg(() => c.cmd.lensStart("brand"), /before the model exists/);
    throwsMsg(() => c.cmd.lensStart("direction"), /not in the selection/);
    throwsMsg(() => c.cmd.lensStart("marketing"), /before the model exists/);
  });

  test("wave 1: recon lenses run in parallel inside their write scopes", () => {
    const r1 = c.cmd.lensStart("recon-software");
    assert.match(r1.body, /# Recon: software/);
    c.cmd.lensStart("recon-physical");
    assert.equal(c.read(path.join(project, "src", "app.js")), null);
    assert.equal(c.write("actualize/evidence/recon-software/trace.md", walk("evidence/recon-software/trace.md")), null);
    denied(c.write("actualize/evidence/brand/notes.md", "x"), /lens "brand" is not running/);
    denied(c.write("actualize/artifacts/recon-software/x.md", "x"), /cannot exist|fails artifact rules|no model/);
    assert.equal(c.write("actualize/proposals.md", "x"), null);
    denied(c.write("actualize/product-model.md", "x"), /reconciliation/);
    throwsMsg(() => c.cmd.lensDone("recon-software"), /produced no proposals/);
    c.put("actualize/evidence/recon-software/trace.md", walk("evidence/recon-software/trace.md"));
    c.put("actualize/evidence/recon-physical/inventory.md", walk("evidence/recon-physical/inventory.md"));
    addProposals(c, ["P1", "P2", "P3"]);
    c.cmd.lensDone("recon-software");
    addProposals(c, ["P4", "P5"]);
    c.cmd.lensDone("recon-physical");
  });

  test("stop is blocked until the wave is reconciled", () => {
    const d = c.stop();
    assert.ok(d.block, "stop should be blocked");
    assert.match(d.block, /not yet in the model|reconcile start/);
  });

  test("reconciliation 1: model is created, validated, snapshotted", () => {
    const r = c.cmd.reconStart();
    assert.equal(r.created, true);
    assert.equal(c.write("actualize/product-model.md", walk("model-v1.md").replace("model_version: 1", "model_version: 1")), null);
    throwsMsg(() => c.cmd.reconDone(), /unfilled template placeholder|still open|template/);
    c.put("actualize/product-model.md", walk("model-v1.md"));
    throwsMsg(() => c.cmd.reconDone(), /still open/);
    resolveProposals(c);
    const done = c.cmd.reconDone();
    assert.equal(done.version, 1);
    assert.ok(fs.existsSync(c.rel("actualize/history/model-v1.md")));
    assert.deepEqual(done.stale, []);
  });

  test("tampering with the model outside a reconciliation is denied and detected", () => {
    denied(c.write("actualize/product-model.md", "x"), /reconciliation/);
    denied(c.edit("actualize/product-model.md"), /reconciliation/);
    fs.appendFileSync(c.rel("actualize/product-model.md"), "\nsneaky edit\n");
    assert.match(c.post("actualize/product-model.md").feedback, /changed outside a reconciliation/);
    assert.ok(c.cmd.gate().blockers.some((b) => b.code === "model-tampered"));
    P.restoreModel(c.get().run, c.get().state);
    assert.ok(!c.cmd.gate().blockers.some((b) => b.code === "model-tampered"));
  });

  test("wave 2: brand and provenance-licensing propose; reconcile to v2", () => {
    throwsMsg(() => c.cmd.lensStart("marketing"), /needs brand/);
    c.cmd.lensStart("brand");
    c.cmd.lensStart("provenance-licensing");
    addProposals(c, ["P6", "P7", "P8"]);
    c.cmd.lensDone("brand");
    addProposals(c, ["P9", "P10"]);
    c.cmd.lensDone("provenance-licensing");
    c.cmd.reconStart();
    // an unlogged change is refused: edit fields without naming them in `touched`
    c.put("actualize/product-model.md", walk("model-v2.md").replace("| D4 | ", "| D4 | ").replace(/\| positioning \| 2 \|/, "| constraints | 2 |"));
    resolveProposals(c);
    throwsMsg(() => c.cmd.reconDone(), /must name what changed in `touched`: positioning/);
    c.put("actualize/product-model.md", walk("model-v2.md").replace(/model_version: 2/, "model_version: 3"));
    throwsMsg(() => c.cmd.reconDone(), /model_version must be 2/);
    c.put("actualize/product-model.md", walk("model-v2.md"));
    const done = c.cmd.reconDone();
    assert.equal(done.version, 2);
  });

  test("field-defining lenses build artifacts after reconciliation, at the new version", () => {
    c.cmd.lensStart("brand");
    const good = walk("artifacts/brand/identity.md");
    denied(c.write("actualize/artifacts/brand/identity.md", good.replace("model@2", "model@1")), /model@1 but the model is at version 2/);
    denied(c.write("actualize/artifacts/brand/identity.md", good.replace("cites: [C1, C2, C13]", "cites: [C1, C2, C13, C5]")), /C5|never cites/);
    denied(c.write("actualize/artifacts/brand/identity.md", good.replace("reads: [purpose, actors, positioning, voice, claims]", "reads: [purpose, form]")), /outside this lens's declared reads/);
    denied(c.write("actualize/artifacts/marketing/page.md", good), /lens "marketing" is not running/);
    assert.equal(c.write("actualize/artifacts/brand/identity.md", good), null);
    c.put("actualize/artifacts/brand/identity.md", good);
    c.cmd.lensDone("brand");
    c.cmd.lensStart("provenance-licensing");
    c.put("actualize/artifacts/provenance-licensing/ledger.md", walk("artifacts/provenance-licensing/ledger.md"));
    c.cmd.lensDone("provenance-licensing");
  });

  test("wave 3: marketing; public artifacts may only cite OBSERVED or VERIFIED", () => {
    c.cmd.lensStart("marketing");
    const page = fs.readFileSync(path.join(WALK, "history", "beta-page@2.md"), "utf8");
    denied(c.write("actualize/artifacts/marketing/beta-page.md", page.replace("[C1][C2]", "[C1][C2][C7]").replace("cites: [C1, C2, C3, C4, C13]", "cites: [C1, C2, C3, C4, C7, C13]")), /graded REPORTED/);
    assert.equal(c.write("actualize/artifacts/marketing/beta-page.md", page), null);
    c.put("actualize/artifacts/marketing/beta-page.md", page);
    addProposals(c, ["P11", "P12"]);
    c.cmd.lensDone("marketing");
  });

  test("reconciliation 3: a lazy rejection reason is refused; staleness narrows", () => {
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v3.md"));
    resolveProposals(c, { P11: { status: "rejected", reason: "not needed" } });
    throwsMsg(() => c.cmd.reconDone(), /P11: rejection needs a specific reason/);
    resolveProposals(c, { P11: { status: "rejected", reason: "Rests on C5 (SMS), graded CONTRADICTED: README states it, alerts.py:23-25 raises NotImplementedError. 'Only' has no evidence about any competitor." } });
    const done = c.cmd.reconDone();
    assert.equal(done.version, 3);
    assert.deepEqual(done.stale, [], "D9 touched only unknowns, which no artifact reads");
  });

  test("release-readiness runs last; its defect finding becomes v4 and stales only the cited artifact", () => {
    c.cmd.lensStart("release-readiness");
    addProposals(c, ["P13", "P14"]);
    c.cmd.lensDone("release-readiness");
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v4.md"));
    resolveProposals(c);
    const done = c.cmd.reconDone();
    assert.equal(done.version, 4);
    assert.deepEqual(done.stale.map((s) => `${s.lens}:${s.by.join(",")}`), ["marketing:D10"]);
    throwsMsg(() => c.cmd.lensStart("release-readiness"), /rebuild stale artifacts/);
    assert.match(c.stop().block, /stale/);
  });

  test("stale rebuild, then the gate artifact; stop completes the run", () => {
    c.cmd.lensStart("marketing");
    denied(c.write("actualize/artifacts/marketing/beta-page.md", walk("history/beta-page@2.md")), /model@2 but the model is at version 4|graded CONTRADICTED/);
    const page = walk("artifacts/marketing/beta-page.md");
    assert.equal(c.write("actualize/artifacts/marketing/beta-page.md", page), null);
    c.put("actualize/artifacts/marketing/beta-page.md", page);
    c.cmd.lensDone("marketing");
    c.cmd.lensStart("release-readiness");
    const gate = walk("artifacts/release-readiness/gate.md");
    denied(c.write("actualize/artifacts/release-readiness/gate.md", gate.replace("verdict: defer", "verdict: maybe")), /verdict/);
    assert.equal(c.write("actualize/artifacts/release-readiness/gate.md", gate), null);
    c.put("actualize/artifacts/release-readiness/gate.md", gate);
    c.cmd.lensDone("release-readiness");
    assert.equal(c.cmd.gate().ready, true, JSON.stringify(c.cmd.gate().blockers));
    const d = c.stop();
    assert.match(d.notice, /run complete.*defer/);
    assert.equal(c.get().state.active, false);
    assert.equal(c.ev("prompt", { prompt: "thanks" }), null);
  });
});

test("stop gate loop guard and pause escape", () => {
  const project = sandbox();
  const c = ctx(project);
  c.cmd.begin({ goal: "demo of the probe for a trade show", bar: "demo" });
  for (let i = 0; i < 4; i++) assert.ok(c.stop().block, `block ${i + 1}`);
  assert.match(c.stop().notice, /stopping with the process incomplete/);
  const { run, state } = c.get();
  state.paused = { reason: "which product?" };
  fs.writeFileSync(run.statePath, JSON.stringify(state));
  assert.match(c.stop().notice, /paused, waiting on the user/);
  c.ev("prompt", { prompt: "the probe" });
  assert.equal(c.get().state.paused, undefined);
});
