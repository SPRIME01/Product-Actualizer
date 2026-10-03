// Local git as a read-only timeline for the run directory. The run's own log says *what the process did*; git, when the run directory is in a
// repository, says *when a file's content actually changed and who committed it*. That fills gaps the log has (a model version's settlement
// time when the log is missing, the order in which an experiment's criterion and its results were written) without a new store.
//
// Only read commands run (rev-parse, log, show). Nothing is fetched, pulled, committed, or written, and with no repository every question
// answers `null` and the caller says "not recorded". A history that cannot be read is reported as unavailable, never guessed.
export type Commit = { sha: string; short: string; ts: string; author: string; subject: string };

const run = (cwd: string, args: string[], timeoutMs = 4000): string | null => {
  try {
    const r = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe", timeout: timeoutMs, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" } });
    return r.exitCode === 0 ? r.stdout.toString() : null;
  } catch { return null; }
};

const memo = new Map<string, boolean>();
export function inRepo(dir: string): boolean {
  if (!memo.has(dir)) memo.set(dir, run(dir, ["rev-parse", "--is-inside-work-tree"])?.trim() === "true");
  return memo.get(dir)!;
}
export const forgetRepo = () => memo.clear();

const FMT = "%H%x1f%cI%x1f%an%x1f%s";
const parse = (out: string | null): Commit[] => (out ?? "").split("\n").filter(Boolean).map((l) => { const [sha, ts, author, subject] = l.split("\x1f"); return { sha, short: sha.slice(0, 7), ts, author, subject }; });

// Commits that touched a path under `dir`, newest first (or oldest first with `oldest`).
export function logOf(dir: string, rel: string | null, o: { limit?: number; oldest?: boolean } = {}): Commit[] | null {
  if (!inRepo(dir)) return null;
  const out = run(dir, ["log", `--format=${FMT}`, `-n${o.limit ?? 40}`, ...(o.oldest ? ["--reverse"] : []), "--", rel ?? "."]);
  return out === null ? null : parse(out);
}
// The commit that first added a path: its first appearance in history.
export function firstCommit(dir: string, rel: string): Commit | null {
  if (!inRepo(dir)) return null;
  const out = run(dir, ["log", `--format=${FMT}`, "--diff-filter=A", "--", rel]);
  const all = parse(out);
  return all.length ? all[all.length - 1] : null;
}
// A file as it was at a commit; null if git cannot say.
export function blobAt(dir: string, sha: string, rel: string): string | null {
  if (!inRepo(dir)) return null;
  const prefix = (run(dir, ["rev-parse", "--show-prefix"]) ?? "").trim();
  return run(dir, ["show", `${sha}:${prefix}${rel}`]);
}
// Commits for a file, oldest first, each with the file as it was then. Bounded: an experiment file is small and has a short history.
export function revisions(dir: string, rel: string, limit = 12): { commit: Commit; text: string }[] | null {
  const cs = logOf(dir, rel, { limit, oldest: true }); if (cs === null) return null;
  const out: { commit: Commit; text: string }[] = [];
  for (const c of cs) { const t = blobAt(dir, c.sha, rel); if (t !== null) out.push({ commit: c, text: t }); }
  return out;
}
