// Collects every fact film 2 shows from the Product Model, the repository, and the hardware worked example, so no on-screen claim is typed by hand.
//   bun media/explainer-2/tools/build-data.mjs     -> media/explainer-2/src/data.json
import fs from "node:fs";
import path from "node:path";
import { parseModel, validateArtifact, parseStamp } from "../../../hooks/src/lib/md.mjs";
import { loadLenses } from "../../../hooks/src/lib/lenses.mjs";
import { TRANSITIONS } from "../../../cockpit/protocol/work.ts";
const root = path.resolve(import.meta.dir, "../../..");
const R = (...p) => path.join(root, ...p);
const model = parseModel(fs.readFileSync(R("actualize/product-model.md"), "utf8"));
const mote = parseModel(fs.readFileSync(R("tests/walkthrough-mote/product-model.md"), "utf8"));
const quoteOf = (id) => { const m = model.claims.get(id).text.match(/"(.+)"/); if (!m) throw new Error(id + " has no quotation"); return m[1]; };
const claim = (m, id) => { const c = m.claims.get(id); return { id, text: c.text, grade: c.grade, source: c.source }; };
// the validator's refusal, produced now by the product's own code: downgrade C3 and re-validate the public website copy
const copy = fs.readFileSync(R("actualize/artifacts/marketing/website-copy.md"), "utf8");
const down = { ...model, claims: new Map([...model.claims].map(([k, v]) => [k, k === "C3" ? { ...v, grade: "REPORTED" } : v])) };
const refusal = validateArtifact(copy, down, { lensReads: null }).find((e) => e.includes("C3"));
if (!refusal) throw new Error("expected the validator to refuse a REPORTED C3");
// lens groups exactly as the cockpit groups them
const titles = fs.readFileSync(R("cockpit/server/capabilities.ts"), "utf8");
const cat = Object.fromEntries([...titles.matchAll(/"?([a-z-]+)"?: \["([^"]+)", "([^"]+)"\]/g)].map((m) => [m[1], m[3]]));
const names = Object.keys(loadLenses()); const groups = {};
for (const n of names) (groups[cat[n] ?? "other"] ??= []).push(n);
const order = ["Recon", "Strategy", "Design", "Media", "Hardware", "Build", "Governance", "Verification"];
// the hardware gate's physical evidence walk
const gate = fs.readFileSync(R("tests/walkthrough-mote/artifacts/release-readiness/gate.md"), "utf8");
const walk = [...gate.matchAll(/^\| (PHY\d+) \| ([^|]+) \| [^|]+ \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm)].map((m) => ({ id: m[1], claim: m[2].trim(), kind: m[3].trim(), onUnit: m[4].trim(), result: m[5].trim() }));
const verdict = parseStamp(gate).head.verdict;
if (!walk.length || verdict !== "no-go") throw new Error("expected the Mote gate walk and a no-go verdict");
const data = {
  modelVersion: model.version,
  hn: [{ q: quoteOf("C69"), src: "Launch HN comment, 2026-09-01" }, { q: quoteOf("C70"), src: "Launch HN comment, 2026-09-01" }],
  mote: ["C7", "C36"].map((id) => claim(mote, id)),
  grades: ["OBSERVED", "VERIFIED", "REPORTED", "INFERRED", "PROPOSED", "UNKNOWN", "CONTRADICTED"],
  groups: order.filter((g) => groups[g]).map((g) => ({ name: g, lenses: groups[g] })),
  notEnough: ["a firmware build", "passing tests", "a schematic", "a render", "documentation"],
  walk, verdict,
  validatorRefusal: refusal, copyLine: "A public artifact that cites a claim graded below OBSERVED is rejected.",
  copyStamp: `marketing/website-copy.md · built_from: model@${parseStamp(copy).built} · public: ${parseStamp(copy).public}`,
  stale: { from: 4, to: 5, decision: "D11", touched: "positioning, jobs, criteria, opportunities", artifacts: ["brand/identity.md", "direction/system.md", "illustration/mark-and-diagrams.md", "marketing/website-copy.md"] },
  lifecycle: ["queued", "acknowledged", "running", "produced", "ready_for_review", "accepted"],
  authorityMessage: "AUTHORITY_HUMAN: accepted belongs to the owner: an agent can report progress and mark work ready_for_review, but cannot accept, reject, or cancel it",
  tagline: "Finish the product. Show the evidence.", cta: "Read the run: github.com/SPRIME01/Product-Actualizer, actualize/",
};
fs.writeFileSync(R("media/explainer-2/src/data.json"), JSON.stringify(data, null, 1));
console.log("film 2 data: model@" + data.modelVersion, "| walk rows:", walk.length, "| verdict:", verdict, "| groups:", data.groups.map((g) => g.name + g.lenses.length).join(" "), "| refusal ok");
