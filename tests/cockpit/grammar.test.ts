// The fixed vocabulary must be expressive enough for the real situations of actualization without any generated UI code.
// Each composition is plain data (YAML) against one of the two walkthroughs; it passes when the schema accepts it, every ref and source
// resolves in that run, and the reducer places it. If a scenario ever needs code, the grammar is wrong, not the scenario.
import { describe, test, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fixtureRun, addAsset, cleanup, REPO } from "./helpers";
import { Cockpit } from "../../cockpit/server/core";
import { SurfaceSchema, normalizeSurfaceDoc, BLOCK_TYPES } from "../../cockpit/protocol/spec";
import { CATALOG } from "../../cockpit/protocol/catalog";

const dir = path.join(REPO, "tests/cockpit/compositions");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort();
const used = new Set<string>();

describe("composition scenarios", () => {
  for (const f of files) {
    const doc: any = (Bun as any).YAML.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    test(`${f}: ${doc.scenario}`, () => {
      const fx = fixtureRun(doc.fixture, doc.prepare ?? {});
      for (const a of doc.assets ?? []) addAsset(fx.run, a);
      const c = new Cockpit(fx.project);
      try {
        for (const item of doc.compose) {
          const raw = normalizeSurfaceDoc(item);
          const parsed = SurfaceSchema.safeParse(raw);
          expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 3))).toBe(true);
          const r = c.agent({ op: "surface.put", surface: parsed.data });
          expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
          for (const b of parsed.data!.blocks as any[]) {
            used.add(b.type);
            const src = b.source;
            if (src && ["table", "chart", "timeline"].includes(b.type)) {
              const res: any = c.data(src, { as: "rows", limit: 5 });
              expect(res.kind, `${b.id}: ${res.message}`).toBe("rows");
              if (!src.startsWith("pa:events")) expect(res.total, `${b.id} has rows`).toBeGreaterThan(0);
            }
            if (b.type === "graph" && src) expect((c.data(src) as any).nodes.length, `${b.id} has nodes`).toBeGreaterThan(0);
            if (b.type === "tree") expect((c.data(src, { as: "tree" }) as any).nodes.length).toBeGreaterThan(0);
            if (b.type === "document") expect((c.data(src, { as: "doc" }) as any).kind).toBe("doc");
            if (b.type === "entity" && b.ref) expect(c.detail(b.ref).exists, b.ref).toBe(true);
          }
        }
      } finally { c.close(); cleanup(fx.project); }
    });
  }
  test("the scenarios between them exercise most of the vocabulary", () => {
    for (const t of ["metric", "callout", "table", "tree", "timeline", "graph", "chart", "compare", "media", "document", "entity", "preflight", "ask", "form"]) expect(used.has(t), `no scenario uses ${t}`).toBe(true);
  });
});

describe("vocabulary", () => {
  test("the catalog documents every block, and every example is valid", () => {
    expect(CATALOG.map((c) => c.type).sort()).toEqual([...BLOCK_TYPES].sort());
    for (const c of CATALOG) {
      const s = SurfaceSchema.safeParse({ id: "x", title: "x", blocks: [c.example] });
      expect(s.success, `${c.type}: ${JSON.stringify(s.error?.issues?.slice(0, 2))}`).toBe(true);
    }
  });
  test("unknown properties and unregistered components are rejected with a machine-readable path", () => {
    const bad = SurfaceSchema.safeParse({ id: "x", title: "x", blocks: [{ type: "iframe", id: "a", src: "https://x" }] });
    expect(bad.success).toBe(false);
    const extra = SurfaceSchema.safeParse({ id: "x", title: "x", blocks: [{ type: "callout", id: "a", tone: "note", text: "t", onClick: "alert(1)" }] });
    expect(extra.success).toBe(false);
    const html = SurfaceSchema.safeParse({ id: "x", title: "x", blocks: [{ type: "callout", id: "a", tone: "note", html: "<script>x</script>", text: "t" }] });
    expect(html.success).toBe(false);
  });
  test("a source cannot escape the run directory", () => {
    for (const s of ["file:../../etc/passwd", "file:evidence/../../x", "file:/etc/passwd", "file:state.json", "file:inbox.jsonl", "file:.cockpit/agent.token"]) {
      expect(SurfaceSchema.safeParse({ id: "x", title: "x", blocks: [{ type: "document", id: "d", source: s }] }).success, s).toBe(false);
    }
  });
});
