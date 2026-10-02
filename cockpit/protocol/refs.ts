// Refs name Product Actualizer entities. They are the only way a surface points at process state.
//   claim:C42  unknown:U3  proposal:P17  decision:D7  artifact:<lens>/<file>  evidence:<lens>/<path>
//   lens:<name>  field:<model field>  version:<n>  gate
import { z } from "zod";

export const REF_KINDS = ["claim", "unknown", "proposal", "decision", "artifact", "evidence", "lens", "field", "version", "gate"] as const;
export type RefKind = (typeof REF_KINDS)[number];

const ID: Record<string, RegExp> = {
  claim: /^C\d+$/, unknown: /^U\d+$/, proposal: /^P\d+$/, decision: /^D\d+$/, version: /^\d+$/,
  artifact: /^[\w.-]+(\/[\w.@-]+)+$/, evidence: /^[\w.-]+(\/[\w.@ -]+)+$/, lens: /^[a-z][a-z0-9-]*$/,
  field: /^(purpose|actors|capabilities|constraints|form|voice|positioning|claims|unknowns|decisions)$/,
};

export function parseRef(s: string): { kind: RefKind; id: string } | null {
  if (s === "gate") return { kind: "gate", id: "" };
  const i = s.indexOf(":");
  if (i < 1) return null;
  const kind = s.slice(0, i) as RefKind, id = s.slice(i + 1);
  if (!ID[kind] || !ID[kind].test(id) || id.includes("..")) return null;
  return { kind, id };
}
export const fmtRef = (kind: RefKind, id = "") => (kind === "gate" ? "gate" : `${kind}:${id}`);

export const RefSchema = z.string().refine((s) => parseRef(s) !== null, { message: "not a ref: use claim:C1, unknown:U1, proposal:P1, decision:D1, artifact:<lens>/<file>, evidence:<lens>/<path>, lens:<name>, field:<key>, version:<n>, or gate" });
export type Ref = z.infer<typeof RefSchema>;

// `[[C42]]` and `[[claim:C42]]` inside text become ref chips. Bare ids are expanded by their prefix letter.
const BARE: Record<string, RefKind> = { C: "claim", U: "unknown", P: "proposal", D: "decision" };
export function expandRef(token: string): string | null {
  if (parseRef(token)) return token;
  const m = /^([CUPD])(\d+)$/.exec(token);
  return m ? `${BARE[m[1]]}:${token}` : null;
}
export const REF_TOKEN = /\[\[([^\]\n]{1,120})\]\]/g;
