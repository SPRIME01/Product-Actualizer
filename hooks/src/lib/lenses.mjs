// Reading lens metadata (frontmatter only) and computing dependency waves.
import fs from "node:fs";
import path from "node:path";
import { frontmatter, list } from "./md.mjs";
import { skillsDir } from "./store.mjs";

export const ROUTER = "actualize-product";

export function loadLenses(env = process.env) {
  const dir = skillsDir(env);
  const lenses = {};
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return lenses; }
  for (const name of names.sort()) {
    if (name === ROUTER) continue;
    const file = path.join(dir, name, "SKILL.md");
    let text;
    try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
    const { fm } = frontmatter(text);
    if (fm.kind === "tool") continue;   // a skill that is not a lens (e.g. cockpit): never selectable, never excluded
    lenses[name] = {
      name, file, dir: path.join(dir, name),
      description: fm.description ?? "",
      reads: list(fm.reads), needs: list(fm.needs), executesWith: list(fm.executes_with),
    };
  }
  return lenses;
}

export function lensBody(lens) {
  return fs.readFileSync(lens.file, "utf8");
}

// Groups of lenses that may run in parallel; every lens comes after all of its needs.
export function waves(lenses, selected) {
  const remaining = new Set(selected);
  const done = new Set();
  const out = [];
  while (remaining.size) {
    const wave = [...remaining].filter((n) => (lenses[n]?.needs ?? []).every((d) => done.has(d) || !selected.includes(d)));
    if (!wave.length) throw new Error(`dependency cycle among: ${[...remaining].join(", ")}`);
    wave.sort();
    out.push(wave);
    wave.forEach((n) => { remaining.delete(n); done.add(n); });
  }
  return out;
}

// Which absolute paths are lens bodies / references (progressive disclosure targets)?
export function lensOfPath(abs, env = process.env) {
  const dir = skillsDir(env);
  const rel = path.relative(dir, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  if (parts[0] === ROUTER) return null;
  // Tool skills are execution helpers, not selectable lenses; they may be loaded inside an active lens.
  // The strict hook must not forbid reading them just because they reside under skills/.
  if (parts[1] === "SKILL.md" || parts[1] === "references") {
    try { if (frontmatter(fs.readFileSync(path.join(dir, parts[0], "SKILL.md"), "utf8")).fm.kind === "tool") return null; } catch { /* unknown skill is handled elsewhere */ }
    return parts[0];
  }
  return null;
}
