// The staleness lab: record a decision in the Loam worked example and see, using the product's own functions, which artifacts go stale.
// The check is vendor/md.mjs. The rebuild is simulated: in the product it is a lens run.
import { parseModel, parseStamp, validateArtifact, staleReasons } from "../vendor/md.mjs";
import { h, getJSON, gradeChip } from "./shared.mjs";

const DECISIONS = [
  { id: "claim", label: "Downgrade claim C2 to REPORTED", touched: "claims:C2", text: "C2 downgraded to REPORTED; no check was re-run",
    apply: (t) => t.replace(/^(\| C2 \|.*\| )VERIFIED( \|)/m, "$1REPORTED$2") },
  { id: "positioning", label: "Change the positioning", touched: "positioning", text: "Positioning changed (example edit)",
    apply: (t) => t.replace("## Positioning\n\n", "## Positioning\n\nRevised in the lab: Loam now targets greenhouse growers. ") },
  { id: "constraint", label: "Add a legal constraint", touched: "constraints", text: "Legal constraint added (example edit)",
    apply: (t) => t.replace("**Legal**\n\n", "**Legal**\n\n- A license was chosen in the lab (example).\n") },
  { id: "unknown", label: "Record a new unknown", touched: "unknowns", text: "Unknown U99 recorded (example edit)",
    apply: (t) => t.replace("\n## Decision log", "| U99 | Which retailer sells it? | pricing | owner |\n\n## Decision log").replace(/\n\n\| U99/, "\n| U99") },
];

export async function mount(root) {
  const loam = await getJSON("data/loam.json");
  const base = parseModel(loam.model);
  let model = base, chosen = DECISIONS[0], recorded = null;
  let arts = loam.artifacts.map((a) => ({ ...a, text: a.text, refusal: null }));
  const left = h("div"), right = h("div");

  function record() {
    let t = loam.model.replace(`model_version: ${base.version}`, `model_version: ${base.version + 1}`);
    t = chosen.apply(t).replace(/\s*$/, "") + `\n| D${base.decisions.length + 1} | ${chosen.text} | recorded in the lab | ${chosen.touched} | ${base.version + 1} |\n`;
    model = parseModel(t); recorded = chosen; arts = arts.map((a) => ({ ...a, refusal: null })); draw();
  }
  function reset() { model = base; recorded = null; arts = loam.artifacts.map((a) => ({ ...a, refusal: null })); draw(); }
  function rebuild(a, drop) {
    let t = a.text.replace(/built_from: model@\d+/, `built_from: model@${model.version}`);
    if (drop) t = t.replace("[C1][C2]", "[C1]").replace(/^cites: \[(.*)\]$/m, (m, l) => `cites: [${l.split(", ").filter((x) => x !== "C2").join(", ")}]`);
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
    left.replaceChildren(
      h("fieldset", {}, h("legend", {}, "Record a decision"),
        DECISIONS.map((d) => h("label", { class: "opt" }, h("input", { type: "radio", name: "dec", value: d.id, checked: d === chosen, disabled: !!recorded, onchange: () => { chosen = d; } }), h("span", {}, d.label, h("span", { class: "why" }, `touched: ${d.touched}`))))),
      h("div", { class: "act" }, h("button", { type: "button", class: "mini", disabled: !!recorded, onclick: record }, "Record decision"), " ", h("button", { type: "button", class: "mini", onclick: reset }, "Reset")),
      h("p", { class: "fine" }, recorded ? `Model is now at version ${model.version}. Decision D${model.decisions.length} touched ${recorded.touched}.` : `The model is at version ${model.version}. No decision recorded: nothing is stale.`));
    right.replaceChildren(h("table", { class: "tbl" },
      h("thead", {}, h("tr", {}, ["artifact", "built from", "reads", "status"].map((x) => h("th", { scope: "col" }, x)))),
      h("tbody", {}, arts.map((a) => {
        const s = parseStamp(a.text), st = status(a), cites = s.cites.length;
        const buttons = [];
        if (st.kind === "stale") {
          buttons.push(h("button", { type: "button", class: "mini", onclick: () => rebuild(a, false) }, "Rebuild unchanged"));
          if (recorded?.id === "claim" && a.path === "marketing/beta-page.md") buttons.push(h("button", { type: "button", class: "mini", onclick: () => rebuild(a, true) }, "Rebuild without C2"));
          buttons.push(h("span", { class: "sim" }, "simulated"));
        }
        return h("tr", {}, h("th", { scope: "row", class: "mono" }, a.path, h("span", { class: "why" }, s.public ? "public" : "internal", cites ? ` · cites ${s.cites.join(" ")}` : "")),
          h("td", { class: "mono", "data-l": "built from" }, `model@${s.built}`), h("td", { class: "mono", "data-l": "reads" }, s.reads.join(", ")),
          h("td", { "data-l": "status" }, h("span", { class: `g s-${st.kind}` }, st.kind), st.why.map((w) => h("span", { class: "why" }, w)),
            a.refusal ? h("div", { class: "result", role: "status" }, h("span", { class: "verdict s-invalid" }, "rebuild refused"), h("ul", {}, a.refusal.map((e) => h("li", {}, e)))) : null,
            h("div", { class: "act" }, buttons)));
      }))));
  }
  root.append(h("div", { class: "lab-grid" }, left, right), h("p", { class: "fine", "aria-live": "polite" }));
  draw();
}
