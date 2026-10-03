// Small DOM helpers shared by the demos. No framework.
export const $ = (s, r = document) => r.querySelector(s);
export const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
};
export const getJSON = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); });
export const gradeChip = (g) => h("span", { class: `g g-${g.toLowerCase()}` }, g);
// Render the body of a stamped artifact: skip the stamp header, show [C#] as chips coloured by the claim's current grade.
export function artifactBody(text, gradeOf) {
  const body = text.split("\n\n").slice(1).join("\n\n");
  const frag = document.createDocumentFragment();
  for (const para of body.split(/\n{2,}/)) {
    const p = h("p");
    const clean = para.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/\s*\n\s*/g, " ");
    clean.split(/(\[C\d+\])/).forEach((part) => {
      const m = part.match(/^\[(C\d+)\]$/);
      p.append(m ? h("span", { class: `g g-${(gradeOf(m[1]) ?? "unknown").toLowerCase()}`, title: `${m[1]}: ${gradeOf(m[1])}` }, m[1]) : document.createTextNode(part));
    });
    frag.append(p);
  }
  return frag;
}
