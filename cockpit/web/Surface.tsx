// The renderer: a closed registry from block type to component. A type that is not here cannot be drawn; the server's schema never lets one through.
import React from "react";
import { useStore, type Panel } from "./store";
import { TableBlock, TreeBlock, TimelineBlock } from "./blocks/data";
import { MetricBlock, CalloutBlock, ProgressBlock, ChartBlock, GraphBlock } from "./blocks/viz";
import { CompareBlock, MediaBlock, DocumentBlock, EntityBlock } from "./blocks/read";
import { AskBlock, FormBlock, PreflightBlock } from "./blocks/ask";
import { RichText } from "./ui";
import { worldOfSource, mergeViewing, bannerOf } from "../protocol/world";

export const REGISTRY: Record<string, React.ComponentType<{ block: any; panel: Panel }>> = {
  metric: MetricBlock, callout: CalloutBlock, table: TableBlock, tree: TreeBlock, timeline: TimelineBlock, graph: GraphBlock, chart: ChartBlock,
  compare: CompareBlock, media: MediaBlock, document: DocumentBlock, entity: EntityBlock, preflight: PreflightBlock, progress: ProgressBlock, ask: AskBlock, form: FormBlock,
};

class Boundary extends React.Component<{ name: string; children: React.ReactNode }, { err?: string }> {
  state: { err?: string } = {};
  static getDerivedStateFromError(e: Error) { return { err: e.message }; }
  render() { return this.state.err ? <div className="callout danger" role="alert">The {this.props.name} block failed to render: {this.state.err}</div> : this.props.children; }
}

export function SurfaceView({ id }: { id: string }) {
  const panel = useStore((s) => s.panels[id]);
  const notes = useStore((s) => s.notes);
  if (!panel) return <div className="surface"><div className="muted" style={{ padding: 12 }}>This surface was closed.</div></div>;
  const spec = panel.spec;
  // Derived from the surface's own sources by shared code, so a surface looking at history or a candidate cannot present itself as the current world.
  const sources = spec.blocks.flatMap((b: any) => [b.source, ...(b.items ?? []).map((i: any) => i.source)]).filter(Boolean);
  const banner = bannerOf(mergeViewing(sources.map(worldOfSource)));
  const mine = notes.filter((n: any) => n.target === `surface:${id}` || String(n.target).startsWith(`surface:${id}#`));
  return (
    <div className="surface" data-surface={id}>
      <div className="surface-head"><h3>{spec.title}</h3><span className={`intent ${spec.intent}`}>{spec.intent}</span><span className="intent" title="Composed by the agent. Process state is in the rail above; figures marked agent-supplied were not read from the run.">agent</span>{spec.summary ? <p><RichText text={spec.summary} /></p> : null}</div>
      {banner ? <div className={`world-banner ${banner.tone}`} role="status"><b>{banner.tone === "warning" ? "Not the current world" : "Candidate"}</b> {banner.text}</div> : null}
      {mine.map((n: any) => <div key={n.id} className={`note-pin ${n.tone}`} style={{ margin: "6px 12px 0" }}><b>{n.by === "agent" ? "agent" : "you"}:</b> <RichText text={n.text} /></div>)}
      <div className={`blocks ${spec.layout === "columns" ? "columns" : ""}`}>
        {spec.blocks.map((b: any) => {
          const C = REGISTRY[b.type];
          return <section key={b.id} className="block" data-block={b.id} data-type={b.type}>{C ? <Boundary name={b.type}><C block={b} panel={panel} /></Boundary> : <div className="callout danger">unknown block type {b.type}</div>}</section>;
        })}
      </div>
    </div>
  );
}
