// Parsing and validation for the Product Model, proposals.md, and artifact stamps.
// Standard library only. This is the single implementation of the SCHEMA.md checklist;
// hooks, the CLI, and tests/check.mjs all use it.

// The ten required sections, then three optional ones that may follow the decision log, in this order and no other. A model without
// them is valid and unchanged; with them, a job, how it is judged, and the evidenced shortfall become versioned, graded, stale-able rows.
export const REQUIRED_FIELDS = ["purpose", "actors", "capabilities", "constraints", "form", "voice", "positioning", "claims", "unknowns", "decisions"];
export const OPTIONAL_FIELDS = ["jobs", "criteria", "opportunities"];
export const FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
export const SECTIONS = ["Purpose", "Actors", "Capabilities", "Constraints", "Form and interaction", "Voice", "Positioning", "Claims ledger", "Unknowns", "Decision log"];
export const OPTIONAL_SECTIONS = ["Jobs", "Success criteria", "Opportunities"];
export const ALL_SECTIONS = [...SECTIONS, ...OPTIONAL_SECTIONS];
export const SECTION_KEY = Object.fromEntries(ALL_SECTIONS.map((s, i) => [s, FIELDS[i]]));
// How a job is judged. A criterion is an expectation about progress; a settlement outcome is a consequence that happened. They never share a word.
export const DIRECTIONS = new Set(["minimize", "maximize", "increase", "decrease", "avoid", "ensure"]);
// A measured importance or satisfaction is a number and the source it came from. Anything else is UNKNOWN; nothing is ever scored from prose.
export const MEASURED = /^-?\d+(\.\d+)?\s*\((.+)\)$/;
export const GRADES = new Set(["OBSERVED", "VERIFIED", "REPORTED", "INFERRED", "PROPOSED", "UNKNOWN", "CONTRADICTED"]);
export const PUBLIC_GRADES = new Set(["OBSERVED", "VERIFIED"]);
export const VERDICTS = new Set(["go", "no-go", "defer", "go-with-exception"]);

export function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const fm = {};
  if (m) for (const ln of m[1].split("\n")) {
    const i = ln.indexOf(":");
    if (i > 0) fm[ln.slice(0, i).trim()] = ln.slice(i + 1).trim();
  }
  return { fm, body: m ? text.slice(m[0].length) : text };
}

export function list(v) {
  return String(v ?? "").replace(/^\[|\]$/g, "").split(",").map((x) => x.trim()).filter(Boolean);
}

export function tableRows(section) {
  const rows = [];
  for (const ln of section.split("\n")) {
    if (!ln.startsWith("|") || /^\|[-| :]+\|$/.test(ln)) continue;
    rows.push(ln.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  }
  return rows.slice(1); // header row dropped
}

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// ---------- model ----------
export function parseModel(text) {
  const { fm, body } = frontmatter(text);
  const heads = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  const parts = body.split(/^## .+$/m).slice(1);
  const sections = Object.fromEntries(heads.map((h, i) => [h, parts[i] ?? ""]));
  const model = { fm, heads, sections, version: Number.parseInt(fm.model_version, 10), claims: new Map(), unknowns: new Map(), decisions: [], capabilities: [], actors: new Map(), jobs: new Map(), criteria: new Map(), opportunities: new Map() };
  if (sections["Claims ledger"] !== undefined) for (const r of tableRows(sections["Claims ledger"])) model.claims.set(r[0], { id: r[0], text: r[1], grade: r[2], source: r[3] });
  if (sections.Unknowns !== undefined) for (const r of tableRows(sections.Unknowns)) model.unknowns.set(r[0], { id: r[0], question: r[1], blocks: r[2], who: r[3] });
  if (sections["Decision log"] !== undefined) for (const r of tableRows(sections["Decision log"])) model.decisions.push({ n: r[0], decision: r[1], rationale: r[2], touched: r[3], version: Number.parseInt(r[4], 10) });
  if (sections.Actors !== undefined) for (const r of tableRows(sections.Actors)) model.actors.set(r[0], { id: r[0], actor: r[1], job: r[2] ?? "" });
  if (sections.Jobs !== undefined) for (const r of tableRows(sections.Jobs)) model.jobs.set(r[0], { id: r[0], actor: r[1], job: r[2], grade: r[3], source: r[4] ?? "" });
  if (sections["Success criteria"] !== undefined) for (const r of tableRows(sections["Success criteria"])) model.criteria.set(r[0], { id: r[0], job: r[1], direction: r[2], measure: r[3], object: r[4], context: r[5] ?? "", importance: r[6] ?? "UNKNOWN", satisfaction: r[7] ?? "UNKNOWN", grade: r[8], source: r[9] ?? "" });
  if (sections.Opportunities !== undefined) for (const r of tableRows(sections.Opportunities)) model.opportunities.set(r[0], { id: r[0], basis: r[1], deficiency: r[2], alternatives: r[3] ?? "", grade: r[4], source: r[5] ?? "" });
  if (sections.Capabilities !== undefined) model.capabilities = tableRows(sections.Capabilities).map((r) => ({ id: r[0], capability: r[1], claims: r[2] }));
  return model;
}

export function validateModel(m) {
  const e = [];
  if (!m.fm.product || !Number.isInteger(m.version) || m.version < 1) { e.push("front matter needs `product` and integer `model_version` >= 1"); return e; }
  const extra = m.heads.slice(SECTIONS.length);
  const orderedExtra = OPTIONAL_SECTIONS.filter((h) => extra.includes(h));
  if (JSON.stringify(m.heads.slice(0, SECTIONS.length)) !== JSON.stringify(SECTIONS) || JSON.stringify(extra) !== JSON.stringify(orderedExtra)) { e.push(`sections must be exactly, in order: ${SECTIONS.join(" | ")}, optionally followed by ${OPTIONAL_SECTIONS.join(" | ")} (in that order)`); return e; }
  for (const c of m.claims.values()) {
    if (!/^C\d+$/.test(c.id)) e.push(`claim id ${c.id} is not C<number>`);
    if (!GRADES.has(c.grade)) e.push(`${c.id}: grade "${c.grade}" is not one of ${[...GRADES].join(", ")}`);
    if (c.grade !== "UNKNOWN" && !c.source) e.push(`${c.id}: no source`);
    if (c.grade === "INFERRED") for (const p of c.source.match(/C\d+/g) ?? []) if (!m.claims.has(p)) e.push(`${c.id}: INFERRED cites missing parent ${p}`);
    if (c.grade === "CONTRADICTED" && c.source.split(";").filter((s) => s.trim()).length < 2) e.push(`${c.id}: CONTRADICTED needs two sources separated by ";"`);
    if (c.grade === "UNKNOWN" && ![...m.unknowns.keys()].some((u) => c.text.includes(u) || c.source.includes(u))) e.push(`${c.id}: UNKNOWN claim needs a matching Unknowns row (mention its id)`);
  }
  for (const k of m.capabilities) for (const c of k.claims.match(/C\d+/g) ?? []) if (!m.claims.has(c)) e.push(`capability ${k.id} cites missing ${c}`);
  m.decisions.forEach((d, i) => {
    if (d.n !== `D${i + 1}`) e.push(`decision numbering: found ${d.n}, expected D${i + 1}`);
    if (!Number.isInteger(d.version) || d.version > m.version) e.push(`${d.n}: version ${d.version} exceeds model_version ${m.version}`);
    if (!validTouched(d.touched)) e.push(`${d.n}: touched "${d.touched}" must be field keys, "all", or claims:C<n>[+C<n>]`);
  });
  validateDemand(m, e);
  if (m.decisions.length && Math.max(...m.decisions.map((d) => d.version)) !== m.version) e.push("max decision version must equal model_version");
  if (!m.decisions.length) e.push("decision log is empty");
  return e;
}

// Jobs, how they are judged, and the evidenced shortfall. Rules that keep a feature request from passing as an opportunity and a guess from passing as a measure.
function validateDemand(m, e) {
  const graded = (id, r) => {
    if (!GRADES.has(r.grade)) e.push(`${id}: grade "${r.grade}" is not one of ${[...GRADES].join(", ")}`);
    else if (r.grade !== "UNKNOWN" && !r.source) e.push(`${id}: no source`);
  };
  for (const j of m.jobs.values()) {
    if (!/^J\d+$/.test(j.id)) e.push(`job id ${j.id} is not J<number>`);
    if (!j.job) e.push(`${j.id}: states no progress sought`);
    if (m.actors.size && !m.actors.has(j.actor)) e.push(`${j.id}: actor ${j.actor} is not in the Actors table`);
    graded(j.id, j);
  }
  for (const c of m.criteria.values()) {
    if (!/^S\d+$/.test(c.id)) e.push(`success criterion id ${c.id} is not S<number>`);
    if (!m.jobs.has(c.job)) e.push(`${c.id}: judges ${c.job || "nothing"}, which is not a job`);
    if (!DIRECTIONS.has(c.direction)) e.push(`${c.id}: direction "${c.direction}" is not one of ${[...DIRECTIONS].join(", ")}`);
    if (!c.measure) e.push(`${c.id}: no measure`);
    for (const k of ["importance", "satisfaction"]) if (c[k] !== "UNKNOWN" && !MEASURED.test(c[k])) e.push(`${c.id}: ${k} must be UNKNOWN or "<number> (<source>)"; a measured value carries the source it came from`);
    graded(c.id, c);
  }
  for (const o of m.opportunities.values()) {
    if (!/^OP\d+$/.test(o.id)) e.push(`opportunity id ${o.id} is not OP<number>`);
    if (!m.criteria.has(o.basis) && !m.jobs.has(o.basis)) e.push(`${o.id}: basis ${o.basis || "(none)"} is not a success criterion or a job; an opportunity recovers the progress that is under-served, it is not a request or a solution`);
    if (!o.deficiency) e.push(`${o.id}: states no deficiency`);
    graded(o.id, o);
  }
}

export function validTouched(touched) {
  const toks = String(touched).split(",").map((t) => t.trim()).filter(Boolean);
  if (!toks.length) return false;
  return toks.every((t) => t === "all" || FIELDS.includes(t) || /^claims:C\d+(\+C\d+)*$/.test(t));
}

// What changed between two model versions, by field and by claim row.
export function diffModels(base, next) {
  const changedFields = new Set();
  const changedClaims = new Set();
  if (!base) { FIELDS.forEach((f) => changedFields.add(f)); next.claims.forEach((_, id) => changedClaims.add(id)); return { changedFields, changedClaims }; }
  for (const s of ALL_SECTIONS) {
    const key = SECTION_KEY[s];
    if (key === "decisions" || key === "claims") continue;
    if (norm(base.sections[s]) !== norm(next.sections[s])) changedFields.add(key);
  }
  for (const id of new Set([...base.claims.keys(), ...next.claims.keys()])) {
    const a = base.claims.get(id), b = next.claims.get(id);
    if (!a || !b || a.text !== b.text || a.grade !== b.grade || a.source !== b.source) changedClaims.add(id);
  }
  if (changedClaims.size) changedFields.add("claims");
  return { changedFields, changedClaims };
}

// Does a decision's `touched` list cover everything that changed?
export function touchCoverage(touchedStrings, diff) {
  const covered = new Set();
  let allClaims = false, all = false;
  const claimIds = new Set();
  for (const t of touchedStrings.flatMap((s) => s.split(",").map((x) => x.trim()))) {
    if (t === "all") all = true;
    else if (t === "claims") allClaims = true, covered.add("claims");
    else if (t.startsWith("claims:")) { covered.add("claims"); t.slice(7).split("+").forEach((i) => claimIds.add(i)); }
    else covered.add(t);
  }
  if (all) return [];
  const missing = [];
  for (const f of diff.changedFields) if (f !== "claims" && !covered.has(f)) missing.push(f);
  if (diff.changedClaims.size && !allClaims) for (const id of diff.changedClaims) if (!claimIds.has(id)) missing.push(`claims:${id}`);
  return missing;
}

// ---------- proposals ----------
export function parseProposals(text) {
  return tableRows(text ?? "").map((r) => ({ id: r[0], lens: r[1], field: r[2], kind: r[3], proposal: r[4], evidence: r[5], status: r[6], reason: r[7] ?? "" }));
}

export function validateProposalRows(rows) {
  const e = [], seen = new Set();
  for (const r of rows) {
    if (!/^P\d+$/.test(r.id)) e.push(`proposal id "${r.id}" is not P<number>`);
    if (seen.has(r.id)) e.push(`duplicate proposal id ${r.id}`);
    seen.add(r.id);
    if (!FIELDS.includes(r.field)) e.push(`${r.id}: field "${r.field}" is not a model field key`);
    if (!["discovery", "change"].includes(r.kind)) e.push(`${r.id}: kind must be discovery or change`);
    if (!r.evidence) e.push(`${r.id}: evidence is required (use the Source format)`);
    if (!(r.status === "open" || r.status === "rejected" || /^accepted:D\d+$/.test(r.status))) e.push(`${r.id}: status must be open, rejected, or accepted:D<n>`);
  }
  return e;
}

const WEAK_REASONS = /^(not needed|n\/a|na|no|none|unneeded|not required|nope|rejected)\.?$/i;
export function validateResolution(rows, baseRows, model) {
  const e = [], base = new Map(baseRows.map((r) => [r.id, r]));
  for (const r of rows) {
    const b = base.get(r.id);
    if (b && b.status !== "open") {
      if (JSON.stringify(b) !== JSON.stringify(r)) e.push(`${r.id}: already resolved; resolved proposals are immutable`);
      continue;
    }
    if (r.status === "open") { e.push(`${r.id}: still open; accept or reject it with a reason`); continue; }
    if (r.status === "rejected") {
      if (r.reason.length < 20 || WEAK_REASONS.test(r.reason)) e.push(`${r.id}: rejection needs a specific reason (what is wrong and what evidence would change it)`);
      continue;
    }
    const d = r.status.slice(9);
    const dec = model.decisions.find((x) => x.n === d);
    if (!dec) e.push(`${r.id}: accepted:${d} but ${d} is not in the decision log`);
  }
  for (const b of baseRows) if (!rows.find((r) => r.id === b.id)) e.push(`${b.id}: proposal row was deleted`);
  return e;
}

// ---------- artifacts ----------
export function parseStamp(text) {
  const head = {};
  for (const ln of text.split("\n")) {
    if (!ln.trim()) break;
    const m = /^([a-z_]+):\s*(.*)$/.exec(ln);
    if (!m) break;
    head[m[1]] = m[2].trim();
  }
  const built = /^model@(\d+)$/.exec(head.built_from ?? "");
  return {
    head,
    built: built ? Number(built[1]) : null,
    reads: list(head.reads),
    cites: list(head.cites),
    public: head.public === "true",
    hasReads: "reads" in head,
    hasCites: "cites" in head,
  };
}

export function inlineCites(text) {
  const body = text.includes("\n\n") ? text.slice(text.indexOf("\n\n")) : text;
  return [...new Set([...body.matchAll(/\[(C\d+)\]/g)].map((m) => m[1]))];
}

// Validates one artifact against the model it claims to be built from.
export function validateArtifact(text, model, { lensReads = null, isGate = false, currentVersion = null } = {}) {
  const e = [];
  const s = parseStamp(text);
  if (s.built === null) return ["missing stamp: the first lines must be `built_from: model@N`, `reads: [...]`, `cites: [...]`"];
  if (!s.hasReads) e.push("stamp needs `reads: [field keys it used]`");
  if (!s.hasCites) e.push("stamp needs `cites: [claim ids it states]` (use [] for none)");
  const readsOk = (f) => FIELDS.includes(f) || (f === "all" && isGate);
  for (const f of s.reads) if (!readsOk(f)) e.push(`reads: "${f}" is not a model field key`);
  if (lensReads && !s.reads.includes("all")) for (const f of s.reads) if (FIELDS.includes(f) && !lensReads.includes(f)) e.push(`reads: "${f}" is outside this lens's declared reads`);
  if (currentVersion !== null && s.built !== currentVersion) e.push(`built_from model@${s.built} but the model is at version ${currentVersion}`);
  const inline = inlineCites(text);
  for (const c of s.cites) {
    const claim = model.claims.get(c);
    if (!claim) e.push(`cites ${c}, which is not in the claims ledger at model@${s.built}`);
    else if (s.public && !PUBLIC_GRADES.has(claim.grade)) e.push(`public artifact cites ${c} graded ${claim.grade}; only OBSERVED or VERIFIED may be public`);
  }
  if (isGate) { for (const c of inline) if (!s.cites.includes(c)) e.push(`inline [${c}] is not in cites`); }
  else {
    for (const c of inline) if (!s.cites.includes(c)) e.push(`inline [${c}] is not listed in cites`);
    for (const c of s.cites) if (!inline.includes(c)) e.push(`cites lists ${c} but the text never cites [${c}] inline`);
  }
  if (isGate) {
    if (!VERDICTS.has(s.head.verdict)) e.push(`gate needs \`verdict:\` one of ${[...VERDICTS].join(", ")}`);
    if (!s.head.owner) e.push("gate needs `owner:` (the accountable owner)");
  }
  return e;
}

// ---------- staleness ----------
export function touches(touched, reads, cites) {
  for (const raw of String(touched).split(",")) {
    const t = raw.trim();
    if (t === "all") return true;
    if (t === "claims" || t.startsWith("claims:")) {
      if (!(reads.includes("claims") || reads.includes("all"))) continue;
      const ids = t.match(/C\d+/g) ?? [];
      if (!ids.length || ids.some((i) => cites.includes(i))) return true;
    } else if (reads.includes(t) || reads.includes("all")) return true;
  }
  return false;
}

export function staleReasons(stamp, model) {
  if (stamp.built === null) return ["unstamped"];
  return model.decisions.filter((d) => d.version > stamp.built && touches(d.touched, stamp.reads, stamp.cites)).map((d) => d.n);
}
