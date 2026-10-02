# Product actualizer

Agent skills that move an incomplete product toward a coherent launch through one shared Product Model.
Plain Markdown, YAML, and JSON only; no runtime dependencies.

- Entry point: `skills/actualize-product/SKILL.md`. Always loaded with it: `product-model/SCHEMA.md`.
- Lenses are `skills/<name>/SKILL.md` (60-100 lines; sections: Reads from the model, Distinctions, Failure modes, Check, Writes to proposals).
  Longer detail goes in that skill's `references/`, loaded only when the lens says so.
- Lens frontmatter: `reads` (model fields it may use), `needs` (lenses whose output must exist first), `executes_with` (existing skills used as the execution layer when installed).
- Only the router edits a product's `product-model.md`; lenses write to `proposals.md`.
- `python3 tests/check.py` verifies size limits, structure, the fixture model against the schema, and artifact staleness. The worked examples are `tests/walkthrough/` (Loam, software and a sensor) and `tests/walkthrough-mote/` (a hardware and physical-AI product); a hardware walkthrough keeps its evidence package under `evidence/recon-physical/hardware/`.
- Donor material is recorded in `PROVENANCE.md`; reference clones go in `.tmp/ref/` and are deleted after use.
- `hooks/` enforces the process across Claude Code, Codex, Cline, OpenCode, and Pi/Prime (`node hooks/install.mjs`). Engine rules live in `hooks/src/engine.mjs`; `node --test tests/hooks/` replays both walkthroughs (Loam and the physical-AI Mote).
