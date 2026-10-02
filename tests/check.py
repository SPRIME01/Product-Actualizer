#!/usr/bin/env python3
"""Checks the system against its own rules. Standard library only.  Run: python3 tests/check.py"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIELDS = ["purpose", "actors", "capabilities", "constraints", "form", "voice", "positioning", "claims", "unknowns", "decisions"]
SECTIONS = ["Purpose", "Actors", "Capabilities", "Constraints", "Form and interaction", "Voice", "Positioning",
            "Claims ledger", "Unknowns", "Decision log"]
GRADES = {"OBSERVED", "VERIFIED", "REPORTED", "INFERRED", "PROPOSED", "UNKNOWN", "CONTRADICTED"}
PUBLIC = {"OBSERVED", "VERIFIED"}
errors = []


def err(msg):
    errors.append(msg)


def lines(path):
    return open(path, encoding="utf-8").read().split("\n")


def nlines(path):
    t = open(path, encoding="utf-8").read()
    return t.count("\n") + (0 if t.endswith("\n") or not t else 1)


def frontmatter(text):
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    fm = {}
    if m:
        for ln in m.group(1).split("\n"):
            if ":" in ln:
                k, v = ln.split(":", 1)
                fm[k.strip()] = v.strip()
    return fm, (text[m.end():] if m else text)


def lst(v):
    return [x.strip() for x in v.strip("[]").split(",") if x.strip()]


# ---------- system structure ----------
def check_system():
    if nlines(f"{ROOT}/product-model/SCHEMA.md") > 120:
        err("SCHEMA.md exceeds 120 lines")
    if not os.path.exists(f"{ROOT}/product-model/TEMPLATE.md"):
        err("TEMPLATE.md missing")
    router = f"{ROOT}/skills/actualize-product/SKILL.md"
    if nlines(router) > 40:
        err("router exceeds 40 lines")
    lenses = {}
    for p in sorted(glob.glob(f"{ROOT}/skills/*/SKILL.md")):
        name = os.path.basename(os.path.dirname(p))
        if name == "actualize-product":
            continue
        n = nlines(p)
        if not 60 <= n <= 100:
            err(f"{name}: {n} lines, need 60-100")
        fm, body = frontmatter(open(p, encoding="utf-8").read())
        for k in ("name", "description", "reads", "needs", "executes_with"):
            if k not in fm:
                err(f"{name}: frontmatter missing {k}")
        if fm.get("name") != name:
            err(f"{name}: frontmatter name mismatch")
        for h in ("## Reads from the model", "## Distinctions", "## Failure modes", "## Check", "## Writes to proposals"):
            if h not in body:
                err(f"{name}: missing section {h}")
        bad = [f for f in lst(fm.get("reads", "[]")) if f not in FIELDS]
        if bad:
            err(f"{name}: unknown reads fields {bad}")
        lenses[name] = lst(fm.get("needs", "[]"))
        chk = body.split("## Check")[1].split("## Writes")[0] if "## Check" in body else ""
        if not re.search(r"^\s*1\.", chk, re.M):
            err(f"{name}: Check has no numbered items")
    for n, needs in lenses.items():
        for d in needs:
            if d not in lenses:
                err(f"{n}: needs unknown lens {d}")
    # cycle check
    state = {}
    def visit(n):
        if state.get(n) == 1:
            err(f"needs cycle at {n}"); return
        if state.get(n) == 2:
            return
        state[n] = 1
        for d in lenses.get(n, []):
            visit(d)
        state[n] = 2
    for n in lenses:
        visit(n)
    return lenses


# ---------- model ----------
def table(section_text):
    rows = []
    for ln in section_text.split("\n"):
        if ln.startswith("|") and not re.match(r"^\|[-| ]+\|$", ln):
            rows.append([c.strip() for c in ln.strip().strip("|").split("|")])
    return rows[1:]  # drop header


def parse_model(path):
    text = open(path, encoding="utf-8").read()
    fm, body = frontmatter(text)
    heads = re.findall(r"^## (.+)$", body, re.M)
    parts = re.split(r"^## .+$", body, flags=re.M)[1:]
    return fm, heads, dict(zip(heads, parts))


def validate_model(path):
    tag = os.path.relpath(path, ROOT)
    fm, heads, sec = parse_model(path)
    mv = fm.get("model_version", "")
    if "product" not in fm or not mv.isdigit() or int(mv) < 1:
        err(f"{tag}: bad front matter")
        return None
    mv = int(mv)
    if heads != SECTIONS:
        err(f"{tag}: sections {heads} != {SECTIONS}")
        return None
    claims = {}
    for r in table(sec["Claims ledger"]):
        cid, text, grade, src = r
        if cid in claims: err(f"{tag}: duplicate claim {cid}")
        if grade not in GRADES: err(f"{tag}: {cid} bad grade {grade}")
        if grade != "UNKNOWN" and not src: err(f"{tag}: {cid} no source")
        claims[cid] = (text, grade, src)
    for cid, (text, grade, src) in claims.items():
        if grade == "INFERRED" and not all(x in claims for x in re.findall(r"C\d+", src)):
            err(f"{tag}: {cid} INFERRED cites missing parents")
        if grade == "CONTRADICTED" and len([s for s in src.split(";") if s.strip()]) < 2:
            err(f"{tag}: {cid} CONTRADICTED needs two sources")
    unknown_ids = {r[0] for r in table(sec["Unknowns"])}
    for cid, (t, g, s) in claims.items():
        if g == "UNKNOWN" and not any(cid in u for u in unknown_ids):
            err(f"{tag}: UNKNOWN claim {cid} lacks an Unknowns row")
    for r in table(sec["Capabilities"]):
        for c in re.findall(r"C\d+", r[2]):
            if c not in claims: err(f"{tag}: capability {r[0]} cites missing {c}")
    decs = []
    for i, r in enumerate(table(sec["Decision log"]), 1):
        n, dec, why, touched, ver = r
        if n != f"D{i}": err(f"{tag}: decision numbering at {n}, expected D{i}")
        if not ver.isdigit() or int(ver) > mv: err(f"{tag}: {n} version {ver} > model_version {mv}")
        decs.append((n, touched, int(ver)))
    if decs and max(d[2] for d in decs) != mv:
        err(f"{tag}: max decision version != model_version")
    return {"version": mv, "claims": claims, "decisions": decs}


# ---------- artifacts and staleness ----------
def touches(touched, reads, cites):
    toks = [t.strip() for t in touched.split(",")]
    for t in toks:
        if t == "all":
            return True
        if t.startswith("claims"):
            if "claims" in reads:
                ids = re.findall(r"C\d+", t)
                if not ids or any(i in cites for i in ids):
                    return True
        elif t in reads:
            return True
    return False


def artifact_state(path, models):
    text = open(path, encoding="utf-8").read()
    head = {}
    for ln in text.split("\n")[:8]:
        if ":" in ln and not ln.startswith("#"):
            k, v = ln.split(":", 1)
            head[k.strip()] = v.strip()
    m = re.match(r"model@(\d+)", head.get("built_from", ""))
    if not m:
        return None
    return int(m.group(1)), lst(head.get("reads", "[]")), lst(head.get("cites", "[]")), head.get("public") == "true", text


def check_walkthrough():
    wt = f"{ROOT}/tests/walkthrough"
    models = {}
    for v in (1, 2, 3, 4):
        r = validate_model(f"{wt}/model-v{v}.md")
        if r: models[v] = r
    cur = validate_model(f"{wt}/product-model.md")
    if open(f"{wt}/product-model.md").read() != open(f"{wt}/model-v4.md").read():
        err("product-model.md != model-v4.md")
    latest = max(models)
    stale = {}
    for path in sorted(glob.glob(f"{wt}/artifacts/*/*.md")) + sorted(glob.glob(f"{wt}/history/*.md")):
        st = artifact_state(path, models)
        tag = os.path.relpath(path, wt)
        if not st:
            err(f"{tag}: unstamped"); continue
        built, reads, cites, public, text = st
        if built not in models:
            err(f"{tag}: built_from model@{built} has no snapshot"); continue
        bad = [f for f in reads if f not in FIELDS]
        if bad: err(f"{tag}: bad reads {bad}")
        inline = set(re.findall(r"\[(C\d+)\]", text.split("\n\n", 1)[1] if "\n\n" in text else text))
        if inline != set(cites): err(f"{tag}: inline citations {sorted(inline)} != cites {sorted(cites)}")
        for c in cites:
            if c not in models[built]["claims"]:
                err(f"{tag}: cites missing {c}")
            elif public and models[built]["claims"][c][1] not in PUBLIC:
                err(f"{tag}: public artifact cites {c} graded {models[built]['claims'][c][1]} at model@{built}")
        newer = [d for d in models[latest]["decisions"] if d[2] > built]
        why = [d[0] for d in newer if touches(d[1], reads, cites)]
        stale[tag] = why
    return models, stale


def check_cleanup():
    if os.path.exists(f"{ROOT}/.tmp/ref"):
        err(".tmp/ref still exists")


if __name__ == "__main__":
    lenses = check_system()
    models, stale = check_walkthrough()
    check_cleanup()
    print(f"lenses: {len(lenses)}  models validated: {sorted(models)}")
    for a, w in stale.items():
        print(f"  {a}: {'STALE by ' + ', '.join(w) if w else 'current'}")
    if errors:
        print("\nFAIL")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    print("\nOK")
