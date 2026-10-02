#!/usr/bin/env python3
"""Checks the system against its own rules. Standard library only.  Run: python3 tests/check.py"""
import glob, os, re, subprocess, sys, tempfile

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
    check_references(lenses)
    check_physical_chain(lenses)
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


PHYSICAL = ("electronics", "embedded-systems", "robotics")
SCENARIOS = {  # chosen lenses -> lenses satisfied by the model; the physical chain must close under `needs`
    "digital-only product": ({"recon-software", "marketing", "brand", "release-readiness"}, set(), set(PHYSICAL)),
    "passive physical product": ({"recon-physical", "release-readiness"}, set(), set(PHYSICAL)),
    "ESP32 sensor product": ({"recon-physical", "electronics", "embedded-systems", "release-readiness"}, set(), {"robotics"}),
    "Raspberry Pi voice device": ({"recon-physical", "embedded-systems", "release-readiness"}, {"electronics"}, {"robotics"}),
    "robot / physical AI": ({"recon-physical", "electronics", "embedded-systems", "robotics", "release-readiness"}, set(), set()),
    "ROS2 robot": ({"recon-physical", "robotics", "release-readiness"}, {"electronics", "embedded-systems"}, set()),
}


def check_references(lenses):
    """Progressive disclosure: references are linked from the lens body, exist, stay bounded, and are not duplicated inline."""
    for name in lenses:
        d = f"{ROOT}/skills/{name}"
        body = open(f"{d}/SKILL.md", encoding="utf-8").read()
        refs = sorted(glob.glob(f"{d}/references/*.md"))
        linked = set(re.findall(r"references/([\w.-]+\.md)", body))
        for r in refs:
            base = os.path.basename(r)
            if base not in linked:
                err(f"{name}: references/{base} is not linked from SKILL.md")
            if nlines(r) > 150:
                err(f"{name}: references/{base} has {nlines(r)} lines, max 150")
        for base in linked:
            if not os.path.exists(f"{d}/references/{base}"):
                err(f"{name}: SKILL.md links missing references/{base}")


def check_physical_chain(lenses):
    needs = lenses
    if "recon-physical" not in needs.get("electronics", []):
        err("electronics must need recon-physical")
    if "electronics" not in needs.get("embedded-systems", []):
        err("embedded-systems must need electronics")
    if "embedded-systems" not in needs.get("robotics", []):
        err("robotics must need embedded-systems")
    for n in PHYSICAL:
        body = open(f"{ROOT}/skills/{n}/SKILL.md", encoding="utf-8").read()
        if "PHYSICAL-PREFLIGHT.md" not in body:
            err(f"{n}: does not point to product-model/PHYSICAL-PREFLIGHT.md")
    if "only when ROS is present" not in open(f"{ROOT}/skills/robotics/SKILL.md", encoding="utf-8").read():
        err("robotics: ROS knowledge must be marked as loaded only when ROS is present")
    if not os.path.exists(f"{ROOT}/skills/robotics/references/ros2.md"):
        err("robotics: references/ros2.md missing")
    router = open(f"{ROOT}/skills/actualize-product/SKILL.md", encoding="utf-8").read()
    if "PHYSICAL-PREFLIGHT.md" not in router:
        err("router does not enforce the physical action preflight")
    for sc, (chosen, satisfied, excluded) in SCENARIOS.items():
        for n in chosen:
            for d in needs.get(n, []):
                if d not in chosen and d not in satisfied:
                    err(f"scenario '{sc}': {n} needs {d}, which is neither chosen nor satisfied")
        for n in excluded:
            if n in chosen:
                err(f"scenario '{sc}': {n} must not be selected")


# ---------- minimal YAML subset (mappings, lists, lists of mappings, inline lists, scalars) ----------
def parse_yaml(text):
    toks = []
    for raw in text.split("\n"):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        toks.append((len(raw) - len(raw.lstrip(" ")), raw.strip()))
    pos = [0]

    def scalar(s):
        s = s.strip()
        if s.startswith("[") and s.endswith("]"):
            return [x.strip() for x in s[1:-1].split(",") if x.strip()]
        return s

    def block(indent):
        if pos[0] >= len(toks):
            return None
        if toks[pos[0]][1].startswith("- "):
            out = []
            while pos[0] < len(toks) and toks[pos[0]][0] == indent and toks[pos[0]][1].startswith("- "):
                ind, line = toks[pos[0]]
                rest = line[2:]
                if re.match(r"^[\w.-]+:( |$)", rest):
                    toks[pos[0]] = (ind + 2, rest)
                    out.append(block(ind + 2))
                else:
                    out.append(scalar(rest))
                    pos[0] += 1
            return out
        out = {}
        while pos[0] < len(toks) and toks[pos[0]][0] == indent and not toks[pos[0]][1].startswith("- "):
            ind, line = toks[pos[0]]
            k, _, v = line.partition(":")
            pos[0] += 1
            v = v.strip()
            if v:
                out[k.strip()] = scalar(v)
            elif pos[0] < len(toks) and toks[pos[0]][0] > ind:
                out[k.strip()] = block(toks[pos[0]][0])
            else:
                out[k.strip()] = ""
        return out

    return block(0)


CLASSES = {"recommended", "absolute_max", "typical", "guaranteed", "measured"}
IDENT = ("manufacturer", "model", "revision", "package", "level")


def table_rows(text):
    rows = [[c.strip() for c in ln.strip().strip("|").split("|")] for ln in text.split("\n") if ln.startswith("|") and not re.match(r"^\|[-| ]+\|$", ln)]
    return rows[0], rows[1:]


def check_hardware(wt, final):
    """Hardware evidence package: manifest, revision contradictions, component profiles and sources, grade discipline."""
    hw = f"{wt}/evidence/recon-physical/hardware"
    tag = os.path.relpath(hw, ROOT)
    if not os.path.isdir(hw):
        return
    man = parse_yaml(open(f"{hw}/manifest.yaml", encoding="utf-8").read())
    unit_rev = man["unit"].get("hardware_revision", "")
    for f in ("system-map.md", "power-tree.md", "buses.md", "wiring.md"):
        if not os.path.exists(f"{hw}/{f}"):
            err(f"{tag}: {f} missing")
    contradicted_in_manifest = set()
    mentioned = set()
    for c in man.get("contradictions", []):
        mentioned.update(os.path.basename(a) for a in c["artifacts"])
        for cl in c["claims"]:
            if cl not in final["claims"]:
                err(f"{tag}: contradiction {c['id']} cites missing claim {cl}"); continue
            grade = final["claims"][cl][1]
            if c["state"] == "open" and grade != "CONTRADICTED":
                err(f"{tag}: {c['id']} is open but {cl} is graded {grade}")
            if c["state"] == "resolved" and grade == "CONTRADICTED":
                err(f"{tag}: {c['id']} is resolved but {cl} is still CONTRADICTED")
            if c["state"] == "resolved" and not c.get("resolution"):
                err(f"{tag}: {c['id']} resolved without a resolution")
            if grade == "CONTRADICTED":
                contradicted_in_manifest.add(cl)
    for cid, (text, grade, src) in final["claims"].items():
        if grade == "CONTRADICTED" and re.search(r"(hardware|unit)/", src) and cid not in contradicted_in_manifest:
            err(f"{tag}: hardware contradiction {cid} is not recorded in the manifest")
    for r in man.get("revisions", []):
        for k in ("kind", "file", "revision", "matches_unit"):
            if k not in r:
                err(f"{tag}: revision entry missing {k}: {r}")
        if r.get("matches_unit") not in ("yes", "no", "unknown"):
            err(f"{tag}: bad matches_unit for {r.get('kind')}")
        if not os.path.exists(f"{ROOT}/{r.get('file','')}"):
            err(f"{tag}: revision file {r.get('file')} does not exist")
        known = unit_rev and r.get("revision", "").strip().upper() not in ("", "UNKNOWN")
        if known and r["revision"].strip().upper() == unit_rev.upper() and r["matches_unit"] == "no":
            err(f"{tag}: {r['kind']} has the unit's revision but is marked as not matching")
        if r.get("matches_unit") == "no" and os.path.basename(r["file"]) not in mentioned:
            err(f"{tag}: mismatched revision artifact {os.path.basename(r['file'])} is not part of any recorded contradiction")
    if man.get("unreconciled") == "true" and not any(c["state"] == "open" for c in man["contradictions"]):
        err(f"{tag}: unreconciled but no open contradiction")
    for comp in man.get("components", []):
        d = f"{hw}/components/{comp}"
        if not (os.path.exists(f"{d}/profile.yaml") and os.path.exists(f"{d}/sources.md")):
            err(f"{tag}: component {comp} lacks profile.yaml or sources.md"); continue
        prof = parse_yaml(open(f"{d}/profile.yaml", encoding="utf-8").read())
        head, srows = table_rows(open(f"{d}/sources.md", encoding="utf-8").read())
        if head != ["id", "document", "type", "revision/date", "covers revisions", "authority", "location", "pages used"]:
            err(f"{tag}/{comp}: sources.md header {head}")
        sids = set()
        for r in srows:
            sids.add(r[0])
            if not (r[5].isdigit() and 1 <= int(r[5]) <= 10):
                err(f"{tag}/{comp}: source {r[0]} authority must be 1-10")
            loc = r[6]
            if loc.startswith("tests/") and not os.path.exists(f"{ROOT}/{loc}"):
                err(f"{tag}/{comp}: source {r[0]} location {loc} does not exist")
        for k in ("component", "identity", "role", "sources", "limits", "interfaces", "physical", "operational", "unknowns"):
            if k not in prof:
                err(f"{tag}/{comp}: profile missing {k}")
        if prof.get("component") != comp:
            err(f"{tag}/{comp}: component name mismatch")
        ident = prof.get("identity", {})
        for k in IDENT:
            if not ident.get(k):
                err(f"{tag}/{comp}: identity.{k} missing")
        if any(str(ident.get(k, "")).lower() == "unknown" for k in IDENT) and not prof.get("unknowns"):
            err(f"{tag}/{comp}: identity has unknown fields but no unknowns entry")
        for s in prof.get("sources", []):
            if s not in sids:
                err(f"{tag}/{comp}: profile source {s} not in sources.md")
        for lim in prof.get("limits", []):
            if lim.get("class") not in CLASSES:
                err(f"{tag}/{comp}: limit '{lim.get('param')}' lacks a valid class")
            for sid in re.findall(r"\bS\d+\b", lim.get("src", "")):
                if sid not in sids:
                    err(f"{tag}/{comp}: limit '{lim.get('param')}' cites {sid}, not in sources.md")
            if not lim.get("src"):
                err(f"{tag}/{comp}: limit '{lim.get('param')}' has no src")
        for q in prof.get("quirks", []):
            if not q.get("src"):
                err(f"{tag}/{comp}: quirk without a source")


def run(cmd, cwd=ROOT, env=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env=env)


def check_executed_evidence(wt, final):
    """Re-run the executed evidence: calculations reproduce the claims; the static checker can fail and can pass."""
    ev = f"{wt}/evidence"
    budget, pin = f"{ev}/electronics/budget.py", f"{ev}/embedded-systems/pincheck.py"
    if not (os.path.exists(budget) and os.path.exists(pin)):
        return
    r = run([sys.executable, budget])
    claims = {v[0]: v for v in final["claims"].values()}
    pwr = next((v for v in final["claims"].values() if v[0].startswith("Budgeted by state")), None)
    for num in ("2.76", "3.06", "3.36", "2.00"):
        if num not in r.stdout:
            err(f"budget.py output lacks {num}")
        if pwr and num not in pwr[0]:
            err(f"power budget claim lacks {num} from budget.py")
    if "EXCEEDS" not in r.stdout:
        err("budget.py shows no state exceeding the supply")
    r = run([sys.executable, pin])
    n = len([ln for ln in r.stdout.splitlines() if "CONFLICT" in ln or "UNCONNECTED" in ln or "never driven" in ln])
    if r.returncode != 1 or n != 5:
        err(f"pincheck.py on the REV B pin map: expected exit 1 and 5 findings, got exit {r.returncode} and {n}")
    fix = next((v for v in final["claims"].values() if v[0].startswith("Comparing the firmware pin map")), None)
    if fix and "5 findings" not in fix[2]:
        err("pin check claim does not record 5 findings")
    # negative control: a REV C pin map and a firmware that drives SERVO_EN must pass
    with tempfile.TemporaryDirectory() as td:
        os.makedirs(f"{td}/fw")
        open(f"{td}/fw/config.py", "w").write("PAN_PIN = 12\nTILT_PIN = 13\nI2C_SDA = 10\nI2C_SCL = 11\nUART_TX = 0\nUART_RX = 1\n")
        open(f"{td}/fw/main.py", "w").write("servo_en = Pin(14, Pin.OUT)\n")
        sch = f"{ROOT}/tests/fixture-mote/hardware/schematic-revC.txt"
        r = run([sys.executable, pin, f"{td}/fw/config.py", sch, f"{td}/fw"])
        if r.returncode != 0:
            err("pincheck.py fails a correct REV C pin map (the check cannot pass)")
    r = run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-t", "."], cwd=f"{ROOT}/tests/fixture-mote/host")
    if r.returncode != 0 or "Ran 3 tests" not in r.stderr:
        err("host unit tests do not pass as claimed (3 tests)")


def check_grades(tag, m):
    """Grade discipline: VERIFIED needs a test or a named owner; calculations are never observed; documents alone do not verify."""
    for cid, (text, grade, src) in m["claims"].items():
        if grade == "VERIFIED" and not re.search(r"(^|; )(test:|owner:)", src):
            err(f"{tag}: {cid} is VERIFIED without a test or owner source")
        if grade in PUBLIC and re.search(r"evidence/electronics/", src):
            err(f"{tag}: {cid} is {grade} but rests on a calculation")
        if grade == "VERIFIED" and re.search(r"datasheet|\.md:\d", src) and not re.search(r"(test:|owner:)", src):
            err(f"{tag}: {cid} VERIFIED from a document alone")


GATE_VERDICTS = {"go", "no-go", "defer", "go-with-exception"}


def gate_errors(text):
    """A release verdict of go cannot stand on physical claims that were never exercised on the unit."""
    es = []
    m = re.search(r"^verdict:\s*(\S+)", text, re.M)
    if not m or m.group(1) not in GATE_VERDICTS:
        es.append("gate has no valid verdict")
        return es
    rows = re.findall(r"^\| *(PHY\d+) *\|(.*)$", text, re.M)
    for pid, rest in rows:
        cells = [c.strip() for c in rest.split("|")]
        # claim | required test | evidence kind | exercised on the unit | result
        if len(cells) < 5:
            es.append(f"{pid}: malformed row"); continue
        exercised, kind, result = cells[3], cells[2], cells[4]
        if exercised not in ("yes", "no"):
            es.append(f"{pid}: exercised must be yes or no")
        if result not in ("pass", "fail", "none"):
            es.append(f"{pid}: result must be pass, fail, or none")
        if exercised == "yes" and kind in ("build", "simulation", "schematic", "render", "documentation", "mock", "calculation"):
            es.append(f"{pid}: exercised is yes but the evidence kind is {kind}")
        if exercised == "no" and result != "none":
            es.append(f"{pid}: a result without an exercise")
        if m.group(1).startswith("go") and (exercised != "yes" or result != "pass"):
            es.append(f"{pid}: verdict {m.group(1)} with a physical claim not passed on the unit")
    return es


def check_gate(wt):
    g = f"{wt}/artifacts/release-readiness/gate.md"
    if not os.path.exists(g):
        return
    text = open(g, encoding="utf-8").read()
    for e in gate_errors(text):
        err(f"gate: {e}")
    if "PHY1" in text:
        # negative controls: the checker must be able to fail
        if not gate_errors(re.sub(r"^verdict:.*$", "verdict: go", text, flags=re.M)):
            err("gate check cannot fail: verdict go with unexercised physical claims passed")
        mutated = text.replace("| documentation | no | none |", "| documentation | yes | pass |", 1)
        if not any("evidence kind" in e for e in gate_errors(mutated)):
            err("gate check cannot fail: documentation accepted as a physical exercise")


def decision_lens_coverage(tag, m, lenses):
    """Every lens must be selected, satisfied, or excluded with a reason in the selection decision."""
    d3 = next((d for d in m["decision_text"] if d.startswith("Lenses:")), None)
    if d3 is None:
        err(f"{tag}: no selection decision")
        return
    for n in lenses:
        if n not in d3:
            err(f"{tag}: selection decision does not mention lens {n}")


def check_walkthrough(wt, lenses):
    models = {}
    versions = sorted(int(re.search(r"model-v(\d+)\.md", p).group(1)) for p in glob.glob(f"{wt}/model-v*.md"))
    for v in versions:
        r = validate_model(f"{wt}/model-v{v}.md")
        if r:
            models[v] = r
            r["decision_text"] = [x[1] for x in table(parse_model(f"{wt}/model-v{v}.md")[2]["Decision log"])]
            check_grades(f"{os.path.relpath(wt, ROOT)}/model-v{v}.md", r)
    validate_model(f"{wt}/product-model.md")
    if open(f"{wt}/product-model.md").read() != open(f"{wt}/model-v{max(versions)}.md").read():
        err(f"{os.path.relpath(wt, ROOT)}: product-model.md != model-v{max(versions)}.md")
    latest = max(models)
    decision_lens_coverage(os.path.relpath(wt, ROOT), models[1], lenses)
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
        lens = os.path.basename(os.path.dirname(path))
        if lens in lenses:
            lens_reads = lst(frontmatter(open(f"{ROOT}/skills/{lens}/SKILL.md", encoding="utf-8").read())[0].get("reads", "[]"))
            extra = [f for f in reads if f not in lens_reads]
            if extra: err(f"{tag}: reads {extra} beyond what the {lens} lens may read")
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
    check_hardware(wt, models[latest])
    check_executed_evidence(wt, models[latest])
    check_gate(wt)
    return models, stale


EXPECT_STALE = {
    "walkthrough": {"history/beta-page@2.md": ["D10"], "artifacts/marketing/beta-page.md": [], "artifacts/brand/identity.md": [], "artifacts/provenance-licensing/ledger.md": []},
    "walkthrough-mote": {"history/electrical-review@2.md": ["D7"], "history/bringup@3.md": ["D7"], "artifacts/electronics/electrical-review.md": [],
                         "artifacts/embedded-systems/bringup.md": [], "artifacts/robotics/behavior-envelope.md": [], "artifacts/marketing/spec-sheet.md": [],
                         "artifacts/release-readiness/gate.md": [], "history/spec-sheet@4.md": []},
}


def negative_controls(final):
    """The hardware checks must be able to fail: mutate a copy of the physical walkthrough and require each mutation to be caught."""
    import shutil
    src = f"{ROOT}/tests/walkthrough-mote"
    mutations = [
        ("an artifact of another revision dropped from every contradiction",
         "evidence/recon-physical/hardware/manifest.yaml", lambda s: s.replace("artifacts: [assembly-guide-revB.md, bom-revB.csv, neck-boot.log, schematic-revC.txt]", "artifacts: [schematic-revC.txt]"),
         "not part of any recorded contradiction"),
        ("a resolved contradiction whose claim is still contradicted",
         "evidence/recon-physical/hardware/manifest.yaml", lambda s: s.replace("    claims: [C52]\n    state: open", "    claims: [C52]\n    state: resolved\n    resolution: pretend"),
         "is resolved but"),
        ("a limit with no class",
         "evidence/recon-physical/hardware/components/servo-pan-tilt/profile.yaml", lambda s: s.replace("    class: absolute_max\n", "", 1),
         "lacks a valid class"),
        ("a limit citing a source that is not in sources.md",
         "evidence/recon-physical/hardware/components/amp/profile.yaml", lambda s: s.replace("src: S1 L6", "src: S9 L6", 1),
         "not in sources.md"),
        ("an unknown identity with no unknowns entry",
         "evidence/recon-physical/hardware/components/thp/profile.yaml", lambda s: re.sub(r"unknowns:\n(  .*\n)+$", "unknowns:\n", s),
         "no unknowns entry"),
        ("a revision artifact with the unit's revision marked as not matching",
         "evidence/recon-physical/hardware/manifest.yaml", lambda s: s.replace("    revision: C\n    matches_unit: yes\n  - kind: cad", "    revision: C\n    matches_unit: no\n  - kind: cad", 1),
         "has the unit's revision but is marked as not matching"),
    ]
    for label, rel, fn, expect in mutations:
        with tempfile.TemporaryDirectory() as td:
            dst = f"{td}/walkthrough-mote"
            shutil.copytree(src, dst)
            path = f"{dst}/{rel}"
            before = open(path).read()
            after = fn(before)
            if after == before:
                err(f"negative control '{label}' did not change the file"); continue
            open(path, "w").write(after)
            saved = list(errors)
            errors.clear()
            check_hardware(dst, final)
            caught = [e for e in errors if expect in e]
            errors[:] = saved
            if not caught:
                err(f"negative control '{label}' was not caught by check_hardware")


def check_cleanup():
    if os.path.exists(f"{ROOT}/.tmp/ref"):
        err(".tmp/ref still exists")


if __name__ == "__main__":
    lenses = check_system()
    print(f"lenses: {len(lenses)}")
    for name in ("walkthrough", "walkthrough-mote"):
        wt = f"{ROOT}/tests/{name}"
        if not os.path.isdir(wt):
            err(f"{name} missing"); continue
        models, stale = check_walkthrough(wt, lenses)
        if name == "walkthrough-mote":
            negative_controls(models[max(models)])
        print(f"{name}: models validated {sorted(models)}")
        for a, w in stale.items():
            print(f"  {a}: {'STALE by ' + ', '.join(w) if w else 'current'}")
        for a, w in EXPECT_STALE.get(name, {}).items():
            if stale.get(a) != w:
                err(f"{name}/{a}: expected staleness {w}, got {stale.get(a)}")
    check_cleanup()
    if errors:
        print("\nFAIL")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    print("\nOK")
