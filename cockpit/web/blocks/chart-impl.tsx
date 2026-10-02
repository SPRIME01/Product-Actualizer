import React, { useMemo } from "react";
// Order matters: the core entry must evaluate before the React adapter or the bundler hits a module cycle in @tanstack/charts.
import { barY, barX, lineY, dot, ruleY, ruleX, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scalePoint } from "@tanstack/charts/scales/point";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { useSource } from "../store";
import { BlockTitle } from "../ui";
import { ctrlOf, type BP } from "./data";

const toneColor: Record<string, string> = { ok: "var(--ok)", warning: "var(--warn)", danger: "var(--danger)", unknown: "var(--unk)", neutral: "var(--accent)" };

export function ChartImpl({ block, panel }: BP) {
  const b = ctrlOf(panel, block);
  const res = useSource(b.source, { filter: b.filter, sort: b.sort, limit: 200, data: block.data, as: "rows" });
  const hl = new Set<string>((b.highlight ?? []).map(String));
  const def = useMemo(() => {
    if (!res || res.kind !== "rows") return null;
    const rows = (res.rows as any[]).map((r) => ({ ...r }));
    for (const s of block.series) for (const r of rows) r[s.y] = Number(r[s.y]);
    const numericX = rows.length > 0 && rows.every((r) => r[block.x] !== "" && Number.isFinite(Number(r[block.x])));
    if (numericX) for (const r of rows) r[block.x] = Number(r[block.x]);
    const xs = rows.map((r) => String(r[block.x]));
    const marks: any[] = [];
    // Many or long category labels read better as horizontal bars (rank reads top to bottom, labels get room).
    const horizontal = block.kind === "bar" && (xs.some((x) => x.length > 14) || xs.length > 7);
    block.series.forEach((s: any, i: number) => {
      const color = toneColor[s.tone ?? (i === 0 ? "neutral" : "unknown")];
      const fillFor = (r: any) => (hl.has(String(r[block.x])) ? "var(--warn)" : color);
      if (horizontal) marks.push(barX(rows, { y: block.x, x: s.y, inset: 2, fill: fillFor }));
      else if (block.kind === "bar") marks.push(barY(rows, { x: block.x, y: s.y, inset: 2, fill: fillFor }));
      else if (block.kind === "line") marks.push(lineY(rows, { x: block.x, y: s.y, stroke: color, points: true }));
      else marks.push(dot(rows, { x: block.x, y: s.y, fill: fillFor } as any));
    });
    if (block.threshold && horizontal) marks.push(ruleX([block.threshold.value], { stroke: toneColor[block.threshold.tone ?? "danger"], strokeDasharray: "5 4", strokeWidth: 1.5 }));
    else if (block.threshold) marks.push(ruleY([block.threshold.value], { stroke: toneColor[block.threshold.tone ?? "danger"], strokeDasharray: "5 4", strokeWidth: 1.5 }));
    if (horizontal) return defineChart({ marks, scales: { y: { scale: () => scaleBand<string>().domain(xs).padding(0.2), axis: { label: block.x } }, x: { scale: scaleLinear, nice: true, grid: true, axis: { label: block.unit ?? block.series[0]?.label ?? block.series[0]?.y } } } } as any);
    const xScale = block.kind === "bar" ? () => scaleBand<string>().domain(xs).padding(0.2) : block.kind === "line" && !numericX ? () => scalePoint<string>().domain(xs).padding(0.3) : scaleLinear;
    return defineChart({ marks, scales: { x: { scale: xScale as any, axis: { label: block.x } }, y: { scale: scaleLinear, nice: true, grid: true, axis: { label: block.unit ?? block.series[0]?.label ?? block.series[0]?.y } } } } as any);
  }, [res, block, b.highlight]);
  if (!res) return <div className="muted">loading…</div>;
  if (res.kind === "error") return <div className="callout danger">{res.message}</div>;
  return (
    <div>
      <BlockTitle title={block.title} prov={res.provenance} />
      <div className="chart">
        {def ? <Chart definition={def as any} height={block.kind === "bar" && (res.rows?.length ?? 0) > 7 ? 340 : 260} initialWidth={560} ariaLabel={block.title ?? `${block.kind} chart of ${block.series.map((s: any) => s.y).join(", ")} by ${block.x}`} /> : null}
        <div className="legend">
          {block.series.map((s: any, i: number) => <span key={s.y}><i style={{ background: toneColor[s.tone ?? (i === 0 ? "neutral" : "unknown")] }} />{s.label ?? s.y}</span>)}
          {block.threshold ? <span><i style={{ background: toneColor[block.threshold.tone ?? "danger"] }} />{block.threshold.label ?? "limit"} {block.threshold.value}{block.unit ? ` ${block.unit}` : ""}</span> : null}
        </div>
      </div>
    </div>
  );
}

