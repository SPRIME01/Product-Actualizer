// The Workbench in a real browser: the owner's journey from an opened cockpit to a reviewed piece of work. It exercises the deterministic Workbench,
// the Work Terminal (a question answered with no model, a request that stays queued), the workflow, capability and contract views, the request
// lifecycle with the agent on the other side of the wire, the evidence ledger, and a dropped connection. Skipped, loudly, when no Chrome is installed.
import { describe, test, expect, beforeAll, afterAll, setDefaultTimeout } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, type Browser, type Page } from "playwright-core";
import index from "../../cockpit/web/index.html";
import { serveCockpit } from "../../cockpit/server/serve";
import { fixtureRun, cleanup, patchState } from "./helpers";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";

setDefaultTimeout(30_000);
const CHROME = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", process.env.CHROME_BIN ?? ""].find((p) => p && fs.existsSync(p));
const d = CHROME ? describe : describe.skip;
if (!CHROME) console.warn("workbench.e2e: no Chrome found; browser tests skipped");

let fx: ReturnType<typeof fixtureRun>, srv: ReturnType<typeof serveCockpit>, browser: Browser, page: Page; const errors: string[] = [];
const survey = (dir: string) => { const out: Record<string, string> = {}; const walk = (p: string) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { if (e.name === ".cockpit") continue; const f = path.join(p, e.name); if (e.isDirectory()) walk(f); else out[path.relative(dir, f)] = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"); } }; walk(dir); return out; };
const tool = (name: string, input: any) => fetch(srv.url + "/api/agent/tool", { method: "POST", headers: { "x-cockpit-token": srv.agentToken, "content-type": "application/json" }, body: JSON.stringify({ name, input }) }).then((r) => r.json());
const say = async (text: string) => { await page.locator(".term-input").fill(text); await page.locator(".term-input").press("Enter"); };
const panel = (id: string) => page.locator(`[data-surface="${id}"]`);

beforeAll(async () => {
  if (!CHROME) return;
  fx = fixtureRun("mote", { stale: true }); srv = serveCockpit({ cwd: fx.project, index });
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(srv.humanUrl); await page.locator("[data-terminal]").waitFor(); await page.locator(".rail-id b").waitFor();
});
afterAll(async () => { await browser?.close(); try { srv?.stop(); } catch { /* stopped */ } if (fx) cleanup(fx.project); });

d("the owner's journey through the Workbench", () => {
  test("the Workbench opens from the first offer, shows the mode the run is in, and writes nothing to the run", async () => {
    const before = survey(fx.run.dir);
    await page.locator(".hint").first().waitFor(); expect((await page.locator(".hint b").allTextContents())[0]).toBe("Open the Workbench");
    await page.locator(".hint").first().click(); await panel("workbench").waitFor();
    expect(await panel("workbench").locator(".surface-head p").innerText()).toMatch(/^VERIFY: \d+ blockers? stand/);
    expect(await panel("workbench").locator("section").evaluateAll((s) => s.map((x) => (x as HTMLElement).dataset.block))).toEqual(expect.arrayContaining(["ledger", "blockers", "arts", "contract"]));
    expect(await page.locator(".term-mode").innerText()).toBe("VERIFY");
    expect(await panel("workbench").innerText()).toMatch(/Evidence ledger\. Unknown stays unknown/i); expect(await panel("workbench").innerText()).toMatch(/Test and browser-journey results/i);
    expect(await panel("workbench").locator("tr", { hasText: "Test and browser-journey results" }).innerText()).toMatch(/unknown/i);
    expect(survey(fx.run.dir)).toEqual(before); expect(readInbox(fx.run)).toEqual([]);
  });

  test("\"show the workflow\" opens the real stages and the lens dependency graph, with no model call", async () => {
    await say("show the workflow"); await panel("workflow").waitFor();
    await panel("workflow").locator(".react-flow, [data-type=graph]").first().waitFor();
    const text = await panel("workflow").innerText();
    for (const s of ["Classify Evidence", "Execute Dependency Waves", "Reconcile", "Rebuild Stale Work", "Accept / Defer / No-Go"]) expect(text).toContain(s);
    expect(await panel("workflow").locator("tr", { hasText: "Rebuild Stale Work" }).innerText()).toMatch(/attention/);
    expect(await page.locator(".term-last").innerText()).toMatch(/Showing the workflow/);
  });

  test("a capability is shown as capability, implementation, and executor, and an unseen implementation is unknown, not usable", async () => {
    await say("show capability fidelity-qa"); await panel("capabilities").waitFor();
    const layers = panel("capabilities").locator("[data-block=layers]"); await layers.waitFor();
    for (const l of ["Capability", "Implementation", "Alternative", "Executor", "Observation (Reach)"]) expect(await layers.innerText()).toContain(l);
    expect(await layers.innerText()).toMatch(/Visual Fidelity QA/); expect(await layers.innerText()).toMatch(/Current agent or tool/);
    expect(await layers.locator("tr", { hasText: "playwright-cli" }).innerText()).toMatch(/unknown|found/); expect(await layers.innerText()).not.toMatch(/\busable\b/);
    expect(await layers.locator("tr", { hasText: "browser.inspect" }).innerText()).toMatch(/browser\.inspect/);
  });

  test("\"show the task contract\" projects context, goal, skills, authority, executors, budget, invariants, and acceptance", async () => {
    await say("show the task contract"); await panel("contract").waitFor();
    const text = await panel("contract").innerText();
    for (const f of ["Context", "Goal", "Skills", "Authority", "Executors", "Budget", "Invariants", "Acceptance"]) expect(text).toContain(f);
    expect(text).toMatch(/Model cost is not recorded/); expect(text).toMatch(/declared: none/);
  });

  test("\"show me what blocks acceptance\" is answered locally with the gate, and \"what should happen next?\" with the Case", async () => {
    await say("show me what blocks acceptance"); await panel("gate").waitFor(); expect(await page.locator(".term-last").innerText()).toMatch(/blocker/);
    await say("what should happen next?"); await panel("case-run").waitFor(); expect(await page.locator(".term-last").innerText()).toMatch(/guidance, not an instruction/);
    await page.getByRole("button", { name: "terminal log" }).click();
    const log = await page.locator(".term-log").innerText(); expect(log).toContain("› show me what blocks acceptance"); expect(log).toContain("› what should happen next?");
    await page.getByRole("button", { name: "terminal log" }).click();
  });

  test("a genuine request is stored as queued and says so: it is not run, and no agent is claimed to have seen it", async () => {
    const before = survey(fx.run.dir);
    await say("verify the current frontend");
    const chip = page.locator(".term-req").first(); await chip.waitFor();
    expect(await chip.innerText()).toMatch(/R1/); expect(await chip.innerText()).toMatch(/queued/); expect(await chip.innerText()).toMatch(/verify the current frontend/);
    expect(await page.locator(".term-hint").innerText()).toMatch(/queued: no agent is connected; it will see this at its next interaction/);
    expect(await page.locator(".term-last").innerText()).toMatch(/Nothing has run/);
    expect(srv.cockpit.control.request("R1")).toMatchObject({ status: "queued", capability: "fidelity-qa" });
    const ctx = JSON.parse(fs.readFileSync(path.join(fx.run.dir, ".cockpit/context.json"), "utf8")); expect(ctx.work.pending).toBe(1);
    expect(survey(fx.run.dir)).toEqual(before);
  });

  test("the agent reads the request, picks it up, and reports progress; the page follows each step live", async () => {
    const got = await tool("work_get", {}); expect(got.result.pending[0]).toMatchObject({ id: "R1", status: "queued", capability: "fidelity-qa" });
    expect(((await (await fetch(srv.url + "/mcp", { method: "POST", headers: { "x-cockpit-token": srv.agentToken, "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) })).json()).result.tools as any[]).map((t) => t.name)).toContain("work_update");
    expect((await tool("work_update", { id: "R1", status: "acknowledged" })).ok).toBe(true);
    await page.locator(".term-req .status", { hasText: "acknowledged" }).waitFor();
    expect((await tool("work_update", { id: "R1", status: "running", note: "driving the journey" })).ok).toBe(true);
    await page.locator(".term-req .status", { hasText: "running" }).waitFor();
    expect(await page.locator(".term-hint").innerText()).toMatch(/an agent has called the cockpit/);
  });

  test("the agent marks it ready for review but cannot accept its own work; the owner's button does", async () => {
    const art = srv.cockpit.last.proj.artifacts.find((a: any) => !a.isGate)!;
    expect((await tool("work_update", { id: "R1", status: "ready_for_review", refs: [`artifact:${art.id}`], note: "journey checked at 375 and 1440" })).ok).toBe(true);
    await page.locator(".term-act.ok", { hasText: "Accept" }).waitFor();
    for (const status of ["accepted", "cancelled"]) { const r = await tool("work_update", { id: "R1", status }); expect(r.ok).toBe(false); expect(r.code).toBe("AUTHORITY_HUMAN"); }
    const viaAction = await fetch(srv.url + "/api/agent/action", { method: "POST", headers: { "x-cockpit-token": srv.agentToken, "content-type": "application/json" }, body: JSON.stringify({ op: "human.review", subject: "R1", outcome: "accepted" }) }).then((r) => r.json());
    expect(viaAction).toMatchObject({ ok: false, code: "AUTHORITY_HUMAN" }); expect(srv.cockpit.control.request("R1")!.status).toBe("ready_for_review");
    await panel("workbench").locator("tr", { hasText: "Work R1" }).waitFor();
    expect(await panel("workbench").locator("tr", { hasText: "Work R1" }).innerText()).toMatch(/pending|waiting for your review/);
    await page.locator(".term-act.ok", { hasText: "Accept" }).click();
    await page.locator(".term-req").waitFor({ state: "detached" });
    expect(srv.cockpit.control.request("R1")!.status).toBe("accepted"); expect(srv.cockpit.control.latestReview("request", "R1")).toMatchObject({ status: "accepted", reviewer: "owner" });
    await panel("workbench").locator("tr", { hasText: "Work R1" }).filter({ hasText: "accepted by the owner" }).waitFor();
  });

  test("typing a ruling does nothing: the terminal refuses it, and the proposals, the inbox, and the model do not move", async () => {
    const before = survey(fx.run.dir);
    await say("accept P12"); await page.locator(".term-last.refused").waitFor();
    await say("settle the run"); await page.locator(".term-last.unrecognized").waitFor(); expect(await page.locator(".term-last").innerText()).toMatch(/nothing was queued/);
    expect(readInbox(fx.run)).toEqual([]); expect(survey(fx.run.dir)).toEqual(before); expect(srv.cockpit.control.requests().length).toBe(1);
  });

  test("the Workbench follows the work without moving the owner's layout: a pinned tab stays pinned and in place while its mode changes", async () => {
    await panel("workbench").waitFor();
    await page.locator(".tab-title", { hasText: "Workbench" }).locator('button[aria-label="pin"]').click();
    await page.waitForFunction(() => document.querySelector(".tab-title .pinned"));
    const order = async () => page.locator(".tab-title span").evaluateAll((s) => s.map((x) => x.textContent).filter((t) => t && t.length > 2));
    const before = await order();
    patchState(fx, (s) => { s.activeLenses = { electronics: { startedAt: new Date().toISOString() } }; }); srv.cockpit.refresh();
    await panel("workbench").locator(".surface-head p", { hasText: /^EXECUTE: running: electronics/ }).waitFor();
    expect(await page.locator(".term-mode").innerText()).toBe("EXECUTE"); expect(await order()).toEqual(before);
    expect(await page.locator(".tab-title .pinned").count()).toBeGreaterThan(0); expect(srv.cockpit.ws.panels.workbench.pinned).toBe(true);
    patchState(fx, (s) => { s.activeLenses = {}; }); srv.cockpit.refresh(); await panel("workbench").locator(".surface-head p", { hasText: /^VERIFY:/ }).waitFor();
  });

  test("a dropped connection disables the terminal honestly; on reconnect the log and the requests are restored from the server", async () => {
    await say("audit accessibility"); await page.locator(".term-req", { hasText: "audit accessibility" }).waitFor();
    srv.dropClients(); await page.locator(".offline").waitFor();
    expect(await page.locator(".term-input").isDisabled()).toBe(true); expect(await page.locator(".term-input").getAttribute("placeholder")).toMatch(/disconnected; the run continues without the cockpit/);
    await page.locator(".offline").waitFor({ state: "detached", timeout: 15_000 }); await page.locator(".term-input:not([disabled])").waitFor();
    await page.locator(".term-req", { hasText: "audit accessibility" }).waitFor();
    await page.getByRole("button", { name: "terminal log" }).click(); const log = await page.locator(".term-log").innerText();
    expect(log).toContain("› verify the current frontend"); expect(log).toContain("› audit accessibility");
    expect(srv.cockpit.control.request("R2")).toMatchObject({ status: "queued", kind: "unclassified", capability: null });
  });

  test("the page raised no errors", () => { expect(errors).toEqual([]); });
});
