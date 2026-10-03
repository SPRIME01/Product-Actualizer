// `actualize cockpit ...`, `actualize ui ...`, `actualize inbox ...`. Imported lazily by hooks/src/cli.mjs.
// `ui` works with or without a running server: with one it goes over HTTP (so the open browser updates at once);
// without one it applies the same typed actions to the same SQLite file, and the browser restores them on connect.
import fs from "node:fs";
import path from "node:path";
import { findRun, loadState } from "../hooks/src/lib/store.mjs";
import { readInbox, appendInbox, ackInbox, describe, unhandled } from "../hooks/src/lib/inbox.mjs";
import { parseSurfaceText, SurfaceSchema } from "./protocol/spec";
import { issuesOf } from "./protocol/actions";
import { TOOLS, BASE_TOOLS } from "./protocol/tools";
import { IS_COMPILED, CLI_PATH } from "../hooks/src/lib/store.mjs";


const dirOf = (cwd: string) => path.join((findRun(cwd)?.dir ?? path.join(cwd, "actualize")), ".cockpit");
const readJson = (f: string) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

function server(cwd: string): { url: string; pid: number; token: string } | null {
  const d = dirOf(cwd); const s = readJson(path.join(d, "server.json"));
  if (!s || !alive(s.pid)) return null;
  let token = ""; try { token = fs.readFileSync(path.join(d, "agent.token"), "utf8"); } catch { return null; }
  return { ...s, token };
}

export async function cockpitMain(args: string[], opt: Record<string, any>, cwd: string): Promise<number> {
  const sub = args[0] ?? "status";
  const d = dirOf(cwd);
  if (sub === "up") {
    const cur = server(cwd);
    if (cur) { await fetch(`${cur.url}/api/open`, { method: "POST", headers: { "x-cockpit-token": cur.token } }); console.log(`cockpit already up: ${cur.url} (opened in your browser)`); return 0; }
    if (!findRun(cwd)) console.log("note: no actualize run here yet; the cockpit starts empty and fills when `actualize begin` runs.");
    fs.mkdirSync(d, { recursive: true });
    const log = fs.openSync(path.join(d, "server.log"), "a");
    // the same entry for a script checkout and for the compiled executable: `actualize cockpit serve`
    const argv = [process.execPath, ...(IS_COMPILED ? [] : [CLI_PATH]), "cockpit", "serve", "--cwd", cwd, ...(opt.port && opt.port !== true ? ["--port", String(opt.port)] : []), ...(opt["no-open"] ? ["--no-open"] : [])];
    const child = Bun.spawn(argv, { cwd, stdin: "ignore", stdout: "pipe", stderr: log, detached: true });
    const reader = child.stdout.getReader();
    const first = await Promise.race([reader.read().then((r) => new TextDecoder().decode(r.value ?? new Uint8Array())), Bun.sleep(8000).then(() => "")]);
    reader.releaseLock(); child.unref();
    const m = /^URL (\S+)/.exec(first);
    if (!m) { console.error(`cockpit did not start; see ${path.join(d, "server.log")}`); return 1; }
    const s = server(cwd);
    console.log(`cockpit up: ${s?.url ?? m[1].split("/#")[0]}${opt["no-open"] ? "" : " (opened in your browser)"}`);
    // The human link carries a bearer token. Show it only to a person at a terminal, never to a piped (agent) reader.
    if (process.stdout.isTTY || opt["print-url"]) console.log(`link: ${m[1]}`); else console.log("the link is not printed when output is piped; run `actualize cockpit open` or start it yourself with `! actualize cockpit up`");
    return 0;
  }
  if (sub === "serve") { const { runDaemon } = await import("./server/main"); runDaemon(opt, cwd); return await new Promise<number>(() => {}); }
  if (sub === "open") {
    const s = server(cwd); if (!s) { console.error("cockpit is not running: actualize cockpit up"); return 1; }
    await fetch(`${s.url}/api/open`, { method: "POST", headers: { "x-cockpit-token": s.token } }); console.log("opened in your browser"); return 0;
  }
  if (sub === "down") {
    const s = readJson(path.join(d, "server.json"));
    if (!s || !alive(s.pid)) { try { fs.unlinkSync(path.join(d, "server.json")); } catch { /* none */ } console.log("cockpit is not running"); return 0; }
    process.kill(s.pid, "SIGTERM");
    for (let i = 0; i < 30 && alive(s.pid); i++) await Bun.sleep(100);
    if (alive(s.pid)) { process.kill(s.pid, "SIGKILL"); }
    console.log("cockpit down (the run, the model, and the inbox are untouched; the workspace is kept for next time)"); return 0;
  }
  if (sub === "status") {
    const s = server(cwd);
    console.log(s ? `cockpit up: ${s.url} (pid ${s.pid})` : "cockpit is down"); return 0;
  }
  if (sub === "rebuild") {
    const { Cockpit } = await import("./server/core"); const c = new Cockpit(cwd);
    const r = c.rebuild(); console.log(`projection rebuilt from the run directory: ${r.events.length} event(s) replayed`); c.close(); return 0;
  }
  if (sub === "reset") { for (const f of ["cockpit.db", "cockpit.db-wal", "cockpit.db-shm"]) { try { fs.unlinkSync(path.join(d, f)); } catch { /* none */ } } console.log("cockpit state deleted; the next start rebuilds the projection from the run"); return 0; }
  console.error("usage: actualize cockpit up|down|open|status|rebuild|reset|serve [--port n] [--no-open] [--print-url]"); return 2;
}

// ---- ui: the agent's handle on the cockpit --------------------------------------------------------------------
async function call(cwd: string, name: string, input: any) {
  const s = server(cwd);
  if (s) { const r = await fetch(`${s.url}/api/agent/tool`, { method: "POST", headers: { "x-cockpit-token": s.token, "content-type": "application/json" }, body: JSON.stringify({ name, input }) }); return r.json(); }
  const { Cockpit } = await import("./server/core"); const c = new Cockpit(cwd);
  try { return c.tool(name, input); } finally { c.close(); }
}
const out = (r: any) => { console.log(JSON.stringify(r.ok === true && "result" in r ? r.result : r, null, 2)); return r.ok === false ? 1 : 0; };

export async function uiMain(args: string[], opt: Record<string, any>, cwd: string): Promise<number> {
  const sub = args[0];
  const need = (v: any, what: string) => { if (!v || v === true) throw new Error(`usage: actualize ui ${sub} ${what}`); return v as string; };
  switch (sub) {
    case "status": return out(await call(cwd, "get_status", {}));
    case "context": return out(await call(cwd, "get_workspace", {}));
    case "catalog": return out(await call(cwd, "get_vocabulary", { block: args[1] }));
    case "list": return out(await call(cwd, "list_items", { what: need(args[1], "<claims|unknowns|decisions|proposals|artifacts|blockers|responses|lenses> [--filter k=v]"), ...(opt.filter && opt.filter !== true ? { filter: opt.filter } : {}) }));
    case "entity": return out(await call(cwd, "get_entity", { ref: need(args[1], "<ref>") }));
    case "put": {
      const file = need(args[1], "<surface.yaml|json> [--right-of id|--below id|--tab-of id]");
      const raw = parseSurfaceText(fs.readFileSync(file, "utf8"));
      const check = SurfaceSchema.safeParse(raw);
      if (!check.success) return out({ ok: false, code: "SCHEMA", message: "surface does not match the vocabulary", issues: issuesOf(check.error) });
      const rel = opt["right-of"] ? ["right", opt["right-of"]] : opt["left-of"] ? ["left", opt["left-of"]] : opt["below"] ? ["below", opt["below"]] : opt["above"] ? ["above", opt["above"]] : opt["tab-of"] ? ["within", opt["tab-of"]] : null;
      return out(await call(cwd, "show_surface", { surface: check.data, ...(rel ? { place: { rel: rel[0], to: rel[1] } } : {}) }));
    }
    case "show": return out(await call(cwd, "show_ref", { ref: need(args[1], "<ref> [--as document|lineage] [--beside id]"), ...(opt.as ? { as: opt.as } : {}), ...(opt.beside ? { beside: opt.beside } : {}) }));
    case "compare": return out(await call(cwd, "compare_refs", { a: need(args[1], "<refA> <refB>"), b: need(args[2], "<refA> <refB>"), ...(opt.beside ? { beside: opt.beside } : {}) }));
    case "ask": {
      const raw = JSON.parse(need(args[1], "'<json ask>'")); return out(await call(cwd, "ask_human", raw));
    }
    case "arrange": return out(await call(cwd, "arrange", { action: JSON.parse(need(args[1], "'<json action>'")) }));
    case "annotate": return out(await call(cwd, "annotate", { target: need(args[1], "<ref|surface:id> <text>"), text: need(args[2], "<ref|surface:id> <text>") }));
    case "responses": return out(await call(cwd, "read_responses", { unhandled: !opt.all }));
    case "tool": return out(await call(cwd, need(args[1], "<name> '<json>'"), args[2] ? JSON.parse(args[2]) : {}));
    case "tools": { const r: any = await call(cwd, "get_workspace", {}); const names = opt.all ? TOOLS.map((t) => t.name) : r.result?.tools ?? r.tools ?? BASE_TOOLS; console.log(names.join("\n")); return 0; }
    case "world": return worldMain(args.slice(1), opt, cwd);
    case "case": return caseMain(args.slice(1), opt, cwd);
    default:
      console.error(`usage: actualize ui <case [summary|moves|settlement|prior] [ref] [--show]|status|context|catalog [block]|list <what>|entity <ref>|put <file>|show <ref>|compare <a> <b>|ask '<json>'|arrange '<json>'|annotate <target> <text>|responses|tool <name> '<json>'>\n tools: ${TOOLS.map((t) => t.name).join(", ")}`);
      return 2;
  }
}

// ---- case: where we are trying to go, what stands between, what can be done now. Derived; works with the cockpit closed.
async function caseMain(args: string[], opt: Record<string, any>, cwd: string): Promise<number> {
  const part = args[0] && ["summary", "moves", "settlement", "prior"].includes(args[0]) ? args.shift() : undefined;
  const ref = args[0] && args[0] !== "--" ? args[0] : "run";
  if (part === "prior" && (!opt.q || opt.q === true)) { console.error("usage: actualize case prior --q \"words about what you are about to investigate\""); return 2; }
  return out(await call(cwd, "case_get", { ref, ...(part ? { part } : {}), ...(opt.q && opt.q !== true ? { q: opt.q } : {}), ...(opt.decision === true ? { view: "decision" } : {}), show: opt.show === true }));
}

// ---- world: ask the product world a question. Read-only; works with the cockpit closed (the answer is a function of the run files).
async function worldMain(args: string[], opt: Record<string, any>, cwd: string): Promise<number> {
  const op = args[0]; const show = opt.show === true;
  const need = (v: any, what: string) => { if (!v || v === true) throw new Error(`usage: actualize world ${op} ${what}`); return v as string; };
  const preds = (s: any) => String(s ?? "").split(",").filter(Boolean).map((t) => { const [field, o, ...v] = t.split("~"); return { field, op: o || "eq", value: v.join("~") }; });
  switch (op) {
    case "why": return out(await call(cwd, "world_why", { ref: need(args[1], "<ref> [--show]"), show }));
    case "impact": return out(await call(cwd, "world_impact", { ref: need(args[1], "<ref> [--dir up|down|both] [--depth n] [--kinds claim,artifact] [--gate] [--show]"), ...(opt.dir ? { dir: opt.dir } : {}), ...(opt.depth ? { depth: Number(opt.depth) } : {}), ...(opt.kinds ? { kinds: String(opt.kinds).split(",") } : {}), gate: opt.gate === true, show }));
    case "diff": return out(await call(cwd, "world_diff", { a: need(args[1], "<a> [b|current] [--show]"), ...(args[2] ? { b: args[2] } : {}), show }));
    case "timeline": return out(await call(cwd, "world_timeline", { ...(args[1] ? { ref: args[1] } : {}), ...(opt.git === true ? { git: true } : {}), show }));
    case "counterfactual": return out(await call(cwd, "world_counterfactual", { candidate: need(args[1], "<proposal-ref> [--show]"), show }));
    case "reach": return out(await call(cwd, "world_reach", opt.need ? { need: opt.need } : { ref: need(args[1], "<ref> | --need <capability>") }));
    case "replay": return out(await call(cwd, "world_replay", { selects: need(opt.selects, "--selects file:evidence/<lens>/<file>#tableN --expect field~op~value[,...] [--where ...]"), expect: preds(need(opt.expect, "--expect field~op~value")), ...(opt.where ? { where: preds(opt.where) } : {}), show }));
    default:
      console.error("usage: actualize world <why <ref> | impact <ref> | diff <a> [b] | timeline [ref] [--git] | counterfactual <proposal> | reach <ref>|--need <cap> | replay --selects ... --expect ...> [--show]");
      return 2;
  }
}

// ---- inbox: the router's side of the owner's responses ---------------------------------------------------------
export function inboxMain(args: string[], opt: Record<string, any>, cwd: string): number {
  const run = findRun(cwd); if (!run) { console.error("no run found"); return 1; }
  const sub = args[0];
  try {
    if (!sub || sub === "list") {
      const rows = (opt.all ? readInbox(run) : unhandled(run));
      if (opt.json) { console.log(JSON.stringify(rows, null, 2)); return 0; }
      if (!rows.length) { console.log(opt.all ? "inbox is empty" : "nothing waiting on the router"); return 0; }
      for (const r of rows) console.log(`${describe(r)}${r.handled ? `  => ${r.handled.as}` : ""}`);
      if (!opt.all) console.log('\nRoute each one (a proposal, a decision at the next reconciliation, an unknown opened or closed, or no action with a reason), then: inbox ack <id> --as "<where it went>"');
      return 0;
    }
    if (sub === "ack") { ackInbox(run, args[1], opt.as === true ? "" : opt.as); console.log(`${args[1]} handled`); return 0; }
    if (sub === "add") {
      // For an owner who answered in chat instead of the cockpit. Recorded as relayed: it carries REPORTED weight, never the owner's own VERIFIED.
      const kind = args[1]; if (!kind) throw new Error('usage: inbox add <answer|ruling|confirmation|annotation> --ref <ref> --note "<what they said>" [--outcome x] [--value v]');
      const e = appendInbox(run, { kind, via: "relay", actor: "agent-relayed", ref: opt.ref === true ? undefined : opt.ref, outcome: opt.outcome === true ? undefined : opt.outcome, value: opt.value === true ? undefined : opt.value, note: opt.note === true ? undefined : opt.note });
      console.log(`${e.id} recorded as relayed (REPORTED)`); return 0;
    }
  } catch (e: any) { console.error(`actualize: ${e.message}`); return 1; }
  console.error("usage: actualize inbox [list|ack <id> --as '...'|add <kind> ...] [--all] [--json]"); return 2;
}
export { loadState };
