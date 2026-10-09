// The staleness lab: record a decision in a worked example and see, using the product's own functions, which artifacts go stale.
// Two real examples ship: Loam (software and a sensor) and Mote (hardware and physical AI). The check is vendor/md.mjs. The rebuild is simulated:
// in the product a rebuild is a lens run.
import { parseModel, parseStamp, validateArtifact, staleReasons } from "../vendor/md.mjs";
import { h, getJSON } from "./shared.mjs";

const PUBLIC = new Set(["OBSERVED", "VERIFIED"]);
// the claim to downgrade: one that a public artifact cites and that is currently publishable, preferring one other artifacts cite too
function pickClaim(model, arts) {
  const cites = new Map();
  for (const a of arts) { const s = parseStamp(a.text); for (const c of s.cites) { const e = cites.get(c) ?? { pub: false, n: 0 }; e.n++; e.pub ||= s.public; cites.set(c, e); } }
  const ok = [...cites].filter(([id, e]) => e.pub && PUBLIC.has(model.claims.get(id)?.grade)).sort((a, b) => b[1].n - a[1].n || +a[0].slice(1) - +b[0].slice(1));
  return ok[0]?.[0];
}
const addRow = (t, heading, row) => { const i = t.indexOf(heading); if (i < 0) return t; const body = t.slice(i + heading.length); const m = body.search(/\n## /); const end = m < 0 ? t.length : i + heading.length + m; return t.slice(0, end).replace(/\s*$/, "") + "\n" + row + t.slice(end); };

export async function mount(root) {
  const examples = await getJSON("data/examples.json");
  let key = "loam", model, base, chosen, recorded, arts, claimId, decisions;
  const left = h("div"), right = h("div"), pick = h("fieldset", { class: "pickers" });

  function load(k) {
    key = k; const ex = examples[k]; base = parseModel(ex.model); model = base; recorded = null;
    arts = ex.artifacts.map((a) => ({ ...a, refusal: null }));
    claimId = pickClaim(base, arts);
    decisions = [
      { id: "claim", label: `Downgrade claim ${claimId} to REPORTED`, touched: `claims:${claimId}`, text: `${claimId} downgraded to REPORTED; no check was re-run`,
        apply: (t) => t.replace(new RegExp(`^(\\| ${claimId} \\|[^\\n]*\\| )(?:OBSERVED|VERIFIED)( \\|)`, "m"), "$1REPORTED$2") },
      { id: "positioning", label: "Change the positioning", touched: "positioning", text: "Positioning changed (example edit)",
        apply: (t) => t.replace("## Positioning\n\n", "## Positioning\n\nRevised in the lab: a new audience. ") },
      { id: "constraint", label: "Add a legal constraint", touched: "constraints", text: "Legal constraint added (example edit)",
        apply: (t) => (t.includes("**Legal**\n\n") ? t.replace("**Legal**\n\n", "**Legal**\n\n- A license was chosen in the lab (example).\n") : t.replace("## Constraints\n\n", "## Constraints\n\n- A license was chosen in the lab (example).\n")) },
      { id: "unknown", label: "Record a new unknown", touched: "unknowns", text: "Unknown U99 recorded (example edit)", apply: (t) => addRow(t, "## Unknowns", "| U99 | Which retailer sells it? | pricing | owner |") },
    ];
    chosen = decisions[0]; draw();
  }
  function record() {
    let t = examples[key].model.replace(`model_version: ${base.version}`, `model_version: ${base.version + 1}`);
    t = chosen.apply(t);
    const row = `| D${base.decisions.length + 1} | ${chosen.text} | recorded in the lab | ${chosen.touched} | ${base.version + 1} |`;
    t = addRow(t, "## Decision log", row).replace(/\s*$/, "\n");
    model = parseModel(t); recorded = chosen; arts = arts.map((a) => ({ ...a, refusal: null })); draw();
  }
  function reset() { load(key); }
  function rebuild(a, drop) {
    let t = a.text.replace(/built_from: model@\d+/, `built_from: model@${model.version}`);
    if (drop) t = t.replace(new RegExp(`\\[${claimId}\\]`, "g"), "").replace(/^cites: \[(.*)\]$/m, (m, l) => `cites: [${l.split(", ").filter((x) => x !== claimId).join(", ")}]`);
    const errors = validateArtifact(t, model, { lensReads: null, isGate: a.path.endsWith("gate.md") });
    if (errors.length) a.refusal = errors; else { a.text = t; a.refusal = null; }
    draw();
  }
  function status(a) {
    const s = parseStamp(a.text), isGate = a.path.endsWith("gate.md");
    if (isGate) return s.built !== model.version ? { kind: "stale", why: [`gate-stale: built from model@${s.built}; the model is at ${model.version}`] } : { kind: "current", why: [] };
    const st = staleReasons(s, model);
    return st.length ? { kind: "stale", why: [`stale by ${st.join(", ")}`] } : { kind: "current", why: [] };
  }
  function draw() {
    pick.replaceChildren(h("legend", {}, "Worked example"), Object.entries(examples).map(([k, ex]) => h("label", { class: "opt" }, h("input", { type: "radio", name: "ex", value: k, checked: k === key, onchange: () => load(k) }), h("span", {}, ex.label))));
    left.replaceChildren(
      pick,
      h("fieldset", {}, h("legend", {}, "Record a decision"),
        decisions.map((d) => h("label", { class: "opt" }, h("input", { type: "radio", name: "dec", value: d.id, checked: d === chosen, disabled: !!recorded, onchange: () => { chosen = d; } }), h("span", {}, d.label, h("span", { class: "why" }, `touched: ${d.touched}`))))),
      h("div", { class: "act" }, h("button", { type: "button", class: "mini", disabled: !!recorded, onclick: record }, "Record decision"), " ", h("button", { type: "button", class: "mini", onclick: reset }, "Reset")),
      h("p", { class: "fine" }, recorded ? `Model is now at version ${model.version}. Decision D${model.decisions.length} touched ${recorded.touched}.` : `The model is at version ${model.version}. No decision recorded: nothing is stale.`));
    right.replaceChildren(h("table", { class: "tbl" },
      h("thead", {}, h("tr", {}, ["artifact", "built from", "reads", "status"].map((x) => h("th", { scope: "col" }, x)))),
      h("tbody", {}, arts.map((a) => {
        const s = parseStamp(a.text), st = status(a), cites = s.cites.length, buttons = [];
        if (st.kind === "stale") {
          buttons.push(h("button", { type: "button", class: "mini", onclick: () => rebuild(a, false) }, "Rebuild unchanged"));
          if (recorded?.id === "claim" && s.public && s.cites.includes(claimId)) buttons.push(h("button", { type: "button", class: "mini", onclick: () => rebuild(a, true) }, `Rebuild without ${claimId}`));
          buttons.push(h("span", { class: "sim" }, "simulated"));
        }
        return h("tr", { class: `row-${st.kind}` }, h("th", { scope: "row", class: "mono" }, a.path, h("span", { class: "why" }, s.public ? "public" : "internal", cites ? ` · cites ${s.cites.slice(0, 6).join(" ")}${cites > 6 ? " …" : ""}` : "")),
          h("td", { class: "mono", "data-l": "built from" }, `model@${s.built}`), h("td", { class: "mono", "data-l": "reads" }, s.reads.join(", ")),
          h("td", { "data-l": "status" }, h("span", { class: `g s-${st.kind}` }, st.kind), st.why.map((w) => h("span", { class: "why" }, w)),
            a.refusal ? h("div", { class: "result", role: "status" }, h("span", { class: "verdict s-invalid" }, "rebuild refused"), h("ul", {}, a.refusal.map((e) => h("li", {}, e)))) : null,
            h("div", { class: "act" }, buttons)));
      }))));
  }
  root.append(h("div", { class: "lab-grid" }, left, right));
  load("loam");
}
