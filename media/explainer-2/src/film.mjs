// Film 2: a pure function of time. window.renderFrame(t) sets every element's state from t alone; no clock, animation, or random source runs.
// Facts come from data.json (tools/build-data.mjs). Layout is flow-based so text cannot collide; render.mjs --layout checks that.
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls = "", text = "", style = {}) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; for (const [k, v] of Object.entries(style)) e.style[k] = typeof v === "number" && v !== 0 && !["opacity", "fontWeight", "zIndex"].includes(k) ? v + "px" : v; return e; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - Math.pow(2, -10 * x));
const rev = (s, at, d = 0.45) => ease(clamp((s - at + 0.06) / d));
const show = (e, v, dy = 10) => { e.style.opacity = String(v); e.style.transform = `translateY(${((1 - v) * dy).toFixed(2)}px)`; };
let D, TL, S = [];
const chipEl = (grade) => el("span", `g g-${grade.toLowerCase()}`, grade);
const flow = (style = {}) => el("div", "", "", style);

const scenes = {
  demo: { texts: [{ text: "The robot works.", at: 0 }],
    build(r) { this.k = el("div", "k", "a demo video says", { marginTop: "40px" }); this.t = el("div", "", "The robot works.", { font: "800 150px/1.04 var(--font-text)", marginTop: "20px" });
      this.c = flow({ display: "flex", gap: "28px", alignItems: "center", marginTop: "50px", flexWrap: "wrap" }); this.c.append(chipEl("UNKNOWN"), el("span", "k", "real? sped up? teleoperated?")); r.append(this.k, this.t, this.c); },
    update(s) { show(this.k, rev(s, 0, 0.3)); show(this.t, rev(s, 0, 0.5)); show(this.c, rev(s, 1.4)); } },
  quotes: { texts: D_texts(), 
    build(r) { this.items = D.hn.map((h) => { const f = flow({ marginTop: "26px" }); f.append(el("div", "", "“" + h.q + "”", { font: "700 60px/1.15 var(--font-text)", maxWidth: "1560px" }), el("div", "k", h.src, { fontSize: "34px", marginTop: "10px" })); r.append(f); return f; }); },
    update(s, d) { this.items.forEach((f, i) => show(f, rev(s, i * d * 0.3, 0.5))); } },
  same: { texts: [{ text: "What is true?", at: 0.4 }],
    build(r) { this.rows = ["Code.", "A circuit board.", "A launch page."].map((x) => { const e = el("div", "", x, { font: "700 104px/1.12 var(--font-text)", color: "var(--ink-2)" }); r.append(e); return e; }); this.q = el("div", "", "What is true?", { font: "800 130px/1.1 var(--font-text)", marginTop: "36px" }); r.append(this.q); },
    update(s, d) { this.rows.forEach((e, i) => show(e, rev(s, i * 0.5, 0.4))); show(this.q, rev(s, d * 0.5, 0.5)); } },
  ledger: { texts: [{ text: "seven grades; public copy may use two", at: 0.55 }],
    build(r) { this.lab = el("div", "k", "worked example: Mote, a fictional desk robot", { marginBottom: "6px", fontSize: "36px" }); r.append(this.lab);
      this.rows = D.mote.map((c) => { const row = flow({ display: "grid", gridTemplateColumns: "110px 1fr 300px", gap: "28px", alignItems: "start", borderTop: "2px solid var(--rule)", padding: "18px 0 20px" }); const body = el("div");
        body.append(el("div", "", c.text, { font: "500 48px/1.18 var(--font-text)" }), el("div", "mono", "source: " + c.source.split(";")[0], { font: "400 30px var(--font-mono)", color: "var(--ink-3)", marginTop: "8px", overflowWrap: "anywhere" }));
        row.append(el("div", "mono", c.id, { font: "600 42px var(--font-mono)", color: "var(--ink-2)" }), body, chipEl(c.grade)); r.append(row); return row; });
      this.foot = flow({ marginTop: "30px" }); this.sl = el("div", "k", "seven grades; public copy may use two", { marginBottom: "14px" }); this.strip = flow({ display: "flex", gap: "16px", flexWrap: "wrap" }); D.grades.forEach((g) => this.strip.append(chipEl(g))); this.foot.append(this.sl, this.strip); r.append(this.foot); },
    update(s, d) { show(this.lab, rev(s, 0, 0.3)); this.rows.forEach((row, i) => show(row, rev(s, 0.3 + i * d * 0.12))); show(this.foot, rev(s, d * 0.55)); } },
  lenses: { texts: [{ text: "Hardware", at: 0.5 }],
    build(r) { this.rows = D.groups.map((g) => { const row = flow({ display: "flex", alignItems: "baseline", gap: "22px", borderTop: "2px solid var(--rule-soft)", padding: "6px 0 0" }); row.append(el("span", "k", g.name, { width: "230px", flex: "none", fontSize: "32px" })); const box = flow(); g.lenses.forEach((n) => box.append(el("span", "lens", n, { fontSize: "32px", padding: "2px 14px", marginBottom: "8px" }))); row.append(box); r.append(row); return row; }); },
    update(s, d) { this.rows.forEach((row, i) => show(row, rev(s, i * d * 0.08, 0.3))); } },
  rule: { texts: [{ text: "Exercised on the real unit, at the shipping revision.", at: 0 }],
    build(r) { this.t = el("div", "", "Exercised on the real unit, at the shipping revision.", { font: "800 92px/1.08 var(--font-text)", marginTop: "30px", maxWidth: "1600px" }); this.k = el("div", "k", "not enough on their own", { marginTop: "56px" });
      this.list = flow({ display: "flex", gap: "18px", flexWrap: "wrap", marginTop: "16px" }); this.items = D.notEnough.map((x) => { const e = el("span", "mono", x, { font: "500 42px var(--font-mono)", textDecoration: "line-through", textDecorationThickness: "4px", color: "var(--ink-2)", border: "2px solid var(--rule)", borderRadius: "6px", padding: "6px 16px", background: "var(--surface-raised)" }); this.list.append(e); return e; }); r.append(this.t, this.k, this.list); },
    update(s, d) { show(this.t, rev(s, 0, 0.5)); show(this.k, rev(s, d * 0.35)); this.items.forEach((e, i) => show(e, rev(s, d * (0.4 + i * 0.09), 0.3), 6)); } },
  walk: { texts: [{ text: "Verdict: no-go", at: 0.7 }],
    build(r) { this.hdr = el("div", "k", "physical evidence walk, hardware worked example", { fontSize: "30px", marginBottom: "4px" }); r.append(this.hdr);
      this.rows = D.walk.map((w) => { const row = flow({ display: "grid", gridTemplateColumns: "100px 1fr 240px 280px", gap: "16px", alignItems: "baseline", borderTop: "2px solid var(--rule-soft)", padding: "3px 0" });
        const bad = w.onUnit.toLowerCase() === "no" || /fail|none/i.test(w.result);
        row.append(el("span", "mono", w.id, { font: "600 30px var(--font-mono)", color: "var(--ink-2)" }), el("span", "", w.claim, { font: "500 34px/1.1 var(--font-text)" }), el("span", "mono", `on unit: ${w.onUnit}`, { font: "400 30px var(--font-mono)", color: "var(--ink-3)" }), el("span", `mono ${bad ? "bad" : "ok"}`, `result: ${w.result}`, { font: "600 30px var(--font-mono)" })); r.append(row); return row; });
      this.v = el("div", "bad", "Verdict: " + D.verdict, { font: "800 68px/1.1 var(--font-text)", marginTop: "10px" }); r.append(this.v); },
    update(s, d) { this.rows.forEach((row, i) => show(row, rev(s, i * d * 0.06, 0.25), 4)); show(this.hdr, rev(s, 0, 0.3)); show(this.v, rev(s, d * 0.7, 0.4)); } },
  refusal: { texts: [{ text: "A public artifact that cites a claim graded below OBSERVED is rejected.", at: 0.1 }, { text: "validateArtifact: refused", at: 0.55 }],
    build(r) { this.p = el("div", "panel", "", { padding: "30px 48px", marginTop: "10px" }); this.h = el("div", "k", D.copyStamp, { fontSize: "32px" }); this.l = el("div", "", "", { font: "600 58px/1.22 var(--font-text)", marginTop: "28px" }); this.l.append(document.createTextNode(D.copyLine + " "), (this.chip = chipEl("VERIFIED")));
      this.v = el("div", "", "", { marginTop: "36px", font: "500 38px/1.35 var(--font-mono)", border: "2px solid var(--rule)", borderRadius: "6px", padding: "22px 28px", background: "var(--surface-raised)" }); this.v.append(el("div", "bad", "validateArtifact: refused", { fontWeight: 700 }), el("div", "", D.validatorRefusal, { marginTop: "8px" })); this.p.append(this.h, this.l, this.v); r.append(this.p); },
    update(s, d) { show(this.p, rev(s, 0, 0.4)); const f = s > d * 0.38; this.chip.textContent = f ? "REPORTED" : "VERIFIED"; this.chip.className = `g g-${f ? "reported" : "verified"}`; show(this.v, rev(s, d * 0.55)); } },
  stale: { texts: [{ text: "stale by D11", at: 0.5 }],
    build(r) { this.rows = D.stale.artifacts.map((a) => { const row = flow({ borderTop: "2px solid var(--rule)", padding: "8px 0 10px" }); const st = el("div", "mono", "", { font: "500 36px var(--font-mono)" }); row.append(el("div", "mono", a, { font: "600 42px var(--font-mono)" }), st); row._st = st; r.append(row); return row; });
      this.dec = el("div", "panel", `${D.stale.decision} touched ${D.stale.touched}. The model is now at model@${D.stale.to}.`, { marginTop: "22px", padding: "16px 28px", font: "500 36px/1.25 var(--font-text)" }); r.append(this.dec); },
    update(s, d) { this.rows.forEach((row, i) => show(row, rev(s, i * 0.12, 0.3))); const f = s > d * 0.5; show(this.dec, rev(s, d * 0.34));
      this.rows.forEach((row) => { row._st.textContent = f ? `built_from: model@${D.stale.from}  stale by ${D.stale.decision}` : `built_from: model@${D.stale.from}  current`; row._st.className = "mono " + (f ? "stale" : "ok"); }); } },
  authority: { texts: [{ text: "AUTHORITY_HUMAN", at: 0.6 }],
    build(r) { this.row = flow({ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", marginTop: "20px" }); this.chips = D.lifecycle.map((st) => { const c = el("span", "mono", st, { font: "500 40px var(--font-mono)", border: "2px solid var(--rule)", borderRadius: "6px", padding: "10px 16px", background: "var(--surface-raised)" }); this.row.append(c); return c; });
      this.roles = el("div", "k", "the agent reports these; the owner accepts", { marginTop: "26px" });
      this.msg = el("div", "", "", { marginTop: "30px", border: "3px solid var(--g-contradicted)", borderRadius: "8px", padding: "26px 32px", font: "500 40px/1.35 var(--font-mono)", background: "var(--surface-panel)" }); this.msg.append(el("div", "bad", "agent: accepted", { fontWeight: 700, marginBottom: "8px" }), el("div", "", D.authorityMessage)); r.append(this.row, this.roles, this.msg); },
    update(s, d) { this.chips.forEach((c, i) => show(c, rev(s, i * 0.35 * (d / 8), 0.3), 6)); show(this.roles, rev(s, d * 0.5)); show(this.msg, rev(s, d * 0.62)); } },
  end: { texts: [{ text: "Finish the product. Show the evidence.", at: 0.3 }],
    build(r) { this.top = flow({ display: "flex", alignItems: "center", gap: "56px", marginTop: "20px" }); this.m = el("img", "", "", { width: 200, height: 200 }); this.m.src = "../../../brand/logo/mark.svg"; this.w = el("div", "", "Product Actualizer", { font: "800 130px var(--font-text)" }); this.top.append(this.m, this.w);
      this.t = el("div", "", D.tagline, { font: "700 84px/1.1 var(--font-text)", marginTop: "56px", maxWidth: "1600px" }); this.c = el("div", "k", D.cta, { marginTop: "56px", fontSize: "42px" }); r.append(this.top, this.t, this.c); },
    update(s) { show(this.top, rev(s, 0, 0.4)); show(this.t, rev(s, 0.9)); show(this.c, rev(s, 1.6)); } },
};
function D_texts() { return [{ text: "Are these videos of it eg tidying up real or just staged / cherry picked?", at: 0 }, { text: "None of the videos on website say how much are they speed up (or not), and is robot teleoperated or running autonomously.", at: 0.3 }]; }

const ORDER = ["demo", "quotes", "same", "ledger", "lenses", "rule", "walk", "refusal", "stale", "authority", "end"];
window.initFilm = (data, timeline, captions = true) => {
  D = data; TL = timeline; $("#stamp").textContent = `built_from: model@${D.modelVersion}`; $("#cap").classList.toggle("off", !captions);
  const root = $("#scene"); root.replaceChildren(); S = [];
  ORDER.forEach((id, i) => { const sc = scenes[id]; const wrap = el("div", "abs", "", { inset: 0 }); root.append(wrap); sc.build(wrap); const start = i === 0 ? 0 : TL.lines[i].start - 0.2; const end = i + 1 < ORDER.length ? TL.lines[i + 1].start - 0.2 : TL.total; S.push({ id, sc, wrap, start, end }); });
  return S.map((x) => ({ id: x.id, start: x.start, end: x.end }));
};
window.renderFrame = (t) => { const cur = S.find((x) => t >= x.start && t < x.end) ?? S[S.length - 1]; for (const x of S) x.wrap.style.display = x === cur ? "block" : "none"; cur.sc.update(t - cur.start, cur.end - cur.start); const cue = TL.captions.find((c) => t >= c.start && t < c.end); $("#cap").textContent = cue ? cue.text : ""; };
window.textHolds = () => S.flatMap((x) => (x.sc.texts ?? []).map((tx) => ({ scene: x.id, text: tx.text, words: tx.text.split(/\s+/).length, hold: +(x.end - (x.start + tx.at * (x.end - x.start))).toFixed(2) })));
