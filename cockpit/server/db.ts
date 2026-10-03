// SQLite holds two classes of data, and the line between them is the point of this file.
//
//   projection  meta, entities, search, events(channel = 'process')   Disposable. `rebuild()` regenerates every row from the run
//               directory. Nothing here is truth: the Product Model, proposals, artifacts, evidence, the log, and the inbox are.
//   cockpit     ui_state, interactions, events(channel = 'cockpit'), control_*   Durable cockpit-owned state: the owner's layout and
//               pins, work requests, bindings, declared budgets, reviews. Deleting the file loses these and nothing the process knows.
//
// Control tables may record what the owner asked for and chose. They never hold or decide Product Model or process truth, and the
// hooks never read them. A schema change is a numbered migration; it may rebuild projection tables but never drops a cockpit one.
import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

type Migration = { version: number; name: string; up: (db: Database) => void };
const MIGRATIONS: Migration[] = [
  { version: 1, name: "projection and ui state", up: (db) => {
    db.run(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
    // Projected entities: claims, unknowns, decisions, proposals, artifacts, versions, lenses, blockers, responses, evidence. `data` is JSON.
    db.run(`CREATE TABLE IF NOT EXISTS entities (kind TEXT NOT NULL, id TEXT NOT NULL, ord INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (kind, id))`);
    db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(kind UNINDEXED, id UNINDEXED, text, tokenize = 'porter unicode61')`);
    // One stream for process events (from the run's log and from projection diffs) and cockpit events.
    db.run(`CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, channel TEXT NOT NULL, type TEXT NOT NULL, subject TEXT, run TEXT, data TEXT NOT NULL DEFAULT '{}')`);
    db.run(`CREATE INDEX IF NOT EXISTS events_type ON events (type)`);
    // Workspace state: surfaces, topology, saved layouts. Human layout choices live here as preference.
    db.run(`CREATE TABLE IF NOT EXISTS ui_state (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
    // Every human interaction, for the agent's recent-interaction context and for debugging. Authoritative copies go to inbox.jsonl.
    db.run(`CREATE TABLE IF NOT EXISTS interactions (seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, actor TEXT NOT NULL, op TEXT NOT NULL, data TEXT NOT NULL)`);
  } },
  { version: 2, name: "control plane", up: (db) => {
    // A workflow is derived from the run (server/workflows.ts), so there is no workflow table: only what the owner chose or asked for is stored.
    db.run(`CREATE TABLE control_executors (id TEXT PRIMARY KEY, label TEXT NOT NULL, kind TEXT NOT NULL, provider TEXT, model TEXT, role TEXT, config TEXT NOT NULL DEFAULT '{}', economics TEXT NOT NULL DEFAULT '{}', source TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT`);
    // The owner's choice of implementation and executor for one capability (a lens). Absent row = no choice made.
    db.run(`CREATE TABLE control_bindings (capability TEXT PRIMARY KEY, implementation TEXT, executor_id TEXT, config TEXT NOT NULL DEFAULT '{}', set_by TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT`);
    // Only what the owner declared about a stage. Everything else in a task contract is derived from the run.
    db.run(`CREATE TABLE control_contracts (stage TEXT PRIMARY KEY, budget TEXT NOT NULL DEFAULT '{}', invariants TEXT NOT NULL DEFAULT '[]', executor_id TEXT, updated_at TEXT NOT NULL) STRICT`);
    db.run(`CREATE TABLE control_requests (seq INTEGER PRIMARY KEY AUTOINCREMENT, run TEXT NOT NULL, text TEXT NOT NULL, kind TEXT NOT NULL, capability TEXT, status TEXT NOT NULL, actor TEXT NOT NULL, refs TEXT NOT NULL DEFAULT '[]', facts TEXT NOT NULL DEFAULT '{}', note TEXT NOT NULL DEFAULT '', history TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT`);
    db.run(`CREATE INDEX control_requests_status ON control_requests (status)`);
    db.run(`CREATE TABLE control_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, status TEXT NOT NULL, evidence_refs TEXT NOT NULL DEFAULT '[]', reviewer TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT`);
    db.run(`CREATE INDEX control_reviews_subject ON control_reviews (subject_type, subject_id)`);
  } },
];
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export function openDb(file: string): Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file, { create: true, strict: true });
  db.run("PRAGMA journal_mode = WAL");       // the CLI and the server share this file
  db.run("PRAGMA busy_timeout = 3000");
  db.run("PRAGMA synchronous = NORMAL");
  migrate(db);
  return db;
}

// Ordered, one transaction, version stamped inside it: a failed step leaves the file at the last good version.
// A file written by a newer cockpit is left alone (every statement here is additive), never dropped.
export function migrate(db: Database) {
  const at = () => (db.query("PRAGMA user_version").get() as any).user_version as number;
  if (at() >= SCHEMA_VERSION) return;
  db.run("BEGIN IMMEDIATE");
  try {
    const from = at();
    for (const m of MIGRATIONS) if (m.version > from) { m.up(db); db.run(`PRAGMA user_version = ${m.version}`); }
    db.run("COMMIT");
  } catch (e) { db.run("ROLLBACK"); throw e; }
}

export const getMeta = (db: Database, k: string): string | null => (db.query("SELECT v FROM meta WHERE k = ?").get(k) as any)?.v ?? null;
export const setMeta = (db: Database, k: string, v: string) => db.query("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v").run(k, v);
export const getUi = <T>(db: Database, k: string): T | null => { const r = db.query("SELECT v FROM ui_state WHERE k = ?").get(k) as any; return r ? JSON.parse(r.v) : null; };
export const setUi = (db: Database, k: string, v: unknown) => db.query("INSERT INTO ui_state (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v").run(k, JSON.stringify(v));

export function pushEvent(db: Database, e: { channel: "process" | "cockpit"; type: string; subject?: string | null; data?: unknown; ts?: string }): number {
  const r = db.query("INSERT INTO events (ts, channel, type, subject, data) VALUES (?, ?, ?, ?, ?)").run(e.ts ?? new Date().toISOString(), e.channel, e.type, e.subject ?? null, JSON.stringify(e.data ?? {}));
  return Number(r.lastInsertRowid);
}

export function entities<T = any>(db: Database, kind: string): T[] {
  return (db.query("SELECT data FROM entities WHERE kind = ? ORDER BY ord").all(kind) as any[]).map((r) => JSON.parse(r.data));
}
export const entity = <T = any>(db: Database, kind: string, id: string): T | null => { const r = db.query("SELECT data FROM entities WHERE kind = ? AND id = ?").get(kind, id) as any; return r ? JSON.parse(r.data) : null; };

export function searchEntities(db: Database, q: string, limit = 12): { kind: string; id: string }[] {
  const terms = q.toLowerCase().match(/[a-z0-9]+/g);
  if (!terms) return [];
  return db.query("SELECT kind, id FROM search WHERE search MATCH ? ORDER BY rank LIMIT ?").all(terms.map((t) => `${t}*`).join(" "), limit) as any;
}
