import React, { useMemo } from "react";
import { ReactFlow, Background, Controls, MarkerType, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useSource, send } from "../store";
import { BlockTitle, openRef } from "../ui";
import { layered } from "../graphLayout";
import { type BP } from "./data";

const toneColor: Record<string, string> = { ok: "var(--ok)", warning: "var(--warn)", danger: "var(--danger)", unknown: "var(--unk)", neutral: "var(--accent)" };

const nodeStyle = (tone?: string, focus?: boolean): React.CSSProperties => ({
  background: "var(--panel)", color: "var(--ink)", border: `1.5px solid ${tone ? toneColor[tone] ?? "var(--line)" : "var(--line)"}`, borderRadius: 5, padding: "4px 8px", fontSize: 11.5, width: "auto", minWidth: 90, boxShadow: focus ? "0 0 0 2px var(--accent)" : undefined,
});

export function GraphImpl({ block, panel }: BP) {
  const res = useSource(block.source, { as: "graph" });
  const g = block.source ? res : { kind: "graph", provenance: "agent", nodes: block.nodes ?? [], edges: block.edges ?? [] };
  const { nodes, edges } = useMemo(() => {
    if (!g || g.kind !== "graph") return { nodes: [] as Node[], edges: [] as Edge[] };
    const pos = layered(g.nodes, g.edges, block.direction ?? "LR");
    const selected = panel.selection[block.id] ?? block.focus;
    return {
      nodes: g.nodes.map((n: any) => ({ id: n.id, position: pos[n.id] ?? { x: 0, y: 0 }, data: { label: <span title={n.detail}>{n.label ?? n.id}</span>, ref: n.ref }, style: nodeStyle(n.tone, !!n.ref && n.ref === selected), sourcePosition: (block.direction === "TB" ? "bottom" : "right") as any, targetPosition: (block.direction === "TB" ? "top" : "left") as any })) as Node[],
      edges: g.edges.map((e: any, i: number) => ({ id: `e${i}`, source: e.from, target: e.to, label: e.label, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: e.tone ? toneColor[e.tone] : "var(--ink-3)" }, labelStyle: { fontSize: 10, fill: "var(--ink-3)" }, labelBgStyle: { fill: "var(--panel-2)" } })) as Edge[],
    };
  }, [g, block.direction, panel.selection[block.id], block.focus]);
  if (!g) return <div className="muted">loading…</div>;
  if (g.kind === "error") return <div className="callout danger">{g.message}</div>;
  if (!nodes.length) return <div className="muted">nothing to graph yet</div>;
  return (
    <div>
      <BlockTitle title={block.title} prov={g.provenance} />
      <div className="graph" role="img" aria-label={`${block.title ?? "graph"}: ${nodes.length} nodes, ${edges.length} edges`}>
        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.15 }} nodesDraggable={false} nodesConnectable={false} proOptions={{ hideAttribution: true }} minZoom={0.2}
          onNodeClick={(_, n) => { const r = (n.data as any).ref; if (r) { send({ op: "human.select", surface: panel.id, block: block.id, ref: r }); openRef(r); } }}>
          <Background gap={18} color="var(--line-soft)" /><Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
