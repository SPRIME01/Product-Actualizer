// The hook rules. Pure functions of (normalized event, files on disk): no client-specific code here.
// Decision shape: { context?, deny?, block?, feedback?, notice? }  (all strings)
import path from "node:path";
import { findRun, loadState, saveState, readText, modelHash, log, zoneOf, CLI_PATH, skillsDir } from "./lib/store.mjs";
import { parseModel, validateModel, validateArtifact, validateProposalRows, parseProposals } from "./lib/md.mjs";
import { unhandled as inboxUnhandled, describe as describeInbox } from "./lib/inbox.mjs";
import { loadLenses, lensOfPath } from "./lib/lenses.mjs";
import { computeGate, nextAction, finish, withCli, cliCmd, GATE_LENS } from "./process.mjs";

const MAX_STOP_BLOCKS = 4;
const INTENT = /\b(actuali[sz]e|make (it|this|the product) (launch|ship|real)|get (it|this) (ready )?(to )?(launch|ship)|launch(-| )ready|finish (the |this |my )?product|take (it|this) to (market|launch)|launchable)\b/i;
const WRITE_OPS = /(^|[\s;&|(])(tee|sed\s+-[a-z]*i|perl\s+-[a-z]*i|mv|cp|rm|truncate|install|dd|touch|ed|ex|git\s+(checkout|restore|reset|stash|clean|apply|mv|rm))\b|>>?|\bpython3?\b[^|]*\bopen\(|\b(node|bun)\b[^|]*\b(writeFile|appendFile|write)\b/;
const READ_OPS = /(^|[\s;&|(])(cat|head|tail|less|more|bat|sed\s+-n|awk|grep|rg|nl|view|xxd|strings|cp|node|bun|python3?)\b|<\s*\S/;
const CONFIG_DOT = /^\./;

export function handle(ev, env = process.env) {
  const run = findRun(ev.cwd, env);
  if (!run) return ev.event === "prompt" ? intentHint(ev) : null;
  const state = loadState(run);
  if (!state || !state.active) return null;
  const lenses = loadLenses(env);
  switch (ev.event) {
    case "session_start":
    case "compact": return { context: statusBlock(run, state, lenses, true) };
    case "prompt":
      if (state.paused) { delete state.paused; saveState(run, state); }
      return { context: statusBlock(run, state, lenses, false) };
    case "pre_tool": return preTool(ev, run, state, lenses, env);
    case "post_tool": return postTool(ev, run, state, lenses);
    case "stop": return stopGate(ev, run, state, lenses);
    default: return null;
  }
}

function intentHint(ev) {
  if (!INTENT.test(ev.prompt ?? "")) return null;
  return { context: `[actualize] This looks like a product-actualization request. Use the \`actualize-product\` skill and open a run first so the process hooks can enforce it: ${cliCmd()} begin --goal "<what launchable means>" --bar demo|beta|release` };
}

export function statusBlock(run, state, lenses, full) {
  const phase = Object.keys(state.activeLenses).length ? `lens:${Object.keys(state.activeLenses).join(",")}` : state.phase;
  const g = computeGate(run, state, lenses);
  const lines = [
    `[actualize] run active · goal: ${state.goal} · bar: ${state.bar} · model@${state.modelVersion} · phase: ${phase}`,
    `Next: ${withCli(nextAction(run, state, lenses))}`,
  ];
  if (g.blockers.length) lines.push(`Open blockers (${g.blockers.length}): ${g.blockers.slice(0, 3).map((x) => x.text).join(" | ")}`);
  const waiting = inboxUnhandled(run);
  if (waiting.length) lines.push(`Owner responses waiting (${waiting.length}): ${waiting.slice(0, 3).map(describeInbox).join(" | ")} -> route each, then \`inbox ack <id> --as "..."\``);
  const ui = cockpitLine(run);
  if (ui) lines.push(ui);
  if (full) {
    lines.push(`Process CLI: ${cliCmd()} <status|lenses|select|lens start|lens done|reconcile start|reconcile done|done>`);
    lines.push("Enforced: product-model.md is edited only between `reconcile start` and `reconcile done`; a lens writes only artifacts/<lens>/, evidence/<lens>/ and appends open rows to proposals.md; lens bodies load only through `lens start`; the run cannot stop with open proposals, stale artifacts, an invalid model, or no current release gate.");
  }
  return lines.join("\n");
}

// The cockpit keeps a compact summary of what the owner is looking at; one line of it is progressive disclosure for UI context.
function cockpitLine(run) {
  try {
    const c = JSON.parse(readText(path.join(run.cockpitDir, "context.json"), "null"));
    if (!c || !c.connected) return null;
    try { process.kill(c.pid, 0); } catch { return null; }   // a crashed server must not leave a claim that someone is looking
    const asks = c.asking?.length ? ` · asking: ${c.asking.slice(0, 2).map((a) => a.prompt).join(" | ")}` : "";
    return `[cockpit] connected · focus: ${c.focus ?? "none"} · ${c.visible?.length ?? 0} surface(s)${asks} (full: ${cliCmd()} ui context)`;
  } catch { return null; }
}

// ---------- pre-tool gates ----------
// State-changing hardware commands (see product-model/PHYSICAL-PREFLIGHT.md). Deliberately conservative: flashing and erasing tools only.
const PHYSICAL_LENSES = ["electronics", "embedded-systems", "robotics"];
const FLASH = new RegExp([
  String.raw`\besptool(\.py)?\b.*\b(write[_-]flash|erase[_-]flash|erase[_-]region)\b`,
  String.raw`\bidf\.py\b.*\b(flash|app-flash|erase[_-]flash)\b`,
  String.raw`\bpicotool\b\s+(load|erase)\b`,
  String.raw`\bdfu-util\b.*\s-D\b`,
  String.raw`\bavrdude\b.*-U\s*\S+:w`,
  String.raw`\bwest\s+flash\b`,
  String.raw`\bnrfjprog\b.*--(program|erase|recover)`,
  String.raw`\bSTM32_Programmer_CLI\b.*\s-(w|e)\b`,
  String.raw`\bopenocd\b.*\b(program|write_image|flash\s+write)`,
  String.raw`\b(pio|platformio)\s+run\b.*(-t|--target)\s+upload`,
  String.raw`\barduino-cli\s+upload\b`,
  String.raw`\bmpremote\b.*\bcp\b`,
].join("|"), "i");
const IRREVERSIBLE = new RegExp([
  String.raw`\bespefuse(\.py)?\b`,
  String.raw`\besptool(\.py)?\b.*\bburn[_-](efuse|key|block)`,
  String.raw`\bnrfjprog\b.*--eraseall`,
  String.raw`\bpicotool\b.*\botp\b`,
  String.raw`\b(secure[_-]boot|flash[_-]encrypt\w*)\b.*\b(enable|burn|set)\b`,
].join("|"), "i");

function hardwareAction(command, run, state) {
  if (IRREVERSIBLE.test(command)) return "irreversible hardware change (fuses, secure boot, flash encryption, OTP, full-chip erase of a locked part): it needs the owner's explicit confirmation for this action. Record the preflight, then `" + cliCmd() + " pause --reason \"<the confirmation needed>\"` and ask; the owner runs it.";
  if (!FLASH.test(command)) return null;
  const running = Object.keys(state.activeLenses).filter((n) => PHYSICAL_LENSES.includes(n));
  if (!running.length) return "flashing or erasing a device is a state-changing physical action and happens inside a physical lens run (embedded-systems, electronics, robotics). Start one: " + cliCmd() + " lens start embedded-systems";
  const ok = running.some((n) => {
    const text = readText(path.join(run.evidenceDir, n, "actions.md"), "");
    return /^\s*target\b/im.test(text) && /^\s*expected result\b/im.test(text) && /^\s*recovery\b/im.test(text);
  });
  if (!ok) return `state-changing hardware action: first record the preflight (target, current state, expected result, known bounds, action, bounded completion, observation, recovery) in evidence/${running[0]}/actions.md. See product-model/PHYSICAL-PREFLIGHT.md.`;
  return null;
}

function preTool(ev, run, state, lenses, env) {
  const t = ev.tool;
  if (!t) return null;
  const cli = t.command && (t.command.includes(CLI_PATH) || /(^|[\s/])actualize(\s|$)/.test(t.command));
  if (cli) return null;
  const strict = state.strict !== false;
  const activeNames = Object.keys(state.activeLenses);
  const denials = [];

  if (strict && t.kind === "bash" && t.command) {
    const hw = hardwareAction(t.command, run, state);
    if (hw) { denials.push(hw); log(run, { type: "preflight_required", command: t.command.slice(0, 160), reason: hw.slice(0, 120) }); }
  }

  const writeTargets = [];
  const readTargets = [];
  if (["write", "edit", "patch"].includes(t.kind)) for (const p of t.paths) writeTargets.push(p);
  if (t.kind === "read") for (const p of t.paths) readTargets.push(p);
  if (t.kind === "bash" && t.command) {
    const refs = bashRefs(t.command, run, ev.cwd, env);
    if (WRITE_OPS.test(t.command)) writeTargets.push(...refs.run);
    if (READ_OPS.test(t.command)) readTargets.push(...refs.skills);
    if (WRITE_OPS.test(t.command)) for (const p of refs.projectWrites) writeTargets.push(p);
  }

  for (const p of writeTargets) {
    const z = zoneOf(run, p, ev.cwd);
    const rel = path.relative(run.project, z.abs);
    switch (z.zone) {
      case "state": case "history": denials.push(`${rel} is managed by the process CLI and cannot be edited directly.`); break;
      case "model":
        if (state.phase !== "reconcile") denials.push(`product-model.md is edited only inside a reconciliation (only the orchestrator edits the model). Put the change in proposals.md during a lens run, then \`${cliCmd()} reconcile start\`.`);
        break;
      case "proposals":
        if (!activeNames.length && state.phase !== "reconcile") denials.push(`proposals.md changes only during a lens run (append open rows) or a reconciliation (resolve them). Start a lens: ${cliCmd()} lens start <name>`);
        break;
      case "artifact": case "evidence":
        if (state.phase === "reconcile") denials.push(`${rel}: artifacts are not written during a reconciliation.`);
        else if (!z.lens || !state.activeLenses[z.lens]) denials.push(`${rel}: lens "${z.lens}" is not running${activeNames.length ? ` (running: ${activeNames.join(", ")})` : ""}. A lens writes only its own artifacts/<lens>/ and evidence/<lens>/: ${cliCmd()} lens start ${z.lens ?? "<name>"}`);
        break;
      case "run-other": denials.push(`${rel}: only product-model.md, proposals.md, artifacts/<lens>/, and evidence/<lens>/ exist under actualize/.`); break;
      case "project": {
        const first = path.relative(run.project, z.abs).split(path.sep)[0];
        if (strict && !activeNames.length && !CONFIG_DOT.test(first)) denials.push(`${rel}: product files change only inside a lens run (for example legacy-modernization), not between lenses or during a reconciliation. Start one: ${cliCmd()} lens start <name>`);
        break;
      }
      default: break;
    }
  }
  if (!denials.length && t.kind === "write" && t.content != null) {
    for (const p of t.paths) {
      const z = zoneOf(run, p, ev.cwd);
      if (z.zone !== "artifact" || !z.abs.endsWith(".md")) continue;
      const model = parseModelSafe(run);
      if (!model) { denials.push("no model exists yet; artifacts are written after the first reconciliation."); continue; }
      const isGate = z.lens === GATE_LENS && path.basename(z.abs) === "gate.md";
      const errs = validateArtifact(t.content, model, { lensReads: lenses[z.lens]?.reads ?? null, isGate, currentVersion: state.modelVersion });
      if (errs.length) denials.push(`${path.relative(run.project, z.abs)} fails artifact rules:\n  - ${errs.join("\n  - ")}`);
    }
  }
  if (strict) for (const p of readTargets) {
    const z = zoneOf(run, p, ev.cwd);
    const lens = lensOfPath(z.abs, env);
    if (lens && !state.activeLenses[lens]) denials.push(`${path.relative(process.cwd(), z.abs) || z.abs}: lens bodies load only through \`${cliCmd()} lens start ${lens}\` (progressive disclosure). \`${cliCmd()} lenses\` lists every lens's description, reads, and needs.`);
  }
  if (!denials.length) return null;
  log(run, { type: "deny", tool: t.name, reasons: denials.map((d) => d.slice(0, 160)) });
  return { deny: `[actualize] blocked:\n${denials.map((d) => `- ${d}`).join("\n")}` };
}

function parseModelSafe(run) {
  const t = readText(run.modelPath);
  return t === null ? null : parseModel(t);
}

// Paths mentioned in a shell command that fall inside the run, the skills dir, or the project.
function bashRefs(command, run, cwd, env) {
  const out = { run: [], skills: [], projectWrites: [] };
  const tokens = command.split(/[\s'"`;|&()<>=]+/).filter(Boolean);
  const sk = skillsDir(env);
  for (const tok of tokens) {
    if (!tok.includes("/") && !tok.includes(".")) continue;
    const abs = path.resolve(cwd, tok);
    const relRun = path.relative(run.dir, abs);
    if (!relRun.startsWith("..") && !path.isAbsolute(relRun)) out.run.push(abs);
    else if (lensOfPath(abs, env)) out.skills.push(abs);
    else if (abs.startsWith(sk)) continue;
  }
  const redirect = [...command.matchAll(/>>?\s*([^\s;&|]+)/g)].map((m) => path.resolve(cwd, m[1]));
  for (const abs of redirect) {
    const relRun = path.relative(run.dir, abs);
    const relProject = path.relative(run.project, abs);
    if (relRun.startsWith("..") && !relProject.startsWith("..") && !abs.startsWith("/dev/")) out.projectWrites.push(abs);
  }
  return out;
}

// ---------- post-tool feedback ----------
function postTool(ev, run, state, lenses) {
  const notes = [];
  if (state.phase !== "reconcile" && state.modelHash && modelHash(run) !== state.modelHash) {
    notes.push(`product-model.md changed outside a reconciliation. Revert it (${cliCmd()} model restore) and record the change as a proposal in proposals.md.`);
  }
  const t = ev.tool;
  if (t && ["write", "edit", "patch", "bash"].includes(t.kind)) {
    const model = parseModelSafe(run);
    const paths = t.kind === "bash" ? bashRefs(t.command ?? "", run, ev.cwd, process.env).run : t.paths;
    for (const p of paths) {
      const z = zoneOf(run, p, ev.cwd);
      const rel = path.relative(run.project, z.abs);
      if (z.zone === "artifact" && z.abs.endsWith(".md") && model) {
        const text = readText(z.abs);
        if (text === null) continue;
        const isGate = z.lens === GATE_LENS && path.basename(z.abs) === "gate.md";
        const errs = validateArtifact(text, model, { lensReads: lenses[z.lens]?.reads ?? null, isGate, currentVersion: state.modelVersion });
        if (errs.length) notes.push(`${rel} fails artifact rules:\n  - ${errs.join("\n  - ")}`);
      } else if (z.zone === "proposals") {
        const errs = validateProposalRows(parseProposals(readText(z.abs, "")));
        if (errs.length) notes.push(`proposals.md format:\n  - ${errs.slice(0, 5).join("\n  - ")}`);
      } else if (z.zone === "model" && state.phase === "reconcile") {
        const text = readText(z.abs);
        if (text) {
          const errs = validateModel(parseModel(text));
          if (errs.length) notes.push(`product-model.md does not yet pass SCHEMA checks (fix before \`reconcile done\`):\n  - ${errs.slice(0, 5).join("\n  - ")}`);
        }
      }
    }
  }
  if (!notes.length) return null;
  log(run, { type: "feedback", notes: notes.map((n) => n.slice(0, 160)) });
  return { feedback: `[actualize] ${notes.join("\n")}` };
}

// ---------- stop gate ----------
function stopGate(ev, run, state, lenses) {
  if (state.paused) return { notice: `[actualize] paused, waiting on the user: ${state.paused.reason}` };
  const g = computeGate(run, state, lenses);
  if (g.ready) {
    const r = finish(run, state, lenses);
    return { notice: `[actualize] run complete. Gate verdict: ${r.verdict} (owner: ${r.owner}).` };
  }
  const sig = g.blockers.map((b) => b.code).join(",");
  state.stopBlocks = sig === state.lastBlockSig ? (state.stopBlocks ?? 0) + 1 : 1;
  state.lastBlockSig = sig;
  if (state.stopBlocks > MAX_STOP_BLOCKS) {
    log(run, { type: "stop_escalated", blockers: sig });
    state.stopBlocks = 0;
    saveState(run, state);
    return { notice: `[actualize] stopping with the process incomplete after ${MAX_STOP_BLOCKS} blocked attempts. Unmet: ${g.blockers.map((b) => b.text).join(" | ")}` };
  }
  saveState(run, state);
  log(run, { type: "stop_block", blockers: sig });
  const lines = g.blockers.slice(0, 8).map((b) => `- ${b.text} -> ${withCli(b.fix)}`);
  return { block: `[actualize] The product-actualization process is not finished (${g.blockers.length} unmet). Do not stop yet:\n${lines.join("\n")}\nIf you are genuinely blocked on something only the user can answer, run: ${cliCmd()} pause --reason "<the question>"` };
}
