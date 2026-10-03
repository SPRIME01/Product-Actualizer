// Refs name Product Actualizer entities. They are the only way a surface points at process state.
//   claim:C42  unknown:U3  proposal:P17  decision:D7  artifact:<lens>/<file>  evidence:<lens>/<path>
//   lens:<name>  field:<model field>  version:<n>  gate
//   job:J1  criterion:S1  opportunity:OP1  actor:A1   (rows of the optional demand sections of the Product Model)
//   case:run  case:OP1  case:U3  case:evidence/<lens>/<file>   (a Case is a derived view anchored on one of these; it is never stored)
import { z } from "zod";

export const REF_KINDS = ["claim", "unknown", "proposal", "decision", "artifact", "evidence", "lens", "field", "version", "gate", "job", "criterion", "opportunity", "actor", "case"] as const;
export type RefKind = (typeof REF_KINDS)[number];

const ID: Record<string, RegExp> = {
  claim: /^C\d+$/, unknown: /^U\d+$/, proposal: /^P\d+$/, decision: /^D\d+$/, version: /^\d+$/,
  artifact: /^[\w.-]+(\/[\w.@-]+)+$/, evidence: /^[\w.-]+(\/[\w.@ -]+)+$/, lens: /^[a-z][a-z0-9-]*$/,
  field: /^(purpose|actors|capabilities|constraints|form|voice|positioning|claims|unknowns|decisions|jobs|criteria|opportunities)$/,
  job: /^J\d+$/, criterion: /^S\d+$/, opportunity: /^OP\d+$/, actor: /^A\d+$/,
  case: /^(run|gate|(OP|[CUPDJS])\d+|(evidence|artifact)\/[\w.-]+(\/[\w.@ -]+)+)$/,
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

export const RefSchema = z.string().refine((s) => parseRef(s) !== null, { message: "not a ref: use claim:C1, unknown:U1, proposal:P1, decision:D1, artifact:<lens>/<file>, evidence:<lens>/<path>, lens:<name>, field:<key>, version:<n>, job:J<n>, criterion:S<n>, opportunity:OP<n>, actor:A<n>, case:<run|OP1|U3|evidence/..>, or gate" });
export type Ref = z.infer<typeof RefSchema>;

// `[[C42]]` and `[[claim:C42]]` inside text become ref chips. Bare ids are expanded by their prefix letter.
const BARE: Record<string, RefKind> = { C: "claim", U: "unknown", P: "proposal", D: "decision", J: "job", S: "criterion", OP: "opportunity", A: "actor" };
export function expandRef(token: string): string | null {
  if (parseRef(token)) return token;
  const m = /^(OP|[CUPDJSA])(\d+)$/.exec(token);
  return m ? `${BARE[m[1]]}:${token}` : null;
}
export const REF_TOKEN = /\[\[([^\]\n]{1,120})\]\]/g;

// The ref a Case is anchored on ("run" has none: the run itself is the anchor). `OP1` and `opportunity:OP1` mean the same thing.
export function caseAnchor(id: string): { kind: "run" | "gate" | RefKind; ref: string | null } | null {
  if (id === "run") return { kind: "run", ref: null };
  if (id === "gate") return { kind: "gate", ref: "gate" };
  const bare = /^(OP|[CUPDJS])\d+$/.test(id) ? expandRef(id) : /^(evidence|artifact)\//.test(id) ? id.replace("/", ":") : null;
  const r = bare ? parseRef(bare) : null;
  return r && bare ? { kind: r.kind, ref: bare } : null;
}
export const caseId = (ref: string | null): string => { if (!ref) return "run"; const r = parseRef(ref); if (!r) return "run"; return r.kind === "evidence" || r.kind === "artifact" ? `${r.kind}/${r.id}` : r.kind === "gate" ? "gate" : r.id; };
