// Prime Agent (and Pi: `pi` is the same program): an extension file
// (user: ~/.prime/agent/extensions/actualize.ts, project: .prime/agent/extensions/actualize.ts).
import fs from "node:fs";
import path from "node:path";
import { home, result, backup, MANAGED } from "./common.mjs";
import { HOOKS_ROOT } from "../src/lib/store.mjs";

export const id = "prime";
export const aliases = ["pi", "prime-agent"];
const EXT = path.join(HOOKS_ROOT, "clients", "prime", "actualize.ts");
export const file = (scope, project) => (scope === "project" ? path.join(project, ".prime", "agent", "extensions", "actualize.ts") : path.join(home(), ".prime", "agent", "extensions", "actualize.ts"));
const wrapper = () => `// ${MANAGED}: re-exports the actualize extension from the product-actualizer repo\nexport { default } from "${EXT}";\n`;

export function status({ scope, project }) {
  const f = file(scope, project);
  if (!fs.existsSync(f)) return result("Prime/Pi", [`missing ${f}`], false);
  const t = fs.readFileSync(f, "utf8");
  if (!t.includes(MANAGED)) return result("Prime/Pi", [], false, [`${f} exists and is not managed here`]);
  return t === wrapper() ? result("Prime/Pi", [], true) : result("Prime/Pi", [`${f} drifted`], false);
}
export function apply({ scope, project, dryRun, force }) {
  const f = file(scope, project);
  const exists = fs.existsSync(f);
  if (exists && !fs.readFileSync(f, "utf8").includes(MANAGED) && !force) return result("Prime/Pi", [], true, [`${f} exists and is not managed here; left alone (use --force)`]);
  if (exists && fs.readFileSync(f, "utf8") === wrapper()) return result("Prime/Pi", [`${f}: already in sync`], true);
  if (!dryRun) { if (exists) backup(f); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, wrapper()); }
  return result("Prime/Pi", [`${dryRun ? "would write" : "wrote"} ${f}`], true);
}
export function remove({ scope, project, dryRun }) {
  const f = file(scope, project);
  if (fs.existsSync(f) && fs.readFileSync(f, "utf8").includes(MANAGED)) { if (!dryRun) fs.unlinkSync(f); return result("Prime/Pi", [`${dryRun ? "would remove" : "removed"} ${f}`], true); }
  return result("Prime/Pi", [`${f}: nothing to remove`], true);
}
