// Order of work: the engine's wave algorithm (hooks/src/lib/lenses.mjs) over lens front matter generated at build time.
import { h, getJSON } from "./shared.mjs";

const wavesOf = (lenses, selected) => {   // same algorithm as the engine
  const remaining = new Set(selected), done = new Set(), out = [];
  while (remaining.size) {
    const wave = [...remaining].filter((n) => (lenses[n]?.needs ?? []).every((d) => done.has(d) || !selected.includes(d)));
    if (!wave.length) return out;
    wave.sort(); out.push(wave); wave.forEach((n) => { remaining.delete(n); done.add(n); });
  }
  return out;
};
export { wavesOf };

export async function mount(root) {
  const data = await getJSON("data/lenses.json");
  const L = Object.fromEntries(data.lenses.map((l) => [l.name, l]));
  const GATE = "release-readiness";
  let sel = new Set(data.presets["This site's own run"]), focus = null;
  const picks = h("div", { class: "pickers", role: "group", "aria-label": "Goals" }), grid = h("div", { class: "lensgrid" }), out = h("div"), detail = h("div", { class: "layers", "aria-live": "polite" });

  function draw() {
    picks.replaceChildren(...Object.keys(data.presets).map((k) => h("button", { type: "button", class: "mini", "aria-pressed": String(JSON.stringify([...sel].sort()) === JSON.stringify([...data.presets[k]].sort())), onclick: () => { sel = new Set(data.presets[k]); focus = null; draw(); } }, k)));
    grid.replaceChildren(...data.lenses.map((l) => h("label", { class: "opt" }, h("input", { type: "checkbox", checked: sel.has(l.name), disabled: l.name === GATE, onchange: (e) => { e.target.checked ? sel.add(l.name) : sel.delete(l.name); draw(); } }), h("span", {}, l.name, l.name === GATE ? h("span", { class: "why" }, "always selected") : null))));
    const chosen = [...sel], errs = [];
    for (const n of chosen) for (const d of L[n].needs) if (!sel.has(d)) errs.push(`${n} needs ${d}: select it, or pass --satisfied ${d} if the model already has that information`);
    const ws = wavesOf(L, chosen.filter((n) => n !== GATE));
    const col = (title, names) => h("div", { class: "wave" }, h("div", { class: "wave-title" }, title), names.map((n) => h("button", { type: "button", class: "lens", "aria-pressed": String(focus === n), onclick: () => { focus = n; draw(); } }, n, h("small", {}, L[n].needs.length ? `needs ${L[n].needs.join(", ")}` : "no needs"))));
    out.replaceChildren(...[
      errs.length ? h("div", { class: "result", role: "status" }, h("span", { class: "verdict s-invalid" }, "select would refuse"), h("ul", {}, errs.map((e) => h("li", {}, e)))) : null,
      h("div", { class: "wavecols" }, ws.map((w, i) => col(`wave ${i + 1}`, w)), col("gate, always last", [GATE])),
      h("p", { class: "fine" }, "The engine's own list puts release-readiness in wave 1 because it needs nothing; the process forces it to run last.")].filter(Boolean));
    if (focus && L[focus]) {
      const l = L[focus];
      detail.replaceChildren(h("h3", {}, focus), h("p", { class: "fine" }, l.description),
        h("dl", {}, h("dt", {}, "Capability"), h("dd", {}, `${focus}: the kind of judgement work. Reads: ${l.reads.join(", ")}.`),
          h("dt", {}, "Implementation"), h("dd", {}, l.executesWith.length ? `candidates: ${l.executesWith.join(", ")}. Found or unknown is decided on your machine.` : "none declared: the lens procedure itself"),
          h("dt", {}, "Executor"), h("dd", {}, "the current agent by default; the owner may add others")));
    } else detail.replaceChildren(h("p", { class: "fine" }, "Select a lens to see its capability, implementation candidates and executor."));
  }
  root.append(picks, grid, out, detail); draw();
}
