#!/usr/bin/env node
// actualize: process CLI and hook entry point.
//   actualize hook <client> <event>        (reads the client's JSON payload on stdin)
//   actualize begin|lenses|select|lens|reconcile|status|gate|done|pause|model|validate|install
import fs from "node:fs";
import path from "node:path";
import { findRun, loadState, saveState, log, DIR_NAME, readText } from "./lib/store.mjs";
import { parseModel, validateModel } from "./lib/md.mjs";
import { normalizeEvent, formatOutput } from "./normalize.mjs";
import { handle } from "./engine.mjs";
import * as P from "./process.mjs";

const USAGE = `actualize <command>
  begin --goal "<what launchable means>" --bar demo|beta|release [--dir actualize] [--lenient] [--force]
  lenses                                  list every lens (description, reads, needs) without loading bodies
  select --lenses a,b,c [--satisfied x,y] --exclude lens="why not needed" ...
  lens start <name>                       load a lens body and open its write scope
  lens done <name> [--no-output "<reason>"]
  reconcile start | reconcile done        the only window in which product-model.md may be edited
  status [--json] | gate [--json]         where the run is; what blocks stopping
  done                                    close the run (requires a passing gate)
  pause --reason "<question for the user>"
  model restore                           revert product-model.md to the last reconciled version
  validate [file]                         check a Product Model against SCHEMA.md
  hook <client> <event>                   native hook entry (claude|codex|cline) -- see docs/hooks.md
  install ...                             see hooks/install.mjs`;

function parseArgs(argv) {
  const pos = [], opt = {}, multi = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) opt[k] = true;
      else { i++; (multi[k] ??= []).push(next); opt[k] = next; }
    } else pos.push(a);
  }
  return { pos, opt, multi };
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const done = () => { clearTimeout(t); resolve(data.replace(/^﻿/, "")); };
    const t = setTimeout(done, Number(process.env.ACTUALIZE_STDIN_IDLE_MS || 1500));
    t.unref?.();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", done);
    process.stdin.on("error", done);
    process.stdin.resume();
  });
}

async function hookMain(client, eventName) {
  if (!client || !eventName) { process.stderr.write("usage: actualize hook <client> <event>\n"); return 0; }
  try {
    const raw = (await readStdin()).trim();
    let payload = {};
    if (raw) { try { payload = JSON.parse(raw); } catch { payload = {}; } }
    const ev = normalizeEvent(client, eventName, payload);
    const decision = handle(ev);
    const out = formatOutput(client, eventName, ev, decision);
    if (out.stdout) process.stdout.write(out.stdout);
    if (out.stderr) process.stderr.write(out.stderr);
    return out.code;
  } catch (e) {
    if (process.env.ACTUALIZE_DEBUG) process.stderr.write(`[actualize] hook error: ${e.stack}\n`);
    return client.toLowerCase() === "cline" ? (process.stdout.write("{}\n"), 0) : 0; // fail open: a hook bug must not brick the agent
  }
}

function need(run) {
  if (!run) throw new P.ProcessError(`no run found. Start one: ${P.cliCmd()} begin --goal "..." --bar beta`);
  const state = loadState(run);
  if (!state) throw new P.ProcessError("state.json is unreadable");
  return state;
}

function printGate(g) {
  if (g.ready) { console.log("gate: PASS (nothing blocks stopping)"); return; }
  console.log(`gate: ${g.blockers.length} blocker(s)`);
  for (const b of g.blockers) console.log(`  - ${b.text}\n      fix: ${P.withCli(b.fix)}`);
}

async function main(argv) {
  const { pos, opt, multi } = parseArgs(argv);
  const [cmd, sub] = pos;
  if (!cmd || cmd === "help" || opt.help) { console.log(USAGE); return 0; }
  if (cmd === "hook") return hookMain(pos[1], pos[2]);
  if (cmd === "install") {
    const m = await import("../install.mjs");
    return m.main(argv.slice(1));
  }
  const lenses = P.loadLenses();
  if (cmd === "begin") {
    const run = P.begin(opt.dir === true ? undefined : opt.dir, { goal: opt.goal === true ? "" : opt.goal, bar: opt.bar, strict: !opt.lenient, force: Boolean(opt.force) });
    console.log(`run opened at ${run.dir}\nnext: classify the evidence, then \`lenses\` and \`select\`.`);
    return 0;
  }
  if (cmd === "validate") {
    const file = sub ?? findRun(process.cwd())?.modelPath;
    const t = file && readText(file);
    if (!t) throw new P.ProcessError("no model file to validate");
    const errs = validateModel(parseModel(t));
    if (errs.length) { console.log(`INVALID\n  - ${errs.join("\n  - ")}`); return 1; }
    console.log("valid");
    return 0;
  }
  const run = findRun(opt.dir && opt.dir !== true ? path.resolve(opt.dir, "..") : process.cwd());
  switch (cmd) {
    case "lenses": {
      for (const l of Object.values(lenses)) console.log(`${l.name}\n  ${l.description}\n  reads: ${l.reads.join(", ")}  needs: ${l.needs.join(", ") || "-"}  executes_with: ${l.executesWith.join(", ") || "-"}`);
      return 0;
    }
    case "select": {
      const state = need(run);
      const chosen = String(opt.lenses === true ? "" : opt.lenses ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      const satisfied = String(opt.satisfied === true ? "" : opt.satisfied ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      const exclude = {};
      for (const e of multi.exclude ?? []) { const i = e.indexOf("="); if (i > 0) exclude[e.slice(0, i).trim()] = e.slice(i + 1).trim(); }
      const w = P.select(run, state, lenses, { chosen, satisfied, exclude });
      console.log("selection recorded. Waves (lenses within a wave are independent; run them in parallel; reconcile after each wave):");
      w.forEach((g, i) => console.log(`  ${i + 1}. ${g.join(", ")}`));
      console.log("Log the selection and every exclusion reason in a decision during the first reconciliation.");
      return 0;
    }
    case "lens": {
      const state = need(run);
      const name = pos[2];
      if (sub === "start") {
        const r = P.lensStart(run, state, lenses, name);
        console.log(`lens ${name} started. Write only artifacts/${name}/, evidence/${name}/, and append open rows to proposals.md.\nArtifact stamp: built_from: model@${state.modelVersion}; reads: [subset of ${r.reads.join(", ")}]; cites: [claim ids]\n\n----- ${name}/SKILL.md -----\n${r.body}`);
        return 0;
      }
      if (sub === "done") {
        const r = P.lensDone(run, state, lenses, name, { noOutput: opt["no-output"] === true ? null : opt["no-output"] ?? null });
        console.log(`lens ${name} done: ${r.proposals} proposal(s), ${r.files.length} file(s).\nnext: ${P.withCli(P.nextAction(run, loadState(run), lenses))}`);
        return 0;
      }
      throw new P.ProcessError("usage: lens start|done <name>");
    }
    case "reconcile": {
      const state = need(run);
      if (sub === "start") {
        const r = P.reconcileStart(run, state, lenses);
        console.log(`reconciliation open (base model@${r.baseVersion}${r.created ? ", model created from TEMPLATE.md" : ""}; ${r.openProposals} open proposal(s)).\nEdit product-model.md and proposals.md only. Accept = decision row + status accepted:D<n>; reject = reason. One version bump for the whole reconciliation. Then: reconcile done`);
        return 0;
      }
      if (sub === "done") {
        const r = P.reconcileDone(run, state, lenses);
        console.log(`reconciled: model@${r.version}${r.changed ? "" : " (unchanged)"}.`);
        if (r.stale.length) console.log(`stale artifacts: ${r.stale.map((s) => `${s.file} (by ${s.by.join(",")})`).join("; ")}\nre-run: ${[...new Set(r.stale.map((s) => s.lens))].map((l) => `lens start ${l}`).join("; ")}`);
        console.log(`next: ${P.withCli(P.nextAction(run, loadState(run), lenses))}`);
        return 0;
      }
      throw new P.ProcessError("usage: reconcile start|done");
    }
    case "status": {
      const state = need(run);
      const s = P.summary(run, state, lenses);
      if (opt.json) console.log(JSON.stringify(s, null, 2));
      else {
        console.log(`run: ${run.dir}\n${s.active ? "ACTIVE" : "COMPLETE"} · goal: ${s.goal} · bar: ${s.bar} · model@${s.modelVersion} · phase: ${s.activeLenses.length ? `lens:${s.activeLenses.join(",")}` : s.phase}`);
        if (s.selection) console.log(`selection: ${s.selection.waves.map((w) => w.join("+")).join(" -> ")}  (excluded: ${s.selection.excluded.join(", ") || "none"})`);
        console.log(`completed: ${Object.entries(s.completed).map(([k, v]) => `${k}x${v}`).join(", ") || "none"}; unreconciled: ${s.unreconciled.join(", ") || "none"}`);
        console.log(`next: ${P.withCli(s.next)}`);
        if (s.blockers.length) printGate({ ready: false, blockers: s.blockers });
        if (s.verdict) console.log(`verdict: ${s.verdict}`);
      }
      return 0;
    }
    case "gate": {
      const state = need(run);
      const g = P.computeGate(run, state, lenses);
      if (opt.json) console.log(JSON.stringify({ ready: g.ready, blockers: g.blockers }, null, 2)); else printGate(g);
      return g.ready ? 0 : 1;
    }
    case "done": {
      const state = need(run);
      const r = P.finish(run, state, lenses);
      if (!r.ok) { printGate(r.gate); return 1; }
      console.log(`run complete. Verdict: ${r.verdict} (owner: ${r.owner}).`);
      return 0;
    }
    case "pause": {
      const state = need(run);
      if (!opt.reason || opt.reason === true) throw new P.ProcessError('pause needs --reason "<the question only the user can answer>"');
      state.paused = { reason: opt.reason, at: new Date().toISOString() };
      saveState(run, state);
      log(run, { type: "pause", reason: opt.reason });
      console.log("paused: the next stop is allowed; the pause clears on the user's next message.");
      return 0;
    }
    case "model": {
      const state = need(run);
      if (sub !== "restore") throw new P.ProcessError("usage: model restore");
      console.log(`product-model.md restored to model@${P.restoreModel(run, state)}`);
      return 0;
    }
    default:
      console.log(USAGE);
      return 2;
  }
}

main(process.argv.slice(2)).then((c) => process.exit(c ?? 0)).catch((e) => {
  if (e instanceof P.ProcessError) { console.error(`actualize: ${e.message}`); process.exit(1); }
  console.error(e.stack); process.exit(70);
});
