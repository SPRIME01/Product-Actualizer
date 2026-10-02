// The actualization process as a state machine, plus the gate that decides whether a run may stop.
// Hooks (any client) and the CLI both call into this; nothing here is client-specific.
import { unhandled as inboxUnhandled } from "./lib/inbox.mjs";
import fs from "node:fs";
import path from "node:path";
import {
  parseModel, validateModel, diffModels, touchCoverage, parseProposals, validateProposalRows, validateResolution,
  parseStamp, validateArtifact, staleReasons, FIELDS,
} from "./lib/md.mjs";
import { makeRun, loadState, saveState, newState, readText, writeAtomic, modelHash, listFiles, sha, log, schemaDir, DIR_NAME, CLI_PATH, IS_COMPILED } from "./lib/store.mjs";
import { loadLenses, lensBody, waves, ROUTER } from "./lib/lenses.mjs";

const PROPOSALS_HEADER = "# proposals.md\n\n| id | lens | field | kind | proposal | evidence | status | reason |\n|---|---|---|---|---|---|---|---|\n";
const GATE_LENS = "release-readiness";
const isRecon = (n) => n.startsWith("recon-");
export const cliCmd = () => (IS_COMPILED ? `"${CLI_PATH}"` : `bun "${CLI_PATH}"`);
export const withCli = (t) => String(t).replaceAll("$CLI", cliCmd());
const fail = (msg) => { throw new ProcessError(withCli(msg)); };
export class ProcessError extends Error {}

// ---------- reading the run ----------
export function readModel(run, file = run.modelPath) {
  const t = readText(file);
  return t === null ? null : parseModel(t);
}
export function snapshotPath(run, v) { return path.join(run.historyDir, `model-v${v}.md`); }

export function readProposals(run) {
  return parseProposals(readText(run.proposalsPath, ""));
}

export function artifactFiles(run) {
  return listFiles(run.artifactsDir).filter((f) => f.endsWith(".md")).map((f) => ({ rel: f, abs: path.join(run.artifactsDir, f), lens: f.split(path.sep)[0] }));
}

// Every stamped artifact with its validation errors and staleness against the current model.
export function inspectArtifacts(run, state, lenses) {
  const current = readModel(run);
  const out = [];
  for (const a of artifactFiles(run)) {
    const text = readText(a.abs, "");
    const stamp = parseStamp(text);
    const isGate = a.lens === GATE_LENS && path.basename(a.rel) === "gate.md";
    let against = current;
    if (stamp.built !== null && stamp.built !== state.modelVersion) against = readModel(run, snapshotPath(run, stamp.built)) ?? current;
    const errors = against ? validateArtifact(text, against, { lensReads: lenses[a.lens]?.reads ?? null, isGate }) : ["no model to validate against"];
    const stale = current && stamp.built !== null ? staleReasons(stamp, current) : stamp.built === null ? ["unstamped"] : [];
    out.push({ ...a, stamp, isGate, errors, stale });
  }
  return out;
}

// ---------- the gate ----------
export function computeGate(run, state, lenses, { forStop = true } = {}) {
  const b = [];
  const add = (code, text, fix) => b.push({ code, text, fix });
  if (!state.selection) add("select", "No lens selection recorded.", "$CLI lenses, then $CLI select --lenses a,b --exclude lens=reason ...");
  if (state.phase === "reconcile") add("reconcile-open", "A reconciliation is open.", "Resolve proposals and the model, then run: $CLI reconcile done");
  const active = Object.keys(state.activeLenses);
  if (active.length) add("lens-open", `Lens still running: ${active.join(", ")}.`, `$CLI lens done ${active[0]}`);
  if (state.unreconciled.length) add("unreconciled", `Lens output not yet in the model: ${state.unreconciled.join(", ")}.`, "$CLI reconcile start");
  const model = readModel(run);
  const props = readProposals(run);
  if (state.selection) {
    if (!model) add("model-missing", "The Product Model has not been built.", "Run the recon lenses, then: $CLI reconcile start");
    else {
      if (state.phase !== "reconcile") {
        if (state.modelHash && modelHash(run) !== state.modelHash) add("model-tampered", "product-model.md changed outside a reconciliation.", "Revert with: $CLI model restore, and put the change in proposals.md instead");
        const errs = validateModel(model);
        if (errs.length) add("model-invalid", `Model fails SCHEMA checks: ${errs.slice(0, 3).join("; ")}`, "Fix in a reconciliation (reconcile start)");
      }
      const open = props.filter((p) => p.status === "open");
      if (open.length && state.phase !== "reconcile") add("proposals-open", `${open.length} open proposal(s): ${open.map((p) => p.id).join(", ")}.`, "$CLI reconcile start; accept or reject each with a logged reason");
    }
    for (const n of state.selection.lenses) if (!state.completed[n] && n !== GATE_LENS) add("lens-not-run", `Selected lens never ran: ${n}.`, `$CLI lens start ${n} (or change the selection with select)`);
  }
  const waiting = inboxUnhandled(run);
  if (waiting.length) add("inbox", `${waiting.length} owner response(s) not yet handled: ${waiting.slice(0, 4).map((e) => e.id).join(", ")}.`, "$CLI inbox, then route each (proposal, decision, unknown, or no action with a reason) and $CLI inbox ack <id> --as \"...\"");
  const arts = model ? inspectArtifacts(run, state, lenses) : [];
  for (const a of arts) {
    if (a.errors.length) add("artifact-invalid", `artifacts/${a.rel}: ${a.errors[0]}`, `Re-run the owning lens: $CLI lens start ${a.lens}`);
    else if (a.stale.length && !a.isGate) add("stale", `artifacts/${a.rel} is stale (decision ${a.stale.join(", ")} touched what it reads/cites).`, `$CLI lens start ${a.lens}, rebuild it, $CLI lens done ${a.lens}`);
  }
  if (model && state.selection) {
    const gate = arts.find((a) => a.isGate);
    if (!gate) add("no-gate", `No release gate at artifacts/${GATE_LENS}/gate.md.`, `$CLI lens start ${GATE_LENS}`);
    else if (gate.stamp.built !== state.modelVersion) add("gate-stale", `Gate was built from model@${gate.stamp.built}; the model is at ${state.modelVersion}.`, `Re-run ${GATE_LENS} against the current version`);
  }
  return { blockers: b, ready: b.length === 0, model, props, arts };
}

export function nextAction(run, state, lenses) {
  if (!state.active) return "run complete";
  if (!state.selection) return "classify evidence, then `lenses` and `select`";
  if (state.phase === "reconcile") return "finish the reconciliation: edit product-model.md and proposals.md, then `reconcile done`";
  const active = Object.keys(state.activeLenses);
  if (active.length) return `finish lens work (${active.join(", ")}), then \`lens done <name>\``;
  if (state.unreconciled.length) {
    const pending = state.modelVersion ? [] : state.selection.lenses.filter((n) => isRecon(n) && !state.completed[n]);
    return pending.length ? `\`lens start ${pending.join("`, `lens start ")}\`` : "`reconcile start`";
  }
  const g = computeGate(run, state, lenses);
  const ready = readyLenses(state, lenses, g);
  if (ready.length) return `\`lens start ${ready.join("`, `lens start ")}\``;
  if (!g.ready) return g.blockers[0].fix.replace("$CLI", "<cli>");
  return "`done`";
}

export function readyLenses(state, lenses, gate = null) {
  if (!state.selection) return [];
  const staleOwners = new Set((gate?.arts ?? []).filter((a) => a.stale.length && !a.isGate).map((a) => a.lens));
  const out = [];
  for (const n of state.selection.lenses) {
    if (state.activeLenses[n]) continue;
    if (!state.modelVersion && !isRecon(n)) continue;
    const needs = lenses[n]?.needs ?? [];
    const okNeeds = needs.every((d) => state.selection.satisfied.includes(d) || (state.completed[d] && !state.unreconciled.includes(d)));
    if (!okNeeds) continue;
    if (n === GATE_LENS) {
      const others = state.selection.lenses.filter((x) => x !== GATE_LENS);
      if (!others.every((x) => state.completed[x]) || state.unreconciled.length || staleOwners.size) continue;
      if (gate && gate.props.some((p) => p.status === "open")) continue;
      const gateArt = (gate?.arts ?? []).find((a) => a.isGate);
      if (gateArt && gateArt.stamp.built === state.modelVersion) continue;
      out.push(n);
    } else if (!state.completed[n] || staleOwners.has(n)) out.push(n);
  }
  return out;
}

// ---------- commands ----------
export function begin(dirArg, { goal, bar, strict = true, force = false }) {
  if (!goal || goal.length < 8) fail("--goal is required: one line stating what 'launchable' means here (min 8 chars)");
  if (!["demo", "beta", "release"].includes(bar)) fail("--bar must be demo, beta, or release");
  const run = makeRun(path.resolve(dirArg || DIR_NAME));
  const prev = loadState(run);
  if (prev && !force && prev.active) fail(`a run is already active in ${run.dir} (use --force to restart)`);
  if (prev && !force) fail(`a finished run exists in ${run.dir} (use --force to start over)`);
  for (const d of [run.dir, run.artifactsDir, run.evidenceDir, run.historyDir, run.hiddenDir]) fs.mkdirSync(d, { recursive: true });
  if (!fs.existsSync(run.proposalsPath) || force) writeAtomic(run.proposalsPath, PROPOSALS_HEADER);
  saveState(run, newState({ goal, bar, strict }));
  log(run, { type: "begin", goal, bar, strict });
  return run;
}

export function select(run, state, lenses, { chosen, satisfied = [], exclude = {} }) {
  if (state.phase !== "idle" || Object.keys(state.activeLenses).length) fail("select only between lens runs (no active lens, no open reconciliation)");
  const all = Object.keys(lenses);
  const unknown = [...chosen, ...satisfied, ...Object.keys(exclude)].filter((n) => !lenses[n]);
  if (unknown.length) fail(`unknown lens name(s): ${unknown.join(", ")}. Known: ${all.join(", ")}`);
  if (!chosen.includes(GATE_LENS)) fail(`${GATE_LENS} must always be selected (the process ends at its gate)`);
  if (!state.modelVersion && !chosen.some(isRecon)) fail("select at least one recon-* lens; the model is built from recon output");
  const overlap = chosen.filter((n) => n in exclude || satisfied.includes(n));
  if (overlap.length) fail(`lens(es) both selected and excluded/satisfied: ${overlap.join(", ")}`);
  const rest = all.filter((n) => !chosen.includes(n));
  const missing = rest.filter((n) => !(n in exclude) && !satisfied.includes(n));
  if (missing.length) fail(`give an exclusion reason for each unselected lens: ${missing.map((n) => `--exclude ${n}="<why the goal and evidence do not need it>"`).join(" ")}`);
  const thin = Object.entries(exclude).filter(([, r]) => String(r).trim().length < 12);
  if (thin.length) fail(`exclusion reasons must be specific (12+ chars): ${thin.map(([n]) => n).join(", ")}`);
  for (const n of chosen) for (const d of lenses[n].needs) if (!chosen.includes(d) && !satisfied.includes(d)) fail(`${n} needs ${d}: select it, or pass --satisfied ${d} if the model already has that information`);
  const w = waves(lenses, chosen);
  state.selection = { lenses: chosen, satisfied, excluded: exclude, waves: w };
  state.selectionLogged = false;
  log(run, { type: "select", chosen, satisfied, excluded: Object.keys(exclude) });
  saveState(run, state);
  return w;
}

function outputHashes(run, name) {
  const h = {};
  for (const [base, dir] of [["artifacts", run.artifactsDir], ["evidence", run.evidenceDir]]) {
    for (const f of listFiles(path.join(dir, name))) h[`${base}/${name}/${f}`] = sha(readText(path.join(dir, name, f), ""));
  }
  return h;
}

export function lensStart(run, state, lenses, name) {
  if (!state.active) fail("no active run");
  if (!state.selection) fail("select lenses first ($CLI lenses; $CLI select ...)");
  if (!lenses[name]) fail(`unknown lens ${name}`);
  if (!state.selection.lenses.includes(name)) fail(`${name} is not in the selection (${state.selection.lenses.join(", ")}); change it with select and a logged reason`);
  if (state.phase === "reconcile") fail("a reconciliation is open; finish it before starting a lens");
  if (state.activeLenses[name]) fail(`${name} is already running`);
  if (!state.modelVersion && !isRecon(name)) fail(`${name} cannot start before the model exists; run the recon lenses and reconcile first`);
  for (const d of lenses[name].needs) {
    if (state.selection.satisfied.includes(d)) continue;
    if (!state.completed[d]) fail(`${name} needs ${d}, which has not run`);
    if (state.unreconciled.includes(d)) fail(`${name} needs ${d}'s output, which is not in the model yet: $CLI reconcile start`);
  }
  if (name === GATE_LENS) {
    const g = computeGate(run, state, lenses);
    const others = state.selection.lenses.filter((x) => x !== GATE_LENS && !state.completed[x]);
    if (others.length) fail(`${GATE_LENS} runs last; still to run: ${others.join(", ")}`);
    if (state.unreconciled.length) fail(`reconcile before ${GATE_LENS}: $CLI reconcile start`);
    const stale = g.arts.filter((a) => a.stale.length && !a.isGate);
    if (stale.length) fail(`rebuild stale artifacts before verifying: ${stale.map((a) => a.lens).join(", ")}`);
    if (g.props.some((p) => p.status === "open")) fail("resolve open proposals before verifying");
  }
  state.activeLenses[name] = { startedAt: new Date().toISOString(), baseProposals: readProposals(run), baseVersion: state.modelVersion, baseFiles: outputHashes(run, name) };
  state.stopBlocks = 0;
  log(run, { type: "lens_start", lens: name, version: state.modelVersion });
  saveState(run, state);
  return { body: lensBody(lenses[name]), reads: lenses[name].reads };
}

export function lensDone(run, state, lenses, name, { noOutput = null } = {}) {
  const a = state.activeLenses[name];
  if (!a) fail(`${name} is not running`);
  const rows = readProposals(run);
  const errs = validateProposalRows(rows);
  const baseById = new Map(a.baseProposals.map((r) => [r.id, r]));
  for (const r of rows) { const b = baseById.get(r.id); if (b && JSON.stringify(b) !== JSON.stringify(r)) errs.push(`${r.id}: existing proposal rows may not change during a lens run`); }
  for (const b of a.baseProposals) if (!rows.some((r) => r.id === b.id)) errs.push(`${b.id}: proposal row was deleted`);
  const mine = rows.filter((r) => !baseById.has(r.id) && r.lens === name);
  for (const r of mine) if (r.status !== "open") errs.push(`${r.id}: new proposals must be open`);
  const after = outputHashes(run, name);
  const changed = Object.keys(after).filter((k) => after[k] !== a.baseFiles[k]);
  const model = readModel(run);
  if (model) {
    for (const k of changed.filter((c) => c.startsWith("artifacts/") && c.endsWith(".md"))) {
      const rel = k.slice("artifacts/".length);
      const isGate = name === GATE_LENS && path.basename(rel) === "gate.md";
      const e = validateArtifact(readText(path.join(run.artifactsDir, rel), ""), model, { lensReads: lenses[name].reads, isGate, currentVersion: state.modelVersion });
      e.forEach((m) => errs.push(`${k}: ${m}`));
    }
  } else if (changed.some((c) => c.startsWith("artifacts/"))) errs.push("artifacts cannot exist before the model; write evidence/ files and proposals during recon");
  if (!mine.length && !changed.length && !(noOutput && noOutput.length >= 10)) errs.push(`${name} produced no proposals, artifacts, or evidence; pass --no-output "<reason>" if nothing needed to change`);
  if (errs.length) fail(`cannot finish ${name}:\n  - ${errs.join("\n  - ")}`);
  delete state.activeLenses[name];
  state.completed[name] = (state.completed[name] ?? 0) + 1;
  if (mine.length && !state.unreconciled.includes(name)) state.unreconciled.push(name);
  state.stopBlocks = 0;
  log(run, { type: "lens_done", lens: name, proposals: mine.map((r) => r.id), files: changed });
  saveState(run, state);
  return { proposals: mine.length, files: changed };
}

const PLACEHOLDER = /<[A-Za-z][^<>\n]{3,}>/;

export function reconcileStart(run, state, lenses) {
  if (!state.active) fail("no active run");
  if (state.phase === "reconcile") fail("a reconciliation is already open");
  const active = Object.keys(state.activeLenses);
  if (active.length) fail(`finish running lens(es) first: ${active.join(", ")}`);
  const rows = readProposals(run);
  const hasModel = fs.existsSync(run.modelPath);
  if (!state.modelVersion || !hasModel) {
    const recon = (state.selection?.lenses ?? []).filter(isRecon);
    if (!recon.length) fail("select lenses first");
    const pending = recon.filter((n) => !state.completed[n]);
    if (pending.length) fail(`the first reconciliation builds the model from recon output; still to run: ${pending.join(", ")}`);
  } else if (!rows.some((p) => p.status === "open") && state.selectionLogged) fail("nothing to reconcile: no open proposals");
  fs.mkdirSync(run.hiddenDir, { recursive: true });
  let baseVersion = 0;
  if (hasModel && state.modelVersion) {
    baseVersion = state.modelVersion;
    const t = readText(run.modelPath);
    writeAtomic(path.join(run.hiddenDir, "model.base.md"), t);
    if (!fs.existsSync(snapshotPath(run, baseVersion))) writeAtomic(snapshotPath(run, baseVersion), t);
  } else {
    try { fs.unlinkSync(path.join(run.hiddenDir, "model.base.md")); } catch { /* none */ }
    const tpl = readText(path.join(schemaDir(), "TEMPLATE.md"));
    if (!tpl) fail(`TEMPLATE.md not found in ${schemaDir()}`);
    writeAtomic(run.modelPath, tpl);
  }
  writeAtomic(path.join(run.hiddenDir, "proposals.base.md"), readText(run.proposalsPath, PROPOSALS_HEADER));
  state.phase = "reconcile";
  state.reconcile = { baseVersion };
  state.stopBlocks = 0;
  log(run, { type: "reconcile_start", baseVersion });
  saveState(run, state);
  return { baseVersion, openProposals: rows.filter((p) => p.status === "open").length, created: baseVersion === 0 };
}

export function reconcileDone(run, state, lenses) {
  if (state.phase !== "reconcile") fail("no reconciliation is open ($CLI reconcile start)");
  const base = state.reconcile.baseVersion;
  const text = readText(run.modelPath);
  if (text === null) fail("product-model.md is missing");
  const model = parseModel(text);
  const errs = validateModel(model);
  const ph = text.match(PLACEHOLDER);
  if (ph) errs.push(`unfilled template placeholder: ${ph[0].slice(0, 60)}`);
  if (/^product:\s*<?name>?\s*$/m.test(text)) errs.push("front matter `product:` is still the template value");
  const baseModel = base > 0 ? readModel(run, path.join(run.hiddenDir, "model.base.md")) : null;
  const newDecisions = model.decisions.slice(baseModel ? baseModel.decisions.length : 0);
  if (baseModel) {
    baseModel.decisions.forEach((d, i) => { if (JSON.stringify(d) !== JSON.stringify(model.decisions[i])) errs.push(`${d.n}: existing decision rows are immutable`); });
    const diff = diffModels(baseModel, model);
    const changed = diff.changedFields.size > 0 || newDecisions.length > 0;
    if (!changed && model.version !== base) errs.push(`nothing changed, so model_version must stay ${base}`);
    if (changed) {
      if (model.version !== base + 1) errs.push(`model_version must be ${base + 1} (exactly one bump per reconciliation); found ${model.version}`);
      if (!newDecisions.length) errs.push("fields changed but no new decision rows record why");
      const missing = touchCoverage(newDecisions.map((d) => d.touched), diff);
      if (missing.length) errs.push(`decision log must name what changed in \`touched\`: ${missing.join(", ")} (staleness depends on it)`);
    }
  } else {
    if (model.version !== 1) errs.push("the first model must be version 1");
    if (!model.decisions.length) errs.push("the first reconciliation needs decision rows");
    const ds = newDecisions.map((d) => `${d.decision} ${d.rationale}`).join(" ");
    if (!/goal/i.test(ds)) errs.push(`log the goal as a decision (mention "Goal" and the ${state.bar} bar)`);
  }
  for (const d of newDecisions) if (d.version !== (baseModel ? base + 1 : 1)) errs.push(`${d.n}: new decisions must carry version ${baseModel ? base + 1 : 1}`);
  const rows = parseProposals(readText(run.proposalsPath, ""));
  const baseRows = parseProposals(readText(path.join(run.hiddenDir, "proposals.base.md"), ""));
  errs.push(...validateProposalRows(rows));
  errs.push(...validateResolution(rows, baseRows, model));
  const baseIds = new Set(baseRows.filter((r) => r.status !== "open").map((r) => r.id));
  for (const r of rows) {
    if (baseIds.has(r.id) || !r.status.startsWith("accepted:")) continue;
    const dec = model.decisions.find((x) => x.n === r.status.slice(9));
    if (dec && !newDecisions.includes(dec)) errs.push(`${r.id}: accepted:${dec.n} must point at a decision created in this reconciliation`);
  }
  if (state.selection && !state.selectionLogged) {
    const ds = newDecisions.map((d) => `${d.decision} ${d.rationale}`).join(" ").toLowerCase();
    const absent = Object.keys(state.selection.excluded).filter((n) => !ds.includes(n.toLowerCase()));
    const sel = state.selection.lenses.filter((n) => !ds.includes(n.toLowerCase()));
    if (absent.length || sel.length) errs.push(`log the lens selection as a decision that names every selected lens and every excluded lens with its reason; missing: ${[...sel, ...absent].join(", ")}`);
  }
  if (errs.length) fail(`cannot close the reconciliation:\n  - ${errs.join("\n  - ")}`);
  const changed = !baseModel || model.version !== base;
  writeAtomic(snapshotPath(run, model.version), text);
  state.modelVersion = model.version;
  state.modelHash = modelHash(run);
  state.phase = "idle";
  state.reconcile = null;
  state.unreconciled = [];
  if (state.selection) state.selectionLogged = true;
  state.stopBlocks = 0;
  log(run, { type: "reconcile_done", version: model.version, changed });
  saveState(run, state);
  const g = computeGate(run, state, lenses);
  return { version: model.version, changed, stale: g.arts.filter((a) => a.stale.length && !a.isGate).map((a) => ({ lens: a.lens, file: a.rel, by: a.stale })), ready: readyLenses(state, lenses, g) };
}

export function finish(run, state, lenses) {
  const g = computeGate(run, state, lenses);
  if (!g.ready) return { ok: false, gate: g };
  const gateArt = g.arts.find((a) => a.isGate);
  state.active = false;
  state.finishedAt = new Date().toISOString();
  state.verdict = gateArt.stamp.head.verdict;
  state.owner = gateArt.stamp.head.owner;
  log(run, { type: "done", verdict: state.verdict });
  saveState(run, state);
  return { ok: true, gate: g, verdict: state.verdict, owner: state.owner };
}

export function restoreModel(run, state) {
  if (state.phase === "reconcile") fail("a reconciliation is open; edit the model there");
  const snap = readText(snapshotPath(run, state.modelVersion));
  if (snap === null) fail(`no snapshot for model@${state.modelVersion}`);
  writeAtomic(run.modelPath, snap);
  state.modelHash = modelHash(run);
  saveState(run, state);
  return state.modelVersion;
}

export function summary(run, state, lenses) {
  const g = state.active ? computeGate(run, state, lenses) : null;
  return {
    active: state.active, goal: state.goal, bar: state.bar, phase: state.phase,
    modelVersion: state.modelVersion, activeLenses: Object.keys(state.activeLenses), completed: state.completed,
    unreconciled: state.unreconciled, selection: state.selection ? { lenses: state.selection.lenses, waves: state.selection.waves, excluded: Object.keys(state.selection.excluded) } : null,
    blockers: g ? g.blockers : [], next: nextAction(run, state, lenses),
    verdict: state.verdict ?? null,
  };
}

export { FIELDS, ROUTER, GATE_LENS, loadLenses };
