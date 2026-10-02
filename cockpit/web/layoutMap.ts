// Server topology <-> Dockview. The server's tree (tabs / split with weights) is the single source of truth for arrangement;
// Dockview is the editor and renderer. Both directions are pure so they can be tested without a browser.
export type Node = { t: "tabs"; panels: string[]; active: string } | { t: "split"; dir: "row" | "col"; kids: Node[]; w: number[] };

let gid = 0;
export function toDockview(tree: Node | null, titles: Record<string, string>, width: number, height: number) {
  const panels: Record<string, any> = {};
  // Dockview measures a node's `size` along its parent's axis; a branch's children lie along the branch's own orientation.
  const conv = (n: Node, parentDir: "row" | "col", w: number, h: number): any => {
    const size = Math.max(1, Math.round(parentDir === "row" ? w : h));
    if (n.t === "tabs") {
      for (const p of n.panels) panels[p] = { id: p, contentComponent: "surface", title: titles[p] ?? p };
      return { type: "leaf", size, data: { views: n.panels, activeView: n.active, id: `g${++gid}` } };
    }
    return { type: "branch", size, data: n.kids.map((k, i) => conv(k, n.dir, n.dir === "row" ? w * n.w[i] : w, n.dir === "col" ? h * n.w[i] : h)) };
  };
  if (!tree) return { grid: { root: { type: "branch", data: [], size: height }, width, height, orientation: "HORIZONTAL" }, panels };
  const dir = tree.t === "split" ? tree.dir : "row";
  const kids = tree.t === "split" ? tree.kids.map((k, i) => conv(k, dir, dir === "row" ? width * tree.w[i] : width, dir === "col" ? height * tree.w[i] : height)) : [conv(tree, "row", width, height)];
  return { grid: { root: { type: "branch", size: dir === "row" ? height : width, data: kids }, width, height, orientation: dir === "row" ? "HORIZONTAL" : "VERTICAL" }, panels };
}

// Dockview's serialized layout -> server tree. Weights are the children's share of the parent's size.
export function fromDockview(json: any): Node | null {
  const orient: "row" | "col" = json?.grid?.orientation === "VERTICAL" ? "col" : "row";
  const conv = (n: any, dir: "row" | "col"): Node | null => {
    if (n.type === "leaf") { const v = n.data.views as string[]; return v.length ? { t: "tabs", panels: v, active: v.includes(n.data.activeView) ? n.data.activeView : v[0] } : null; }
    const kids: Node[] = [], sizes: number[] = [];
    for (const c of n.data as any[]) { const k = conv(c, dir === "row" ? "col" : "row"); if (k) { kids.push(k); sizes.push(c.size ?? 1); } }
    if (!kids.length) return null;
    if (kids.length === 1) return kids[0];
    const tot = sizes.reduce((a, b) => a + b, 0) || 1;
    return { t: "split", dir, kids, w: sizes.map((s) => s / tot) };
  };
  return conv(json.grid.root, orient);
}
