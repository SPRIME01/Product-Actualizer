// End-to-end in a real browser (Playwright over system Chrome): the rail, the spatial workspace, every human gesture that becomes process input,
// reconnection, keyboard, and WebMCP. Skipped, loudly, when no Chrome is installed.
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import index from "../../cockpit/web/index.html";
import { serveCockpit } from "../../cockpit/server/serve";
import { fixtureRun, cleanup } from "./helpers";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";
import { TOOL_NAMES } from "../../cockpit/protocol/tools";

const CHROME = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", process.env.CHROME_BIN ?? ""].find((p) => p && fs.existsSync(p));
const d = CHROME ? describe : describe.skip;
async function poll(fn: () => any, ms = 5000) { const t = Date.now(); let v: any; while (Date.now() - t < ms) { v = await fn(); if (v) return v; await Bun.sleep(40); } return v; }
if (!CHROME) console.warn("ui.e2e: no Chrome found; browser tests skipped");

let browser: Browser, fx: ReturnType<typeof fixtureRun>, srv: ReturnType<typeof serveCockpit>;
const tool = (name: string, input: any) => fetch(srv.url + "/api/agent/tool", { method: "POST", headers: { "x-cockpit-token": srv.agentToken, "content-type": "application/json" }, body: JSON.stringify({ name, input }) }).then((r) => r.json());
async function open(init?: (p: Page) => Promise<void>) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  if (init) await init(page);
  await page.goto(srv.humanUrl);
  await page.locator(".rail-id b").waitFor();
  return { page, errors };
}

beforeAll(async () => {
  if (!CHROME) return;
  fx = fixtureRun("mote", { stale: true, openProposals: ["P24", "P25"] });
  srv = serveCockpit({ cwd: fx.project, index });
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
});
afterAll(async () => { await browser?.close(); srv?.stop(); if (fx) cleanup(fx.project); });

d("rail", () => {
  test("projects process state, stays within 20% of the viewport even expanded, and cannot be removed", async () => {
    const { page, errors } = await open();
    expect(await page.locator(".rail-id b").textContent()).toBe("Mote");
    for (const [txt] of [["2 proposals"], ["2 stale"], ["14 contradicted"]]) await page.locator(`.chips [aria-label="${txt}"]`).waitFor();
    const h1 = (await page.locator(".rail").boundingBox())!.height;
    expect(h1 / 900).toBeLessThan(0.08);
    await page.getByLabel("details").click();
    const h2 = (await page.locator(".rail").boundingBox())!.height;
    expect(h2 / 900).toBeLessThanOrEqual(0.2);
    expect(await page.locator(".rail button").evaluateAll((bs) => bs.every((b) => (b.getAttribute("aria-label") || b.textContent || "").trim().length > 0))).toBe(true);
    const r = await tool("arrange", { action: { op: "surface.remove", id: "system.rail" } });
    expect(r.ok).toBe(false);
    expect(await page.locator(".rail").isVisible()).toBe(true);
    expect(errors).toEqual([]);
    await page.close();
  });
  test("on a narrow window the rail wraps but still never exceeds a fifth of the height", async () => {
    const { page } = await open();
    for (const [w, h] of [[760, 800], [420, 900], [1100, 560]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(150);
      const rail = (await page.locator(".rail").boundingBox())!.height;
      expect(rail / h, `${w}x${h}`).toBeLessThanOrEqual(0.2);
      expect(await page.locator(".verdict").isVisible()).toBe(true);
    }
    await page.close();
  });
  test("the rail follows the process live: resolving the last proposal changes the chip without a reload", async () => {
    const { page } = await open();
    await page.locator('.chips [aria-label="2 proposals"]').waitFor();
    const f = path.join(fx.run.dir, "proposals.md");
    const orig = fs.readFileSync(f, "utf8");
    fs.writeFileSync(f, orig.replace(/\| open \|/g, "| rejected |"));
    await page.locator('.chips [aria-label="0 proposals"]').waitFor({ timeout: 5000 });
    fs.writeFileSync(f, orig);
    await page.locator('.chips [aria-label="2 proposals"]').waitFor({ timeout: 5000 });
    await page.close();
  });
});

d("workspace", () => {
  test("agent compositions render as fixed components: chart, graph, table, tree, entity, with no console errors", async () => {
    const { page, errors } = await open();
    await tool("arrange", { action: { op: "layout.reset" } });
    await tool("show_surface", { surface: { id: "pwr", title: "Power", intent: "verify", blocks: [
      { type: "chart", id: "c", kind: "bar", x: "state", series: [{ y: "load_a" }], source: "file:evidence/electronics/power-budget.md#table1", threshold: { value: 2.5, label: "supply", tone: "danger" } },
      { type: "table", id: "t", source: "file:evidence/electronics/power-budget.md#table1", group: "verdict" },
      { type: "entity", id: "e", ref: "claim:C57" }] } });
    await tool("show_surface", { surface: { id: "g", title: "Stale", blocks: [{ type: "graph", id: "gr", source: "graph:staleness" }, { type: "tree", id: "tr", source: "pa:trace", expand: 2, show: ["status", "duration"] }] }, place: { rel: "below", to: "pwr", size: 0.4 } });
    await page.locator('[data-surface="pwr"] svg').first().waitFor({ timeout: 8000 });
    await page.locator('[data-surface="g"] .react-flow__node').first().waitFor({ timeout: 8000 });
    expect(await page.locator('[data-surface="pwr"] table.t tbody tr').count()).toBeGreaterThan(4);
    await page.locator('[data-surface="g"] .tree-row').first().waitFor();
    await page.locator('[data-surface="pwr"] .entity .grade').first().waitFor();
    expect(await page.locator(".dv-tab").count()).toBe(2);
    expect(errors).toEqual([]);
    await page.close();
  });
  test("dragging a tab rearranges the workspace, the server records the owner's placement, and a reload restores it", async () => {
    const { page } = await open();
    await page.locator('[data-surface="pwr"]').first().waitFor();
    const before = JSON.stringify(srv.cockpit.ws.tree);
    const tab = page.locator(".dv-tab", { hasText: "Stale" }).first(); const target = page.locator('[data-surface="pwr"]').first();
    const tb = (await tab.boundingBox())!, gb = (await target.boundingBox())!;
    await page.mouse.move(tb.x + 20, tb.y + tb.height / 2); await page.mouse.down();
    await page.mouse.move(gb.x + gb.width - 30, gb.y + gb.height / 2, { steps: 12 });
    await page.waitForTimeout(250);
    await page.mouse.move(gb.x + gb.width - 24, gb.y + gb.height / 2, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(900);
    const after = JSON.stringify(srv.cockpit.ws.tree);
    expect(after).not.toBe(before);
    expect(srv.cockpit.ws.panels.g.placedBy).toBe("human");
    // the agent cannot undo the owner's choice
    expect((await tool("arrange", { action: { op: "view.place", id: "g", place: { rel: "below", to: "pwr" } } })).code).toBe("AUTHORITY_LAYOUT");
    await page.reload(); await page.locator(".rail-id b").waitFor(); await page.locator(".dv-tab").first().waitFor();
    expect(await page.locator(".dv-tab").count()).toBe(2);
    expect(JSON.stringify(srv.cockpit.ws.tree)).toBe(after);
    await page.close();
  });
  test("pin, minimize, restore from the strip, and close are the owner's gestures", async () => {
    const { page } = await open();
    await page.locator(".dv-tab", { hasText: "Power" }).getByLabel("pin").click();
    expect(await poll(() => srv.cockpit.ws.panels.pwr.pinned)).toBe(true);
    expect((await tool("arrange", { action: { op: "surface.remove", id: "pwr" } })).code).toBe("AUTHORITY_PINNED");
    await page.locator(".dv-tab", { hasText: "Stale" }).getByLabel("minimize").click();
    await page.locator(".mini button", { hasText: "Stale" }).waitFor();
    await page.locator(".mini button", { hasText: "Stale" }).click();
    await page.locator(".dv-tab", { hasText: "Stale" }).waitFor();
    await page.locator(".dv-tab", { hasText: "Stale" }).getByLabel("close").click();
    expect(await poll(() => srv.cockpit.ws.panels.g === undefined)).toBe(true);
    await page.close();
  });
  test("an empty workspace offers the few affordances that matter now, and the palette opens anything from the keyboard", async () => {
    await tool("arrange", { action: { op: "layout.reset" } });
    srv.cockpit.human({ op: "human.pin", id: "pwr", pinned: false });
    await tool("arrange", { action: { op: "layout.reset" } });
    const { page } = await open();
    await page.getByText("Nothing open.").waitFor();
    const hints = await page.locator(".hint b").allTextContents();
    expect(hints.length).toBeGreaterThan(0); expect(hints.length).toBeLessThanOrEqual(4);
    expect(hints.join(" ")).toMatch(/proposal|stale|blocks/i);
    await page.keyboard.press("Control+k");
    await page.getByRole("dialog", { name: "command palette" }).waitFor();
    await page.keyboard.type("release gate"); await page.keyboard.press("Enter");
    await page.locator('[data-surface="gate"]').waitFor();
    await page.close();
  });
});

d("human input becomes process input, never model edits", () => {
  test("answering an agent question in the UI writes an owner response to the inbox and shows it as waiting for the router", async () => {
    const { page } = await open();
    await tool("ask_human", { id: "dir", prompt: "Which direction should the servo supply take?", input: "select", why: "C57 shows negative margin.", options: [{ value: "rail", label: "Independent servo rail", consequence: "adds a regulator" }, { value: "bigger", label: "Larger supply" }], resolves: "unknown:U8" });
    await page.getByText("Which direction should the servo supply take?").waitFor();
    await page.locator(".needs").waitFor();
    await page.getByText("Independent servo rail").click();
    await page.getByRole("button", { name: "Answer" }).click();
    await page.getByText("recorded, waiting for the router").waitFor();
    const e = readInbox(fx.run).find((r: any) => r.ask === "dir");
    expect(e).toMatchObject({ kind: "answer", outcome: "answered", value: "rail", via: "cockpit", ref: "unknown:U8" });
    await page.close();
  });
  test("ruling on a proposal from its entity view records a ruling and leaves proposals.md alone", async () => {
    const before = fs.readFileSync(path.join(fx.run.dir, "proposals.md"), "utf8");
    const { page } = await open();
    await tool("show_ref", { ref: "proposal:P25" });
    await page.getByRole("button", { name: "Reject…" }).click();
    await page.getByLabel("reject").fill("not enough evidence for a no-go yet");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByText("recorded, waiting for the router").first().waitFor();
    expect(readInbox(fx.run).some((r: any) => r.ref === "proposal:P25" && r.outcome === "reject")).toBe(true);
    expect(fs.readFileSync(path.join(fx.run.dir, "proposals.md"), "utf8")).toBe(before);
    await page.close();
  });
  test("a physical preflight is confirmed or declined in the UI and recorded with its bounds and recovery", async () => {
    const { page } = await open();
    await tool("show_surface", { surface: { id: "flash", title: "Flash neck", intent: "decide", blocks: [{ type: "preflight", id: "p", action: { class: "state-changing", target: "neck RP2040", currentState: "v0.3", expected: "v0.4 banner", stopIf: "no enumeration", bounds: "UF2 only", action: "copy uf2", boundedBy: "one file copy", observation: "serial log", recovery: "reflash v0.3 via BOOTSEL" } }] } });
    await page.getByRole("button", { name: "Confirm this action" }).click();
    await page.getByText("You confirmed").waitFor();
    expect(readInbox(fx.run).find((r: any) => r.kind === "confirmation")).toMatchObject({ outcome: "confirmed", recovery: "reflash v0.3 via BOOTSEL" });
    await page.close();
  });
  test("clicking a ref chip anywhere opens that entity beside the current view", async () => {
    const { page } = await open();
    await tool("arrange", { action: { op: "layout.reset" } });
    await tool("show_surface", { surface: { id: "note", title: "Note", blocks: [{ type: "callout", id: "c", tone: "warning", text: "See [[C44]] for the width conflict." }] } });
    await page.locator(".refchip", { hasText: "C44" }).click();
    await page.locator('[data-surface="ref-claim-c44"]').waitFor();
    await page.close();
  });
});

d("resilience and WebMCP", () => {
  test("a dropped connection shows as offline, the workspace stays, and the page reconnects on its own", async () => {
    const { page } = await open();
    await tool("show_ref", { ref: "claim:C57" });
    await page.locator('[data-surface="ref-claim-c57"]').waitFor();
    srv.dropClients();
    await page.locator(".offline").waitFor({ timeout: 3000 });
    await tool("show_ref", { ref: "unknown:U8" });      // composed while the browser was away
    await page.locator(".offline").waitFor({ state: "detached", timeout: 8000 });
    await page.locator('[data-surface="ref-unknown-u8"]').waitFor({ timeout: 5000 });
    expect(await page.locator(".dv-tab", { hasText: "claim C57" }).count()).toBe(1);
    await page.close();
  });
  test("WebMCP registers the semantic tools and routes them through the same rules", async () => {
    const { page } = await open(async (p) => { await p.addInitScript(() => { (navigator as any).modelContext = { provideContext(c: any) { (window as any).__mcp = c.tools; } }; }); });
    await page.waitForFunction(() => (window as any).__mcp?.length > 0);
    const names = await page.evaluate(() => (window as any).__mcp.map((t: any) => t.name));
    expect(names.sort()).toEqual([...TOOL_NAMES].sort());
    const status = await page.evaluate(() => (window as any).__mcp.find((t: any) => t.name === "get_status").execute({}));
    expect(JSON.parse(status.content[0].text)).toHaveProperty("counts");
    const shown = await page.evaluate(() => (window as any).__mcp.find((t: any) => t.name === "show_ref").execute({ ref: "decision:D7" }));
    expect(shown.isError).toBe(false);
    await page.locator('[data-surface="ref-decision-d7"]').waitFor();
    const forged = await page.evaluate(() => (window as any).__mcp.find((t: any) => t.name === "arrange").execute({ action: { op: "human.rule", ref: "proposal:P24", ruling: "accept" } }));
    expect(forged.isError).toBe(true);
    expect(readInbox(fx.run).some((r: any) => r.ref === "proposal:P24")).toBe(false);
    await page.close();
  });
  test("the page works with no WebMCP present and exposes no raw-DOM tools", async () => {
    const { page, errors } = await open();
    expect(await page.evaluate(() => (navigator as any).modelContext)).toBeUndefined();
    expect(errors).toEqual([]);
    await page.close();
  });
});

d("the digital walkthrough (Loam) in the same cockpit", () => {
  test("a software-only run renders: no physical lenses in the lens map, hints, contradictions with sources, and the gate", async () => {
    const lfx = fixtureRun("loam", { complete: true });
    const lsrv = serveCockpit({ cwd: lfx.project, index });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(lsrv.humanUrl);
    await page.locator(".rail-id b").waitFor();
    expect(await page.locator(".rail-id b").textContent()).toBe("Loam");
    await page.locator(".chips [aria-label=\"3 contradicted\"]").click();
    await page.locator('[data-surface="contradictions"] table.t tbody tr').first().waitFor();
    expect(await page.locator('[data-surface="contradictions"] .entity').count()).toBe(1);      // the first row is already open in full
    await page.getByLabel("details").click();
    await page.locator(".lens-pill.excluded").first().waitFor();
    const excluded = await page.locator(".lens-pill.excluded").allTextContents();
    expect(excluded).toEqual(expect.arrayContaining(["electronics", "embedded-systems", "robotics"]));   // excluded with reasons, visibly inactive
    expect(await page.locator(".lens-pill.done").allTextContents()).not.toEqual(expect.arrayContaining(["electronics"]));
    await page.locator(".verdict").click();
    await page.locator('[data-surface="gate"] .entity').waitFor();
    expect(errors).toEqual([]);
    await page.close(); lsrv.stop(); cleanup(lfx.project);
  });
});
