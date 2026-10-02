import { test, expect } from "bun:test";
import { toDockview, fromDockview, type Node } from "../../cockpit/web/layoutMap";

const titles = { a: "A", b: "B", c: "C", d: "D" };
const trees: Record<string, Node> = {
  single: { t: "tabs", panels: ["a", "b"], active: "b" },
  row: { t: "split", dir: "row", kids: [{ t: "tabs", panels: ["a"], active: "a" }, { t: "tabs", panels: ["b", "c"], active: "c" }], w: [0.3, 0.7] },
  nested: { t: "split", dir: "row", kids: [{ t: "tabs", panels: ["a"], active: "a" }, { t: "split", dir: "col", kids: [{ t: "tabs", panels: ["b"], active: "b" }, { t: "tabs", panels: ["c"], active: "c" }, { t: "tabs", panels: ["d"], active: "d" }], w: [0.5, 0.25, 0.25] }], w: [0.4, 0.6] },
  col: { t: "split", dir: "col", kids: [{ t: "tabs", panels: ["a"], active: "a" }, { t: "tabs", panels: ["b"], active: "b" }], w: [0.5, 0.5] },
};
const close = (a: Node, b: Node) => {
  if (a.t === "tabs") { expect(b).toMatchObject({ t: "tabs", panels: a.panels, active: a.active }); return; }
  expect(b.t).toBe("split"); const s = b as Extract<Node, { t: "split" }>; expect(s.dir).toBe(a.dir); expect(s.kids.length).toBe(a.kids.length);
  a.w.forEach((w, i) => expect(Math.abs(w - s.w[i])).toBeLessThan(0.01)); a.kids.forEach((k, i) => close(k, s.kids[i]));
};
for (const [name, tree] of Object.entries(trees)) {
  test(`server tree -> dockview -> server tree is lossless: ${name}`, () => {
    const dv = toDockview(tree, titles, 1200, 800);
    const panelIds = Object.keys(dv.panels).sort();
    expect(panelIds).toEqual(JSON.stringify(tree).match(/"[a-d]"/g)!.map((s) => s.replace(/"/g, "")).filter((v, i, x) => x.indexOf(v) === i).sort());
    close(tree, fromDockview(dv)!);
  });
}
test("an empty tree serializes to an empty grid", () => { expect(fromDockview(toDockview(null, {}, 100, 100))).toBeNull(); });
