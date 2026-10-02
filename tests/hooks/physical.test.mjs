// Replays tests/walkthrough-mote (the physical-AI walkthrough) through the real state machine and hook engine:
// the physical lens chain, nested hardware evidence, revision-driven staleness, and a no-go gate.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sandbox, ctx, walkthrough, EXCLUDE, P } from "./helpers.mjs";

const W = walkthrough("walkthrough-mote");
const { walk, addProposals, resolveProposals } = W;
const throwsMsg = (fn, re) => assert.throws(fn, (e) => { assert.match(e.message, re); return true; });
const denied = (d, re) => { assert.ok(d?.deny, `expected a denial, got ${JSON.stringify(d)}`); if (re) assert.match(d.deny, re); };

const CHOSEN = ["recon-software", "recon-physical", "electronics", "embedded-systems", "robotics", "marketing", "release-readiness"];
const EXCLUDE_MOTE = {
  direction: "the deliverables are a kit and a text spec sheet, not a visual direction",
  experience: "no software flows are in scope for this goal",
  "product-visualization": "CAD exists but no renders are wanted for the beta",
  "motion-editorial": "no film or motion deliverable in this goal",
  "audio-sound": "sound design is not in scope; audio function is checked by embedded-systems",
  illustration: "no illustration or diagram deliverable in this goal",
  "fidelity-qa": "no built visual output to measure",
  "legacy-modernization": "the code is not being changed in this goal",
  "provenance-licensing": "no assets are published and the license decision is deferred",
};

// copy a lens's walkthrough evidence tree into the sandbox, one file at a time through the write hook
function putEvidence(c, lens) {
  const root = path.join(W.dir, "evidence", lens);
  const walkDir = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkDir(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const file of walkDir(root)) {
    const rel = path.join("actualize", "evidence", lens, path.relative(root, file));
    const text = fs.readFileSync(file, "utf8");
    assert.equal(c.write(rel, text), null, `write hook refused ${rel}`);
    c.put(rel, text);
  }
}

function artifact(c, lens, name, text) {
  const rel = `actualize/artifacts/${lens}/${name}`;
  assert.equal(c.write(rel, text), null);
  c.put(rel, text);
}

test("Mote walkthrough, end to end", async (t) => {
  const project = sandbox();
  const c = ctx(project);
  c.cmd.begin({ goal: "closed-beta hardware kit for 10 builders with a public spec sheet", bar: "beta" });

  await t.test("select: the physical chain closes under needs; brand is satisfied; digital lenses stay out", () => {
    const everyone = Object.keys(P.loadLenses());
    const sel = (chosen, satisfied = ["brand"]) => c.cmd.select({ chosen, satisfied, exclude: Object.fromEntries(everyone.filter((n) => !chosen.includes(n) && !satisfied.includes(n)).map((n) => [n, EXCLUDE_MOTE[n] ?? "left out of this selection to test closure"])) });
    throwsMsg(() => sel(CHOSEN.filter((x) => x !== "electronics")), /embedded-systems needs electronics/);
    throwsMsg(() => sel(CHOSEN.filter((x) => x !== "embedded-systems")), /robotics needs embedded-systems/);
    throwsMsg(() => sel(CHOSEN.filter((x) => x !== "recon-physical")), /electronics needs recon-physical/);
    throwsMsg(() => c.cmd.select({ chosen: CHOSEN, exclude: { ...EXCLUDE_MOTE, brand: "positioning is already known" } }), /marketing needs brand/);
    throwsMsg(() => c.cmd.select({ chosen: CHOSEN, satisfied: ["brand"], exclude: {} }), /exclusion reason for each unselected lens/);
    const waves = c.cmd.select({ chosen: CHOSEN, satisfied: ["brand"], exclude: EXCLUDE_MOTE });
    assert.deepEqual(waves, [["marketing", "recon-physical", "recon-software", "release-readiness"], ["electronics"], ["embedded-systems"], ["robotics"]]);
  });

  await t.test("order: physical lenses wait for the model, and for each other", () => {
    throwsMsg(() => c.cmd.lensStart("electronics"), /before the model exists/);
    throwsMsg(() => c.cmd.lensStart("provenance-licensing"), /not in the selection/);
    denied(c.bash("picotool load fw.uf2 -f"), /inside a physical lens run/);
    assert.equal(c.bash("picotool info -a"), null, "read-only discovery is never blocked");
  });

  await t.test("wave 1: recon writes the nested hardware evidence package inside its own scope", () => {
    c.cmd.lensStart("recon-software");
    c.cmd.lensStart("recon-physical");
    assert.equal(c.write("actualize/evidence/recon-physical/hardware/components/tof/profile.yaml", "component: tof\n"), null);
    denied(c.write("actualize/evidence/electronics/hardware/x.md", "x"), /lens "electronics" is not running/);
    putEvidence(c, "recon-software");
    putEvidence(c, "recon-physical");
    addProposals(c, ["P1", "P2", "P3"]);
    c.cmd.lensDone("recon-software");
    addProposals(c, ["P4", "P5", "P6", "P7"]);
    c.cmd.lensDone("recon-physical");
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v1.md"));
    resolveProposals(c);
    const done = c.cmd.reconDone();
    assert.equal(done.version, 1);
  });

  await t.test("wave 2: electronics; its artifact is built after reconciliation and cannot cite what does not exist", () => {
    c.cmd.lensStart("electronics");
    putEvidence(c, "electronics");
    addProposals(c, ["P8", "P9", "P10", "P11"]);
    c.cmd.lensDone("electronics");
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v2.md"));
    resolveProposals(c);
    assert.equal(c.cmd.reconDone().version, 2);
    c.cmd.lensStart("electronics");
    const good = walk("history/electrical-review@2.md");
    denied(c.write("actualize/artifacts/electronics/electrical-review.md", good.replace(/cites: \[/, "cites: [C99, ")), /C99/);
    denied(c.write("actualize/artifacts/electronics/electrical-review.md", good.replace("model@2", "model@1")), /model@1 but the model is at version 2/);
    artifact(c, "electronics", "electrical-review.md", good);
    c.cmd.lensDone("electronics");
  });

  await t.test("wave 3 and 4: embedded-systems then robotics, each reconciled and stamped at its own version", () => {
    c.cmd.lensStart("embedded-systems");
    putEvidence(c, "embedded-systems");
    addProposals(c, ["P12", "P13", "P14", "P15"]);
    c.cmd.lensDone("embedded-systems");
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v3.md"));
    resolveProposals(c);
    assert.equal(c.cmd.reconDone().version, 3);
    c.cmd.lensStart("embedded-systems");
    // state-changing hardware commands need a recorded preflight; discovery and irreversible steps are classified by effect
    assert.equal(c.bash("esptool.py --port /dev/ttyUSB0 chip_id"), null);
    denied(c.bash("esptool.py --port /dev/ttyUSB0 write_flash 0x0 fw.bin"), /first record the preflight/);
    c.put("actualize/evidence/embedded-systems/actions.md", "No state-changing action was taken.\n");
    denied(c.bash("west flash"), /first record the preflight/);
    c.put("actualize/evidence/embedded-systems/actions.md", "target            unit #2, REV C neck board on /dev/ttyACM0\nexpected result   banner shows the REV C pin map\nrecovery          SWD on J5 with the known-good image\n");
    assert.equal(c.bash("west flash"), null);
    denied(c.bash("espefuse.py --port /dev/ttyUSB0 burn_efuse FLASH_CRYPT_CNT"), /irreversible/);
    c.put("actualize/evidence/embedded-systems/actions.md", "No state-changing action was taken: flashing was exercised against the hook only.\n");
    artifact(c, "embedded-systems", "bringup.md", walk("history/bringup@3.md"));
    c.cmd.lensDone("embedded-systems");

    c.cmd.lensStart("robotics");
    putEvidence(c, "robotics");
    addProposals(c, ["P16", "P17", "P18", "P19", "P20"]);
    c.cmd.lensDone("robotics");
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v4.md"));
    resolveProposals(c);
    assert.equal(c.cmd.reconDone().version, 4);
    c.cmd.lensStart("robotics");
    artifact(c, "robotics", "behavior-envelope.md", walk("artifacts/robotics/behavior-envelope.md"));
    c.cmd.lensDone("robotics");
  });

  await t.test("marketing: a public spec sheet may cite only OBSERVED or VERIFIED claims; a comparative on a contradicted claim is rejected", () => {
    c.cmd.lensStart("marketing");
    const draft = walk("history/spec-sheet@4.md");
    // C22 is OBSERVED (CAD); C23 is REPORTED (the owner's transcription of the unit)
    denied(c.write("actualize/artifacts/marketing/spec-sheet.md", draft.replace("cites: [C1, C14, C22]", "cites: [C1, C14, C23, C22]").replace("builds [C14].", "builds [C14][C23].")), /graded REPORTED/);
    artifact(c, "marketing", "spec-sheet.md", draft);
    addProposals(c, ["P21", "P22"]);
    c.cmd.lensDone("marketing");
  });

  await t.test("owner reply: recon-physical re-runs, the contradiction set changes, and reconciliation 5 stales exactly the artifacts whose cited claims changed", () => {
    c.cmd.lensStart("recon-physical");
    putEvidence(c, "recon-physical");
    addProposals(c, ["P23"]);
    c.cmd.lensDone("recon-physical");
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v5.md"));
    resolveProposals(c, { P21: { status: "rejected", reason: "not needed" } });
    throwsMsg(() => c.cmd.reconDone(), /P21: rejection needs a specific reason/);
    resolveProposals(c, { P21: { status: "rejected", reason: W.rows.find((r) => r.id === "P21").reason } });
    const done = c.cmd.reconDone();
    assert.equal(done.version, 5);
    assert.deepEqual(done.stale.map((s) => `${s.lens}:${s.by.join(",")}`).sort(), ["electronics:D7", "embedded-systems:D7"]);
    throwsMsg(() => c.cmd.lensStart("release-readiness"), /rebuild stale artifacts/);
    assert.match(c.stop().block, /stale/);
  });

  await t.test("stale rebuild: electronics and embedded-systems record model@5 and the confirmed revision", () => {
    c.cmd.lensStart("electronics");
    denied(c.write("actualize/artifacts/electronics/electrical-review.md", walk("history/electrical-review@2.md")), /model@2 but the model is at version 5/);
    artifact(c, "electronics", "electrical-review.md", walk("artifacts/electronics/electrical-review.md"));
    c.cmd.lensDone("electronics");
    c.cmd.lensStart("embedded-systems");
    artifact(c, "embedded-systems", "bringup.md", walk("artifacts/embedded-systems/bringup.md"));
    c.cmd.lensDone("embedded-systems");
  });

  await t.test("release-readiness: physical evidence walk produces the unknown and the verdict; marketing fixes its wording defect", () => {
    c.cmd.lensStart("release-readiness");
    addProposals(c, ["P24", "P25", "P26"]);
    c.cmd.lensDone("release-readiness");
    c.cmd.reconStart();
    c.put("actualize/product-model.md", walk("model-v6.md"));
    resolveProposals(c);
    const done = c.cmd.reconDone();
    assert.equal(done.version, 6);
    assert.deepEqual(done.stale, [], "D9 touched a claim no artifact cites, plus unknowns and decisions");
    c.cmd.lensStart("marketing");
    artifact(c, "marketing", "spec-sheet.md", walk("artifacts/marketing/spec-sheet.md"));
    c.cmd.lensDone("marketing");
    c.cmd.lensStart("release-readiness");
    const gate = walk("artifacts/release-readiness/gate.md");
    denied(c.write("actualize/artifacts/release-readiness/gate.md", gate.replace("verdict: no-go", "verdict: maybe")), /verdict/);
    artifact(c, "release-readiness", "gate.md", gate);
    c.cmd.lensDone("release-readiness");
    assert.equal(c.cmd.gate().ready, true, JSON.stringify(c.cmd.gate().blockers));
    const d = c.stop();
    assert.match(d.notice, /run complete.*no-go/);
  });
});

test("a digital-only goal selects none of the physical lenses and the chain refuses to start without hardware recon", () => {
  const project = sandbox();
  const c = ctx(project);
  c.cmd.begin({ goal: "closed-beta signup page, text only, for about 50 people", bar: "beta" });
  const chosen = ["recon-software", "recon-physical", "brand", "provenance-licensing", "marketing", "release-readiness"];
  const waves = c.cmd.select({ chosen, exclude: EXCLUDE });
  const flat = waves.flat();
  for (const n of ["electronics", "embedded-systems", "robotics"]) assert.ok(!flat.includes(n), `${n} must not be selected`);
  throwsMsg(() => c.cmd.lensStart("electronics"), /not in the selection/);
  assert.equal(P.loadLenses()["robotics"].needs.join(), "embedded-systems");
});
