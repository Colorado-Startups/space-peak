#!/usr/bin/env python3
"""space_peak_claims.py: the fact guardrail for Space Peak.

Rules source, in precedence order:
  1. Code-OS rules/writing-and-gates.md   canonical for gate design, wins
  2. 02_substance/claims_register.md        canonical for which claims exist
  3. 04_tools/space_peak_rules.json         term lists and severities
  4. this script                            reads 2 and 3, decides nothing

If this script and the register disagree, the register wins and this
script is the bug.

Why this exists. The concept brief's subtitle says every fact about a
specific mountain is a starting point for real diligence, not a verified
site assessment. That discipline is lost slowly, one confident sentence at
a time, usually while writing for an audience. A writer shortens a hedged
sentence for rhythm. A summary drops the qualifier the original carried. A
number that appeared once with "on the order of" appears again without it.
Each step is defensible; the destination is a document making claims the
project cannot support. This script is the thing that notices.

Checks and their severity, which comes from the data file:

  unregistered-claim    WARN  Prose states a figure about a place with no
                              register row. Regex detection of place-shaped
                              proper nouns is a heuristic by construction,
                              and the house rule is "block on the certain,
                              warn on the likely."

  unlabeled-claim       WARN  A registered `unverified` place appears with a
                              figure in a sentence carrying no speculative
                              label. The label often sits in a neighbouring
                              sentence this script cannot see.

POLICY SURFACE: classify_claim(). It implements "register-anchored plus a
catch-all for any unregistered place." Alternatives considered were strict
(flag any place name, elevation, or land-status word, which fires
constantly on prose that legitimately discusses the peaks) and loose (flag
only assertive constructions, which leaks a confidently worded claim).
Retune there, not by scattering conditions through the file.

Usage:
  python3 space_peak_claims.py --register 02_substance/claims_register.md FILE ...
  python3 space_peak_claims.py --self-test
  python3 space_peak_claims.py --json [--register PATH]   every claim row as JSON

Exit codes: 0 clean, 1 a blocking finding, 2 usage, 3 could not check.
"""

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import space_peak_rules as R  # noqa: E402

# A checkable figure attached to a place: elevation, latitude, distance,
# acreage. Narrower than the lint script's FIGURE_RE on purpose; this one
# only answers "is there a number here worth a register row".
PLACE_FIGURE_RE = re.compile(
    r"""
    (?:
        \b\d{1,2}[,.]\d{3}\s*(?:ft|feet)?\b            # 14,047 / 12,300
      | \b\d{1,2}(?:\.\d+)?\s*(?:°|\bN\b|\bdegrees?\b)  # 37.1 N
      | \b\d[\d,.]*\s*k?\s*(?:ft|feet|acres|miles|mi)\b
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)

# The structural half of the catch-all, and the more important half: a
# place-shaped proper noun this project has never heard of. A known-names
# list can only catch names someone already thought to list, which is the
# inverse of the case that needs catching. A brand-new peak in new prose is
# the least-examined claim in the repository.
PLACE_SHAPE_RE = re.compile(
    r"""\b(
        (?:[A-Z][a-z]+\s+){1,2}(?:Peak|Peaks|Mountain|Mountains|Mtn|Mtns|
                                  Mesa|Butte|Ridge|Summit|Range)
      | Mount\s+[A-Z][a-z]+
      | Mt\.?\s+[A-Z][a-z]+
    )\b""",
    re.VERBOSE,
)

LINK_RE = re.compile(r"\[[^\]]*\]\([^)]+\)|https?://\S+")
INLINE_CODE_RE = re.compile(r"`[^`]*`")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
ROW_RE = re.compile(r"^\|\s*([A-Z]-\d+|\*\*[^|]+\*\*)\s*\|(.+)$")
STATUSES = ("unverified", "verified", "corrected", "unverifiable", "open")
STATUS_RE = re.compile(r"`(" + "|".join(STATUSES) + r")`")
# Claim tables: a header with these columns (Site is optional). The site's
# site/src/lib/claims/parse.ts reads the same tables; claims-parse.test.ts
# asserts both give equal rows.
CLAIM_COLUMNS = ("id", "claim", "status", "source", "notes")
ID_RE = re.compile(r"^([A-Z])-\d+$")
HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")


def split_cells(raw):
    return [c.strip() for c in raw.strip().strip("|").split("|")]


def claim_header(cells):
    """The lower-cased names when a table row is a claims-table header, else None."""
    names = [c.lower() for c in cells]
    return names if all(col in names for col in CLAIM_COLUMNS) else None


def claim_row(line, header, section, seen):
    """One claims-table row as a dict; raise InfraError on a bad row."""
    cells = split_cells(line)
    if len(cells) != len(header):
        raise R.InfraError(f"claims row has {len(cells)} cells, header has {len(header)}: {line}")
    cell = dict(zip(header, cells))
    id_m = ID_RE.match(cell["id"])
    if not id_m or cell["id"] in seen:
        raise R.InfraError(f"bad or duplicate claim id: {cell['id']!r}")
    seen.add(cell["id"])
    status = cell["status"].strip("`")
    if status not in STATUSES:
        raise R.InfraError(f"{cell['id']}: unknown status {cell['status']!r}")
    row = {"id": cell["id"], "series": id_m.group(1), "section": section}
    if "site" in cell:
        row["site"] = cell["site"]
    row.update(claim=cell["claim"], status=status,
               source=cell["source"], notes=cell["notes"])
    return row


def register_rows(text):
    """Return every claim-table row as a dict; raise InfraError on a bad row."""
    rows, seen, section, header = [], set(), "", None
    for raw in text.splitlines():
        line = raw.strip()
        heading = HEADING_RE.match(line)
        if heading:
            section, header = heading.group(1), None
        elif not line.startswith("|"):
            header = None
        elif header is None:
            header = claim_header(split_cells(line))
        elif not set(line) <= set("|-: "):
            rows.append(claim_row(line, header, section, seen))
    return rows


def read_register(path):
    """The register's text; raise InfraError when it cannot be read."""
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except OSError as exc:
        raise R.InfraError(f"cannot read register {path}: {exc}")


def row_places(cells, known):
    """The known places that any cell of one register row names."""
    found = set()
    # Scan EVERY cell, not just the name column. A row's claim and notes
    # text names places too: the Culebra row names Cielo Vista Ranch, the
    # Spanish Peaks row names Comanche National Grassland. Scanning only
    # the name column reported those as unregistered on the very document
    # they came from.
    for cell in cells:
        name = cell.strip("* ").lower()
        if not name or name.startswith(("id", "site", "claim", "---")):
            continue
        found.update(place for place in known if place in name)
    return found


def parse_register(path, rules):
    """Return (registered, unverified) sets of known-place keys."""
    known = [p.lower() for p in R.terms(rules, "known_places")]
    registered, unverified = set(), set()
    for raw in read_register(path).splitlines():
        if not ROW_RE.match(raw.strip()):
            continue
        cells = split_cells(raw)
        if len(cells) < 3:
            continue
        status_m = STATUS_RE.search(raw)
        places = row_places(cells, known)
        registered |= places
        if status_m and status_m.group(1) == "unverified":
            unverified |= places
    return registered, unverified


def strip_noise(line):
    line = INLINE_CODE_RE.sub(" ", line)
    line = LINK_RE.sub(" LINKED-SOURCE ", line)
    return line


def has_cue(sentence, cues):
    low = sentence.lower()
    return any(cue in low for cue in cues)


def unknown_place(sentence, known):
    """The first place-shaped name in a sentence that no known place covers, or None."""
    for m in PLACE_SHAPE_RE.finditer(sentence):
        name = m.group(1).strip()
        if not any(p in name.lower() for p in known):
            return name
    return None


def register_finding(sentence, mentioned, registered, unverified, rules):
    """Steps 2b and 3 for the known places a sentence mentions; None when it passes."""
    # 2b. Catch-all, known-name half: a listed place with no register row.
    unregistered = [p for p in mentioned if p not in registered]
    if unregistered:
        return (R.severity_of(rules, "unregistered-claim"), "unregistered-claim",
                f'states a figure about "{unregistered[0]}", which has no row '
                "in claims_register.md; add a row before asserting it")

    # 3. A registered-but-unverified place stated without a label.
    unlabeled = [p for p in mentioned if p in unverified]
    if unlabeled and not has_cue(sentence, R.terms(rules, "speculative_cues")):
        return (R.severity_of(rules, "unlabeled-claim"), "unlabeled-claim",
                f'figure about "{unlabeled[0]}" is registered `unverified` but '
                "this sentence carries no speculative label; confirm the label "
                "is nearby")
    return None


def classify_claim(sentence, rules, registered, unverified):
    """THE POLICY SURFACE. Return (severity, check, message) or None.

    Register-anchored, plus a catch-all for any unregistered place.
    """
    low = sentence.lower()
    known = [p.lower() for p in R.terms(rules, "known_places")]

    # 1. Does this sentence attach a checkable figure to a place?
    if not PLACE_FIGURE_RE.search(sentence):
        return None

    mentioned = [p for p in known if p in low]

    # 2a. Catch-all, structural half: a place-shaped name we do not know.
    name = unknown_place(sentence, known)
    if name is not None:
        return (R.severity_of(rules, "unregistered-claim"),
                "unregistered-claim",
                f'states a figure about "{name}", which this project has '
                "no register row for; add a row to claims_register.md "
                "before asserting it")

    if not mentioned:
        return None
    return register_finding(sentence, mentioned, registered, unverified, rules)


def lint_file(path, rules, registered, unverified):
    try:
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
    except OSError as exc:
        raise R.InfraError(f"cannot read {path}: {exc}")

    findings = []
    in_fence = False
    for line_no, raw in enumerate(text.splitlines(), start=1):
        stripped = raw.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        line = strip_noise(raw)
        for sentence in SENTENCE_SPLIT_RE.split(line):
            result = classify_claim(sentence, rules, registered, unverified)
            if result:
                findings.append((line_no,) + result)
    return findings


def report(path, findings):
    if not findings:
        print(f"{path}: clean")
        return
    for line_no, severity, check, message in findings:
        loc = f"{path}:{line_no}" if line_no else path
        print(f"{loc}: {severity} [{check}] {message}")
    fails = sum(1 for f in findings if f[1] == "FAIL")
    print(f"{path}: {fails} FAIL, {len(findings) - fails} WARN")


SELF_TEST_CASES = [
    ("Mount Evans rises to 14,264 ft and fires clean to the east.",
     "unregistered-claim", "WARN"),
    ("Culebra Peak is 14,047 ft.",
     "unlabeled-claim", "WARN"),
    ("Blanca Peak is 14,345 ft.",
     "unlabeled-claim", "WARN"),
    ("Blanca Peak is the best site once the lane is cleared.", None, None),
    ("Culebra Peak is listed at approximately 14,047 ft, unverified.",
     None, None),
    ("The catapult supplies velocity and the thruster circularizes.",
     None, None),
]

SELF_TEST_REGISTERED = {"culebra", "greenhorn", "blanca", "crestones", "pikes peak"}
SELF_TEST_UNVERIFIED = {"culebra", "greenhorn", "blanca", "crestones", "pikes peak"}


def self_test_case(rules, sentence, expected, expected_sev):
    """One seeded sentence: print its verdict, and return True when it is classified as expected."""
    result = classify_claim(sentence, rules, SELF_TEST_REGISTERED,
                            SELF_TEST_UNVERIFIED)
    got = result[1] if result else None
    got_sev = result[0] if result else None
    if got == expected and got_sev == expected_sev:
        print(f"self-test: OK   [{expected or 'clean'}"
              f"{'/' + expected_sev if expected_sev else ''}] "
              f"{sentence[:46]}")
        return True
    print(f"self-test: FAIL expected {expected or 'clean'}/"
          f"{expected_sev}, got {got or 'clean'}/{got_sev}: "
          f"{sentence[:46]}")
    return False


def self_test():
    """Seed known-bad and known-clean samples; fail if either misbehaves."""
    rules = R.load_rules()
    ok = all([self_test_case(rules, *case) for case in SELF_TEST_CASES])

    # The heuristics must only WARN.
    if R.severity_of(rules, "unregistered-claim") != "WARN":
        print("self-test: unregistered-claim must warn (heuristic): FAIL"); ok = False

    print("self-test:", "PASS" if ok else "FAIL")
    return R.EXIT_OK if ok else R.EXIT_BLOCKED


def lint_files(paths, register, rules):
    """Lint each file but the register against it, reporting each; True when any finding blocks."""
    registered, unverified = parse_register(register, rules)
    any_fail = False
    for path in paths:
        if os.path.abspath(path) == os.path.abspath(register):
            continue
        findings = lint_file(path, rules, registered, unverified)
        report(path, findings)
        if any(f[1] == "FAIL" for f in findings):
            any_fail = True
    return any_fail


def _main(argv=None):
    parser = argparse.ArgumentParser(description="Space Peak claims guardrail")
    parser.add_argument("files", nargs="*")
    parser.add_argument("--register", default="02_substance/claims_register.md")
    parser.add_argument("--rules", default=None)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--json", action="store_true",
                        help="print every claim-table row of --register as JSON")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()
    if args.json:
        print(json.dumps(register_rows(read_register(args.register)), indent=2, ensure_ascii=False))
        return R.EXIT_OK
    if not args.files:
        parser.print_usage()
        return R.EXIT_USAGE

    rules = R.load_rules(args.rules)
    if not os.path.exists(args.register):
        raise R.InfraError(f"register not found: {args.register}")

    any_fail = lint_files(args.files, args.register, rules)
    return R.EXIT_BLOCKED if any_fail else R.EXIT_OK


if __name__ == "__main__":
    sys.exit(R.run_guarded(_main))
