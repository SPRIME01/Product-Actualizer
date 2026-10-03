// World-debugger vocabulary shared by the server, the tools, and the page. Pure: strings in, plain data out.
//
// A "world" here is exactly what the run already records: the settled Product Model at version N (history/model-vN.md),
// the current run, or a candidate (an open proposal). Nothing in this file creates, stores, or promotes one.
//   current worlds are truth, historical worlds are truth that has been superseded, candidates are possibility.
//   The page derives its "you are not looking at the current world" banner from these functions, so an agent cannot hide it.
import { parseRef } from "./refs";

export const WORLD_OPS = ["why", "diff", "timeline", "impact", "counterfactual", "reach", "replay"] as const;
export type WorldOp = (typeof WORLD_OPS)[number];

// Observation capabilities the world can ask the outside for (providers live in server/reach.providers.json, not here).
export const CAPABILITIES = ["web.search", "github.search", "reddit.read", "youtube.transcript", "repo.inspect", "browser.inspect", "trace.query", "device.serial", "hardware.measure", "cad.inspect", "owner.attest", "market.interview", "market.survey", "behavior.analytics", "support.history"] as const;
export type Capability = (typeof CAPABILITIES)[number];

// The ladder a capability climbs before it can produce evidence. Each rung is separate on purpose: `which` finding a binary is
// not a working connection, a working connection is not authorization, and none of them is a probe that was actually run.
export const REACH_DIMENSIONS = ["available", "installed", "configured", "probed", "reachable", "authorized"] as const;
export type ReachDimension = (typeof REACH_DIMENSIONS)[number];
export type Tri = "yes" | "no" | "unknown" | "n/a";   // n/a: this rung does not apply to the provider (no binary to install, no credential)

// How sure the debugger is about a statement it makes.
//   known  declared in the candidate or the run itself      derived  follows from a process rule applied to known facts
//   expected  likely, but the rules do not determine it      unknown  cannot be known without an observation
//   observation-required  names the observation that would discriminate
export const EFFECT_CLASSES = ["known", "derived", "expected", "unknown", "observation-required"] as const;
export type EffectClass = (typeof EFFECT_CLASSES)[number];
// How a provenance answer is backed: written down in the run, computed from what is written, or simply not recorded.
export const BASES = ["recorded", "derived", "unavailable"] as const;
export type Basis = (typeof BASES)[number];

export type WorldMode = "current" | "historical" | "candidate";
export type Viewing = { mode: WorldMode; worlds: string[]; subject?: string; op?: string };

export const worldId = (v: number | "current") => (v === "current" ? "current" : `model@${v}`);
export const parseWorldId = (s: string): number | "current" | null => {
  if (s === "current") return "current";
  const m = /^(?:model@)?(\d+)$/.exec(s);
  return m ? Number(m[1]) : null;
};

const params = (source: string) => { const i = source.indexOf("?"); return new URLSearchParams(i < 0 ? "" : source.slice(i + 1)); };

// What world(s) and subject a source looks at. Sources that name nothing special look at the current world.
export function worldOfSource(source: string | undefined): Viewing {
  if (!source) return { mode: "current", worlds: [] };
  const q = params(source);
  const head = /^(pa|graph|world):([a-z-]+)/.exec(source);
  const op = head?.[1] === "world" || head?.[2] === "why" || head?.[2] === "impact" ? head?.[2] : undefined;
  const subject = q.get("ref") ?? q.get("focus") ?? undefined;
  const at = q.get("at");
  const worlds: string[] = [];
  if (at && at !== "current") worlds.push(worldId(Number(at)));
  if (head?.[1] === "world" && head[2] === "diff") for (const k of ["a", "b"]) { const v = q.get(k); if (v && v !== "current" && parseWorldId(v) !== null) worlds.push(worldId(parseWorldId(v) as number)); }
  if (head?.[1] === "world" && head[2] === "counterfactual") return { mode: "candidate", worlds: [], subject, op };
  return { mode: worlds.length ? "historical" : "current", worlds, ...(subject && parseRef(subject) ? { subject } : {}), ...(op ? { op } : {}) };
}

// Fold the views of every block on a surface into one statement about what the surface looks at.
export function mergeViewing(vs: Viewing[]): Viewing {
  const mode: WorldMode = vs.some((v) => v.mode === "candidate") ? "candidate" : vs.some((v) => v.mode === "historical") ? "historical" : "current";
  const worlds = [...new Set(vs.flatMap((v) => v.worlds))];
  const subject = vs.find((v) => v.subject)?.subject, op = vs.find((v) => v.op)?.op;
  return { mode, worlds, ...(subject ? { subject } : {}), ...(op ? { op } : {}) };
}

export const bannerOf = (v: Viewing): { tone: "warning" | "unknown"; text: string } | null =>
  v.mode === "historical" ? { tone: "warning", text: `Historical view, read-only: ${v.worlds.join(" and ")}${v.worlds.length < 2 && v.op === "diff" ? " against the current world" : ""}. The current world is unchanged.` }
  : v.mode === "candidate" ? { tone: "unknown", text: `${v.subject ?? "This candidate"}: a possibility, not truth. Nothing here is settled.` }
  : null;
