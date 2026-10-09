import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { lensOfPath, loadLenses } from "../hooks/src/lib/lenses.mjs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const wrapper = read("skills/reconstruct-experience/SKILL.md");
const method = read("skills/reconstruct-experience/method-v0.2.md");
const handoff = read("skills/reconstruct-experience/references/model-handoff.md");
const router = read("skills/actualize-product/SKILL.md");

describe("demonstrated-experience intake contract", () => {
  test("retains the supplied v0.2 method byte-for-byte and as a conditional tool", () => {
    expect(createHash("sha256").update(method).digest("hex")).toBe("c4402405fbafdf7e40b070bb013b78e3b1696636d59b0881ce73cade0a2dfe97");
    expect(wrapper).toMatch(/^---\nname: reconstruct-experience\nkind: tool\n/);
    expect(wrapper.split("\n").length - 1).toBeLessThanOrEqual(60);
    expect(wrapper).toContain("method-v0.2.md");
    expect(wrapper).toContain("references/model-handoff.md");
    expect(method).toContain("## Phase 11 — Generate validation traces");
    expect(method).toContain("## 7A — Domain / Business Semantics");
    expect(method).toContain("## 7B — Product / Operating Economics");
  });
  test("routes external demonstrations before implementation but skips source-only projects", () => {
    expect(router).toContain("reconstruct-experience");
    expect(router).toContain("demonstrated");
    expect(router).toContain("source-only");
    expect(wrapper).toContain("Skip for ordinary source-only");
    expect(read("skills/recon-software/SKILL.md")).toContain("executes_with: [reconstruct-experience]");
    expect(read("skills/recon-software/SKILL.md")).toContain("evidence/recon-software/reconstruct-experience/");
    expect(loadLenses({ACTUALIZE_SKILLS_DIR:path.join(root,"skills")})).not.toHaveProperty("reconstruct-experience");
    expect(lensOfPath(path.join(root,"skills/reconstruct-experience/SKILL.md"),{ACTUALIZE_SKILLS_DIR:path.join(root,"skills")})).toBeNull();
    expect(lensOfPath(path.join(root,"skills/recon-software/SKILL.md"),{ACTUALIZE_SKILLS_DIR:path.join(root,"skills")})).toBe("recon-software");
    expect(router).toContain("recon-software");
    expect(router).toContain("PHYSICAL-PREFLIGHT.md");
    expect(router.split("\n").length - 1).toBeLessThanOrEqual(40);
  });
  test("maps every epistemic class into the canonical Product Model without inflation", () => {
    for (const word of ["OBSERVED", "NARRATED", "USER-SPECIFIED", "INFERRED", "UNKNOWN", "TARGET", "CONTRADICTED", "VERIFIED"]) {
      expect(handoff).toContain(word);
    }
    expect(handoff).toMatch(/\`NARRATED\` \| \`REPORTED\`/);
    expect(handoff).toMatch(/\`TARGET\` \| \`PROPOSED\`/);
    expect(handoff).toMatch(/\`INFERRED\` \| \`INFERRED\`/);
    expect(handoff).toContain("not** an input grade");
    expect(handoff).toContain("assign canonical IDs only during router reconciliation");
  });
  test("retains traceable evidence, target deltas and unexecuted tests without creating a second authority", () => {
    for (const file of ["source-index.md", "experience-graph.md", "capability-contracts.md", "validation-traces.md", "handoff.md"]) {
      expect(handoff).toContain(file);
    }
    expect(handoff).toContain("unexecuted");
    expect(handoff).toContain("actualize/evidence/recon-software/reconstruct-experience/");
    expect(handoff).toContain("only during router reconciliation");
    expect(wrapper).toContain("Only the \`actualize-product\` router");
    expect(wrapper).toContain("No emitted validation trace is a test result");
  });
});
