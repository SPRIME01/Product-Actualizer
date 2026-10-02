// Prime Agent / Pi extension: runs the actualize engine in-process.
// Installed (as a thin wrapper that re-exports this file) into .prime/agent/extensions/ or ~/.prime/agent/extensions/.
// `pi` and `prime-agent` are the same program and read the same extension directories.
// @ts-nocheck
import { handle } from "../../src/engine.mjs";
import { classifyTool } from "../../src/normalize.mjs";

export default function (pi) {
  const ev = (ctx, event, extra = {}) => ({ client: "prime", event, cwd: ctx?.cwd ?? process.cwd(), ...extra });

  // Status block on every prompt while a run is active.
  pi.on("before_agent_start", async (event, ctx) => {
    const d = handle(ev(ctx, "prompt", { prompt: event.prompt }));
    if (d?.context) return { systemPrompt: `${event.systemPrompt}\n\n${d.context}` };
  });

  pi.on("session_start", async (event, ctx) => {
    if (event.reason === "startup" || event.reason === "resume") {
      const d = handle(ev(ctx, "session_start"));
      if (d?.context && ctx.hasUI) ctx.ui.notify(d.context.split("\n")[0], "info");
    }
  });

  // Block a tool call before it runs.
  pi.on("tool_call", async (event, ctx) => {
    const d = handle(ev(ctx, "pre_tool", { tool: classifyTool(event.toolName, event.input) }));
    if (d?.deny) return { block: true, reason: d.deny };
  });

  // Feedback is appended to the tool result so the model reads it next.
  pi.on("tool_result", async (event, ctx) => {
    const d = handle(ev(ctx, "post_tool", { tool: classifyTool(event.toolName, event.input) }));
    if (d?.feedback) return { content: [...(event.content ?? []), { type: "text", text: d.feedback }] };
  });

  // Stop gate: when the agent finishes with the process unfinished, send the blockers as a follow-up.
  pi.on("agent_end", async (_event, ctx) => {
    const d = handle(ev(ctx, "stop"));
    if (d?.block) pi.sendUserMessage(d.block, { deliverAs: "followUp" });
    else if (d?.notice && ctx.hasUI) ctx.ui.notify(d.notice, "info");
  });
}
