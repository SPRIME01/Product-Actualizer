// The hero instrument: the product's own validator (vendor/md.mjs, unmodified) run in the page on a real public artifact from the Loam worked example.
import { parseModel, parseStamp, validateArtifact } from "../vendor/md.mjs";
import { h, getJSON, gradeChip, artifactBody } from "./shared.mjs";

export async function mount(root) {
  const loam = await getJSON("data/loam.json");
  const model = parseModel(loam.model);
  const art = loam.artifacts.find((a) => a.path === "marketing/beta-page.md");
  const stamp = parseStamp(art.text);
  const original = new Map(stamp.cites.map((id) => [id, model.claims.get(id).grade]));
  const down = new Set();
  const live = h("div", { class: "result", role: "status", "aria-live": "polite" });
  const rows = h("div");
  const view = h("div", { class: "artifact", "aria-label": "Artifact text" });
  const gradeOf = (id) => (down.has(id) ? "REPORTED" : model.claims.get(id)?.grade);
  const current = () => ({ ...model, claims: new Map([...model.claims].map(([k, v]) => [k, down.has(k) ? { ...v, grade: "REPORTED" } : v])) });

  function render() {
    rows.replaceChildren(...stamp.cites.map((id) => {
      const c = model.claims.get(id), pressed = down.has(id);
      return h("div", { class: "crow" },
        h("b", {}, id), h("span", { class: "txt" }, c.text), gradeChip(gradeOf(id)),
        h("div", { class: "act" }, h("button", { type: "button", class: "mini", "aria-pressed": String(pressed), onclick: () => { pressed ? down.delete(id) : down.add(id); render(); } },
          pressed ? `Restore ${id} to ${original.get(id)}` : `Downgrade ${id} to REPORTED`)));
    }));
    view.replaceChildren(artifactBody(art.text, gradeOf));
    const errors = validateArtifact(art.text, current(), { lensReads: null });
    live.replaceChildren(...(errors.length
      ? [h("span", { class: "verdict s-invalid" }, "validateArtifact: refused"), h("ul", {}, errors.map((e) => h("li", {}, e)))]
      : [h("span", { class: "verdict s-current" }, "validateArtifact: []"), `accepted. ${stamp.cites.length} citations, each OBSERVED or VERIFIED, public: ${stamp.public}.`]));
  }
  root.append(
    h("p", { class: "stamp" }, `marketing/beta-page.md · built_from: model@${stamp.built} · public: ${stamp.public}`),
    rows, view, live);
  render();
}
