// SQLite is the cockpit's operational store: an indexed projection of the run plus the UI's own state.
// It is disposable. Delete the file and `rebuild()` regenerates every projection row from the run directory;
// the Product Model, proposals, artifacts, evidence, the event log, and the inbox stay authoritative on disk.
import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = 1;

export function openDb(file: string): Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file, { create: true, strict: true });
  db.run("PRAGMA journal_mode = WAL");       // the CLI and the server share this file
  db.run("PRAGMA busy_timeout = 3000");
  db.run("PRAGMA synchronous = NORMAL");
  const v = (db.query("PRAGMA user_version").get() as any).user_version as number;
  if (v !== SCHEMA_VERSION) {
    // Nothing here is authoritative, so a schema change drops and rebuilds rather than migrating.
    for (const t of ["meta", "entities", "search", "events", "ui_state", "interactions"]) db.run(`DROP TABLE IF EXISTS ${t}`);
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
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
  return db;
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
