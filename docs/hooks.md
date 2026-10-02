# Hooks: enforcing the process

Hooks make the process mandatory. They track a run's state and deny or block actions that skip steps. They have no
dependencies beyond Node and stay silent in any project that has no `actualize/` run.

## Supported clients

| client | mechanism | project scope file | user scope file |
|---|---|---|---|
| Claude Code | `settings.json` hooks | `.claude/settings.json` | `~/.claude/settings.json` |
| Codex | `hooks.json` | `.codex/hooks.json` | `~/.codex/hooks.json` |
| Cline | executable hook scripts | `.clinerules/hooks/` | `~/.cline/hooks/` |
| OpenCode | plugin | `.opencode/plugins/actualize.js` | `~/.config/opencode/plugins/` |
| Pi / Prime Agent | extension | `.prime/agent/extensions/actualize.ts` | `~/.prime/agent/extensions/` |

`pi`, `prime`, and `prime-agent` are the same adapter. Cline cannot veto task completion, so there the stop gate only reports. OpenCode and Pi / Prime cannot hard-block either; they send the blockers back as a follow-up message when the session goes idle. The pre-tool deny rules and context injection apply everywhere. Codex asks you to trust new hooks on first use: run `codex`, then `/hooks`.

## Install

```
node hooks/install.mjs --scope project --project <dir>     # one project
node hooks/install.mjs --scope user                        # everywhere; silent without a run
node hooks/install.mjs --client claude                     # one client (claude|codex|cline|opencode|pi|prime|all)
node hooks/install.mjs --dry-run | --status | --uninstall | --force
```

Installs are idempotent, back up any file they change, and touch only entries they manage. `--status` exits 1 if anything drifted.
An unmanaged file at the target path is left alone unless you pass `--force`.

## Run a governed process

```
hooks/bin/actualize begin --goal "closed-beta signup page" --bar beta
hooks/bin/actualize lenses                                  # descriptions, reads, needs; no bodies loaded
hooks/bin/actualize select --lenses recon-software,recon-physical,brand,marketing,release-readiness \
    --exclude motion-editorial="no video deliverable" --exclude audio-sound="no audio"
hooks/bin/actualize lens start recon-software               # opens the lens and its write scope
hooks/bin/actualize lens done recon-software
hooks/bin/actualize reconcile start                         # the only window where the model may be edited
hooks/bin/actualize reconcile done
hooks/bin/actualize status                                  # where you are and the next step
hooks/bin/actualize done                                    # requires a passing gate
```

Put `hooks/bin` on your PATH or call it by path. `begin` writes `actualize/state.json`; do not edit it by hand.

## What the hooks do

- **Session start and each prompt:** inject the run's status and next step.
- **Before a tool call (deny):**
  - `product-model.md` is writable only during `reconcile`.
  - `proposals.md` changes only during a lens run or reconciliation.
  - A lens writes only its own `artifacts/<lens>/` and `evidence/<lens>/`.
  - Artifacts must carry valid `built_from`, `reads`, and `cites`, and may not cite claims below `OBSERVED`/`VERIFIED` when public.
  - Product files change only inside a lens run (strict mode).
  - Lens bodies load only through `lens start` (progressive disclosure).
  - `state.json` and history are CLI-managed.
  - Flashing and erasing commands (esptool, idf.py flash, picotool, dfu-util, avrdude, west flash, nrfjprog, openocd program, upload targets, and similar) need a running physical lens and a preflight record in `evidence/<lens>/actions.md` (target, expected result, recovery). Irreversible steps (fuses, secure boot, OTP, locked erase) are denied for the owner to run after `pause`. Read-only commands are never blocked.
- **After a tool call:** feedback on what just changed.
- **Stop (block):** the agent cannot finish while lenses, reconciliation, stale artifacts, or the release gate are outstanding.

## Escape hatches

- Genuinely blocked on a question only you can answer: the agent runs `actualize pause --reason "<question>"`. The pause clears on your next prompt.
- Bad model edit: `actualize model restore` reverts to the last reconciled version.
- Looser rules: `begin --lenient` relaxes strict mode (product-file and lens-body rules).
- Inspect an end state: `actualize gate [--json]`.
- Debug a hook: set `ACTUALIZE_DEBUG=1`.

## Testing

```
node --test tests/hooks/
```

The suite replays the Loam walkthrough and the physical-AI Mote walkthrough through the engine, including denied writes, a rejected proposal, stale rebuilds, nested hardware evidence,
the physical lens chain, the flashing preflight rule, the stop-gate loop guard, and the pause escape. It exercises the engine directly, not a live client session.

## Troubleshooting

- Hook silently does nothing: no `actualize/state.json` at or above the working directory. Run `begin`, or set `ACTUALIZE_DIR`.
- "node hangs" in a script with a temporary `HOME`: a version-manager shim for `node` may stall. Call the real binary
  (`node -p process.execPath`).
