// The Work Terminal's interpreter. A small ordered rule set, not a language model: a known phrase compiles to an existing view, Case operation, or
// world-debugger question; an imperative the owner wants done becomes a typed work request; anything else is reported as not understood and is NOT
// queued. No rule calls out, and no rule runs work. A request is "queued" until an executor acknowledges it, and the answer says so.
import type { Proj } from "./project";
import { parseRef, expandRef } from "../protocol/refs";
import type { RequestKind } from "../protocol/work";

export type Plan =
  | { kind: "view"; say: string; open: { template: string; ref?: string; as?: string } | { surface: "workbench" | "workflow" | "capabilities" | "contract" | "requests" | "review"; capability?: string; stage?: string } }
  | { kind: "answer"; say: string; open?: { template: string; ref?: string; as?: string } }
  | { kind: "review"; say: string; subject: string; outcome: "accepted" | "rejected"; note?: string }
  | { kind: "cancel"; say: string; request: string }
  | { kind: "control"; say: string; op: { op: "human.bind"; capability: string; implementation?: string | null; executor?: string | null } | { op: "human.contract"; stage: string; budget?: { minutes?: number; lensRuns?: number }; addInvariant?: string } }
  | { kind: "request"; say: string; request: { text: string; kind: RequestKind; capability: string | null; refs: string[]; facts: Record<string, any>; basis: string } }
  | { kind: "unrecognized"; say: string };

export type TermIn = { proj: Proj; requests: { id: string; status: string }[]; primary?: { label: string; authority: string } | null };
const norm = (t: string) => t.trim().replace(/\s+/g, " ").replace(/[?.!]+$/g, "");

// A phrase that names a keyword and a lens: the match is a hint, recorded on the request with its basis so the router can overrule it.
// A keyword is a whole word: "browser" in "agent-browser" is an implementation's name, not a request about browsers.
const whole = (re: RegExp) => new RegExp(re.source.replace(/^\\b/, "(?<![\\w-])").replace(/\\b$/, "(?![\\w-])"));
const CAPABILITY_WORDS: [RegExp, string][] = ([
  [/\b(frontend|front-end|ui|user interface|visual|screenshot|pixel|fidelity|browser journey|browser)\b/, "fidelity-qa"],
  [/\b(brand|naming|positioning)\b/, "brand"], [/\b(marketing|landing page|launch copy|copywriting)\b/, "marketing"], [/\b(ux|user flow|interaction design|information hierarchy)\b/, "experience"],
  [/\b(licen[sc]e|licensing|provenance)\b/, "provenance-licensing"], [/\b(release readiness|launch ready|ready to launch)\b/, "release-readiness"],
  [/\b(firmware|bring-?up)\b/, "embedded-systems"], [/\b(wiring|circuit|schematic|power budget)\b/, "electronics"], [/\b(3d render|render|turntable)\b/, "product-visualization"],
  [/\b(video|motion|edit the film)\b/, "motion-editorial"], [/\b(audio|sound|voiceover)\b/, "audio-sound"], [/\b(codebase|repo|repository)\b/, "recon-software"],
] as [RegExp, string][]).map(([re, lens]) => [whole(re), lens] as [RegExp, string]);
const ACT = /^(verify|audit|check|test|validate|polish|rebuild|regenerate|redo|re-?run|fix|make|write|build|run|split|parallel(ize|ise)|steer|redirect|avoid|stop|switch|prefer|use|try|compare|improve|refactor|document|plan|prepare|draft)\b/;

// Explicit refs the owner typed: C4, U2, P3, D1, S1, J1, OP1, [[C4]], claim:C4, or an artifact path that exists.
export function refsIn(text: string, p: Proj): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\[\[([^\]]+)\]\]|\b(?:claim|unknown|proposal|decision|artifact|evidence|lens|job|criterion|opportunity):[\w./@-]+|\b(?:OP|[CUPDJS])\d+\b/g)) { const e = expandRef((m[1] ?? m[0]).trim()); if (e && parseRef(e)) out.add(e); }
  const low = text.toLowerCase();
  for (const a of p.artifacts) if (low.includes(a.id.toLowerCase()) || low.includes(a.id.split("/").pop()!.toLowerCase())) out.add(`artifact:${a.id}`);
  return [...out].filter((r) => exists(r, p)).slice(0, 8);
}
function exists(ref: string, p: Proj): boolean {
  const r = parseRef(ref); if (!r) return false;
  switch (r.kind) {
    case "claim": return p.claims.some((x) => x.id === r.id); case "unknown": return p.unknowns.some((x) => x.id === r.id);
    case "proposal": return p.proposals.some((x: any) => x.id === r.id); case "decision": return p.decisions.some((x: any) => x.id === r.id);
    case "artifact": return p.artifacts.some((x) => x.id === r.id); case "evidence": return p.evidence.some((x) => x.id === r.id);
    case "lens": return p.lenses.some((x) => x.name === r.id); case "job": return p.jobs.some((x: any) => x.id === r.id);
    case "criterion": return p.criteria.some((x: any) => x.id === r.id); case "opportunity": return p.opportunities.some((x: any) => x.id === r.id);
    default: return false;
  }
}

const SHOW: [RegExp, { template: string }, string][] = [
  [/^(?:show|open|list)(?: me)?(?: the| my| all)? (?:open )?proposals?$/, { template: "proposals" }, "the open proposals"],
  [/^(?:show|open|list)(?: me)?(?: the| all)? (?:claims?(?: ledger)?)$/, { template: "claims" }, "the claims ledger"],
  [/^(?:show|open|list)(?: me)?(?: the| all)? (?:contradictions?|contradicted claims?)$/, { template: "contradictions" }, "the contradicted claims"],
  [/^(?:show|open|list)(?: me)?(?: the| all)? unknowns?$/, { template: "unknowns" }, "the unknowns"],
  [/^(?:show|open)(?: me)?(?: the)? (?:evidence|events?)$/, { template: "events" }, "the process events"],
  [/^(?:show|open)(?: me)?(?: the)? (?:run )?trace$/, { template: "trace" }, "the run trace"],
  [/^(?:show|open)(?: me)?(?: the)? (?:lens map|lenses)$/, { template: "lenses" }, "the lens map"],
  [/^(?:show|open)(?: me)?(?: the| my)? (?:inbox|responses)$/, { template: "inbox" }, "your responses"],
  [/^(?:show|open)(?: me)?(?: the)? (?:release )?gate$/, { template: "gate" }, "the release gate"],
];

export function interpret(raw: string, i: TermIn): Plan {
  const t = norm(raw), low = t.toLowerCase(), p = i.proj;
  if (!t) return { kind: "unrecognized", say: "Type a question about the work, or something to do." };

  // an explicit request: the owner chose to queue it, whatever it says
  const ex = /^(?:request|ask(?: the)? agent|todo|queue)\s*:\s*(.+)$/i.exec(t);
  if (ex) return asRequest(ex[1].trim(), p, i, "queued as typed: you used a request prefix");

  // ---- the owner's decisions about work in flight ----
  let m = /^(accept|approve)\s+(R\d+|\S+)(?:\s+(?:because|:)?\s*(.*))?$/i.exec(t);
  if (m && (/^R\d+$/i.test(m[2]) || /^(artifact:)?[\w./-]+$/.test(m[2]))) {
    const subject = /^R\d+$/i.test(m[2]) ? m[2].toUpperCase() : (m[2].startsWith("artifact:") ? m[2] : `artifact:${m[2]}`);
    return { kind: "review", say: `Recording your acceptance of ${subject}. This is a note in the cockpit; it does not change the gate or the model.`, subject, outcome: "accepted", note: m[3] || undefined };
  }
  m = /^(reject|decline)\s+(R\d+|\S+)(?:\s+(?:because|:)?\s*(.*))?$/i.exec(t);
  if (m) { const subject = /^R\d+$/i.test(m[2]) ? m[2].toUpperCase() : (m[2].startsWith("artifact:") ? m[2] : `artifact:${m[2]}`); return { kind: "review", say: `Recording that you rejected ${subject}.`, subject, outcome: "rejected", note: m[3] || undefined }; }
  m = /^cancel\s+(R\d+)$/i.exec(t);
  if (m) return { kind: "cancel", say: `Cancelling ${m[1].toUpperCase()}.`, request: m[1].toUpperCase() };

  // ---- the owner's choices about how work is done: a binding, a budget, an invariant. Cockpit state; none of it touches the process. ----
  const bind = (cap: string, impl: string): Plan | null => p.lenses.some((l) => l.name === cap.toLowerCase()) ? { kind: "control", say: `Binding ${cap.toLowerCase()} to ${impl}. The cockpit remembers your choice; no agent is started by it.`, op: { op: "human.bind", capability: cap.toLowerCase(), implementation: impl } } : null;
  m = /^use\s+([\w.-]+)\s+for\s+([a-z][a-z0-9-]*)$/i.exec(t); if (m) { const r = bind(m[2], m[1]); if (r) return r; }
  m = /^bind\s+([a-z][a-z0-9-]*)\s+to\s+([\w.-]+)$/i.exec(t); if (m) { const r = bind(m[1], m[2]); if (r) return r; }
  m = /^(?:unbind|clear binding(?: for)?)\s+([a-z][a-z0-9-]*)$/i.exec(t);
  if (m && p.lenses.some((l) => l.name === m![1].toLowerCase())) return { kind: "control", say: `Clearing your binding for ${m[1].toLowerCase()}.`, op: { op: "human.bind", capability: m[1].toLowerCase(), implementation: null, executor: null } };
  m = /^budget\s+([a-z][a-z-]*)\s+(\d+)\s*(minutes?|mins?|lens runs?|runs?)$/i.exec(t);
  if (m) { const n = Number(m[2]); const mins = /^min/i.test(m[3]); return { kind: "control", say: `Declaring a budget of ${n} ${mins ? "minutes" : "lens runs"} for ${m[1].toLowerCase()}. It is a limit you declared; the cockpit does not enforce it.`, op: { op: "human.contract", stage: m[1].toLowerCase(), budget: mins ? { minutes: n } : { lensRuns: n } } }; }
  m = /^invariant\s+([a-z][a-z-]*)\s*:\s*(.+)$/i.exec(t);
  if (m) return { kind: "control", say: `Adding an invariant to ${m[1].toLowerCase()}: ${m[2].slice(0, 80)}.`, op: { op: "human.contract", stage: m[1].toLowerCase(), addInvariant: m[2].trim().slice(0, 200) } };

  // ---- known questions: compiled to existing views, no model ----
  if (/^(?:what(?:'s| is| should)?(?: happen)?(?: should)? (?:happen )?next|what now|what do i do(?: next)?|next(?: move| step)?|what should (?:i|we) do(?: next)?)$/.test(low) || /^what should happen next$/.test(low))
    return { kind: "answer", say: i.primary ? `Next: ${i.primary.label}. Authority: ${i.primary.authority}. This is guidance, not an instruction.` : "No single move is primary right now; the Case lists what is available and what is blocked.", open: { template: "case" } };
  if (/\b(blocks?|blocking|stands? between|in the way)\b.*\b(acceptance|accept|the gate|release|launch|stopping|done)\b|^(?:show )?(?:me )?(?:the )?blockers?$/.test(low) || /^what (?:is )?blocks? (?:acceptance|the gate)$/.test(low))
    return { kind: "view", say: p.blockers.length ? `${p.blockers.length} blocker${p.blockers.length > 1 ? "s" : ""}: ${p.blockers[0].text}`.slice(0, 200) : "Nothing blocks the gate. The Review shows what it rests on.", open: p.blockers.length ? { template: "gate" } : { surface: "review" } };
  if (/^(?:show|open)(?: me)?(?: the)? work ?bench$|^(?:home|orient|where are we|status)$/.test(low)) return { kind: "view", say: "Showing the Workbench.", open: { surface: "workbench" } };
  if (/^(?:show|open)(?: me)?(?: the)? (?:workflow|process|stages|pipeline)$|^workflow$/.test(low)) return { kind: "view", say: "Showing the workflow: the real stages and lens dependencies of this run.", open: { surface: "workflow" } };
  if (/^(?:show|open)(?: me)?(?: the)? (?:capabilit(?:y|ies)|skills?)(?: for (?:this|the current|the) (?:stage|task))?$|^capabilit(?:y|ies)$/.test(low)) return { kind: "view", say: "Showing capabilities, with their implementations and executors.", open: { surface: "capabilities" } };
  m = /^(?:show|open)(?: me)?(?: the)? (?:capability|lens) ([a-z][a-z0-9-]*)$/.exec(low);
  if (m && p.lenses.some((l) => l.name === m![1])) return { kind: "view", say: `Showing ${m[1]}: capability, implementation, executor.`, open: { surface: "capabilities", capability: m[1] } };
  if (/^(?:show|open)(?: me)?(?: the)? (?:task )?contract$|^(?:the )?contract$/.test(low)) return { kind: "view", say: "Showing the task contract for the current stage.", open: { surface: "contract" } };
  if (/^(?:show|open)(?: me)?(?: the)? (?:work )?(?:requests?|queue|pending(?: work)?)$|^(?:pending|queue)$/.test(low)) return { kind: "view", say: "Showing the work requests and where each stands.", open: { surface: "requests" } };
  if (/^(?:review|show(?: me)?(?: the)? review|review what changed(?: before i accept(?: it)?)?)$/.test(low)) return { kind: "view", say: "Showing the evidence ledger and the work waiting for your review.", open: { surface: "review" } };
  if (/^(?:show|open)(?: me)?(?: the)? (?:case|destination|where (?:we are|are we) trying to go)$/.test(low)) return { kind: "view", say: "Showing the Case: the destination, the deviation, and the moves.", open: { template: "case" } };
  if (/^(?:why is|why are|show) (?:everything |anything )?stale$|^why (?:is|are) .*\bstale\b|^what (?:is|are) stale$|^show stale (?:artifacts|work)$/.test(low)) {
    const refs = refsIn(t, p).filter((r) => r.startsWith("artifact:"));
    if (refs[0]) return { kind: "view", say: `Why ${refs[0]} is what it is, from the run.`, open: { template: "ref", ref: refs[0], as: "why" } };
    const n = p.artifacts.filter((a) => a.status === "stale").length;
    return { kind: "view", say: n ? `${n} artifact${n > 1 ? "s are" : " is"} stale: a decision touched what ${n > 1 ? "they read" : "it reads"}.` : "Nothing is stale.", open: { template: "staleness" } };
  }
  m = /^(?:why is|why does|why do|why) (.+)$/.exec(low);
  if (m) { const r = refsIn(t, p)[0]; if (r) return { kind: "view", say: `Why ${r} is what it is, from the run.`, open: { template: "ref", ref: r, as: "why" } }; }
  m = /^(?:open|show|go to|inspect)(?: me)?(?: the)? (?:(?:claim|unknown|proposal|decision|artifact|evidence|lens|job|criterion|opportunity) )?(\S+)$/.exec(t);
  if (m) { const r = refsIn(m[1], p)[0] ?? refsIn(t, p)[0]; if (r) return { kind: "view", say: `Opening ${r}.`, open: { template: "ref", ref: r } }; }
  for (const [re, open, what] of SHOW) if (re.test(low)) return { kind: "view", say: `Showing ${what}.`, open };

  // ---- an imperative: work to be done, which only an executor can do ----
  if (ACT.test(low) || /^please /.test(low)) return asRequest(t.replace(/^please /i, ""), p, i, "");
  return { kind: "unrecognized", say: "Not understood, and nothing was queued. I answer questions about the run (what next, what blocks acceptance, show the workflow, why is X stale, show capabilities, show the contract, show requests) and queue things to do (start with a verb: verify the frontend, audit accessibility). To queue anything verbatim, start with \"request:\"." };
}

function asRequest(text: string, p: Proj, i: TermIn, because: string): Plan {
  const low = text.toLowerCase(); const refs = refsIn(text, p);
  let kind: RequestKind = "unclassified", capability: string | null = null, basis = because || "no capability is named by these words";
  const facts: Record<string, any> = {};
  if (/^(split|parallel(ize|ise))\b|\bacross (?:independent )?workers\b|\bindependent workers\b/.test(low)) {
    kind = "split";
    // Which lenses could run independently right now is a fact of the `needs` graph, not a plan. The executor decides what to do with it.
    const ready = p.lenses.filter((l) => l.status === "ready").map((l) => l.name);
    facts.independentNow = ready; basis = ready.length ? `${ready.length} lens${ready.length > 1 ? "es are" : " is"} ready now and their needs are met (recorded as a fact, not a plan)` : "no lens is ready now, so there is nothing to split yet";
  } else if (/^(steer|redirect|avoid|stop|switch|prefer)\b|\b(away from|instead of|rather than)\b/.test(low)) {
    kind = "steer"; basis = "a direction for work in flight; the executor decides what changes";
  } else if (/^(rebuild|regenerate|redo|re-?run)\b/.test(low)) {
    kind = "rebuild"; const a = refs.find((r) => r.startsWith("artifact:")); if (a) { const lens = p.artifacts.find((x) => `artifact:${x.id}` === a)?.lens; if (lens) { capability = lens; basis = `${a} is owned by lens ${lens}`; } }
  }
  if (!capability) {
    for (const [re, lens] of CAPABILITY_WORDS) { const hit = re.exec(low); if (hit && p.lenses.some((l) => l.name === lens)) { capability = lens; if (kind === "unclassified") kind = "capability"; basis = `keyword "${hit[0]}" suggests ${lens} (a hint, not a decision; the router may overrule)`; break; } }
  }
  const where = i.requests.filter((r) => ["queued", "acknowledged", "running", "produced", "ready_for_review", "blocked"].includes(r.status)).length;
  return { kind: "request", say: `Queued as a work request${capability ? ` for ${capability}` : " (no capability named)"}. Nothing has run: an executor must acknowledge it${where ? `; ${where} other${where > 1 ? "s are" : " is"} pending` : ""}.`, request: { text: text.slice(0, 500), kind, capability, refs, facts, basis } };
}
