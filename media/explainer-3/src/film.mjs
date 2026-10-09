// Film 3: a pure function of time. window.renderFrame(t) sets every element's state from t alone; no clock, animation or random source runs.
// Timing comes from cues.mjs (shared with the score); facts come from data.json (tools/build-data.mjs).
import { events } from "./cues.mjs";
const $ = (s, r = document) => r.querySelector(s);
const NS = "http://www.w3.org/2000/svg";
const el = (tag, cls = "", text = "", style = {}) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; Object.assign(e.style, px(style)); return e; };
const px = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "number" && v !== 0 && !["opacity", "fontWeight", "zIndex"].includes(k) ? v + "px" : v]));
const svg = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - Math.pow(2, -10 * x));           // expo out
const inOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, x) => a + (b - a) * x;
const since = (t, t0, d = 0.5) => ease((t - t0) / d);                                  // 0 before t0, eases to 1 over d seconds
const show = (e, v, dy = 14) => { e.style.opacity = String(v); e.style.transform = `translateY(${((1 - v) * dy).toFixed(2)}px)`; };
const typed = (str, t, t0, cps = 26) => str.slice(0, clamp(Math.floor((t - t0) * cps), 0, str.length));
let D, TL, EV, S = [];
const abs = (r, x, y, e) => { e.style.position = "absolute"; e.style.left = x + "px"; e.style.top = y + "px"; r.append(e); return e; };

function robot(w = 260) {
  const s = svg("svg", { viewBox: "0 0 260 230", width: w, height: w * 230 / 260 });
  s.innerHTML = `<line x1="130" y1="6" x2="130" y2="34" stroke="currentColor" stroke-width="6"/><circle cx="130" cy="8" r="9" fill="var(--accent)"/>
  <rect x="20" y="34" width="220" height="170" rx="34" fill="var(--surface-raised)" stroke="currentColor" stroke-width="6"/>
  <circle cx="92" cy="108" r="17" fill="currentColor"/><circle cx="168" cy="108" r="17" fill="currentColor"/><path d="M96 158 Q130 178 164 158" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>`;
  return s;
}

const scenes = {
  board: { texts: [{ text: "customers met by this board: none", ev: () => EV.board.customers }],
    build(r) {
      this.heads = ["to do", "doing", "done"].map((n, i) => abs(r, i * 580, 0, el("div", "k", n, { fontSize: "40px" })));
      this.rule = abs(r, 1160 - 28, 0, el("div", "", "", { width: 2, height: 590, background: "var(--rule)" }));
      this.cards = ["Landing page", "Brand", "Firmware", "Launch"].map((n, i) => { const c = el("div", "card", n); c.append(el("span", "ok", "✓", { position: "absolute", right: 24, fontWeight: 700 })); c.lastChild.style.opacity = "0"; abs(r, 0, 80 + i * 124, c); return c; });
      this.cur = abs(r, 0, 0, el("div", "k", "agent", { border: "2px solid var(--accent)", color: "var(--accent)", borderRadius: "999px", padding: "0 16px", fontSize: "34px", lineHeight: "44px", background: "var(--surface-panel)" }));
      this.cust = abs(r, 0, 610, el("div", "k", "", { fontSize: "44px" })); this.cust.append("customers met by this board: ", el("span", "bad", "0", { fontWeight: 700 }));
    },
    update(s, d, t) {
      this.heads.forEach((h, i) => show(h, since(t, EV.board.land[0] - 1.2 + i * 0.1, 0.4)));
      let last = -1;
      this.cards.forEach((c, i) => { const t0 = EV.board.land[i] - 0.55, p = inOut((t - t0) / 0.55), x = lerp(0, 1160, p); c.style.left = x + "px"; c.style.top = 80 + i * 124 + "px"; c.style.opacity = String(since(t, EV.board.land[0] - 1.1, 0.4)); c.lastChild.style.opacity = String(p >= 1 ? 1 : 0); c.style.borderColor = p >= 1 ? "var(--g-observed)" : "var(--rule)"; if (t >= t0 && p < 1) last = i; if (p >= 1) last = Math.max(last, -2); });
      const act = this.cards.findIndex((c, i) => t >= EV.board.land[i] - 0.55 && t < EV.board.land[i] + 0.45);
      const c = this.cards[Math.max(0, act)], cx = parseFloat(c.style.left);
      this.cur.style.left = cx - 164 + "px"; this.cur.style.top = parseFloat(c.style.top) + 28 + "px"; this.cur.style.opacity = act >= 0 && cx > 190 ? "1" : "0";
      show(this.cust, since(t, EV.board.customers, 0.5));
    } },
  lies: { texts: [0, 1, 2].map((k) => ({ text: ["on the machine that wrote them", "at eight times speed", "from a very satisfied placeholder"][k], ev: () => EV.lies[k].note })),
    build(r) {
      const rows = [["✓ Tests passed.", "on the machine that wrote them"], ["✓ Demo recorded.", "at eight times speed"], ["✓ “Life-changing.” Name Surname, Title.", "from a very satisfied placeholder"]];
      this.rows = rows.map(([a, b], i) => { const row = abs(r, 0, i * 215, el("div", "", "", { width: 1680 })); const A = el("div", "", a, { font: "800 84px/1.1 var(--font-text)", display: "inline-block", position: "relative" }); const strike = el("div", "", "", { position: "absolute", left: 0, top: "52%", height: 6, background: "var(--g-contradicted)", width: 0 }); A.append(strike);
        const B = el("div", "warn mono", "…" + b + ".", { font: "500 46px var(--font-mono)", marginTop: 12 }); row.append(A, B); return { row, A, B, strike }; });
    },
    update(s, d, t) { this.rows.forEach((x, i) => { const ev = EV.lies[i]; show(x.row, since(t, ev.in, 0.45)); x.strike.style.width = x.A.offsetWidth * ease((t - ev.note + 0.1) / 0.35) + "px"; x.A.style.color = t > ev.note ? "var(--ink-3)" : "var(--ink)"; show(x.B, since(t, ev.note, 0.4), 8); }); } },
  gap: { texts: [{ text: "launch week", ev: () => EV.gap.launch }],
    build(r) {
      this.lh = abs(r, 0, 0, el("div", "k", "made: in minutes", { fontSize: "40px" })); this.rh = abs(r, 1060, 0, el("div", "k", "real: in weeks", { fontSize: "40px" }));
      this.fast = abs(r, 0, 80, el("div", "", "", { width: 700, display: "flex", flexWrap: "wrap", gap: "18px" }));
      this.fastChips = ["code", "logo", "render", "copy", "page", "deck"].map((n) => { const c = el("span", "chip", n); this.fast.append(c); return c; });
      this.slow = abs(r, 1060, 80, el("div", "", "", { width: 620, display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }));
      this.slowChips = ["customers", "a unit that powers on", "a supplier who replied"].map((n) => { const c = el("span", "chip", n, { borderStyle: "dashed", fontSize: "40px" }); this.slow.append(c); return c; });
      this.hatch = abs(r, 735, 20, el("div", "", "", { width: 230, height: 470, border: "2px dashed var(--ink-3)", borderRadius: "6px", background: "repeating-linear-gradient(135deg, transparent 0 14px, var(--rule) 14px 16px)" }));
      this.owner = abs(r, 700, 510, el("div", "bad mono", "nobody owns this", { font: "600 46px var(--font-mono)", width: 300, textAlign: "center", lineHeight: "1.2" }));
      this.sticky = abs(r, 610, 240, el("div", "", "launch week", { font: "800 56px/1.1 var(--font-text)", color: "var(--surface-base)", background: "var(--g-inferred)", padding: "18px 26px", borderRadius: "4px", transform: "rotate(-4deg)" }));
    },
    update(s, d, t) { show(this.lh, since(t, EV.gap.fast - 0.6, 0.4)); show(this.rh, since(t, EV.gap.slow - 0.5, 0.4));
      this.fastChips.forEach((c, i) => show(c, since(t, EV.gap.fast + i * 0.13, 0.25), 8)); this.slowChips.forEach((c, i) => show(c, since(t, EV.gap.slow + i * 0.7, 0.5), 10));
      this.hatch.style.opacity = String(since(t, EV.gap.slow - 0.3, 0.6)); show(this.owner, since(t, EV.gap.owner, 0.4), 8);
      const p = since(t, EV.gap.launch, 0.3); this.sticky.style.opacity = String(p); this.sticky.style.transform = `rotate(-4deg) scale(${(1.25 - 0.25 * p).toFixed(3)})`; } },
  drop: { texts: [{ text: "render: passed", ev: () => TL.lines[3].start + 0.5 }, { text: "drop test: cracked", ev: () => EV.drop.crash + 0.05 }],
    build(r) {
      this.lp = abs(r, 0, 0, el("div", "k", "render.png")); this.rp = abs(r, 920, 0, el("div", "k", "the unit, on a desk"));
      this.r1 = abs(r, 250, 70, el("div", "", "", { color: "var(--ink)" })); this.r1.append(robot(280));
      this.lv = abs(r, 0, 600, el("div", "ok mono", "render: passed ✓", { font: "700 56px var(--font-mono)" }));
      this.ledge = abs(r, 920, 300, el("div", "", "", { width: 460, height: 6, background: "var(--ink-3)" }));
      this.u1 = abs(r, 1160, 70, el("div", "", "", { transformOrigin: "50% 100%", color: "var(--ink)" })); this.u1.append(robot(280));
      this.uA = abs(r, 1160, 70, el("div", "", "", { clipPath: "inset(0 50% 0 0)", opacity: 0, color: "var(--ink)", transformOrigin: "50% 100%" })); this.uA.append(robot(280));
      this.uB = abs(r, 1160, 70, el("div", "", "", { clipPath: "inset(0 0 0 50%)", opacity: 0, color: "var(--ink)", transformOrigin: "50% 100%" })); this.uB.append(robot(280));
      this.rv = abs(r, 920, 600, el("div", "bad mono", "drop test: cracked", { font: "700 56px var(--font-mono)" }));
      this.floor = abs(r, 920, 520, el("div", "", "", { width: 760, height: 2, background: "var(--rule)" }));
    },
    update(s, d, t) { show(this.lp, since(t, TL.lines[3].start - 0.2, 0.4)); show(this.rp, since(t, TL.lines[3].start - 0.1, 0.4)); show(this.lv, since(t, TL.lines[3].start + 0.5, 0.4));
      this.r1.style.opacity = String(since(t, TL.lines[3].start - 0.2, 0.4)); this.r1.style.transform = `translateY(${(Math.sin(t * 2.2) * 5).toFixed(2)}px)`;
      this.ledge.style.opacity = String(since(t, TL.lines[3].start - 0.1, 0.4)); this.floor.style.opacity = this.ledge.style.opacity;
      const f = EV.drop.fall, c = EV.drop.crash, g = clamp((t - f) / (c - f)), cr = t >= c;
      this.u1.style.opacity = String(cr ? 0 : since(t, TL.lines[3].start - 0.1, 0.4)); this.u1.style.top = (t < f ? 70 : 70 + g * g * 220) + "px"; this.u1.style.transform = `translateX(${(g * 50).toFixed(1)}px) rotate(${(g * 16).toFixed(2)}deg)`;
      const k = clamp((t - c) / 0.5), ek = ease(k);
      for (const [e, sign] of [[this.uA, -1], [this.uB, 1]]) { e.style.opacity = cr ? "1" : "0"; e.style.top = 290 + "px"; e.style.transform = `translateX(${(50 + sign * 26 * ek).toFixed(1)}px) rotate(${(16 + sign * 9 * ek).toFixed(1)}deg)`; }
      show(this.rv, since(t, c + 0.05, 0.3), 8); } },
  plot: { texts: [{ text: "your product, in the real world", ev: () => EV.plot.nodes }, { text: "model@N, N claims", ev: () => EV.plot.model }],
    build(r) {
      this.W = 1680; this.H = 690; this.cx = 840; this.cy = 335;
      this.names = ["agents", "tools", "suppliers", "testers", "brand", "site", "firmware", "renders"];
      this.scatter = [[190, 95], [700, 45], [1250, 105], [1500, 335], [1370, 600], [800, 640], [220, 560], [160, 330]];
      this.ring = this.names.map((_, k) => { const a = (-90 + k * 45) * Math.PI / 180; return [this.cx + 640 * Math.cos(a), this.cy + 265 * Math.sin(a)]; });
      this.svg = svg("svg", { width: this.W, height: this.H, viewBox: `0 0 ${this.W} ${this.H}` }); this.svg.style.cssText = "position:absolute;left:0;top:0"; r.append(this.svg);
      this.strings = this.names.map(() => { const p = svg("path", { fill: "none", "stroke-width": 3, "stroke-linecap": "round" }); this.svg.append(p); return p; });
      this.cross = this.names.map(() => { const p = svg("path", { fill: "none", "stroke-width": 2, "stroke-linecap": "round", stroke: "var(--g-contradicted)" }); this.svg.append(p); return p; });
      this.nodes = this.names.map((n) => { const e = el("div", "node", n); r.append(e); return e; });
      this.dest = abs(r, this.cx - 360, this.cy - 100, el("div", "k", "your product, in the real world", { width: 720, height: 200, border: "3px dashed var(--ink-3)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "42px", padding: "0 30px", lineHeight: "1.2", background: "var(--surface-panel)" }));
      this.model = abs(r, this.cx - 390, this.cy - 135, el("div", "", "", { width: 780, height: 270, border: "3px solid var(--accent)", borderRadius: "10px", background: "var(--surface-panel)", padding: "26px 40px" }));
      this.model.append(el("div", "acc mono", `model@${D.modelVersion}`, { font: "700 70px var(--font-mono)" }), el("div", "", `${D.claimCount} claims`, { font: "700 56px var(--font-text)", marginTop: 12 }), el("div", "k", "each graded, each with a source", { fontSize: "36px", marginTop: 8 }));
    },
    update(s, d, t) {
      const P = EV.plot, pin = inOut((t - P.pin) / 0.9), chaos = 1 - pin, sag = (i) => (i % 2 ? 1 : -1) * 110 * chaos;
      const pos = this.names.map((_, i) => [lerp(this.scatter[i][0], this.ring[i][0], pin), lerp(this.scatter[i][1], this.ring[i][1], pin)]);
      this.nodes.forEach((n, i) => { n.style.left = pos[i][0] + "px"; n.style.top = pos[i][1] + "px"; n.style.opacity = String(since(t, P.nodes + i * 0.12, 0.4)); n.style.borderColor = t > P.model ? "var(--accent)" : "var(--ink-3)"; });
      const mod = t >= P.model;
      this.dest.style.opacity = String(since(t, P.nodes, 0.5) * (mod ? 0 : 1)); this.model.style.opacity = String(since(t, P.model, 0.45)); this.model.style.display = t < P.model ? "none" : "block"; this.dest.style.display = mod ? "none" : "block"; this.model.style.transform = `scale(${(0.96 + 0.04 * since(t, P.model, 0.45)).toFixed(3)})`;
      this.strings.forEach((p, i) => { const [x, y] = pos[i], mx = (x + this.cx) / 2 + sag(i) * 0.6, my = (y + this.cy) / 2 + sag(i); p.setAttribute("d", `M${x.toFixed(1)} ${y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${this.cx} ${this.cy}`);
        p.setAttribute("stroke", mod ? "var(--accent)" : "var(--ink-3)"); p.setAttribute("stroke-dasharray", mod ? "14 12" : "0"); p.setAttribute("stroke-dashoffset", mod ? String(-(t - P.model) * 60) : "0"); p.style.opacity = String(since(t, P.tangle - 0.4 + i * 0.1, 0.5)); });
      this.cross.forEach((p, i) => { const j = (i + 3) % 8, [x, y] = pos[i], [x2, y2] = pos[j]; p.setAttribute("d", `M${x.toFixed(1)} ${y.toFixed(1)} Q${((x + x2) / 2 + 80 * chaos).toFixed(1)} ${((y + y2) / 2 - 70 * chaos).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`); p.style.opacity = String(0.55 * clamp(chaos) * since(t, P.tangle, 0.6) * (i < 5 ? 1 : 0)); });
    } },
  compare: { texts: [{ text: "Says who?", ev: () => EV.compare.q[0] }, { text: "a source you can re-open", ev: () => EV.compare.ours[0] }, { text: "you", ev: () => EV.compare.ours[2] }],
    build(r) {
      const cols = [0, 540, 1040];
      this.wash = abs(r, 1020, -10, el("div", "", "", { width: 660, height: 650, background: "var(--accent-wash)", borderRadius: "10px", opacity: 0 }));
      this.heads = ["the question", "the usual answer", "product actualizer"].map((n, i) => abs(r, cols[i] + (i === 2 ? 20 : 0), 0, el("div", "k", n, { color: i === 2 ? "var(--accent)" : "var(--ink-3)" })));
      const rows = [["Says who?", "“Trust me.”", "a source you can re‑open"], ["On the real unit?", "“On the render.”", "a gate that checks the unit"], ["Who decides it’s done?", "“Whatever did the work.”", "you"]];
      this.rows = rows.map(([q, u, o], i) => { const y = 80 + i * 190, line = abs(r, 0, y - 10, el("div", "", "", { width: 1680, height: 2, background: "var(--rule)" }));
        const Q = abs(r, cols[0], y + 16, el("div", "", q, { font: "800 56px/1.1 var(--font-text)", width: 500 })), U = abs(r, cols[1], y + 22, el("div", "", u, { font: "500 50px/1.15 var(--font-text)", color: "var(--ink-3)", width: 480 })), O = abs(r, cols[2] + 20, y + 16, el("div", "acc", o, { font: "800 56px/1.1 var(--font-text)", width: 620 })); return { line, Q, U, O }; });
    },
    update(s, d, t) { const C = EV.compare; const w0 = C.ours[0] - 0.7; this.wash.style.opacity = String(since(t, w0, 0.8)); this.heads.forEach((h, i) => show(h, since(t, i === 2 ? w0 : C.q[0] - 0.5 + i * 0.12, 0.4)));
      this.rows.forEach((x, i) => { x.line.style.opacity = String(since(t, C.q[i] - 0.1, 0.4)); show(x.Q, since(t, C.q[i], 0.4)); show(x.U, since(t, C.usual[i], 0.4)); show(x.O, since(t, C.ours[i], 0.45), 10); }); } },
  refusal: { texts: [{ text: "AUTHORITY_HUMAN", ev: () => EV.refusal.declined }],
    build(r) {
      this.term = abs(r, 0, 0, el("div", "", "", { width: 1680, height: 640, border: "2px solid var(--rule)", borderRadius: "10px", background: "var(--surface-panel)", padding: "34px 48px", font: "500 46px/1.3 var(--font-mono)" }));
      this.a = el("div", "", "", { color: "var(--ink)" }); this.err = el("div", "bad", "AUTHORITY_HUMAN", { font: "800 72px var(--font-mono)", marginTop: 26 }); this.msg = el("div", "", D.authorityMessage.replace(/^AUTHORITY_HUMAN: /, ""), { font: "400 40px/1.35 var(--font-mono)", color: "var(--ink-2)", marginTop: 18, maxWidth: 1560 });
      this.o = el("div", "", "", { marginTop: 34, color: "var(--ink)" }); this.okk = el("div", "ok", "R1 accepted", { font: "700 52px var(--font-mono)", marginTop: 8 });
      this.term.append(this.a, this.err, this.msg, this.o, this.okk);
    },
    update(s, d, t) { const R = EV.refusal; this.term.style.opacity = String(since(t, TL.lines[6].start - 0.15, 0.4));
      this.a.textContent = (this.a.dataset.k = "agent> ") + typed("accept R1", t, R.agent, 12); show(this.err, since(t, R.declined, 0.2), 6); show(this.msg, since(t, R.declined + 0.35, 0.4), 6);
      this.o.textContent = t < R.owner ? "" : "owner> " + typed("accept R1", t, R.owner, 14); show(this.okk, since(t, R.owner + 0.9, 0.3), 6);
      this.o.style.opacity = String(t < R.owner ? 0 : 1); } },
  end: { texts: [{ text: "Finish the product. Show the evidence.", ev: () => EV.end.tag }],
    build(r) { this.top = abs(r, 0, 80, el("div", "", "", { display: "flex", alignItems: "center", gap: "52px" })); this.m = el("img", "", "", { width: 200, height: 200 }); this.m.src = "../../../brand/logo/mark-dark.svg"; this.w = el("div", "", "Product Actualizer", { font: "800 132px var(--font-text)" }); this.top.append(this.m, this.w);
      this.t = abs(r, 0, 380, el("div", "", D.tagline, { font: "700 88px/1.1 var(--font-text)", maxWidth: 1600 })); this.c = abs(r, 0, 560, el("div", "k", D.cta, { fontSize: "36px" })); },
    update(s, d, t) { show(this.top, since(t, EV.end.mark, 0.5)); show(this.t, since(t, EV.end.tag, 0.5)); show(this.c, since(t, EV.end.cta, 0.5)); } },
};
const ORDER = ["board", "lies", "gap", "drop", "plot", "compare", "refusal", "end"];
window.initFilm = (data, timeline, captions = true) => {
  D = data; TL = timeline; EV = events(TL).e; $("#stamp").textContent = `built_from: model@${D.modelVersion}`; $("#cap").classList.toggle("off", !captions);
  const root = $("#scene"); root.replaceChildren(); S = [];
  ORDER.forEach((id, i) => { const sc = scenes[id]; const wrap = el("div", "abs", "", { inset: 0 }); root.append(wrap); sc.build(wrap); const start = i === 0 ? 0 : TL.lines[i].start - 0.2; const end = i + 1 < ORDER.length ? TL.lines[i + 1].start - 0.2 : TL.total; S.push({ id, sc, wrap, start, end }); });
  return S.map((x) => ({ id: x.id, start: x.start, end: x.end }));
};
window.renderFrame = (t) => { const cur = S.find((x) => t >= x.start && t < x.end) ?? S[S.length - 1]; for (const x of S) x.wrap.style.display = x === cur ? "block" : "none";
  cur.sc.update(t - cur.start, cur.end - cur.start, t); const last = cur === S[S.length - 1], first = cur === S[0];
  cur.wrap.style.opacity = String((first ? 1 : clamp((t - cur.start) / 0.25)) * (last ? 1 : clamp((cur.end - t) / 0.2)));
  const cue = TL.captions.find((c) => t >= c.start && t < c.end); $("#cap").textContent = cue ? cue.text : ""; };
window.textHolds = () => S.flatMap((x) => (x.sc.texts ?? []).map((tx) => ({ scene: x.id, text: tx.text, words: tx.text.split(/\s+/).length, hold: +(x.end - tx.ev()).toFixed(2) })));
