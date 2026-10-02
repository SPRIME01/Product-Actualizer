// OpenCode: a plugin file (user: ~/.config/opencode/plugins/actualize.js, project: .opencode/plugins/actualize.js).
// The file is a wrapper that re-exports the in-repo plugin by absolute path, so updates to the repo apply immediately.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { home, result, backup, MANAGED } from "./common.mjs";
import { HOOKS_ROOT } from "../src/lib/store.mjs";

export const id = "opencode";
export const aliases = [];
const PLUGIN = path.join(HOOKS_ROOT, "clients", "opencode", "actualize.js");
export const file = (scope, project) => (scope === "project" ? path.join(project, ".opencode", "plugins", "actualize.js") : path.join(home(), ".config", "opencode", "plugins", "actualize.js"));
const wrapper = () => `// ${MANAGED}: re-exports the actualize plugin from the product-actualizer repo\nexport { ActualizePlugin } from "${pathToFileURL(PLUGIN).href}";\n`;

export function status({ scope, project }) {
  const f = file(scope, project);
  if (!fs.existsSync(f)) return result("OpenCode", [`missing ${f}`], false);
  const t = fs.readFileSync(f, "utf8");
  if (!t.includes(MANAGED)) return result("OpenCode", [], false, [`${f} exists and is not managed here`]);
  return t === wrapper() ? result("OpenCode", [], true) : result("OpenCode", [`${f} drifted`], false);
}
export function apply({ scope, project, dryRun, force }) {
  const f = file(scope, project);
  const exists = fs.existsSync(f);
  if (exists && !fs.readFileSync(f, "utf8").includes(MANAGED) && !force) return result("OpenCode", [], true, [`${f} exists and is not managed here; left alone (use --force)`]);
  if (exists && fs.readFileSync(f, "utf8") === wrapper()) return result("OpenCode", [`${f}: already in sync`], true);
  if (!dryRun) { if (exists) backup(f); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, wrapper()); }
  return result("OpenCode", [`${dryRun ? "would write" : "wrote"} ${f}`], true);
}
export function remove({ scope, project, dryRun }) {
  const f = file(scope, project);
  if (fs.existsSync(f) && fs.readFileSync(f, "utf8").includes(MANAGED)) { if (!dryRun) fs.unlinkSync(f); return result("OpenCode", [`${dryRun ? "would remove" : "removed"} ${f}`], true); }
  return result("OpenCode", [`${f}: nothing to remove`], true);
}
