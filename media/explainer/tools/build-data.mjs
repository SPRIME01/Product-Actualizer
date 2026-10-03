// Collects every fact the film shows from the Product Model and the run, so no on-screen claim is typed by hand.
//   bun media/explainer/tools/build-data.mjs     -> media/explainer/src/data.json
import fs from "node:fs";
import path from "node:path";
import { parseModel, validateArtifact, parseStamp } from "../../../hooks/src/lib/md.mjs";
import { TRANSITIONS } from "../../../cockpit/protocol/work.ts";
const root = path.resolve(import.meta.dir, "../../..");
const R = (...p) => path.join(root, ...p);
const model = parseModel(fs.readFileSync(R("actualize/product-model.md"), "utf8"));
const claim = (id) => { const c = model.claims.get(id); return { id, text: c.text, grade: c.grade, source: c.source }; };
// the validator's refusal, produced now by the product's own code: downgrade C3 and re-validate the public website copy
const copy = fs.readFileSync(R("actualize/artifacts/marketing/website-copy.md"), "utf8");
const downgraded = { ...model, claims: new Map([...model.claims].map(([k, v]) => [k, k === "C3" ? { ...v, grade: "REPORTED" } : v])) };
const refusal = validateArtifact(copy, downgraded, { lensReads: null }).find((e) => e.includes("C3"));
if (!refusal) throw new Error("expected the validator to refuse a REPORTED C3");
const waveData = JSON.parse(fs.readFileSync(R("actualize/evidence/recon-software/select-waves.json"), "utf8"));
const gate = JSON.parse(fs.readFileSync(R("actualize/evidence/motion-editorial/gate-snapshot.json"), "utf8"));
const data = {
  modelVersion: model.version,
  claims: Object.fromEntries(["C3", "C18", "C9", "C31", "C43", "C2"].map((id) => [id, claim(id)])),
  grades: ["OBSERVED", "VERIFIED", "REPORTED", "INFERRED", "PROPOSED", "UNKNOWN", "CONTRADICTED"],
  validatorRefusal: refusal,
  copyLine: "A public artifact that cites a claim graded below OBSERVED is rejected.",
  copyStamp: `marketing/website-copy.md · built_from: model@${parseStamp(copy).built} · public: ${parseStamp(copy).public}`,
  stale: { from: 4, to: 5, decision: "D11", touched: "positioning, jobs, criteria, opportunities", artifacts: ["brand/identity.md", "direction/system.md", "illustration/mark-and-diagrams.md", "marketing/website-copy.md"] },
  waves: waveData.selection.waves, executors: { found: "ffmpeg", unknown: ["hyperframes", "bang-motion", "anidoodle"] },
  lifecycle: ["queued", "acknowledged", "running", "produced", "ready_for_review", "accepted"],
  ownerOnly: ["accepted"], transitions: Object.fromEntries(Object.entries(TRANSITIONS).map(([k, v]) => [k, Object.keys(v)])),
  authorityMessage: "AUTHORITY_HUMAN: accepted belongs to the owner: an agent can report progress and mark work ready_for_review, but cannot accept, reject, or cancel it",
  gate: { count: gate.blockers.length, reasons: gate.blockers.map((b) => b.text) },
  tagline: "Finish the product. Show the evidence.", cta: "Read the run: github.com/SPRIME01/Product-Actualizer, actualize/",
};
fs.writeFileSync(R("media/explainer/src/data.json"), JSON.stringify(data, null, 1));
console.log("film data: model@" + data.modelVersion, "| refusal:", refusal, "| gate blockers:", data.gate.count, "| waves:", data.waves.length);
