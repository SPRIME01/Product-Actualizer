// A work request's lifecycle, using the cockpit's transition table (cockpit/protocol/work.ts, exported at build) and its refusal messages.
import { h, getJSON } from "./shared.mjs";

// The cockpit's Control.move, reproduced from cockpit/server/control.ts over the exported transition table. website/qa.mjs compares it with the real one.
export const makeMove = ({ terminal, transitions: T }) => {
  const legal = (from, by) => Object.entries(T[from]).filter(([, w]) => w.includes(by)).map(([s]) => s);
  return (cur, to, by) => {
    const owned = `${to} belongs to the owner: an agent can report progress and mark work ready_for_review, but cannot accept, reject, or cancel it`;
    if (by === "agent" && (to === "accepted" || to === "cancelled")) return { ok: false, code: "AUTHORITY_HUMAN", message: owned };
    const who = T[cur][to];
    if (!who) return { ok: false, code: "SCHEMA", message: `R1 is ${cur}; it cannot go to ${to}. ${terminal.includes(cur) ? "It is finished." : `From here: ${[...new Set([...legal(cur, "agent"), ...legal(cur, "human")])].join(", ")}.`}` };
    if (!who.includes(by)) return { ok: false, code: by === "agent" ? "AUTHORITY_HUMAN" : "SCHEMA", message: by === "agent" ? owned : `${to} is reported by the executor, not by the owner` };
    return { ok: true };
  };
};

export async function mount(root) {
  const data = await getJSON("data/lifecycle.json"); const { statuses } = data; const move = makeMove(data);
  let cur = "queued", by = "agent", log = [{ s: "queued", by: "owner" }], msg = null;
  const body = h("div");
  const draw = () => body.replaceChildren(
    h("fieldset", { class: "who" }, h("legend", {}, "Act as"), ["agent", "owner"].map((w) => h("label", { class: "opt" }, h("input", { type: "radio", name: "who", checked: by === w, onchange: () => { by = w; msg = null; draw(); } }), w))),
    h("p", { class: "fine" }, `R1 is ${cur}. Choose a state to move it to.`),
    h("div", { class: "states", role: "group", "aria-label": "Move R1 to" }, statuses.map((s) => h("button", { type: "button", class: "state", "aria-current": String(s === cur), onclick: () => { const r = move(cur, s, by === "owner" ? "human" : "agent"); if (r.ok) { cur = s; log.push({ s, by }); msg = null; } else msg = r; draw(); } }, s))),
    h("div", { class: "result", role: "status", "aria-live": "polite" }, msg ? [h("span", { class: "verdict s-invalid" }, msg.code), msg.message] : h("span", { class: "verdict s-current" }, "ok"), msg ? null : ` R1 is ${cur}.`),
    h("ol", { class: "log" }, log.map((l) => h("li", {}, `${l.s} (${l.by})`))),
    h("button", { type: "button", class: "mini", onclick: () => { cur = "queued"; by = "agent"; log = [{ s: "queued", by: "owner" }]; msg = null; draw(); } }, "Reset"));
  root.append(body); draw();
}
