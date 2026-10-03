// The visual conspiracy, in a real browser: does the Case view arrange attention around the smallest consequential deviation and the next
// affordable move, without ever smoothing the evidence? Each test opens the owner's real page against a run built to be one situation, and
// asserts what is dominant, what is quiet, what is blocked and why, and that looking changes nothing.
import { describe, test, expect, beforeAll, afterAll, setDefaultTimeout } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, type Browser, type Page } from "playwright-core";
import index from "../../cockpit/web/index.html";
import { serveCockpit } from "../../cockpit/server/serve";
import { fixtureRun, cleanup, calm, makeStale, addDemand, patchState, writeRun, decisionArtifact } from "./helpers";
import { readInbox } from "../../hooks/src/lib/inbox.mjs";

setDefaultTimeout(30_000);   // six servers each bundle the page once; a cold first load is slow, a warm one is not
const CHROME = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", process.env.CHROME_BIN ?? ""].find((p) => p && fs.existsSync(p));
const d = CHROME ? describe : describe.skip;
if (!CHROME) console.warn("case.e2e: no Chrome found; browser tests skipped");

type Sc = { fx: ReturnType<typeof fixtureRun>; srv: ReturnType<typeof serveCockpit> };
const sc: Record<string, Sc> = {};
let browser: Browser;
const survey = (dir: string) => { const out: Record<string, string> = {}; const walk = (p: string) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { if (e.name === ".cockpit") continue; const f = path.join(p, e.name); if (e.isDirectory()) walk(f); else out[path.relative(dir, f)] = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"); } }; walk(dir); return out; };
const scenario = (name: string, fx: ReturnType<typeof fixtureRun>) => { sc[name] = { fx, srv: serveCockpit({ cwd: fx.project, index }) }; };

beforeAll(async () => {
  if (!CHROME) return;
  { const fx = fixtureRun("loam"); calm(fx); makeStale(fx, "marketing/beta-page.md"); scenario("next", fx); }                                  // A
  scenario("conflict", fixtureRun("mote", { stale: true }));                                                                                        // B
  { const fx = fixtureRun("loam"); calm(fx); scenario("optional", fx); }                                                                            // C
  { const fx = fixtureRun("loam"); calm(fx); patchState(fx, (s) => { s.paused = { reason: "owner sign-off needed", at: new Date().toISOString() }; }); scenario("authority", fx); }   // D
  { const fx = fixtureRun("loam"); calm(fx); addDemand(fx); scenario("demand", fx); }                                                               // E
  { const fx = fixtureRun("loam"); calm(fx); addDemand(fx);                                                                                         // F
    writeRun(fx, "artifacts/marketing/decision-states.md", decisionArtifact(["| OP1 | A1 | J1 | leaving for a week | the last plant died | a reminder that knows the soil | one more thing to set up | poking the soil | REPORTED | evidence/recon-software/interview-1.md |", "| run | A1 | J1 | demoing to a friend | embarrassment | looks like it just works | looks gimmicky | showing by hand | INFERRED | evidence/recon-software/interview-2.md |"]));
    scenario("decision", fx); }
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
});
afterAll(async () => { await browser?.close(); for (const s of Object.values(sc)) { try { s.srv.stop(); } catch { /* stopped */ } cleanup(s.fx.project); } });

async function caseView(name: string, ref?: string) {
  const { srv } = sc[name];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(srv.humanUrl); await page.locator(".rail-id b").waitFor();
  if (ref) { await fetch(srv.url + "/api/agent/tool", { method: "POST", headers: { "x-cockpit-token": srv.agentToken, "content-type": "application/json" }, body: JSON.stringify({ name: "case_get", input: { ref, show: true } }) }); }
  else {   // the workspace persists on the server: the offer shows only while it is empty, and the Case stays open afterwards
    const hint = page.locator(".hint", { hasText: "Where we are trying to go" });
    await page.locator(".hint, tr.group[data-lane]").first().waitFor(); if (await hint.count()) await hint.click();
  }
  await page.locator('tr.group[data-lane]').first().waitFor();
  return { page, errors };
}
const lanes = (page: Page) => page.locator("tr.group[data-lane]").evaluateAll((rs) => rs.map((r) => ({ lane: (r as HTMLElement).dataset.lane!, text: r.textContent!.trim() })));
const rowText = (page: Page, part: string) => page.locator("tr", { has: page.locator("td", { hasText: new RegExp(`^${part}$`) }) }).first().textContent();

d("the Case opens from the empty workspace, as the first and only dominant offer", () => {
  test("the owner's first hint is the destination, and opening it writes nothing to the run or the inbox", async () => {
    const s = sc.next; const before = survey(s.fx.run.dir); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(s.srv.humanUrl); await page.locator(".hint").first().waitFor();
    expect((await page.locator(".hint b").allTextContents())[0]).toBe("Where we are trying to go"); expect(await page.locator(".hint").count()).toBeLessThanOrEqual(4);
    await page.locator(".hint").first().click(); await page.locator("tr.group[data-lane]").first().waitFor();
    expect(survey(s.fx.run.dir)).toEqual(before); expect(readInbox(s.fx.run)).toEqual([]);
    await page.close();
  });
});

d("A: one obvious next move", () => {
  test("the destination, the deviation, and one next move are read top to bottom; settling is blocked and says why", async () => {
    const { page, errors } = await caseView("next");
    const text = await page.locator(".surface, main, body").first().innerText();
    const order = ["Destination", "Now", "Deviation", "Next move", "Cost and authority", "How we will know", "Settlement"].map((p) => text.indexOf(p));
    expect(order.every((i) => i >= 0)).toBe(true); expect([...order].sort((a, b) => a - b)).toEqual(order);   // the seven questions, in the order a decision needs them
    expect(await rowText(page, "Destination")).toContain("closed-beta signup page");
    expect(await rowText(page, "Next move")).toContain("Run lens marketing");
    const ls = await lanes(page); expect(ls[0].lane).toBe("next-move"); expect(ls.filter((l) => l.lane === "next-move").length).toBe(1);
    expect(ls.map((l) => l.lane)).toContain("blocked");
    await page.locator('tr.group[data-lane="blocked"] ~ tr').first().waitFor();
    const blocked = await page.locator('tr.group[data-lane="blocked"] ~ tr').first().innerText(); expect(blocked).toMatch(/Settle/); expect(blocked).toMatch(/because:/);
    expect(await rowText(page, "Settlement")).toMatch(/Not reachable/);
    expect(errors).toEqual([]); await page.close();
  });
  test("the next move is the only emphasised group; no alternative or blocked row carries the primary lane", async () => {
    const { page } = await caseView("next");
    const next = await page.locator('tr.group[data-lane="next-move"] ~ tr').evaluateAll((rs) => rs.map((r) => r.previousElementSibling?.className));
    expect(await page.locator('tr.group[data-lane="next-move"]').count()).toBe(1);
    const bg = async (lane: string) => page.locator(`tr.group[data-lane="${lane}"] td`).first().evaluate((e) => getComputedStyle(e).textTransform + "|" + getComputedStyle(e).borderBottomColor);
    expect((await bg("next-move")).split("|")[0]).toBe("uppercase"); expect((await bg("blocked")).split("|")[0]).toBe("none"); expect(next.length).toBeGreaterThan(0);
    await page.close();
  });
});

d("B: the desire to ship does not outrank the evidence", () => {
  test("a contradiction the build rests on is the deviation, the next move is to inspect it, and nothing smooths it", async () => {
    const { page, errors } = await caseView("conflict");
    expect(await rowText(page, "Deviation")).toMatch(/CONTRADICTED/); expect((await page.locator("tr", { hasText: /^Deviation/ }).first().locator(".status").textContent())).toBe("interrupt");
    expect(await rowText(page, "Next move")).toMatch(/Inspect the contradiction/);
    const all = (await page.locator("body").innerText());
    expect(all).not.toMatch(/almost|nearly|on track|looking good|good news|ready to ship|great progress|\d+% complete/i);
    expect(await rowText(page, "Settlement")).toMatch(/Not reachable/);
    const blocked = await page.locator('tr.group[data-lane="blocked"] ~ tr').first().innerText(); expect(blocked).toMatch(/Settle/);
    expect(errors).toEqual([]); await page.close();
  });
});

d("C: settlement is reachable and optional work remains", () => {
  test("the owner is shown the choice, nothing is marked primary, and nothing closes", async () => {
    const s = sc.optional; const before = survey(s.fx.run.dir); const { page } = await caseView("optional");
    expect(await rowText(page, "Settlement")).toMatch(/Reachable\..*optional move\(s\) remain/);
    expect((await lanes(page)).map((l) => l.lane)).toEqual(expect.arrayContaining(["choose"])); expect((await lanes(page)).map((l) => l.lane)).not.toContain("next-move");
    expect(await page.locator("tr", { hasText: /^Settle: record the verdict/ }).count()).toBe(1);
    expect(await rowText(page, "Next move")).toMatch(/your choice/);
    expect(await rowText(page, "Settlement")).toMatch(/Whether to settle now is your judgment/);
    await Bun.sleep(300); expect(survey(s.fx.run.dir)).toEqual(before); expect(JSON.parse(fs.readFileSync(path.join(s.fx.run.dir, "state.json"), "utf8")).active).toBe(true);
    await page.close();
  });
});

d("D: a blocked move names the authority it needs and what can still be done", () => {
  test("authority unavailable is stated, the owner's move leads, and other moves remain available", async () => {
    const { page } = await caseView("authority");
    expect(await rowText(page, "Next move")).toMatch(/Give the run what it is waiting on/);
    const blocked = await page.locator('tr.group[data-lane="blocked"] ~ tr').first().innerText(); expect(blocked).toMatch(/authority unavailable: the run is paused for the owner \(owner sign-off needed\)/); expect(blocked).toMatch(/owner/);
    expect(await page.locator('tr.group[data-lane="alternatives"] ~ tr').count()).toBeGreaterThan(0);
    await page.close();
  });
});

d("E: an opportunity with missing market evidence", () => {
  test("the view says the evidence is insufficient, shows UNKNOWN as UNKNOWN, and offers a way to acquire it", async () => {
    const { page } = await caseView("demand", "OP1");
    expect(await rowText(page, "Deviation")).toMatch(/evidence insufficient/);
    const crit = await page.locator("tr", { hasText: "S1" }).first().innerText(); expect(crit).toMatch(/UNKNOWN/); expect(crit).toMatch(/UNCOMPUTED/i);
    expect(await rowText(page, "Next move")).toMatch(/Measure S1/);
    expect(await page.locator("body").innerText()).not.toMatch(/opportunity score:\s*\d|\bscore\b[^\n]{0,20}\d{2}/i);
    const reach = await page.locator("tr", { hasText: "posthog" }).first().innerText(); expect(reach).toMatch(/blocked|POSTHOG_API_KEY/);
    expect(await page.locator("tr", { hasText: /Take OP1 as product direction/ }).first().innerText()).toMatch(/because/);
    await page.close();
  });
});

d("F: a decision state is a situation", () => {
  test("two Cases of the same actor and job show different states, marked inferred where they are, with no empty tables", async () => {
    const { page } = await caseView("decision", "OP1");
    const { srv } = sc.decision; const open = (ref: string) => fetch(srv.url + "/api/agent/tool", { method: "POST", headers: { "x-cockpit-token": srv.agentToken, "content-type": "application/json" }, body: JSON.stringify({ name: "case_get", input: { ref, view: "decision", show: true } }) });
    await open("OP1"); await page.locator("tr", { hasText: "leaving for a week" }).first().waitFor();
    const first = await page.locator("body").innerText(); expect(first).toMatch(/leaving for a week/); expect(first).not.toMatch(/demoing to a friend/);   // this Case, not the other
    expect(first).toMatch(/direct/); expect(first).toMatch(/not the actor's/i); expect(first).not.toMatch(/persona|mindstate|archetype|segment:/i);
    expect(first).not.toMatch(/what would tell us|what survived/i);   // nothing to say, so nothing shown
    await open("run"); await page.locator("tr", { hasText: "demoing to a friend" }).first().waitFor();
    const second = await page.locator("body").innerText(); expect(second).toMatch(/demoing to a friend/); expect(second).toMatch(/inferred/);
    await page.close();
  });
});

d("the human journey: eleven questions answered from one view, without reading a file", () => {
  test("destination, truth, what prevents it, the move, why, cost, authority, evidence, what opens, can I settle, what optional remains", async () => {
    const { page } = await caseView("next");
    const next = await rowText(page, "Next move");
    const answers: Record<string, RegExp> = {
      "what am I trying to accomplish": /Destination[\s\S]*closed-beta signup page/, "what is actually true": /Now[\s\S]*model@4/, "what prevents it": /Deviation[\s\S]*(stale|cites C14|artifacts\/marketing)/,
      "what can I do now": /Run lens marketing/, "why that move": /marketing|stale|fails its checks/i, "what would it cost": /Cost and authority[\s\S]*(cost unknown|min)/, "what authority": /agent authority/,
      "what evidence should result": /How we will know[\s\S]*lens marketing output/, "can I settle now": /Settlement[\s\S]*Not reachable/,
    };
    const text = await page.locator("body").innerText();
    for (const [q, re] of Object.entries(answers)) expect(text, q).toMatch(re);
    expect(next).toBeTruthy();
    const o = await caseView("optional"); const t2 = await o.page.locator("body").innerText();
    expect(t2, "if settleable, what optional work remains").toMatch(/optional move\(s\) remain/); expect(t2, "what becomes reachable").toMatch(/Then reachable|then reachable|also advances|choose/i);
    await o.page.close(); await page.close();
  });
  test("a historical view in another surface never replaces the Case: the destination stays the current one", async () => {
    const { page } = await caseView("conflict");
    const { srv } = sc.conflict;
    await fetch(srv.url + "/api/agent/tool", { method: "POST", headers: { "x-cockpit-token": srv.agentToken, "content-type": "application/json" }, body: JSON.stringify({ name: "show_surface", input: { surface: { id: "then", title: "Then", blocks: [{ type: "table", id: "t", source: "pa:claims?at=2" }] }, place: { rel: "right", to: "active" } } }) });
    await page.locator(".world-banner").waitFor();
    expect(await page.locator(".world-banner").first().innerText()).toMatch(/Historical view, read-only: model@2/);
    expect(await rowText(page, "Destination")).toContain("closed-beta hardware kit");   // the Case still points at the current world
    await page.close();
  });
});
