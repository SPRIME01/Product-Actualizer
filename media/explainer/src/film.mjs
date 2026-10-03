// The explainer, as a pure function of time: window.renderFrame(t) sets every element's state from t alone.
// No animation, clock, or random source runs; the renderer steps t frame by frame. Facts come from data.json (build-data.mjs).
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls = "", text = "", style = {}) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; for (const [k, v] of Object.entries(style)) e.style[k] = typeof v === "number" && v !== 0 && !["opacity", "fontWeight", "zIndex"].includes(k) ? v + "px" : v; return e; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - Math.pow(2, -10 * x));          // exponential ease-out
const rev = (s, at, d = 0.45) => ease(clamp((s - at) / d));                            // 0..1 reveal that starts at `at` seconds into the scene
const show = (e, v, dy = 10) => { e.style.opacity = String(v); e.style.transform = `translateY(${((1 - v) * dy).toFixed(2)}px)`; };
let D, TL, S = [], holds = [];

function chipEl(grade) { const c = el("span", `g g-${grade.toLowerCase()}`, grade); return c; }

// each scene: build(root) once; update(s, dur) sets state; texts = [{text, at}] for the text-hold check (at = fraction of the scene when it appears)
const scenes = {
  report: { texts: [{ text: "The launch page is ready.", at: 0.05 }],
    build(r) { this.k = el("div", "k abs", "agent report", { left: 0, top: 50 }); this.t = el("div", "abs", "The launch page is ready.", { left: 0, top: 130, font: "800 150px/1.04 var(--font-text)", width: 1600 });
      this.c = el("div", "abs", "", { left: 0, top: 480, display: "flex", gap: "28px", alignItems: "center" }); this.c.append(chipEl("UNKNOWN"), el("span", "k", "source: none")); r.append(this.k, this.t, this.c); },
    update(s) { show(this.k, rev(s, 0, 0.3)); show(this.t, rev(s, 0, 0.5)); show(this.c, rev(s, 1.6)); } },
  quote1: { quote: true, texts: [{ text: "The bottleneck isn't building anymore. It's completing.", at: 0.05 }, { text: "DEV Community, 2026-09-27", at: 0.3 }] },
  quote2: { quote: true, texts: [{ text: "Instructions are not guarantees.", at: 0.05 }, { text: "A Show HN post, 2026-06-16", at: 0.3 }] },
  ledger: { texts: [{ text: "seven grades; public copy may use two", at: 0.6 }],
    build(r) { this.rows = ["C18", "C9"].map((id) => { const c = D.claims[id]; const row = el("div", "", "", { display: "grid", gridTemplateColumns: "110px 1fr 300px", gap: "28px", alignItems: "start", borderTop: "2px solid var(--rule)", padding: "22px 0 24px" });
        const body = el("div"); body.append(el("div", "", c.text, { font: "500 54px/1.18 var(--font-text)" }), el("div", "mono", "source: " + c.source.split(";")[0], { font: "400 34px var(--font-mono)", color: "var(--ink-3)", marginTop: "10px", overflowWrap: "anywhere" }));
        row.append(el("div", "mono", id, { font: "600 42px var(--font-mono)", color: "var(--ink-2)" }), body, chipEl(c.grade)); r.append(row); return row; });
      this.foot = el("div", "", "", { marginTop: "36px" }); this.sl = el("div", "k", "seven grades; public copy may use two", { marginBottom: "16px" }); this.strip = el("div", "", "", { display: "flex", gap: "16px", flexWrap: "wrap" }); D.grades.forEach((g) => this.strip.append(chipEl(g))); this.foot.append(this.sl, this.strip); r.append(this.foot); },
    update(s, d) { this.rows.forEach((row, i) => show(row, rev(s, 0 + i * d * 0.12))); show(this.foot, rev(s, d * 0.55)); } },
  refusal: { texts: [{ text: "A public artifact that cites a claim graded below OBSERVED is rejected.", at: 0.1 }, { text: "validateArtifact: refused", at: 0.55 }],
    build(r) { this.p = el("div", "panel abs", "", { left: 0, top: 10, width: 1680, height: 660, padding: "30px 48px" });
      this.h = el("div", "k", D.copyStamp, { fontSize: "32px" }); this.l = el("div", "", "", { font: "600 58px/1.22 var(--font-text)", marginTop: "28px" }); this.l.append(document.createTextNode(D.copyLine + " "), (this.chip = chipEl("VERIFIED")));
      this.v = el("div", "", "", { marginTop: "36px", font: "500 38px/1.35 var(--font-mono)", border: "2px solid var(--rule)", borderRadius: "6px", padding: "22px 28px", background: "var(--surface-raised)" }); this.vt = el("div", "bad", "validateArtifact: refused", { fontWeight: 700 }); this.vm = el("div", "", D.validatorRefusal, { marginTop: "8px", color: "var(--ink)" }); this.v.append(this.vt, this.vm);
      this.p.append(this.h, this.l, this.v); r.append(this.p); },
    update(s, d) { show(this.p, rev(s, 0, 0.4)); const flip = s > d * 0.38; this.chip.textContent = flip ? "REPORTED" : "VERIFIED"; this.chip.className = `g g-${flip ? "reported" : "verified"}`; show(this.v, rev(s, d * 0.55)); } },
  stale: { texts: [{ text: "stale by D11", at: 0.5 }],
    build(r) { this.rows = D.stale.artifacts.map((a) => { const row = el("div", "", "", { borderTop: "2px solid var(--rule)", padding: "12px 0 14px" });
        const st = el("div", "mono", "", { font: "500 38px var(--font-mono)", marginTop: "4px" }); row.append(el("div", "mono", a, { font: "600 44px var(--font-mono)" }), st); row._st = st; r.append(row); return row; });
      this.dec = el("div", "panel abs", `${D.stale.decision} touched ${D.stale.touched}. The model is now at model@${D.stale.to}.`, { left: 0, top: 540, width: 1680, padding: "20px 30px", font: "500 40px/1.25 var(--font-text)" }); r.append(this.dec); },
    update(s, d) { this.rows.forEach((row, i) => show(row, rev(s, i * 0.12, 0.3))); const f = s > d * 0.5; show(this.dec, rev(s, d * 0.34));
      this.rows.forEach((row) => { row._st.textContent = f ? `built_from: model@${D.stale.from}  stale by ${D.stale.decision}` : `built_from: model@${D.stale.from}  current`; row._st.className = "mono " + (f ? "stale" : "ok"); }); } },
  waves: { texts: [{ text: "release-readiness, always last", at: 0.8 }],
    build(r) { this.rowsEl = D.waves.map((w, i) => { const row = el("div", "", "", { display: "flex", alignItems: "baseline", gap: "24px", borderTop: "2px solid var(--rule-soft)", padding: "14px 0 4px" });
        const names = w.filter((n) => n !== "release-readiness"); row.append(el("span", "k", `${i + 1}`, { width: "90px" })); const box = el("div"); names.forEach((n) => box.append(el("span", "lens", n))); row.append(box); r.append(row); return row; });
      this.gate = el("div", "", "", { display: "flex", alignItems: "baseline", gap: "24px", borderTop: "2px solid var(--rule)", padding: "14px 0 4px" }); this.gate.append(el("span", "k", "gate", { width: "90px" }), el("span", "lens", "release-readiness"), el("span", "k", "always last")); r.append(this.gate);
      this.ex = el("div", "k abs", `found: ${D.executors.found}   unknown: ${D.executors.unknown.join(", ")}`, { left: 0, top: 640, fontSize: "34px" }); r.append(this.ex); },
    update(s, d) { this.rowsEl.forEach((c, i) => show(c, rev(s, d * (i * 0.15), 0.3))); show(this.gate, rev(s, d * 0.75)); show(this.ex, rev(s, d * 0.85)); } },
  authority: { texts: [{ text: "AUTHORITY_HUMAN", at: 0.6 }],
    build(r) { this.row = el("div", "abs", "", { left: 0, top: 40, display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }); this.chips = D.lifecycle.map((st) => { const c = el("span", "mono", st, { font: "500 40px var(--font-mono)", border: "2px solid var(--rule)", borderRadius: "6px", padding: "10px 16px", background: "var(--surface-raised)" }); this.row.append(c); return c; });
      this.roles = el("div", "k abs", "the agent reports these; the owner accepts", { left: 0, top: 190 });
      this.msg = el("div", "abs", "", { left: 0, top: 300, width: 1680, border: "3px solid var(--g-contradicted)", borderRadius: "8px", padding: "26px 32px", font: "500 40px/1.35 var(--font-mono)", background: "var(--surface-panel)" }); this.msg.append(el("div", "bad", "agent: accepted", { fontWeight: 700, marginBottom: "8px" }), el("div", "", D.authorityMessage)); r.append(this.row, this.roles, this.msg); },
    update(s, d) { this.chips.forEach((c, i) => { show(c, rev(s, i * 0.35 * (d / 8), 0.3), 6); }); show(this.roles, rev(s, d * 0.5)); show(this.msg, rev(s, d * 0.62)); } },
  gate: { texts: [{ text: "Gate blocked", at: 0 }],
    build(r) { this.p = el("div", "panel abs", "", { left: 0, top: 10, width: 1680, padding: "28px 48px" }); this.h = el("div", "", `Gate blocked (${D.gate.count}), a snapshot of this run`, { font: "800 72px var(--font-text)", marginBottom: "14px" }); this.ls = D.gate.reasons.map((x) => el("div", "", x, { font: "500 44px/1.25 var(--font-text)", padding: "8px 0", borderTop: "2px solid var(--rule-soft)" })); this.p.append(this.h, ...this.ls); r.append(this.p); },
    update(s, d) { show(this.p, rev(s, 0, 0.4)); this.ls.forEach((l, i) => show(l, rev(s, d * (0.22 + i * 0.09)))); } },
  end: { texts: [{ text: "Finish the product. Show the evidence.", at: 0.3 }],
    build(r) { this.m = el("img", "abs", "", { left: 0, top: 30, width: 200, height: 200 }); this.m.src = "../../../brand/logo/mark.svg"; this.w = el("div", "abs", "Product Actualizer", { left: 260, top: 60, font: "800 130px var(--font-text)" }); this.t = el("div", "abs", D.tagline, { left: 0, top: 310, font: "700 84px/1.1 var(--font-text)", width: 1600 }); this.c = el("div", "k abs", D.cta, { left: 0, top: 540, fontSize: "42px" }); r.append(this.m, this.w, this.t, this.c); },
    update(s) { show(this.m, rev(s, 0, 0.4)); show(this.w, rev(s, 0.1, 0.4)); show(this.t, rev(s, 0.9)); show(this.c, rev(s, 1.6)); } },
};
function quoteBuild(sc, q, src) { return function (r) { this.q = el("div", "abs", "“" + q + "”", { left: 0, top: 80, width: 1560, font: "700 104px/1.08 var(--font-text)" }); this.s = el("div", "k abs", src, { left: 0, top: 500 }); r.append(this.q, this.s); }; }
scenes.quote1.build = quoteBuild(scenes.quote1, D_q(1)[0], D_q(1)[1]); scenes.quote2.build = quoteBuild(scenes.quote2, D_q(2)[0], D_q(2)[1]);
scenes.quote1.update = scenes.quote2.update = function (s) { show(this.q, rev(s, 0, 0.5)); show(this.s, rev(s, 1.4)); };
function D_q(n) { return n === 1 ? ["The bottleneck isn't building anymore. It's completing.", "DEV Community, 2026-09-27"] : ["Instructions are not guarantees.", "A Show HN post, 2026-06-16"]; }

const ORDER = ["report", "quote1", "quote2", "ledger", "refusal", "stale", "waves", "authority", "gate", "end"];
window.initFilm = (data, timeline, captions = true) => {
  D = data; TL = timeline; $("#stamp").textContent = `built_from: model@${D.modelVersion}`; $("#cap").classList.toggle("off", !captions);
  const root = $("#scene"); root.replaceChildren(); S = [];
  ORDER.forEach((id, i) => { const sc = scenes[id]; const wrap = el("div", "abs", "", { inset: 0 }); root.append(wrap); sc.build(wrap); const line = TL.lines[i]; const start = i === 0 ? 0 : TL.lines[i].start - 0.2; const end = i + 1 < ORDER.length ? TL.lines[i + 1].start - 0.2 : TL.total; S.push({ id, sc, wrap, start, end }); });
  return S.map((x) => ({ id: x.id, start: x.start, end: x.end }));
};
window.renderFrame = (t) => {
  let cur = S.find((x) => t >= x.start && t < x.end) ?? S[S.length - 1];
  for (const x of S) x.wrap.style.display = x === cur ? "block" : "none";
  cur.sc.update(t - cur.start, cur.end - cur.start);
  const cue = TL.captions.find((c) => t >= c.start && t < c.end); $("#cap").textContent = cue ? cue.text : "";
};
window.textHolds = () => S.flatMap((x) => (x.sc.texts ?? []).map((tx) => ({ scene: x.id, text: tx.text, words: tx.text.split(/\s+/).length, hold: +(x.end - (x.start + tx.at * (x.end - x.start))).toFixed(2) })));
