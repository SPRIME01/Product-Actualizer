// WebMCP: expose the semantic tool surface to an agent that drives the page. Tools execute through the agent role on the server,
// so they pass through the same schemas, authority checks, and reducer as the CLI. There is no tool that answers, rules, or confirms for the owner,
// no tool that edits the model or the rail, and no raw DOM operation.
import { api } from "./store";

type McpTool = { name: string; description: string; inputSchema: any };
export async function registerWebMcp() {
  const mc = (navigator as any).modelContext;
  if (!mc) return;   // WebMCP is optional: the page works without it
  try {
    const boot = await api("/api/boot");
    const agentToken: string | undefined = boot.agentToken;
    if (!agentToken) return;
    const call = async (name: string, input: any) => {
      const r = await fetch("/api/agent/tool", { method: "POST", headers: { "x-cockpit-token": agentToken, "content-type": "application/json" }, body: JSON.stringify({ name, input }) });
      const j = await r.json();
      return { content: [{ type: "text", text: JSON.stringify(j.ok === true && "result" in j ? j.result : j) }], isError: j.ok === false };
    };
    const tools: McpTool[] = boot.tools;
    const defs = tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, execute: (input: any) => call(t.name, input) }));
    if (typeof mc.provideContext === "function") mc.provideContext({ tools: defs });
    else if (typeof mc.registerTool === "function") for (const d of defs) mc.registerTool(d);
  } catch { /* the cockpit is fully usable without WebMCP */ }
}
