// The capability catalogue, in three layers that stay separate:
//
//   Capability  the categorical kind of judgment work. It is a lens: `skills/<lens>/SKILL.md` already says what it is for (description),
//               what model fields it reads, and which capabilities it needs first. Nothing here invents a second ontology.
//   Implementation  a mechanism that realises the capability: the lens's own `executes_with` names, which are replaceable.
//   Executor    the agent, tool, or person that runs the implementation.
//
// A package name is never the thing the owner reasons about; it is an entry in the second layer. Reach is a fourth, separate idea: how an
// outside observation (a browser, a serial port) is gathered, not how a lens is executed. They are shown side by side and never merged.
// Availability is never guessed: an implementation is "found" where we can see it, and "unknown" everywhere else, which is not usable.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Proj } from "./project";
import type { BindingRow, ExecutorRow } from "./control";
import { reach, hostEnv, cachedWhich, type ReachEnv } from "./reach";
import type { Capability } from "../protocol/world";

// Title and category are presentation for the owner. A lens missing here is shown under its own name as "uncategorized"; a test keeps this honest.
const TITLES: Record<string, [string, string]> = {
  "recon-software": ["Software Reconnaissance", "Recon"], "recon-physical": ["Physical Reconnaissance", "Recon"], "legacy-modernization": ["Legacy Modernization", "Build"],
  brand: ["Brand Identity", "Strategy"], marketing: ["Marketing and Launch", "Strategy"], direction: ["Creative Direction", "Design"], experience: ["Experience Design", "Design"],
  illustration: ["Illustration", "Media"], "motion-editorial": ["Motion and Editorial", "Media"], "audio-sound": ["Audio and Sound", "Media"], "product-visualization": ["Product Visualization", "Media"],
  electronics: ["Electronics", "Hardware"], "embedded-systems": ["Embedded Systems", "Hardware"], robotics: ["Robotics", "Hardware"],
  "provenance-licensing": ["Provenance and Licensing", "Governance"], "fidelity-qa": ["Visual Fidelity QA", "Verification"], "release-readiness": ["Release Readiness", "Verification"],
};
// Where a lens's work gathers outside observations, where its description makes that obvious. A hint, labelled as one; absent means not stated.
const OBSERVES: Record<string, Capability[]> = {
  "fidelity-qa": ["browser.inspect"], "release-readiness": ["browser.inspect"], "recon-software": ["repo.inspect"], electronics: ["hardware.measure"], "embedded-systems": ["device.serial"], "recon-physical": ["cad.inspect"],
};
// Implementations that claim the same primary authority. Two bound at once is a conflict to surface, not a rule to enforce. Declared data: extend it as
// conflicts are found.
const AUTHORITY: Record<string, string> = { hallmark: "design system (DESIGN.md)", impeccable: "design system (DESIGN.md)" };

export type Found = { state: "found" | "unknown"; where: string };
export type AvailEnv = { which: (b: string) => string | null; exists: (p: string) => boolean; home: string; project: string };
export const hostAvail = (project: string): AvailEnv => ({ which: cachedWhich, exists: (p) => fs.existsSync(p), home: os.homedir(), project });

// Where an implementation can be seen. Not finding it proves nothing (an agent's skills live in places this process cannot list), so "unknown".
export function findImpl(name: string, env: AvailEnv): Found {
  if (!/^[\w.-]+$/.test(name)) return { state: "unknown", where: "" };
  const bin = env.which(name); if (bin) return { state: "found", where: `on PATH` };
  for (const d of [path.join(env.project, ".agents", "skills"), path.join(env.project, "skills"), path.join(env.home, ".agents", "skills"), path.join(env.home, ".config", "agents", "skills")]) {
    if (env.exists(path.join(d, name, "SKILL.md"))) return { state: "found", where: `skill in ${d.replace(env.home, "~")}` };
  }
  return { state: "unknown", where: "not seen where this process can look" };
}

export type Impl = { name: string; found: Found["state"]; where: string };
export type Capability_ = {
  id: string; title: string; category: string; purpose: string; reads: string[]; needs: string[]; status: string; produces: string[];
  implementations: Impl[]; binding: { implementation: string | null; basis: "chosen by the owner" | "default: first one found" | "none found; the lens procedure itself"; executor: string; executorLabel: string; executorBasis: "chosen by the owner" | "default" };
  observes: { capability: string; best: string | null; status: string }[]; warnings: string[];
};

export function catalogue(p: Proj, bindings: Record<string, BindingRow>, executors: ExecutorRow[], avail: AvailEnv, renv: ReachEnv = hostEnv(process.env, undefined, avail.project)): Capability_[] {
  const exById = new Map(executors.map((e) => [e.id, e]));
  const rows = p.lenses.map((l): Capability_ => {
    const [title, category] = TITLES[l.name] ?? [l.name, "uncategorized"];
    const implementations = (l.executesWith as string[]).map((n) => { const f = findImpl(n, avail); return { name: n, found: f.state, where: f.where }; });
    const b = bindings[l.name];
    const chosen = b?.implementation && implementations.some((i) => i.name === b.implementation) ? b.implementation : null;
    const firstFound = implementations.find((i) => i.found === "found")?.name ?? null;
    const impl = chosen ?? firstFound;
    const exId = b?.executor && exById.has(b.executor) ? b.executor : "current-agent";
    return {
      id: l.name, title, category, purpose: l.description, reads: l.reads, needs: l.needs, status: l.status,
      produces: p.artifacts.filter((a) => a.lens === l.name).map((a) => a.id),
      implementations,
      binding: { implementation: impl, basis: chosen ? "chosen by the owner" : firstFound ? "default: first one found" : "none found; the lens procedure itself", executor: exId, executorLabel: exById.get(exId)?.label ?? exId, executorBasis: b?.executor && exById.has(b.executor) ? "chosen by the owner" : "default" },
      observes: (OBSERVES[l.name] ?? []).map((c) => { const r = reach(c, renv); return { capability: c, best: r.best, status: r.usable ? "usable" : r.best ? "unproven" : "blocked" }; }),
      warnings: [],
    };
  });
  // Two lenses in play whose bound implementations claim the same authority: say so on both.
  const inPlay = new Set([...(p.selection?.lenses ?? [])]);
  const claims = new Map<string, { lens: string; impl: string }[]>();
  for (const r of rows) if (inPlay.has(r.id) && r.binding.implementation && AUTHORITY[r.binding.implementation]) { const k = AUTHORITY[r.binding.implementation]; claims.set(k, [...(claims.get(k) ?? []), { lens: r.id, impl: r.binding.implementation }]); }
  for (const [domain, xs] of claims) {
    if (new Set(xs.map((x) => x.impl)).size < 2) continue;
    for (const r of rows) { const mine = xs.find((x) => x.lens === r.id); if (mine) r.warnings.push(`${mine.impl} and ${xs.filter((x) => x.impl !== mine.impl).map((x) => `${x.impl} (${x.lens})`).join(", ")} both claim the ${domain}; choose one authority`); }
  }
  return rows;
}
