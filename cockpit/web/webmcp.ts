// WebMCP, current standard: tools are registered on `document.modelContext` with `registerTool(tool, { signal })`, and withdrawn by aborting
// that signal. (The earlier `navigator.modelContext.provideContext` is gone from the spec; `navigator.modelContext` survives only as a
// deprecated alias with the same registerTool, which is used when the document has none.)
//
// One semantic definition feeds the CLI, the loopback MCP endpoint, and this. Tools run on the server under the AGENT role: they pass the same
// schemas, authority checks, and reducer as every other path. There is no tool that answers, rules, or confirms for the owner, none that edits
// the model or the rail, and no raw-DOM tool. The set offered follows what the owner is looking at (the server decides; see activeTools).
import { api, getState, subscribe } from "./store";

type Def = { name: string; description: string; inputSchema: any; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean } };
const title = (n: string) => n.replace(/_/g, " ");

export async function registerWebMcp() {
  const mc = (document as any).modelContext ?? (navigator as any).modelContext;
  if (!mc || typeof mc.registerTool !== "function") return;   // optional: the page works without it
  try {
    const boot = await api("/api/boot");
    const agentToken: string | undefined = boot.agentToken;
    if (!agentToken) return;
    const defs = new Map<string, Def>((boot.tools as Def[]).map((t) => [t.name, t]));
    const call = async (name: string, input: unknown, signal?: AbortSignal) => {
      const r = await fetch("/api/agent/tool", { method: "POST", signal, headers: { "x-cockpit-token": agentToken, "content-type": "application/json" }, body: JSON.stringify({ name, input }) });
      const j = await r.json();
      if (j.ok === true) return "result" in j ? j.result : j;   // reads return their result; compositions return { ok, rev, effects }
      throw new Error(JSON.stringify(j));                      // a refusal is an error the agent can read: { ok:false, code, message, issues }
    };
    const live = new Map<string, AbortController>();
    const sync = (active: string[]) => {
      for (const [name, ac] of live) if (!active.includes(name)) { ac.abort(); live.delete(name); }
      for (const name of active) {
        const d = defs.get(name); if (!d || live.has(name)) continue;
        const ac = new AbortController(); live.set(name, ac);
        Promise.resolve(mc.registerTool({ name: d.name, title: title(d.name), description: d.description, inputSchema: d.inputSchema, annotations: d.annotations, execute: (input: unknown, o?: { signal?: AbortSignal }) => call(name, input, o?.signal) }, { signal: ac.signal }))
          .catch(() => { if (live.get(name) === ac) live.delete(name); });
      }
    };
    sync(getState().tools.length ? getState().tools : (boot.active as string[]));
    let key = getState().tools.join(",");
    subscribe(() => { const k = getState().tools.join(","); if (k !== key) { key = k; sync(getState().tools); } });
  } catch { /* the cockpit is fully usable without WebMCP */ }
}
