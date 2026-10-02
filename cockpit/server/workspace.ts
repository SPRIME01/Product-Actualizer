// The workspace reducer. Pure and deterministic: (state, action, actor, ctx) -> (state', result). No I/O, no DOM, no clock besides ctx.now.
//
// Three authority tiers are enforced here, not by UI convention:
//   system  the process rail and process state. Not in this state at all, so there is nothing for an action to remove or edit.
//   agent   surfaces: content (what they show), requests for placement, annotations, questions.
//   human   layout preference (topology, sizes, pins, minimized), controls the human set, answers. Agent actions that would
//           move a human-placed surface, remove a pinned one, or answer anything are refused with a code the agent can act on.
import { AgentActionSchema, HumanOpSchema, AUTHORITY_OPS, fail, issuesOf, type ActionResult, type AgentAction, type HumanOp, type Issue } from "../protocol/actions";
import { SurfaceSchema, type Surface, type Placement } from "../protocol/spec";
import { parseRef, REF_TOKEN, expandRef } from "../protocol/refs";

export const MAX_AGENT_SURFACES = 8;
export const MAX_HISTORY = 10;

export type Node = { t: "tabs"; panels: string[]; active: string } | { t: "split"; dir: "row" | "col"; kids: Node[]; w: number[] };
export type Ctrl = { filter?: any[]; sort?: any; highlight?: string[]; source?: string; by: "agent" | "human" };
export type Panel = {
  id: string; spec: Surface; placedBy: "agent" | "human"; pinned: boolean; minimized: boolean;
  controls: Record<string, Ctrl>; selection: Record<string, string | null>; created: string; updated: string; rev: number;
};
export type AskState = { surface: string; block: string; prompt: string; input: string; resolves?: string; state: "open" | "answered" | "deferred" | "cancelled" | "withdrawn"; value?: any; note?: string; opened: string; closed?: string };
export type Note = { id: string; target: string; text: string; tone: string; by: "agent" | "human"; ts: string; seen: boolean };
export type Snapshot = { name: string; tree: Node | null; panels: Record<string, { spec: Surface; pinned: boolean; minimized: boolean }>; focus: string | null; ts: string };
export type WS = {
  rev: number; panels: Record<string, Panel>; tree: Node | null; focus: string | null; maximized: string | null; mru: string[];
  asks: Record<string, AskState>; notes: Note[]; saved: Record<string, Snapshot>; history: Snapshot[];
};
export const emptyWS = (): WS => ({ rev: 0, panels: {}, tree: null, focus: null, maximized: null, mru: [], asks: {}, notes: [], saved: {}, history: [] });

export type Ctx = {
  now: () => string;
  refExists: (ref: string) => boolean;
  sourceError: (source: string, blockType: string) => string | null;
};
export type Inbound = { kind: "answer" | "ruling" | "confirmation" | "annotation"; [k: string]: any };
export type Outcome = { ws: WS; result: ActionResult; inbox: Inbound[]; events: { type: string; subject?: string; data?: any }[] };

// ---- tree helpers (pure) --------------------------------------------------------------------------------------
const clone = <T>(x: T): T => structuredClone(x);
export function panelsIn(n: Node | null): string[] { return !n ? [] : n.t === "tabs" ? n.panels : n.kids.flatMap(panelsIn); }
function groupOf(n: Node | null, id: string): Extract<Node, { t: "tabs" }> | null {
  if (!n) return null;
  if (n.t === "tabs") return n.panels.includes(id) ? n : null;
  for (const k of n.kids) { const g = groupOf(k, id); if (g) return g; }
  return null;
}
function normalize(n: Node | null): Node | null {
  if (!n) return null;
  if (n.t === "tabs") return n.panels.length ? n : null;
  const kids: Node[] = [], w: number[] = [];
  n.kids.forEach((k, i) => {
    const c = normalize(k); if (!c) return;
    if (c.t === "split" && c.dir === n.dir) { const tot = c.w.reduce((a, b) => a + b, 0) || 1; c.kids.forEach((g, j) => { kids.push(g); w.push(((n.w[i] ?? 1) * c.w[j]) / tot); }); }
    else { kids.push(c); w.push(n.w[i] ?? 1); }
  });
  if (!kids.length) return null;
  if (kids.length === 1) return kids[0];
  const tot = w.reduce((a, b) => a + b, 0) || 1;
  return { t: "split", dir: n.dir, kids, w: w.map((x) => x / tot) };
}
function removeFrom(n: Node | null, id: string): Node | null {
  if (!n) return null;
  if (n.t === "tabs") { if (!n.panels.includes(id)) return n; const panels = n.panels.filter((p) => p !== id); return panels.length ? { t: "tabs", panels, active: panels.includes(n.active) ? n.active : panels[panels.length - 1] } : null; }
  return normalize({ ...n, kids: n.kids.map((k) => removeFrom(k, id)).filter(Boolean) as Node[], w: n.w.filter((_, i) => removeFrom(n.kids[i], id) !== null) });
}
function replaceGroup(n: Node, target: Node, repl: Node): Node {
  if (n === target) return repl;
  if (n.t === "tabs") return n;
  return { ...n, kids: n.kids.map((k) => replaceGroup(k, target, repl)) };
}
export function insert(tree: Node | null, id: string, p: Placement, targetId: string | null): Node {
  if (!tree || !targetId) return { t: "tabs", panels: [id], active: id };
  const g = groupOf(tree, targetId)!;
  if (p.rel === "within") return replaceGroup(tree, g, { ...g, panels: [...g.panels, id], active: id });
  const dir = p.rel === "left" || p.rel === "right" ? "row" : "col";
  const fresh: Node = { t: "tabs", panels: [id], active: id };
  const size = p.size ?? 0.5;
  const pair: Node = p.rel === "left" || p.rel === "above" ? { t: "split", dir, kids: [fresh, g], w: [size, 1 - size] } : { t: "split", dir, kids: [g, fresh], w: [1 - size, size] };
  return normalize(replaceGroup(tree, g, pair))!;
}
const groupsCount = (n: Node | null): number => (!n ? 0 : n.t === "tabs" ? 1 : n.kids.reduce((a, k) => a + groupsCount(k), 0));
export function describeLayout(n: Node | null, title: (id: string) => string = (x) => x): string {
  if (!n) return "empty";
  if (n.t === "tabs") return `[${n.panels.map((p) => (p === n.active ? "*" : "") + title(p)).join(" | ")}]`;
  return `${n.dir === "row" ? "side-by-side" : "stacked"}(${n.kids.map((k, i) => describeLayout(k, title) + (n.w[i] < 0.34 ? "·narrow" : "")).join(", ")})`;
}

// ---- ref and source checking over a surface ------------------------------------------------------------------
export function surfaceRefs(s: Surface): { path: string; ref: string }[] {
  const out: { path: string; ref: string }[] = [];
  const add = (path: string, ref?: string) => { if (ref) out.push({ path, ref }); };
  s.blocks.forEach((b: any, i) => {
    const p = `blocks.${i}(${b.id})`;
    add(`${p}.ref`, b.ref); add(`${p}.focus`, b.focus);
    (b.refs ?? []).forEach((r: string, j: number) => add(`${p}.refs.${j}`, r));
    (b.mark ?? []).forEach((r: string, j: number) => add(`${p}.mark.${j}`, r));
    (b.evidence ?? []).forEach((r: string, j: number) => add(`${p}.evidence.${j}`, r));
    (b.nodes ?? []).forEach((n: any, j: number) => add(`${p}.nodes.${j}.ref`, n.ref));
    (b.items ?? []).forEach((n: any, j: number) => add(`${p}.items.${j}.ref`, n.ref));
    (b.options ?? []).forEach((o: any, j: number) => (o.refs ?? []).forEach((r: string, k: number) => add(`${p}.options.${j}.refs.${k}`, r)));
    (b.asks ?? []).forEach((a: any, j: number) => { add(`${p}.asks.${j}.resolves`, a.resolves); (a.refs ?? []).forEach((r: string, k: number) => add(`${p}.asks.${j}.refs.${k}`, r)); });
    add(`${p}.resolves`, b.resolves);
    for (const c of b.criteria ?? []) c.cells.forEach((cell: any, j: number) => (cell.refs ?? []).forEach((r: string, k: number) => add(`${p}.criteria.${c.name}.${j}.${k}`, r)));
    for (const t of [b.text, b.prompt, b.summary]) if (typeof t === "string") for (const m of t.matchAll(REF_TOKEN)) { const e = expandRef(m[1].trim()); if (e) add(`${p}.text`, e); }
  });
  return out;
}
export function surfaceSources(s: Surface): { path: string; source: string; type: string }[] {
  const out: any[] = [];
  s.blocks.forEach((b: any, i) => {
    if (b.source) out.push({ path: `blocks.${i}(${b.id}).source`, source: b.source, type: b.type });
    (b.items ?? []).forEach((it: any, j: number) => { if (it.source) out.push({ path: `blocks.${i}(${b.id}).items.${j}.source`, source: it.source, type: "item" }); if (it.src) out.push({ path: `blocks.${i}(${b.id}).items.${j}.src`, source: it.src, type: "media" }); });
  });
  return out;
}
function checkSurface(s: Surface, ctx: Ctx): ActionResult | null {
  const bad: Issue[] = [];
  for (const r of surfaceRefs(s)) if (!ctx.refExists(r.ref)) bad.push({ path: r.path, message: `${r.ref} does not exist in this run` });
  if (bad.length) return fail("BAD_REF", `${bad.length} ref(s) name entities that do not exist`, bad.slice(0, 8));
  const badSrc: Issue[] = [];
  for (const x of surfaceSources(s)) { const e = ctx.sourceError(x.source, x.type); if (e) badSrc.push({ path: x.path, message: e }); }
  if (badSrc.length) return fail("BAD_SOURCE", `${badSrc.length} source(s) do not resolve`, badSrc.slice(0, 8));
  return null;
}

// Composition lints: advisory, returned as warnings with the result. They push the agent toward fewer, sharper surfaces.
export function lintSurface(s: Surface): string[] {
  const w: string[] = []; const n = (t: string) => s.blocks.filter((b) => b.type === t).length;
  if (n("callout") > 1) w.push("LINT: more than one callout; keep the single sentence the owner must not miss and move the rest into the blocks it refers to");
  if (s.blocks.length > 6) w.push(`LINT: ${s.blocks.length} blocks; split into two surfaces or drop what does not serve the ${s.intent}`);
  if (n("ask") > 1) w.push("LINT: several asks outside a form; group related questions in a form so they are answered together");
  const decidable = s.blocks.some((b: any) => b.type === "ask" || b.type === "form" || b.type === "preflight" || (b.type === "entity" && (!b.show || b.show.includes("actions"))));
  if (s.intent === "decide" && !decidable) w.push("LINT: intent is decide but nothing here can be decided; add an ask, a form, or an entity with actions, or change the intent");
  if (s.intent !== "decide" && (n("ask") || n("form"))) w.push("LINT: this surface asks a question but its intent is not decide; the owner will not be told it needs them");
  if (!s.summary && (s.blocks.length > 3 || s.intent === "decide")) w.push("LINT: add a summary: the one line that says why this is on screen");
  for (const b of s.blocks as any[]) if (b.data && b.data.length > 30) w.push(`LINT: ${b.id} carries ${b.data.length} agent-supplied rows; bind a source so the owner can trace them`);
  for (const b of s.blocks as any[]) if (b.type === "chart" && b.data && b.data.length < 3) w.push(`LINT: ${b.id} charts fewer than 3 points; a metric says it better`);
  return w;
}

// ---- snapshots --------------------------------------------------------------------------------------------------
function snap(ws: WS, name: string, ts: string): Snapshot {
  return { name, tree: clone(ws.tree), focus: ws.focus, ts, panels: Object.fromEntries(Object.values(ws.panels).map((p) => [p.id, { spec: p.spec, pinned: p.pinned, minimized: p.minimized }])) };
}
function pushHistory(ws: WS, name: string, ts: string) { ws.history = [snap(ws, name, ts), ...ws.history].slice(0, MAX_HISTORY); }
function restoreSnap(ws: WS, s: Snapshot, ts: string) {
  const panels: Record<string, Panel> = {};
  for (const [id, p] of Object.entries(s.panels)) {
    const cur = ws.panels[id];
    panels[id] = cur ? { ...cur, spec: p.spec, pinned: p.pinned, minimized: p.minimized } : { id, spec: p.spec, placedBy: "agent", pinned: p.pinned, minimized: p.minimized, controls: {}, selection: {}, created: ts, updated: ts, rev: 1 };
  }
  ws.panels = panels; ws.tree = clone(s.tree); ws.focus = s.focus && panels[s.focus] ? s.focus : panelsIn(ws.tree)[0] ?? null;
  ws.mru = ws.mru.filter((i) => panels[i]);
  syncAsks(ws, ts);
}
function syncAsks(ws: WS, ts: string) {
  const live = new Set<string>();
  for (const p of Object.values(ws.panels)) for (const b of p.spec.blocks as any[]) {
    const list = b.type === "ask" ? [b] : b.type === "form" ? b.asks : [];
    for (const a of list) {
      live.add(a.id);
      if (!ws.asks[a.id] || ws.asks[a.id].state === "withdrawn") ws.asks[a.id] = { surface: p.id, block: b.id, prompt: a.prompt, input: a.input, resolves: a.resolves, state: "open", opened: ts };
      else ws.asks[a.id] = { ...ws.asks[a.id], surface: p.id, prompt: a.prompt };
    }
  }
  for (const [id, a] of Object.entries(ws.asks)) if (!live.has(id) && a.state === "open") ws.asks[id] = { ...a, state: "withdrawn", closed: ts };
}

const touch = (ws: WS, id: string) => { ws.mru = [id, ...ws.mru.filter((x) => x !== id)]; ws.focus = id; };
const resolveTarget = (ws: WS, to: string): string | null => (to === "active" ? (ws.focus && ws.panels[ws.focus] && !ws.panels[ws.focus].minimized ? ws.focus : ws.mru.find((i) => ws.panels[i] && !ws.panels[i].minimized) ?? null) : ws.panels[to] && !ws.panels[to].minimized ? to : null);

function bump(ws: WS) { ws.rev += 1; }

// ---- agent actions ----------------------------------------------------------------------------------------------
export function applyAgent(prev: WS, raw: unknown, ctx: Ctx): Outcome {
  const none = { inbox: [] as Inbound[], events: [] as Outcome["events"] };
  const parsed = AgentActionSchema.safeParse(raw);
  if (!parsed.success) {
    const op = (raw as any)?.op;
    if (typeof op === "string" && op.startsWith("human.")) return { ws: prev, result: fail("AUTHORITY_HUMAN", `${op} belongs to the owner; an agent can request an answer with an ask block but cannot give one`), ...none };
    if (typeof op === "string" && /rail|system|process|model|gate/.test(op)) return { ws: prev, result: fail("AUTHORITY_SYSTEM", "the process rail, the Product Model, and gate state are not cockpit state; they are read from the process and cannot be composed"), ...none };
    return { ws: prev, result: fail(op ? "SCHEMA" : "UNKNOWN_OP", "action does not match the cockpit vocabulary", issuesOf(parsed.error)), ...none };
  }
  const a: AgentAction = parsed.data;
  const ws = clone(prev); const ts = ctx.now(); const events: Outcome["events"] = []; const effects: string[] = []; const warnings: string[] = [];
  const done = (): Outcome => { bump(ws); return { ws, result: { ok: true, rev: ws.rev, effects, ...(warnings.length ? { warnings } : {}) }, inbox: [], events }; };
  const err = (code: Parameters<typeof fail>[0], m: string, issues?: Issue[]): Outcome => ({ ws: prev, result: fail(code, m, issues), ...none });
  const panel = (id: string) => ws.panels[id];

  switch (a.op) {
    case "surface.put": {
      const s = a.surface;
      const bad = checkSurface(s, ctx); if (bad) return { ws: prev, result: bad, ...none };
      const existing = panel(s.id);
      if (existing) {
        const oldIds = new Set(JSON.stringify(existing.spec.blocks.map((b) => b.id)));
        existing.spec = s; existing.updated = ts; existing.rev += 1;
        for (const k of Object.keys(existing.controls)) if (!s.blocks.some((b) => b.id === k)) delete existing.controls[k];
        for (const k of Object.keys(existing.selection)) if (!s.blocks.some((b) => b.id === k)) delete existing.selection[k];
        void oldIds;
        if (a.place) warnings.push(existing.placedBy === "human" ? "PLACEMENT_IGNORED: the owner placed this surface; content was replaced in place" : "PLACEMENT_IGNORED: surface exists; use view.place to move it");
        effects.push(`replaced ${s.id} in place`);
        if (a.place?.focus !== false && !ws.panels[s.id].minimized) touch(ws, s.id);
      } else {
        const agentCount = Object.values(ws.panels).length;
        if (agentCount >= MAX_AGENT_SURFACES) {
          const victim = [...ws.mru].reverse().concat(Object.keys(ws.panels)).find((i) => ws.panels[i] && !ws.panels[i].pinned && !Object.values(ws.asks).some((x) => x.surface === i && x.state === "open"));
          if (!victim) return err("CLUTTER_CAP", `${MAX_AGENT_SURFACES} surfaces are open and every one is pinned or waiting on an answer; close or withdraw one first`);
          pushHistory(ws, `closed-${victim}`, ts);
          ws.tree = removeFrom(ws.tree, victim); delete ws.panels[victim]; ws.mru = ws.mru.filter((x) => x !== victim);
          if (ws.focus === victim) ws.focus = null;
          effects.push(`evicted least-recent surface ${victim} (restore with layout.restore previous)`);
        }
        const pl: Placement = a.place ?? (groupsCount(ws.tree) >= 3 || !ws.tree ? { rel: "within", to: "active", focus: true } : { rel: "right", to: "active", size: 0.5, focus: true });
        const target = ws.tree ? resolveTarget(ws, pl.to) : null;
        if (ws.tree && !target) return err("NOT_FOUND", `placement target "${pl.to}" is not an open surface`);
        ws.panels[s.id] = { id: s.id, spec: s, placedBy: "agent", pinned: false, minimized: false, controls: {}, selection: {}, created: ts, updated: ts, rev: 1 };
        ws.tree = insert(ws.tree, s.id, pl, target);
        if (pl.focus !== false) touch(ws, s.id); else ws.mru = [...ws.mru, s.id];
        effects.push(`opened ${s.id} ${pl.rel === "within" ? "as a tab" : `${pl.rel} of ${target}`}`);
      }
      syncAsks(ws, ts);
      warnings.push(...lintSurface(s));
      events.push({ type: "surface.put", subject: `surface:${s.id}`, data: { blocks: s.blocks.map((b) => b.type) } });
      return done();
    }
    case "surface.patch": {
      const p = panel(a.id); if (!p) return err("NOT_FOUND", `no surface ${a.id}`);
      const s = a.set;
      if (!a.block) {
        if (s.title) p.spec = { ...p.spec, title: s.title }; if (s.summary) p.spec = { ...p.spec, summary: s.summary };
        if (s.source || s.filter || s.sort || s.highlight || s.select !== undefined) return err("SCHEMA", "source, filter, sort, highlight, and select apply to a block: pass block", [{ path: "block", message: "required for this set" }]);
      } else {
        const b: any = p.spec.blocks.find((x) => x.id === a.block);
        if (!b) return err("NOT_FOUND", `surface ${a.id} has no block ${a.block}`, [{ path: "block", message: `blocks: ${p.spec.blocks.map((x) => x.id).join(", ")}` }]);
        if (s.source) { if (!["table", "tree", "timeline", "chart", "graph", "document"].includes(b.type)) return err("SCHEMA", `${b.type} blocks do not bind a source`); const e = ctx.sourceError(s.source, b.type); if (e) return err("BAD_SOURCE", e); }
        if (s.select) { if (!ctx.refExists(s.select)) return err("BAD_REF", `${s.select} does not exist in this run`); }
        const c = (p.controls[a.block] ??= { by: "agent" });
        // The owner's own filter/sort on a block is a preference; the agent's patch replaces it only with an explicit reset of that block.
        if (c.by === "human" && (s.filter || s.sort)) warnings.push("CONTROLS_HUMAN: the owner set a filter/sort on this block; the agent's was applied beside it and marked");
        if (s.source) c.source = s.source; if (s.filter) c.filter = s.filter; if (s.sort) c.sort = s.sort; if (s.highlight) c.highlight = s.highlight;
        if (s.select !== undefined) p.selection[a.block] = s.select;
        if (!c.by) c.by = "agent";
      }
      p.updated = ts; p.rev += 1; effects.push(`patched ${a.id}${a.block ? "/" + a.block : ""}`);
      events.push({ type: "surface.patch", subject: `surface:${a.id}`, data: { block: a.block, keys: Object.keys(a.set) } });
      return done();
    }
    case "surface.remove": {
      if (/^system/.test(a.id)) return err("AUTHORITY_SYSTEM", "system surfaces cannot be removed");
      const p = panel(a.id); if (!p) return err("NOT_FOUND", `no surface ${a.id}`);
      if (p.pinned) return err("AUTHORITY_PINNED", `${a.id} is pinned by the owner; ask them to unpin it, or leave it`);
      pushHistory(ws, `closed-${a.id}`, ts);
      ws.tree = removeFrom(ws.tree, a.id); delete ws.panels[a.id]; ws.mru = ws.mru.filter((x) => x !== a.id);
      if (ws.focus === a.id) ws.focus = ws.mru[0] ?? null; if (ws.maximized === a.id) ws.maximized = null;
      syncAsks(ws, ts); effects.push(`removed ${a.id}`);
      events.push({ type: "surface.removed", subject: `surface:${a.id}` });
      return done();
    }
    case "view.focus": {
      const p = panel(a.id); if (!p) return err("NOT_FOUND", `no surface ${a.id}`);
      if (a.ref && !ctx.refExists(a.ref)) return err("BAD_REF", `${a.ref} does not exist in this run`);
      if (p.minimized) { p.minimized = false; const pl: Placement = { rel: "right", to: "active", size: 0.4, focus: true }; ws.tree = insert(ws.tree, a.id, pl, ws.tree ? resolveTarget(ws, "active") : null); }
      const g = groupOf(ws.tree, a.id); if (g) g.active = a.id;
      touch(ws, a.id);
      if (a.ref) { const b = (p.spec.blocks as any[]).find((x) => ["table", "tree", "timeline"].includes(x.type)); if (b) p.selection[b.id] = a.ref; }
      effects.push(`focused ${a.id}${a.ref ? " on " + a.ref : ""}`);
      events.push({ type: "view.focused", subject: `surface:${a.id}`, data: { ref: a.ref } });
      return done();
    }
    case "view.place": {
      const p = panel(a.id); if (!p) return err("NOT_FOUND", `no surface ${a.id}`);
      if (p.placedBy === "human") return err("AUTHORITY_LAYOUT", `the owner placed ${a.id}; the agent may change its content, not its position. Open a new surface beside it instead`);
      if (p.pinned) return err("AUTHORITY_PINNED", `${a.id} is pinned`);
      const target = resolveTarget(ws, a.place.to); if (!target || target === a.id) return err("NOT_FOUND", `placement target "${a.place.to}" is not another open surface`);
      if (ws.panels[target].placedBy === "human" && a.place.rel === "within") warnings.push("the target group is the owner's; the surface joined it as a tab");
      ws.tree = removeFrom(ws.tree, a.id); p.minimized = false;
      ws.tree = insert(ws.tree, a.id, a.place, groupOf(ws.tree, target) ? target : resolveTarget(ws, "active"));
      if (a.place.focus !== false) touch(ws, a.id);
      effects.push(`moved ${a.id} ${a.place.rel} ${target}`); events.push({ type: "view.moved", subject: `surface:${a.id}` });
      return done();
    }
    case "view.size": {
      const p = panel(a.id); if (!p) return err("NOT_FOUND", `no surface ${a.id}`);
      if (a.state === "minimized") { if (p.pinned) return err("AUTHORITY_PINNED", `${a.id} is pinned`); p.minimized = true; ws.tree = removeFrom(ws.tree, a.id); if (ws.focus === a.id) ws.focus = resolveTarget(ws, "active"); if (ws.maximized === a.id) ws.maximized = null; }
      else {
        if (p.minimized) { p.minimized = false; ws.tree = insert(ws.tree, a.id, { rel: "right", to: "active", size: 0.4, focus: true }, ws.tree ? resolveTarget(ws, "active") : null); }
        ws.maximized = a.state === "maximized" ? a.id : ws.maximized === a.id ? null : ws.maximized;
        if (a.state === "maximized") touch(ws, a.id);
      }
      effects.push(`${a.id} ${a.state}`); events.push({ type: "view.sized", subject: `surface:${a.id}`, data: { state: a.state } });
      return done();
    }
    case "layout.save": { ws.saved[a.name] = snap(ws, a.name, ts); effects.push(`saved layout ${a.name}`); events.push({ type: "layout.saved", data: { name: a.name } }); return done(); }
    case "layout.restore": {
      const s = a.name === "previous" ? ws.history[0] : ws.saved[a.name];
      if (!s) return err("NOT_FOUND", a.name === "previous" ? "no previous layout to restore" : `no saved layout ${a.name}`);
      const before = snap(ws, "before-restore", ts);
      restoreSnap(ws, s, ts);
      if (a.name === "previous") ws.history = [before, ...ws.history.slice(1)]; else pushHistory(ws, "before-restore", ts);
      effects.push(`restored ${a.name}`); events.push({ type: "layout.restored", data: { name: a.name } });
      return done();
    }
    case "layout.reset": {
      pushHistory(ws, "before-reset", ts);
      const keep = new Set([...(a.keep ?? []), ...Object.values(ws.panels).filter((p) => p.pinned).map((p) => p.id)]);
      for (const id of Object.keys(ws.panels)) if (!keep.has(id)) { delete ws.panels[id]; ws.tree = removeFrom(ws.tree, id); }
      ws.mru = ws.mru.filter((i) => ws.panels[i]); ws.focus = ws.mru[0] ?? null; ws.maximized = null;
      syncAsks(ws, ts); effects.push(`reset the workspace (kept ${[...keep].join(", ") || "nothing"}); layout.restore previous undoes it`);
      events.push({ type: "layout.reset" });
      return done();
    }
    case "note.add": {
      const m = /^surface:([\w.-]+)/.exec(a.target);
      if (m && !panel(m[1])) return err("NOT_FOUND", `no surface ${m[1]}`);
      if (!m && !ctx.refExists(a.target)) return err("BAD_REF", `${a.target} does not exist in this run`);
      ws.notes.push({ id: `N${ws.notes.length + 1}`, target: a.target, text: a.text, tone: a.tone, by: "agent", ts, seen: false });
      if (ws.notes.length > 60) ws.notes = ws.notes.slice(-60);
      effects.push(`annotated ${a.target}`); events.push({ type: "note.added", subject: a.target });
      return done();
    }
    case "ask.withdraw": {
      const k = ws.asks[a.id]; if (!k || k.state !== "open") return err("NOT_FOUND", `no open ask ${a.id}`);
      ws.asks[a.id] = { ...k, state: "withdrawn", closed: ts, note: a.reason };
      effects.push(`withdrew ${a.id}`); events.push({ type: "ask.withdrawn", subject: `ask:${a.id}`, data: { reason: a.reason } });
      return done();
    }
  }
}

// ---- human operations -------------------------------------------------------------------------------------------
export function applyHuman(prev: WS, raw: unknown, ctx: Ctx): Outcome {
  const none = { inbox: [] as Inbound[], events: [] as Outcome["events"] };
  const parsed = HumanOpSchema.safeParse(raw);
  if (!parsed.success) return { ws: prev, result: fail("SCHEMA", "operation does not match", issuesOf(parsed.error)), ...none };
  const o: HumanOp = parsed.data;
  const ws = clone(prev); const ts = ctx.now(); const inbox: Inbound[] = []; const events: Outcome["events"] = []; const effects: string[] = [];
  const done = (): Outcome => { bump(ws); return { ws, result: { ok: true, rev: ws.rev, effects }, inbox, events }; };
  const err = (code: Parameters<typeof fail>[0], m: string): Outcome => ({ ws: prev, result: fail(code, m), ...none });
  switch (o.op) {
    case "human.answer": {
      const k = ws.asks[o.ask]; if (!k || k.surface !== o.surface) return err("NOT_FOUND", `no ask ${o.ask} on ${o.surface}`);
      if (k.state !== "open") return err("NOT_FOUND", `${o.ask} is already ${k.state}`);
      const outcome = o.outcome;
      if (outcome === "answered" && (o.value === undefined || o.value === "" || (Array.isArray(o.value) && !o.value.length))) return err("SCHEMA", "an answer needs a value; use defer or cancel otherwise");
      ws.asks[o.ask] = { ...k, state: outcome, value: o.value, note: o.note, closed: ts };
      inbox.push({ kind: "answer", ask: o.ask, surface: o.surface, prompt: k.prompt, outcome, value: o.value, note: o.note, ref: k.resolves, input: k.input });
      events.push({ type: "human.answered", subject: `ask:${o.ask}`, data: { outcome } }); effects.push(`recorded ${outcome} for ${o.ask}`);
      return done();
    }
    case "human.rule": {
      if (!ctx.refExists(o.ref)) return err("BAD_REF", `${o.ref} does not exist`);
      if (!/^(proposal|unknown|decision):/.test(o.ref)) return err("SCHEMA", "a ruling bears on a proposal, unknown, or decision");
      const k = o.ref.split(":")[0];
      const allowed: Record<string, string[]> = { proposal: ["accept", "reject", "question"], unknown: ["answer", "question"], decision: ["question"] };
      if (!allowed[k].includes(o.ruling)) return err("SCHEMA", `a ${k} can be ruled: ${allowed[k].join(", ")}`);
      if (o.ruling === "reject" && (o.reason ?? "").trim().length < 12) return err("SCHEMA", "a rejection needs a specific reason (12+ characters): the router must log it");
      if ((o.ruling === "answer" || o.ruling === "question") && (o.reason ?? "").trim().length < 4) return err("SCHEMA", `${o.ruling} needs text`);
      inbox.push({ kind: "ruling", ref: o.ref, outcome: o.ruling, note: o.reason });
      events.push({ type: "human.ruled", subject: o.ref, data: { ruling: o.ruling } }); effects.push(`recorded ${o.ruling} of ${o.ref}`);
      return done();
    }
    case "human.confirm": {
      const p = ws.panels[o.surface]; const b: any = p?.spec.blocks.find((x) => x.id === o.block && x.type === "preflight");
      if (!b) return err("NOT_FOUND", `no preflight block ${o.surface}/${o.block}`);
      const key = `pf:${o.surface}/${o.block}`;
      if (ws.asks[key] && ws.asks[key].state !== "open") return err("NOT_FOUND", "this preflight was already answered; the agent must open a new one");
      ws.asks[key] = { surface: o.surface, block: o.block, prompt: b.action.action, input: "preflight", state: o.outcome === "confirmed" ? "answered" : "cancelled", value: o.outcome, note: o.note, opened: ts, closed: ts };
      inbox.push({ kind: "confirmation", target: b.action.target, action: b.action.action, class: b.action.class, outcome: o.outcome, note: o.note, surface: o.surface, block: o.block, bounds: b.action.bounds, recovery: b.action.recovery });
      events.push({ type: "preflight.answered", subject: key, data: { outcome: o.outcome } }); effects.push(`recorded ${o.outcome}`);
      return done();
    }
    case "human.annotate": {
      const m = /^surface:([\w.-]+)/.exec(o.target);
      if (m && !ws.panels[m[1]]) return err("NOT_FOUND", `no surface ${m[1]}`);
      if (!m && !ctx.refExists(o.target)) return err("BAD_REF", `${o.target} does not exist`);
      ws.notes.push({ id: `N${ws.notes.length + 1}`, target: o.target, text: o.text, tone: o.kind === "issue" ? "danger" : o.kind === "approval" ? "ok" : "note", by: "human", ts, seen: true });
      inbox.push({ kind: "annotation", target: o.target, annotation: o.kind, note: o.text, at: o.at });
      events.push({ type: "human.annotated", subject: o.target }); effects.push("annotation recorded");
      return done();
    }
    case "human.select": {
      const p = ws.panels[o.surface]; if (!p) return err("NOT_FOUND", `no surface ${o.surface}`);
      if (o.ref && !ctx.refExists(o.ref)) return err("BAD_REF", `${o.ref} does not exist`);
      p.selection[o.block] = o.ref; ws.focus = o.surface; return done();
    }
    case "human.control": {
      const p = ws.panels[o.surface]; if (!p) return err("NOT_FOUND", `no surface ${o.surface}`);
      p.controls[o.block] = { ...(p.controls[o.block] ?? {}), ...o.set, by: "human" } as Ctrl; return done();
    }
    case "human.layout": {
      const t = o.tree as Node | null; const known = new Set(Object.values(ws.panels).filter((p) => !p.minimized).map((p) => p.id));
      const valid = (n: any): Node | null => {
        if (!n) return null;
        if (n.t === "tabs") { const panels = (n.panels ?? []).filter((x: string) => known.has(x)); return panels.length ? { t: "tabs", panels, active: panels.includes(n.active) ? n.active : panels[0] } : null; }
        if (n.t === "split" && Array.isArray(n.kids)) { const kids: Node[] = [], w: number[] = []; n.kids.forEach((k: any, i: number) => { const c = valid(k); if (c) { kids.push(c); w.push(Math.max(0.05, Number(n.w?.[i]) || 1)); } }); return normalize(kids.length ? { t: "split", dir: n.dir === "col" ? "col" : "row", kids, w } : null); }
        return null;
      };
      let tree = valid(t);
      const placed = new Set(panelsIn(tree));
      for (const id of known) if (!placed.has(id)) tree = insert(tree, id, { rel: "within", to: "active", focus: false }, panelsIn(tree)[0] ?? null);
      ws.tree = normalize(tree);
      for (const id of o.moved ?? []) if (ws.panels[id]) ws.panels[id].placedBy = "human";
      if (o.minimized) for (const id of o.minimized) if (ws.panels[id]) ws.panels[id].minimized = true;
      for (const p of Object.values(ws.panels)) if (p.minimized && !(o.minimized ?? []).includes(p.id)) p.minimized = false;
      if (o.maximized !== undefined) ws.maximized = o.maximized && ws.panels[o.maximized] ? o.maximized : null;
      if (o.focus && ws.panels[o.focus]) touch(ws, o.focus);
      return done();
    }
    case "human.size": {
      const p = ws.panels[o.id]; if (!p) return err("NOT_FOUND", `no surface ${o.id}`);
      if (o.state === "minimized") { p.minimized = true; ws.tree = removeFrom(ws.tree, o.id); if (ws.focus === o.id) ws.focus = resolveTarget(ws, "active"); if (ws.maximized === o.id) ws.maximized = null; }
      else { if (p.minimized) { p.minimized = false; ws.tree = insert(ws.tree, o.id, { rel: "right", to: "active", size: 0.4, focus: true }, ws.tree ? resolveTarget(ws, "active") : null); } ws.maximized = o.state === "maximized" ? o.id : ws.maximized === o.id ? null : ws.maximized; touch(ws, o.id); }
      return done();
    }
    case "human.pin": { const p = ws.panels[o.id]; if (!p) return err("NOT_FOUND", `no surface ${o.id}`); p.pinned = o.pinned; if (o.pinned) p.placedBy = "human"; return done(); }
    case "human.close": {
      const p = ws.panels[o.id]; if (!p) return err("NOT_FOUND", `no surface ${o.id}`);
      pushHistory(ws, `closed-${o.id}`, ts); ws.tree = removeFrom(ws.tree, o.id); delete ws.panels[o.id]; ws.mru = ws.mru.filter((x) => x !== o.id);
      if (ws.focus === o.id) ws.focus = ws.mru[0] ?? null; syncAsks(ws, ts); return done();
    }
    case "human.layout-restore": {
      const s = o.name === "previous" ? ws.history[0] : ws.saved[o.name]; if (!s) return err("NOT_FOUND", "nothing to restore");
      pushHistory(ws, "before-restore", ts); restoreSnap(ws, s, ts); return done();
    }
  }
}

export const isAuthorityOp = (op: string) => AUTHORITY_OPS.has(op);

// ---- agent-visible context: progressive disclosure for UI state -----------------------------------------------
export function contextOf(ws: WS, recent: { ts: string; op: string; summary: string }[] = []) {
  const title = (id: string) => ws.panels[id]?.spec.title ?? id;
  const asking = Object.entries(ws.asks).filter(([, a]) => a.state === "open").map(([id, a]) => ({ ask: id, surface: a.surface, prompt: a.prompt, input: a.input }));
  const focused = ws.focus ? ws.panels[ws.focus] : null;
  return {
    rev: ws.rev, focus: ws.focus,
    visible: panelsIn(ws.tree).map((id) => ({ id, title: title(id), intent: ws.panels[id].spec.intent, blocks: ws.panels[id].spec.blocks.map((b) => b.type), placedBy: ws.panels[id].placedBy, pinned: ws.panels[id].pinned })),
    minimized: Object.values(ws.panels).filter((p) => p.minimized).map((p) => p.id),
    selection: focused ? Object.fromEntries(Object.entries(focused.selection).filter(([, v]) => v)) : {},
    asking, layout: describeLayout(ws.tree, title),
    answered: Object.entries(ws.asks).filter(([, a]) => a.state === "answered" || a.state === "deferred" || a.state === "cancelled").slice(-4).map(([id, a]) => ({ ask: id, state: a.state })),
    notes: ws.notes.filter((n) => n.by === "human").slice(-3).map((n) => ({ target: n.target, text: n.text })),
    recent: recent.slice(-5),
  };
}
export type CockpitContext = ReturnType<typeof contextOf>;
export { SurfaceSchema };
