# Product Actualizer. `just` lists recipes.
#
# The cockpit recipes act on the project you run them from (the directory that holds, or will hold, `actualize/`),
# so `cd ~/projects/my-product && just --justfile ~/projects/product-actualizer/justfile cockpit-up` works,
# or set PROJECT=<dir>. Set ACTUALIZE_BIN to use the compiled executable (`just build`) instead of the source checkout.

set shell := ["bash", "-euo", "pipefail", "-c"]

root    := justfile_directory()
project := env_var_or_default("PROJECT", invocation_directory())
cli     := env_var_or_default("ACTUALIZE_BIN", "bun " + root + "/hooks/src/cli.mjs")

# Tolerant overrides for command-line forms like `just websit=up` or `just website=up`
websit  := ""
website := ""

[private]
default:
    @if [ "{{websit}}" = "up" ] || [ "{{website}}" = "up" ]; then \
        just --justfile {{justfile()}} website-up; \
    elif [ "{{websit}}" = "down" ] || [ "{{website}}" = "down" ]; then \
        just --justfile {{justfile()}} website-down; \
    else \
        just --justfile {{justfile()}} --list --unsorted; \
    fi

# ---- the cockpit ------------------------------------------------------------------------------------------------

# Put the cockpit up for the project and open it in your browser (extra flags: --port N, --no-open, --print-url)
cockpit-up *flags:
    cd "{{project}}" && {{cli}} cockpit up {{flags}}

# Take the cockpit down. The run, the model, and the inbox are untouched; the workspace is kept for next time.
cockpit-down:
    cd "{{project}}" && {{cli}} cockpit down

# Is it up?
cockpit-status:
    cd "{{project}}" && {{cli}} cockpit status

# Re-open the page in your browser without restarting (the link carries a token that never leaves the server)
cockpit-open:
    cd "{{project}}" && {{cli}} cockpit open

# Down, then up again (picks up code changes in this checkout)
cockpit-restart *flags: cockpit-down
    cd "{{project}}" && {{cli}} cockpit up {{flags}}

# Forget the cockpit's workspace and projection; they rebuild from the run on the next start
cockpit-reset: cockpit-down
    cd "{{project}}" && {{cli}} cockpit reset

# What the agent sees of the cockpit right now
cockpit-context:
    cd "{{project}}" && {{cli}} ui context

# Owner responses waiting for the router
inbox:
    cd "{{project}}" && {{cli}} inbox

# ---- the website ------------------------------------------------------------------------------------------------

# Put the public website up and open it in your browser (extra flags: --port N, --no-open)
website-up *flags:
    cd "{{root}}" && bun website/serve.mjs up {{flags}}

# Take the website down
website-down:
    cd "{{root}}" && bun website/serve.mjs down

# Is the website up?
website-status:
    cd "{{root}}" && bun website/serve.mjs status

# Re-open the website in your browser without restarting
website-open:
    cd "{{root}}" && bun website/serve.mjs open

# Down, then up again
website-restart *flags: website-down
    cd "{{root}}" && bun website/serve.mjs up {{flags}}

alias website_up := website-up
alias website_down := website-down

# ---- development ------------------------------------------------------------------------------------------------

# Install dependencies
install:
    cd "{{root}}" && bun install

# Cockpit with hot reload against PROJECT (prints the link)
dev:
    cd "{{root}}" && COCKPIT_CWD="{{project}}" bun --hot cockpit/server/dev.ts

# Typecheck, all tests (hook engine, cockpit protocol/server/UI in a browser), and the walkthrough checks
test:
    cd "{{root}}" && bun run typecheck && bun test && python3 tests/check.py

# Single self-contained executable plus skills/ and product-model/ in dist/
build:
    cd "{{root}}" && bun run cockpit/build.ts
