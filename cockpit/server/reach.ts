// Reach: which outside capability could gather the evidence a world is missing, and how far along the ladder each provider is.
// This is a representation and routing boundary, not an integration. It never runs a provider, never reads a credential's value,
// and never contacts a network: the rungs it cannot know without doing that stay `unknown`, honestly, until a prober supplies them.
//   installed  a binary is on PATH            configured  the credential or config is present (presence only)
//   probed     a health probe was actually run   reachable  the probe got an answer      authorized  the answer accepted the credential
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import providers from "./reach.providers.json";
import { CAPABILITIES, REACH_DIMENSIONS, type Capability, type ReachDimension, type Tri } from "../protocol/world";

export type Provider = { id: string; label: string; capabilities: string[]; tier: 0 | 1 | 2; remote?: boolean; route?: "owner"; binaries?: string[]; config?: { env?: string[]; files?: string[] }; probe?: string[]; install: string; platforms?: string[] };
export type ProbeRecord = { at: string; reachable?: boolean; authorized?: boolean };
// Everything the ladder is allowed to look at, injectable so tests can stage a provider at any rung without touching the machine.
export type ReachEnv = { which: (bin: string) => string | null; env: Record<string, string | undefined>; exists: (path: string) => boolean; platform: string; probes: Record<string, ProbeRecord> };
// The one place a probe can run, and it is off unless the operator opts in. `gh auth status` asks GitHub whether the stored token still works,
// so it contacts the network; that is why it needs ACTUALIZE_GH=1. Without the variable nothing is run and nothing is contacted.
export type GhRunner = (cmd: string[]) => { code: number | null };
const ghRun: GhRunner = (cmd) => { try { const r = Bun.spawnSync(cmd, { stdout: "ignore", stderr: "ignore", timeout: 6000 }); return { code: r.exitCode }; } catch { return { code: null }; } };
export function probesFor(env: Record<string, string | undefined>, which: (b: string) => string | null, run: GhRunner = ghRun, now = () => new Date().toISOString()): Record<string, ProbeRecord> {
  if (env.ACTUALIZE_GH !== "1" || !which("gh")) return {};
  const r = run(["gh", "auth", "status"]);
  return r.code === null ? {} : { gh: { at: now(), reachable: r.code === 0 ? true : undefined, authorized: r.code === 0 } };
}
let probed: { at: number; probes: Record<string, ProbeRecord> } | null = null;   // one probe per minute, not one per question
// `base` is the project directory: a relative path in a provider's config means "in this project", so the same question has the same answer from any process.
export const hostEnv = (env: Record<string, string | undefined> = process.env, run?: GhRunner, base: string = process.cwd()): ReachEnv => {
  const which = (b: string) => Bun.which(b);
  let probes: Record<string, ProbeRecord> = {};
  if (env.ACTUALIZE_GH === "1") { if (run || !probed || Date.now() - probed.at > 60_000) { probes = probesFor(env, which, run); if (!run) probed = { at: Date.now(), probes }; } else probes = probed.probes; }
  return { which, env, exists: (p) => fs.existsSync(p.startsWith("~") ? p.replace(/^~/, os.homedir()) : path.resolve(base, p)), platform: process.platform, probes };
};

export type ProviderState = {
  id: string; label: string; tier: number; route: "owner" | "tool"; state: Record<ReachDimension, Tri>;
  status: "usable" | "unproven" | "blocked";   // usable: every rung applies-and-holds; unproven: nothing failed but a rung is unknown; blocked: a rung failed
  blockedAt: ReachDimension | null; next: string; probe?: string[];
};

export const PROVIDERS = providers as Provider[];
export const providersFor = (cap: string) => PROVIDERS.filter((p) => p.capabilities.includes(cap));

export function stateOf(p: Provider, env: ReachEnv): ProviderState {
  const owner = p.route === "owner";
  const probe = env.probes[p.id];
  const s: Record<ReachDimension, Tri> = {
    available: !p.platforms || p.platforms.includes(env.platform) ? "yes" : "no",
    installed: owner || !p.binaries ? "n/a" : p.binaries.some((b) => env.which(b)) ? "yes" : "no",
    configured: owner || !p.config ? "n/a" : (p.config.env ?? []).some((k) => !!env.env[k]) || (p.config.files ?? []).some((f) => env.exists(f)) ? "yes" : "no",
    probed: owner ? "n/a" : probe ? "yes" : "unknown",
    reachable: owner || !p.remote ? "n/a" : probe?.reachable === undefined ? "unknown" : probe.reachable ? "yes" : "no",
    authorized: owner ? "unknown" : p.tier === 0 && !p.config ? "n/a" : probe?.authorized === undefined ? "unknown" : probe.authorized ? "yes" : "no",
  };
  const failed = REACH_DIMENSIONS.find((d) => s[d] === "no") ?? null;
  const open = REACH_DIMENSIONS.find((d) => s[d] === "unknown") ?? null;
  const status = failed ? "blocked" : open ? "unproven" : "usable";
  const at = failed ?? open;
  const next = !at ? "ready"
    : owner ? "ask the owner with ask_human; their answer is the observation"
    : at === "available" ? `not available on ${env.platform}`
    : at === "installed" ? p.install
    : at === "configured" ? `set ${[...(p.config?.env ?? []), ...(p.config?.files ?? [])].join(" or ")}`
    : at === "probed" ? `no probe has been run${p.probe ? ` (declared: ${p.probe.join(" ")})` : ""}`
    : at === "reachable" ? "the last probe did not get an answer" : "the credential was not accepted, or authorization was never checked";
  return { id: p.id, label: p.label, tier: p.tier, route: owner ? "owner" : "tool", state: s, status, blockedAt: at, next, ...(p.probe ? { probe: p.probe } : {}) };
}

const RANK = { usable: 0, unproven: 1, blocked: 2 } as const;
// Eligible providers for a capability, best first: usable, then unproven, then blocked; simplest tier first inside each.
export function reach(need: Capability, env: ReachEnv = hostEnv()) {
  const list = providersFor(need).map((p) => stateOf(p, env)).sort((a, b) => RANK[a.status] - RANK[b.status] || a.tier - b.tier);
  return { capability: need, providers: list, best: list.find((p) => p.status !== "blocked")?.id ?? null, usable: list.some((p) => p.status === "usable") };
}

// A claim's recorded source says where its evidence came from; the scheme of that source hints at what observation could improve it.
// These are heuristics and are labelled so. When nothing matches the answer is "none", never a guess.
const HINTS: [RegExp, Capability][] = [
  [/https?:\/\/(www\.)?github\.com/i, "github.search"], [/reddit\.com/i, "reddit.read"], [/youtu(\.be|be\.com)/i, "youtube.transcript"],
  [/https?:\/\//i, "web.search"], [/\.(step|stp|stl|scad|3mf|f3d|glb)\b/i, "cad.inspect"],
  [/\b(uart|i2c|spi|serial|tty|usb)\b/i, "device.serial"], [/(\/hardware\/|datasheet|schematic|bench|\.kicad_sch\b|\bbom\b)/i, "hardware.measure"],
  [/\.(ts|js|mjs|py|c|cpp|h|rs|go)(:\d+)?\b|\bsrc\//i, "repo.inspect"], [/\b(trace|span|otel)\b/i, "trace.query"],
];
export function suggestNeeds(text: string): Capability[] {
  const out: Capability[] = [];
  for (const [re, cap] of HINTS) if (re.test(text) && !out.includes(cap)) out.push(cap);
  return out;
}
export const isCapability = (s: string): s is Capability => (CAPABILITIES as readonly string[]).includes(s);
