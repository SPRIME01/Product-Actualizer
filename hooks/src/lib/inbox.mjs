// The inbox: what the owner told the process, in the order they told it. Append-only, file-backed, authoritative.
// The cockpit (or `actualize inbox add` when the owner answered in chat) appends; only the router acknowledges an entry,
// and says where it went (a proposal, a decision, an unknown, or "no action: why"). Nothing here edits the Product Model.
import fs from "node:fs";
import path from "node:path";
import { readText } from "./store.mjs";

export const inboxPath = (run) => path.join(run.dir, "inbox.jsonl");
export const KINDS = ["answer", "ruling", "confirmation", "annotation"];

function rows(run) {
  const out = [];
  for (const ln of (readText(inboxPath(run), "") ?? "").split("\n")) {
    if (!ln.trim()) continue;
    try { out.push(JSON.parse(ln)); } catch { /* a torn line is skipped, never fatal */ }
  }
  return out;
}

// Entries with `handled` resolved from ack lines.
export function readInbox(run) {
  const all = rows(run);
  const acks = new Map(all.filter((r) => r.ack).map((r) => [r.ack, r]));
  return all.filter((r) => r.id).map((r) => ({ ...r, handled: acks.get(r.id) ? { as: acks.get(r.id).as, ts: acks.get(r.id).ts } : null }));
}

export const unhandled = (run) => readInbox(run).filter((r) => !r.handled);

export function appendInbox(run, entry) {
  if (!KINDS.includes(entry.kind)) throw new Error(`inbox kind must be one of ${KINDS.join(", ")}`);
  const n = rows(run).filter((r) => r.id).length + 1;
  const rec = { id: `H${n}`, ts: new Date().toISOString(), via: "cockpit", ...entry };
  fs.appendFileSync(inboxPath(run), JSON.stringify(rec) + "\n");
  return rec;
}

export function ackInbox(run, id, as) {
  const e = readInbox(run).find((r) => r.id === id);
  if (!e) throw new Error(`no inbox entry ${id}`);
  if (e.handled) throw new Error(`${id} was already handled (${e.handled.as})`);
  if (!as || as.trim().length < 6) throw new Error('say where it went: --as "proposal P27" | "decision D8" | "unknown U4 closed" | "no action: <why>"');
  fs.appendFileSync(inboxPath(run), JSON.stringify({ ack: id, as: as.trim(), ts: new Date().toISOString() }) + "\n");
  return e;
}

export function describe(e) {
  const v = e.value === undefined ? "" : ` = ${Array.isArray(e.value) ? e.value.join(", ") : e.value}`;
  const where = e.ref ?? e.ask ?? e.target ?? "";
  return `${e.id} ${e.kind}${e.outcome ? `/${e.outcome}` : ""} ${where}${v}${e.note ? ` — ${e.note}` : ""} [${e.via === "cockpit" ? "owner in cockpit" : "relayed by agent: REPORTED"}]`;
}
