# Why there is exactly one runtime

An explanation page. It answers *why* this repository targets Bun alone with no Node fallback, what the
in-process clients force on the engine's imports, and what the decision costs. For the install and runtime
mechanics read [`../hooks.md`](../hooks.md) and [`../reference/cli.md`](../reference/cli.md).

Marked **VERIFIED** (written in this repository) or **INFERRED** (my reading of a consequence nobody stated).

## The constraint that decides it

Two of the five supported clients run the engine **inside their own host process**, not as a subprocess:

- `hooks/clients/opencode/actualize.js:1` — "OpenCode plugin: runs the actualize engine in-process", importing
  `../../src/engine.mjs` directly and blocking a tool call by throwing (`:10-15`).
- `hooks/clients/prime/actualize.ts:1` — "Prime Agent / Pi extension: runs the actualize engine in-process",
  the same import and the same `handle()` calls (`:5`, `:24-26`).

The plugin is not something the client shells out to; it is a module the client loads. So the engine and its
libraries must import nothing the host runtime does not already provide. The rule the repository states:

> The in-process clients (OpenCode, Pi / Prime) run the engine inside the host's own runtime, so the engine and
> its libraries use only `node:` modules that both Bun and Node provide; Bun-specific code lives in the CLI and
> the cockpit.

(`docs/hooks.md:87`). The code matches: across `hooks/src/`, `hooks/adapters/`, and `hooks/clients/`, the only
`Bun` references are `cli.mjs:48` (`Bun.stdin.text()` / `Bun.sleep()` for the idle-bounded stdin read) and
`store.mjs:9`. `engine.mjs`, `process.mjs`, `lenses.mjs`, `md.mjs`, and the adapters import `node:fs`,
`node:path`, `node:os`, `node:crypto`, `node:url`. VERIFIED.

INFERRED: this is why there is one runtime rather than two. A Node-portable engine plus a Node implementation
of the CLI would double the surface the tests must cover, and the two in-process clients would still not be
exercising it.

## The shim, and the deliberate fail-open

`hooks/bin/actualize` is a 14-line POSIX `sh` script. It resolves its own symlinks (`:3-7`), then:

```sh
if ! command -v bun >/dev/null 2>&1; then
  echo "actualize: Bun >= 1.4 is required and was not found on PATH (https://bun.sh). Hooks are inactive until it is installed." >&2
  [ "$1" = "hook" ] && exit 0
  exit 127
fi
exec bun "$(cd "$(dirname "$SELF")/../src" && pwd)/cli.mjs" "$@"
```

(`hooks/bin/actualize:8-14`). The two exit codes differ on purpose, with the reason in the comment at `:9`:
"A hook must not brick the agent client: say why once on stderr and fail open. Every other command fails
loudly." A hook runs on every tool call inside somebody's editor; failing it closed would break the session over
a missing binary. A person typing `actualize status` should be told the truth.

Both branches are tested end to end through the real installed entry point with `PATH=/usr/bin:/bin`: the hook
case expects exit 0, empty stdout, and stderr matching `/Bun >= 1\.4 is required/`; the `actualize status` case
expects exit 127 and stderr matching `/bun\.sh/` (`tests/cockpit/hooks-bun.test.ts`, describe block "Bun is
required, and its absence is clear"). VERIFIED.

The installer checks the same thing before it writes anything. `runtimeProblem()` returns a string for a missing
or too-old Bun, and separately for a Bun that exists but "is not on PATH, so client-launched hooks cannot start
it" (`hooks/install.mjs:27-34`); `main` refuses to install with exit 2 but still prints it as a note under
`--status` and `--dry-run` (`:55-57`), and `--status` exits 1 on drift (`:67`). VERIFIED.

The rule is also enforced across the repository. `check.py` requires `"bun": ">=1.4.0"` in `package.json`
(`tests/check.py:613-615`) and then walks every `.md`, `.mjs`, `.ts`, `.tsx`, `.js`, `.json`, `.py`, `.yaml`,
and `.sh` file, failing any line matching its "invokes Node" pattern — a `node` invocation with a test flag, an
inline expression, a script path, or `hooks/`/`tests/`, plus the `env node` and `exec node` shebang forms — with
`"<file>: still invokes Node (…); the runtime is Bun"` (`tests/check.py:616-631`; the literal pattern is in the
checker, and quoting it here would trip the checker itself). The walkthrough fixtures, `.tmp`,
`PROVENANCE.md`, and `check.py` itself are skipped.

## What it costs

1. **A bun-less machine gets silently inert hooks.** Exit 0, one stderr line, no enforcement. This is the
   accepted price of not bricking a client, and it is the first item in the troubleshooting list
   (`docs/hooks.md:86`). INFERRED: it is a real hole — a run can proceed with nothing enforcing the process,
   and the failure mode looks like the system not caring.
2. **No Node fallback anywhere.** `docs/hooks.md:72` states it flatly: "there is no Node implementation."
3. **The cockpit cannot be Node-hosted at all.** It uses `Bun.serve` and `Bun.spawn` with no framework
   (`cockpit/server/serve.ts:1,45,128`), imports `bun:sqlite` (`cockpit/server/db.ts:4`), and the dev server
   imports the SPA as an HTML module (`cockpit/server/dev.ts:2`).

## The mitigation: a compiled executable

`bun run build` → `cockpit/build.ts` produces a release directory:

> one self-contained executable (Bun runtime, process CLI, hook entry, cockpit server, and the bundled SPA),
> laid out with the markdown the agents read … `dist/bin/actualize` `dist/skills/` `dist/product-model/`. The
> binary has no node_modules and needs no Bun on the target machine. Hooks installed from it point at the
> binary itself.

(`cockpit/build.ts:1-4`; the build is `Bun.spawnSync` of `build --compile --minify` over
`hooks/src/cli.mjs`, then `fs.cpSync` of `skills/` and `product-model/` (`:16-19`)). The Bun dependency is
paid once, at build time, on the maintainer's machine — not on the target.

This is where the compiled/source split is detected, and the boundary is worth being precise about, because it
is the one place the "only `node:` modules" rule has to bend:

```js
export const IS_COMPILED = typeof globalThis.Bun !== "undefined" && String(globalThis.Bun.main ?? "").startsWith("/$bunfs");
export const REPO_ROOT = IS_COMPILED ? path.resolve(process.env.ACTUALIZE_HOME ?? path.join(path.dirname(process.execPath), "..")) : path.resolve(HOOKS_ROOT, "..");
export const CLI_PATH = IS_COMPILED ? process.execPath : path.join(HOOKS_ROOT, "src", "cli.mjs");
```

(`hooks/src/lib/store.mjs:9-12`). `globalThis.Bun` is reached behind a `typeof` guard, so the expression is safe
under a runtime with no `Bun`; the detection is that Bun's `main` for a `bun build --compile` binary lives under
the virtual `/$bunfs` path (comment at `:7-8`). When compiled, the binary is its own CLI path and `skills/` and
`product-model/` resolve relative to `process.execPath`, or `ACTUALIZE_HOME` if set. Adapters follow: `BIN` is
`process.execPath` when compiled, else the shim (`hooks/adapters/common.mjs:7`), and `runtimeProblem()` returns
`null` immediately when compiled because "the single executable carries its own runtime"
(`hooks/install.mjs:28`). VERIFIED.

`cli.mjs:48`'s `Bun.stdin` is the other exception, and a comfortable one: the CLI runs only under Bun — launched
by the shim, or as the compiled binary — never inside a host.

## A documentation defect, recorded rather than silently fixed

`docs/hooks.md:3-4` currently says the hooks "have no dependencies beyond Node". `docs/hooks.md:72` in the same
file says the shim "execs `bun hooks/src/cli.mjs`; there is no Node implementation". The two cannot both
describe this repository. The first is a leftover; the second, the enforcement in `check.py:616-631`, the
`engines` block (`package.json:5-7`), and `AGENTS.md:4` all agree.

The correct statement is: **Bun >= 1.4, no runtime dependencies, no Node implementation.** I have not edited
`docs/hooks.md`; this page records the contradiction and which side is correct.

### Source trail

- In-process clients: `hooks/clients/opencode/actualize.js:1,10-15`; `hooks/clients/prime/actualize.ts:1,5,24-26`.
- The stated import rule: `docs/hooks.md:87`; the only Bun references under `hooks/`: `hooks/src/cli.mjs:48`, `hooks/src/lib/store.mjs:9`.
- Shim and its two exit codes: `hooks/bin/actualize:1-14` (comment at `:9`, branches at `:11-12`).
- Fail-open and fail-loud tests: `tests/cockpit/hooks-bun.test.ts`, describe "Bun is required, and its absence is clear".
- Installer runtime check: `hooks/install.mjs:27-34,55-57,67`.
- Compiled binary: `cockpit/build.ts:1-4,16-19`; `hooks/adapters/common.mjs:7`; `hooks/src/lib/store.mjs:7-12`.
- Bun-only enforcement: `tests/check.py:613-631`; `package.json:5-7`; `AGENTS.md:4`.
- Cockpit runtime surface: `cockpit/server/serve.ts:1,45,128`; `cockpit/server/db.ts:4`; `cockpit/server/dev.ts:2`.
- Documentation contradiction: `docs/hooks.md:3-4` versus `docs/hooks.md:72`.
