// Shared helpers for the hook tests: a sandbox project, and a driver that speaks in normalized events.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handle } from "../../hooks/src/engine.mjs";
import { normalizeEvent, formatOutput } from "../../hooks/src/normalize.mjs";
import { parseProposals } from "../../hooks/src/lib/md.mjs";
import * as P from "../../hooks/src/process.mjs";
import { findRun, loadState } from "../../hooks/src/lib/store.mjs";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "../..");
export const WALK = path.join(REPO, "tests", "walkthrough");

export function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actualize-test-"));
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src", "app.js"), "// product code\n");
  return dir;
}

export function ctx(project) {
  const get = () => { const run = findRun(project); return { run, state: loadState(run), lenses: P.loadLenses() }; };
  return {
    project,
    get,
    rel: (p) => path.join(project, p),
    // run a process command against the sandbox
    cmd: {
      begin: (o) => P.begin(path.join(project, "actualize"), o),
      select: (o) => { const { run, state, lenses } = get(); return P.select(run, state, lenses, o); },
      lensStart: (n) => { const { run, state, lenses } = get(); return P.lensStart(run, state, lenses, n); },
      lensDone: (n, o) => { const { run, state, lenses } = get(); return P.lensDone(run, state, lenses, n, o); },
      reconStart: () => { const { run, state, lenses } = get(); return P.reconcileStart(run, state, lenses); },
      reconDone: () => { const { run, state, lenses } = get(); return P.reconcileDone(run, state, lenses); },
      gate: () => { const { run, state, lenses } = get(); return P.computeGate(run, state, lenses); },
    },
    // normalized hook events
    ev: (event, extra = {}) => handle({ client: "test", event, cwd: project, ...extra }),
    write: (file, content) => handle({ client: "test", event: "pre_tool", cwd: project, tool: { name: "Write", kind: "write", paths: [file], content, input: {} } }),
    edit: (file) => handle({ client: "test", event: "pre_tool", cwd: project, tool: { name: "Edit", kind: "edit", paths: [file], input: {} } }),
    bash: (command) => handle({ client: "test", event: "pre_tool", cwd: project, tool: { name: "Bash", kind: "bash", paths: [], command, input: {} } }),
    read: (file) => handle({ client: "test", event: "pre_tool", cwd: project, tool: { name: "Read", kind: "read", paths: [file], input: {} } }),
    post: (file, kind = "write") => handle({ client: "test", event: "post_tool", cwd: project, tool: { name: "Write", kind, paths: [file], input: {} } }),
    stop: () => handle({ client: "test", event: "stop", cwd: project }),
    // file helpers
    put: (rel, text) => { const p = path.join(project, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); },
    get text() { return (rel) => fs.readFileSync(path.join(project, rel), "utf8"); },
  };
}

// A walkthrough's files and its proposal rows, so every replay test can drive the same state machine from its own fixture.
export function walkthrough(dirName) {
  const dir = path.join(REPO, "tests", dirName);
  const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
  const rows = parseProposals(read("proposals.md"));
  return {
    dir,
    rows,
    walk: read,
    // Proposal rows from the walkthrough, written as open rows for the given ids, then resolved later.
    addProposals(c, ids) {
      const file = path.join(c.project, "actualize", "proposals.md");
      let t = fs.readFileSync(file, "utf8");
      for (const id of ids) {
        const r = rows.find((x) => x.id === id);
        t += `| ${r.id} | ${r.lens} | ${r.field} | ${r.kind} | ${r.proposal} | ${r.evidence} | open |  |\n`;
      }
      fs.writeFileSync(file, t);
    },
    resolveProposals(c, overrides = {}) {
      const file = path.join(c.project, "actualize", "proposals.md");
      const open = parseProposals(fs.readFileSync(file, "utf8"));
      let t = "# proposals.md\n\n| id | lens | field | kind | proposal | evidence | status | reason |\n|---|---|---|---|---|---|---|---|\n";
      for (const r of open) {
        const final = rows.find((x) => x.id === r.id);
        const o = overrides[r.id];
        const status = o?.status ?? (r.status === "open" ? final.status : r.status);
        const reason = o?.reason ?? (r.status === "open" ? final.reason : r.reason);
        t += `| ${r.id} | ${r.lens} | ${r.field} | ${r.kind} | ${r.proposal} | ${r.evidence} | ${status} | ${reason} |\n`;
      }
      fs.writeFileSync(file, t);
    },
  };
}

const loam = walkthrough("walkthrough");
export const walk = loam.walk;
export const addProposals = loam.addProposals;
export const resolveProposals = loam.resolveProposals;

export const EXCLUDE = {
  direction: "text-only page, no visual artifact in this goal",
  experience: "no in-product flows are in scope for a text page",
  "product-visualization": "no geometry exists, only a render of unknown origin",
  "motion-editorial": "no film or motion deliverable in this goal",
  "audio-sound": "nothing audible in this goal's deliverable",
  illustration: "no illustration or diagram deliverable in this goal",
  "fidelity-qa": "no built visual output to measure yet",
  "legacy-modernization": "the code is not changed for a text-only page",
  electronics: "a text-only page; no schematic, BOM, or board was supplied, so no hardware evidence to judge",
  "embedded-systems": "a text-only page; no firmware target or board identity is in scope for this goal",
  robotics: "no closed-loop machine exists in the evidence or the goal",
};
export const CHOSEN = ["recon-software", "recon-physical", "brand", "provenance-licensing", "marketing", "release-readiness"];

export { P, formatOutput, normalizeEvent };
