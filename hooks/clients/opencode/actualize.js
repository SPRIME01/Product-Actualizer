// OpenCode plugin: runs the actualize engine in-process.
// Installed (as a thin wrapper that re-exports this file) into .opencode/plugins/ or ~/.config/opencode/plugins/.
import { handle } from "../../src/engine.mjs";
import { classifyTool } from "../../src/normalize.mjs";

export const ActualizePlugin = async ({ directory, client }) => {
  const cwd = directory ?? process.cwd();
  const ev = (event, extra = {}) => ({ client: "opencode", event, cwd, ...extra });
  return {
    // Block a tool call by throwing: OpenCode surfaces the message to the model as the tool error.
    "tool.execute.before": async (input, output) => {
      const d = handle(ev("pre_tool", { tool: classifyTool(input.tool, output.args) }));
      if (d?.deny) throw new Error(d.deny);
    },
    // Feedback rides on the tool output so the model sees it on its next step.
    "tool.execute.after": async (input, output) => {
      const d = handle(ev("post_tool", { tool: classifyTool(input.tool, input.args) }));
      if (d?.feedback) output.output = `${output.output ?? ""}\n\n${d.feedback}`;
    },
    // Status block on every model request while a run is active.
    "experimental.chat.system.transform": async (_input, output) => {
      const d = handle(ev("prompt"));
      if (d?.context) output.system.push(d.context);
    },
    "experimental.session.compacting": async (_input, output) => {
      const d = handle(ev("compact"));
      if (d?.context) output.context.push(d.context);
    },
    // Stop gate: when the session goes idle with the process unfinished, continue it with the blockers.
    event: async ({ event }) => {
      if (event?.type !== "session.idle") return;
      const sessionID = event.properties?.sessionID;
      const d = handle(ev("stop"));
      if (d?.block && sessionID && client?.session?.prompt) {
        try { await client.session.prompt({ path: { id: sessionID }, body: { parts: [{ type: "text", text: d.block }] } }); } catch { /* idle continuation is best effort */ }
      }
    },
  };
};

export default ActualizePlugin;
