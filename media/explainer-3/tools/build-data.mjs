// Collects every fact film 3 shows from the Product Model and the repository, so no on-screen claim is typed by hand.
//   bun media/explainer-3/tools/build-data.mjs     -> media/explainer-3/src/data.json
import fs from "node:fs";
import path from "node:path";
import { parseModel } from "../../../hooks/src/lib/md.mjs";
import { loadLenses } from "../../../hooks/src/lib/lenses.mjs";
const root = path.resolve(import.meta.dir, "../../..");
const R = (...p) => path.join(root, ...p);
const model = parseModel(fs.readFileSync(R("actualize/product-model.md"), "utf8"));
const lenses = Object.keys(loadLenses());
const tpl = fs.readFileSync(R("cockpit/server/control.ts"), "utf8").match(/no\("AUTHORITY_HUMAN", `(\$\{to\} belongs to the owner[^`]+)`\)/)?.[1];
if (!tpl) throw new Error("the AUTHORITY_HUMAN message was not found in cockpit/server/control.ts");
const data = {
  modelVersion: model.version, claimCount: model.claims.size, lensCount: lenses.length, lenses,
  grades: ["OBSERVED", "VERIFIED", "REPORTED", "INFERRED", "PROPOSED", "UNKNOWN", "CONTRADICTED"],
  authorityMessage: "AUTHORITY_HUMAN: " + tpl.replace("${to}", "accepted"),
  tagline: "Finish the product. Show the evidence.", cta: "Read the run: github.com/SPRIME01/Product-Actualizer, actualize/",
};
if (data.lensCount !== 17) throw new Error("expected 17 lenses, found " + data.lensCount);
fs.writeFileSync(R("media/explainer-3/src/data.json"), JSON.stringify(data, null, 1));
console.log("film 3 data: model@" + data.modelVersion, "|", data.claimCount, "claims |", data.lensCount, "lenses");
