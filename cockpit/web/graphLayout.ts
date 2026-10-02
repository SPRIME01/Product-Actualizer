// Layered DAG layout for the graph block: longest-path layers, one barycenter sweep to reduce crossings. Cycles are tolerated (back edges ignored).
export function layered(nodes: { id: string }[], edges: { from: string; to: string }[], dir: "LR" | "TB" = "LR", gapX = 230, gapY = 62) {
  const ids = nodes.map((n) => n.id), idx = new Set(ids);
  const out = new Map<string, string[]>(ids.map((i) => [i, []])), inn = new Map<string, string[]>(ids.map((i) => [i, []]));
  const state = new Map<string, number>(); const back = new Set<string>();
  const dfs = (u: string) => { state.set(u, 1); for (const v of out.get(u) ?? []) { if (state.get(v) === 1) back.add(u + ">" + v); else if (!state.get(v)) dfs(v); } state.set(u, 2); };
  for (const e of edges) if (idx.has(e.from) && idx.has(e.to) && e.from !== e.to) out.get(e.from)!.push(e.to);
  for (const i of ids) if (!state.get(i)) dfs(i);
  for (const e of edges) if (idx.has(e.from) && idx.has(e.to) && e.from !== e.to && !back.has(e.from + ">" + e.to)) inn.get(e.to)!.push(e.from);
  const layer = new Map<string, number>();
  const lvl = (u: string): number => { if (layer.has(u)) return layer.get(u)!; layer.set(u, 0); const l = Math.max(-1, ...inn.get(u)!.map(lvl)) + 1; layer.set(u, l); return l; };
  ids.forEach(lvl);
  const byLayer: string[][] = [];
  for (const i of ids) (byLayer[layer.get(i)!] ??= []).push(i);
  const pos = new Map<string, number>();
  byLayer.forEach((L) => L.forEach((id, k) => pos.set(id, k)));
  for (let l = 1; l < byLayer.length; l++) {
    byLayer[l].sort((a, b) => bary(a) - bary(b)); byLayer[l].forEach((id, k) => pos.set(id, k));
  }
  function bary(id: string) { const p = inn.get(id)!; return p.length ? p.reduce((a, q) => a + (pos.get(q) ?? 0), 0) / p.length : pos.get(id) ?? 0; }
  const out2: Record<string, { x: number; y: number }> = {};
  byLayer.forEach((L, l) => L.forEach((id, k) => { out2[id] = dir === "LR" ? { x: l * gapX, y: k * gapY } : { x: k * 190, y: l * (gapY + 18) }; }));
  return out2;
}
